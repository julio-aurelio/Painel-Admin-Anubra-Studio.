// ===================== Painel Admin — Anubra Studio =====================
const API = '/api';

// Endereços dos sites depois do deploy na Vercel (troque pelos seus)
const URL_LANDING = 'https://anubra-studio.vercel.app';
const URL_AGENCIA = 'https://anubra-studio-agencia.vercel.app';

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
      'Seção do Foto Livro': [['livro_titulo', 'Título'], ['livro_preco', 'Preço (opcional, ex.: A partir de R$ 300)'], ['livro_texto', 'Texto', 'area'],
        ['livro_item1', 'Destaque 1'], ['livro_item2', 'Destaque 2'], ['livro_item3', 'Destaque 3'], ['livro_imagem', 'Foto da capa do livro', 'imagem']],
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
  fotolivro: {
    nome: 'Foto Livro',
    url: 'https://anubra-studio.vercel.app/fotolivro',
    textos: {
      'Capa': [['titulo', 'Título'], ['subtitulo', 'Subtítulo'], ['autor', 'Nome / autor'], ['ano', 'Ano'], ['capa_imagem', 'Foto da capa', 'imagem']],
      'Dedicatória': [['dedicatoria', 'Texto da primeira página', 'area']],
      'Contracapa': [['contracapa_titulo', 'Título'], ['botao_texto', 'Texto do botão'], ['contracapa_texto', 'Texto', 'area'], ['contracapa_imagem', 'Foto da contracapa', 'imagem']],
      'Página do livro': [['titulo_aba', 'Título da aba do navegador'], ['dica', 'Dica abaixo do livro']],
    },
    listas: {},
  },
};

// ---------- Foto livro ----------
const LIVRO_PADRAO = window.LIVRO_PADRAO_SITE || {  // o álbum completo vem da landing; este é o reserva
  titulo: 'Anubra Studio', subtitulo: 'Cada olhar conta uma história.', autor: 'Foto Livro', ano: '2026',
  dedicatoria: 'Para quem acredita que um instante pode durar para sempre.',
  contracapa_titulo: 'Vamos criar o seu?', contracapa_texto: 'Transformamos os seus momentos em um livro para guardar.',
  botao_texto: 'Quero meu foto livro', dica: 'Clique nas páginas, use as setas do teclado ou deslize para folhear.', titulo_aba: 'Foto Livro — Anubra Studio',
  fonte_titulo: 'Syne', fonte_texto: 'Inter',
  cores: { fundo: '#05070F', capa: '#10288C', capa_texto: '#E3E9FF', pagina: '#FBFAF6', texto: '#1C285A', destaque: '#7C93F1' },
  paginas: [
    { layout: 'foto', legenda: 'Sua primeira foto aqui' },
    { layout: 'foto_texto', titulo: 'O começo', texto: 'Conte aqui a história deste ensaio.' },
    { layout: 'duas_fotos', legenda: 'Detalhes do dia' },
    { layout: 'texto', titulo: 'Um momento', texto: 'Escreva uma frase, uma lembrança ou uma dedicatória.' },
  ],
};
const NOMES_CORES_LIVRO = { fundo: 'Fundo da tela', capa: 'Capa e contracapa', capa_texto: 'Texto da capa', pagina: 'Papel das páginas', texto: 'Texto das páginas', destaque: 'Destaque e botões' };
const FONTES_LIVRO = window.LivroRender?.FONTES || ['Syne', 'Inter', 'Playfair Display', 'Cormorant Garamond', 'Montserrat', 'Dancing Script'];

