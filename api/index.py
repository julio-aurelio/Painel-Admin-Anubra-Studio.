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
import math
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
    # o foto livro (landing) e as galerias do mural (agência) moram nesta linha e têm as próprias telas
    atuais = ler_dados(site)
    dados.update({c: atuais[c] for c in CHAVES_PROPRIAS[site] if atuais.get(c)})
    gravar_config(site, dados)
    return jsonify(dados)


def ler_dados(site):
    linhas = supabase("GET", f"/rest/v1/site_config?site=eq.{site}&select=dados")
    return linhas[0]["dados"] if linhas else {}


def ler_dados_landing():
    return ler_dados("landing")


def gravar_config(site, dados):
    agora = datetime.now(timezone.utc).isoformat()
    supabase("POST", "/rest/v1/site_config", [{"site": site, "dados": dados, "atualizado_em": agora}],
             {"Prefer": "resolution=merge-duplicates"})


# ---------- Foto livro (em site_config da landing: "fotolivro" é o publicado, "fotolivro_rascunho" o editado) ----------
CHAVES_LIVRO = ("fotolivro", "fotolivro_rascunho")
CHAVES_PROPRIAS = {"landing": CHAVES_LIVRO, "agencia": ("galerias",)}
TEXTOS_LIVRO = ("titulo", "subtitulo", "autor", "ano", "dedicatoria", "contracapa_titulo", "contracapa_texto",
                "botao_texto", "dica", "titulo_aba")
IMAGENS_LIVRO = ("capa_imagem", "contracapa_imagem")
CORES_LIVRO = ("fundo", "capa", "capa_texto", "pagina", "texto", "destaque")
FONTES_LIVRO = {"Syne", "Inter", "Playfair Display", "Cormorant Garamond", "Montserrat", "Dancing Script",
                "Abril Fatface", "Bebas Neue", "Caveat", "Lora", "Oswald", "Raleway"}
LAYOUTS_LIVRO = {"foto", "foto_texto", "duas_fotos", "texto", "livre"}
# opções de formato: [valor aceito, ...], o primeiro é o padrão
OPCOES_LIVRO = {
    "formato": ("retrato", "a4", "quadrado", "paisagem"),
    "tamanho": ("grande", "medio", "pequeno"),
    "capa_tipo": ("dura", "flexivel"),
    "capa_modelo": ("fundo", "moldura", "texto"),
    "contracapa_modelo": ("fundo", "moldura", "texto"),
    "capa_alinhar": ("esquerda", "centro"),
}
MAX_PAGINAS = 200
MAX_ELEMENTOS = 80


def url_imagem(valor):
    url = texto(valor, 1000)
    return url if re.match(r"^https?://", url, re.I) else ""


def numero(valor, minimo, maximo, padrao=0):
    try:
        n = float(valor)
    except (TypeError, ValueError):
        return padrao
    return round(max(minimo, min(maximo, n)), 3) if math.isfinite(n) else padrao


def cor(valor, padrao):
    return valor if HEX.fullmatch(str(valor or "")) else padrao


def limpar_elemento(e):
    tipo = e.get("tipo")
    if tipo not in ("foto", "texto", "forma"):
        return None
    item = {
        "id": re.sub(r"[^a-zA-Z0-9]", "", str(e.get("id", "")))[:24] or uuid.uuid4().hex[:12],
        "tipo": tipo,
        "x": numero(e.get("x"), -300, 300),
        "y": numero(e.get("y"), -100, 200),
        "w": numero(e.get("w"), 0.2, 400, 30),
        "h": numero(e.get("h"), 0.1, 400, 20),
        "r": numero(e.get("r"), -180, 180),
        "opacidade": numero(e.get("opacidade"), 0.05, 1, 1),
    }
    if tipo == "foto":
        item.update(url=url_imagem(e.get("url")), zoom=numero(e.get("zoom"), 1, 4, 1), fx=numero(e.get("fx"), 0, 100, 50),
                    fy=numero(e.get("fy"), 0, 100, 50), raio=numero(e.get("raio"), 0, 50))
    elif tipo == "texto":
        item.update(texto=str(e.get("texto") or "")[:3000], fonte=e.get("fonte") if e.get("fonte") in FONTES_LIVRO else "Inter",
                    tam=numero(e.get("tam"), 0.8, 40, 4), cor=cor(e.get("cor"), "#1C285A"), peso=700 if e.get("peso") == 700 else 400,
                    italico=bool(e.get("italico")), alinhar=e.get("alinhar") if e.get("alinhar") in ("left", "center", "right") else "left",
                    linha=numero(e.get("linha"), 0.8, 3, 1.3), sombra=bool(e.get("sombra")))
    else:
        item.update(forma="circulo" if e.get("forma") == "circulo" else "retangulo", cor=cor(e.get("cor"), "#7C93F1"),
                    raio=numero(e.get("raio"), 0, 50))
    return item


