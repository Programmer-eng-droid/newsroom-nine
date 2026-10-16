(() => {
  'use strict';

  /* ---------- Configuration ---------- */
  const TRACKS = {
    learner: { label: 'Learner', blurb: 'Hints, a coach note after every step and a roomier clock.', budget: 12, mpu: 8, hints: true },
    pro: { label: 'Professional', blurb: 'Tighter clock, no hints. Full explanation only at the end.', budget: 9, mpu: 10, hints: false }
  };
  const MEDIUMS = {
    print: { label: 'Print', deadline: 'print deadline' },
    tv: { label: 'TV', deadline: '18:00 bulletin' },
    radio: { label: 'Radio', deadline: '18:00 news' },
    online: { label: 'Online / social', deadline: '18:00 publishing slot' }
  };
  const ROLES = {
    reporter: { label: 'Reporter', frame: 'You found this on your phone and the desk wants to know whether it is a story.' },
    sub: { label: 'Sub-editor', frame: 'Copy built on this photo has landed on your screen. You must clear it or stop it.' },
    editor: { label: 'News editor', frame: 'You decide what goes out, and your name is on the decision.' },
    producer: { label: 'Producer', frame: 'The presenter is waiting for a line for the running order.' },
    social: { label: 'Social media editor', frame: 'The photo is spreading in your replies and DMs, and followers expect a response.' }
  };
  const SKILLS = [
    { key: 'access', label: 'Access: sourcing', weight: 25 },
    { key: 'analyse', label: 'Analyse: weighing evidence', weight: 25 },
    { key: 'reflect', label: 'Reflect: checking bias', weight: 10 },
    { key: 'create', label: 'Create: the line you write', weight: 20 },
    { key: 'act', label: 'Act: the decision', weight: 20 }
  ];
  const STEPS = ['Setup', 'Access', 'Analyse', 'Reflect', 'Create', 'Act', 'Debrief'];
  const RATINGS = [
    { id: 'none', label: 'Proves nothing' },
    { id: 'suggests', label: 'Suggests something' },
    { id: 'proves', label: 'Strong evidence' }
  ];

  /* ---------- State ---------- */
  const app = document.querySelector('#app');
  const state = fresh();
  let casesList = [];
  let offlineReady = false;

  function fresh() {
    return { track: 'learner', medium: 'radio', role: 'editor', caseFile: null, case: null,
      spent: 0, ran: [], ratings: {}, picks: {} };
  }
  function reset() {
    const keep = { track: state.track, medium: state.medium, role: state.role, caseFile: state.caseFile };
    Object.assign(state, fresh(), keep);
  }

  /* ---------- Small helpers ---------- */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(typeof kid === 'object' && kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  function show(nodes, keepScroll) {
    const y = window.scrollY;
    app.replaceChildren(...nodes);
    if (keepScroll) window.scrollTo(0, y);
    else { window.scrollTo(0, 0); try { app.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }
  function store(key, val) { try { localStorage.setItem('newsroomnine:' + key, JSON.stringify(val)); } catch (e) { /* storage unavailable */ } }
  function recall(key) { try { return JSON.parse(localStorage.getItem('newsroomnine:' + key)); } catch (e) { return null; } }
  const byId = (id) => state.case.checks.find((k) => k.id === id);
  const track = () => TRACKS[state.track];

  function stepper(i) {
    return h('ol', { class: 'steps', 'aria-label': 'Progress' },
      STEPS.map((s, n) => h('li', { class: n === i ? 'active' : n < i ? 'past' : '' }, s)));
  }
  function clock() {
    const t = track();
    const left = (t.budget - state.spent) * t.mpu;
    const pct = Math.max(0, ((t.budget - state.spent) / t.budget) * 100);
    return h('div', { class: 'clock', role: 'status' },
      h('div', { class: 'clock-row' }, h('strong', {}, left + ' min'), h('span', {}, 'until the ' + MEDIUMS[state.medium].deadline)),
      h('div', { class: 'meter' }, h('div', { class: 'meter-fill', style: 'width:' + pct + '%' })));
  }
  function claimCard() {
    const c = state.case;
    return h('div', { class: 'card claim' },
      h('p', { class: 'kicker' }, 'The claim'),
      h('blockquote', {}, c.claim),
      h('p', { class: 'muted' }, c.claimSource),
      photo());
  }
  function photo() {
    const wrap = document.createElement('figure');
    wrap.innerHTML = '<svg viewBox="0 0 400 180" role="img" aria-label="Illustration of a broken bridge over a flooded river">' +
      '<rect width="400" height="180" fill="#9fb4c7"/><rect y="110" width="400" height="70" fill="#5b7a8c"/>' +
      '<rect x="0" y="86" width="150" height="14" fill="#444"/><rect x="250" y="100" width="150" height="14" fill="#444" transform="rotate(8 250 100)"/>' +
      '<rect x="40" y="100" width="12" height="40" fill="#555"/><rect x="330" y="112" width="12" height="40" fill="#555"/></svg>' +
      '<figcaption>Illustration standing in for the viral photo.</figcaption>';
    return wrap;
  }
  function choiceGroup(legend, name, options, current, onChange) {
    const labels = [];
    const set = h('fieldset', { class: 'group' }, h('legend', {}, legend),
      h('div', { class: 'opts' }, options.map((o) => {
        const input = h('input', { type: 'radio', name, value: o.id, checked: o.id === current });
        const label = h('label', { class: o.id === current ? 'selected' : '' }, input,
          h('span', {}, h('span', { class: 't' }, o.label), o.sub ? h('span', { class: 's' }, o.sub) : null));
        labels.push(label);
        input.addEventListener('change', () => {
          labels.forEach((l) => l.classList.remove('selected'));
          label.classList.add('selected');
          onChange(o.id);
        });
        return label;
      })));
    return set;
  }

  /* ---------- Scoring ---------- */
  const proofCount = () => state.case.checks.filter((k) => state.ran.includes(k.id) && k.strength === 'proves').length;
  const isSolid = () => proofCount() >= state.case.proofNeeded;
  function pts(opt) {
    return typeof opt.points === 'number' ? opt.points : (isSolid() ? opt.points.solid : opt.points.thin);
  }
  function chosen(key) { return state.case[key].options.find((o) => o.id === state.picks[key]); }
  function best(key) {
    return state.case[key].options.reduce((a, b) => (pts(b) > pts(a) ? b : a));
  }
  function computeScores() {
    const c = state.case;
    const ran = c.checks.filter((k) => state.ran.includes(k.id));
    const essentials = c.checks.filter((k) => k.essential);
    const gotEss = essentials.filter((k) => state.ran.includes(k.id)).length;
    const spentCost = ran.reduce((a, k) => a + k.cost, 0);
    const wasted = ran.filter((k) => k.lowValue).reduce((a, k) => a + k.cost, 0);
    const access = Math.round(70 * (gotEss / essentials.length) + 30 * (spentCost ? 1 - wasted / spentCost : 0));

    const order = RATINGS.map((r) => r.id);
    const sum = ran.reduce((a, k) => {
      const d = Math.abs(order.indexOf(state.ratings[k.id]) - order.indexOf(k.strength));
      return a + (d === 0 ? 1 : d === 1 ? 0.5 : 0);
    }, 0);
    const analyse = ran.length ? Math.round((sum / ran.length) * 100) : 0;

    const scores = { access, analyse,
      reflect: pts(chosen('reflect')), create: pts(chosen('create')), act: pts(chosen('act')) };
    const total = Math.round(SKILLS.reduce((a, s) => a + scores[s.key] * s.weight, 0) / 100);
    return { scores, total };
  }
  function grade(n) { return n < 40 ? 'Needs work' : n < 70 ? 'Getting there' : n < 90 ? 'Solid' : 'Desk-ready'; }

  /* ---------- Flow helpers ---------- */
  function afterStep(title, nodes, next) {
    if (track().hints && nodes) {
      show([h('p', { class: 'kicker' }, 'Coach note'), h('h1', {}, title),
        h('div', { class: 'card' }, nodes),
        h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: next }, 'Continue'))]);
    } else next();
  }

  /* ---------- Screens ---------- */
  function renderSetup() {
    const caseOpts = casesList.map((c) => ({ id: c.file, label: c.title, sub: c.blurb }));
    const nodes = [
      stepper(0),
      h('h1', {}, 'Newsroom Nine'),
      h('p', { class: 'tagline' }, 'Nine minutes. One claim. Your call.'),
      h('p', {}, 'A viral claim has landed on your desk. You have a clock, a limited number of checks and a decision to make. Play it through, then read your debrief.'),
      caseOpts.length > 1 ? choiceGroup('Case', 'case', caseOpts, state.caseFile, (v) => { state.caseFile = v; }) : null,
      choiceGroup('Track', 'track', Object.entries(TRACKS).map(([id, t]) => ({ id, label: t.label, sub: t.blurb })), state.track, (v) => { state.track = v; }),
      choiceGroup('Your medium', 'medium', Object.entries(MEDIUMS).map(([id, m]) => ({ id, label: m.label })), state.medium, (v) => { state.medium = v; }),
      choiceGroup('Your role', 'role', Object.entries(ROLES).map(([id, r]) => ({ id, label: r.label })), state.role, (v) => { state.role = v; }),
      h('p', { class: 'muted' }, 'Your medium and role change the framing. They do not change the scoring.')
    ];
    const best = recall('best');
    if (best) nodes.push(h('p', { class: 'muted' }, 'Your best score on this device: ' + best.total + ' (' + grade(best.total) + ').'));
    nodes.push(h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: startCase }, 'Open the case')));
    show(nodes);
  }

  async function startCase() {
    try {
      const res = await fetch('cases/' + state.caseFile);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      state.case = await res.json();
      state.spent = 0; state.ran = []; state.ratings = {}; state.picks = {};
      renderBriefing();
    } catch (err) {
      show([h('div', { class: 'card' }, h('h2', {}, 'Could not load the case'),
        h('p', {}, 'Check your connection and try again. If you opened this file straight from a folder, it needs to be served from a web address (see the README).'),
        h('button', { class: 'btn', onclick: renderSetup }, 'Back'))]);
    }
  }

  function renderBriefing() {
    const c = state.case;
    show([
      stepper(1),
      h('p', { class: 'kicker' }, c.title + ' · ' + ROLES[state.role].label + ' · ' + MEDIUMS[state.medium].label),
      h('h1', {}, 'Briefing'),
      claimCard(),
      h('p', {}, ROLES[state.role].frame + ' ' + c.mediumNotes[state.medium]),
      h('p', {}, c.briefing),
      h('p', { class: 'muted' }, 'This case is fictional.'),
      h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: renderAccess }, 'Start checking'))
    ]);
  }

  function renderAccess(evt) {
    const c = state.case, t = track();
    const left = t.budget - state.spent;
    const cards = c.checks.map((k) => {
      const done = state.ran.includes(k.id);
      const cant = !done && k.cost * 1 > left;
      return h('div', { class: 'card' + (done ? ' done' : '') },
        h('div', { class: 'row' }, h('h3', {}, k.label), h('span', { class: 'cost' }, k.cost * t.mpu + ' min')),
        h('p', { class: 'muted' }, k.desc),
        t.hints && !done && k.hint ? h('p', { class: 'hint' }, 'Hint: ' + k.hint) : null,
        done ? h('div', { class: 'result' }, h('strong', {}, 'Result: '), k.result) : null,
        h('button', { class: 'btn', disabled: done || cant, onclick: () => { state.ran.push(k.id); state.spent += k.cost; renderAccess(true); } },
          done ? 'Done' : cant ? 'Not enough time' : 'Run check'));
    });
    show([
      stepper(1),
      h('p', { class: 'kicker' }, 'Step 1: Access'),
      h('h1', {}, 'Find and secure evidence'),
      h('p', {}, 'Every check costs time you cannot get back. Results appear on each card. Run the checks you think will tell you the most.'),
      clock(),
      ...cards,
      h('div', { class: 'actions' },
        h('button', { class: 'btn primary', disabled: state.ran.length === 0, onclick: finishAccess }, 'Move to analysis'))
    ], evt === true);
  }

  function finishAccess() {
    const c = state.case;
    const skipped = c.checks.filter((k) => k.essential && !state.ran.includes(k.id));
    const nodes = [
      h('p', {}, 'You ran ' + state.ran.length + ' check' + (state.ran.length === 1 ? '' : 's') + ' and used ' + state.spent * track().mpu + ' of ' + track().budget * track().mpu + ' minutes.'),
      skipped.length
        ? h('p', {}, h('span', { class: 'warnb' }, 'You skipped: '), skipped.map((k) => k.label).join('; ') + '. Those would have given you the strongest, most checkable evidence.')
        : h('p', { class: 'good' }, 'You covered the key checks.')
    ];
    afterStep('Access', nodes, renderAnalyse);
  }

  function renderAnalyse() {
    const c = state.case;
    const ran = c.checks.filter((k) => state.ran.includes(k.id));
    const next = h('button', { class: 'btn primary', disabled: true, onclick: finishAnalyse }, 'Lock in my ratings');
    const sync = () => { next.disabled = !ran.every((k) => state.ratings[k.id]); };
    const cards = ran.map((k) => h('div', { class: 'card' },
      h('h3', {}, k.label), h('div', { class: 'result' }, k.result),
      choiceGroup('What does this actually prove?', 'rate-' + k.id, RATINGS, state.ratings[k.id], (v) => { state.ratings[k.id] = v; sync(); })));
    sync();
    show([
      stepper(2),
      h('p', { class: 'kicker' }, 'Step 2: Analyse'),
      h('h1', {}, 'Weigh the evidence'),
      h('p', {}, 'Not every finding is worth the same. Rate how much each one really proves about the claim.'),
      ...cards,
      h('div', { class: 'actions' }, next)
    ]);
  }

  function finishAnalyse() {
    const ran = state.case.checks.filter((k) => state.ran.includes(k.id));
    const nodes = ran.map((k) => {
      const mine = state.ratings[k.id];
      const ok = mine === k.strength;
      return h('p', {}, h('strong', {}, k.label + ': '),
        h('span', { class: ok ? 'good' : 'warnb' }, ok ? 'Good call. ' : 'Reconsider. '),
        k.why);
    });
    afterStep('Analyse', nodes, renderReflect);
  }

  function choiceStep(stepIdx, kicker, key, nextScreen) {
    const cfg = state.case[key];
    const btn = h('button', { class: 'btn primary', disabled: !state.picks[key], onclick: () => {
      const o = chosen(key);
      const nodes = [h('p', {}, h('strong', {}, 'You chose: '), o.label), h('p', {}, o.explain)];
      const b = best(key);
      if (b.id !== o.id) nodes.push(h('p', {}, h('strong', {}, 'Strongest choice given your evidence: '), b.label));
      afterStep(cfg.title, nodes, nextScreen);
    } }, 'Continue');
    show([
      stepper(stepIdx),
      h('p', { class: 'kicker' }, kicker),
      h('h1', {}, cfg.title),
      stepIdx >= 4 ? h('p', { class: 'muted' }, 'You are holding ' + proofCount() + ' piece' + (proofCount() === 1 ? '' : 's') + ' of strong evidence.') : null,
      h('p', {}, cfg.prompt),
      choiceGroup('Choose one', 'pick-' + key,
        cfg.options.map((o) => ({ id: o.id, label: o.label })), state.picks[key], (v) => { state.picks[key] = v; btn.disabled = false; }),
      h('div', { class: 'actions' }, btn)
    ]);
  }
  const renderReflect = () => choiceStep(3, 'Step 3: Reflect', 'reflect', renderCreate);
  const renderCreate = () => choiceStep(4, 'Step 4: Create', 'create', renderAct);
  const renderAct = () => choiceStep(5, 'Step 5: Act', 'act', renderDebrief);

  function renderDebrief() {
    const c = state.case;
    const { scores, total } = computeScores();
    const prev = recall('best');
    if (!prev || total > prev.total) store('best', { total, date: new Date().toISOString().slice(0, 10) });

    const missed = c.checks.filter((k) => !state.ran.includes(k.id) && (k.essential || k.strength === 'proves'));
    const bars = SKILLS.map((s) => h('div', { class: 'bar' },
      h('div', { class: 'bar-top' }, h('span', {}, s.label), h('strong', {}, scores[s.key] + '%')),
      h('div', { class: 'bar-track' }, h('div', { class: 'bar-fill', style: 'width:' + scores[s.key] + '%' }))));

    const decisions = ['reflect', 'create', 'act'].map((key) => {
      const o = chosen(key), b = best(key);
      const notes = [];
      if (typeof o.points !== 'number') {
        if (!isSolid() && o.points.solid > o.points.thin) notes.push('You went further than the evidence you held.');
        if (isSolid() && o.points.thin > o.points.solid) notes.push('You were more cautious than your evidence required.');
      }
      return h('div', { class: 'card' }, h('h3', {}, state.case[key].title),
        h('p', {}, h('strong', {}, 'You chose: '), o.label), h('p', {}, o.explain),
        notes.map((n) => h('p', { class: 'warnb' }, n)),
        b.id !== o.id ? h('p', {}, h('strong', {}, 'Strongest choice: '), b.label) : null);
    });

    const analyseNotes = c.checks.filter((k) => state.ran.includes(k.id)).map((k) => {
      const ok = state.ratings[k.id] === k.strength;
      const mine = RATINGS.find((r) => r.id === state.ratings[k.id]).label;
      const right = RATINGS.find((r) => r.id === k.strength).label;
      return h('li', {}, h('strong', {}, k.label + ': '), 'you rated it “' + mine + '”. ',
        ok ? h('span', { class: 'good' }, 'Right. ') : h('span', { class: 'warnb' }, 'Better: “' + right + '”. '), k.why);
    });

    show([
      stepper(6),
      h('p', { class: 'kicker' }, 'Debrief'),
      h('h1', {}, 'How you did'),
      h('div', { class: 'card' },
        h('div', { class: 'score-big' }, total),
        h('p', {}, h('strong', {}, grade(total)), ' · Verification score out of 100'),
        ...bars),
      h('h2', {}, 'What you missed'),
      missed.length
        ? h('div', { class: 'card' }, h('ul', { class: 'plain' }, missed.map((k) => h('li', {}, h('strong', {}, k.label + ': '), k.result))))
        : h('div', { class: 'card' }, h('p', { class: 'good' }, 'You ran every high-value check.')),
      h('h2', {}, 'How you weighed the evidence'),
      h('div', { class: 'card' }, h('ul', { class: 'plain' }, analyseNotes)),
      h('h2', {}, 'Your decisions'),
      ...decisions,
      h('h2', {}, 'Tells in this rumour'),
      h('div', { class: 'card' }, h('ul', { class: 'plain' }, c.tells.map((t) => h('li', {}, t)))),
      h('h2', {}, 'Tools to try'),
      h('div', { class: 'card' }, h('ul', { class: 'plain' }, c.tools.map((t) =>
        h('li', {}, t.url ? h('a', { href: t.url, target: '_blank', rel: 'noopener' }, t.name) : h('strong', {}, t.name), ': ' + t.use)))),
      h('div', { class: 'actions' },
        h('button', { class: 'btn primary', onclick: () => { reset(); renderSetup(); } }, 'Play again'),
        h('button', { class: 'btn', onclick: () => renderCertificate(total) }, 'Get a certificate'))
    ]);
  }

  function renderCertificate(total) {
    const saved = recall('name') || '';
    const nameEl = h('span', { class: 'name' }, saved || ' ');
    const input = h('input', { type: 'text', value: saved, placeholder: 'Type your name', 'aria-label': 'Your name', maxlength: '60' });
    input.addEventListener('input', () => { nameEl.textContent = input.value.trim() || ' '; store('name', input.value.trim()); });
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    show([
      h('div', { class: 'no-print' }, h('h1', {}, 'Your certificate'), h('p', {}, 'Type your name, then print or save it as a PDF.'), input),
      h('div', { class: 'cert' },
        h('p', { class: 'kicker' }, 'Certificate of participation'),
        h('h1', {}, 'Newsroom Nine'),
        h('p', {}, 'This certifies that'),
        h('p', {}, nameEl),
        h('p', {}, 'completed the verification exercise “' + state.case.title + '” with a score of ' + total + '/100 (' + grade(total) + ').'),
        h('p', { class: 'muted' }, date + ' · Practice exercise, not an accredited qualification.')),
      h('div', { class: 'actions' },
        h('button', { class: 'btn primary', onclick: () => window.print() }, 'Print or save as PDF'),
        h('button', { class: 'btn', onclick: renderDebrief }, 'Back to debrief'))
    ]);
  }

  /* ---------- Install + offline ---------- */
  function setStatus() {
    const s = document.querySelector('#status');
    if (!navigator.onLine) { s.textContent = 'Offline'; s.className = 'pill off'; }
    else if (offlineReady) { s.textContent = 'Works offline'; s.className = 'pill ok'; }
    else { s.textContent = ''; s.className = ''; }
  }
  window.addEventListener('online', setStatus);
  window.addEventListener('offline', setStatus);

  let deferredPrompt = null;
  const installBtn = document.querySelector('#install');
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; installBtn.hidden = false; });
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch (e) { /* ignore */ }
    deferredPrompt = null; installBtn.hidden = true;
  });
  window.addEventListener('appinstalled', () => { installBtn.hidden = true; });
  if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone) {
    document.querySelector('#ios-tip').hidden = false;
  }

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then(() => { offlineReady = true; setStatus(); })
      .catch(() => { /* app still works online */ });
  }

  /* ---------- Boot ---------- */
  async function boot() {
    setStatus();
    try {
      const res = await fetch('cases/index.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      casesList = (await res.json()).cases;
      state.caseFile = casesList[0].file;
      renderSetup();
    } catch (err) {
      show([h('div', { class: 'card' }, h('h2', {}, 'Could not start'),
        h('p', {}, 'The case list did not load. Check your connection, or see the README if you opened the file straight from a folder.'),
        h('button', { class: 'btn', onclick: () => location.reload() }, 'Try again'))]);
    }
  }
  boot();
})();
