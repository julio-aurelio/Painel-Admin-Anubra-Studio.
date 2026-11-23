// ===================== Editor de páginas do foto livro =====================
// Usa config, api, h, icone, aviso e enviarImagem do admin.js; o desenho das páginas vem de LivroRender.
const ed = { pag: 0, sel: null, editando: null, armado: false, hist: [], futuro: [], chave: '', chaveT: 0, timer: 0, miniTimer: 0, salvando: null, denovo: false, versao: 0, W: 0, H: 0, dom: {} };
const ALCAS = { nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0] };
const CURSORES = { nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize', se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize' };
const editorAberto = () => !$('#editor').classList.contains('hidden');
const limita = (v, a, b) => Math.max(a, Math.min(b, v));

// A primeira página fica à direita da dedicatória; depois elas andam em pares
function dupla(i) {
  if (i === 0) return [null, 0];
  const esquerda = i % 2 ? i : i - 1;
  return [esquerda, esquerda + 1 < config.paginas.length ? esquerda + 1 : null];
}
function atual() {
  for (const i of dupla(ed.pag)) {
    if (i === null) continue;
    const e = config.paginas[i].elementos.find(x => x.id === ed.sel);
    if (e) return { e, i, lado: dupla(ed.pag).indexOf(i) };
  }
  return null;
}
const no = id => ed.dom.recorte?.querySelector(`[data-id="${id}"]`);

// ---------- Histórico e salvamento automático ----------
function guardar(chave = '') {
  const agora = Date.now();
  if (chave && chave === ed.chave && agora - ed.chaveT < 800) { ed.chaveT = agora; return; }
  ed.hist.push(JSON.stringify(config.paginas));
  if (ed.hist.length > 80) ed.hist.shift();
  ed.futuro = []; ed.chave = chave; ed.chaveT = agora;
  botoesHistorico();
}
function depoisDeMudar() {
  alterado = true; ed.versao++;
  marcarStatus('Alterações não salvas');
  clearTimeout(ed.timer);
  ed.timer = setTimeout(salvarRascunho, 1500);
  clearTimeout(ed.miniTimer);
  ed.miniTimer = setTimeout(atualizarMini, 250);
  botoesHistorico();
}
function voltarHistorico(de, para) {
  if (!de.length) return;
  para.push(JSON.stringify(config.paginas));
  config.paginas = JSON.parse(de.pop());
  ed.pag = limita(ed.pag, 0, config.paginas.length - 1);
  ed.sel = null; ed.chave = '';
  desenharTudo();
  depoisDeMudar();
}
const desfazer = () => voltarHistorico(ed.hist, ed.futuro);
const refazer = () => voltarHistorico(ed.futuro, ed.hist);

async function salvarRascunho() {
  clearTimeout(ed.timer);
  if (ed.salvando) { ed.denovo = true; return ed.salvando; }
  const versao = ed.versao;
  marcarStatus('Salvando...');
  ed.salvando = (async () => {
    try {
      await api('/fotolivro', { method: 'PUT', body: config });
      if (versao === ed.versao) { alterado = false; marcarStatus('Rascunho salvo'); }
      return true;
    } catch (err) { marcarStatus('Erro ao salvar'); aviso(err.message, 'erro'); return false; }
  })();
  const ok = await ed.salvando;
  ed.salvando = null;
  if (ed.denovo) { ed.denovo = false; return salvarRascunho(); }
  return ok;
}
async function publicarLivro() {
  if (!carregou) return aviso('O conteúdo não carregou. Recarregue a página antes de publicar.', 'erro');
  while (ed.salvando) await ed.salvando;
  if (!await salvarRascunho()) return;
  try { await api('/fotolivro/publicar', { method: 'POST' }); marcarStatus('Publicado'); aviso('Livro publicado no site!'); }
  catch (err) { aviso(err.message, 'erro'); }
}
$('#publicar').addEventListener('click', publicarLivro);
const marcarStatus = t => { if (ed.dom.status) ed.dom.status.textContent = t; };
function botoesHistorico() {
  if (ed.dom.desfazer) { ed.dom.desfazer.disabled = !ed.hist.length; ed.dom.refazer.disabled = !ed.futuro.length; }
}

// ---------- Abrir e fechar ----------
function telaEditor(c) {
  c.append(h('div', { class: 'card p-10 text-center' },
    icone('book-open', 'w-9 h-9 mx-auto text-periwinkle'),
    h('h3', { class: 'font-display font-bold text-xl mt-4' }, 'Monte as páginas do seu jeito'),
    h('p', { class: 'text-sm text-mist/60 mt-2 max-w-md mx-auto' }, 'Arraste fotos, textos e formas. O site só muda quando você clicar em Publicar.'),
    h('button', { class: 'mt-6 px-6 py-3 rounded-full bg-royal hover:bg-periwinkle font-semibold text-sm', onclick: abrirEditor }, 'Abrir editor')));
  abrirEditor();
}

function abrirEditor() {
  if (!window.LivroRender) return aviso('Não foi possível carregar o editor. Recarregue a página.', 'erro');
  if (!carregou) return aviso('O conteúdo não carregou. Recarregue a página.', 'erro');
  if (!config.paginas.length) config.paginas.push(LivroRender.modelo('branco'));
  ed.pag = limita(ed.pag, 0, config.paginas.length - 1);
  ed.sel = null; ed.hist = []; ed.futuro = []; ed.armado = false;
  montarEditor();
}

const mqCelular = matchMedia('(max-width: 999px)');
const celular = () => mqCelular.matches;
function montarEditor() {
  ed.folha = null;
  if (celular()) montarCelular(); else montarComputador();
}
mqCelular.addEventListener('change', () => {
  if (!editorAberto()) return;
  document.activeElement?.blur();
  montarEditor();
});
function mostrarEditor(topo, corpo) {
  const raiz = $('#editor');
  raiz.replaceChildren(topo, corpo);
  raiz.classList.remove('hidden'); raiz.classList.add('flex');
  desenharTudo();
  observaPalco.disconnect();
  observaPalco.observe(ed.dom.palco);
}

const novoTexto = (extra = {}) => ({ tipo: 'texto', x: 15, y: 42, w: 70, h: 14, texto: 'Escreva aqui', fonte: 'Inter', tam: 3.8, peso: 400, italico: false,
  cor: config.cores.texto, alinhar: 'left', linha: 1.5, sombra: false, ...extra });
function adicionarEscrevendo(dados) {
  const e = adicionar(dados);
  if (e && celular()) escreverCelular(e);
}
const ferramentasEditor = () => [
  ['type', 'Caixa de texto', () => { if (celular()) adicionarEscrevendo(novoTexto()); else { ed.armado = !ed.armado; marcarArmado(); } }],
  ['image', 'Foto', () => escolherFotos()],
  ['heading', 'Título', () => adicionarEscrevendo(novoTexto({ x: 12, y: 12, w: 76, h: 11, texto: 'Seu título', fonte: 'Syne', tam: 8, peso: 700, alinhar: 'center', linha: 1.1 }))],
  ['square', 'Retângulo', () => adicionar({ tipo: 'forma', forma: 'retangulo', x: 25, y: 35, w: 50, h: 30, cor: config.cores.destaque, raio: 0 })],
  ['circle', 'Círculo', () => adicionar({ tipo: 'forma', forma: 'circulo', x: 30, y: 38, w: 40, h: 40 * LivroRender.PROPORCAO, cor: config.cores.destaque })],
  ['minus', 'Linha', () => adicionar({ tipo: 'forma', forma: 'retangulo', x: 20, y: 50, w: 60, h: .35, cor: config.cores.texto, raio: 0 })],
];

