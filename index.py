"""API do painel admin — roda na Vercel como função Python (Flask).

Edita o conteúdo da landing page e do site da agência no Supabase.
Todas as rotas (menos /api/login) exigem login.

Rodar no PC (sobe o painel + a API):
    pip install flask
    python api/index.py
"""
import hashlib
import hmac
import json
import os
import re
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

from flask import Flask, abort, jsonify, request, send_from_directory

PORTA = 5000
RAIZ = Path(__file__).resolve().parent.parent


def carregar_env():
    """Na Vercel usa as variáveis de ambiente; no PC lê o arquivo .env da pasta admin."""
    env = {}
    arq = RAIZ / ".env"
    if arq.exists():
        for linha in arq.read_text(encoding="utf-8").splitlines():
            if "=" in linha and not linha.strip().startswith("#"):
                k, v = linha.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return {**env, **os.environ}


ENV = carregar_env()
SUPABASE_URL = re.sub(r"/rest/v1/?$", "", ENV.get("SUPABASE_URL", "").rstrip("/"))
SUPABASE_KEY = ENV.get("SUPABASE_KEY", "")
ADMIN_USER = ENV.get("ADMIN_USER", "admin")
ADMIN_PASS = ENV.get("ADMIN_PASS", "admin123")
SEGREDO = ENV.get("SECRET_KEY") or hashlib.sha256(f"{ADMIN_PASS}:{SUPABASE_KEY}".encode()).hexdigest()
BUCKET = "imagens"

SITES = {"landing", "agencia"}
TIPOS = {"landing": {"produto"}, "agencia": {"servico", "membro", "portfolio", "depoimento"}}
CAMPOS_ITEM = ("titulo", "subtitulo", "descricao", "preco", "icone", "link", "imagem_url")
CORES = ("royal", "navy", "periwinkle", "mist", "ice")
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
EXTENSOES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif", "image/svg+xml": ".svg"}

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 4 * 1024 * 1024  # a Vercel aceita até ~4,5 MB por requisição


# ---------- Cliente Supabase (só biblioteca padrão) ----------
class ErroSupabase(Exception):
    pass


