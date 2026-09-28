// ===================== Painel Admin — Anubra Studio =====================
const API = '/api';

// Endereços dos sites depois do deploy na Vercel (troque pelos seus)
const URL_LANDING = 'https://anubra-landing.vercel.app';
const URL_AGENCIA = 'https://anubra-agencia.vercel.app';

// ---------- O que dá pra editar em cada site ----------
// [chave, rótulo, tipo]  tipo: texto (padrão) | area | imagem | numero | icone
const SITES = {
  landing: {
    nome: 'Landing Page',
    url: URL_LANDING,
    textos: {
      'Identidade': [['nome', 'Nome da empresa'], ['titulo_aba', 'Título da aba do navegador']],
      'Início (Hero)': [['hero_etiqueta', 'Etiqueta'], ['hero_titulo', 'Título'], ['hero_destaque', 'Título em destaque'],
        ['hero_texto', 'Texto', 'area'], ['hero_botao', 'Texto do botão'], ['faixa', 'Faixa animada'], ['hero_imagem', 'Imagem de fundo', 'imagem']],
      'Sobre': [['sobre_titulo', 'Título'], ['sobre_destaque', 'Título em destaque'], ['sobre_texto', 'Texto', 'area'],
        ['stat1_numero', 'Número 1', 'numero'], ['stat1_texto', 'Legenda 1'], ['stat2_numero', 'Número 2', 'numero'], ['stat2_texto', 'Legenda 2'],
        ['stat3_numero', 'Número 3', 'numero'], ['stat3_texto', 'Legenda 3'], ['sobre_imagem', 'Imagem', 'imagem']],
      'Seção de produtos': [['produtos_titulo', 'Título'], ['produtos_texto', 'Texto']],
      'Contato': [['contato_titulo', 'Título'], ['contato_texto', 'Texto'], ['whatsapp', 'WhatsApp'], ['telefone', 'Telefone'], ['instagram', 'Instagram'], ['email', 'E-mail']],
      'Créditos da agência': [['agencia_nome', 'Nome da agência'], ['agencia_contato', 'Contato da agência'], ['agencia_link', 'Link do site da agência']],
    },
    listas: { produto: 'Produtos / Ensaios' },
  },
  agencia: {
    nome: 'Site da Agência',
    url: URL_AGENCIA,
    textos: {
      'Identidade': [['nome', 'Nome da agência'], ['titulo_aba', 'Título da aba do navegador']],
      'Início (Home)': [['hero_etiqueta', 'Etiqueta'], ['hero_titulo', 'Título'], ['hero_destaque', 'Título em destaque'], ['hero_texto', 'Texto', 'area']],
      'Títulos das seções': [['servicos_titulo', 'Serviços'], ['equipe_titulo', 'Quem somos'], ['portfolio_titulo', 'Portfólio'],
        ['depoimentos_titulo', 'Depoimentos'], ['equipe_texto', 'Texto do Quem somos', 'area']],
      'Contatos': [['contato_titulo', 'Título'], ['contato_destaque', 'Título em destaque'], ['email', 'E-mail'], ['whatsapp', 'WhatsApp'],
        ['telefone', 'Telefone'], ['instagram', 'Instagram'], ['endereco', 'Endereço']],
    },
    listas: { servico: 'Serviços', membro: 'Equipe', portfolio: 'Portfólio', depoimento: 'Depoimentos' },
  },
};