function montarComputador() {
  ed.dom.barra = null;
  const btnTopo = (ic, rotulo, acao) => h('button', { class: 'h-9 w-9 grid place-items-center rounded-lg hover:bg-white/10 disabled:opacity-30', title: rotulo, 'aria-label': rotulo, onclick: acao }, icone(ic));
  ed.dom.desfazer = btnTopo('undo-2', 'Desfazer (Ctrl+Z)', desfazer);
  ed.dom.refazer = btnTopo('redo-2', 'Refazer (Ctrl+Y)', refazer);
  ed.dom.status = h('span', { class: 'text-xs text-mist/60 min-w-32 text-right', 'aria-live': 'polite' }, 'Rascunho');
  ed.dom.titulo = h('p', { class: 'font-display font-bold' });
  const topo = h('header', { class: 'h-14 shrink-0 flex items-center gap-3 px-4 border-b border-mist/10 bg-[#0b1030]' },
    h('button', { class: 'flex items-center gap-2 text-sm px-3 py-2 rounded-lg hover:bg-white/10', onclick: fecharEditor }, icone('arrow-left'), 'Voltar ao painel'),
    h('div', { class: 'flex-1 text-center' }, ed.dom.titulo),
    ed.dom.status, ed.dom.desfazer, ed.dom.refazer,
    h('a', { class: 'text-sm px-3 py-2 rounded-lg hover:bg-white/10', href: SITES.fotolivro.url, target: '_blank' }, 'Ver site'),
    h('button', { class: 'px-5 py-2 rounded-full bg-white text-navy hover:bg-mist font-semibold text-sm flex items-center gap-2', onclick: publicarLivro }, icone('rocket'), 'Publicar'));

  const ferramenta = (ic, rotulo, acao) => h('button', { class: 'w-full py-2.5 rounded-xl hover:bg-white/10 flex flex-col items-center gap-1 text-[11px]', 'aria-label': `Adicionar ${rotulo}`, onclick: acao }, icone(ic, 'w-5 h-5'), rotulo);
  const botoes = ferramentasEditor().map(([ic, rotulo, acao]) => ferramenta(ic, rotulo, acao));
  ed.dom.btnTexto = botoes[0];
  const ferramentas = h('nav', { class: 'w-20 shrink-0 border-r border-mist/10 bg-[#0b1030] p-2 space-y-1', 'aria-label': 'Adicionar elementos' }, botoes);

  const acaoPag = (ic, rotulo, acao) => h('button', { class: 'h-8 flex-1 grid place-items-center rounded-lg hover:bg-white/10', title: rotulo, 'aria-label': rotulo, onclick: acao }, icone(ic));
  ed.dom.lista = h('div', { class: 'flex-1 overflow-y-auto p-3 space-y-2' });
  const lateral = h('aside', { class: 'w-52 shrink-0 border-r border-mist/10 flex flex-col' },
    h('p', { class: 'text-[11px] uppercase tracking-widest text-mist/50 px-3 pt-3' }, 'Páginas'),
    ed.dom.lista,
    h('div', { class: 'flex gap-1 p-2 border-t border-mist/10' },
      acaoPag('plus', 'Nova página', () => novaPagina()), acaoPag('copy', 'Duplicar página', duplicarPagina),
      acaoPag('arrow-up', 'Subir página', () => moverPagina(-1)), acaoPag('arrow-down', 'Descer página', () => moverPagina(1)),
      acaoPag('trash-2', 'Excluir página', excluirPagina)));

  ed.dom.palco = h('main', { class: 'flex-1 min-w-0 grid place-items-center overflow-hidden bg-[#10152e]',
    ondragover: e => e.preventDefault(), ondrop: soltarArquivos });
  ed.dom.props = h('aside', { class: 'w-72 shrink-0 border-l border-mist/10 bg-[#0b1030] overflow-y-auto p-4 select-text' });

  mostrarEditor(topo, h('div', { class: 'flex-1 min-h-0 flex' }, ferramentas, lateral, ed.dom.palco, ed.dom.props));
}

// ---------- Tela do celular: página grande, ferramentas embaixo e ajustes em gaveta ----------
function montarCelular() {
  ed.dom.btnTexto = null;
  const icoBtn = (ic, rotulo, acao) => h('button', { class: 'h-10 w-10 shrink-0 grid place-items-center rounded-lg active:bg-white/10 disabled:opacity-30', 'aria-label': rotulo, onclick: acao }, icone(ic, 'w-5 h-5'));
  ed.dom.desfazer = icoBtn('undo-2', 'Desfazer', desfazer);
  ed.dom.refazer = icoBtn('redo-2', 'Refazer', refazer);
  ed.dom.status = h('p', { class: 'text-[10px] text-mist/60 truncate', 'aria-live': 'polite' }, 'Rascunho');
  ed.dom.titulo = h('p', { class: 'font-display font-bold text-sm truncate' });
  const topo = h('header', { class: 'h-12 shrink-0 flex items-center gap-1 px-1 border-b border-mist/10 bg-[#0b1030]' },
    icoBtn('arrow-left', 'Voltar ao painel', fecharEditor),
    h('div', { class: 'flex-1 min-w-0 px-1' }, ed.dom.titulo, ed.dom.status),
    ed.dom.desfazer, ed.dom.refazer,
    h('button', { class: 'h-9 px-3 shrink-0 rounded-full bg-white text-navy font-semibold text-xs flex items-center gap-1', onclick: publicarLivro }, icone('rocket', 'w-4 h-4'), 'Publicar'));

  ed.dom.palco = h('main', { class: 'flex-1 min-w-0 min-h-0 flex items-center justify-center overflow-hidden bg-[#10152e]', style: 'touch-action:none' });
  ed.dom.props = h('div', { class: 'p-4 pt-1 select-text' });
  ed.dom.lista = h('div', { class: 'flex gap-2 overflow-x-auto p-3 [&>button]:w-40 [&>button]:shrink-0' });
  const acaoPag = (ic, rotulo, acao) => h('button', { class: 'h-10 flex-1 grid place-items-center rounded-lg bg-white/5 active:bg-white/10', 'aria-label': rotulo, onclick: acao }, icone(ic, 'w-4 h-4'));
  ed.dom.folhaPaginas = h('div', { class: 'hidden' }, ed.dom.lista,
    h('div', { class: 'flex gap-1 px-3 pb-3' },
      acaoPag('plus', 'Nova página', () => novaPagina()), acaoPag('copy', 'Duplicar página', duplicarPagina),
      acaoPag('arrow-left', 'Mover página para trás', () => moverPagina(-1)), acaoPag('arrow-right', 'Mover página para frente', () => moverPagina(1)),
      acaoPag('trash-2', 'Excluir página', excluirPagina)));
  ed.dom.folhaProps = h('div', { class: 'hidden' }, ed.dom.props);
  ed.dom.gaveta = h('section', { class: 'hidden shrink-0 max-h-[42dvh] landscape:max-h-none landscape:flex-1 overflow-y-auto overscroll-contain border-t border-mist/10 bg-[#0b1030]', 'aria-label': 'Gaveta de opções' },
    h('div', { class: 'sticky top-0 z-10 flex justify-end bg-[#0b1030]' }, icoBtn('x', 'Fechar ajustes', () => abrirFolha(null))),
    ed.dom.folhaProps, ed.dom.folhaPaginas);
  ed.dom.paginaAnt = icoBtn('chevron-left', 'Página anterior', () => irPara(ed.pag - 1));
  ed.dom.paginaProx = icoBtn('chevron-right', 'Próxima página', () => irPara(ed.pag + 1));
  ed.dom.rotuloPag = h('span');
  const navegacao = h('nav', { class: 'shrink-0 flex items-center justify-between px-1 border-t border-mist/10 bg-[#0b1030]', 'aria-label': 'Trocar de página' },
    ed.dom.paginaAnt,
    h('button', { class: 'flex-1 h-10 flex items-center justify-center gap-2 text-xs font-semibold', 'aria-label': 'Ver todas as páginas', onclick: () => abrirFolha(ed.folha === 'paginas' ? null : 'paginas') },
      icone('layout-grid', 'w-4 h-4'), ed.dom.rotuloPag),
    ed.dom.paginaProx);
  ed.dom.barra = h('nav', { class: 'shrink-0 flex gap-1 overflow-x-auto px-1 pb-[max(4px,env(safe-area-inset-bottom))] bg-[#0b1030] landscape:flex-wrap', 'aria-label': 'Ferramentas' });
  const painel = h('div', { class: 'shrink-0 flex flex-col min-h-0 landscape:w-64 landscape:border-l landscape:border-mist/10 landscape:bg-[#0b1030]' }, ed.dom.gaveta, navegacao, ed.dom.barra);
  mostrarEditor(topo, h('div', { class: 'flex-1 min-h-0 flex flex-col landscape:flex-row' }, ed.dom.palco, painel));
}

