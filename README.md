<p align="center"><img src="assets/logo.png" width="100" /></p>

<h1 align="center">Painel Admin — Anubra Studio</h1>

<p align="center">Área restrita para editar o conteúdo dos sites sem mexer no código.<br/>Projeto desenvolvido no <b>SENAI</b>.</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

---

## 🔐 Acesso

Login com usuário e senha definidos nas variáveis de ambiente (`ADMIN_USER` / `ADMIN_PASS`).
Padrão para a apresentação: **admin** / **admin123**.

## 🛠️ O que o painel edita

No topo do menu escolha o site — **Landing Page**, **Agência** ou **Foto Livro** — cada um tem a sua área:

- 🎨 **Aparência** — as 5 cores da paleta (com prévia ao vivo) e o logo
- ✏️ **Textos e contatos** — títulos, textos, imagens, números, WhatsApp, Instagram, e-mail
- 🧩 **Listas** — Landing: *Produtos/Ensaios* · Agência: *Serviços, Equipe, Portfólio, Depoimentos*
- 📥 **Mensagens recebidas** — o que chegou pelos formulários de contato
- 📖 **Foto Livro** — cores e fontes, capa, dedicatória, contracapa e o **Editor de páginas**

### Editor de páginas

Editor visual em tela cheia, para computador e celular:

- **Fotos:** enviar ou arrastar do computador, mover, redimensionar, girar, zoom, enquadramento e cantos arredondados
- **Textos:** caixa de texto desenhada na página, com 12 fontes, tamanho, cor, negrito, itálico, alinhamento e sombra
- **Formas e camadas:** retângulo, círculo, linha, transparência e ordem dos elementos
- **Páginas:** criar, duplicar, reordenar, excluir, cor de fundo e modelos prontos opcionais
- **Página dupla:** um elemento pode atravessar a dobra do livro
- **Celular:** uma página por vez, ferramentas embaixo, ajustes em gaveta e pinça com dois dedos para aumentar e girar
- **Atalhos no computador:** `Ctrl+Z`, `Ctrl+Y`, `Ctrl+D`, `Delete`, setas e `Alt` para arrastar sem o ímã de alinhamento

O editor salva sozinho em `fotolivro_rascunho`. O site só muda ao clicar em **Publicar**, que copia o rascunho para `fotolivro`. Salvar a landing não apaga o livro. O formato das páginas (`fotolivro/render.js`) e o álbum inicial (`fotolivro/padrao.js`) vêm da landing publicada, então **publique a landing antes do painel**.

As imagens enviadas vão para o **Supabase Storage** (bucket `imagens`, até 4 MB por arquivo).

## ⚙️ Configuração

### 1. Banco de dados (uma vez só)
No [Supabase](https://supabase.com/dashboard) → **SQL Editor** → **New query** → cole o conteúdo de [`schema.sql`](schema.sql) → **Run**.

### 2. Variáveis de ambiente
Crie o `.env` nesta pasta a partir do `.env.example`:

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | `https://SEU-PROJETO.supabase.co` |
| `SUPABASE_KEY` | chave **service_role** do Supabase |
| `ADMIN_USER` | usuário do painel |
| `ADMIN_PASS` | senha do painel |

> ⚠️ A chave service_role dá acesso total ao banco. Fica só no `.env` / nas variáveis da Vercel — **nunca** no HTML/JS nem no GitHub (o `.env` está no `.gitignore`).

### 3. Rodar no PC
```bash
pip install flask
python api/index.py
```
Abre em **http://localhost:5000**.

## ☁️ Deploy na Vercel

1. **Add New → Project** e escolha o repositório
2. **Root Directory**: `admin`
3. **Environment Variables**: as 4 da tabela acima
4. **Deploy**

Depois, troque `URL_LANDING` e `URL_AGENCIA` no começo de `assets/admin.js` pelos endereços publicados, para o botão **Ver site** funcionar.

## 🔌 API

Todas as rotas (menos `/api/login`) exigem login. `<site>` é `landing` ou `agencia`.

| Método | Rota |
|---|---|
| `POST` | `/api/login` |
| `GET` `PUT` | `/api/config/<site>` |
| `GET` `PUT` | `/api/fotolivro` (rascunho) |
| `POST` | `/api/fotolivro/publicar` |
| `GET` `POST` | `/api/itens/<site>` |
| `PUT` `DELETE` | `/api/itens/<site>/<id>` |
| `POST` | `/api/upload` |
| `GET` | `/api/contatos/<site>` |
| `PUT` `DELETE` | `/api/contatos/<id>` |

O login gera um **token assinado** válido por 8 horas (funciona nas funções da Vercel, que não guardam memória entre requisições).

Teste rápido, sem precisar do Supabase: `python test_api.py`

## 🗄️ Banco de dados

| Tabela | Guarda |
|---|---|
| `site_config` | textos, cores, contatos, imagens de cada site e o foto livro (JSON) |
| `itens` | produtos, serviços, equipe, portfólio e depoimentos |
| `contatos` | mensagens dos formulários |

Todas com **RLS ligado** e sem acesso público.

## 📁 Estrutura

```
admin/
├── index.html          # Login + painel
├── assets/             # admin.js, editor.js (editor de páginas) e logo
├── api/index.py        # API em Python (Flask) → função serverless na Vercel
├── schema.sql          # Cria o banco no Supabase
├── test_api.py         # Teste da API
├── requirements.txt
├── .env.example
└── README.md
```

## ⚠️ Antes de publicar de verdade

- Troque `ADMIN_PASS` (admin123 é só para a apresentação)
- Se a chave service_role foi compartilhada em algum lugar, gere uma nova em *Supabase → Settings → API*

---

<p align="center">Feito com 💙 · SENAI</p>
