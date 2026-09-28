"""Back-end do projeto Anubra Studio (Python + Flask + Supabase).

Um comando sobe tudo junto:
  - os 3 sites (landing page, site da agência e painel admin)
  - a API: rotas públicas (conteúdo e contatos) e rotas protegidas (admin)

A chave service_role do Supabase fica SÓ aqui (arquivo .env), nunca no HTML.

Como rodar (dentro de admin/backend):
    pip install flask
    python app.py
"""
import hmac
import json
import re
import secrets
import time
import urllib.error
import urllib.request
import uuid
import webbrowser
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

from flask import Flask, abort, jsonify, redirect, request, send_from_directory


# ---------- Configuração (.env) ----------
def carregar_env():
    env = {}
    arq = Path(__file__).with_name(".env")
    if arq.exists():
        for linha in arq.read_text(encoding="utf-8").splitlines():
            if "=" in linha and not linha.strip().startswith("#"):
                k, v = linha.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


ENV = carregar_env()
SUPABASE_URL = re.sub(r"/rest/v1/?$", "", ENV.get("SUPABASE_URL", "").rstrip("/"))
SUPABASE_KEY = ENV.get("SUPABASE_KEY", "")
ADMIN_USER = ENV.get("ADMIN_USER", "admin")
ADMIN_PASS = ENV.get("ADMIN_PASS", "admin123")
BUCKET = "imagens"

SITES = {"landing", "agencia"}
TIPOS = {"landing": {"produto"}, "agencia": {"servico", "membro", "portfolio", "depoimento"}}
CAMPOS_ITEM = ("titulo", "subtitulo", "descricao", "preco", "icone", "link", "imagem_url")
CORES = ("royal", "navy", "periwinkle", "mist", "ice")
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
EXTENSOES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif", "image/svg+xml": ".svg"}

RAIZ = Path(__file__).resolve().parents[2]  # pasta "site para ANA"
PASTAS_SITES = {"landing-page-ANA", "site-agencia", "admin"}

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 6 * 1024 * 1024  # uploads de até ~6 MB


@app.after_request
def cors(resp):
    # libera os sites (abertos por arquivo ou Live Server) a chamarem a API
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return resp


# ---------- Cliente Supabase (só biblioteca padrão) ----------
class ErroSupabase(Exception):
    pass


