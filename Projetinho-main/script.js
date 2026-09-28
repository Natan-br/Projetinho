(() => {
  'use strict';

  // ==================================================================
  // CONSTANTES
  // ==================================================================
  const MAX_LIVES = 3;          // também é o nº máximo de estrelas por fase
  const MAX_QUEUE = 30;         // limite de setas no caminho
  const GEMS_PER_PHASE = 5;     // números espalhados no labirinto
  const HURT_MS = 500;
  const WIN_MS = 700;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const DIRECTIONS = Object.freeze({
    up:    { dr: -1, dc:  0 },
    down:  { dr:  1, dc:  0 },
    left:  { dr:  0, dc: -1 },
    right: { dr:  0, dc:  1 },
  });
  const DIR_ROTATION = Object.freeze({ up: '', down: 'rot-180', left: 'rot-n90', right: 'rot-90' });
  const DIR_LABEL = Object.freeze({ up: 'cima', down: 'baixo', left: 'esquerda', right: 'direita' });
  const KEY_TO_DIR = Object.freeze({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' });
  const BUG_PALETTES = Object.freeze([
    { a: '#6FE7A8', b: '#2FBE8A' }, { a: '#9C8CFF', b: '#6E5AE0' },
    { a: '#FF9E9E', b: '#E05C5C' }, { a: '#7AD0FF', b: '#3F9EE0' },
  ]);
  const TRAIL_POSITIONS = [1, 0, 2, 0, 1];

  // Dragãozinho de reserva (SVG embutido): entra no lugar de dragao-hero.png / dragao-jogo.png
  // automaticamente se esses arquivos de imagem ainda não tiverem sido colocados na pasta.
  const FALLBACK_DRAGON_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="#8A7CFF"/><stop offset="100%" stop-color="#3FD0D4"/>' +
    '</linearGradient></defs>' +
    '<ellipse cx="50" cy="60" rx="34" ry="28" fill="url(#g)"/>' +
    '<path d="M26 36 L17 16 L35 28 Z" fill="url(#g)"/>' +
    '<path d="M74 36 L83 16 L65 28 Z" fill="url(#g)"/>' +
    '<circle cx="38" cy="56" r="7" fill="#0A1030"/><circle cx="62" cy="56" r="7" fill="#0A1030"/>' +
    '<circle cx="40" cy="54" r="2.4" fill="#EAF1FF"/><circle cx="64" cy="54" r="2.4" fill="#EAF1FF"/>' +
    '<path d="M38 72 Q50 80 62 72" stroke="#0A1030" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '</svg>'
  )}`;

  // ==================================================================
  // FASES — labirinto, conta e dificuldade dos Bugs sobem a cada nível
  // (dados somente-leitura: o jogo nunca altera este array)
  // ==================================================================
  const PHASES = [
    { rows:6, cols:6, dificuldade:'Fácil',
      grid:[[0,0,0,0,0,0],[0,1,1,1,1,0],[0,1,1,0,1,0],[0,1,0,1,1,0],[0,1,1,1,1,0],[0,0,0,0,0,0]],
      start:{r:1,c:1}, question:'8 × 4', correctValue:32, decoys:[12,40,18,24],
      bugPaths:[[{r:2,c:1},{r:2,c:2},{r:1,c:2}],[{r:3,c:4},{r:4,c:4},{r:4,c:3}]],
      bugStepsPerMove:1, stepDelay:430 },
    { rows:6, cols:6, dificuldade:'Fácil+',
      grid:[[0,0,0,0,0,0],[0,1,1,1,1,0],[0,1,0,1,1,0],[0,1,1,0,1,0],[0,1,1,1,1,0],[0,0,0,0,0,0]],
      start:{r:1,c:1}, question:'45 + 27', correctValue:72, decoys:[62,92,82,52],
      bugPaths:[[{r:2,c:3},{r:2,c:4},{r:1,c:4}],[{r:3,c:2},{r:3,c:1},{r:4,c:1}]],
      bugStepsPerMove:1, stepDelay:400 },
    { rows:7, cols:7, dificuldade:'Médio',
      grid:[[0,0,0,0,0,0,0],[0,1,1,1,1,1,0],[0,1,1,0,1,1,0],[0,1,0,1,1,1,0],[0,1,1,1,0,1,0],[0,1,1,1,1,1,0],[0,0,0,0,0,0,0]],
      start:{r:1,c:1}, question:'9 × 7', correctValue:63, decoys:[56,70,81,49],
      bugPaths:[[{r:2,c:2},{r:2,c:1},{r:3,c:1}],[{r:3,c:3},{r:3,c:4},{r:2,c:4}],[{r:4,c:2},{r:5,c:2},{r:5,c:3}]],
      bugStepsPerMove:1, stepDelay:370 },
    { rows:7, cols:7, dificuldade:'Médio+',
      grid:[[0,0,0,0,0,0,0],[0,1,1,1,1,1,0],[0,1,0,1,1,1,0],[0,1,1,1,0,1,0],[0,1,0,1,1,1,0],[0,1,1,1,1,1,0],[0,0,0,0,0,0,0]],
      start:{r:1,c:1}, question:'84 ÷ 4', correctValue:21, decoys:[20,28,24,18],
      bugPaths:[[{r:1,c:4},{r:2,c:4},{r:2,c:5}],[{r:4,c:4},{r:4,c:5},{r:5,c:5}],[{r:3,c:2},{r:3,c:3},{r:2,c:3}]],
      bugStepsPerMove:2, stepDelay:340 },
    { rows:8, cols:8, dificuldade:'Difícil',
      grid:[[0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,0],[0,1,1,0,1,1,1,0],[0,1,1,1,1,0,1,0],[0,1,0,1,1,1,1,0],[0,1,1,1,0,1,1,0],[0,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0]],
      start:{r:1,c:1}, question:'(6 × 4) + 5', correctValue:29, decoys:[24,34,19,44],
      bugPaths:[[{r:2,c:2},{r:2,c:1},{r:3,c:1}],[{r:2,c:5},{r:2,c:6},{r:3,c:6}],[{r:5,c:2},{r:5,c:1},{r:6,c:1}],[{r:5,c:5},{r:5,c:6},{r:6,c:6}]],
      bugStepsPerMove:2, stepDelay:300 },
  ];

  // ==================================================================
  // ESTADO
  // ==================================================================
  const progress = PHASES.map((_, i) => ({ unlocked: i === 0, stars: 0 }));
  const state = {
    phaseIndex: 0,
    phase: PHASES[0],
    numbers: [],          // [{r, c, v}] gemas da tentativa atual
    lives: MAX_LIVES,
    dragon: { r: 0, c: 0 },
    bugs: [],             // [{idx, dir}] posição de cada Bug ao longo do seu percurso
    queue: [],            // setas planejadas
    running: false,
    runId: 0,             // muda a cada execução/reinício: cancela loops antigos
    metrics: { cellW: 0, cellH: 0, stepX: 0, stepY: 0 }, // tamanho real (px) de uma célula do labirinto
  };
  const refs = { dragon: null, bugs: [] };

  // ==================================================================
  // DOM
  // ==================================================================
  const $ = (id) => document.getElementById(id);
  const el = {
    app: $('app'),
    trilha: $('trilha'), selectMsg: $('selectMsg'),
    phaseLabel: $('faseLabel'), lives: $('vidasLabel'), question: $('perguntaTexto'),
    maze: $('maze'), path: $('caminhoBox'), msg: $('msg'),
    btnExecute: $('btnExecutar'), btnClear: $('btnLimpar'),
    tutorial: $('tutorial'), btnStart: $('btnComecar'),
    result: { overlay: $('resultOverlay'), icon: $('resultIcon'), title: $('resultTitulo'), text: $('resultTexto'), action: $('btnResultAcao') },
    screenGame: $('screen-game'),
  };
  const dirButtons = document.querySelectorAll('.dbtn');
  const screens = document.querySelectorAll('.screen');

  const div = (className) => { const d = document.createElement('div'); d.className = className; return d; };

  /** <svg><use href="#id"/></svg> montado por DOM (sem innerHTML). */
  function svgRef(id, className = '') {
    const svg = document.createElementNS(SVG_NS, 'svg');
    if (className) svg.setAttribute('class', className);
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', `#${id}`);
    svg.append(use);
    return svg;
  }

  /** Inseto: só interpola constantes internas (paleta + índice numérico), nunca texto externo. */
  function bugMarkup(i) {
    const c = BUG_PALETTES[i % BUG_PALETTES.length];
    return `<svg class="bug-svg" viewBox="0 0 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="bugG${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${c.a}"/><stop offset="100%" stop-color="${c.b}"/></linearGradient></defs>
      <ellipse cx="50" cy="58" rx="29" ry="25" fill="url(#bugG${i})"/>
      <line x1="24" y1="55" x2="8" y2="48" stroke="${c.a}" stroke-width="5" stroke-linecap="round"/>
      <line x1="24" y1="65" x2="8" y2="72" stroke="${c.a}" stroke-width="5" stroke-linecap="round"/>
      <line x1="76" y1="55" x2="92" y2="48" stroke="${c.a}" stroke-width="5" stroke-linecap="round"/>
      <line x1="76" y1="65" x2="92" y2="72" stroke="${c.a}" stroke-width="5" stroke-linecap="round"/>
      <path d="M38 34 Q34 20 26 16" stroke="#20223a" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M62 34 Q66 20 74 16" stroke="#20223a" stroke-width="3" fill="none" stroke-linecap="round"/>
      <circle cx="26" cy="15" r="3" fill="#20223a"/><circle cx="74" cy="15" r="3" fill="#20223a"/>
      <circle cx="39" cy="52" r="9" fill="white"/><circle cx="61" cy="52" r="9" fill="white"/>
      <circle cx="40" cy="53" r="4.4" fill="#20223a"/><circle cx="62" cy="53" r="4.4" fill="#20223a"/>
      <path d="M42 70 Q50 76 58 70" stroke="#20223a" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    </svg>`;
  }

  /** Se dragao-hero.png / dragao-jogo.png não existirem ainda, cai para o SVG de reserva. */
  function attachDragonFallback(img) {
    if (!img) return;
    img.addEventListener('error', () => {
      if (img.src !== FALLBACK_DRAGON_SVG) img.src = FALLBACK_DRAGON_SVG;
    }, { once: true });
  }

  // ==================================================================
  // UTILITÁRIOS
  // ==================================================================
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const isDirection = (dir) => Object.prototype.hasOwnProperty.call(DIRECTIONS, dir);
  const setMsg = (text) => { el.msg.textContent = text || '\u00A0'; };

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function eligibleCells(phase) {
    const cells = [];
    for (let r = 0; r < phase.rows; r++) {
      for (let c = 0; c < phase.cols; c++) {
        if (phase.grid[r][c] === 1 && !(r === phase.start.r && c === phase.start.c)) cells.push({ r, c });
      }
    }
    return cells;
  }

  /**
   * Casas onde o dragão consegue PARAR sem esbarrar em nenhum Bug, com até MAX_QUEUE jogadas
   * (busca em largura usando as mesmas regras do jogo). Serve para nunca gerar uma fase impossível.
   */
  const safeCellsCache = new Map();
  function safeEndCells(phase) {
    if (safeCellsCache.has(phase)) return safeCellsCache.get(phase);
    const key = (st) => `${st.dragon.r},${st.dragon.c}|${st.bugs.map((b) => `${b.idx}${b.dir}`).join('')}`;
    const first = { dragon: { ...phase.start }, bugs: phase.bugPaths.map(() => ({ idx: 0, dir: 1 })) };
    const seen = new Set([key(first)]);
    const cells = new Set();
    let frontier = [first];
    for (let depth = 0; depth < MAX_QUEUE && frontier.length; depth++) {
      const next = [];
      for (const st of frontier) {
        for (const dir of Object.keys(DIRECTIONS)) {
          const after = stepWorld(phase, st.dragon, st.bugs, dir);
          if (after.hit || seen.has(key(after))) continue;
          seen.add(key(after));
          cells.add(`${after.dragon.r},${after.dragon.c}`);
          next.push(after);
        }
      }
      frontier = next;
    }
    safeCellsCache.set(phase, cells);
    return cells;
  }

  function generateNumbers(phase) {
    const safe = safeEndCells(phase);
    const cells = shuffle(eligibleCells(phase));
    const correctCell = cells.find((cell) => safe.has(`${cell.r},${cell.c}`)) || cells[0];
    const decoys = shuffle(phase.decoys);
    const others = cells.filter((cell) => cell !== correctCell).slice(0, GEMS_PER_PHASE - 1);
    return [
      { r: correctCell.r, c: correctCell.c, v: phase.correctValue },
      ...others.map((cell, i) => ({ r: cell.r, c: cell.c, v: decoys[i] })),
    ];
  }

  // ==================================================================
  // OVERLAYS (com foco preso e fundo inerte)
  // ==================================================================
  let returnFocus = null;
  function openOverlay(overlay, focusTarget) {
    returnFocus = document.activeElement;
    overlay.hidden = false;
    el.app.inert = true;
    focusTarget.focus();
  }
  function closeOverlay(overlay) {
    if (overlay.hidden) return;
    overlay.hidden = true;
    el.app.inert = false;
    if (returnFocus && returnFocus.isConnected) returnFocus.focus();
    returnFocus = null;
  }

  let resultAction = null;
  function showResult({ icon, titulo, texto, acaoTexto, onAction }) {
    el.result.icon.replaceChildren(svgRef(`ic-${icon}`, `ic ${icon === 'star' ? 'gold' : 'ice'}`));
    el.result.title.textContent = titulo;
    el.result.text.textContent = texto;
    el.result.action.textContent = acaoTexto;
    resultAction = onAction;
    openOverlay(el.result.overlay, el.result.action);
  }
  el.result.action.addEventListener('click', () => { if (resultAction) resultAction(); });
  el.btnStart.addEventListener('click', () => closeOverlay(el.tutorial));

  // ==================================================================
  // NAVEGAÇÃO
  // ==================================================================
  function showScreen(id) {
    screens.forEach((s) => s.classList.toggle('active', s.id === id));
    if (id === 'screen-select') buildTrilha();
  }

  $('btnIniciar').addEventListener('click', () => showScreen('screen-select'));
  $('btnVoltarInicio').addEventListener('click', () => showScreen('screen-start'));
  $('btnVoltarFases').addEventListener('click', () => {
    state.runId++;                 // cancela uma execução em andamento
    showScreen('screen-select');
  });

  // ==================================================================
  // TELA DE SELEÇÃO DE FASES
  // ==================================================================
  function buildTrilha() {
    el.selectMsg.textContent = '';
    const rows = PHASES.map((phase, i) => {
      const meta = progress[i];
      const row = div(`fase-node-row pos-${TRAIL_POSITIONS[i % TRAIL_POSITIONS.length]}`);

      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'fase-node';
      node.setAttribute('aria-label', meta.unlocked
        ? `Fase ${i + 1}, ${phase.dificuldade}, ${meta.stars} de ${MAX_LIVES} estrelas`
        : `Fase ${i + 1}, bloqueada`);
      if (!meta.unlocked) node.setAttribute('aria-disabled', 'true');

      const badge = div(`fase-badge ${meta.unlocked ? 'unlocked' : 'locked'}`);
      if (meta.unlocked) {
        const inner = div('inner');
        inner.textContent = String(i + 1);
        badge.append(inner);
      } else {
        badge.append(svgRef('ic-lock', 'ic'));
      }

      const diff = div('fase-diff');
      diff.textContent = meta.unlocked ? phase.dificuldade : '???';

      const stars = div('stars-row');
      for (let s = 0; s < MAX_LIVES; s++) {
        const on = meta.unlocked && s < meta.stars;
        stars.append(svgRef(on ? 'ic-star' : 'ic-star-o', `ic ${on ? 'on' : 'off'}`));
      }

      node.append(badge, diff, stars);
      node.addEventListener('click', () => {
        if (progress[i].unlocked) startPhase(i);
        else el.selectMsg.textContent = 'Complete a fase anterior para desbloquear.';
      });

      row.append(node);
      return row;
    });
    el.trilha.replaceChildren(...rows);
  }

  function startPhase(index) {
    showScreen('screen-game');
    resetPhase(index);
    openOverlay(el.tutorial, el.btnStart);
  }

  // ==================================================================
  // JOGO — desenho
  // ==================================================================

  /**
   * Mede o tamanho real (em px) de uma célula do labirinto e a distância entre células
   * vizinhas, já contando o "gap" do CSS Grid. Sem isso, dragão/bugs eram posicionados
   * com transform em % (relativo ao próprio tamanho do token), que ignora o gap e some
   * desalinhando cada vez mais conforme o labirinto cresce (bug visual nas fases 3+).
   */
  function measureMazeMetrics() {
    const { rows, cols } = state.phase;
    const cells = el.maze.querySelectorAll('.cell');
    const rect = el.maze.getBoundingClientRect();
    if (cells.length < cols + 1 || rect.width === 0) {
      // fallback (ex.: tela ainda oculta) — aproximação sem gap
      return { cellW: rect.width / cols, cellH: rect.height / rows, stepX: rect.width / cols, stepY: rect.height / rows };
    }
    const c0 = cells[0].getBoundingClientRect();
    const c1 = cells[1].getBoundingClientRect();
    const c2 = cells[cols].getBoundingClientRect();
    return { cellW: c0.width, cellH: c0.height, stepX: c1.left - c0.left, stepY: c2.top - c0.top };
  }

  function applyTokenSizes() {
    const { cellW, cellH } = state.metrics;
    if (!cellW || !cellH) return;
    if (refs.dragon) { refs.dragon.style.width = `${cellW}px`; refs.dragon.style.height = `${cellH}px`; }
    refs.bugs.forEach((token) => { token.style.width = `${cellW}px`; token.style.height = `${cellH}px`; });
  }

  function positionToken(node, { r, c }) {
    const { stepX, stepY } = state.metrics;
    node.style.transform = `translate(${c * stepX}px, ${r * stepY}px)`;
  }

  function positionActors() {
    if (!refs.dragon) return;
    positionToken(refs.dragon, state.dragon);
    state.bugs.forEach((bug, i) => positionToken(refs.bugs[i], state.phase.bugPaths[i][bug.idx]));
  }

  function refreshMazeLayout() {
    if (!el.screenGame.classList.contains('active') || !refs.dragon) return;
    state.metrics = measureMazeMetrics();
    applyTokenSizes();
    positionActors();
  }

  let resizePending = false;
  window.addEventListener('resize', () => {
    if (resizePending) return;
    resizePending = true;
    requestAnimationFrame(() => { resizePending = false; refreshMazeLayout(); });
  });

  function setDragonMode(mode) {
    if (refs.dragon) refs.dragon.className = `token ${mode}`;
  }

  function createToken(className) {
    return div(className);
  }

  function createGem(value) {
    const gem = div('gem');
    const label = div('gem-num');
    label.textContent = String(value);
    gem.append(svgRef('sp-gem'), label);
    return gem;
  }

  function buildMaze() {
    const { rows, cols, grid, bugPaths } = state.phase;
    const gemAt = new Map(state.numbers.map((n) => [`${n.r},${n.c}`, n.v]));

    el.maze.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    el.maze.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    const frag = document.createDocumentFragment();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = div(`cell ${grid[r][c] === 1 ? 'path' : 'wall'}`);
        const value = gemAt.get(`${r},${c}`);
        if (value !== undefined) cell.append(createGem(value));
        frag.append(cell);
      }
    }

    refs.dragon = createToken('token idle');
    const dragonAvatar = $('tplDragon').content.firstElementChild.cloneNode(true);
    attachDragonFallback(dragonAvatar.querySelector('img'));
    refs.dragon.append(dragonAvatar);
    frag.append(refs.dragon);

    refs.bugs = bugPaths.map((_, i) => {
      const token = createToken('token');
      token.insertAdjacentHTML('beforeend', bugMarkup(i));
      frag.append(token);
      return token;
    });

    el.maze.replaceChildren(frag);

    // as células já estão no DOM: dá para medir o tamanho real de cada uma agora
    state.metrics = measureMazeMetrics();
    applyTokenSizes();
    positionActors();
  }

  function renderLives() {
    const hearts = Array.from({ length: MAX_LIVES }, (_, i) => {
      const alive = i < state.lives;
      return svgRef(alive ? 'ic-heart' : 'ic-heart-o', `ic ${alive ? 'on' : 'off'}`);
    });
    el.lives.replaceChildren(...hearts);
    el.lives.setAttribute('aria-label', `Vidas: ${state.lives} de ${MAX_LIVES}`);
  }

  function renderQueue() {
    if (state.queue.length === 0) {
      const vazio = document.createElement('span');
      vazio.className = 'vazio';
      vazio.textContent = 'toque nas setas para planejar seu caminho…';
      el.path.replaceChildren(vazio);
      return;
    }
    el.path.replaceChildren(...state.queue.map((dir) => {
      const chip = div('chip');
      chip.setAttribute('role', 'img');
      chip.setAttribute('aria-label', DIR_LABEL[dir]);
      chip.append(svgRef('ic-chevron', `ic ${DIR_ROTATION[dir]}`.trim()));
      return chip;
    }));
  }

  function setControlsEnabled(enabled) {
    el.btnExecute.disabled = !enabled;
    el.btnClear.disabled = !enabled;
    dirButtons.forEach((b) => { b.disabled = !enabled; });
  }

  // ==================================================================
  // JOGO — regras
  // ==================================================================
  function resetActors() {
    state.dragon = { ...state.phase.start };
    state.bugs = state.phase.bugPaths.map(() => ({ idx: 0, dir: 1 }));
  }

  function isWalkable(phase, r, c) {
    return r >= 0 && r < phase.rows && c >= 0 && c < phase.cols && phase.grid[r][c] === 1;
  }

  /**
   * Um passo do jogo, sem mexer no DOM: anda o dragão e depois os Bugs (1 ou 2 casas por jogada).
   * `hit` = um Bug caiu na casa do dragão em QUALQUER ponto do passo (inclusive no meio do
   * caminho dos Bugs de 2 casas) OU os dois se cruzaram trocando de casa.
   */
  function stepWorld(phase, dragon, bugs, dir) {
    const { dr, dc } = DIRECTIONS[dir];
    const r = dragon.r + dr;
    const c = dragon.c + dc;
    const to = isWalkable(phase, r, c) ? { r, c } : dragon;
    const next = bugs.map((b) => ({ ...b }));
    let hit = false;
    for (let k = 0; k < phase.bugStepsPerMove && !hit; k++) {
      next.forEach((bug, i) => {
        const path = phase.bugPaths[i];
        const before = path[bug.idx];
        let idx = bug.idx + bug.dir;
        if (idx < 0 || idx >= path.length) { bug.dir *= -1; idx = bug.idx + bug.dir; }
        bug.idx = idx;
        const after = path[idx];
        const landedOnDragon = after.r === to.r && after.c === to.c;
        const swapped = before.r === to.r && before.c === to.c && after.r === dragon.r && after.c === dragon.c;
        if (landedOnDragon || swapped) hit = true;
      });
    }
    return { dragon: to, bugs: next, hit };
  }

  /** Aplica um passo ao jogo e desenha. Devolve true se o dragão esbarrou em um Bug. */
  function moveDragon(dir) {
    const result = stepWorld(state.phase, state.dragon, state.bugs, dir);
    state.dragon = result.dragon;
    state.bugs = result.bugs;
    positionActors();
    return result.hit;
  }

  function resetPhase(index) {
    const phase = PHASES[index];
    state.runId++;                 // invalida qualquer execução antiga ainda pendente
    state.running = false;
    state.phaseIndex = index;
    state.phase = phase;
    state.numbers = generateNumbers(phase);
    state.lives = MAX_LIVES;
    state.queue = [];
    resetActors();

    el.phaseLabel.textContent = `FASE ${index + 1}`;
    el.question.textContent = phase.question;
    renderLives();
    buildMaze();
    renderQueue();
    setMsg('');
    setControlsEnabled(true);      // garante que nada fique travado depois de um game over
    closeOverlay(el.result.overlay);
  }

  async function runQueue() {
    if (state.running || state.queue.length === 0) return;
    const runId = ++state.runId;
    const isStale = () => runId !== state.runId;
    const moves = [...state.queue];
    const { phase } = state;

    state.running = true;
    setControlsEnabled(false);
    setMsg('');
    setDragonMode('walk');

    for (const dir of moves) {
      const hit = moveDragon(dir);
      await sleep(phase.stepDelay);
      if (isStale()) return;
      if (hit) {
        await loseLife({
          message: 'Um Bug te encontrou!',
          gameOverText: 'Os Bugs pegaram todas as suas vidas. Que tal planejar um caminho novo?',
        }, isStale);
        return;
      }
    }

    setDragonMode('idle');
    const landed = state.numbers.find((n) => n.r === state.dragon.r && n.c === state.dragon.c);
    state.queue = [];
    renderQueue();

    if (landed && landed.v === phase.correctValue) { await handleWin(isStale); return; }

    if (landed) {                                   // parou num número errado
      await loseLife({
        message: 'Número errado! Você perdeu uma vida.',
        gameOverText: 'Você parou no número errado e ficou sem vidas. Que tal tentar de novo?',
      }, isStale);
      return;
    }

    setMsg('Planeje um caminho até um número.');
    state.running = false;
    setControlsEnabled(true);
  }

  /** Perde uma vida (Bug ou número errado): volta ao início da fase ou encerra se acabaram as vidas. */
  async function loseLife({ message, gameOverText }, isStale) {
    setDragonMode('hurt');
    state.lives -= 1;
    renderLives();
    setMsg(message);
    await sleep(HURT_MS);
    if (isStale()) return;

    if (state.lives <= 0) {
      showResult({
        icon: 'lock', titulo: 'Não foi dessa vez!',
        texto: gameOverText,
        acaoTexto: 'Tentar novamente',
        onAction: () => resetPhase(state.phaseIndex),
      });
      return;
    }

    resetActors();
    state.queue = [];
    renderQueue();
    positionActors();
    setDragonMode('idle');
    state.running = false;
    setControlsEnabled(true);
  }

  async function handleWin(isStale) {
    const i = state.phaseIndex;
    progress[i].stars = Math.max(progress[i].stars, state.lives);   // grava já: sair da fase agora não perde a vitória
    const hasNext = i + 1 < PHASES.length;
    if (hasNext) progress[i + 1].unlocked = true;

    setDragonMode('win');
    setMsg('Muito bem! Você encontrou a resposta!');
    await sleep(WIN_MS);
    if (isStale()) return;

    showResult({
      icon: 'star', titulo: 'Muito bem!',
      texto: `${state.phase.question} = ${state.phase.correctValue} — você planejou o caminho certo e escapou dos Bugs!`,
      acaoTexto: hasNext ? 'Próxima fase' : 'Ver fases',
      onAction: () => {
        closeOverlay(el.result.overlay);
        if (hasNext) startPhase(i + 1); else showScreen('screen-select');
      },
    });
  }

  // ==================================================================
  // CONTROLES
  // ==================================================================
  function queueMove(dir) {
    if (state.running || state.queue.length >= MAX_QUEUE || !isDirection(dir)) return;
    state.queue.push(dir);
    renderQueue();
  }

  dirButtons.forEach((btn) => {
    btn.addEventListener('click', () => queueMove(btn.dataset.dir));
  });
  el.btnClear.addEventListener('click', () => {
    if (state.running) return;
    state.queue = [];
    renderQueue();
  });
  el.btnExecute.addEventListener('click', runQueue);

  // Teclado: setas planejam o caminho, Enter executa, Backspace desfaz o último passo
  // (melhoria de acessibilidade — só ativa enquanto a tela do jogo está em foco).
  document.addEventListener('keydown', (e) => {
    if (!el.screenGame.classList.contains('active')) return;
    if (!el.tutorial.hidden || !el.result.overlay.hidden) return; // não captura teclas com overlay aberto
    if (KEY_TO_DIR[e.key]) { e.preventDefault(); queueMove(KEY_TO_DIR[e.key]); }
    else if (e.key === 'Enter') { e.preventDefault(); runQueue(); }
    else if (e.key === 'Backspace' && !state.running && state.queue.length) {
      e.preventDefault();
      state.queue.pop();
      renderQueue();
    }
  });

  // ==================================================================
  // INÍCIO
  // ==================================================================
  attachDragonFallback(document.querySelector('#heroDragonSlot img'));
  resetPhase(0);
})();