// Campos de cada tipo de item
const CAMPOS_ITEM = {
  produto: [['titulo', 'Nome do ensaio'], ['descricao', 'Descrição', 'area'], ['preco', 'Preço (ex.: A partir de R$ 250)'], ['imagem_url', 'Foto', 'imagem_pos', '3/2'], ['ordem', 'Ordem', 'numero']],
  servico: [['titulo', 'Nome do serviço'], ['descricao', 'Descrição', 'area'], ['icone', 'Ícone', 'icone'], ['ordem', 'Ordem', 'numero']],
  membro: [['titulo', 'Nome'], ['subtitulo', 'Função'], ['imagem_url', 'Foto', 'imagem_pos', '4/5'], ['ordem', 'Ordem', 'numero']],
  portfolio: [['titulo', 'Nome do projeto'], ['subtitulo', 'Categoria'], ['link', 'Link (opcional)'], ['imagem_url', 'Imagem da capa', 'imagem_pos', '3/2'], ['ordem', 'Ordem', 'numero']],
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
let carregou = false;  // sem isso, salvar depois de um erro apagaria o conteúdo real
const $ = s => document.querySelector(s);
const rotaConfig = () => site === 'fotolivro' ? '/fotolivro' : `/config/${site}`;
const coresPadrao = () => site === 'fotolivro' ? LIVRO_PADRAO.cores : CORES_PADRAO;

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

// Toast com botões no lugar do confirm() do navegador
let fecharConfirmacao = null;
function confirmar(msg, textoBotao = 'Excluir', perigo = true) {
  fecharConfirmacao?.(false);
  return new Promise(resolve => {
    const fechar = v => {
      fecharConfirmacao = null;
      t.style.opacity = 0;
      setTimeout(() => t.remove(), 200);
      resolve(v);
    };
    const cancelar = h('button', { class: 'px-4 py-2 rounded-full border border-white/25 hover:bg-white/10 text-xs font-semibold', onclick: () => fechar(false) }, 'Cancelar');
    const t = h('div', { role: 'alertdialog', 'aria-label': msg, class: 'w-80 max-w-[calc(100vw-2.5rem)] bg-[#141b45] border border-mist/20 text-white text-sm p-4 rounded-2xl shadow-2xl transition-all',
      onkeydown: e => { e.stopPropagation(); if (e.key === 'Escape') fechar(false); } },
      h('p', { class: 'flex items-start gap-2' }, icone('circle-alert', `w-5 h-5 shrink-0 ${perigo ? 'text-red-300' : 'text-periwinkle'}`), msg),
      h('div', { class: 'flex justify-end gap-2 mt-4' }, cancelar,
        h('button', { class: `px-4 py-2 rounded-full text-white text-xs font-semibold ${perigo ? 'bg-red-500 hover:bg-red-400' : 'bg-royal hover:bg-periwinkle'}`, onclick: () => fechar(true) }, textoBotao)));
    fecharConfirmacao = fechar;
    $('#toasts').append(t); desenharIcones();
    cancelar.focus();
  });
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

document.querySelectorAll('[data-site-btn]').forEach(b => b.addEventListener('click', async () => {
  if (alterado && !await confirmar('Você tem alterações não salvas. Trocar de site mesmo assim?', 'Trocar')) return;
  trocarSite(b.dataset.siteBtn);
}));

async function trocarSite(novo) {
  site = novo; sessionStorage.setItem('site', site); alterado = false;
  $('#salvar').classList.remove('animate-pulse');
  document.querySelectorAll('[data-site-btn]').forEach(b => b.setAttribute('aria-pressed', b.dataset.siteBtn === site));
  $('#ver-site').href = SITES[site].url;
  carregou = false;
  try { config = await api(rotaConfig()); carregou = true; }
  catch (err) { config = {}; aviso(err.message, 'erro'); }
  if (site === 'fotolivro' && !Object.keys(config).length) config = structuredClone(LIVRO_PADRAO);
  if (site === 'fotolivro' && window.LivroRender) {
    config.paginas = (config.paginas || []).map(LivroRender.converter);
    LivroRender.definirFormato(config.formato, config.medida_largura, config.medida_altura);
  }
  marcarPendente(site === 'fotolivro' ? undefined : false);
  $('#publicar').classList.toggle('hidden', site !== 'fotolivro');
  $('#publicar').classList.toggle('flex', site === 'fotolivro');
  config.cores = { ...coresPadrao(), ...(config.cores || {}) };
  montarMenu();
  abrir(aba in abas() ? aba : 'aparencia');
}

function abas() {
  if (site === 'fotolivro') return { aparencia: ['Cores e fontes', 'palette'], textos: ['Capa e textos', 'type'], paginas: ['Editor de páginas', 'book-open'] };
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
  if (id === 'aparencia' && site === 'fotolivro') telaLivroAparencia(c);
  else if (id === 'paginas') telaEditor(c);
  else if (id === 'aparencia') telaAparencia(c);
  else if (id === 'textos') telaTextos(c);
  else if (id === 'mensagens') telaMensagens(c);
  else telaLista(c, id.split(':')[1]);
  desenharIcones();
}

$('#abrir-menu').addEventListener('click', () => $('#sidebar').classList.toggle('-translate-x-full'));
window.addEventListener('beforeunload', e => { if (alterado) e.preventDefault(); });

// ---------- Upload: toda foto vira WEBP no navegador (bem mais leve e cabe no limite da API); GIF e SVG sobem como estão ----------
async function comprimirImagem(f) {
  if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return f;
  const bmp = await createImageBitmap(f);
  const k = Math.min(1, 1920 / Math.max(bmp.width, bmp.height));
  const tela = document.createElement('canvas');
  tela.width = Math.round(bmp.width * k); tela.height = Math.round(bmp.height * k);
  tela.getContext('2d').drawImage(bmp, 0, 0, tela.width, tela.height);
  bmp.close();
  const blob = await new Promise(ok => tela.toBlob(ok, 'image/webp', .85));
  if (!blob || blob.type !== 'image/webp') return f;  // navegador antigo que não gera WEBP: sobe o original
  if (f.type === 'image/webp' && blob.size >= f.size) return f;
  return new File([blob], f.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' });
}

async function enviarImagem(f) {
  const fd = new FormData();
  fd.append('arquivo', await comprimirImagem(f));
  return (await api('/upload', { method: 'POST', body: fd })).url;
}

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
    botao.disabled = true; rotulo.textContent = 'Enviando...';
    try { const u = await enviarImagem(f); url.value = u; mostrar(u); aoMudar(u); aviso('Imagem enviada!'); }
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

// ---------- Posição da imagem: fica no fim do link ("...webp#pos=50,30") e os sites usam como object-position ----------
const separarPos = v => { const [url, pos] = String(v || '').split('#pos='); return [url, /^\d{1,3},\d{1,3}$/.test(pos || '') ? pos : '50,50']; };
const posCss = v => separarPos(v)[1].replace(',', '% ') + '%';

function seletorPosicao(url, pos, proporcao, aoMudar) {
  let [x, y] = pos.split(',').map(Number);
  const ponto = h('span', { class: 'absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-white bg-royal/60 shadow-lg pointer-events-none ring-4 ring-black/30' });
  const previa = h('img', { src: url, alt: '', class: 'w-full h-full object-cover' });
  const area = h('div', { class: 'relative inline-block max-w-full cursor-crosshair touch-none rounded-lg overflow-hidden outline-none focus-visible:ring-2 ring-periwinkle', tabindex: 0,
    role: 'slider', 'aria-label': 'Posição da imagem (use as setas)' },
    h('img', { src: url, alt: '', draggable: 'false', class: 'block max-h-60 max-w-full select-none' }), ponto);
  const aplicar = (nx, ny) => {
    x = Math.round(Math.min(100, Math.max(0, nx))); y = Math.round(Math.min(100, Math.max(0, ny)));
    ponto.style.left = `${x}%`; ponto.style.top = `${y}%`;
    previa.style.objectPosition = `${x}% ${y}%`;
    area.setAttribute('aria-valuetext', `${x}% na horizontal, ${y}% na vertical`);
  };
  const mover = e => { const r = area.getBoundingClientRect(); aplicar((e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100); };
  area.addEventListener('pointerdown', e => { area.setPointerCapture(e.pointerId); mover(e); });
  area.addEventListener('pointermove', e => { if (area.hasPointerCapture(e.pointerId)) mover(e); });
  area.addEventListener('pointerup', () => aoMudar(`${x},${y}`));
  area.addEventListener('keydown', e => {
    const passo = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[e.key];
    if (!passo) return;
    e.preventDefault(); aplicar(x + passo[0], y + passo[1]); aoMudar(`${x},${y}`);
  });
  aplicar(x, y);
  const centralizar = h('button', { type: 'button', class: 'text-xs text-periwinkle hover:underline mt-2', onclick: () => { aplicar(50, 50); aoMudar('50,50'); } }, 'Centralizar');
  return h('div', { class: 'grid sm:grid-cols-2 gap-4 items-start mt-4 p-4 rounded-xl bg-black/30 border border-mist/10' },
    h('div', {}, h('p', { class: 'text-xs text-mist/60 mb-2' }, 'Clique ou arraste no ponto da foto que deve aparecer'), area, h('div', {}, centralizar)),
    h('div', {}, h('p', { class: 'text-xs text-mist/60 mb-2' }, 'Como vai ficar no site'), h('div', { class: 'rounded-xl overflow-hidden bg-black', style: `aspect-ratio:${proporcao}` }, previa)));
}

function campoImagemPos(valor, aoMudar, proporcao = '3/2') {
  let [url, pos] = separarPos(valor);
  const salvar = () => aoMudar(!url ? '' : pos === '50,50' ? url : `${url}#pos=${pos}`);
  const seletor = h('div');
  const desenhar = () => seletor.replaceChildren(url ? seletorPosicao(url, pos, proporcao, p => { pos = p; salvar(); }) : '');
  const el = h('div', {}, campoImagem(url, v => { url = v.split('#pos=')[0]; pos = '50,50'; salvar(); desenhar(); }), seletor);
  desenhar();
  return el;
}

function campo([chave, rotulo, tipo, extra], valor, aoMudar) {
  let entrada;
  if (tipo === 'imagem') entrada = campoImagem(valor, aoMudar);
  else if (tipo === 'imagem_pos') entrada = campoImagemPos(valor, aoMudar, extra);
  else if (tipo === 'icone') entrada = campoIcone(valor, aoMudar);
  else if (tipo === 'area') entrada = h('textarea', { class: 'campo', rows: 4, oninput: e => aoMudar(e.target.value) }, valor || '');
  else if (tipo === 'numero') entrada = h('input', { class: 'campo', type: 'number', min: 0, step: 1, value: valor ?? '', oninput: e => aoMudar(e.target.value) });
  else entrada = h('input', { class: 'campo', type: 'text', value: valor ?? '', oninput: e => aoMudar(e.target.value) });
  const largo = ['area', 'imagem', 'imagem_pos', 'icone'].includes(tipo);
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
  c.append(h('div', { class: 'grid lg:grid-cols-2 gap-6' }, cores, amostra, logo, cartaoOtimizar()));
  desenharAmostra();
}

// ---------- Otimizar fotos antigas: as enviadas antes do WEBP chegavam a 5000px e travavam o site ----------
const precisaOtimizar = url => /^https?:\/\/[^#]+\/storage\/v1\/object\/public\//.test(url || '') && !/\.(webp|gif|svg)(#|$)/i.test(url);

async function otimizarUrl(url) {
  const [limpa, pos] = url.split('#');
  const r = await fetch(limpa);
  if (!r.ok) throw new Error('não foi possível baixar');
  const blob = await r.blob();
  const f = await comprimirImagem(new File([blob], 'foto', { type: blob.type }));
  if (f.type !== 'image/webp') throw new Error('este navegador não gera WEBP; use o Chrome ou o Edge');
  const fd = new FormData();
  fd.append('arquivo', f);
  const novo = (await api('/upload', { method: 'POST', body: fd })).url;
  return pos ? `${novo}#${pos}` : novo;
}

function cartaoOtimizar() {
  const status = h('p', { class: 'text-sm text-mist/60', 'aria-live': 'polite' });
  const rotulo = h('span', {}, 'Otimizar fotos agora');
  const botao = h('button', { class: 'px-5 py-2.5 rounded-full bg-royal hover:bg-periwinkle disabled:opacity-50 font-semibold text-sm flex items-center gap-2', onclick: () => otimizarFotos(botao, rotulo, status) }, icone('zap'), rotulo);
  return h('div', { class: 'card p-6 lg:col-span-2 space-y-3' },
    h('p', { class: 'text-xs uppercase tracking-widest text-mist/50' }, 'Deixar o site mais leve'),
    h('p', { class: 'text-sm text-mist/80' }, 'Converte as fotos antigas (JPG/PNG grandes) deste site para WEBP com no máximo 1920px. As fotos ficam iguais na tela, mas o site carrega muito mais rápido. Pode levar alguns minutos; não feche a página.'),
    h('div', { class: 'flex flex-wrap items-center gap-4' }, botao, status));
}

async function otimizarFotos(botao, rotulo, status) {
  if (alterado) return aviso('Salve as alterações antes de otimizar as fotos.', 'erro');
  if (!carregou) return aviso('O conteúdo não carregou. Recarregue a página.', 'erro');
  botao.disabled = true;
  try {
    status.textContent = 'Procurando fotos...';
    const itens = await api(`/itens/${site}`);
    const chaves = ['logo', ...Object.values(SITES[site].textos).flat().filter(d => d[2] === 'imagem').map(d => d[0])];
    const galerias = config.galerias || {};
    const todas = [...itens.map(i => i.imagem_url), ...chaves.map(k => config[k]), ...Object.values(galerias).flat()];
    const fila = [...new Set(todas.filter(precisaOtimizar))];
    if (!fila.length) { status.textContent = 'Tudo certo: as fotos já estão leves.'; return; }
    const novas = new Map();
    let feitas = 0, falhas = 0, proxima = 0;
    const trabalhar = async () => {  // duas por vez: rápido sem pesar a memória do computador
      while (proxima < fila.length) {
        const url = fila[proxima++];
        try { novas.set(url, await otimizarUrl(url)); } catch { falhas++; }
        rotulo.textContent = `Otimizando ${++feitas}/${fila.length}...`;
      }
    };
    await Promise.all([trabalhar(), trabalhar()]);
    status.textContent = 'Salvando...';
    const troca = u => novas.get(u) || u;
    for (const it of itens)
      if (novas.has(it.imagem_url)) await api(`/itens/${site}/${it.id}`, { method: 'PUT', body: { imagem_url: troca(it.imagem_url) } });
    if (chaves.some(k => novas.has(config[k]))) {
      for (const k of chaves) if (config[k]) config[k] = troca(config[k]);
      const salvo = await api(rotaConfig(), { method: 'PUT', body: config });
      config = { ...config, ...salvo, cores: { ...coresPadrao(), ...salvo.cores } };
    }
    for (const [id, fotos] of Object.entries(galerias))
      if (fotos.some(u => novas.has(u))) galerias[id] = (await api(`/galeria/${id}`, { method: 'PUT', body: { fotos: fotos.map(troca) } })).fotos;
    if (site === 'agencia') config.galerias = galerias;  // o PUT da config acima trocou o objeto
    status.textContent = `${novas.size} ${novas.size === 1 ? 'foto otimizada' : 'fotos otimizadas'}${falhas ? `, ${falhas} não deu (tente de novo)` : ''}. Atualize o site para ver.`;
    aviso('Fotos otimizadas!');
  } catch (err) { aviso(err.message, 'erro'); status.textContent = ''; }
  finally { botao.disabled = false; rotulo.textContent = 'Otimizar fotos agora'; }
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
  if (!carregou) return aviso('O conteúdo não carregou. Recarregue a página antes de salvar.', 'erro');
  const btn = $('#salvar'); btn.disabled = true;
  try {
    config = await api(rotaConfig(), { method: 'PUT', body: config });
    config.cores = { ...coresPadrao(), ...config.cores };
    alterado = false; btn.classList.remove('animate-pulse');
    if (site !== 'fotolivro') aviso('Alterações salvas! Atualize o site para ver.');
    else {
      marcarPendente(true);
      // "Salvar" do livro só guarda o rascunho: sem publicar, o site continua com a versão antiga
      btn.disabled = false;
      if (await confirmar('Rascunho salvo. O site só muda depois de publicar. Publicar agora?', 'Publicar', false)) publicarLivro();
    }
  } catch (err) { aviso(err.message, 'erro'); }
  btn.disabled = false;
});

// Destaca o Publicar enquanto o site mostra uma versão antiga do livro (sem valor: pergunta para a API)
async function marcarPendente(pendente) {
  if (pendente === undefined) {
    try { pendente = (await api('/fotolivro/status')).pendente; } catch { return; }
  }
  const mostrar = pendente && site === 'fotolivro';
  $('#aviso-publicar').classList.toggle('hidden', !mostrar);
  $('#aviso-publicar').classList.toggle('flex', mostrar);
  $('#publicar').classList.toggle('ring-4', mostrar);
  $('#publicar').classList.toggle('ring-amber-300/50', mostrar);
}

// ---------- Telas do foto livro ----------
function telaLivroAparencia(c) {
  const cores = h('div', { class: 'card p-6 space-y-4' }, h('p', { class: 'text-xs uppercase tracking-widest text-mist/50' }, 'Cores do livro'));
  for (const [chave, nome] of Object.entries(NOMES_CORES_LIVRO)) {
    const hex = h('input', { class: 'campo text-sm font-mono uppercase !w-28', value: config.cores[chave], maxlength: 7, 'aria-label': nome });
    const seletor = h('input', { type: 'color', class: 'w-12 h-12 rounded-xl shrink-0', value: config.cores[chave], 'aria-label': nome });
    seletor.addEventListener('input', () => { hex.value = seletor.value.toUpperCase(); config.cores[chave] = seletor.value; marcarAlterado(); });
    hex.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(hex.value)) { seletor.value = hex.value; config.cores[chave] = hex.value; marcarAlterado(); } });
    cores.append(h('div', { class: 'flex items-center gap-4' }, seletor, h('p', { class: 'flex-1 font-medium text-sm' }, nome), hex));
  }
  cores.append(h('button', { class: 'text-sm text-periwinkle hover:underline flex items-center gap-2 pt-2',
    onclick: () => { config.cores = { ...LIVRO_PADRAO.cores }; marcarAlterado(); abrir('aparencia'); } }, icone('rotate-ccw'), 'Restaurar cores originais'));
  const fontes = h('div', { class: 'card p-6 space-y-4 self-start' }, h('p', { class: 'text-xs uppercase tracking-widest text-mist/50' }, 'Fontes'));
  for (const [chave, nome] of [['fonte_titulo', 'Fonte dos títulos'], ['fonte_texto', 'Fonte dos textos']])
    fontes.append(h('label', { class: 'block text-sm font-medium' }, h('span', { class: 'block mb-2 text-mist/80' }, nome),
      h('select', { class: 'campo', onchange: e => { config[chave] = e.target.value; marcarAlterado(); } },
        FONTES_LIVRO.map(f => h('option', { value: f, selected: config[chave] === f }, f)))));
  c.append(h('div', { class: 'grid lg:grid-cols-2 gap-6' }, cores, fontes), telaLivroFormato());
}

// ---------- Formato das folhas, tamanho e capa/contracapa ----------
const OPCOES_LIVRO = {
  tamanho: ['Tamanho do livro na tela', [['grande', 'Grande'], ['medio', 'Médio'], ['pequeno', 'Pequeno']]],
  capa_tipo: ['Tipo de capa', [['dura', 'Capa dura'], ['flexivel', 'Capa flexível']]],
  capa_modelo: ['Modelo da capa', [['fundo', 'Foto de fundo'], ['moldura', 'Foto com moldura'], ['texto', 'Só texto']]],
  contracapa_modelo: ['Modelo da contracapa', [['fundo', 'Foto de fundo'], ['moldura', 'Foto com moldura'], ['texto', 'Só texto']]],
  capa_alinhar: ['Texto da capa e contracapa', [['esquerda', 'À esquerda'], ['centro', 'Centralizado']]],
};

function grupoOpcoes(rotulo, opcoes, atual, aoMudar) {
  const botoes = opcoes.map(([valor, nome, extra, detalhe]) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(valor === atual),
    class: 'px-4 py-2.5 rounded-xl border text-sm font-semibold transition flex flex-col items-center gap-2 border-mist/15 hover:bg-white/5 aria-checked:bg-royal/40 aria-checked:border-periwinkle',
    onclick: e => { botoes.forEach(b => b.setAttribute('aria-checked', String(b === e.currentTarget))); aoMudar(valor); } },
    extra, h('span', { class: 'flex flex-col items-center' }, nome, detalhe && h('span', { class: 'text-[11px] font-normal text-mist/50' }, detalhe))));
  return h('div', {}, h('p', { class: 'text-sm text-mist/80 mb-2' }, rotulo), h('div', { role: 'radiogroup', 'aria-label': rotulo, class: 'flex flex-wrap gap-2' }, botoes));
}

