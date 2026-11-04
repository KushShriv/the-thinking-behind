(() => {
  // Must match KEY in seal.mjs.
  const KEY = 'the-thinking-behind';
  const demo = new URLSearchParams(location.search).has('demo');
  const STORE = demo ? 'ttb-modes-demo' : 'ttb-modes';
  const STEPS = {
    classic: ['Make your call', 'Ask an AI', 'Check the verdict'],
    arcade: ['Guess', 'See the answer'],
  };
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = () => matchMedia('(max-width: 760px), (max-aspect-ratio: 4/5)').matches;
  const GLIDE = 'cubic-bezier(.22, .8, .24, 1)';
  const SEND = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘↵' : 'Ctrl ↵';
  // All motion runs through this, so it can be awaited and never drifts from a timer.
  const play = (el, frames, options) => el.animate(frames, { fill: 'both', ...options });
  const done = (animations) => Promise.all(animations.map((a) => a.finished.catch(() => {})));
  const fadeIn = (el, duration = 220, delay = 0) => play(el, [{ opacity: 0 }, { opacity: 1 }], { duration, delay, easing: 'ease-out' });

  const DEMO_SOURCES = [
    { title: 'A source that documents the decision', url: 'https://example.com/' },
    { title: 'A second source that confirms or disputes it', url: 'https://example.org/' },
  ];
  const DEMO = {
    classic: Array.from({ length: 12 }, (_, i) => ({
      thing: `The company or product (demo ${i + 1})`,
      story: 'The story goes here. It covers only what the company knew at that moment: the situation, the pressure and the options. It stops before the decision, so it never gives the answer.',
      question: 'The decision you have to make goes here',
      sources: DEMO_SOURCES,
    })),
    arcade: Array.from({ length: 12 }, (_, i) => ({
      thing: `The topic (demo ${i + 1})`,
      question: 'The quick question goes here',
      answer: 'The answer goes here, in one or two sentences, with the reason behind it.',
      sources: DEMO_SOURCES,
    })),
  };
  const lists = demo ? DEMO : { classic: [], arcade: [], ...window.TTB_SEALED };

  const $ = (id) => document.getElementById(id);
  const ui = {
    home: $('home'), wall: $('wall'), modeName: $('modeName'), draw: $('draw'), pile: $('pile'),
    empty: $('empty'), count: $('count'), hint: $('hint'),
    sheet: $('sheet'), thing: $('thing'), steps: $('steps'), story: $('story'),
    box: $('questionBox'), question: $('question'), stamp: $('stamp'),
    make: $('make'), call: $('call'), why: $('why'), promptPanel: $('promptPanel'), prompt: $('prompt'),
    reveal: $('reveal'), answer: $('answer'), sources: $('sources'),
    status: $('status'), acts: $('acts'), toast: $('toast'),
    arcadeControls: $('arcadeControls'), guess: $('guess'), guessWhy: $('guessWhy'),
    spread: $('spread'), turn: $('turn'), turnPage: $('turnPage'), caseFront: $('caseFront'),
    tray: document.querySelector('.tray'),
    choices: [...document.querySelectorAll('.choice')],
    verdictPanel: $('verdictPanel'), verdictText: $('verdictText'), cardScreen: $('cardScreen'),
  };

  // Decodes one entry only when it is drawn, so the others stay sealed.
  function unseal(mode, index) {
    if (demo) return DEMO[mode][index];
    const key = new TextEncoder().encode(KEY);
    const bytes = Uint8Array.from(atob(lists[mode][index]), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes.map((b, i) => b ^ key[i % key.length])));
  }

  // The reader's words go only into this text. Nothing leaves the browser.
  function buildPrompt(entry, call, why) {
    return `I am practising how I make decisions. Below is a real situation, the call I made, and my reasoning. Coach me. Be strict and fair.

THE SITUATION (${entry.thing})
${entry.story}

THE DECISION
${entry.question}

MY CALL
${call}

MY REASONING
${why}

SOURCES I HAVE ALREADY READ (starting points, not a complete evidence base)
${entry.sources.map((s) => s.url).join('\n')}

Do your research first. Then start your reply with exactly these two lines, before anything else:
Verdict: Right, Partly right or Wrong (choose one, judging my call on what was known at that moment)
What you missed: one sentence on the most important thing my reasoning missed. If the verdict is Right and I missed nothing important, write "Nothing major".

After those two lines, give the rest:
1. Read the supplied sources, then search the web for additional reliable sources to compare my call against. Do not limit your research to what I have already read. Prefer primary records, statements from the people involved, and reporting from the time. Cross-check with independent reputable reporting, including evidence that challenges the stated rationale. Open and assess the sources before using them. If browsing is unavailable or the evidence is insufficient, say so and explain what you cannot verify. Do not fill gaps from memory or invent sources.
2. Judge my call on what was known at that moment, not on how it turned out.
3. Show the gap in my reasoning: what I weighed well, what I missed, and which assumption did the most work.
4. Give the strongest argument against my call.
5. Tell me what happened, and what the people involved weighed.
6. Give me one question to ask myself the next time I face a decision like this.

Separate information available at the time from later outcomes and explanations. Do not treat the actual decision or its outcome as proof that it was the best choice. Label each point as documented fact or your inference. Cite a source link for every fact and identify which sources you found beyond my list. Keep the coaching under 300 words; list the sources separately.`;
  }

  const MARKS = { right: 'Right', partly: 'Partly right', wrong: 'Wrong' };
  const KEY_MARKS = { y: 'right', h: 'partly', n: 'wrong' };

  let storageWorks = true;
  let skipArmed = false;
  function load() {
    const fresh = {
      mode: null,
      classic: { spent: {}, current: null },
      arcade: { spent: {}, current: null },
    };
    try {
      const saved = JSON.parse(localStorage.getItem(STORE));
      if (saved?.classic && saved?.arcade) return { ...fresh, ...saved };
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
  $('demoLink').textContent = demo ? 'Demo content · exit demo' : 'Try the demo';
  $('demoLink').href = demo ? location.pathname : '?demo';
  for (const mode of ['classic', 'arcade']) {
    const { current } = state[mode];
    if (current && !lists[mode][current.index]) state[mode].current = null;
  }
  let busy = false;

  const run = () => state[state.mode];
  const list = () => lists[state.mode];
  const leftIn = (mode) => lists[mode].filter((_, i) => !(i in state[mode].spent) && state[mode].current?.index !== i).length;
  const remaining = () => list().map((_, i) => i).filter((i) => !(i in run().spent) && run().current?.index !== i);

  // A fair pick: rejection sampling removes the bias of a plain modulo.
  function randomInt(limit) {
    const range = 2 ** 32 - (2 ** 32 % limit);
    const value = new Uint32Array(1);
    do crypto.getRandomValues(value); while (value[0] >= range);
    return value[0] % limit;
  }

  // Draws the card edges, so a deck gets thinner as cases are played.
  function stack(deck, count) {
    deck.classList.toggle('gone', count === 0);
    const edges = Array.from({ length: Math.min(count, 18) }, (_, i) => {
      const step = (i + 1) * 1.3;
      return `${step}px ${step}px 0 ${i % 2 ? '#ddd8c8' : '#fbf9f2'}`;
    });
    deck.style.boxShadow = [...edges, '10px 22px 30px -8px rgba(22, 32, 42, .45)'].join(', ');
  }

  function renderPile() {
    const played = Object.keys(run().spent).length;
    ui.pile.classList.toggle('used', played > 0);
    if (!played) {
      ui.pile.textContent = 'Played';
      return;
    }
    const tilts = [-6, 4, -2, 7, -4];
    ui.pile.replaceChildren(...Array.from({ length: Math.min(played, 5) }, (_, i) => {
      const card = document.createElement('span');
      card.className = 'back';
      card.style.transform = `rotate(${tilts[i]}deg)`;
      return card;
    }));
  }

  function renderWall() {
    const marks = Object.values(run().spent);
    const count = (mark) => marks.filter((m) => m === mark).length;
    const left = remaining().length;
    const unit = state.mode === 'classic' ? (left === 1 ? 'journal entry' : 'journal entries') : (left === 1 ? 'level' : 'levels');
    const parts = [`${left} ${unit} left`];
    if (state.mode === 'classic') parts.push(`${count('closed')} played`);
    else parts.push(`${count('got')} got`, `${count('missed')} missed`);
    parts.push(`${count('rejected')} skipped`);
    if (demo) parts.push('demo list');
    if (!storageWorks) parts.push('this browser will not keep the record');
    ui.count.textContent = parts.join(', ');

    const name = state.mode === 'classic' ? 'Classic' : 'Arcade';
    ui.modeName.textContent = name;
    const drawLabel = state.mode === 'classic' ? 'Open a journal entry' : 'Start a level';
    $('drawHint').textContent = drawLabel;
    ui.draw.setAttribute('aria-label', drawLabel);
    ui.draw.querySelector('.label').textContent = 'The Thinking Behind';
    ui.draw.dataset.start = 'Press start';
    const none = left === 0 && !run().current;
    ui.draw.disabled = none;
    ui.hint.hidden = none;
    ui.empty.hidden = !none;
    const help = document.createElement('span');
    help.textContent = 'Try the demo from the home screen.';
    const plural = state.mode === 'classic' ? 'journal entries' : 'levels';
    ui.empty.replaceChildren(list().length ? `You finished all ${plural}` : `No ${plural} yet`, help);
    stack(ui.draw, left);
    renderPile();
  }

  function button(label, key, act, quiet) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `act${quiet ? ' quiet' : ''}`;
    if (key) {
      const k = document.createElement('kbd');
      k.textContent = key;
      b.append(k);
    }
    b.append(label);
    b.addEventListener('click', act);
    return b;
  }

  // Sets the largest size at which the question fits its box.
  function fitQuestion() {
    const { box, question } = ui;
    const fits = () => question.offsetHeight <= box.clientHeight && question.scrollWidth <= box.clientWidth;
    let low = 16;
    let high = Math.min(box.clientHeight, box.clientWidth * 0.16, state.mode === 'classic' ? 56 : 80);
    while (high - low > 1) {
      const size = (low + high) / 2;
      question.style.fontSize = `${size}px`;
      if (fits()) low = size; else high = size;
    }
    question.style.fontSize = `${Math.floor(low)}px`;
  }

  function renderSources(entry) {
    ui.sources.replaceChildren(...entry.sources.map((s) => {
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

  function changeStage(render) {
    render();
    if (still()) return;
    const shown = [ui.make, ui.promptPanel, ui.verdictPanel, ui.reveal, ui.arcadeControls].filter((el) => !el.hidden);
    for (const el of shown) {
      if (el === ui.arcadeControls) continue;
      play(el, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: GLIDE }).finished.then((a) => a.cancel()).catch(() => {});
    }
  }

  function renderCard(entry) {
    const { call, mark: result, missed } = run().current;
    const classic = state.mode === 'classic';
    const detail = classic ? (result === 'right' ? '' : (missed || '').trim()) : entry.answer;
    $('cardThing').textContent = entry.thing;
    $('cardQuestion').textContent = entry.question;
    $('cardCallLabel').textContent = classic ? 'My call' : 'My guess';
    $('cardCall').textContent = call;
    $('cardVerdict').textContent = MARKS[result];
    $('cardVerdict').className = `vc-stamp ${result}`;
    $('cardMissedLabel').textContent = classic ? 'What I missed' : 'The answer';
    $('cardMissedLabel').hidden = !detail;
    $('cardMissed').hidden = !detail;
    $('cardMissed').textContent = detail;
    $('cardFoot').textContent = classic ? 'Verdict from my AI tool. Check its sources.' : 'I marked this myself.';
    $('cardDate').textContent = new Date().toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function renderSheet() {
    const { index, stage, lockedAt, call, why, copied, mark: picked } = run().current;
    const entry = unseal(state.mode, index);
    const classic = state.mode === 'classic';
    const open = stage === 'open';

    ui.thing.textContent = entry.thing;
    ui.question.textContent = entry.question;
    ui.story.hidden = !classic;
    ui.story.textContent = classic ? entry.story : '';
    ui.make.hidden = !(classic && open);
    ui.promptPanel.hidden = !(classic && stage === 'locked');
    ui.verdictPanel.hidden = !(classic && (stage === 'verdict' || stage === 'card'));
    ui.cardScreen.hidden = stage !== 'card';
    ui.sheet.classList.toggle('carded', stage === 'card');
    ui.arcadeControls.hidden = classic;
    ui.guess.value = classic ? '' : call || '';
    ui.guessWhy.value = classic ? '' : why || '';
    ui.guess.readOnly = !open;
    ui.guessWhy.readOnly = !open;
    ui.reveal.hidden = stage !== 'answer';
    ui.sheet.classList.toggle('with-pad', classic);
    ui.sheet.classList.toggle('answered', stage === 'answer');
    ui.stamp.hidden = !classic || open;
    ui.stamp.textContent = `Locked ${lockedAt || ''}`;

    const step = open ? 0 : !classic || stage === 'locked' ? 1 : 2;
    ui.steps.replaceChildren(...STEPS[state.mode].map((label, i) => {
      const li = document.createElement('li');
      li.textContent = label;
      if (i < step) li.className = 'done';
      if (i === step) li.className = 'now';
      return li;
    }));

    if (classic && open) {
      ui.call.value = call || '';
      ui.why.value = why || '';
    }
    if (stage === 'locked' && classic) ui.prompt.value = buildPrompt(entry, call, why);
    $('copyLabel').textContent = copied ? 'Copied' : 'Copy the prompt';
    $('copyBtn').classList.toggle('quiet', !!copied);
    if (stage === 'verdict' || stage === 'card') ui.verdictText.value = run().current.missed || '';
    if (stage === 'card') renderCard(entry);
    if (stage === 'verdict') {
      ui.choices.forEach((b) => {
        b.classList.toggle('on', b.dataset.mark === picked);
        b.setAttribute('aria-pressed', b.dataset.mark === picked);
      });
      $('missedBlock').hidden = !picked || picked === 'right';
    }
    if (stage === 'answer') {
      ui.answer.textContent = entry.answer;
      renderSources(entry);
    }

    if (open) ui.status.textContent = classic ? 'You are in charge. What do you do?' : 'Make your guess. Give your reason.';
    else if (stage === 'locked' && classic) ui.status.textContent = copied ? 'Paste it into your AI tool, then come back here' : 'Step 1: copy the prompt';
    else if (stage === 'verdict') ui.status.textContent = picked ? 'Add what you missed, or leave it empty' : 'Choose what the AI said';
    else if (stage === 'card') ui.status.textContent = 'Take a screenshot. The buttons hide when you stop moving.';
    else ui.status.textContent = stage === 'locked' ? 'No changing it now' : 'Did you get it?';

    // Leaving keeps the entry. It comes back when you return to this mode.
    const away = button('Leave for now', 'Esc', leave, true);
    // A skip is possible only here, before the guess is locked.
    if (open) {
      ui.acts.replaceChildren(
        away,
        button('Skip this one', null, reject, true),
        button(classic ? 'Lock my call' : 'Lock my guess', classic ? SEND : '↵', lock),
      );
    } else if (stage === 'locked' && classic) {
      ui.acts.replaceChildren(away, button('Check the verdict', 'V', checkVerdict, !copied));
    } else if (stage === 'verdict') {
      ui.acts.replaceChildren(
        button('Back to the prompt', 'B', backToPrompt, true),
        picked ? button('Make my card', '↵', makeCard) : button('Close without a verdict', 'C', closeFile, true),
      );
    } else if (stage === 'card') {
      ui.acts.replaceChildren(...(classic
        ? [button('Change the verdict', 'V', checkVerdict, true), button('Done', 'C', closeFile)]
        : [button('Next question', 'Space', closeFile)]));
    } else if (stage === 'locked') {
      ui.acts.replaceChildren(away, button('Show the answer', 'S', showAnswer));
    } else {
      ui.acts.replaceChildren(
        away,
        button('I missed it', 'N', () => mark('wrong'), true),
        button('I got it', 'Y', () => mark('right')),
      );
    }
    fitQuestion();
  }

  function showSheet() {
    ui.sheet.hidden = false;
    renderSheet();
    ui.spread.classList.toggle('opened', state.mode === 'classic');
    if (state.mode === 'classic') ui.wall.classList.add('under');
    if (state.mode === 'classic' && run().current.stage === 'open') ui.call.focus({ preventScroll: true });
  }

  // Where the open book must sit so that its right page lies on the closed journal.
  function closedPose() {
    const book = ui.draw.getBoundingClientRect();
    const page = [ui.make, ui.promptPanel, ui.verdictPanel].find((el) => !el.hidden).getBoundingClientRect();
    if (!book.width || !page.width) return null;
    const spine = ui.spread.getBoundingClientRect();
    const scaleX = book.width / page.width;
    const scaleY = book.height / page.height;
    const x = book.left + book.width / 2 - (spine.left + spine.width / 2 + (page.width * scaleX) / 2);
    const y = book.top + book.height / 2 - (spine.top + spine.height / 2);
    return `translate(${x}px, ${y}px) scale(${scaleX}, ${scaleY})`;
  }

  // One timeline for the cover and two leaves. Closing plays the same timeline backwards.
  function bookTimeline(pose) {
    const timing = { duration: 980, easing: 'cubic-bezier(.5, .05, .2, 1)' };
    const parts = [
      play(ui.spread, [{ transform: pose }, { transform: 'none' }], timing),
      // The left board comes in with the cover, so the left page never lands on bare desk.
      play(ui.spread, [{ opacity: 0 }, { opacity: 0, offset: .42 }, { opacity: 1, offset: .72 }, { opacity: 1 }], { ...timing, easing: 'linear', pseudoElement: '::after' }),
    ];
    [...ui.turn.children].forEach((leaf, i) => {
      const flip = { duration: 760, delay: 60 + i * 95, easing: 'cubic-bezier(.45, .05, .25, 1)' };
      parts.push(play(leaf, [
        { transform: `translateZ(${3 - i}px) rotateY(0deg)` },
        { transform: `translateZ(${i + 1}px) rotateY(-180deg)` },
      ], flip));
      leaf.querySelectorAll('.shade').forEach((shade) => {
        parts.push(play(shade, [{ opacity: 0 }, { opacity: 1, offset: .5 }, { opacity: 0 }], flip));
      });
    });
    return parts;
  }

  function loadTurningPage() {
    const page = ui.caseFront.cloneNode(true);
    page.removeAttribute('id');
    page.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    ui.turnPage.replaceChildren(page);
    ui.turn.hidden = false;
    ui.spread.classList.add('turning');
  }

  function endTurn(parts) {
    parts.forEach((a) => a.cancel());
    ui.turn.hidden = true;
    ui.spread.classList.remove('turning');
  }

  async function openBook() {
    showSheet();
    ui.wall.classList.remove('under');
    const pose = narrow() ? null : closedPose();
    if (!pose) {
      ui.wall.classList.add('under');
      await done([play(ui.spread, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 340, easing: GLIDE })]);
      ui.spread.getAnimations().forEach((a) => a.cancel());
      return;
    }
    ui.spread.classList.remove('opened');
    ui.draw.style.visibility = 'hidden';
    loadTurningPage();
    const parts = bookTimeline(pose);
    const wall = play(ui.wall, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease-out' });
    const tray = fadeIn(ui.tray, 320, 760);
    await done(parts);
    ui.spread.classList.add('opened');
    endTurn(parts);
    ui.wall.classList.add('under');
    wall.cancel();
    await done([tray]);
    tray.cancel();
    ui.draw.style.visibility = '';
    if (run().current?.stage === 'open') ui.call.focus({ preventScroll: true });
  }

  async function closeBook() {
    ui.wall.classList.remove('under');
    const pose = narrow() ? null : closedPose();
    if (!pose) {
      await done([play(ui.sheet, [{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'ease-in' })]);
      ui.sheet.hidden = true;
      ui.sheet.getAnimations().forEach((a) => a.cancel());
      return;
    }
    ui.spread.classList.remove('opened');
    ui.draw.style.visibility = 'hidden';
    loadTurningPage();
    const parts = bookTimeline(pose);
    parts.forEach((a) => a.reverse());
    const wall = play(ui.wall, [{ opacity: 0 }, { opacity: 1 }], { duration: 320, delay: 620, easing: 'ease-out' });
    const tray = play(ui.tray, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-out' });
    await done(parts);
    ui.draw.style.visibility = '';
    ui.sheet.hidden = true;
    endTurn(parts);
    tray.cancel();
    await done([wall]);
    wall.cancel();
  }

  // A tube warming up: a bright line opens to fill the glass.
  function powerOn() {
    return play(ui.caseFront, [
      { transform: 'scale(.92, .006)', opacity: 0 },
      { transform: 'scale(1, .012)', opacity: 1, offset: .32 },
      { transform: 'scale(1, 1.012)', opacity: 1, offset: .82 },
      { transform: 'scale(1, 1)', opacity: 1 },
    ], { duration: 460, easing: 'cubic-bezier(.3, .7, .3, 1)' });
  }

  function powerOff() {
    return play(ui.caseFront, [
      { transform: 'scale(1, 1)', opacity: 1 },
      { transform: 'scale(1, .01)', opacity: 1, offset: .62 },
      { transform: 'scale(0, .01)', opacity: 0 },
    ], { duration: 320, easing: 'ease-in' });
  }

  async function hideSheet() {
    ui.cardScreen.hidden = true;
    ui.sheet.classList.remove('carded');
    if (still()) {
      ui.sheet.hidden = true;
      ui.wall.classList.remove('under');
    } else if (state.mode === 'classic') {
      await closeBook();
    } else {
      const off = powerOff();
      await done([off]);
      ui.sheet.hidden = true;
      off.cancel();
    }
    ui.wall.classList.remove('under');
    busy = false;
  }

  function enter(mode) {
    if (busy || state.mode) return;
    state.mode = mode;
    save();
    moveTo(showView);
  }

  function leave() {
    if (busy || !state.mode) return;
    if (run().current) toast('Your entry stays open. It comes back when you return.');
    state.mode = null;
    save();
    moveTo(showView);
  }

  function moveTo(change) {
    if (still() || !document.startViewTransition) {
      change();
      return;
    }
    // A hidden tab skips the transition. The change itself still runs.
    const move = document.startViewTransition(change);
    move.ready.catch(() => {});
    move.finished.catch(() => {});
  }

  function showView() {
    if (state.mode) document.body.dataset.mode = state.mode;
    else delete document.body.dataset.mode;
    ui.home.hidden = !!state.mode;
    ui.wall.hidden = !state.mode;
    ui.sheet.hidden = true;
    ui.wall.classList.remove('under');
    if (!state.mode) {
      for (const [mode, name] of [['classic', 'Classic'], ['arcade', 'Arcade']]) {
        const left = leftIn(mode);
        const unit = mode === 'classic' ? (left === 1 ? 'journal entry' : 'journal entries') : (left === 1 ? 'level' : 'levels');
        $(`meta${name}`).textContent = `${left} ${unit}`;
      }
      return;
    }
    renderWall();
    // A reload returns to the open case, so a reload cannot give a new draw.
    if (run().current) showSheet();
  }

  async function draw() {
    if (!state.mode || busy || run().current) return;
    const pool = remaining();
    if (!pool.length) return;
    busy = true;
    const pick = pool[randomInt(pool.length)];
    // Save the selected entry before its transition, so reloading cannot reroll it.
    run().current = { index: pick, stage: 'open' };
    save();
    if (still()) showSheet();
    else if (state.mode === 'classic') await openBook();
    else await runLevelReel(pool, pick);
    renderWall();
    busy = false;
    // A phone keeps its keyboard closed until the person taps a box.
    if (!narrow()) (state.mode === 'classic' ? ui.call : ui.guess).focus({ preventScroll: true });
  }

  // One long deceleration on a strip of level numbers. The last number is the saved pick.
  async function runLevelReel(pool, pick) {
    const selector = $('levelSelector');
    const strip = $('levelStrip');
    const glass = document.querySelector('.felt').getBoundingClientRect();
    const inset = parseFloat(getComputedStyle(document.querySelector('.felt')).paddingTop);
    Object.assign(selector.style, {
      left: `${glass.left + inset}px`,
      top: `${glass.top + inset}px`,
      width: `${glass.width - inset * 2}px`,
      height: `${glass.height - inset * 2}px`,
    });
    const label = (n) => String(n + 1).padStart(2, '0');
    const numbers = Array.from({ length: 22 }, () => pool[randomInt(pool.length)]);
    strip.replaceChildren(...[...numbers, pick].map((n) => {
      const row = document.createElement('span');
      row.textContent = label(n);
      return row;
    }));
    $('levelStatus').textContent = '';
    selector.classList.remove('selected');
    selector.hidden = false;
    const row = strip.firstElementChild.offsetHeight;
    const appear = fadeIn(selector, 200);
    const spin = play(strip, [{ transform: 'translateY(0)' }, { transform: `translateY(${-row * numbers.length}px)` }], {
      duration: 1900, easing: 'cubic-bezier(.12, .62, .1, 1)',
    });
    await done([spin]);
    $('levelStatus').textContent = 'Level ready';
    selector.classList.add('selected');
    const pop = play($('levelStrip').parentElement, [
      { transform: 'scale(1)' }, { transform: 'scale(1.05)', offset: .4 }, { transform: 'scale(1)' },
    ], { duration: 340, easing: 'ease-out' });
    await done([pop]);
    await new Promise((resolve) => { setTimeout(resolve, 260); });

    showSheet();
    const panel = [ui.arcadeControls, ui.tray].map((el) => fadeIn(el, 260, 80));
    const on = powerOn();
    const off = play(selector, [{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'ease-in' });
    await done([off]);
    selector.hidden = true;
    [appear, spin, pop, off].forEach((a) => a.cancel());
    await done([on, ...panel]);
    [on, ...panel].forEach((a) => a.cancel());
  }

  function finish(result) {
    if (busy || !state.mode || !run().current) return;
    busy = true;
    const { index } = run().current;
    run().spent[index] = result;
    run().current = null;
    save();
    renderWall();
    hideSheet();
  }

  const stageIs = (stage) => !busy && state.mode && run().current?.stage === stage;

  function reject() {
    if (!stageIs('open')) return;
    if (!skipArmed) {
      skipArmed = true;
      toast('A skipped entry does not come back. Press Skip again to confirm.');
      setTimeout(() => { skipArmed = false; }, 3000);
      return;
    }
    skipArmed = false;
    finish('rejected');
  }

  function saveDraft() {
    if (!stageIs('open')) return;
    const classic = state.mode === 'classic';
    run().current.call = (classic ? ui.call : ui.guess).value;
    run().current.why = (classic ? ui.why : ui.guessWhy).value;
    save();
  }

  function lock() {
    if (!stageIs('open')) return;
    saveDraft();
    const classic = state.mode === 'classic';
    const callInput = classic ? ui.call : ui.guess;
    const whyInput = classic ? ui.why : ui.guessWhy;
    if (!callInput.value.trim() || !whyInput.value.trim()) {
      toast(classic ? 'Write your call and your reason first' : 'Write your guess and your reason first');
      (callInput.value.trim() ? whyInput : callInput).focus();
      return;
    }
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    // Arcade goes straight to the answer. Classic moves on to the prompt.
    run().current = { ...run().current, stage: classic ? 'locked' : 'answer', lockedAt: time };
    save();
    document.activeElement?.blur();
    changeStage(renderSheet);
    if (!classic) return;
    ui.stamp.classList.remove('thump');
    void ui.stamp.offsetWidth;
    ui.stamp.classList.add('thump');
  }

  function checkVerdict() {
    if (state.mode !== 'classic' || !(stageIs('locked') || stageIs('card'))) return;
    run().current = { ...run().current, stage: 'verdict' };
    save();
    changeStage(renderSheet);
  }

  function backToPrompt() {
    if (!stageIs('verdict')) return;
    run().current = { ...run().current, stage: 'locked' };
    save();
    changeStage(renderSheet);
  }

  function saveMissed() {
    if (stageIs('verdict')) {
      run().current.missed = ui.verdictText.value;
      save();
    }
  }

  function showCard(result) {
    run().current = { ...run().current, stage: 'card', mark: result };
    save();
    document.activeElement?.blur();
    renderSheet();
    if (!still()) {
      const card = document.querySelector('.verdict-card');
      const tilt = state.mode === 'classic' ? 'rotate(-3deg) ' : '';
      play(card, [{ opacity: 0, transform: 'translateY(18px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: GLIDE })
        .finished.then((a) => a.cancel()).catch(() => {});
      play($('cardVerdict'), [
        { opacity: 0, transform: `${tilt}scale(2)` },
        { opacity: 1, transform: `${tilt}scale(.96)`, offset: .6 },
        { opacity: 1, transform: `${tilt}scale(1)` },
      ], { duration: 340, delay: 340, easing: 'ease-out', fill: 'backwards' }).finished.then((a) => a.cancel()).catch(() => {});
    }
    armIdle();
  }

  function showAnswer() {
    if (state.mode !== 'arcade' || !stageIs('locked')) return;
    run().current = { ...run().current, stage: 'answer' };
    save();
    changeStage(renderSheet);
  }

  function mark(result) {
    if (state.mode === 'arcade' && stageIs('answer')) showCard(result);
    if (state.mode === 'classic' && stageIs('verdict')) {
      saveMissed();
      if (result === 'right') {
        showCard(result);
        return;
      }
      run().current.mark = result;
      save();
      renderSheet();
      ui.verdictText.focus({ preventScroll: true });
    }
  }

  function makeCard() {
    if (!stageIs('verdict') || !run().current.mark) return;
    saveMissed();
    showCard(run().current.mark);
  }

  function closeFile() {
    if (state.mode === 'classic' && ['locked', 'verdict', 'card'].some(stageIs)) finish('closed');
    if (state.mode === 'arcade' && stageIs('card')) finish(run().current.mark === 'right' ? 'got' : 'missed');
  }

  function markCopied() {
    toast('Prompt copied. Paste it into your AI tool.');
    run().current.copied = true;
    save();
    renderSheet();
    if (!still()) {
      play($('copyBtn'), [{ transform: 'scale(.97)' }, { transform: 'scale(1.015)', offset: .6 }, { transform: 'none' }], { duration: 260, easing: 'ease-out' })
        .finished.then((a) => a.cancel()).catch(() => {});
    }
  }

  async function copyPrompt() {
    if (state.mode !== 'classic' || !stageIs('locked')) return;
    try {
      await navigator.clipboard.writeText(ui.prompt.value);
      markCopied();
    } catch {
      ui.prompt.focus();
      ui.prompt.select();
      if (document.execCommand('copy')) markCopied();
      else toast('Copying is blocked here. The prompt is selected, so copy it by hand.');
    }
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
    if (!state.mode || busy) return;
    if (!clearArmed) {
      clearArmed = true;
      toast('Press 0 again to clear the record for this mode');
      setTimeout(() => { clearArmed = false; }, 3000);
      return;
    }
    clearArmed = false;
    state[state.mode] = { spent: {}, current: null };
    save();
    showView();
  }

  addEventListener('keydown', (e) => {
    const typing = e.target.matches?.('textarea:not([readonly]), input');
    if (typing) {
      if (e.key === 'Enter' && !e.shiftKey) {
        const send = e.metaKey || e.ctrlKey;
        const next = { call: ui.why, guess: ui.guessWhy }[e.target.id];
        if (send || next || e.target === ui.guessWhy || e.target === ui.verdictText) e.preventDefault();
        if (send || e.target === ui.guessWhy) lock();
        if (send || e.target === ui.verdictText) makeCard();
        if (!send) next?.focus();
      }
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const key = e.key.toLowerCase();
    if (key === ' ') {
      e.preventDefault();
      if (state.mode === 'arcade' && stageIs('card')) closeFile();
      else draw();
    } else if (key === 'escape') {
      leave();
    } else if (key === 'enter') {
      if (e.target.closest?.('button, a')) return;
      lock();
      makeCard();
    } else if (key === '1') enter('classic');
    else if (key === '2') enter('arcade');
    else if (key === 'g') lock();
    else if (key === 'x') reject();
    else if (key === 's') showAnswer();
    else if (key in KEY_MARKS) {
      // The next box takes focus here, so the key must not type into it.
      e.preventDefault();
      mark(KEY_MARKS[key]);
    }
    else if (key === 'b') backToPrompt();
    else if (key === 'c') closeFile();
    else if (key === 'p') copyPrompt();
    else if (key === 'v') checkVerdict();
    else if (key === '0') clearRecord();
    else if (key === 'f') {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    }
  });

  $('pickClassic').addEventListener('click', () => enter('classic'));
  $('pickArcade').addEventListener('click', () => enter('arcade'));
  $('back').addEventListener('click', leave);
  ui.draw.addEventListener('click', draw);
  ui.call.addEventListener('input', saveDraft);
  ui.why.addEventListener('input', saveDraft);
  ui.guess.addEventListener('input', saveDraft);
  ui.guessWhy.addEventListener('input', saveDraft);
  $('copyBtn').addEventListener('click', copyPrompt);
  ui.verdictText.addEventListener('input', saveMissed);
  ui.choices.forEach((b) => b.addEventListener('click', () => mark(b.dataset.mark)));

  addEventListener('resize', () => {
    if (state.mode && run().current && !ui.sheet.hidden) fitQuestion();
  });
  document.fonts.ready.then(() => {
    if (state.mode && run().current && !ui.sheet.hidden) fitQuestion();
  });

  // The pointer hides when idle, so it does not show on camera.
  let idleTimer;
  function armIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => document.body.classList.add('idle'), 2500);
  }
  addEventListener('pointermove', () => {
    document.body.classList.remove('idle');
    armIdle();
  });

  showView();
})();
