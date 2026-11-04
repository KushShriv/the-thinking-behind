(() => {
  // Must match KEY in seal.mjs.
  const KEY = 'the-thinking-behind';
  const demo = new URLSearchParams(location.search).has('demo');
  const STORE = demo ? 'ttb-sealed-demo' : 'ttb-sealed';
  const MAX_ROWS = 14;

  const DEMO = Array.from({ length: 22 }, (_, i) => ({
    thing: `The company or product (demo ${i + 1})`,
    question: i % 3 === 2
      ? 'The decision goes here as a question, in the long form: why did this company make this specific choice when the obvious option was right there?'
      : 'The decision goes here as a question',
    sources: [
      { title: 'A source that documents the decision', url: 'https://example.com/' },
      { title: 'A second source that confirms or disputes it', url: 'https://example.org/' },
    ],
  }));
  const sealed = demo ? DEMO : window.TTB_SEALED || [];

  const $ = (id) => document.getElementById(id);
  const ui = {
    bars: $('bars'), empty: $('empty'), count: $('count'), draw: $('draw'), sheet: $('sheet'),
    thing: $('thing'), box: $('questionBox'), question: $('question'), sources: $('sources'),
    band: $('band'), status: $('status'), acts: $('acts'), toast: $('toast'),
  };

  // Decodes one entry only when it is drawn, so the others stay sealed.
  function unseal(index) {
    if (demo) return DEMO[index];
    const key = new TextEncoder().encode(KEY);
    const bytes = Uint8Array.from(atob(sealed[index]), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes.map((b, i) => b ^ key[i % key.length])));
  }

  let storageWorks = true;
  function load() {
    const fresh = { spent: {}, current: null };
    try {
      const saved = JSON.parse(localStorage.getItem(STORE));
      if (saved && typeof saved.spent === 'object') return { ...fresh, ...saved };
    } catch {
      storageWorks = false;
    }
    return fresh;
  }
  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify(state));
    } catch {
      storageWorks = false;
    }
  }

  const state = load();
  if (state.current && !sealed[state.current.index]) state.current = null;
  let busy = false;

  const remaining = () => sealed.map((_, i) => i).filter((i) => !(i in state.spent) && state.current?.index !== i);

  // A fair pick: rejection sampling removes the bias of a plain modulo.
  function randomInt(limit) {
    const range = 2 ** 32 - (2 ** 32 % limit);
    const value = new Uint32Array(1);
    do crypto.getRandomValues(value); while (value[0] >= range);
    return value[0] % limit;
  }

  // Bar widths are fixed per entry and carry no information about the entry.
  const barWidth = (i) => 62 + ((i * 2654435761) >>> 0) % 39;

  function renderBars() {
    const cols = Math.max(1, Math.ceil(sealed.length / MAX_ROWS));
    ui.bars.style.setProperty('--cols', cols);
    ui.bars.style.setProperty('--rows', Math.max(1, Math.ceil(sealed.length / cols)));
    ui.bars.replaceChildren(...sealed.map((_, i) => {
      const bar = document.createElement('span');
      bar.className = `bar ${state.spent[i] || ''}`;
      bar.style.setProperty('--w', `${barWidth(i)}%`);
      return bar;
    }));
  }

  function renderWall() {
    const marks = Object.values(state.spent);
    const closed = marks.filter((m) => m === 'closed').length;
    const rejected = marks.length - closed;
    const left = remaining().length;
    const parts = [`${left} sealed`, `${closed} opened`, `${rejected} rejected`];
    if (demo) parts.push('demo list');
    if (!storageWorks) parts.push('this browser will not keep the record');
    ui.count.textContent = parts.join(', ');

    const none = left === 0 && !state.current;
    ui.draw.disabled = none;
    ui.empty.hidden = sealed.length > 0;
    ui.empty.textContent = 'The sealed list is empty. Add decisions with seal.mjs.';
    if (sealed.length > 0 && none) {
      ui.empty.hidden = false;
      ui.empty.textContent = 'Every file is open. Add more decisions with seal.mjs.';
      ui.bars.hidden = true;
    }
  }

  function button(label, key, act, quiet) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `act${quiet ? ' quiet' : ''}`;
    const k = document.createElement('kbd');
    k.textContent = key;
    b.append(k, label);
    b.addEventListener('click', act);
    return b;
  }

  // Sets the largest size at which the question fits its box.
  function fitQuestion() {
    const { box, question } = ui;
    const fits = () => question.scrollHeight <= box.clientHeight && question.scrollWidth <= box.clientWidth;
    let low = 20;
    let high = Math.min(box.clientHeight, innerWidth * 0.3);
    while (high - low > 1) {
      const size = (low + high) / 2;
      question.style.fontSize = `${size}px`;
      if (fits()) low = size; else high = size;
    }
    question.style.fontSize = `${Math.floor(low)}px`;
  }

  function renderSheet() {
    const { index, stage, lockedAt } = state.current;
    const entry = unseal(index);
    const open = stage === 'open';
    const showSources = stage === 'sources';

    ui.thing.textContent = entry.thing;
    ui.question.textContent = entry.question;
    ui.band.classList.toggle('locked', !open);
    ui.status.textContent = open ? 'Say your guess first' : `Guess locked at ${lockedAt}`;
    ui.sheet.classList.toggle('with-sources', showSources);
    ui.sources.hidden = !showSources;
    ui.sources.replaceChildren();
    if (showSources) {
      ui.sources.append(...entry.sources.map((s) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = s.url;
        a.target = '_blank';
        a.rel = 'noreferrer';
        a.textContent = s.title;
        const host = document.createElement('span');
        host.textContent = new URL(s.url).hostname.replace(/^www\./, '');
        li.append(a, host);
        return li;
      }));
    }

    // A rejection is possible only here, before the guess is locked.
    if (open) {
      ui.acts.replaceChildren(
        button('Reject this topic', 'X', reject, true),
        button('Lock my guess', 'G', lock),
      );
    } else if (stage === 'locked') {
      ui.acts.replaceChildren(button('Open the sources', 'S', openSources));
    } else {
      ui.acts.replaceChildren(button('Close this file', 'C', closeFile));
    }
    fitQuestion();
  }

  const barRect = (index) => {
    const r = ui.bars.children[index]?.getBoundingClientRect();
    if (!r || !r.width) return 'inset(50%)';
    return `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px)`;
  };

  function showSheet(index, animate) {
    ui.sheet.style.setProperty('--from', barRect(index));
    ui.sheet.hidden = false;
    ui.sheet.classList.toggle('still', !animate);
    renderSheet();
    void ui.sheet.offsetWidth;
    ui.sheet.classList.add('full');
  }

  function hideSheet(index) {
    ui.sheet.style.setProperty('--from', barRect(index));
    ui.sheet.classList.remove('still');
    void ui.sheet.offsetWidth;
    ui.sheet.classList.remove('full');
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => { ui.sheet.hidden = true; busy = false; }, still ? 0 : 560);
  }

  function scan(pool, pick, done) {
    const bars = ui.bars.children;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || pool.length === 1) {
      bars[pick].classList.add('scan');
      setTimeout(done, 300);
      return;
    }
    let delay = 50;
    let last = null;
    const step = () => {
      if (last !== null) bars[last].classList.remove('scan');
      const landing = delay > 340;
      let next = landing ? pick : pool[randomInt(pool.length)];
      if (!landing && next === last) next = pool[(pool.indexOf(next) + 1) % pool.length];
      bars[next].classList.add('scan');
      last = next;
      if (landing) { setTimeout(done, 520); return; }
      delay *= 1.13;
      setTimeout(step, delay);
    };
    step();
  }

  function draw() {
    if (busy || state.current) return;
    const pool = remaining();
    if (!pool.length) return;
    busy = true;
    const pick = pool[randomInt(pool.length)];
    // Saved first: a reload during the scan cannot give a second draw.
    state.current = { index: pick, stage: 'open' };
    save();
    ui.draw.disabled = true;
    scan(pool, pick, () => {
      showSheet(pick, true);
      ui.bars.children[pick].classList.remove('scan');
      busy = false;
    });
  }

  function finish(mark) {
    if (busy || !state.current) return;
    busy = true;
    const { index } = state.current;
    state.spent[index] = mark;
    state.current = null;
    save();
    renderBars();
    renderWall();
    hideSheet(index);
  }

  function reject() {
    if (state.current?.stage === 'open') finish('rejected');
  }

  function lock() {
    if (busy || state.current?.stage !== 'open') return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    state.current = { ...state.current, stage: 'locked', lockedAt: time };
    save();
    renderSheet();
  }

  function openSources() {
    if (busy || state.current?.stage !== 'locked') return;
    state.current = { ...state.current, stage: 'sources' };
    save();
    renderSheet();
  }

  function closeFile() {
    if (state.current?.stage === 'sources') finish('closed');
  }

  let toastTimer;
  function toast(text) {
    ui.toast.textContent = text;
    ui.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { ui.toast.hidden = true; }, 3000);
  }

  let clearArmed = false;
  function clearRecord() {
    if (!clearArmed) {
      clearArmed = true;
      toast('Press 0 again to clear the record of opened files');
      setTimeout(() => { clearArmed = false; }, 3000);
      return;
    }
    clearArmed = false;
    try { localStorage.removeItem(STORE); } catch { /* Nothing to clear. */ }
    location.reload();
  }

  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const key = e.key.toLowerCase();
    if (key === ' ') {
      e.preventDefault();
      draw();
    } else if (key === 'g') lock();
    else if (key === 'x') reject();
    else if (key === 's') openSources();
    else if (key === 'c') closeFile();
    else if (key === '0') clearRecord();
    else if (key === 'f') {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    }
  });

  ui.draw.addEventListener('click', draw);

  addEventListener('resize', () => {
    if (state.current && !ui.sheet.hidden) fitQuestion();
  });

  // The pointer hides when idle, so it does not show on camera.
  let idleTimer;
  addEventListener('pointermove', () => {
    document.body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => document.body.classList.add('idle'), 2500);
  });

  renderBars();
  renderWall();
  // A reload returns to the open file, so a reload cannot give a new draw.
  if (state.current) showSheet(state.current.index, false);
})();