// Campos de cada tipo de item
const CAMPOS_ITEM = {
  produto: [['titulo', 'Nome do ensaio'], ['descricao', 'Descrição', 'area'], ['preco', 'Preço (ex.: A partir de R$ 250)'], ['imagem_url', 'Foto', 'imagem'], ['ordem', 'Ordem', 'numero']],
  servico: [['titulo', 'Nome do serviço'], ['descricao', 'Descrição', 'area'], ['icone', 'Ícone', 'icone'], ['ordem', 'Ordem', 'numero']],
  membro: [['titulo', 'Nome'], ['subtitulo', 'Função'], ['imagem_url', 'Foto', 'imagem'], ['ordem', 'Ordem', 'numero']],
  portfolio: [['titulo', 'Nome do projeto'], ['subtitulo', 'Categoria'], ['link', 'Link (opcional)'], ['imagem_url', 'Imagem', 'imagem'], ['ordem', 'Ordem', 'numero']],
  depoimento: [['titulo', 'Nome do cliente'], ['subtitulo', 'Serviço contratado'], ['descricao', 'Depoimento', 'area'], ['ordem', 'Ordem', 'numero']],
};
const ICONES = ['camera', 'aperture', 'image', 'images', 'party-popper', 'shopping-bag', 'sparkles', 'heart', 'users', 'user-round', 'baby', 'gem', 'sun', 'video', 'film', 'star', 'wand-sparkles', 'palette'];
const NOMES_CORES = { royal: 'Azul principal', navy: 'Azul escuro', periwinkle: 'Azul claro', mist: 'Lavanda', ice: 'Fundo claro' };
const CORES_PADRAO = { royal: '#10288C', navy: '#1C285A', periwinkle: '#7C93F1', mist: '#B5C4FF', ice: '#E3E9FF' };

// ---------- Estado ----------
let site = sessionStorage.getItem('site') || 'landing';
let aba = 'aparencia';
let config = {};
let alterado = false;
const $ = s => document.querySelector(s);

// ---------- Utilidades ----------
function h(tag, attrs = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos.flat()) if (f != null && f !== false) el.append(f instanceof Node ? f : document.createTextNode(f));
  return el;
}
const icone = (nome, cls = 'w-4 h-4') => h('i', { 'data-lucide': nome, class: cls });
const desenharIcones = () => window.lucide?.createIcons();

function aviso(msg, tipo = 'ok') {
  const cor = tipo === 'erro' ? 'bg-red-500/90' : 'bg-royal';
  const t = h('div', { class: `${cor} text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 transition-all` },
    icone(tipo === 'erro' ? 'circle-alert' : 'circle-check'), msg);
  $('#toasts').append(t); desenharIcones();
  setTimeout(() => { t.style.opacity = 0; setTimeout(() => t.remove(), 300); }, 3200);
}

async function api(caminho, opcoes = {}) {
  const headers = { Authorization: `Bearer ${sessionStorage.getItem('token')}` };
  if (opcoes.body && !(opcoes.body instanceof FormData)) { headers['Content-Type'] = 'application/json'; opcoes.body = JSON.stringify(opcoes.body); }
  let r;
  try { r = await fetch(`${API}${caminho}`, { ...opcoes, headers }); }
  catch { throw new Error('Sem conexão com a API. No PC, rode "python api/index.py" na pasta admin.'); }
  const dados = await r.json().catch(() => ({}));
  if (r.status === 401 && caminho !== '/login') { sair(); throw new Error('Sessão expirada, entre de novo.'); }
  if (!r.ok) throw new Error(dados.erro || 'Algo deu errado');
  return dados;
}

// ---------- Login ----------
$('#form-login').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true; $('#erro-login').textContent = '';
  try {
    const { token } = await api('/login', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
    sessionStorage.setItem('token', token);
    abrirPainel();
  } catch (err) { $('#erro-login').textContent = err.message; }
  btn.disabled = false;
});

function sair() {
  sessionStorage.removeItem('token');
  $('#tela-painel').classList.add('hidden');
  $('#tela-login').classList.remove('hidden');
}
$('#sair').addEventListener('click', sair);

// ---------- Painel ----------
function abrirPainel() {
  $('#tela-login').classList.add('hidden');
  $('#tela-painel').classList.remove('hidden');
  trocarSite(site);
}

document.querySelectorAll('[data-site-btn]').forEach(b => b.addEventListener('click', () => {
  if (alterado && !confirm('Você tem alterações não salvas. Trocar de site mesmo assim?')) return;
  trocarSite(b.dataset.siteBtn);
}));

async function trocarSite(novo) {
  site = novo; sessionStorage.setItem('site', site); alterado = false;
  $('#salvar').classList.remove('animate-pulse');
  document.querySelectorAll('[data-site-btn]').forEach(b => b.setAttribute('aria-pressed', b.dataset.siteBtn === site));
  $('#ver-site').href = SITES[site].url;
  try { config = await api(`/config/${site}`); }
  catch (err) { config = {}; aviso(err.message, 'erro'); }
  config.cores = { ...CORES_PADRAO, ...(config.cores || {}) };
  montarMenu();
  abrir(aba in abas() ? aba : 'aparencia');
}

