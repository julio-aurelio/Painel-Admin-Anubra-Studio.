"""Teste rápido da API do painel (galeria do mural e posição da imagem), sem precisar do Supabase:  python test_api.py"""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("api", Path(__file__).parent / "api" / "index.py")
api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(api)

banco = {"agencia": {"nome": "Agência", "galerias": {"7": ["https://x.co/a.webp"]}}}
itens = {7: {"id": 7, "site": "agencia", "tipo": "portfolio"}}


def falso_supabase(metodo, caminho, corpo=None, headers=None, bruto=None):
    if "site_config" in caminho:
        if metodo == "POST":
            banco[corpo[0]["site"]] = corpo[0]["dados"]
            return None
        site = caminho.split("site=eq.")[1].split("&")[0]
        return [{"dados": banco[site]}] if site in banco else []
    item_id = int(caminho.split("id=eq.")[1].split("&")[0]) if "id=eq." in caminho else None
    if metodo == "DELETE":
        itens.pop(item_id, None)
        return None
    if metodo == "PATCH":
        return [{**itens[item_id], **corpo}]
    return [itens[item_id]] if item_id in itens and "tipo=eq.portfolio" in caminho else []


api.supabase = falso_supabase
c = api.app.test_client()
token = c.post("/api/login", json={"usuario": api.ADMIN_USER, "senha": api.ADMIN_PASS}).json["token"]
h = {"Authorization": f"Bearer {token}"}

# posição da imagem: válida fica, lixo depois do # sai
r = c.put("/api/itens/agencia/7", json={"imagem_url": "https://x.co/c.webp#pos=20,80"}, headers=h)
assert r.json["imagem_url"] == "https://x.co/c.webp#pos=20,80", r.json
r = c.put("/api/itens/agencia/7", json={"imagem_url": "https://x.co/c.webp#<script>"}, headers=h)
assert r.json["imagem_url"] == "https://x.co/c.webp", r.json

# galeria: salva só links http(s), exige login e projeto do portfólio
assert c.put("/api/galeria/7", json={"fotos": ["https://x.co/1.webp"]}).status_code == 401
r = c.put("/api/galeria/7", json={"fotos": ["https://x.co/1.webp", "javascript:alert(1)", "", 5]}, headers=h)
assert r.json == {"fotos": ["https://x.co/1.webp"]} and banco["agencia"]["galerias"]["7"] == ["https://x.co/1.webp"]
assert c.put("/api/galeria/99", json={"fotos": []}, headers=h).status_code == 404

# salvar os textos da agência não apaga as galerias
c.put("/api/config/agencia", json={"nome": "Nova", "galerias": "ignorado"}, headers=h)
assert banco["agencia"]["nome"] == "Nova" and banco["agencia"]["galerias"] == {"7": ["https://x.co/1.webp"]}

# galeria vazia remove a entrada; apagar o projeto também
c.put("/api/galeria/7", json={"fotos": []}, headers=h)
assert "7" not in banco["agencia"]["galerias"]
c.put("/api/galeria/7", json={"fotos": ["https://x.co/2.webp"]}, headers=h)
c.delete("/api/itens/agencia/7", headers=h)
assert "7" not in banco["agencia"]["galerias"]

print("OK: todos os testes passaram")