def supabase(metodo, caminho, corpo=None, headers=None, bruto=None):
    """Chama a API REST/Storage do Supabase com a service_role key."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ErroSupabase("SUPABASE_URL/SUPABASE_KEY não configurados no backend/.env")
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


# ---------- Login do admin ----------
TOKENS = {}  # token -> expira_em  (ponytail: em memória; reiniciar o servidor desloga)
DURACAO = 8 * 3600


def token_atual():
    return request.headers.get("Authorization", "").removeprefix("Bearer ").strip()


def exige_login(f):
    @wraps(f)
    def wrapper(*a, **kw):
        token = token_atual()
        if TOKENS.get(token, 0) < time.time():
            TOKENS.pop(token, None)
            return jsonify(erro="Faça login novamente"), 401
        return f(*a, **kw)
    return wrapper


@app.post("/api/login")
def login():
    d = request.get_json(silent=True) or {}
    ok_user = hmac.compare_digest(texto(d.get("usuario")), ADMIN_USER)
    ok_pass = hmac.compare_digest(texto(d.get("senha")), ADMIN_PASS)
    if not (ok_user and ok_pass):
        time.sleep(1)  # atrasa tentativas de adivinhar a senha
        return jsonify(erro="Usuário ou senha inválidos"), 401
    token = secrets.token_urlsafe(32)
    TOKENS[token] = time.time() + DURACAO
    return jsonify(token=token)


@app.post("/api/logout")
@exige_login
def logout():
    TOKENS.pop(token_atual(), None)
    return jsonify(ok=True)


# ---------- Configurações dos sites ----------
@app.get("/api/config/<site>")
def ler_config(site):
    if site not in SITES:
        return jsonify(erro="Site inválido"), 404
    linhas = supabase("GET", f"/rest/v1/site_config?site=eq.{site}&select=dados")
    return jsonify(linhas[0]["dados"] if linhas else {})


@app.put("/api/config/<site>")
@exige_login
def salvar_config(site):
    if site not in SITES:
        return jsonify(erro="Site inválido"), 404
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
def listar_itens(site):
    if site not in SITES:
        return jsonify(erro="Site inválido"), 404
    return jsonify(supabase("GET", f"/rest/v1/itens?site=eq.{site}&order=ordem.asc,id.asc"))


@app.post("/api/itens/<site>")
@exige_login
def criar_item(site):
    if site not in SITES:
        return jsonify(erro="Site inválido"), 404
    item, erro = validar_item(request.get_json(silent=True) or {}, site)
    if erro or "tipo" not in item or not item.get("titulo"):
        return jsonify(erro=erro or "Informe tipo e título"), 400
    item["site"] = site
    novo = supabase("POST", "/rest/v1/itens", item, {"Prefer": "return=representation"})
    return jsonify(novo[0]), 201


@app.put("/api/itens/<site>/<int:item_id>")
@exige_login
def editar_item(site, item_id):
    if site not in SITES:
        return jsonify(erro="Site inválido"), 404
    item, erro = validar_item(request.get_json(silent=True) or {}, site)
    if erro:
        return jsonify(erro=erro), 400
    item.pop("tipo", None)  # o tipo de um item não muda
    r = supabase("PATCH", f"/rest/v1/itens?id=eq.{item_id}&site=eq.{site}", item, {"Prefer": "return=representation"})
    return (jsonify(r[0]), 200) if r else (jsonify(erro="Item não encontrado"), 404)


@app.delete("/api/itens/<site>/<int:item_id>")
@exige_login
def apagar_item(site, item_id):
    if site not in SITES:
        return jsonify(erro="Site inválido"), 404
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
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@app.post("/api/contato")
def novo_contato():
    d = request.get_json(silent=True) or {}
    msg = {
        "origem": d.get("origem"),
        "nome": texto(d.get("nome"), 120),
        "email": texto(d.get("email"), 160),
        "telefone": texto(d.get("telefone"), 30),
        "assunto": texto(d.get("assunto"), 120),
        "mensagem": texto(d.get("mensagem"), 2000),
    }
    if msg["origem"] not in SITES or not msg["nome"] or not EMAIL.match(msg["email"]):
        return jsonify(erro="Preencha nome e um e-mail válido"), 400
    supabase("POST", "/rest/v1/contatos", msg)
    return jsonify(ok=True), 201


@app.get("/api/contatos/<site>")
@exige_login
def listar_contatos(site):
    if site not in SITES:
        return jsonify(erro="Site inválido"), 404
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


# ---------- Os 3 sites ----------
@app.get("/")
def inicio():
    return redirect("/landing-page-ANA/")


@app.get("/agencia")
def atalho_agencia():
    return redirect("/site-agencia/")


@app.get("/admin")
def atalho_admin():
    return redirect("/admin/")


@app.get("/<pasta>/")
@app.get("/<pasta>/<path:arquivo>")
def arquivos_dos_sites(pasta, arquivo="index.html"):
    partes = arquivo.split("/")
    # só as 3 pastas dos sites; nunca o back-end, o .env ou arquivos ocultos
    if pasta not in PASTAS_SITES or "backend" in partes or any(p.startswith(".") for p in partes):
        abort(404)
    return send_from_directory(RAIZ / pasta, arquivo)


@app.get("/api/status")
def status():
    return jsonify(ok=True, supabase_configurado=bool(SUPABASE_URL and SUPABASE_KEY))


if __name__ == "__main__":
    print("\n  Anubra Studio rodando!")
    print("  Landing page ....... http://localhost:5000/")
    print("  Site da agência .... http://localhost:5000/agencia")
    print("  Painel admin ....... http://localhost:5000/admin")
    print("  (Ctrl+C para parar)\n")
    webbrowser.open("http://localhost:5000/")
    app.run(port=5000)