function telaLivroFormato() {
  // a amostra cabe numa caixa de 44px: o lado maior encosta na borda
  const amostra = prop => h('span', { class: 'block bg-ice/80 rounded-sm shadow', style: `height:${Math.round(44 / Math.max(1, prop))}px;width:${Math.round(44 * Math.min(1, prop))}px` });
  const formatos = Object.entries(LivroRender.FORMATOS).map(([valor, [nome, prop, medida]]) => [valor, nome, h('span', { class: 'h-11 grid place-items-center' }, amostra(prop)), medida]);
  formatos.push(['personalizado', 'Personalizado', h('span', { class: 'h-11 grid place-items-center' }, icone('ruler', 'w-7 h-7 text-mist/70')), 'você digita a medida']);
  const aviso = h('p', { class: 'text-xs text-amber-200/80 hidden' }, 'As páginas já montadas são ajustadas ao novo formato (fotos e textos acompanham, em %). Confira no editor antes de publicar.');
  const aplicar = () => { LivroRender.definirFormato(config.formato, config.medida_largura, config.medida_altura); aviso.classList.remove('hidden'); marcarAlterado(); };

  // medida própria: largura × altura em cm (só a proporção muda o livro; o tamanho na tela vem da opção abaixo)
  config.medida_largura ??= 21; config.medida_altura ??= 29.7;
  const previa = h('span', { class: 'block bg-ice/80 rounded-sm shadow transition-all' });
  const texto = h('p', { class: 'text-xs text-mist/50' });
  const desenharPrevia = () => {
    const prop = LivroRender.definirFormato('personalizado', config.medida_largura, config.medida_altura);
    Object.assign(previa.style, { width: `${Math.round(64 * Math.min(1, prop))}px`, height: `${Math.round(64 / Math.max(1, prop))}px` });
    const limitada = Math.abs(prop - config.medida_largura / config.medida_altura) > .001;
    texto.textContent = limitada ? 'Medida muito comprida: o livro fica no limite de 2,5 para 1.' : 'Folha de ' + `${config.medida_largura} × ${config.medida_altura} cm`.replaceAll('.', ',');
  };
  const medida = (chave, rotulo) => h('label', { class: 'text-sm' }, h('span', { class: 'block mb-1 text-mist/80' }, rotulo),
    h('input', { class: 'campo !w-32', type: 'number', min: 5, max: 100, step: 0.1, value: config[chave], 'aria-label': rotulo,
      oninput: e => { const v = +e.target.value; if (v >= 5 && v <= 100) { config[chave] = v; desenharPrevia(); aplicar(); } } }));
  const personalizado = h('div', { class: 'flex flex-wrap items-end gap-4 p-4 rounded-xl bg-black/30 border border-mist/10' },
    medida('medida_largura', 'Largura (cm)'), h('span', { class: 'pb-3 text-mist/50' }, '×'), medida('medida_altura', 'Altura (cm)'),
    h('span', { class: 'h-16 w-16 grid place-items-center' }, previa), texto);
  const mostrarPersonalizado = () => {
    personalizado.classList.toggle('hidden', config.formato !== 'personalizado');
    if (config.formato === 'personalizado') desenharPrevia();
    LivroRender.definirFormato(config.formato, config.medida_largura, config.medida_altura);
  };

  const caixa = h('section', { class: 'card p-6 mt-6 space-y-6' },
    h('div', {}, h('h3', { class: 'font-display font-bold text-lg' }, 'Formato e capa'),
      h('p', { class: 'text-sm text-mist/60 mt-1' }, 'Como as folhas, a capa e a contracapa aparecem no site.')),
    grupoOpcoes('Formato das folhas', formatos, config.formato || 'retrato', v => { config.formato = v; mostrarPersonalizado(); aplicar(); }),
    personalizado,
    aviso);
  mostrarPersonalizado();
  for (const [chave, [rotulo, opcoes]] of Object.entries(OPCOES_LIVRO))
    caixa.append(grupoOpcoes(rotulo, opcoes, config[chave] || opcoes[0][0], v => { config[chave] = v; marcarAlterado(); }));
  return caixa;
}