function abrirFolha(qual) {
  ed.folha = qual;
  if (!ed.dom.gaveta) return;
  ed.dom.gaveta.classList.toggle('hidden', !qual);
  ed.dom.folhaPaginas.classList.toggle('hidden', qual !== 'paginas');
  ed.dom.folhaProps.classList.toggle('hidden', qual !== 'elemento' && qual !== 'pagina');
  if (qual === 'paginas') ed.dom.lista.querySelector('[aria-current]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
}

function desenharBarraCelular() {
  if (!ed.dom.barra) return;
  const a = atual();
  if (!a && ed.folha === 'elemento') abrirFolha(null);
  const item = (ic, rotulo, acao, extra = '') => h('button', { class: `w-[68px] shrink-0 py-1.5 rounded-xl active:bg-white/10 flex flex-col items-center gap-0.5 text-[10px] leading-tight ${extra}`, 'aria-label': rotulo, onclick: acao }, icone(ic, 'w-5 h-5'), rotulo);
  const itens = a
    ? [a.e.tipo === 'texto' ? item('pencil', 'Escrever', () => escreverCelular(a.e)) : a.e.tipo === 'foto' ? item('image', 'Trocar', () => escolherFotos(a.e)) : null,
      item('sliders-horizontal', 'Ajustes', () => abrirFolha(ed.folha === 'elemento' ? null : 'elemento')),
      item('copy', 'Duplicar', duplicarSelecionado),
      item('bring-to-front', 'Frente', () => moverCamada('frente')),
      item('send-to-back', 'Trás', () => moverCamada('tras')),
      item('trash-2', 'Excluir', excluirSelecionado, 'text-red-300'),
      item('check', 'Pronto', () => selecionar(null), 'text-periwinkle')]
    : [...ferramentasEditor().map(([ic, rotulo, acao]) => h('button', { class: 'w-[68px] shrink-0 py-1.5 rounded-xl active:bg-white/10 flex flex-col items-center gap-0.5 text-[10px] leading-tight', 'aria-label': `Adicionar ${rotulo}`, onclick: acao }, icone(ic, 'w-5 h-5'), rotulo)),
      item('palette', 'Fundo', () => abrirFolha(ed.folha === 'pagina' ? null : 'pagina'))];
  ed.dom.barra.replaceChildren(...itens.filter(Boolean));
}

// O teclado do celular cobriria a página, então o texto é escrito numa tela própria
function escreverCelular(e) {
  const area = h('textarea', { class: 'campo flex-1 text-base select-text', 'aria-label': 'Texto', oninput: ev => mudar(e, 'texto', ev.target.value) }, e.texto);
  const concluir = () => {
    tela.remove();
    if (!e.texto.trim()) { guardar(); removerElemento(e); depoisDeMudar(); return; }
    desenharProps(); desenharIcones();
  };
  const tela = h('div', { class: 'fixed inset-x-0 top-0 h-[60dvh] z-[66] flex flex-col gap-2 p-3 bg-[#0b1030] border-b border-mist/20 shadow-2xl', role: 'dialog', 'aria-label': 'Escrever texto' },
    h('div', { class: 'flex items-center justify-between' }, h('p', { class: 'font-display font-bold' }, 'Escrever'),
      h('button', { class: 'px-5 py-2 rounded-full bg-royal font-semibold text-sm', onclick: concluir }, 'Concluir')),
    area);
  $('#editor').append(tela);
  area.focus();
  area.select();
}

async function fecharEditor() {
  document.activeElement?.blur();
  if (alterado) await salvarRascunho();
  observaPalco.disconnect();
  $('#editor').classList.add('hidden'); $('#editor').classList.remove('flex');
  abrir('textos');
}

// ---------- Desenho ----------
function desenharTudo() {
  desenharLista();
  desenharPalco();
  desenharProps();
  botoesHistorico();
  desenharIcones();
}

function miniatura(i) {
  if (i === null) return h('div', { class: 'bg-white/5', style: 'width:72px;height:99px' });
  const p = config.paginas[i];
  const c = h('div', { class: 'relative overflow-hidden', 'data-mini': i, style: `width:72px;height:99px;container-type:size;background:${p.fundo || config.cores.pagina}` });
  LivroRender.montar(c, config.paginas, i);
  return c;
}
function linhaDupla(inicio) {
  const [a, b] = dupla(inicio), ativa = dupla(ed.pag)[0] === a && dupla(ed.pag)[1] === b;
  const rotulo = [a, b].filter(x => x !== null).map(x => x + 2).join('–');
  return h('button', { class: `w-full rounded-lg p-1.5 ${ativa ? 'bg-periwinkle/25 ring-2 ring-periwinkle' : 'hover:bg-white/5'}`, 'data-dupla': inicio,
    'aria-label': `Abrir página ${rotulo}`, 'aria-current': ativa ? 'true' : null, onclick: ev => irPara(+(ev.target.closest('[data-mini]')?.dataset.mini ?? inicio)) },
    h('div', { class: 'flex justify-center' }, miniatura(a), miniatura(b)),
    h('p', { class: 'text-[11px] text-mist/60 mt-1' }, rotulo));
}
function desenharLista() {
  const inicios = [0];
  for (let i = 1; i < config.paginas.length; i += 2) inicios.push(i);
  const topo = ed.dom.lista.scrollTop;
  ed.dom.lista.replaceChildren(...inicios.map(linhaDupla));
  ed.dom.lista.scrollTop = topo;
  ed.dom.lista.querySelector('[aria-current]')?.scrollIntoView({ block: 'nearest' });
}
function atualizarMini() {
  const inicio = dupla(ed.pag)[0] ?? 0;
  ed.dom.lista.querySelector(`[data-dupla="${inicio}"]`)?.replaceWith(linhaDupla(inicio));
  marcarMinis();
}
function marcarMinis() {
  ed.dom.lista.querySelectorAll('[data-mini]').forEach(m => {
    const ativa = +m.dataset.mini === ed.pag;
    m.style.outline = ativa ? '3px solid #7C93F1' : 'none';
    m.style.outlineOffset = '-3px';
    m.style.zIndex = ativa ? 1 : 0;
  });
}

// Deixa claro qual página recebe o que for adicionado
function marcarPagina() {
  const lados = dupla(ed.pag), lado = lados.indexOf(ed.pag), { W } = ed;
  Object.assign(ed.dom.moldura.style, { left: `${lado * W}px`, width: `${W}px` });
  ed.dom.selo.textContent = `Editando página ${ed.pag + 2}`;
  ed.dom.veu.style.left = `${(1 - lado) * W}px`;
  ed.dom.veu.style.width = `${W}px`;
  ed.dom.veu.classList.toggle('hidden', lados[1 - lado] === null);
  ed.dom.selo.classList.toggle('hidden', celular());  // no celular o título do topo já mostra a página
  ed.dom.titulo.textContent = `${celular() ? 'Página' : 'Editando página'} ${ed.pag + 2}`;
  if (ed.dom.dupla) ed.dom.dupla.style.transform = celular() ? `translateX(${lado ? -W / 2 : W / 2}px)` : '';
  if (ed.dom.barra) {
    ed.dom.rotuloPag.textContent = 'Ver páginas';
    ed.dom.paginaAnt.disabled = ed.pag === 0;
    ed.dom.paginaProx.disabled = ed.pag === config.paginas.length - 1;
  }
  marcarMinis();
}
function definirPagina(i) {
  if (i === ed.pag) return;
  ed.pag = i;
  marcarPagina();
  if (!ed.sel) { desenharProps(); desenharIcones(); }
}
function marcarArmado() {
  ed.dom.btnTexto?.classList.toggle('bg-periwinkle/40', ed.armado);
  ed.dom.btnTexto?.setAttribute('aria-pressed', ed.armado ? 'true' : 'false');
  if (ed.dom.recorte) ed.dom.recorte.style.cursor = ed.armado ? 'crosshair' : '';
  ed.dom.dica?.classList.toggle('hidden', !ed.armado);
}
function irPara(i) {
  document.activeElement?.blur();
  ed.pag = limita(i, 0, config.paginas.length - 1);
  ed.sel = null;
  desenharTudo();
}

function desenharPalco() {
  const box = ed.dom.palco;
  ed.W = celular()  // no celular cabe uma página por vez; a vizinha fica de lado
    ? Math.floor(Math.max(120, Math.min(box.clientWidth - 28, (box.clientHeight - 28) * LivroRender.PROPORCAO)))
    : Math.floor(Math.max(120, Math.min((box.clientWidth - 48) / 2, (box.clientHeight - 48) * LivroRender.PROPORCAO)));
  ed.H = Math.round(ed.W / LivroRender.PROPORCAO);
  const { W, H } = ed, lados = dupla(ed.pag);
  const recorte = h('div', { class: 'absolute inset-0 overflow-hidden', style: 'touch-action:none', onpointerdown: tocarPalco, ondblclick: duploClique,
    ontouchstart: iniciarPinca, ontouchmove: moverPinca, ontouchend: fimPinca, ontouchcancel: fimPinca });
  lados.forEach((i, lado) => {
    const pos = `left:${lado * W}px;width:${W}px`;
    if (i === null) {
      recorte.append(h('div', { class: 'absolute top-0 h-full bg-white/5 grid place-items-center text-center text-xs text-mist/40 p-6', style: pos },
        lado === 0 ? 'Dedicatória (edite em Capa e textos)' : 'Fim do livro'));
      return;
    }
    recorte.append(h('div', { class: 'absolute top-0 h-full', style: `${pos};background:${config.paginas[i].fundo || config.cores.pagina}` }));
  });
  lados.forEach((i, lado) => {
    if (i === null) return;
    const camada = h('div', { class: 'absolute top-0 h-full', style: `left:${lado * W}px;width:${W}px;container-type:size;pointer-events:none` });
    for (const e of config.paginas[i].elementos) camada.append(noEditor(e));
    recorte.append(camada);
  });
  ed.dom.recorte = recorte;
  ed.dom.caixa = h('div', { class: 'absolute pointer-events-none hidden', style: 'outline:2px solid #7C93F1' });
  ed.dom.guias = h('div', { class: 'absolute inset-0 pointer-events-none' });
  ed.dom.veu = h('div', { class: 'absolute top-0 h-full pointer-events-none bg-black/25' });
  ed.dom.selo = h('span', { class: 'absolute left-1/2 -translate-x-1/2 -top-7 whitespace-nowrap px-3 py-0.5 rounded-full bg-periwinkle text-white text-xs font-semibold' });
  ed.dom.moldura = h('div', { class: 'absolute top-0 h-full pointer-events-none', style: 'outline:3px solid #7C93F1' }, ed.dom.selo);
  ed.dom.dica = h('p', { class: 'hidden absolute left-1/2 -translate-x-1/2 -bottom-8 whitespace-nowrap text-xs text-mist' }, 'Arraste na página para desenhar a caixa de texto (Esc cancela)');
  ed.dom.dupla = h('div', { class: 'relative shrink-0', style: `width:${2 * W}px;height:${H}px;box-shadow:0 18px 50px rgb(0 0 0 / .55);transition:transform .25s` },
    recorte,
    h('div', { class: 'absolute top-0 h-full pointer-events-none', style: `left:${W - 1}px;width:2px;background:rgb(0 0 0 / .22)` }),
    ed.dom.veu, ed.dom.moldura, ed.dom.guias, ed.dom.caixa, ed.dom.dica);
  box.replaceChildren(ed.dom.dupla);
  marcarPagina();
  marcarArmado();
  desenharSelecao();
}

// No editor a caixa de texto mostra a borda, para dar para ver onde ela está
function noEditor(e) {
  const n = LivroRender.elemento(e, { editor: true });
  if (e.tipo === 'texto') n.style.outline = '1px dashed rgb(124 147 241 / .55)';
  return n;
}

function desenharSelecao() {
  const caixa = ed.dom.caixa, a = atual();
  if (!a || ed.editando) { caixa.classList.add('hidden'); return; }
  const { e, lado } = a, { W, H } = ed;
  caixa.classList.remove('hidden');
  Object.assign(caixa.style, { left: `${lado * W + e.x / 100 * W}px`, top: `${e.y / 100 * H}px`, width: `${e.w / 100 * W}px`, height: `${e.h / 100 * H}px`, transform: `rotate(${e.r || 0}deg)` });
  if (caixa.childElementCount) return;
  for (const [nome, [sx, sy]] of Object.entries(ALCAS))
    caixa.append(h('div', { class: `absolute ${celular() ? 'w-5 h-5 rounded-full' : 'w-3 h-3 rounded-sm'} bg-white border-2 border-periwinkle pointer-events-auto`, 'data-alca': nome,
      style: `left:${(sx + 1) * 50}%;top:${(sy + 1) * 50}%;translate:-50% -50%;touch-action:none;cursor:${CURSORES[nome]}`, onpointerdown: ev => iniciarRedim(ev, sx, sy) }));
  caixa.append(h('div', { class: `absolute ${celular() ? 'w-8 h-8' : 'w-5 h-5'} bg-white text-navy rounded-full grid place-items-center pointer-events-auto cursor-grab shadow`, 'data-alca': 'girar', title: 'Girar',
    style: `left:50%;top:${celular() ? -42 : -30}px;translate:-50% 0;touch-action:none`, onpointerdown: iniciarGiro }, icone('rotate-cw', celular() ? 'w-4 h-4' : 'w-3 h-3')));
  desenharIcones();
}

function selecionar(id) {
  if (ed.sel === id) return;
  ed.sel = id;
  const a = atual();
  if (a) definirPagina(a.i);
  ed.dom.caixa.replaceChildren();
  desenharSelecao();
  desenharProps();
  desenharIcones();
}
function trocarNo(e) {
  no(e.id)?.replaceWith(noEditor(e));
  desenharSelecao();
}
// A caixa de texto cresce quando o conteúdo não cabe
function ajustarAltura(e) {
  const n = no(e.id), t = n?.firstElementChild;
  if (!t || t.scrollHeight <= n.clientHeight + 1) return;
  e.h = t.scrollHeight / ed.H * 100;
  LivroRender.posicionar(n, e);
  desenharSelecao();
}

// ---------- Arrastar, redimensionar, girar ----------
function capturar(ev, mover, fim) {
  ev.preventDefault(); ev.stopPropagation();
  document.activeElement?.blur();
  const soltar = () => {
    removeEventListener('pointermove', mover);
    removeEventListener('pointerup', soltar);
    removeEventListener('pointercancel', soltar);
    ed.dom.guias.replaceChildren();
    fim?.();
  };
  addEventListener('pointermove', mover);
  addEventListener('pointerup', soltar);
  addEventListener('pointercancel', soltar);
}

function tocarPalco(ev) {
  if (ev.button !== 0 || !ev.isPrimary) return;
  if (ed.armado) { desenharCaixaTexto(ev); return; }
  const n = ev.target.closest('[data-id]');
  if (n) { if (ed.editando !== n.dataset.id) iniciarMover(ev, n.dataset.id); return; }
  if (ev.pointerType === 'touch') {  // espera soltar: o primeiro dedo de uma pinça pode cair fora do elemento
    ed.pararMover = false;
    addEventListener('pointerup', () => { if (!ed.pararMover) tocarVazio(ev.clientX); }, { once: true });
    return;
  }
  tocarVazio(ev.clientX);
}
function tocarVazio(x) {
  document.activeElement?.blur();
  const lado = x - ed.dom.recorte.getBoundingClientRect().left < ed.W ? 0 : 1, i = dupla(ed.pag)[lado];
  if (i !== null) definirPagina(i);
  selecionar(null);
  desenharProps();
  desenharIcones();
}

// Pinça com dois dedos: aumenta, diminui e gira o elemento selecionado
const medirDedos = ([a, b]) => ({ d: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY), a: Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180 / Math.PI });
function iniciarPinca(ev) {
  if (ev.touches.length !== 2 || ed.pinca) return;
  const a = atual();
  if (!a) return;
  ev.preventDefault();
  const m = medirDedos(ev.touches), e = a.e;
  ed.pararMover = true;
  ed.pinca = { e, d0: Math.max(m.d, 1), a0: m.a, w0: e.w, h0: e.h, cx: e.x + e.w / 2, cy: e.y + e.h / 2, r0: e.r || 0, tam0: e.tam, moveu: false };
}
function moverPinca(ev) {
  const p = ed.pinca;
  if (!p || ev.touches.length < 2) return;
  ev.preventDefault();
  const m = medirDedos(ev.touches), e = p.e;
  if (!p.moveu) { p.moveu = true; guardar(); }
  const k = limita(m.d / p.d0, Math.max(3 / p.w0, 2 / p.h0 > 1 ? 1 : .05), 400 / Math.max(p.w0, p.h0));
  e.w = p.w0 * k; e.h = p.h0 * k; e.x = p.cx - e.w / 2; e.y = p.cy - e.h / 2;
  let r = p.r0 + m.a - p.a0;
  r = ((r + 180) % 360 + 360) % 360 - 180;
  if (Math.abs(r - Math.round(r / 45) * 45) < 2.5) r = Math.round(r / 45) * 45;
  e.r = Math.round(r * 10) / 10;
  const n = no(e.id);
  if (e.tipo === 'texto') { e.tam = Math.round(limita(p.tam0 * k, .8, 30) * 100) / 100; n.firstElementChild.style.fontSize = `${e.tam}cqw`; }
  LivroRender.posicionar(n, e);
  desenharSelecao();
}
function fimPinca(ev) {
  if (!ed.pinca || ev.touches.length >= 2) return;
  const moveu = ed.pinca.moveu;
  ed.pinca = null;
  if (moveu) { depoisDeMudar(); desenharProps(); desenharIcones(); }
}

