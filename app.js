/**
 * ============================================================================
 * PORTFÓLIO WEB OS - MOTOR PRINCIPAL DE INTERATIVIDADE (app.js)
 * ============================================================================
 * Gerenciador de Janelas (Z-Index, Drag, Resize, Maximize, Minimize)
 * Terminal CLI Interativo com Histórico e Autocomplete
 * Síntese Sonora (Web Audio API)
 * Dock com Magnificação e Indicadores de Estado
 * ============================================================================
 */

const AppOS = (() => {
  // Estado Global do Sistema
  const state = {
    highestZIndex: 100,
    openWindows: new Set(),
    activeWindow: null,
    soundEnabled: true,
    blurEnabled: true,
    currentTheme: 'aurora',
    windowPositions: {},
    terminalHistory: [],
    historyIndex: -1,
  };

  // Áudio Sintetizado (Zero dependência de arquivos externos)
  let audioCtx = null;
  function initAudio() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function playSound(type = 'click') {
    if (!state.soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;
      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'open') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(580, now + 0.08);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'close') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch (e) {
      // Ignora silenciosamente se o navegador bloquear autoplay
    }
  }

  // ==========================================================================
  // GERENCIAMENTO DE JANELAS (WINDOW MANAGER)
  // ==========================================================================

  // ==========================================================================
  // ARQUITETURA DA INFORMAÇÃO — fonte única dos 4 sistemas:
  //  • Organização: CATEGORIES agrupa os apps pela jornada do visitante
  //  • Rotulagem: `label` é o único nome do app (Dock, desktop, menus, busca, Top Bar)
  //  • Navegação: Dock, área de trabalho e menus do Top Bar são gerados daqui
  //  • Busca: Spotlight e comando `open` do terminal leem os mesmos dados
  // ==========================================================================
  const CATEGORIES = [
    { id: 'portfolio', label: 'Portfólio' },
    { id: 'perfil', label: 'Perfil' },
    { id: 'contato', label: 'Contato' },
    { id: 'extras', label: 'Extras' },
    { id: 'sistema', label: 'Sistema' }
  ];

  const APPS = {
    projects: { label: 'Projetos', icon: 'folder-kanban', color: 'blue', cat: 'portfolio', keys: 'portfolio trabalhos cases web os' },
    caneca3d: { label: 'Caneca+ 3D', icon: 'box', color: 'rose', cat: 'portfolio', keys: 'caneca 3d demo ecommerce prensa three.js' },
    about: { label: 'Sobre Mim', icon: 'user', color: 'purple', cat: 'perfil', keys: 'sobre bio quem sou iago desenvolvedor' },
    skills: { label: 'Habilidades', icon: 'cpu', color: 'amber', cat: 'perfil', keys: 'skills stack tecnologias javascript three.js python flask gsap' },
    resume: { label: 'Currículo', icon: 'file-text', color: 'emerald', cat: 'perfil', keys: 'curriculo cv resume experiencia formacao pdf' },
    contact: { label: 'Contato', icon: 'mail', color: 'cyan', cat: 'contato', keys: 'email mensagem fale comigo contratar' },
    terminal: { label: 'Terminal', icon: 'terminal', color: 'dark', cat: 'extras', keys: 'cli console comandos zsh' },
    music: { label: 'Música', icon: 'music', color: 'purple', cat: 'extras', keys: 'musica synthwave player radio som' },
    snake: { label: 'Snake', icon: 'gamepad-2', color: 'emerald', cat: 'extras', keys: 'jogo game cobra retro' },
    notes: { label: 'Notas', icon: 'sticky-note', color: 'amber', cat: 'extras', keys: 'bloco feedback ideias anotar' },
    settings: { label: 'Preferências', icon: 'sliders', color: 'slate', cat: 'sistema', keys: 'configuracoes settings tema papel de parede wallpaper blur', desktop: false }
  };

  // Links externos. `shell: true` também aparece no Dock e na área de trabalho.
  const LINKS = [
    { label: 'GitHub', icon: 'github', color: 'github', cat: 'contato', keys: 'repositorios codigo', href: 'https://github.com/OvelhaNegra111', shell: true },
    { label: 'Enviar Email', icon: 'send', cat: 'contato', keys: 'email gmail', href: 'mailto:iagomaniglia@gmail.com' },
    { label: 'WhatsApp', icon: 'message-circle', cat: 'contato', keys: 'whatsapp zap telefone celular', href: 'https://wa.me/5561996987885' }
  ];

  const itemsIn = cat => [
    ...Object.entries(APPS).filter(([, a]) => a.cat === cat).map(([id, a]) => ({ id, ...a })),
    ...LINKS.filter(l => l.cat === cat)
  ];

  function launch(item) {
    if (item.id) return openWindow(item.id);
    if (item.href.startsWith('http')) window.open(item.href, '_blank', 'noopener');
    else location.href = item.href;
  }

  function tile(i, kind) {
    const dock = kind === 'dock';
    const label = i.href ? `${i.label} ↗` : i.label;
    const icon = `<div class="${dock ? 'dock-icon' : 'shortcut-icon'} icon-${i.color}"><i data-lucide="${i.icon}"></i></div>`;
    const text = dock
      ? `<span class="dock-tooltip">${label}</span><span class="dock-dot"></span>`
      : `<span class="shortcut-label">${label}</span>`;
    const attrs = `class="${dock ? 'dock-item' : 'desktop-shortcut'}" title="${i.label}"${dock ? '' : ' tabindex="0"'}`;
    return i.href
      ? `<a href="${i.href}" target="_blank" rel="noopener noreferrer" ${attrs}>${icon}${text}</a>`
      : `<div data-app="${i.id}" ${attrs}>${icon}${text}</div>`;
  }

  // Gera Dock (grupos separados), área de trabalho e menus por categoria do Top Bar
  (() => {
    const shellItems = cat => itemsIn(cat).filter(i => i.id || i.shell);
    document.getElementById('dock').innerHTML = CATEGORIES
      .map(c => shellItems(c.id).map(i => tile(i, 'dock')).join(''))
      .filter(Boolean).join('<div class="dock-separator"></div>');
    document.getElementById('desktop-grid').innerHTML = CATEGORIES
      .map(c => shellItems(c.id).filter(i => i.desktop !== false).map(i => tile(i, 'desktop')).join('')).join('');

    const menus = document.getElementById('top-bar-menus');
    menus.innerHTML = CATEGORIES.filter(c => c.id !== 'sistema').map(c => `
      <div class="top-menu">
        <span class="top-menu-link">${c.label}</span>
        <div class="dropdown-menu top-menu-dropdown hidden">
          ${itemsIn(c.id).map(i => `<div class="dropdown-item" ${i.id ? `data-app="${i.id}"` : `data-href="${i.href}"`}><i data-lucide="${i.icon}"></i> ${i.label}${i.href ? ' ↗' : ''}</div>`).join('')}
        </div>
      </div>`).join('');

    const closeMenus = () => menus.querySelectorAll('.dropdown-menu').forEach(d => d.classList.add('hidden'));
    menus.addEventListener('click', e => {
      const item = e.target.closest('.dropdown-item');
      const menu = e.target.closest('.top-menu');
      if (!menu) return;
      if (item) {
        closeMenus();
        return launch(item.dataset.app ? { id: item.dataset.app } : { href: item.dataset.href });
      }
      const dd = menu.querySelector('.dropdown-menu');
      const show = dd.classList.contains('hidden');
      closeMenus();
      dd.classList.toggle('hidden', !show);
      playSound('click');
    });
    document.addEventListener('click', e => { if (!e.target.closest('.top-menu')) closeMenus(); });
  })();

  function getWindowEl(appId) {
    return document.getElementById(`win-${appId}`);
  }

  function focusWindow(win) {
    if (!win) return;
    state.highestZIndex += 1;
    win.style.zIndex = state.highestZIndex;
    
    document.querySelectorAll('.os-window').forEach(w => w.classList.remove('active'));
    win.classList.add('active');
    state.activeWindow = win;

    // Atualiza título do App ativo no Top Bar
    const title = APPS[win.dataset.window]?.label || 'Portfólio OS';
    const focusedTitleEl = document.getElementById('focused-app-title');
    if (focusedTitleEl) focusedTitleEl.textContent = title;
  }

  function openWindow(appId) {
    const win = getWindowEl(appId);
    if (!win) return;

    playSound('open');

    // Se estiver minimizada, restaura
    if (win.classList.contains('minimized')) {
      win.classList.remove('minimized');
      focusWindow(win);
      return;
    }

    // Se ainda não estiver aberta, calcula posição inicial centralizada/em cascata
    if (!win.classList.contains('open')) {
      win.classList.add('open');
      state.openWindows.add(appId);

      // Posição padrão se não definida
      if (!state.windowPositions[appId]) {
        const desktop = document.getElementById('desktop');
        const offset = (state.openWindows.size * 24) % 120;
        const left = Math.max(20, (desktop.clientWidth - win.offsetWidth) / 2 + offset);
        const top = Math.max(20, (desktop.clientHeight - win.offsetHeight) / 2 + offset);
        
        win.style.left = `${left}px`;
        win.style.top = `${top}px`;
        state.windowPositions[appId] = { left, top };
      }

      updateDockIndicators();
    }

    focusWindow(win);

    // Se abrir o terminal, foca no input automaticamente
    if (appId === 'terminal') {
      setTimeout(() => {
        const input = document.getElementById('terminal-input');
        if (input) input.focus();
      }, 100);
    }
  }

  // --- Mini Game: Snake (Canvas) ---
  const snake = (() => {
    const canvas = document.getElementById('snake-canvas');
    if (!canvas) return { pause() {} };
    const ctx = canvas.getContext('2d');
    const N = 20, S = canvas.width / N;
    const scoreEl = document.getElementById('snake-score');
    const bestEl = document.getElementById('snake-best');
    const msgEl = document.getElementById('snake-msg');
    let best = 0;
    try { best = +localStorage.getItem('snake-best') || 0; } catch (e) {}
    bestEl.textContent = best;
    let body, dir, nextDir, food, score, timer = null;

    function reset() {
      body = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      dir = nextDir = { x: 1, y: 0 };
      score = 0;
      scoreEl.textContent = 0;
      placeFood();
    }

    function placeFood() {
      do {
        food = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) };
      } while (body.some(p => p.x === food.x && p.y === food.y));
    }

    function draw() {
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(food.x * S + 2, food.y * S + 2, S - 4, S - 4);
      body.forEach((p, i) => {
        ctx.fillStyle = i === 0 ? '#34d399' : '#10b981';
        ctx.fillRect(p.x * S + 1, p.y * S + 1, S - 2, S - 2);
      });
    }

    function step() {
      dir = nextDir;
      const head = { x: body[0].x + dir.x, y: body[0].y + dir.y };
      if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N ||
          body.some(p => p.x === head.x && p.y === head.y)) {
        return gameOver();
      }
      body.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.textContent = score;
        playSound('click');
        placeFood();
      } else {
        body.pop();
      }
      draw();
    }

    function gameOver() {
      pause();
      playSound('error');
      if (score > best) {
        best = score;
        bestEl.textContent = best;
        try { localStorage.setItem('snake-best', best); } catch (e) {}
      }
      msgEl.textContent = `GAME OVER · ${score} pts · ESPAÇO ou toque para recomeçar`;
      body = null;
    }

    function start() {
      if (timer) return;
      if (!body) reset();
      msgEl.textContent = 'Setas/WASD/deslize · P para pausar';
      timer = setInterval(step, 110);
    }

    function pause() {
      clearInterval(timer);
      timer = null;
      if (body) msgEl.textContent = 'Pausado · ESPAÇO ou toque para continuar';
    }

    function turn(x, y) {
      if (x !== -dir.x || y !== -dir.y) nextDir = { x, y };
    }

    const keys = {
      ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1],
      ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0]
    };
    document.addEventListener('keydown', e => {
      if (state.activeWindow !== getWindowEl('snake')) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (keys[k]) { e.preventDefault(); if (timer) turn(...keys[k]); }
      else if (k === ' ') { e.preventDefault(); start(); }
      else if (k === 'p') { timer ? pause() : start(); }
    });

    let touch = null;
    canvas.addEventListener('touchstart', e => { touch = e.touches[0]; }, { passive: true });
    canvas.addEventListener('touchend', e => {
      const t = e.changedTouches[0];
      const dx = t.clientX - touch.clientX, dy = t.clientY - touch.clientY;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return start();
      if (Math.abs(dx) > Math.abs(dy)) turn(Math.sign(dx), 0);
      else turn(0, Math.sign(dy));
    });
    canvas.addEventListener('click', start);

    reset();
    draw();
    return { pause };
  })();

  // --- Música: Synthwave procedural (Web Audio API) ---
  const music = (() => {
    const tracks = [
      { name: 'Neon Drive', bpm: 100, chords: [[57, 1], [53, 0], [48, 0], [55, 0]] },
      { name: 'Midnight Pulse', bpm: 84, chords: [[50, 1], [46, 0], [53, 0], [48, 0]] },
      { name: 'Sunset Grid', bpm: 92, chords: [[52, 1], [48, 0], [55, 0], [50, 0]] }
    ];
    const playBtn = document.getElementById('music-play');
    const trackEl = document.getElementById('music-track');
    const viz = document.getElementById('music-viz');
    const vctx = viz.getContext('2d');
    let master, analyser, timer = null, current = 0, step = 0, nextTime = 0;
    const midi = n => 440 * Math.pow(2, (n - 69) / 12);

    function tone(freq, type, t, dur, vol, cutoff) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      osc.type = type;
      osc.frequency.value = freq;
      filter.frequency.value = cutoff || 2000;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 3));
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(filter).connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }

    function kick(t) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + 0.35);
    }

    // Agenda notas com antecedência (lookahead) para timing preciso
    function schedule() {
      const tr = tracks[current];
      const s16 = 60 / tr.bpm / 4;
      while (nextTime < audioCtx.currentTime + 0.1) {
        const [root, minor] = tr.chords[Math.floor(step / 16) % tr.chords.length];
        const triad = [0, minor ? 3 : 4, 7].map(i => root + i);
        const s = step % 16;
        if (s === 0) triad.forEach(n => tone(midi(n), 'sawtooth', nextTime, s16 * 16, 0.03, 900));
        if (s % 2 === 0) tone(midi(root - 24), 'sawtooth', nextTime, s16 * 1.8, 0.12, 400);
        if (s % 4 === 0) kick(nextTime);
        tone(midi(triad[s % 3] + 12), 'square', nextTime, s16 * 0.9, 0.025, 2500);
        nextTime += s16;
        step++;
      }
    }

    function draw() {
      if (!timer) return vctx.clearRect(0, 0, viz.width, viz.height);
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      vctx.clearRect(0, 0, viz.width, viz.height);
      const bars = 32, w = viz.width / bars;
      for (let i = 0; i < bars; i++) {
        const h = (data[i * 2] / 255) * viz.height;
        vctx.fillStyle = `hsl(${280 - i * 4}, 90%, 60%)`;
        vctx.fillRect(i * w + 1, viz.height - h, w - 2, h);
      }
      requestAnimationFrame(draw);
    }

    function play() {
      initAudio();
      if (!audioCtx || timer) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();
      if (!master) {
        master = audioCtx.createGain();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        master.connect(analyser).connect(audioCtx.destination);
      }
      master.gain.value = +document.getElementById('music-volume').value;
      step = 0;
      nextTime = audioCtx.currentTime + 0.05;
      timer = setInterval(schedule, 25);
      setUI(true);
      draw();
    }

    function stop() {
      clearInterval(timer);
      timer = null;
      setUI(false);
    }

    function setUI(playing) {
      playBtn.innerHTML = `<i data-lucide="${playing ? 'pause' : 'play'}"></i>`;
      lucide.createIcons();
      document.body.classList.toggle('music-playing', playing);
      trackEl.textContent = tracks[current].name;
    }

    function change(delta) {
      current = (current + delta + tracks.length) % tracks.length;
      if (timer) { stop(); play(); } else setUI(false);
    }

    playBtn.addEventListener('click', () => timer ? stop() : play());
    document.getElementById('music-prev').addEventListener('click', () => change(-1));
    document.getElementById('music-next').addEventListener('click', () => change(1));
    document.getElementById('music-volume').addEventListener('input', e => {
      if (master) master.gain.value = +e.target.value;
    });
    document.getElementById('topbar-eq').addEventListener('click', () => openWindow('music'));
    return { stop };
  })();

  // --- Notas (salvamento automático no localStorage) ---
  (() => {
    const area = document.getElementById('notes-text');
    const status = document.getElementById('notes-status');
    try { area.value = localStorage.getItem('notes-text') || ''; } catch (e) {}
    let t;
    area.addEventListener('input', () => {
      clearTimeout(t);
      status.textContent = 'Salvando...';
      t = setTimeout(() => {
        try {
          localStorage.setItem('notes-text', area.value);
          status.textContent = 'Salvo automaticamente no navegador ✓';
        } catch (e) {
          status.textContent = 'Não foi possível salvar neste navegador';
        }
      }, 400);
    });
  })();

  // --- Spotlight Search (Ctrl/Cmd + K) ---
  (() => {
    const overlay = document.getElementById('spotlight');
    const input = document.getElementById('spotlight-input');
    const list = document.getElementById('spotlight-results');
    const items = CATEGORIES.flatMap(c => itemsIn(c.id).map(i => ({ ...i, group: c.label })));
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    let matches = [], sel = 0;

    function render() {
      const q = norm(input.value.trim());
      matches = items.filter(i => norm(`${i.label} ${i.keys} ${i.group}`).includes(q));
      sel = Math.min(sel, Math.max(0, matches.length - 1));
      // Resultados agrupados por categoria (mesma organização do Dock e dos menus)
      list.innerHTML = matches.map((m, i) =>
        (i === 0 || matches[i - 1].group !== m.group ? `<li class="spotlight-group">${m.group}</li>` : '') +
        `<li class="spotlight-item${i === sel ? ' active' : ''}" data-index="${i}"><i data-lucide="${m.icon}"></i> ${m.label}${m.href ? ' ↗' : ''}</li>`
      ).join('') || '<li class="empty">Nenhum resultado</li>';
      lucide.createIcons();
    }

    function toggle(show) {
      overlay.classList.toggle('open', show);
      if (show) { input.value = ''; sel = 0; render(); input.focus(); }
    }

    function pick(item) {
      if (!item) return;
      toggle(false);
      launch(item);
    }

    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle(!overlay.classList.contains('open'));
      } else if (e.key === 'Escape' && overlay.classList.contains('open')) {
        toggle(false);
      }
    });
    input.addEventListener('input', () => { sel = 0; render(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + matches.length) % (matches.length || 1);
        render();
      } else if (e.key === 'Enter') {
        pick(matches[sel]);
      }
    });
    list.addEventListener('click', e => pick(matches[e.target.closest('.spotlight-item')?.dataset.index]));
    overlay.addEventListener('click', e => { if (e.target === overlay) toggle(false); });
    document.querySelectorAll('#spotlight-trigger, [data-action="spotlight"]')
      .forEach(el => el.addEventListener('click', () => toggle(true)));
  })();

  function closeWindow(appId) {
    const win = getWindowEl(appId);
    if (!win) return;
    if (appId === 'snake') snake.pause();
    if (appId === 'music') music.stop();

    playSound('close');
    win.classList.remove('open', 'active', 'maximized', 'minimized');
    state.openWindows.delete(appId);
    updateDockIndicators();

    // Se a janela fechada era a ativa, foca na próxima visível
    if (state.activeWindow === win) {
      state.activeWindow = null;
      const remaining = Array.from(document.querySelectorAll('.os-window.open:not(.minimized)'));
      if (remaining.length > 0) {
        focusWindow(remaining[remaining.length - 1]);
      } else {
        const focusedTitleEl = document.getElementById('focused-app-title');
        if (focusedTitleEl) focusedTitleEl.textContent = 'Portfólio OS';
      }
    }
  }

  function minimizeWindow(appId) {
    const win = getWindowEl(appId);
    if (!win) return;
    playSound('click');
    win.classList.add('minimized');
    win.classList.remove('active');
    if (state.activeWindow === win) state.activeWindow = null;
  }

  function toggleMaximizeWindow(appId) {
    const win = getWindowEl(appId);
    if (!win) return;
    playSound('click');
    win.classList.toggle('maximized');
    focusWindow(win);
  }

  function updateDockIndicators() {
    document.querySelectorAll('.dock-item[data-app]').forEach(item => {
      const appId = item.dataset.app;
      if (state.openWindows.has(appId)) {
        item.classList.add('running');
      } else {
        item.classList.remove('running');
      }
    });
  }

  // ==========================================================================
  // ARRASTAR JANELAS (DRAG & DROP COM LIMITES)
  // ==========================================================================

  function initDraggableWindows() {
    document.querySelectorAll('.os-window').forEach(win => {
      const header = win.querySelector('.window-header');
      if (!header) return;

      let isDragging = false;
      let startX = 0, startY = 0;
      let initialLeft = 0, initialTop = 0;

      const onMouseDown = (e) => {
        // Ignora cliques nos botões de fechar/minimizar
        if (e.target.closest('.window-controls') || e.target.closest('button')) return;

        focusWindow(win);
        if (win.classList.contains('maximized')) return;

        isDragging = true;
        startX = e.clientX || (e.touches && e.touches[0].clientX);
        startY = e.clientY || (e.touches && e.touches[0].clientY);

        initialLeft = win.offsetLeft;
        initialTop = win.offsetTop;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('touchmove', onMouseMove, { passive: false });
        document.addEventListener('touchend', onMouseUp);
      };

      const onMouseMove = (e) => {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault();

        const curX = e.clientX || (e.touches && e.touches[0].clientX);
        const curY = e.clientY || (e.touches && e.touches[0].clientY);

        const deltaX = curX - startX;
        const deltaY = curY - startY;

        const desktop = document.getElementById('desktop');
        const maxLeft = desktop.clientWidth - 100;
        const maxTop = desktop.clientHeight - 60;

        let newLeft = Math.min(Math.max(-win.offsetWidth + 100, initialLeft + deltaX), maxLeft);
        let newTop = Math.min(Math.max(0, initialTop + deltaY), maxTop);

        win.style.left = `${newLeft}px`;
        win.style.top = `${newTop}px`;
      };

      const onMouseUp = () => {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('touchmove', onMouseMove);
        document.removeEventListener('touchend', onMouseUp);
      };

      header.addEventListener('mousedown', onMouseDown);
      header.addEventListener('touchstart', onMouseDown, { passive: true });

      // Clicar em qualquer parte do corpo da janela traz para o foco
      win.addEventListener('mousedown', () => focusWindow(win));
    });
  }

  // ==========================================================================
  // TERMINAL CLI INTERATIVO
  // ==========================================================================

  const commands = {
    help: () => `
<span class="term-cyan">Comandos Disponíveis:</span>
  <span class="term-yellow">about</span>       - Resumo sobre mim e minha trajetória
  <span class="term-yellow">skills</span>      - Lista detalhada de tecnologias e proficiências
  <span class="term-yellow">projects</span>    - Visualizar repositórios e projetos de destaque
  <span class="term-yellow">open &lt;app&gt;</span>   - Abre uma janela (<span class="term-cyan">projects, about, skills, resume, caneca3d, contact, settings</span>)
  <span class="term-yellow">contact</span>     - Canais de contato direto (Email, WhatsApp, GitHub)
  <span class="term-yellow">github</span>      - Estatísticas públicas em tempo real do perfil
  <span class="term-yellow">theme &lt;cor&gt;</span>  - Muda o wallpaper (<span class="term-cyan">aurora, midnight, cyber, minimal</span>)
  <span class="term-yellow">audio &lt;on|off&gt;</span>- Ativa ou silencia os efeitos sonoros táteis
  <span class="term-yellow">clear</span>       - Limpa o histórico de comandos da tela
  <span class="term-yellow">matrix</span>      - Executa efeito hacker visual
  <span class="term-yellow">sudo</span>        - Tentativa de elevação de privilégios (easter egg)
`,
    about: () => `
<span class="term-green">Iago M. - Desenvolvedor Fullstack</span>
Focado na criação de experiências ricas em 3D (Three.js/WebGL) e backend robusto com Python/Flask.
Atualmente construindo soluções interativas para e-commerce, automação e interfaces web modernas.
Digite <span class="term-yellow">open about</span> para ver o perfil completo em janela.
`,
    skills: () => `
<span class="term-cyan">Core Technologies & Metodologias:</span>
  • <span class="term-green">Frontend & 3D:</span>     JavaScript (ES6+), Three.js r128, GSAP, HTML5, CSS3 Glassmorphism
  • <span class="term-green">Backend:</span>           Python, Flask, RESTful APIs, Processamento de Imagens (PIL)
  • <span class="term-green">Design & Discovery:</span> Arquitetura da Informação (IA), Assumption Testing Matrix (ATM), UX/UI
  • <span class="term-green">Tools:</span>             Git, GitHub, Web Audio API, Cloudflare Workers/FLUX AI
Digite <span class="term-yellow">open skills</span> para ver os medidores visuais.
`,
    projects: () => `
<span class="term-cyan">Projetos em Destaque:</span>
  [1] <span class="term-yellow">CANECA+ | Oficina 3D</span> - E-commerce de sublimação com prensa 3D e rádio lo-fi
      Stack: Python, Flask, Three.js, GSAP, Web Audio API
  [2] <span class="term-yellow">Web OS Portfolio</span>   - Sistema operacional interativo com Glassmorphism
      Stack: Vanilla JS, CSS3 Moderno, Web Audio, Lucide Icons
  [3] <span class="term-yellow">API Services</span>       - Microsserviços para geração por IA e automação
      Stack: Python, REST APIs, Asynchronous tasks
Digite <span class="term-yellow">open projects</span> ou <span class="term-yellow">open caneca3d</span> para ver a demonstração visual.
`,
    contact: () => `
<span class="term-cyan">Canais de Comunicação:</span>
  • WhatsApp:  <a href="https://wa.me/5561996987885" target="_blank" class="term-green">(61) 99698-7885</a>
  • Email:     <a href="mailto:iagomaniglia@gmail.com" class="term-green">iagomaniglia@gmail.com</a>
  • GitHub:    <a href="https://github.com/OvelhaNegra111" target="_blank" class="term-green">https://github.com/OvelhaNegra111</a>
Digite <span class="term-yellow">open contact</span> para abrir o formulário rápido de envio!
`,
    github: async () => {
      try {
        const res = await fetch('https://api.github.com/users/OvelhaNegra111');
        if (!res.ok) throw new Error('Falha ao consultar API do GitHub');
        const data = await res.json();
        return `
<span class="term-cyan">Estatísticas do GitHub (@${data.login}):</span>
  • Nome: ${data.name || 'Iago'}
  • Repositórios Públicos: <span class="term-yellow">${data.public_repos}</span>
  • Seguidores: <span class="term-yellow">${data.followers}</span>
  • Link: <a href="${data.html_url}" target="_blank" class="term-green">${data.html_url}</a>
`;
      } catch (err) {
        return `<span class="term-muted">GitHub API: Usuário @OvelhaNegra111 pronto para conexões. Visite https://github.com/OvelhaNegra111</span>`;
      }
    },
    clear: () => {
      const output = document.getElementById('terminal-output');
      if (output) output.innerHTML = '';
      return null;
    },
    sudo: () => `<span class="term-red">Permissão negada: Este portfólio já está rodando com privilégios máximos de criatividade!</span>`,
    matrix: () => {
      return `<span class="term-green">Wake up, Neo... The Matrix has you. Follow the white rabbit. 🐇</span>`;
    }
  };

  function initTerminal() {
    const input = document.getElementById('terminal-input');
    const output = document.getElementById('terminal-output');
    if (!input || !output) return;

    input.addEventListener('keydown', async (e) => {
      // Histórico de comandos com ArrowUp / ArrowDown
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (state.terminalHistory.length > 0 && state.historyIndex < state.terminalHistory.length - 1) {
          state.historyIndex++;
          input.value = state.terminalHistory[state.terminalHistory.length - 1 - state.historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (state.historyIndex > 0) {
          state.historyIndex--;
          input.value = state.terminalHistory[state.terminalHistory.length - 1 - state.historyIndex];
        } else if (state.historyIndex === 0) {
          state.historyIndex = -1;
          input.value = '';
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const cur = input.value.trim().toLowerCase();
        const all = Object.keys(commands).concat(['projects', 'terminal', 'about', 'skills', 'resume', 'caneca3d', 'contact', 'settings']);
        const match = all.find(c => c.startsWith(cur));
        if (match) input.value = match;
      } else if (e.key === 'Enter') {
        const rawCmd = input.value.trim();
        input.value = '';
        if (!rawCmd) return;

        state.terminalHistory.push(rawCmd);
        state.historyIndex = -1;

        // Renderiza linha de comando digitada
        const line = document.createElement('div');
        line.className = 'terminal-history-entry';
        line.innerHTML = `<div><span class="term-prompt"><span class="prompt-user">iago</span><span class="prompt-at">@</span><span class="prompt-host">dev</span>:<span class="prompt-path">~</span>$</span> <span>${escapeHtml(rawCmd)}</span></div>`;

        const parts = rawCmd.split(' ');
        const mainCmd = parts[0].toLowerCase();
        const arg = parts[1]?.toLowerCase();

        let response = '';

        if (mainCmd === 'open') {
          if (arg && getWindowEl(arg)) {
            openWindow(arg);
            response = `<span class="term-green">✓ Janela '${arg}' aberta com sucesso.</span>`;
          } else {
            response = `<span class="term-red">Uso correto: open [${Object.keys(APPS).join(' | ')}]</span>`;
          }
        } else if (mainCmd === 'theme') {
          if (['aurora', 'midnight', 'cyber', 'minimal'].includes(arg)) {
            setTheme(arg);
            response = `<span class="term-green">✓ Tema alterado para '${arg}'.</span>`;
          } else {
            response = `<span class="term-red">Temas disponíveis: aurora, midnight, cyber, minimal</span>`;
          }
        } else if (mainCmd === 'audio') {
          if (arg === 'on') {
            setAudio(true);
            response = `<span class="term-green">✓ Efeitos sonoros ativados.</span>`;
          } else if (arg === 'off') {
            setAudio(false);
            response = `<span class="term-yellow">✓ Efeitos sonoros silenciados.</span>`;
          } else {
            response = `<span class="term-red">Uso: audio on | audio off</span>`;
          }
        } else if (commands[mainCmd]) {
          const res = await commands[mainCmd]();
          if (res === null) return; // 'clear'
          response = res;
        } else {
          response = `<span class="term-red">Comando não reconhecido: '${mainCmd}'. Digite <strong class="term-yellow">help</strong> para ajuda.</span>`;
        }

        if (response) {
          const respDiv = document.createElement('div');
          respDiv.innerHTML = response;
          line.appendChild(respDiv);
        }

        output.appendChild(line);
        document.getElementById('terminal-body').scrollTop = document.getElementById('terminal-body').scrollHeight;
      }
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ==========================================================================
  // TEMAS & PERSONALIZAÇÃO
  // ==========================================================================

  function setTheme(themeName) {
    const wp = document.getElementById('wallpaper-container');
    if (!wp) return;

    wp.className = `wallpaper-${themeName}`;
    state.currentTheme = themeName;

    // Atualiza botões nas opções de configurações
    document.querySelectorAll('.wp-option').forEach(opt => {
      if (opt.dataset.wallpaper === themeName) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });

    playSound('click');
  }

  function setAudio(enable) {
    state.soundEnabled = enable;
    const soundIcon = document.getElementById('sound-icon');
    const checkbox = document.getElementById('sound-checkbox');
    if (checkbox) checkbox.checked = enable;

    if (soundIcon) {
      soundIcon.setAttribute('data-lucide', enable ? 'volume-2' : 'volume-x');
      lucide.createIcons();
    }
  }

  // ==========================================================================
  // RELÓGIO & DATA EM TEMPO REAL
  // ==========================================================================

  function updateClock() {
    const dateEl = document.getElementById('date-text');
    const timeEl = document.getElementById('time-text');
    if (!dateEl || !timeEl) return;

    const now = new Date();
    const optionsDate = { weekday: 'short', day: 'numeric', month: 'short' };
    const dateStr = now.toLocaleDateString('pt-BR', optionsDate).replace('.', '');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    dateEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    timeEl.textContent = timeStr;
  }

  // ==========================================================================
  // FORMULÁRIO DE CONTATO
  // ==========================================================================

  function handleContactSubmit() {
    const name = document.getElementById('contact-name').value;
    const contact = document.getElementById('contact-email').value;
    const msg = document.getElementById('contact-msg').value;
    const feedback = document.getElementById('contact-feedback');

    playSound('open');

    // Mensagem de sucesso
    feedback.className = 'contact-feedback success';
    feedback.innerHTML = `<strong>Obrigado, ${escapeHtml(name)}!</strong> Sua mensagem foi preparada. Abrindo WhatsApp...`;
    feedback.classList.remove('hidden');

    // Cria link pré-preenchido do WhatsApp com o texto
    const zapText = encodeURIComponent(`Olá Iago! Meu nome é ${name} (${contact}). ${msg}`);
    setTimeout(() => {
      window.open(`https://wa.me/5561996987885?text=${zapText}`, '_blank');
    }, 1000);
  }

  // ==========================================================================
  // SELEÇÃO NA ÁREA DE TRABALHO & MENU DE CONTEXTO
  // ==========================================================================

  function initDesktopInteractions() {
    const desktop = document.getElementById('desktop');
    const selectionBox = document.getElementById('selection-box');
    const contextMenu = document.getElementById('context-menu');
    const systemDropdown = document.getElementById('system-dropdown');

    let isSelecting = false;
    let startX = 0, startY = 0;

    desktop.addEventListener('mousedown', (e) => {
      // Se clicou em um atalho, janela ou menu, não inicia seleção
      if (e.target.closest('.desktop-shortcut') || e.target.closest('.os-window') || e.target.closest('.context-menu')) {
        return;
      }

      // Fecha menus abertos
      if (contextMenu) contextMenu.classList.add('hidden');
      if (systemDropdown) systemDropdown.classList.add('hidden');

      // Desseleciona atalhos
      document.querySelectorAll('.desktop-shortcut').forEach(s => s.classList.remove('selected'));

      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;

      selectionBox.style.left = `${startX}px`;
      selectionBox.style.top = `${startY}px`;
      selectionBox.style.width = '0px';
      selectionBox.style.height = '0px';
      selectionBox.style.display = 'block';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isSelecting) return;

      const curX = e.clientX;
      const curY = e.clientY;

      const left = Math.min(startX, curX);
      const top = Math.min(startY, curY);
      const width = Math.abs(curX - startX);
      const height = Math.abs(curY - startY);

      selectionBox.style.left = `${left}px`;
      selectionBox.style.top = `${top}px`;
      selectionBox.style.width = `${width}px`;
      selectionBox.style.height = `${height}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isSelecting) {
        isSelecting = false;
        selectionBox.style.display = 'none';
      }
    });

    // Menu de Contexto (Botão Direito na Área de Trabalho)
    desktop.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.os-window')) return; // Deixa o padrão dentro das janelas
      e.preventDefault();

      if (contextMenu) {
        contextMenu.style.left = `${Math.min(e.clientX, window.innerWidth - 200)}px`;
        contextMenu.style.top = `${Math.min(e.clientY, window.innerHeight - 200)}px`;
        contextMenu.classList.remove('hidden');
      }
    });

    // Fecha menu de contexto ao clicar em qualquer lugar
    document.addEventListener('click', (e) => {
      if (contextMenu && !e.target.closest('#context-menu')) {
        contextMenu.classList.add('hidden');
      }
      if (systemDropdown && !e.target.closest('#system-menu-btn') && !e.target.closest('#system-dropdown')) {
        systemDropdown.classList.add('hidden');
      }
    });
  }

  // ==========================================================================
  // FILTRO DE PROJETOS
  // ==========================================================================

  function initProjectsFilter() {
    const filterBtns = document.querySelectorAll('.sidebar-btn[data-filter]');
    const cards = document.querySelectorAll('.project-card');

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        playSound('click');

        const filter = btn.dataset.filter;
        cards.forEach(card => {
          const category = card.dataset.category || '';
          if (filter === 'all' || category.includes(filter)) {
            card.style.display = 'flex';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  // ==========================================================================
  // INICIALIZAÇÃO GERAL (EVENT LISTENERS)
  // ==========================================================================

  function init() {
    // 1. Inicializa ícones Lucide
    if (window.lucide) {
      lucide.createIcons();
    }

    // 2. Relógio em tempo real
    updateClock();
    setInterval(updateClock, 1000);

    // 3. Janelas Arrastáveis
    initDraggableWindows();

    // 4. Terminal Interativo
    initTerminal();

    // 5. Interações da Área de Trabalho
    initDesktopInteractions();

    // 6. Filtros de Projetos
    initProjectsFilter();

    // 7. Clique nos Ícones da Área de Trabalho
    document.querySelectorAll('.desktop-shortcut[data-app]').forEach(shortcut => {
      shortcut.addEventListener('click', () => {
        document.querySelectorAll('.desktop-shortcut').forEach(s => s.classList.remove('selected'));
        shortcut.classList.add('selected');
        openWindow(shortcut.dataset.app);
      });
    });

    // 8. Clique nos Ícones do Dock
    document.querySelectorAll('.dock-item[data-app]').forEach(dockItem => {
      dockItem.addEventListener('click', () => {
        const appId = dockItem.dataset.app;
        const win = getWindowEl(appId);

        if (win && win.classList.contains('open') && !win.classList.contains('minimized') && state.activeWindow === win) {
          // Se já está em foco, minimiza
          minimizeWindow(appId);
        } else {
          openWindow(appId);
        }
      });
    });

    // 9. Botões de Controle das Janelas (Fechar, Minimizar, Maximizar)
    document.querySelectorAll('.os-window').forEach(win => {
      const appId = win.dataset.window;
      const btnClose = win.querySelector('.win-close');
      const btnMin = win.querySelector('.win-minimize');
      const btnMax = win.querySelector('.win-maximize');

      if (btnClose) btnClose.addEventListener('click', () => closeWindow(appId));
      if (btnMin) btnMin.addEventListener('click', () => minimizeWindow(appId));
      if (btnMax) btnMax.addEventListener('click', () => toggleMaximizeWindow(appId));
    });

    // 11. Itens do Menu de Contexto
    document.querySelectorAll('.context-item[data-action]').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        if (action.startsWith('open-')) {
          openWindow(action.replace('open-', ''));
        } else if (action === 'toggle-fullscreen') {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        }
        document.getElementById('context-menu').classList.add('hidden');
      });
    });

    // 12. Menu do Sistema (Logo no topo)
    const sysBtn = document.getElementById('system-menu-btn');
    const sysDropdown = document.getElementById('system-dropdown');
    if (sysBtn && sysDropdown) {
      sysBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sysDropdown.classList.toggle('hidden');
        playSound('click');
      });

      sysDropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
          const action = item.dataset.action;
          if (action.startsWith('open-')) {
            openWindow(action.replace('open-', ''));
          } else if (action === 'restart-session') {
            state.openWindows.forEach(app => closeWindow(app));
            openWindow('projects');
          }
          sysDropdown.classList.add('hidden');
        });
      });
    }

    // 13. Alternadores Rápidos do Top Bar
    const soundToggle = document.getElementById('sound-toggle-btn');
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        setAudio(!state.soundEnabled);
      });
    }

    const quickTheme = document.getElementById('quick-theme-btn');
    if (quickTheme) {
      const themes = ['aurora', 'midnight', 'cyber', 'minimal'];
      quickTheme.addEventListener('click', () => {
        const nextIdx = (themes.indexOf(state.currentTheme) + 1) % themes.length;
        setTheme(themes[nextIdx]);
      });
    }

    // 14. Opções de Papel de Parede nas Configurações
    document.querySelectorAll('.wp-option[data-wallpaper]').forEach(opt => {
      opt.addEventListener('click', () => {
        setTheme(opt.dataset.wallpaper);
      });
    });

    // 15. Toggles de Efeitos nas Configurações
    const soundCheck = document.getElementById('sound-checkbox');
    if (soundCheck) {
      soundCheck.addEventListener('change', (e) => setAudio(e.target.checked));
    }

    const blurCheck = document.getElementById('blur-checkbox');
    if (blurCheck) {
      blurCheck.addEventListener('change', (e) => {
        document.body.classList.toggle('no-blur', !e.target.checked);
      });
    }

    // 16. Janela inicial aberta para dar boas-vindas imediatamente
    setTimeout(() => {
      openWindow('projects');
    }, 400);
  }

  // Expõe a API do Sistema para o escopo global
  return {
    init,
    openWindow,
    closeWindow,
    minimizeWindow,
    toggleMaximizeWindow,
    setTheme,
    setAudio,
    handleContactSubmit
  };
})();

// Inicializa assim que o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  AppOS.init();
});