// ---------- Tela: Listas (produtos, serviços, equipe...) ----------
async function telaLista(c, tipo) {
  const nome = SITES[site].listas[tipo];
  const grade = h('div', { class: 'grid sm:grid-cols-2 lg:grid-cols-3 gap-4' }, h('p', { class: 'text-mist/50 text-sm' }, 'Carregando...'));
  c.append(
    h('div', { class: 'flex items-center justify-between gap-4 mb-6' },
      h('p', { class: 'text-sm text-mist/60' }, 'Os itens aparecem no site na ordem do campo "Ordem".'),
      h('button', { class: 'shrink-0 px-5 py-2.5 rounded-full bg-royal hover:bg-periwinkle font-semibold text-sm flex items-center gap-2', onclick: () => editarItem(tipo, null, Math.max(0, ...(itens || []).map(i => +i.ordem || 0)) + ((itens || []).length ? 1 : 0)) }, icone('plus'), 'Adicionar')),
    grade);
  desenharIcones();
  let itens;
  try { itens = (await api(`/itens/${site}`)).filter(i => i.tipo === tipo); }
  catch (err) { grade.replaceChildren(h('p', { class: 'text-red-300 text-sm' }, err.message)); return; }
  grade.replaceChildren();
  if (!itens.length) grade.append(h('div', { class: 'card p-10 text-center sm:col-span-2 lg:col-span-3 text-mist/50' }, icone('inbox', 'w-8 h-8 mx-auto mb-3'), `Nenhum item em ${nome}.`));
  for (const item of itens) {
    const midia = item.imagem_url ? h('img', { src: separarPos(item.imagem_url)[0], class: 'w-full h-40 object-cover', style: `object-position:${posCss(item.imagem_url)}`, alt: '' })
      : h('div', { class: 'h-40 grid place-items-center bg-gradient-to-br from-navy to-royal' }, icone(item.icone || (tipo === 'depoimento' ? 'quote' : 'image'), 'w-9 h-9 text-mist/60'));
    grade.append(h('article', { class: 'card overflow-hidden flex flex-col' }, midia,
      h('div', { class: 'p-5 flex-1 flex flex-col' },
        h('p', { class: 'font-display font-bold' }, item.titulo),
        h('p', { class: 'text-sm text-mist/60 mt-1 line-clamp-2 flex-1' }, item.subtitulo || item.descricao || item.preco || ''),
        h('div', { class: 'flex items-center gap-2 mt-4' },
          h('span', { class: 'text-xs text-mist/40 flex-1' }, `Ordem ${item.ordem}`, config.galerias?.[item.id]?.length ? ` · ${config.galerias[item.id].length} fotos no mural` : ''),
          h('button', { class: 'h-9 w-9 grid place-items-center rounded-full hover:bg-white/10', title: 'Editar', 'aria-label': 'Editar', onclick: () => editarItem(tipo, item) }, icone('pencil')),
          h('button', { class: 'h-9 w-9 grid place-items-center rounded-full hover:bg-red-500/20 text-red-300', title: 'Excluir', 'aria-label': 'Excluir', onclick: () => apagarItem(item) }, icone('trash-2'))))));
  }
  desenharIcones();
}