function abas() {
  const lista = { aparencia: ['Aparência', 'palette'], textos: ['Textos e contatos', 'type'] };
  for (const [tipo, nome] of Object.entries(SITES[site].listas)) lista[`lista:${tipo}`] = [nome, 'layout-grid'];
  lista.mensagens = ['Mensagens recebidas', 'inbox'];
  return lista;
}

function montarMenu() {
  const menu = $('#menu'); menu.replaceChildren();
  for (const [id, [nome, ic]] of Object.entries(abas()))
    menu.append(h('button', { class: 'nav-item w-full flex items-center gap-3 text-sm px-3 py-2.5 rounded-xl text-mist/80 hover:bg-white/5 transition', 'data-aba': id,
      onclick: () => { abrir(id); $('#sidebar').classList.add('-translate-x-full'); } }, icone(ic), nome));
  desenharIcones();
}

function abrir(id) {
  aba = id;
  document.querySelectorAll('[data-aba]').forEach(b => b.setAttribute('aria-current', b.dataset.aba === id));
  $('#subtitulo').textContent = SITES[site].nome;
  $('#titulo').textContent = abas()[id][0];
  const temSalvar = id === 'aparencia' || id === 'textos';
  $('#salvar').classList.toggle('hidden', !temSalvar);
  $('#salvar').classList.toggle('flex', temSalvar);
  const c = $('#conteudo'); c.replaceChildren();
  if (id === 'aparencia') telaAparencia(c);
  else if (id === 'textos') telaTextos(c);
  else if (id === 'mensagens') telaMensagens(c);
  else telaLista(c, id.split(':')[1]);
  desenharIcones();
}

$('#abrir-menu').addEventListener('click', () => $('#sidebar').classList.toggle('-translate-x-full'));
window.addEventListener('beforeunload', e => { if (alterado) e.preventDefault(); });

// ---------- Campos reutilizáveis ----------
function campoImagem(valor, aoMudar) {
  const preview = h('div', { class: 'w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-black/40 border border-mist/10 grid place-items-center' });
  const url = h('input', { class: 'campo text-sm', placeholder: 'Cole um link ou envie um arquivo', value: valor || '' });
  const arquivo = h('input', { type: 'file', accept: 'image/*', class: 'hidden' });
  const mostrar = v => { preview.replaceChildren(v ? h('img', { src: v, class: 'w-full h-full object-cover', alt: '' }) : icone('image', 'w-7 h-7 text-mist/30')); desenharIcones(); };
  const rotulo = h('span', {}, 'Enviar imagem');
  const botao = h('button', { type: 'button', class: 'px-4 py-2 rounded-full border border-mist/20 hover:bg-white/5 text-sm font-semibold flex items-center gap-2', onclick: () => arquivo.click() }, icone('upload'), rotulo);
  const limpar = h('button', { type: 'button', class: 'px-4 py-2 rounded-full hover:bg-white/5 text-sm text-mist/60', onclick: () => { url.value = ''; mostrar(''); aoMudar(''); } }, 'Remover');
  url.addEventListener('input', () => { mostrar(url.value); aoMudar(url.value); });
  arquivo.addEventListener('change', async () => {
    const f = arquivo.files[0]; if (!f) return;
    const fd = new FormData(); fd.append('arquivo', f);
    botao.disabled = true; rotulo.textContent = 'Enviando...';
    try { const { url: u } = await api('/upload', { method: 'POST', body: fd }); url.value = u; mostrar(u); aoMudar(u); aviso('Imagem enviada!'); }
    catch (err) { aviso(err.message, 'erro'); }
    botao.disabled = false; rotulo.textContent = 'Enviar imagem'; arquivo.value = '';
  });
  mostrar(valor);
  return h('div', { class: 'flex gap-4 items-start' }, preview, h('div', { class: 'flex-1 space-y-2' }, url, h('div', { class: 'flex gap-2 flex-wrap' }, botao, limpar), arquivo));
}