def limpar_pagina(p):
    fundo = str(p.get("fundo", ""))
    if p.get("layout") == "livre":
        elementos = p.get("elementos") if isinstance(p.get("elementos"), list) else []
        limpos = [limpar_elemento(e) for e in elementos[:MAX_ELEMENTOS] if isinstance(e, dict)]
        return {"layout": "livre", "fundo": fundo if HEX.fullmatch(fundo) else "", "elementos": [e for e in limpos if e]}
    return {
        "layout": p.get("layout") if p.get("layout") in LAYOUTS_LIVRO else "foto_texto",
        "titulo": texto(p.get("titulo"), 200),
        "texto": texto(p.get("texto"), 3000),
        "legenda": texto(p.get("legenda"), 300),
        "foto": url_imagem(p.get("foto")),
        "foto2": url_imagem(p.get("foto2")),
        "fundo": fundo if HEX.fullmatch(fundo) else "",
    }


def limpar_livro(d):
    livro = {c: texto(d.get(c), 1000) for c in TEXTOS_LIVRO}
    livro.update({c: url_imagem(d.get(c)) for c in IMAGENS_LIVRO})
    cores = d.get("cores") if isinstance(d.get("cores"), dict) else {}
    livro["cores"] = {c: cores[c] for c in CORES_LIVRO if HEX.fullmatch(str(cores.get(c, "")))}
    for c in ("fonte_titulo", "fonte_texto"):
        livro[c] = d.get(c) if d.get(c) in FONTES_LIVRO else "Inter"
    for c, opcoes in OPCOES_LIVRO.items():
        livro[c] = d.get(c) if d.get(c) in opcoes else opcoes[0]
    paginas = d.get("paginas") if isinstance(d.get("paginas"), list) else []
    livro["paginas"] = [limpar_pagina(p) for p in paginas[:MAX_PAGINAS] if isinstance(p, dict)]
    return livro


@app.get("/api/fotolivro")
@exige_login
def ler_fotolivro():
    dados = ler_dados_landing()
    return jsonify(dados.get("fotolivro_rascunho") or dados.get("fotolivro") or {})


@app.put("/api/fotolivro")
@exige_login
def salvar_fotolivro():
    d = request.get_json(silent=True)
    if not isinstance(d, dict):
        return jsonify(erro="Envie um objeto JSON"), 400
    dados = ler_dados_landing()  # ponytail: última gravação vence; basta para uma pessoa editando por vez
    dados["fotolivro_rascunho"] = limpar_livro(d)
    gravar_config("landing", dados)
    return jsonify(dados["fotolivro_rascunho"])


@app.post("/api/fotolivro/publicar")
@exige_login
def publicar_fotolivro():
    dados = ler_dados_landing()
    if not dados.get("fotolivro_rascunho"):
        return jsonify(erro="Não há rascunho para publicar"), 400
    dados["fotolivro"] = dados["fotolivro_rascunho"]
    gravar_config("landing", dados)
    return jsonify(ok=True)


# ---------- Itens (produtos, serviços, equipe, portfólio, depoimentos) ----------
POSICAO = re.compile(r"#pos=\d{1,3},\d{1,3}$")


def validar_item(d, site):
    item = {c: texto(d.get(c)) for c in CAMPOS_ITEM if c in d}
    url, marca, _ = item.get("imagem_url", "").partition("#")
    if marca and not POSICAO.search(item["imagem_url"]):
        item["imagem_url"] = url  # a posição escolhida vai no fim do link; qualquer outra coisa depois do # sai
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
    if site == "agencia":
        dados = ler_dados("agencia")
        if (dados.get("galerias") or {}).pop(str(item_id), None) is not None:
            gravar_config("agencia", dados)
    return jsonify(ok=True)


# ---------- Galeria do mural (portfólio da agência, em site_config: "galerias" = {id do item: [links]}) ----------
MAX_FOTOS_GALERIA = 120


@app.put("/api/galeria/<int:item_id>")
@exige_login
def salvar_galeria(item_id):
    d = request.get_json(silent=True) or {}
    fotos = d.get("fotos") if isinstance(d.get("fotos"), list) else []
    fotos = [u for u in (url_imagem(f) for f in fotos[:MAX_FOTOS_GALERIA]) if u]
    if not supabase("GET", f"/rest/v1/itens?id=eq.{item_id}&site=eq.agencia&tipo=eq.portfolio&select=id"):
        return jsonify(erro="Projeto do portfólio não encontrado"), 404
    dados = ler_dados("agencia")  # shortcut: última gravação vence; basta para uma pessoa editando por vez
    galerias = dados.get("galerias") if isinstance(dados.get("galerias"), dict) else {}
    if fotos:
        galerias[str(item_id)] = fotos
    else:
        galerias.pop(str(item_id), None)
    dados["galerias"] = galerias
    gravar_config("agencia", dados)
    return jsonify(fotos=fotos)


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
