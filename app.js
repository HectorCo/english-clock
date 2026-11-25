/* ==========================================================================
   English Clock — Lógica principal (Reloj interactivo, PWA y ejercicios)
   ========================================================================== */

(() => {
  'use strict';

  // --- Registro del Service Worker para PWA ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // Si falla en entorno local sin HTTPS/localhost, la app sigue funcionando igual
      });
    });
  }

  // --- Constantes pedagógicas ---
  const NUMBER_WORDS = [
    'twelve', 'one', 'two', 'three', 'four', 'five', 'six',
    'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
    'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
    'twenty', 'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four',
    'twenty-five', 'twenty-six', 'twenty-seven', 'twenty-eight', 'twenty-nine'
  ];

  const HINT_RING_LABELS = [
    { minute: 0, text: "o'clock", zone: 'oclock' },
    { minute: 5, text: 'five past', zone: 'past' },
    { minute: 10, text: 'ten past', zone: 'past' },
    { minute: 15, text: 'quarter past', zone: 'past' },
    { minute: 20, text: 'twenty past', zone: 'past' },
    { minute: 25, text: 'twenty-five past', zone: 'past' },
    { minute: 30, text: 'half past', zone: 'past' },
    { minute: 35, text: 'twenty-five to', zone: 'to' },
    { minute: 40, text: 'twenty to', zone: 'to' },
    { minute: 45, text: 'quarter to', zone: 'to' },
    { minute: 50, text: 'ten to', zone: 'to' },
    { minute: 55, text: 'five to', zone: 'to' }
  ];

  const LEVEL_CONFIG = {
    1: { name: 'Nivel 1 · La cruz del reloj', minutes: [0, 15, 30, 45], allowDetective: false },
    2: { name: 'Nivel 2 · Lado derecho (PAST)', minutes: [5, 10, 20, 25], allowDetective: false },
    3: { name: 'Nivel 3 · Lado izquierdo (TO)', minutes: [35, 40, 50, 55], allowDetective: false },
    4: { name: 'Nivel 4 · Reto Final', minutes: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55], allowDetective: true }
  };

  const QUESTIONS_PER_ROUND = 10;
  const STORAGE_KEY = 'english_clock_progress_v1';

  // --- Estado global de la aplicación ---
  const state = {
    mode: 'explore',
    exploreHour: 6,
    exploreMinute: 40,
    hintsEnabled: true,
    isDragging: false,
    progress: loadProgress(),
    quiz: {
      level: 1,
      questionIndex: 0,
      hits: 0,
      lastTimeKey: null,
      currentQuestion: null,
      answered: false
    }
  };

  // --- Referencias al DOM ---
  const dom = {
    tabExplore: document.getElementById('tab-explore'),
    tabPractice: document.getElementById('tab-practice'),
    viewExplore: document.getElementById('view-explore'),
    viewPractice: document.getElementById('view-practice'),
    totalStars: document.getElementById('total-stars'),
    currentStreak: document.getElementById('current-streak'),

    // Explora el reloj
    hintsToggle: document.getElementById('hints-toggle'),
    exploreClock: document.getElementById('explore-clock'),
    exploreDigital: document.getElementById('explore-digital'),
    explorePhrase: document.getElementById('explore-phrase'),
    exploreTrick: document.getElementById('explore-trick'),
    btnSpeakExplore: document.getElementById('btn-speak-explore'),
    btnMinus5: document.getElementById('btn-minus-5'),
    btnPlus5: document.getElementById('btn-plus-5'),
    btnPlus1h: document.getElementById('btn-plus-1h'),
    btnRandomTime: document.getElementById('btn-random-time'),
    postChips: document.querySelectorAll('.post-chip'),

    // Niveles y Quiz
    levelsScreen: document.getElementById('levels-screen'),
    quizScreen: document.getElementById('quiz-screen'),
    summaryScreen: document.getElementById('summary-screen'),
    startLevelBtns: document.querySelectorAll('.start-level-btn'),
    btnBackLevels: document.getElementById('btn-back-levels'),
    quizLevelTitle: document.getElementById('quiz-level-title'),
    quizProgressFill: document.getElementById('quiz-progress-fill'),
    quizCounter: document.getElementById('quiz-counter'),
    quizHits: document.getElementById('quiz-hits'),
    quizPromptLabel: document.getElementById('quiz-prompt-label'),
    stimulusClockWrap: document.getElementById('stimulus-clock-wrap'),
    quizClock: document.getElementById('quiz-clock'),
    quizDigitalBadge: document.getElementById('quiz-digital-badge'),
    stimulusDetectiveWrap: document.getElementById('stimulus-detective-wrap'),
    detectivePhrase: document.getElementById('detective-phrase'),
    btnSpeakDetective: document.getElementById('btn-speak-detective'),
    optionsContainer: document.getElementById('options-container'),
    feedbackBox: document.getElementById('feedback-box'),
    feedbackTitle: document.getElementById('feedback-title'),
    feedbackDetail: document.getElementById('feedback-detail'),
    btnNextQuestion: document.getElementById('btn-next-question'),

    // Resumen
    summaryStars: document.getElementById('summary-stars'),
    summaryTitle: document.getElementById('summary-title'),
    summaryText: document.getElementById('summary-text'),
    btnReplayLevel: document.getElementById('btn-replay-level'),
    btnSummaryLevels: document.getElementById('btn-summary-levels')
  };

  // --- Persistencia en localStorage ---
  function loadProgress() {
    const defaults = {
      totalStars: 0,
      streak: 0,
      levelStars: { 1: 0, 2: 0, 3: 0, 4: 0 }
    };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      return {
        totalStars: Number(parsed.totalStars) || 0,
        streak: Number(parsed.streak) || 0,
        levelStars: {
          1: Number(parsed.levelStars?.[1]) || 0,
          2: Number(parsed.levelStars?.[2]) || 0,
          3: Number(parsed.levelStars?.[3]) || 0,
          4: Number(parsed.levelStars?.[4]) || 0
        }
      };
    } catch {
      return defaults;
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
    } catch {
      // Ignorar si el almacenamiento está restringido
    }
  }

  function renderStats() {
    dom.totalStars.textContent = String(state.progress.totalStars);
    dom.currentStreak.textContent = String(state.progress.streak);

    for (let lvl = 1; lvl <= 4; lvl++) {
      const el = document.getElementById(`stars-level-${lvl}`);
      if (!el) continue;
      const earned = Math.min(3, Math.max(0, state.progress.levelStars[lvl] || 0));
      el.textContent = '⭐'.repeat(earned) + '☆'.repeat(3 - earned);
    }
  }

  // --- Utilidades de hora e idioma inglés ---
  function getNextHour(hour) {
    return hour === 12 ? 1 : hour + 1;
  }

  function getPrevHour(hour) {
    return hour === 1 ? 12 : hour - 1;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function formatDigital(hour, minute) {
    return `${pad2(hour)}:${pad2(minute)}`;
  }

  function numberToWord(n) {
    if (n === 0) return 'twelve';
    return NUMBER_WORDS[n] || String(n);
  }

  function getMinutePhrasePart(minute) {
    if (minute === 0) return "o'clock";
    if (minute === 15) return 'quarter past';
    if (minute === 30) return 'half past';
    if (minute < 30) return `${numberToWord(minute)} past`;
    const remaining = 60 - minute;
    if (remaining === 15) return 'quarter to';
    return `${numberToWord(remaining)} to`;
  }

  function describeEnglishTime(hour, minute) {
    const hWord = numberToWord(hour);
    const nextH = getNextHour(hour);
    const nextHWord = numberToWord(nextH);

    if (minute === 0) {
      return {
        zone: 'oclock',
        phrase: `It's ${hWord} o'clock`,
        highlightedHtml: `It's ${hWord} <span class="phrase-oclock">o'clock</span>`,
        trick: `En punto (:00): la hora va primero y terminamos con <strong>o'clock</strong> → ${hWord} o'clock.`,
        ruleSummary: `Como la aguja larga está arriba del todo (:00), decimos la hora seguida de <strong>o'clock</strong>: <em>It's ${hWord} o'clock</em>.`
      };
    }

    if (minute <= 30) {
      const minPart = getMinutePhrasePart(minute);
      const isQuarter = minute === 15;
      const isHalf = minute === 30;
      const trickText = isQuarter
        ? `Zona verde (PAST): han pasado 15 min (un cuarto) desde las ${hour} → <strong>quarter past</strong> ${hWord}.`
        : isHalf
          ? `Zona verde (PAST): ha pasado media hora (30 min) desde las ${hour} → <strong>half past</strong> ${hWord}.`
          : `Zona verde (PAST): han pasado ${minute} min desde las ${hour} → <strong>${minPart}</strong> ${hWord}.`;

      return {
        zone: 'past',
        phrase: `It's ${minPart} ${hWord}`,
        highlightedHtml: `It's <span class="phrase-past">${minPart}</span> ${hWord}`,
        trick: trickText,
        ruleSummary: `El minutero está en la zona verde (<strong>PAST</strong>): primero van los minutos que han pasado y luego la misma hora (${hour}).`
      };
    }

    const remaining = 60 - minute;
    const minPart = getMinutePhrasePart(minute);
    const isQuarter = remaining === 15;
    const trickText = isQuarter
      ? `Zona naranja (TO): falta un cuarto (15 min) para las ${nextH} → <strong>quarter to</strong> + (${hour}+1) <strong>${nextHWord}</strong>.`
      : `Zona naranja (TO): faltan ${remaining} para las ${nextH} → <strong>${minPart}</strong> + (${hour}+1) <strong>${nextHWord}</strong>.`;

    return {
      zone: 'to',
      phrase: `It's ${minPart} ${nextHWord}`,
      highlightedHtml: `It's <span class="phrase-to">${minPart}</span> ${nextHWord}`,
      trick: trickText,
      ruleSummary: `El minutero está en la zona naranja (<strong>TO</strong>): contamos los minutos que faltan hasta el 60 (${remaining}) y <strong>sumamos +1 a la hora</strong> (de las ${hour} pasamos a las ${nextH}).`
    };
  }

  // --- Síntesis de voz (Web Speech API) y sonido suave ---
  function speakEnglish(text) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find((v) => v.lang === 'en-GB') ||
        voices.find((v) => v.lang.startsWith('en-GB')) ||
        voices.find((v) => v.lang.startsWith('en-US')) ||
        voices.find((v) => v.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
        utterance.lang = preferredVoice.lang;
      } else {
        utterance.lang = 'en-GB';
      }

      utterance.rate = 0.9;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignorar si el navegador bloquea la síntesis de voz
    }
  }

  function playSuccessChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.08, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.24);
      });
    } catch {
      // Sin audio si no está disponible
    }
  }

  // --- Renderizado del Reloj SVG ---
  function polarToCartesian(cx, cy, radius, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad)
    };
  }

  function renderClockSVG(svgEl, hour, minute, options = {}) {
    const { showHints = false, interactive = false } = options;
    const cx = 210;
    const cy = 210;
    const r = 142;

    const info = describeEnglishTime(hour, minute);
    const handColor =
      info.zone === 'oclock' ? '#2563EB' : info.zone === 'past' ? '#16A34A' : '#EA580C';

    const minuteAngle = minute * 6;
    const hourAngle = ((hour % 12) + minute / 60) * 30;

    const hourEnd = polarToCartesian(cx, cy, 78, hourAngle);
    const minuteEnd = polarToCartesian(cx, cy, 118, minuteAngle);

    // Marcas de minutos y horas
    let ticksSvg = '';
    for (let m = 0; m < 60; m++) {
      const isHourTick = m % 5 === 0;
      const inner = polarToCartesian(cx, cy, isHourTick ? r - 12 : r - 6, m * 6);
      const outer = polarToCartesian(cx, cy, r - 2, m * 6);
      ticksSvg += `<line x1="${inner.x.toFixed(1)}" y1="${inner.y.toFixed(1)}" x2="${outer.x.toFixed(1)}" y2="${outer.y.toFixed(1)}" stroke="${isHourTick ? '#334155' : '#94A3B8'}" stroke-width="${isHourTick ? 3 : 1.5}" stroke-linecap="round" />`;
    }

    // Números del 1 al 12
    let numbersSvg = '';
    for (let h = 1; h <= 12; h++) {
      const pos = polarToCartesian(cx, cy, r - 28, h * 30);
      numbersSvg += `<text x="${pos.x.toFixed(1)}" y="${pos.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="21" font-weight="900" fill="#1E293B">${h}</text>`;
    }

    // Anillo exterior de pistas (Modo Pistas)
    let hintsSvg = '';
    if (showHints) {
      HINT_RING_LABELS.forEach((item) => {
        const angle = item.minute * 6;
        const dist = item.minute === 0 || item.minute === 30 ? r + 30 : r + 40;
        const pos = polarToCartesian(cx, cy, dist, angle);
        const isActive = Math.round(minute / 5) * 5 % 60 === item.minute;
        const fill =
          item.zone === 'oclock'
            ? isActive ? '#1D4ED8' : '#3B82F6'
            : item.zone === 'past'
              ? isActive ? '#15803D' : '#16A34A'
              : isActive ? '#C2410C' : '#EA580C';

        hintsSvg += `<text x="${pos.x.toFixed(1)}" y="${pos.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${isActive ? 13 : 11}" font-weight="${isActive ? 900 : 800}" fill="${fill}">${item.text}</text>`;
      });
    }

    const handleSvg = interactive
      ? `<circle class="clock-minute-handle" cx="${minuteEnd.x.toFixed(1)}" cy="${minuteEnd.y.toFixed(1)}" r="16" fill="${handColor}" fill-opacity="0.22" stroke="${handColor}" stroke-width="3" />`
      : '';

    svgEl.innerHTML = `
      <!-- Fondo dividido en dos mitades: derecha PAST (menta), izquierda TO (coral) -->
      <path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z" fill="#DCFCE7" />
      <path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z" fill="#FFEDD5" />

      <!-- Etiquetas de zona dentro del reloj -->
      <text x="${cx + 58}" y="${cy + 4}" text-anchor="middle" font-size="16" font-weight="900" fill="#16A34A" opacity="0.45">PAST</text>
      <text x="${cx - 58}" y="${cy + 4}" text-anchor="middle" font-size="16" font-weight="900" fill="#EA580C" opacity="0.45">TO</text>

      <!-- Línea divisoria vertical 12-6 -->
      <line x1="${cx}" y1="${cy - r + 4}" x2="${cx}" y2="${cy + r - 4}" stroke="#94A3B8" stroke-width="2" stroke-dasharray="6 6" />

      <!-- Borde exterior del reloj -->
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#1E293B" stroke-width="5" />

      ${ticksSvg}
      ${numbersSvg}
      ${hintsSvg}

      <!-- Aguja de las horas -->
      <line x1="${cx}" y1="${cy}" x2="${hourEnd.x.toFixed(1)}" y2="${hourEnd.y.toFixed(1)}" stroke="#1E293B" stroke-width="8" stroke-linecap="round" />

      <!-- Aguja de los minutos -->
      <line x1="${cx}" y1="${cy}" x2="${minuteEnd.x.toFixed(1)}" y2="${minuteEnd.y.toFixed(1)}" stroke="${handColor}" stroke-width="5.5" stroke-linecap="round" />
      ${handleSvg}

      <!-- Centro -->
      <circle cx="${cx}" cy="${cy}" r="8" fill="#1E293B" />
      <circle cx="${cx}" cy="${cy}" r="3.5" fill="#FFFFFF" />
    `;
  }

  // --- Modo A: Explora el Reloj ---
  function updateExploreView() {
    renderClockSVG(dom.exploreClock, state.exploreHour, state.exploreMinute, {
      showHints: state.hintsEnabled,
      interactive: true
    });

    const info = describeEnglishTime(state.exploreHour, state.exploreMinute);
    dom.exploreDigital.textContent = formatDigital(state.exploreHour, state.exploreMinute);
    dom.explorePhrase.innerHTML = info.highlightedHtml;
    dom.exploreTrick.innerHTML = info.trick;
  }

  function shiftExploreMinutes(delta) {
    let total = state.exploreHour * 60 + state.exploreMinute + delta;
    while (total < 60) total += 12 * 60;
    while (total >= 13 * 60) total -= 12 * 60;
    const h = Math.floor(total / 60);
    state.exploreHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    state.exploreMinute = total % 60;
    updateExploreView();
  }

  function setRandomExploreTime() {
    const minutesPool = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    let nextH = Math.floor(Math.random() * 12) + 1;
    let nextM = minutesPool[Math.floor(Math.random() * minutesPool.length)];
    if (nextH === state.exploreHour && nextM === state.exploreMinute) {
      nextH = getNextHour(nextH);
    }
    state.exploreHour = nextH;
    state.exploreMinute = nextM;
    updateExploreView();
  }

  // Control táctil por arrastre en el reloj SVG
  function getMinuteFromPointerEvent(event) {
    const rect = dom.exploreClock.getBoundingClientRect();
    const scaleX = 420 / rect.width;
    const scaleY = 420 / rect.height;
    const x = (event.clientX - rect.left) * scaleX - 210;
    const y = (event.clientY - rect.top) * scaleY - 210;
    let angleDeg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (angleDeg < 0) angleDeg += 360;
    return Math.round(angleDeg / 6) % 60;
  }

  function handleClockPointerMove(event) {
    if (!state.isDragging) return;
    const newMinute = getMinuteFromPointerEvent(event);
    const prevMinute = state.exploreMinute;

    // Detectar cruce por las 12 para avanzar o retroceder la hora con naturalidad
    if (prevMinute >= 45 && newMinute <= 15) {
      state.exploreHour = getNextHour(state.exploreHour);
    } else if (prevMinute <= 15 && newMinute >= 45) {
      state.exploreHour = getPrevHour(state.exploreHour);
    }

    state.exploreMinute = newMinute;
    updateExploreView();
  }

  dom.exploreClock.addEventListener('pointerdown', (event) => {
    state.isDragging = true;
    dom.exploreClock.setPointerCapture(event.pointerId);
    handleClockPointerMove(event);
  });

  dom.exploreClock.addEventListener('pointermove', handleClockPointerMove);

  const stopDragging = (event) => {
    if (!state.isDragging) return;
    state.isDragging = false;
    if (dom.exploreClock.hasPointerCapture(event.pointerId)) {
      dom.exploreClock.releasePointerCapture(event.pointerId);
    }
  };

  dom.exploreClock.addEventListener('pointerup', stopDragging);
  dom.exploreClock.addEventListener('pointercancel', stopDragging);

  dom.hintsToggle.addEventListener('change', (e) => {
    state.hintsEnabled = e.target.checked;
    updateExploreView();
  });

  dom.btnMinus5.addEventListener('click', () => shiftExploreMinutes(-5));
  dom.btnPlus5.addEventListener('click', () => shiftExploreMinutes(5));
  dom.btnPlus1h.addEventListener('click', () => {
    state.exploreHour = getNextHour(state.exploreHour);
    updateExploreView();
  });
  dom.btnRandomTime.addEventListener('click', setRandomExploreTime);

  dom.btnSpeakExplore.addEventListener('click', () => {
    const info = describeEnglishTime(state.exploreHour, state.exploreMinute);
    speakEnglish(info.phrase);
  });

  dom.postChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      state.exploreMinute = Number(chip.dataset.minute);
      updateExploreView();
    });
  });

  // --- Cambio de modo (Explora <-> Practica) ---
  function switchMode(mode) {
    state.mode = mode;
    dom.tabExplore.classList.toggle('active', mode === 'explore');
    dom.tabPractice.classList.toggle('active', mode === 'practice');
    dom.viewExplore.classList.toggle('active', mode === 'explore');
    dom.viewPractice.classList.toggle('active', mode === 'practice');

    if (mode === 'practice') {
      showLevelsScreen();
    }
  }

  dom.tabExplore.addEventListener('click', () => switchMode('explore'));
  dom.tabPractice.addEventListener('click', () => switchMode('practice'));

  // --- Modo B: Generador Dinámico de Ejercicios ---
  function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function buildPhraseDistractors(hour, minute, correctPhrase) {
    const hWord = numberToWord(hour);
    const nextH = getNextHour(hour);
    const prevH = getPrevHour(hour);
    const nextHWord = numberToWord(nextH);
    const prevHWord = numberToWord(prevH);

    const candidates = [];

    if (minute === 0) {
      candidates.push(
        { text: `It's ${nextHWord} o'clock`, reason: `La aguja corta señala el ${hour}, no el ${nextH}.` },
        { text: `It's half past ${hWord}`, reason: `Half past sería :30 (aguja abajo), pero aquí está arriba en :00.` },
        { text: `It's ${prevHWord} o'clock`, reason: `La aguja corta señala el ${hour}, no el ${prevH}.` },
        { text: `It's quarter past ${hWord}`, reason: `Quarter past sería :15, pero aquí es en punto (:00).` }
      );
    } else if (minute <= 30) {
      const minPart = getMinutePhrasePart(minute);
      const minWordOnly = minute === 15 ? 'quarter' : minute === 30 ? 'half' : numberToWord(minute);

      if (minute === 15) {
        candidates.push(
          { text: `It's quarter to ${hWord}`, reason: `¡Cuidado! El minutero está en la zona verde (PAST), no en la naranja (TO).` },
          { text: `It's quarter to ${nextHWord}`, reason: `Quarter to es para :45 (zona naranja). Aquí es :15 (zona verde, quarter past).` },
          { text: `It's half past ${hWord}`, reason: `Half past es :30 (media hora), pero aquí es :15 (un cuarto, quarter past).` }
        );
      } else if (minute === 30) {
        candidates.push(
          { text: `It's half past ${nextHWord}`, reason: `En la zona verde (PAST) la hora NO cambia: seguimos en las ${hour}, no las ${nextH}.` },
          { text: `It's quarter past ${hWord}`, reason: `Quarter past es :15, pero en :30 decimos half past.` },
          { text: `It's half to ${nextHWord}`, reason: `Con la media hora (:30) siempre se usa PAST (half past), nunca TO.` }
        );
      } else {
        candidates.push(
          { text: `It's ${minWordOnly} to ${hWord}`, reason: `¡Cuidado! En la mitad derecha (verde) han pasado minutos: usamos PAST, no TO.` },
          { text: `It's ${minPart} ${nextHWord}`, reason: `En la zona verde (PAST) no se suma +1 a la hora: seguimos en las ${hour}.` },
          { text: `It's ${hWord} ${minWordOnly} past`, reason: `¡Ojo al orden! Primero van los minutos (${minWordOnly} past) y al final la hora (${hWord}).` }
        );
      }
    } else {
      // Zona TO (:31 - :59)
      const remaining = 60 - minute;
      const minPart = getMinutePhrasePart(minute);
      const remWordOnly = remaining === 15 ? 'quarter' : numberToWord(remaining);

      candidates.push(
        {
          text: `It's ${minPart} ${hWord}`,
          reason: `¡Ojo! En la zona naranja (TO) hay que sumar +1 a la hora: de las ${hour} pasamos a las ${nextH} (${nextHWord}).`
        },
        {
          text: `It's ${remWordOnly} past ${hWord}`,
          reason: `El minutero está en la zona naranja (TO), así que faltan minutos para las ${nextH}, no han pasado.`
        },
        {
          text: `It's ${numberToWord(minute)} past ${hWord}`,
          reason: `En la zona naranja (TO) contamos cuánto falta hasta 60 (${remaining}) y sumamos +1 a la hora.`
        },
        {
          text: `It's ${nextHWord} ${minPart}`,
          reason: `¡Ojo al orden! Primero van los minutos que faltan (${minPart}) y al final la hora siguiente (${nextHWord}).`
        }
      );
    }

    const picked = [];
    const seen = new Set([correctPhrase]);
    for (const c of candidates) {
      if (!seen.has(c.text)) {
        seen.add(c.text);
        picked.push(c);
        if (picked.length === 2) break;
      }
    }
    return picked;
  }

  function buildDigitalDistractors(hour, minute) {
    const correctDigital = formatDigital(hour, minute);
    const nextH = getNextHour(hour);
    const prevH = getPrevHour(hour);
    const candidates = [];

    if (minute === 0) {
      candidates.push(
        { text: formatDigital(nextH, 0), reason: `La frase dice ${numberToWord(hour)} o'clock, así que la hora es ${hour}, no ${nextH}.` },
        { text: formatDigital(hour, 30), reason: `O'clock significa en punto (:00), no y media (:30).` },
        { text: formatDigital(prevH, 0), reason: `La frase dice ${numberToWord(hour)} o'clock (${pad2(hour)}:00).` }
      );
    } else if (minute <= 30) {
      const altMin = minute === 15 ? 45 : minute === 30 ? 15 : 60 - minute;
      candidates.push(
        { text: formatDigital(hour, altMin), reason: `La frase usa PAST (han pasado ${minute} min desde las ${hour}), así que los minutos son :${pad2(minute)}.` },
        { text: formatDigital(nextH, minute), reason: `Con PAST la hora no cambia: es las ${hour}:${pad2(minute)}, no las ${nextH}.` },
        { text: formatDigital(prevH, altMin), reason: `Fíjate en la hora: dice ${numberToWord(hour)}, así que son las ${pad2(hour)}:${pad2(minute)}.` }
      );
    } else {
      // Zona TO: ej. 08:40 -> "twenty to nine"
      const remaining = 60 - minute;
      candidates.push(
        {
          text: formatDigital(nextH, minute),
          reason: `¡Casi! "To ${numberToWord(nextH)}" significa que aún faltan ${remaining} min para las ${nextH}, así que todavía son las ${hour}:${pad2(minute)}.`
        },
        {
          text: formatDigital(nextH, remaining),
          reason: `¡Ojo! Dice "${numberToWord(remaining)} to ${numberToWord(nextH)}": faltan ${remaining} para las ${nextH}, es decir, ${pad2(hour)}:${pad2(minute)}.`
        },
        {
          text: formatDigital(hour, remaining),
          reason: `Como dice TO (faltan ${remaining}), los minutos en el reloj digital son 60 - ${remaining} = :${pad2(minute)}.`
        }
      );
    }

    const picked = [];
    const seen = new Set([correctDigital]);
    for (const c of candidates) {
      if (!seen.has(c.text)) {
        seen.add(c);
        picked.push(c);
        if (picked.length === 2) break;
      }
    }
    return picked;
  }

  function generateQuestion(level) {
    const cfg = LEVEL_CONFIG[level];
    let hour;
    let minute;
    let key;

    // Evitar repetir la misma hora consecutiva
    do {
      hour = Math.floor(Math.random() * 12) + 1;
      minute = cfg.minutes[Math.floor(Math.random() * cfg.minutes.length)];
      key = `${hour}:${minute}`;
    } while (key === state.quiz.lastTimeKey);

    state.quiz.lastTimeKey = key;

    const info = describeEnglishTime(hour, minute);
    const isDetective = cfg.allowDetective && Math.random() < 0.45;

    if (!isDetective) {
      const distractors = buildPhraseDistractors(hour, minute, info.phrase);
      const options = shuffleArray([
        { text: info.phrase, isCorrect: true, reason: '' },
        ...distractors.map((d) => ({ text: d.text, isCorrect: false, reason: d.reason }))
      ]);

      return {
        type: 'clock-to-phrase',
        hour,
        minute,
        info,
        options
      };
    }

    const correctDigital = formatDigital(hour, minute);
    const distractors = buildDigitalDistractors(hour, minute);
    const options = shuffleArray([
      { text: correctDigital, isCorrect: true, reason: '' },
      ...distractors.map((d) => ({ text: d.text, isCorrect: false, reason: d.reason }))
    ]);

    return {
      type: 'detective',
      hour,
      minute,
      info,
      options
    };
  }

  // --- Flujo de pantallas del Quiz ---
  function showLevelsScreen() {
    dom.levelsScreen.classList.remove('hidden');
    dom.quizScreen.classList.add('hidden');
    dom.summaryScreen.classList.add('hidden');
    renderStats();
  }

  function startLevel(level) {
    state.quiz.level = level;
    state.quiz.questionIndex = 0;
    state.quiz.hits = 0;
    state.quiz.lastTimeKey = null;

    dom.levelsScreen.classList.add('hidden');
    dom.summaryScreen.classList.add('hidden');
    dom.quizScreen.classList.remove('hidden');

    dom.quizLevelTitle.textContent = LEVEL_CONFIG[level].name;
    loadNextQuestion();
  }

  function loadNextQuestion() {
    state.quiz.answered = false;
    const q = generateQuestion(state.quiz.level);
    state.quiz.currentQuestion = q;

    const num = state.quiz.questionIndex + 1;
    dom.quizCounter.textContent = `${num} / ${QUESTIONS_PER_ROUND}`;
    dom.quizProgressFill.style.width = `${(num / QUESTIONS_PER_ROUND) * 100}%`;
    dom.quizHits.textContent = String(state.quiz.hits);

    dom.feedbackBox.classList.add('hidden');
    dom.feedbackBox.classList.remove('correct', 'wrong');

    if (q.type === 'clock-to-phrase') {
      dom.quizPromptLabel.textContent = '¿Qué hora marca este reloj?';
      dom.stimulusClockWrap.classList.remove('hidden');
      dom.stimulusDetectiveWrap.classList.add('hidden');
      renderClockSVG(dom.quizClock, q.hour, q.minute, { showHints: false, interactive: false });
      dom.quizDigitalBadge.textContent = formatDigital(q.hour, q.minute);
    } else {
      dom.quizPromptLabel.textContent = 'Escucha y elige el reloj digital correcto:';
      dom.stimulusClockWrap.classList.add('hidden');
      dom.stimulusDetectiveWrap.classList.remove('hidden');
      dom.detectivePhrase.textContent = q.info.phrase;
      speakEnglish(q.info.phrase);
    }

    dom.optionsContainer.innerHTML = '';
    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = opt.text;
      btn.dataset.index = String(idx);
      btn.addEventListener('click', () => handleAnswer(idx));
      dom.optionsContainer.appendChild(btn);
    });
  }

  function handleAnswer(selectedIndex) {
    if (state.quiz.answered) return;
    state.quiz.answered = true;

    const q = state.quiz.currentQuestion;
    const selectedOpt = q.options[selectedIndex];
    const buttons = dom.optionsContainer.querySelectorAll('.option-btn');

    buttons.forEach((btn, idx) => {
      btn.disabled = true;
      const opt = q.options[idx];
      if (opt.isCorrect) {
        btn.classList.add('is-correct');
      } else if (idx === selectedIndex) {
        btn.classList.add('is-wrong');
      } else {
        btn.classList.add('is-dimmed');
      }
    });

    if (selectedOpt.isCorrect) {
      state.quiz.hits += 1;
      state.progress.streak += 1;
      dom.quizHits.textContent = String(state.quiz.hits);
      dom.feedbackBox.classList.add('correct');
      dom.feedbackTitle.textContent = '🎉 ¡Genial! ¡Has acertado!';
      dom.feedbackDetail.innerHTML = `${q.info.ruleSummary}`;
      playSuccessChime();
      speakEnglish(q.info.phrase);
    } else {
      state.progress.streak = 0;
      dom.feedbackBox.classList.add('wrong');
      dom.feedbackTitle.textContent = '💡 ¡Casi! Vamos a verlo juntas:';
      dom.feedbackDetail.innerHTML = `${selectedOpt.reason}<br><br>✅ La correcta es: <strong>${q.type === 'detective' ? formatDigital(q.hour, q.minute) : q.info.phrase}</strong>.`;
    }

    saveProgress();
    renderStats();

    dom.btnNextQuestion.textContent =
      state.quiz.questionIndex + 1 >= QUESTIONS_PER_ROUND
        ? 'Ver resultado 🏆'
        : 'Siguiente pregunta →';
    dom.feedbackBox.classList.remove('hidden');
  }

  function showRoundSummary() {
    dom.quizScreen.classList.add('hidden');
    dom.summaryScreen.classList.remove('hidden');

    const hits = state.quiz.hits;
    const earnedStars = hits >= 9 ? 3 : hits >= 7 ? 2 : hits >= 5 ? 1 : 0;

    const prevBest = state.progress.levelStars[state.quiz.level] || 0;
    if (earnedStars > prevBest) {
      state.progress.totalStars += earnedStars - prevBest;
      state.progress.levelStars[state.quiz.level] = earnedStars;
      saveProgress();
      renderStats();
    }

    dom.summaryStars.textContent = '⭐'.repeat(earnedStars) + '☆'.repeat(3 - earnedStars);
    dom.summaryTitle.textContent =
      earnedStars === 3
        ? '¡Eres una campeona!'
        : earnedStars >= 1
          ? '¡Muy buen trabajo!'
          : '¡Buen intento, sigue practicando!';
    dom.summaryText.textContent = `Has acertado ${hits} de ${QUESTIONS_PER_ROUND} preguntas en ${LEVEL_CONFIG[state.quiz.level].name}.`;
  }

  dom.btnNextQuestion.addEventListener('click', () => {
    state.quiz.questionIndex += 1;
    if (state.quiz.questionIndex >= QUESTIONS_PER_ROUND) {
      showRoundSummary();
    } else {
      loadNextQuestion();
    }
  });

  dom.startLevelBtns.forEach((btn) => {
    btn.addEventListener('click', () => startLevel(Number(btn.dataset.level)));
  });

  dom.btnBackLevels.addEventListener('click', showLevelsScreen);
  dom.btnReplayLevel.addEventListener('click', () => startLevel(state.quiz.level));
  dom.btnSummaryLevels.addEventListener('click', showLevelsScreen);

  dom.btnSpeakDetective.addEventListener('click', () => {
    if (state.quiz.currentQuestion) {
      speakEnglish(state.quiz.currentQuestion.info.phrase);
    }
  });

  // --- Inicialización ---
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
  }
  renderStats();
  updateExploreView();
})();