// Com a ferramenta ativa, arrastar desenha a caixa; um clique cria uma de tamanho padrão
function desenharCaixaTexto(ev) {
  const q = ed.dom.recorte.getBoundingClientRect(), { W, H } = ed, lado = ev.clientX - q.left < W ? 0 : 1, i = dupla(ed.pag)[lado];
  if (i === null) return;
  document.activeElement?.blur();
  selecionar(null);
  definirPagina(i);
  const px = c => limita(c - q.left - lado * W, 0, W), py = c => limita(c - q.top, 0, H);
  const x0 = px(ev.clientX), y0 = py(ev.clientY);
  let x1 = x0, y1 = y0;
  const previa = h('div', { class: 'absolute border-2 border-dashed border-periwinkle bg-periwinkle/10' });
  ed.dom.guias.append(previa);
  capturar(ev, m => {
    x1 = px(m.clientX); y1 = py(m.clientY);
    Object.assign(previa.style, { left: `${lado * W + Math.min(x0, x1)}px`, top: `${Math.min(y0, y1)}px`, width: `${Math.abs(x1 - x0)}px`, height: `${Math.abs(y1 - y0)}px` });
  }, () => {
    ed.armado = false;
    marcarArmado();
    let w = Math.abs(x1 - x0), alt = Math.abs(y1 - y0), x = Math.min(x0, x1), y = Math.min(y0, y1);
    if (w < 24 || alt < 14) { w = W * .6; alt = H * .1; x = limita(x0 - w / 2, 0, W - w); y = limita(y0 - alt / 2, 0, H - alt); }
    const e = adicionar({ tipo: 'texto', x: x / W * 100, y: y / H * 100, w: w / W * 100, h: alt / H * 100, texto: 'Escreva aqui', fonte: 'Inter', tam: 3.8, peso: 400,
      italico: false, cor: config.cores.texto, alinhar: 'left', linha: 1.5, sombra: false });
    if (e) editarTexto(e, no(e.id));
  });
}