function campoIcone(valor, aoMudar) {
  const grade = h('div', { class: 'grid grid-cols-6 sm:grid-cols-9 gap-2' });
  const marcar = v => grade.querySelectorAll('button').forEach(b => b.classList.toggle('ring-2', b.dataset.v === v));
  for (const nome of ICONES)
    grade.append(h('button', { type: 'button', 'data-v': nome, title: nome, class: 'aspect-square rounded-xl bg-black/30 hover:bg-royal/40 grid place-items-center ring-periwinkle transition',
      onclick: () => { aoMudar(nome); marcar(nome); } }, icone(nome, 'w-5 h-5')));
  marcar(valor || 'camera');
  return grade;
}

function campo([chave, rotulo, tipo], valor, aoMudar) {
  let entrada;
  if (tipo === 'imagem') entrada = campoImagem(valor, aoMudar);
  else if (tipo === 'icone') entrada = campoIcone(valor, aoMudar);
  else if (tipo === 'area') entrada = h('textarea', { class: 'campo', rows: 4, oninput: e => aoMudar(e.target.value) }, valor || '');
  else entrada = h('input', { class: 'campo', type: tipo === 'numero' ? 'number' : 'text', value: valor ?? '', oninput: e => aoMudar(e.target.value) });
  const largo = ['area', 'imagem', 'icone'].includes(tipo);
  return h(largo ? 'div' : 'label', { class: `block text-sm font-medium ${largo ? 'sm:col-span-2' : ''}` },
    h('span', { class: 'block mb-2 text-mist/80' }, rotulo), entrada);
}

const marcarAlterado = () => { alterado = true; $('#salvar').classList.add('animate-pulse'); };

// ---------- Tela: Aparência (cores + logo) ----------
function telaAparencia(c) {
  const amostra = h('div', { class: 'card p-6 overflow-hidden' });
  const desenharAmostra = () => {
    const k = config.cores;
    amostra.replaceChildren(
      h('p', { class: 'text-xs uppercase tracking-widest text-mist/50 mb-4' }, 'Prévia'),
      h('div', { class: 'rounded-2xl p-6', style: `background:${k.ice};color:${k.navy}` },
        h('p', { class: 'text-xs font-semibold uppercase tracking-widest', style: `color:${k.periwinkle}` }, 'Tema claro'),
        h('p', { class: 'font-display font-bold text-2xl mt-1' }, config.nome || 'Título'),
        h('span', { class: 'inline-block mt-4 px-5 py-2 rounded-full text-white text-sm font-semibold', style: `background:${k.royal}` }, 'Botão')),
      h('div', { class: 'rounded-2xl p-6 mt-3 bg-black', style: `color:${k.ice}` },
        h('p', { class: 'text-xs font-semibold uppercase tracking-widest', style: `color:${k.periwinkle}` }, 'Tema escuro'),
        h('p', { class: 'font-display font-bold text-2xl mt-1' }, config.nome || 'Título'),
        h('div', { class: 'mt-4 rounded-xl p-4 text-sm', style: `background:${k.navy}66;border:1px solid ${k.mist}22` }, 'Cartão de exemplo')));
  };
  const cores = h('div', { class: 'card p-6 space-y-4' }, h('p', { class: 'text-xs uppercase tracking-widest text-mist/50' }, 'Paleta de cores'));
  for (const [chave, nome] of Object.entries(NOMES_CORES)) {
    const hex = h('input', { class: 'campo text-sm font-mono uppercase !w-28', value: config.cores[chave], maxlength: 7, 'aria-label': nome });
    const seletor = h('input', { type: 'color', class: 'w-12 h-12 rounded-xl shrink-0', value: config.cores[chave], 'aria-label': nome });
    const mudar = v => { config.cores[chave] = v; marcarAlterado(); desenharAmostra(); };
    seletor.addEventListener('input', () => { hex.value = seletor.value.toUpperCase(); mudar(seletor.value); });
    hex.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(hex.value)) { seletor.value = hex.value; mudar(hex.value); } });
    cores.append(h('div', { class: 'flex items-center gap-4' }, seletor, h('div', { class: 'flex-1' }, h('p', { class: 'font-medium text-sm' }, nome), h('p', { class: 'text-xs text-mist/50' }, `--${chave}`)), hex));
  }
  cores.append(h('button', { class: 'text-sm text-periwinkle hover:underline flex items-center gap-2 pt-2',
    onclick: () => { config.cores = { ...CORES_PADRAO }; marcarAlterado(); abrir('aparencia'); } }, icone('rotate-ccw'), 'Restaurar paleta original'));
  const logo = h('div', { class: 'card p-6 lg:col-span-2' }, h('p', { class: 'text-xs uppercase tracking-widest text-mist/50 mb-4' }, 'Logo'),
    campoImagem(config.logo, v => { config.logo = v; marcarAlterado(); }));
  c.append(h('div', { class: 'grid lg:grid-cols-2 gap-6' }, cores, amostra, logo));
  desenharAmostra();
}