def supabase(metodo, caminho, corpo=None, headers=None, bruto=None):
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ErroSupabase("SUPABASE_URL/SUPABASE_KEY não configurados")
    h = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}
    h.update(headers or {})
    dados = bruto if bruto is not None else (json.dumps(corpo).encode() if corpo is not None else None)
    req = urllib.request.Request(f"{SUPABASE_URL}{caminho}", data=dados, method=metodo, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            texto = r.read().decode()
            return json.loads(texto) if texto else None
    except urllib.error.HTTPError as e:
        raise ErroSupabase(f"Supabase {e.code}: {e.read().decode()[:300]}")
    except urllib.error.URLError as e:
        raise ErroSupabase(f"Sem conexão com o Supabase: {e.reason}")


@app.errorhandler(ErroSupabase)
def erro_supabase(e):
    return jsonify(erro=str(e)), 502


def texto(valor, limite=5000):
    return str(valor or "").strip()[:limite]


# ---------- Login (token assinado: funciona nas funções da Vercel, que não guardam memória) ----------
DURACAO = 8 * 3600


def assinar(expira):
    return hmac.new(SEGREDO.encode(), str(expira).encode(), hashlib.sha256).hexdigest()


def token_valido(token):
    expira, _, assinatura = token.partition(".")
    return expira.isdigit() and int(expira) > time.time() and hmac.compare_digest(assinatura, assinar(expira))


def exige_login(f):
    @wraps(f)
    def wrapper(*a, **kw):
        if not token_valido(request.headers.get("Authorization", "").removeprefix("Bearer ").strip()):
            return jsonify(erro="Faça login novamente"), 401
        return f(*a, **kw)
    return wrapper


def exige_site(f):
    @wraps(f)
    def wrapper(site, *a, **kw):
        if site not in SITES:
            return jsonify(erro="Site inválido"), 404
        return f(site, *a, **kw)
    return wrapper


@app.post("/api/login")
def login():
    d = request.get_json(silent=True) or {}
    ok_user = hmac.compare_digest(texto(d.get("usuario")), ADMIN_USER)
    ok_pass = hmac.compare_digest(texto(d.get("senha")), ADMIN_PASS)
    if not (ok_user and ok_pass):
        time.sleep(1)  # atrasa tentativas de adivinhar a senha
        return jsonify(erro="Usuário ou senha inválidos"), 401
    expira = int(time.time()) + DURACAO
    return jsonify(token=f"{expira}.{assinar(expira)}")


# ---------- Configurações dos sites ----------
@app.get("/api/config/<site>")
@exige_login
@exige_site
def ler_config(site):
    linhas = supabase("GET", f"/rest/v1/site_config?site=eq.{site}&select=dados")
    return jsonify(linhas[0]["dados"] if linhas else {})


@app.put("/api/config/<site>")
@exige_login
@exige_site
def salvar_config(site):
    d = request.get_json(silent=True)
    if not isinstance(d, dict):
        return jsonify(erro="Envie um objeto JSON"), 400
    dados = {k[:60]: texto(v) for k, v in d.items() if k != "cores" and isinstance(v, (str, int, float))}
    cores = d.get("cores") or {}
    dados["cores"] = {c: cores[c] for c in CORES if HEX.match(str(cores.get(c, "")))}
    agora = datetime.now(timezone.utc).isoformat()
    supabase("POST", "/rest/v1/site_config", [{"site": site, "dados": dados, "atualizado_em": agora}],
             {"Prefer": "resolution=merge-duplicates"})
    return jsonify(dados)


# ---------- Itens (produtos, serviços, equipe, portfólio, depoimentos) ----------
def validar_item(d, site):
    item = {c: texto(d.get(c)) for c in CAMPOS_ITEM if c in d}
    if "ordem" in d:
        try:
            item["ordem"] = int(d["ordem"])
        except (TypeError, ValueError):
            return None, "Ordem precisa ser um número"
    if "tipo" in d:
        if d["tipo"] not in TIPOS[site]:
            return None, "Tipo inválido para este site"
        item["tipo"] = d["tipo"]
    return item, None


@app.get("/api/itens/<site>")
@exige_login
@exige_site
def listar_itens(site):
    return jsonify(supabase("GET", f"/rest/v1/itens?site=eq.{site}&order=ordem.asc,id.asc"))


@app.post("/api/itens/<site>")
@exige_login
@exige_site
def criar_item(site):
    item, erro = validar_item(request.get_json(silent=True) or {}, site)
    if erro or "tipo" not in item or not item.get("titulo"):
        return jsonify(erro=erro or "Informe tipo e título"), 400
    item["site"] = site
    novo = supabase("POST", "/rest/v1/itens", item, {"Prefer": "return=representation"})
    return jsonify(novo[0]), 201


@app.put("/api/itens/<site>/<int:item_id>")
@exige_login
@exige_site
def editar_item(site, item_id):
    item, erro = validar_item(request.get_json(silent=True) or {}, site)
    if erro:
        return jsonify(erro=erro), 400
    item.pop("tipo", None)  # o tipo de um item não muda
    r = supabase("PATCH", f"/rest/v1/itens?id=eq.{item_id}&site=eq.{site}", item, {"Prefer": "return=representation"})
    return (jsonify(r[0]), 200) if r else (jsonify(erro="Item não encontrado"), 404)


@app.delete("/api/itens/<site>/<int:item_id>")
@exige_login
@exige_site
def apagar_item(site, item_id):
    supabase("DELETE", f"/rest/v1/itens?id=eq.{item_id}&site=eq.{site}")
    return jsonify(ok=True)


# ---------- Upload de imagens (Supabase Storage) ----------
@app.post("/api/upload")
@exige_login
def upload():
    arq = request.files.get("arquivo")
    if not arq or arq.mimetype not in EXTENSOES:
        return jsonify(erro="Envie uma imagem JPG, PNG, WEBP, GIF ou SVG"), 400
    nome = f"{uuid.uuid4().hex}{EXTENSOES[arq.mimetype]}"
    supabase("POST", f"/storage/v1/object/{BUCKET}/{nome}", headers={"Content-Type": arq.mimetype}, bruto=arq.read())
    return jsonify(url=f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{nome}"), 201


# ---------- Mensagens de contato ----------
@app.get("/api/contatos/<site>")
@exige_login
@exige_site
def listar_contatos(site):
    return jsonify(supabase("GET", f"/rest/v1/contatos?origem=eq.{site}&order=criado_em.desc"))


@app.put("/api/contatos/<int:contato_id>")
@exige_login
def marcar_lido(contato_id):
    lido = bool((request.get_json(silent=True) or {}).get("lido", True))
    supabase("PATCH", f"/rest/v1/contatos?id=eq.{contato_id}", {"lido": lido})
    return jsonify(ok=True)


@app.delete("/api/contatos/<int:contato_id>")
@exige_login
def apagar_contato(contato_id):
    supabase("DELETE", f"/rest/v1/contatos?id=eq.{contato_id}")
    return jsonify(ok=True)


# ---------- Só para rodar no PC (na Vercel os arquivos são servidos por ela) ----------
@app.get("/")
@app.get("/<path:arquivo>")
def pagina(arquivo="index.html"):
    if arquivo != "index.html" and not arquivo.startswith("assets/"):
        abort(404)  # nunca entrega api/, .env etc.
    return send_from_directory(RAIZ, arquivo)


if __name__ == "__main__":
    print(f"\n  Painel admin rodando em http://localhost:{PORTA}  (Ctrl+C para parar)\n")
    app.run(port=PORTA)