// Ímã: alinha nas bordas e no centro das páginas e dos outros elementos (Alt desliga)
function imantar(e, lado, nx, ny) {
  const xs = [0, 50, 100, 150, 200], ys = [0, 50, 100];
  dupla(ed.pag).forEach((i, l) => {
    if (i === null) return;
    for (const o of config.paginas[i].elementos) {
      if (o === e) continue;
      xs.push(l * 100 + o.x, l * 100 + o.x + o.w / 2, l * 100 + o.x + o.w);
      ys.push(o.y, o.y + o.h / 2, o.y + o.h);
    }
  });
  const ajustar = (pos, tam, alvos, limiar) => {
    let melhor = null;
    for (const f of [0, .5, 1]) for (const a of alvos) {
      const d = a - (pos + tam * f);
      if (Math.abs(d) < limiar && (!melhor || Math.abs(d) < Math.abs(melhor.d))) melhor = { d, a };
    }
    return melhor;
  };
  const mx = ajustar(lado * 100 + nx, e.w, xs, 6 / ed.W * 100), my = ajustar(ny, e.h, ys, 6 / ed.H * 100);
  const guias = [];
  if (mx) { nx += mx.d; guias.push(h('div', { class: 'absolute top-0 h-full w-px bg-pink-400', style: `left:${mx.a / 100 * ed.W}px` })); }
  if (my) { ny += my.d; guias.push(h('div', { class: 'absolute left-0 w-full h-px bg-pink-400', style: `top:${my.a / 100 * ed.H}px` })); }
  ed.dom.guias.replaceChildren(...guias);
  return [nx, ny];
}