// ---------- Galeria do mural (portfólio da agência): opcional ----------
function campoGaleria(fotos) {
  const grade = h('div', { class: 'grid grid-cols-3 sm:grid-cols-4 gap-2' });
  const arquivo = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'hidden' });
  const rotulo = h('span', {}, 'Adicionar fotos');
  const botaoIcone = (ic, rot, desativado, fn, cls = '') => h('button', { type: 'button', 'aria-label': rot, title: rot, disabled: desativado,
    class: `h-7 w-7 grid place-items-center rounded-full bg-black/60 hover:bg-white/20 disabled:opacity-30 ${cls}`, onclick: fn }, icone(ic, 'w-3.5 h-3.5'));
  const trocar = (a, b) => { [fotos[a], fotos[b]] = [fotos[b], fotos[a]]; desenhar(); };
  const desenhar = () => {
    grade.replaceChildren(...fotos.map((u, i) => h('div', { class: 'relative aspect-square rounded-lg overflow-hidden bg-black/40' },
      h('img', { src: u, alt: `Foto ${i + 1}`, loading: 'lazy', class: 'w-full h-full object-cover' }),
      h('span', { class: 'absolute top-1 left-1 text-[10px] font-bold bg-black/60 rounded px-1.5 py-0.5' }, i + 1),
      h('div', { class: 'absolute inset-x-0 bottom-0 flex justify-between p-1 bg-gradient-to-t from-black/80 to-transparent' },
        botaoIcone('chevron-left', 'Mover para antes', i === 0, () => trocar(i, i - 1)),
        botaoIcone('trash-2', 'Remover foto', false, () => { fotos.splice(i, 1); desenhar(); }, 'text-red-300'),
        botaoIcone('chevron-right', 'Mover para depois', i === fotos.length - 1, () => trocar(i, i + 1))))));
    if (!fotos.length) grade.append(h('p', { class: 'col-span-full text-xs text-mist/40 py-4 text-center border border-dashed border-mist/15 rounded-lg' }, 'Nenhuma foto na galeria'));
    desenharIcones();
  };
  const botao = h('button', { type: 'button', class: 'px-4 py-2 rounded-full border border-mist/20 hover:bg-white/5 text-sm font-semibold flex items-center gap-2', onclick: () => arquivo.click() }, icone('images'), rotulo);
  arquivo.addEventListener('change', async () => {
    const lista = [...arquivo.files]; if (!lista.length) return;
    botao.disabled = true;
    let ok = 0;
    for (const [i, f] of lista.entries()) {  // uma por vez: a Vercel limita o tamanho de cada envio
      rotulo.textContent = `Enviando ${i + 1}/${lista.length}...`;
      try { fotos.push(await enviarImagem(f)); ok++; desenhar(); }
      catch (err) { aviso(`${f.name}: ${err.message}`, 'erro'); }
    }
    if (ok) aviso(`${ok} ${ok === 1 ? 'foto enviada' : 'fotos enviadas'}. Clique em "Salvar item" para guardar.`);
    botao.disabled = false; rotulo.textContent = 'Adicionar fotos'; arquivo.value = '';
  });
  desenhar();
  return h('div', { class: 'space-y-3' }, grade, botao, arquivo);
}