// ---------- Tela: Textos ----------
function telaTextos(c) {
  for (const [grupo, campos] of Object.entries(SITES[site].textos)) {
    const grade = h('div', { class: 'grid sm:grid-cols-2 gap-4 mt-5' });
    for (const def of campos) grade.append(campo(def, config[def[0]], v => { config[def[0]] = v; marcarAlterado(); }));
    c.append(h('section', { class: 'card p-6 mb-6' }, h('h3', { class: 'font-display font-bold text-lg' }, grupo), grade));
  }
}

$('#salvar').addEventListener('click', async () => {
  const btn = $('#salvar'); btn.disabled = true;
  try {
    config = await api(`/config/${site}`, { method: 'PUT', body: config });
    config.cores = { ...CORES_PADRAO, ...config.cores };
    alterado = false; btn.classList.remove('animate-pulse');
    aviso('Alterações salvas! Atualize o site para ver.');
  } catch (err) { aviso(err.message, 'erro'); }
  btn.disabled = false;
});

// ---------- Tela: Listas (produtos, serviços, equipe...) ----------
async function telaLista(c, tipo) {
  const nome = SITES[site].listas[tipo];
  const grade = h('div', { class: 'grid sm:grid-cols-2 lg:grid-cols-3 gap-4' }, h('p', { class: 'text-mist/50 text-sm' }, 'Carregando...'));
  c.append(
    h('div', { class: 'flex items-center justify-between gap-4 mb-6' },
      h('p', { class: 'text-sm text-mist/60' }, 'Os itens aparecem no site na ordem do campo "Ordem".'),
      h('button', { class: 'shrink-0 px-5 py-2.5 rounded-full bg-royal hover:bg-periwinkle font-semibold text-sm flex items-center gap-2', onclick: () => editarItem(tipo, null) }, icone('plus'), 'Adicionar')),
    grade);
  desenharIcones();
  let itens;
  try { itens = (await api(`/itens/${site}`)).filter(i => i.tipo === tipo); }
  catch (err) { grade.replaceChildren(h('p', { class: 'text-red-300 text-sm' }, err.message)); return; }
  grade.replaceChildren();
  if (!itens.length) grade.append(h('div', { class: 'card p-10 text-center sm:col-span-2 lg:col-span-3 text-mist/50' }, icone('inbox', 'w-8 h-8 mx-auto mb-3'), `Nenhum item em ${nome}.`));
  for (const item of itens) {
    const midia = item.imagem_url ? h('img', { src: item.imagem_url, class: 'w-full h-40 object-cover', alt: '' })
      : h('div', { class: 'h-40 grid place-items-center bg-gradient-to-br from-navy to-royal' }, icone(item.icone || (tipo === 'depoimento' ? 'quote' : 'image'), 'w-9 h-9 text-mist/60'));
    grade.append(h('article', { class: 'card overflow-hidden flex flex-col' }, midia,
      h('div', { class: 'p-5 flex-1 flex flex-col' },
        h('p', { class: 'font-display font-bold' }, item.titulo),
        h('p', { class: 'text-sm text-mist/60 mt-1 line-clamp-2 flex-1' }, item.subtitulo || item.descricao || item.preco || ''),
        h('div', { class: 'flex items-center gap-2 mt-4' },
          h('span', { class: 'text-xs text-mist/40 flex-1' }, `Ordem ${item.ordem}`),
          h('button', { class: 'h-9 w-9 grid place-items-center rounded-full hover:bg-white/10', title: 'Editar', 'aria-label': 'Editar', onclick: () => editarItem(tipo, item) }, icone('pencil')),
          h('button', { class: 'h-9 w-9 grid place-items-center rounded-full hover:bg-red-500/20 text-red-300', title: 'Excluir', 'aria-label': 'Excluir', onclick: () => apagarItem(item) }, icone('trash-2'))))));
  }
  desenharIcones();
}