function iniciarMover(ev, id) {
  const eraOutro = ed.sel !== id;
  selecionar(id);
  const a = atual();
  if (!a) return;
  const { e, lado } = a, x0 = e.x, y0 = e.y, px = ev.clientX, py = ev.clientY, [esq, dir] = dupla(ed.pag), toque = ev.pointerType === 'touch';
  let moveu = false;
  ed.pararMover = false;
  capturar(ev, m => {
    if (ed.pararMover || m.pointerId !== ev.pointerId) return;  // a pinça assumiu o gesto
    const dx = m.clientX - px, dy = m.clientY - py;
    if (!moveu) { if (Math.hypot(dx, dy) < (toque ? 6 : 3)) return; moveu = true; guardar(); }
    let nx = x0 + dx / ed.W * 100, ny = y0 + dy / ed.H * 100;
    if (!m.altKey) [nx, ny] = imantar(e, lado, nx, ny); else ed.dom.guias.replaceChildren();
    // o centro não sai da parte da dupla que existe
    const minimo = (esq === null ? 100 : 0) - lado * 100, maximo = (dir === null ? 100 : 200) - lado * 100;
    e.x = limita(nx, minimo - e.w / 2, maximo - e.w / 2);
    e.y = limita(ny, -e.h / 2, 100 - e.h / 2);
    LivroRender.posicionar(no(e.id), e);
    desenharSelecao();
  }, () => {
    if (moveu) { depoisDeMudar(); if (!eraOutro) { desenharProps(); desenharIcones(); } }
    else if (toque && !eraOutro && !ed.pararMover) {  // segundo toque no elemento já selecionado
      if (e.tipo === 'texto') escreverCelular(e);
      if (e.tipo === 'foto') escolherFotos(e);
    }
  });
}

function iniciarRedim(ev, sx, sy) {
  const { e } = atual(), { W, H } = ed, r = (e.r || 0) * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r);
  const w0 = e.w / 100 * W, h0 = e.h / 100 * H, cx0 = (e.x + e.w / 2) / 100 * W, cy0 = (e.y + e.h / 2) / 100 * H, px = ev.clientX, py = ev.clientY;
  let moveu = false;
  capturar(ev, m => {
    const dx = m.clientX - px, dy = m.clientY - py;
    if (!moveu) { moveu = true; guardar(); }
    // o arraste é medido nos eixos do elemento girado, e o lado oposto fica parado
    let nw = sx ? Math.max(10, w0 + sx * (dx * cos + dy * sin)) : w0, nh = sy ? Math.max(sx ? 10 : 2, h0 + sy * (-dx * sin + dy * cos)) : h0;
    if (sx && sy && (e.tipo === 'foto') !== m.shiftKey) { const k = Math.max(nw / w0, nh / h0); nw = w0 * k; nh = h0 * k; }
    const ax = sx * (nw - w0) / 2, ay = sy * (nh - h0) / 2, cx = cx0 + ax * cos - ay * sin, cy = cy0 + ax * sin + ay * cos;
    e.w = nw / W * 100; e.h = nh / H * 100; e.x = (cx - nw / 2) / W * 100; e.y = (cy - nh / 2) / H * 100;
    LivroRender.posicionar(no(e.id), e);
    desenharSelecao();
  }, () => { if (moveu) depoisDeMudar(); });
}

function iniciarGiro(ev) {
  const { e } = atual(), q = ed.dom.caixa.getBoundingClientRect(), cx = q.left + q.width / 2, cy = q.top + q.height / 2;
  let moveu = false;
  capturar(ev, m => {
    if (!moveu) { moveu = true; guardar(); }
    let a = Math.atan2(m.clientY - cy, m.clientX - cx) * 180 / Math.PI + 90;
    if (a > 180) a -= 360;
    if (m.shiftKey) a = Math.round(a / 15) * 15;
    else if (Math.abs(a - Math.round(a / 45) * 45) < 3) a = Math.round(a / 45) * 45;
    e.r = Math.round(a * 10) / 10;
    LivroRender.posicionar(no(e.id), e);
    desenharSelecao();
  }, () => { if (moveu) { depoisDeMudar(); desenharProps(); desenharIcones(); } });
}

// ---------- Texto direto na página ----------
function duploClique(ev) {
  const n = ev.target.closest('[data-id]');
  if (!n || celular()) return;
  selecionar(n.dataset.id);
  const a = atual();
  if (a?.e.tipo === 'texto') editarTexto(a.e, n);
  if (a?.e.tipo === 'foto') escolherFotos(a.e);
}
function editarTexto(e, n) {
  const t = n.firstElementChild;
  ed.editando = e.id;
  desenharSelecao();
  try { t.contentEditable = 'plaintext-only'; } catch { t.contentEditable = 'true'; }
  t.style.userSelect = 'text'; t.style.cursor = 'text'; n.style.outline = '1px dashed #7C93F1';
  t.addEventListener('pointerdown', x => x.stopPropagation());
  t.addEventListener('keydown', x => { x.stopPropagation(); if (x.key === 'Escape') t.blur(); });
  t.addEventListener('input', () => { if (t.scrollHeight > n.clientHeight) n.style.height = `${t.scrollHeight}px`; });
  t.addEventListener('blur', () => {
    const valor = t.innerText.replace(/\n$/, '');
    ed.editando = null;
    if (valor === e.texto) { trocarNo(e); return; }
    guardar();
    if (!valor.trim()) { removerElemento(e); depoisDeMudar(); return; }
    e.texto = valor;
    trocarNo(e);
    ajustarAltura(e);
    desenharProps(); desenharIcones();
    depoisDeMudar();
  }, { once: true });
  t.focus();
  getSelection().selectAllChildren(t);
}

// ---------- Elementos ----------
function adicionar(dados) {
  if (config.paginas[ed.pag].elementos.length >= 80) return aviso('Esta página chegou ao limite de 80 elementos.', 'erro');
  guardar();
  const e = { r: 0, opacidade: 1, ...dados, id: LivroRender.novoId() };
  config.paginas[ed.pag].elementos.push(e);
  ed.sel = e.id;
  desenharPalco(); desenharProps(); desenharIcones();
  depoisDeMudar();
  return e;
}
function removerElemento(e) {
  for (const p of config.paginas) p.elementos = p.elementos.filter(x => x !== e);
  ed.sel = null;
  desenharPalco(); desenharProps(); desenharIcones();
}
function excluirSelecionado() {
  const a = atual();
  if (!a) return;
  guardar();
  removerElemento(a.e);
  depoisDeMudar();
}
function duplicarSelecionado() {
  const a = atual();
  if (a) adicionar({ ...structuredClone(a.e), x: a.e.x + 3, y: a.e.y + 3 });
}
function moverCamada(para) {
  const a = atual();
  if (!a) return;
  guardar();
  const lista = config.paginas[a.i].elementos, pos = lista.indexOf(a.e);
  lista.splice(pos, 1);
  lista.splice(para === 'frente' ? lista.length : para === 'tras' ? 0 : limita(pos + para, 0, lista.length), 0, a.e);
  desenharPalco();
  depoisDeMudar();
}