function editarItem(tipo, item, proximaOrdem = 0) {
  const dados = item ? { ...item } : { tipo, ordem: proximaOrdem };
  $('#modal-titulo').textContent = `${item ? 'Editar' : 'Novo'} — ${SITES[site].listas[tipo]}`;
  const box = $('#modal-campos'); box.replaceChildren();
  for (const def of CAMPOS_ITEM[tipo]) box.append(campo(def, dados[def[0]], v => dados[def[0]] = v));
  const fotos = tipo === 'portfolio' ? [...(config.galerias?.[item?.id] || [])] : null;
  if (fotos) box.append(h('div', { class: 'text-sm font-medium' },
    h('span', { class: 'block mb-1 text-mist/80' }, 'Galeria do mural (opcional)'),
    h('p', { class: 'text-xs text-mist/50 mb-3' }, 'Com fotos aqui, clicar no projeto abre um mural com todas elas. Sem fotos, o card continua como antes.'),
    campoGaleria(fotos)));
  $('#form-item').onsubmit = async e => {
    e.preventDefault();
    if (!String(dados.titulo || '').trim()) return aviso('Preencha o nome/título', 'erro');
    try {
      const salvo = item ? await api(`/itens/${site}/${item.id}`, { method: 'PUT', body: dados })
        : await api(`/itens/${site}`, { method: 'POST', body: dados });
      if (fotos) config.galerias = { ...config.galerias, [salvo.id]: (await api(`/galeria/${salvo.id}`, { method: 'PUT', body: { fotos } })).fotos };
      $('#modal').close(); aviso('Item salvo!'); abrir(aba);
    } catch (err) { aviso(err.message, 'erro'); }
  };
  $('#modal').showModal(); desenharIcones();
}
document.querySelectorAll('[data-fechar]').forEach(b => b.addEventListener('click', () => $('#modal').close()));

async function apagarItem(item) {
  if (!await confirmar(`Excluir "${item.titulo}"?`)) return;
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
          onclick: async () => { if (await confirmar('Excluir esta mensagem?')) acao(() => api(`/contatos/${m.id}`, { method: 'DELETE' })); } },
          'Excluir'))));
  }
  desenharIcones();
}

// ---------- Início ----------
desenharIcones();
if (sessionStorage.getItem('token')) abrirPainel();