function editarItem(tipo, item) {
  const dados = item ? { ...item } : { tipo, ordem: 0 };
  $('#modal-titulo').textContent = `${item ? 'Editar' : 'Novo'} — ${SITES[site].listas[tipo]}`;
  const box = $('#modal-campos'); box.replaceChildren();
  for (const def of CAMPOS_ITEM[tipo]) box.append(campo(def, dados[def[0]], v => dados[def[0]] = v));
  $('#form-item').onsubmit = async e => {
    e.preventDefault();
    if (!String(dados.titulo || '').trim()) return aviso('Preencha o nome/título', 'erro');
    try {
      if (item) await api(`/itens/${site}/${item.id}`, { method: 'PUT', body: dados });
      else await api(`/itens/${site}`, { method: 'POST', body: dados });
      $('#modal').close(); aviso('Item salvo!'); abrir(aba);
    } catch (err) { aviso(err.message, 'erro'); }
  };
  $('#modal').showModal(); desenharIcones();
}
document.querySelectorAll('[data-fechar]').forEach(b => b.addEventListener('click', () => $('#modal').close()));

async function apagarItem(item) {
  if (!confirm(`Excluir "${item.titulo}"?`)) return;
  try { await api(`/itens/${site}/${item.id}`, { method: 'DELETE' }); aviso('Item excluído'); abrir(aba); }
  catch (err) { aviso(err.message, 'erro'); }
}

// ---------- Tela: Mensagens ----------
async function telaMensagens(c) {
  const lista = h('div', { class: 'space-y-3' }, h('p', { class: 'text-mist/50 text-sm' }, 'Carregando...'));
  c.append(lista);
  let msgs;
  try { msgs = await api(`/contatos/${site}`); }
  catch (err) { lista.replaceChildren(h('p', { class: 'text-red-300 text-sm' }, err.message)); return; }
  lista.replaceChildren();
  if (!msgs.length) lista.append(h('div', { class: 'card p-10 text-center text-mist/50' }, icone('inbox', 'w-8 h-8 mx-auto mb-3'), 'Nenhuma mensagem ainda.'));
  const acao = async (fn) => { try { await fn(); } catch (e) { aviso(e.message, 'erro'); } abrir('mensagens'); };
  for (const m of msgs) {
    const data = new Date(m.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    lista.append(h('article', { class: `card p-5 ${m.lido ? 'opacity-60' : '!border-periwinkle/40'}` },
      h('div', { class: 'flex flex-wrap items-center gap-x-3 gap-y-1' },
        !m.lido && h('span', { class: 'w-2 h-2 rounded-full bg-periwinkle' }),
        h('p', { class: 'font-semibold' }, m.nome),
        h('a', { href: `mailto:${m.email}`, class: 'text-sm text-periwinkle hover:underline' }, m.email),
        m.telefone && h('span', { class: 'text-sm text-mist/60' }, m.telefone),
        h('span', { class: 'text-xs text-mist/40 ml-auto' }, data)),
      m.assunto && h('p', { class: 'text-xs uppercase tracking-widest text-mist/50 mt-3' }, m.assunto),
      h('p', { class: 'text-sm mt-2 whitespace-pre-wrap' }, m.mensagem || '(sem mensagem)'),
      h('div', { class: 'flex gap-2 mt-4' },
        h('button', { class: 'px-4 py-1.5 rounded-full border border-mist/20 hover:bg-white/5 text-xs font-semibold',
          onclick: () => acao(() => api(`/contatos/${m.id}`, { method: 'PUT', body: { lido: !m.lido } })) },
          m.lido ? 'Marcar como não lida' : 'Marcar como lida'),
        h('button', { class: 'px-4 py-1.5 rounded-full hover:bg-red-500/20 text-red-300 text-xs font-semibold',
          onclick: () => confirm('Excluir esta mensagem?') && acao(() => api(`/contatos/${m.id}`, { method: 'DELETE' })) },
          'Excluir'))));
  }
  desenharIcones();
}

// ---------- Início ----------
desenharIcones();
if (sessionStorage.getItem('token')) abrirPainel();