// ---------- Fotos ----------
function escolherFotos(alvo) {
  const f = h('input', { type: 'file', accept: 'image/*', multiple: !alvo, class: 'hidden' });
  f.addEventListener('change', () => { receberFotos([...f.files], alvo); f.remove(); });
  f.addEventListener('cancel', () => f.remove());
  document.body.append(f);  // o Safari do iPhone só abre a galeria com o campo na página
  f.click();
}
function medirFoto(url) {
  return new Promise(ok => { const i = new Image(); i.onload = () => ok(i.naturalHeight / i.naturalWidth); i.onerror = () => ok(1); i.src = url; });
}
async function receberFotos(arquivos, alvo) {
  const fotos = arquivos.filter(a => a.type.startsWith('image/'));
  if (!fotos.length) return;
  let n = 0;
  for (const a of fotos) {
    marcarStatus(`Enviando foto ${++n} de ${fotos.length}...`);
    try {
      const url = await enviarImagem(a);
      const vazia = alvo || config.paginas[ed.pag].elementos.find(e => e.tipo === 'foto' && !e.url);
      if (vazia) { guardar(); vazia.url = url; trocarNo(vazia); ed.sel = vazia.id; alvo = null; desenharSelecao(); desenharProps(); desenharIcones(); depoisDeMudar(); continue; }
      const prop = await medirFoto(url), w = 60, h_ = Math.min(90, w * prop * LivroRender.PROPORCAO), passo = (n - 1) * 4;
      adicionar({ tipo: 'foto', url, x: 20 + passo, y: (100 - h_) / 2 + passo, w: h_ === 90 ? 90 / prop / LivroRender.PROPORCAO : w, h: h_, zoom: 1, fx: 50, fy: 50, raio: 0 });
    } catch (err) { aviso(`${a.name}: ${err.message}`, 'erro'); }
  }
  marcarStatus(alterado ? 'Alterações não salvas' : 'Rascunho salvo');
}
function soltarArquivos(ev) {
  ev.preventDefault();
  const q = ed.dom.recorte.getBoundingClientRect(), lado = ev.clientX - q.left < ed.W ? 0 : 1, i = dupla(ed.pag)[lado];
  if (i !== null) definirPagina(i);
  const n = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-id]');
  let alvo = null;
  if (n) { ed.sel = n.dataset.id; const a = atual(); if (a?.e.tipo === 'foto') alvo = a.e; }
  receberFotos([...ev.dataTransfer.files], alvo);
}

// ---------- Páginas ----------
function novaPagina(nome = 'branco') {
  if (config.paginas.length >= 200) return aviso('O livro chegou ao limite de 200 páginas.', 'erro');
  guardar();
  config.paginas.splice(ed.pag + 1, 0, LivroRender.modelo(nome));
  irPara(ed.pag + 1);
  depoisDeMudar();
}
function duplicarPagina() {
  if (config.paginas.length >= 200) return aviso('O livro chegou ao limite de 200 páginas.', 'erro');
  guardar();
  const copia = structuredClone(config.paginas[ed.pag]);
  copia.elementos.forEach(e => { e.id = LivroRender.novoId(); });
  config.paginas.splice(ed.pag + 1, 0, copia);
  irPara(ed.pag + 1);
  depoisDeMudar();
}
function moverPagina(d) {
  const j = ed.pag + d;
  if (j < 0 || j >= config.paginas.length) return;
  guardar();
  [config.paginas[ed.pag], config.paginas[j]] = [config.paginas[j], config.paginas[ed.pag]];
  irPara(j);
  depoisDeMudar();
}
async function excluirPagina() {
  if (config.paginas.length === 1) return aviso('O livro precisa de pelo menos uma página.', 'erro');
  const pagina = config.paginas[ed.pag];
  if (!await confirmar(`Excluir a página ${ed.pag + 2}?`)) return;
  const i = config.paginas.indexOf(pagina);  // ela pode ter mudado de lugar enquanto o aviso estava aberto
  if (i < 0 || config.paginas.length === 1) return;
  guardar();
  config.paginas.splice(i, 1);
  irPara(Math.min(i, config.paginas.length - 1));
  depoisDeMudar();
}
async function aplicarModelo(nome) {
  const p = config.paginas[ed.pag];
  if (p.elementos.length && !await confirmar('Trocar o conteúdo desta página pelo modelo?', 'Trocar')) return;
  if (!config.paginas.includes(p)) return;
  guardar();
  p.elementos = LivroRender.modelo(nome).elementos;
  ed.sel = null;
  desenharTudo();
  depoisDeMudar();
}

// ---------- Painel de propriedades ----------
const secao = (titulo, ...filhos) => h('section', { class: 'mb-5' }, h('p', { class: 'text-[11px] uppercase tracking-widest text-mist/50 mb-2' }, titulo), ...filhos);
function mudar(e, campo, valor, redesenha = true) {
  guardar(`${e.id}:${campo}`);
  e[campo] = valor;
  if (redesenha) trocarNo(e);
  if (e.tipo === 'texto') ajustarAltura(e);
  depoisDeMudar();
}
function faixa(rotulo, e, campo, min, max, passo, padrao, aoMudar) {
  const saida = h('span', { class: 'text-mist/60' }, String(e[campo] ?? padrao));
  return h('label', { class: 'block text-xs mb-3' },
    h('span', { class: 'flex justify-between mb-1' }, rotulo, saida),
    h('input', { type: 'range', class: 'w-full accent-periwinkle', min, max, step: passo, value: e[campo] ?? padrao, 'aria-label': rotulo,
      oninput: ev => { saida.textContent = ev.target.value; aoMudar ? (guardar(`${e.id}:${campo}`), e[campo] = +ev.target.value, aoMudar(), depoisDeMudar()) : mudar(e, campo, +ev.target.value); } }));
}
function corCampo(rotulo, valor, aoMudar) {
  return h('label', { class: 'flex items-center justify-between text-xs mb-3' }, rotulo,
    h('input', { type: 'color', class: 'w-10 h-8 rounded-lg', value: valor, 'aria-label': rotulo, oninput: ev => aoMudar(ev.target.value) }));
}
function alternar(ic, rotulo, ativo, acao) {
  return h('button', { class: `h-9 flex-1 grid place-items-center rounded-lg ${ativo ? 'bg-periwinkle/40' : 'bg-white/5 hover:bg-white/10'}`, title: rotulo, 'aria-label': rotulo, 'aria-pressed': ativo ? 'true' : 'false', onclick: acao }, icone(ic));
}
const botaoProp = (ic, rotulo, acao, extra = '') => h('button', { class: `h-9 flex-1 grid place-items-center rounded-lg bg-white/5 hover:bg-white/10 ${extra}`, title: rotulo, 'aria-label': rotulo, onclick: acao }, icone(ic));

function desenharProps() {
  const box = ed.dom.props, a = atual();
  desenharBarraCelular();
  box.replaceChildren();
  if (!a) return propsPagina(box);
  const { e } = a;
  const redesenhaProps = () => { desenharProps(); desenharIcones(); };

  if (e.tipo === 'foto') {
    const img = () => no(e.id)?.querySelector('img');
    const reenquadra = () => { const i = img(); if (i) LivroRender.enquadrar(i, e); };
    box.append(secao('Foto',
      h('button', { class: 'w-full py-2 mb-3 rounded-lg bg-royal hover:bg-periwinkle text-sm font-semibold', onclick: () => escolherFotos(e) }, e.url ? 'Trocar foto' : 'Escolher foto'),
      faixa('Zoom', e, 'zoom', 1, 4, .05, 1, reenquadra),
      faixa('Enquadrar na horizontal', e, 'fx', 0, 100, 1, 50, reenquadra),
      faixa('Enquadrar na vertical', e, 'fy', 0, 100, 1, 50, reenquadra),
      faixa('Cantos arredondados', e, 'raio', 0, 50, 1, 0)));
  } else if (e.tipo === 'texto') {
    const area = h('textarea', { class: 'campo text-sm mb-3', rows: 4, 'aria-label': 'Texto', oninput: ev => mudar(e, 'texto', ev.target.value) }, e.texto);
    box.append(secao('Texto', area,
      h('label', { class: 'block text-xs mb-3' }, h('span', { class: 'block mb-1' }, 'Fonte'),
        h('select', { class: 'campo text-sm', 'aria-label': 'Fonte', onchange: ev => mudar(e, 'fonte', ev.target.value) },
          LivroRender.FONTES.map(f => h('option', { value: f, selected: e.fonte === f, style: `font-family:'${f}'` }, f)))),
      faixa('Tamanho', e, 'tam', .8, 30, .1, 4),
      faixa('Espaço entre linhas', e, 'linha', .8, 3, .05, 1.3),
      corCampo('Cor do texto', e.cor, v => mudar(e, 'cor', v)),
      h('div', { class: 'flex gap-1 mb-2' },
        alternar('bold', 'Negrito', e.peso === 700, () => { mudar(e, 'peso', e.peso === 700 ? 400 : 700); redesenhaProps(); }),
        alternar('italic', 'Itálico', e.italico, () => { mudar(e, 'italico', !e.italico); redesenhaProps(); }),
        alternar('sparkles', 'Sombra no texto', e.sombra, () => { mudar(e, 'sombra', !e.sombra); redesenhaProps(); })),
      h('div', { class: 'flex gap-1' }, ['left', 'center', 'right'].map(v =>
        alternar(`align-${v}`, { left: 'Alinhar à esquerda', center: 'Centralizar', right: 'Alinhar à direita' }[v], e.alinhar === v, () => { mudar(e, 'alinhar', v); redesenhaProps(); })))));
  } else {
    box.append(secao('Forma', corCampo('Cor', e.cor, v => mudar(e, 'cor', v)),
      e.forma === 'circulo' ? null : faixa('Cantos arredondados', e, 'raio', 0, 50, 1, 0)));
  }

  box.append(secao('Ajustes',
    faixa('Transparência', e, 'opacidade', .05, 1, .05, 1, () => LivroRender.posicionar(no(e.id), e)),
    faixa('Girar', e, 'r', -180, 180, 1, 0, () => { LivroRender.posicionar(no(e.id), e); desenharSelecao(); })));
  box.append(secao('Camadas', h('div', { class: 'flex gap-1' },
    botaoProp('bring-to-front', 'Trazer para frente', () => moverCamada('frente')),
    botaoProp('chevron-up', 'Subir uma camada', () => moverCamada(1)),
    botaoProp('chevron-down', 'Descer uma camada', () => moverCamada(-1)),
    botaoProp('send-to-back', 'Mandar para trás', () => moverCamada('tras')))));
  box.append(h('div', { class: 'flex gap-1' },
    botaoProp('copy', 'Duplicar elemento', duplicarSelecionado),
    botaoProp('trash-2', 'Excluir elemento', excluirSelecionado, 'text-red-300 hover:!bg-red-500/20')));
}

function propsPagina(box) {
  const p = config.paginas[ed.pag];
  box.append(h('p', { class: 'text-xs text-mist/70 leading-relaxed mb-5' }, celular()
    ? 'Toque em um elemento para selecionar e toque de novo para escrever ou trocar a foto. Arraste para mover e use dois dedos para aumentar e girar.'
    : 'Use as ferramentas à esquerda para montar a página do seu jeito. Clique em um elemento para editar, ou duas vezes em um texto para escrever e em uma foto para trocar. Você também pode arrastar fotos do computador.'));
  box.append(secao(`Página ${ed.pag + 2} selecionada`,
    corCampo('Cor de fundo', p.fundo || config.cores.pagina, v => {
      guardar(`fundo:${ed.pag}`); p.fundo = v; desenharPalco(); depoisDeMudar();
    }),
    h('button', { class: 'text-xs text-periwinkle hover:underline', onclick: () => { guardar(); p.fundo = ''; desenharPalco(); desenharProps(); desenharIcones(); depoisDeMudar(); } }, 'Usar a cor padrão do papel')));
  box.append(h('details', { class: 'rounded-lg bg-white/5 p-3' },
    h('summary', { class: 'cursor-pointer text-xs font-semibold' }, 'Usar um modelo pronto (opcional)'),
    h('div', { class: 'grid grid-cols-2 gap-2 mt-3' },
    Object.entries(LivroRender.MODELOS).map(([nome, [rotulo]]) => {
      const mini = h('div', { class: 'relative mx-auto bg-white rounded-sm overflow-hidden', style: 'width:54px;height:75px;container-type:size' });
      for (const e of LivroRender.modelo(nome).elementos) {
        const n = LivroRender.elemento(e, { editor: true });
        n.textContent = e.tipo === 'texto' ? '' : n.textContent && '';
        if (e.tipo === 'texto') n.style.background = '#c3cbe6';
        n.style.pointerEvents = 'none';
        mini.append(n);
      }
      return h('button', { class: 'rounded-lg p-2 bg-white/5 hover:bg-white/10 text-[11px]', 'aria-label': `Modelo ${rotulo}`, onclick: () => aplicarModelo(nome) }, mini, h('span', { class: 'block mt-1' }, rotulo));
    }))));
}

// ---------- Teclado ----------
addEventListener('keydown', ev => {
  if (!editorAberto() || ev.target.closest?.('input, textarea, select, [contenteditable]')) return;
  const ctrl = ev.ctrlKey || ev.metaKey, k = ev.key.toLowerCase();
  if (ctrl && k === 'z') { ev.preventDefault(); ev.shiftKey ? refazer() : desfazer(); return; }
  if (ctrl && k === 'y') { ev.preventDefault(); refazer(); return; }
  if (ctrl && k === 'd') { ev.preventDefault(); duplicarSelecionado(); return; }
  if (k === 'escape') { if (ed.armado) { ed.armado = false; marcarArmado(); } else selecionar(null); return; }
  const a = atual();
  if (!a) return;
  if (k === 'delete' || k === 'backspace') { ev.preventDefault(); excluirSelecionado(); return; }
  const passo = ev.shiftKey ? 2 : .4, seta = { arrowleft: ['x', -passo], arrowright: ['x', passo], arrowup: ['y', -passo], arrowdown: ['y', passo] }[k];
  if (seta) {
    ev.preventDefault();
    guardar(`${a.e.id}:seta`);
    a.e[seta[0]] = Math.round((a.e[seta[0]] + seta[1]) * 100) / 100;
    LivroRender.posicionar(no(a.e.id), a.e);
    desenharSelecao();
    depoisDeMudar();
  }
});

// Redesenha quando a área muda de tamanho (janela ou o Tailwind terminando de aplicar o layout ao abrir)
const observaPalco = new ResizeObserver(() => { if (editorAberto() && !ed.editando) desenharPalco(); });
