// Screens and state for Next Script. Everything is stored on this device.
(function () {
  const { RULES } = NS;
  const KEY = 'next-script-v1';
  const $app = document.getElementById('app');
  const $tabs = document.getElementById('tabs');

  const STAGE_NAMES = { system: 'System', direction: 'Direction', skill: 'Skill', wildcard: 'Wildcard' };

  const SCRIPT_FOCUS = {
    forget: {
      why: 'The app or your check-in slipped out of mind.',
      title: 'Next Script stays on my radar',
      angle: 'Tie the app to things you already do. Finishing a listen cues the tap, and seeing the calendar check-in makes opening the app the automatic next step.',
    },
    lapse: {
      why: 'The listening itself dropped below half the days.',
      title: 'Listening is the easy part of my day',
      angle: 'Attach the listen to a fixed cue, like getting into bed. Make pressing play feel effortless and slightly pleasant, with no decision involved.',
    },
    bored: {
      why: 'The system has started to feel flat.',
      title: 'Coming back to this feels good',
      angle: 'Build curiosity about what each month changes. Link the system to the feeling of progress rather than discipline, and let each new month feel like a fresh start.',
    },
    switch: {
      why: 'Part of you wants to swap this for something shinier.',
      title: 'New ideas get parked, and parking feels good',
      angle: 'Each time a shiny idea or better system appears, you park it, feel relief that it is safe, and return to this month with your attention intact.',
    },
    doubt: {
      why: 'You are not convinced you will still be using this in three months.',
      title: 'I am someone who sticks with this',
      angle: 'Install the identity. You are the person who comes back, including after a gap. A missed week means you return, not that it is over.',
    },
    notice: {
      why: 'You have no direction yet, and ideas are not coming on demand.',
      title: 'I start noticing options',
      angle: 'Ask your subconscious to surface paths you have not considered. Options catch your eye during the day, feel interesting, and get written down. No need to decide yet.',
    },
    clarify: {
      why: 'There is a direction, but it is too fuzzy to build skills towards.',
      title: 'My direction comes into focus',
      angle: 'Let the options you have noticed sort themselves. One keeps pulling you back, and a clear one-sentence version of it arrives without forcing.',
    },
    realign: {
      why: 'The direction you have no longer feels right.',
      title: 'I can feel where I actually want to go',
      angle: 'Get honest signals about what draws you and what you are only continuing out of habit. Changing course feels clean, not like failing.',
    },
    levelUp: {
      why: 'Where you are heading is not a real level above where you are now.',
      title: 'My standards rise',
      angle: 'Make your current level feel like the floor. Wanting more feels normal and allowed, and you start noticing what the next level up looks like and how people get there.',
    },
  };

  const SYSTEM_QUESTIONS = [
    { id: 'forget', q: 'This month, did you forget this app existed?', options: ['No', 'For a few days', 'For a week or more'] },
    { id: 'bored', q: 'Opening this app right now feels…', options: ['Fine or interesting', 'A bit flat', 'Like a chore'] },
    { id: 'switch', q: 'Do you want to swap this for a different system, or rebuild it?', options: ['No', 'A little', 'Yes, I have a better idea'] },
    { id: 'doubt', q: 'Honest bet: will you still be using this in three months?', options: ['Yes', 'Not sure', 'Probably not'] },
  ];

  const DIRECTION_QUESTIONS = [
    { id: 'fit', q: 'Does that direction still feel like yours?', options: ['Yes', 'It is drifting', 'No, I want to pivot'] },
    {
      id: 'level',
      q: 'Is it a real level above your life now?',
      hint: 'If work is going fine but you can only afford Maccas and an okay restaurant once in a while, the answer is no.',
      options: ['Yes, clearly', 'Not sure', 'No, I have outgrown this target'],
    },
  ];

  const RATING_ROWS = [
    { id: 'fit', label: 'Moves me towards my direction' },
    { id: 'block', label: 'Lacking it is holding me back now' },
    { id: 'excite', label: 'Excited to listen for a month' },
  ];

  const CLOSING_LINE = 'Each time you finish listening, you reach for your phone and tap Next Script. And when your check-in appears on your calendar, you open the app, easily and automatically, curious about what comes next.';

  function emptyState() {
    return { onboarded: false, lastOpen: null, direction: null, ideas: [], cycles: [], check: null };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState();
    } catch (e) {
      return emptyState();
    }
  }

  let state = load();
  const ui = { tab: 'today', toast: null, away: 0, offOpen: false, captureKind: 'hypno' };

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      ui.toast = 'Could not save on this device. Use Backup in the You tab.';
    }
  }

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const prettyDate = (s) => new Date(`${s}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const current = () => state.cycles.find((c) => !c.closedOn) || null;
  const lastClosed = () => [...state.cycles].reverse().find((c) => c.closedOn) || null;
  const byId = (id) => document.getElementById(id);
  const badge = (stage) => `<span class="badge ${esc(stage)}">${esc(STAGE_NAMES[stage] || stage)}</span>`;

  function calendarUrl(cycle) {
    const day = (s) => s.replace(/-/g, '');
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: 'Next Script check-in',
      dates: `${day(cycle.endOn)}/${day(NS.addDays(cycle.endOn, 1))}`,
      details: `Open Next Script and run your check: ${location.origin}${location.pathname}`,
    });
    return `https://calendar.google.com/calendar/render?${params}`;
  }

  // ---- Screens ----

  function onboardingView() {
    return `<div class="stack">
      <h1>Next Script</h1>
      <p>Each month this picks one thing to hypnotise yourself on, then gets out of your way.</p>
      <div class="card stack-sm">
        <p><strong>1. System.</strong> Are you still using this? If not, this month's script fixes that.</p>
        <p><strong>2. Direction.</strong> Do you know where you're heading, and is it a level up? If not, that's the script.</p>
        <p><strong>3. Skill.</strong> Both are solid, so your skill ideas get ranked and the best one wins. This is where you'll spend most of your time.</p>
      </div>
      <div class="card stack-sm">
        <p><strong>Random ideas are welcome.</strong> Park them in seconds. After 14 days, the ones still exciting can win a wildcard month, which you earn every 3 completed months.</p>
      </div>
      <button class="btn primary" data-act="begin">Start</button>
    </div>`;
  }

  function captureCard() {
    const system = ui.captureKind === 'system';
    return `<div class="card stack-sm">
      <label for="capture">${system ? 'A better system? Park it here.' : 'Random idea? Park it here.'}</label>
      <div class="row">
        <input id="capture" type="text" class="grow" autocomplete="off" placeholder="${system ? 'What is the better system?' : 'e.g. being more charismatic'}">
        <button class="btn primary small-btn" data-act="capture">Park</button>
      </div>
      ${ui.toast ? `<p class="ok-line" role="status">${esc(ui.toast)}</p>` : ''}
    </div>`;
  }

  function offCard() {
    if (!ui.offOpen) return '<button class="link" data-act="off-toggle">Something feels off?</button>';
    return `<div class="card stack-sm">
      <h3>What's going on?</h3>
      <button class="btn choice" data-act="signal" data-type="bored">I'm bored of this</button>
      <button class="btn choice" data-act="signal" data-type="forgot">I forgot about it for a while</button>
      <button class="btn choice" data-act="off-better" data-kind="hypno">I've got a better script idea</button>
      <button class="btn choice" data-act="off-better" data-kind="system">I've got a better system</button>
      <button class="btn choice" data-act="start-check">Run my check now</button>
      <button class="link" data-act="off-toggle">Never mind</button>
    </div>`;
  }

  function writingView(c) {
    const waited = NS.daysBetween(c.createdOn, NS.today());
    return `<div class="stack">
      <div class="stack-sm">
        <div>${badge(c.stage)}</div>
        <h1>${esc(c.title)}</h1>
      </div>
      ${c.why ? `<p class="muted">${esc(c.why)}</p>` : ''}
      ${waited >= RULES.writingNudgeDays ? `<div class="card notice"><p>${plural(waited, 'day')} in. A rough draft is fine: the idea matters more than the wording, so write it badly in ten minutes and hit record.</p></div>` : ''}
      ${c.angle ? `<div class="card stack-sm"><h3>An angle for the script</h3><p>${esc(c.angle)}</p></div>` : ''}
      <div class="card stack-sm">
        <h3>Add this near the end of the script</h3>
        <blockquote>${esc(CLOSING_LINE)}</blockquote>
        <p class="small muted">This is what keeps the system alive between check-ins. Reword it however you like.</p>
        <button class="btn small-btn" data-act="copy-line">Copy</button>
      </div>
      <button class="btn primary" data-act="start-month">Script's ready, start my ${RULES.monthDays} days</button>
      ${captureCard()}
      <button class="link" data-act="start-check">Not feeling this one? Run my check again</button>
    </div>`;
  }

  function runningView(c) {
    const on = NS.today();
    const day = Math.min(NS.daysBetween(c.startOn, on) + 1, RULES.monthDays);
    const finished = on > c.endOn;
    const listened = (c.listens || []).includes(on);
    const ev = NS.evidence(c, on);
    const lastListen = [...(c.listens || [])].sort().pop();
    const quiet = NS.daysBetween(lastListen || c.startOn, on);
    const dots = Array.from({ length: RULES.monthDays }, (_, i) => {
      const d = NS.addDays(c.startOn, i);
      const cls = [(c.listens || []).includes(d) ? 'on' : '', d === on ? 'today' : '', d > on ? 'future' : ''].join(' ');
      return `<div class="dot ${cls}"></div>`;
    }).join('');

    let banner = '';
    if (finished) {
      banner = `<div class="card notice stack-sm"><h2>Your month is up</h2><p>Time to find out what comes next. It takes about a minute.</p><button class="btn primary" data-act="start-check">Run my check</button></div>`;
    } else if (ui.away) {
      banner = `<div class="card notice stack-sm"><p><strong>Welcome back.</strong> You were away for ${plural(ui.away, 'day')}. You came back, and that's the part that counts. It'll feed into your next check.</p><button class="btn" data-act="start-check">Run my check now</button></div>`;
    } else if (quiet >= RULES.driftDays) {
      banner = `<div class="card notice stack-sm"><p>It's been ${plural(quiet, 'day')} since your last listen. Nothing's broken. Listen today, or run your check if this month has stopped working.</p><button class="btn" data-act="start-check">Run my check now</button></div>`;
    }

    return `<div class="stack">
      <div class="stack-sm">
        <div class="row between">${badge(c.stage)}<span class="small muted">${finished ? 'Finished' : `Day ${day} of ${RULES.monthDays}`}</span></div>
        <h1>${esc(c.title)}</h1>
      </div>
      ${banner}
      ${finished ? '' : `<button class="listen ${listened ? 'done' : ''}" data-act="listen" aria-pressed="${listened}">${listened ? 'Listened today ✓' : 'I listened'}</button>`}
      <div class="card stack-sm">
        <div class="dots" aria-hidden="true">${dots}</div>
        <p class="small muted">${plural(ev.listens, 'listen')} so far. A missed day is fine.</p>
      </div>
      ${captureCard()}
      ${finished ? '' : `<a class="btn" href="${esc(calendarUrl(c))}" target="_blank" rel="noopener">Add my check-in to Google Calendar</a>`}
      ${offCard()}
    </div>`;
  }

  function todayView() {
    const c = current();
    if (!c) {
      return `<div class="stack">
        <h1>Nothing running</h1>
        <p class="muted">Run your check and it'll tell you what this month's script should be.</p>
        <button class="btn primary" data-act="start-check">Run my check</button>
        ${captureCard()}
      </div>`;
    }
    return c.startOn ? runningView(c) : writingView(c);
  }

  function ideaRow(idea) {
    const on = NS.today();
    let actions = '';
    let meta = '';
    if (idea.list === 'parked') {
      const left = RULES.coolOffDays - NS.daysBetween(idea.createdOn, on);
      meta = left > 0 ? `Cooling off, ${plural(left, 'day')} left` : 'Ready for your next check';
      if (idea.kind === 'hypno') actions += `<button class="btn small-btn" data-act="promote" data-id="${esc(idea.id)}">Serves my direction</button>`;
    }
    return `<div class="item stack-sm">
      <p>${esc(idea.title)}</p>
      ${meta ? `<p class="small muted">${esc(meta)}</p>` : ''}
      <div class="row">${actions}<button class="btn small-btn" data-act="bin" data-id="${esc(idea.id)}" aria-label="Remove ${esc(idea.title)}">Remove</button></div>
    </div>`;
  }

  function ideasView() {
    const list = (name, kind) => state.ideas.filter((i) => i.list === name && (!kind || i.kind === kind));
    const skill = list('skill');
    const parked = list('parked', 'hypno');
    const systems = list('parked', 'system');
    const upgrades = list('upgrade');
    const group = (title, items, empty) => `<div class="stack-sm section">
      <h3>${esc(title)}</h3>
      <div class="card">${items.length ? items.map(ideaRow).join('') : `<p class="small muted">${esc(empty)}</p>`}</div>
    </div>`;
    return `<div class="stack">
      <h1>Ideas</h1>
      ${captureCard()}
      <div class="row">
        <button class="link" data-act="capture-kind">${ui.captureKind === 'system' ? 'Switch to a script idea' : 'Parking a better system instead?'}</button>
      </div>
      <div class="card stack-sm">
        <label for="skill-add">Add to your skill list directly</label>
        <p class="small muted">What would someone already at your direction believe, notice or do without thinking?</p>
        <div class="row">
          <input id="skill-add" type="text" class="grow" autocomplete="off" placeholder="A belief, habit or skill">
          <button class="btn small-btn" data-act="skill-add">Add</button>
        </div>
      </div>
      ${group('Skill list', skill, 'Nothing yet. These get ranked in your check.')}
      ${group('Parked script ideas', parked, 'Nothing parked.')}
      ${systems.length ? group('Parked system ideas', systems, '') : ''}
      ${upgrades.length ? group('Upgrades to make to this system', upgrades, '') : ''}
    </div>`;
  }

  function youView() {
    const wc = NS.wildcardStatus(state.cycles, state.ideas, NS.today());
    const shown = Math.min(wc.earned, wc.needed);
    const history = [...state.cycles].reverse();
    return `<div class="stack">
      <h1>You</h1>
      <div class="card stack-sm">
        <label for="direction">My direction</label>
        <textarea id="direction" placeholder="Where are you heading, in one sentence?">${esc(state.direction ? state.direction.text : '')}</textarea>
        <button class="btn small-btn" data-act="save-direction">Save</button>
        ${state.direction ? `<p class="small muted">Set on ${esc(prettyDate(state.direction.setOn))}</p>` : ''}
      </div>
      <div class="card stack-sm">
        <h3>Wildcard</h3>
        <div class="progress-bar" aria-hidden="true"><span style="width:${(shown / wc.needed) * 100}%"></span></div>
        <p class="small">${wc.unlocked ? 'Unlocked. You can use it at your next check, if an idea has cooled off.' : `${shown} of ${wc.needed} completed months.`}</p>
        <p class="small muted">A month counts as completed after ${RULES.completedMinDays}+ days with listens on at least half of them.</p>
      </div>
      <div class="stack-sm section">
        <h3>History</h3>
        <div class="card">${history.length ? history.map((c) => `<div class="item stack-sm">
          <div class="row between">${badge(c.stage)}<span class="small muted">${c.startOn ? esc(prettyDate(c.startOn)) : 'Writing'}</span></div>
          <p>${esc(c.title)}</p>
          ${c.startOn ? `<p class="small muted">${plural((c.listens || []).length, 'listen')}${c.closedOn ? (c.completed ? ', completed' : ', ended early or thin') : ', running now'}</p>` : ''}
        </div>`).join('') : '<p class="small muted">Nothing yet.</p>'}</div>
      </div>
      <details class="card">
        <summary>How it decides</summary>
        <div class="stack-sm section small">
          <p><strong>System</strong> fails if any answer is the worst option, two answers wobble, you check in ${RULES.lateCheckDays}+ days late, you go ${RULES.longGapDays}+ days without a listen, or you listen on under half the days. Anything you logged under "Something feels off" counts as a wobble.</p>
          <p><strong>Direction</strong> fails if you can't state it clearly, it no longer feels like yours, or it isn't a level above your life now.</p>
          <p><strong>Skill</strong> score uses direction fit (×3), how much lacking it holds you back (×3) and excitement (×2). The top score is a suggestion, and you can pick any of them.</p>
          <p><strong>Wildcard</strong> needs ${RULES.wildcardEvery} completed months since the last one, both gates passed, and an idea parked for ${RULES.coolOffDays}+ days.</p>
        </div>
      </details>
      <div class="card stack-sm">
        <h3>Backup</h3>
        <p class="small muted">Your data lives only on this phone. Save a backup now and then so you don't lose it.</p>
        <div class="row">
          <button class="btn small-btn" data-act="export">Save backup</button>
          <button class="btn small-btn" data-act="import">Restore backup</button>
        </div>
        <input id="import-file" type="file" accept="application/json,.json" hidden>
        ${ui.toast ? `<p class="ok-line" role="status">${esc(ui.toast)}</p>` : ''}
      </div>
      <button class="link" data-act="reset">Erase everything</button>
    </div>`;
  }

  // ---- The monthly check ----

  function startCheck() {
    const first = state.cycles.length === 0;
    state.check = { step: first ? 'first' : 'sys-forget', trail: [], sys: {}, dir: {}, ranked: false, sysPassed: false };
    ui.offOpen = false;
    ui.away = 0;
    save();
    render();
  }

  function go(step) {
    // Sorted ideas can't be unsorted, so Back doesn't return to that step.
    if (state.check.step !== 'triage-done') state.check.trail.push(state.check.step);
    state.check.step = step;
    save();
    render();
    window.scrollTo(0, 0);
  }

  function pendingTriage() {
    const on = NS.today();
    return state.ideas.filter((i) => i.list === 'parked' && !i.kept && NS.isRipe(i, on));
  }

  function afterGates() {
    if (pendingTriage().length) return go('triage');
    const wc = NS.wildcardStatus(state.cycles.concat(openAsDone()), state.ideas, NS.today());
    if (wc.unlocked && wc.ripe.length && !state.check.wildSkipped) return go('wild');
    return go('rank');
  }

  // The month being closed by this check counts towards the wildcard if it qualifies.
  function openAsDone() {
    const c = current();
    return c && c.startOn && NS.isCompleted(c, NS.today()) ? [{ stage: c.stage, startOn: c.startOn, completed: true }] : [];
  }

  function questionView(prefix, title, q, index, total, extra) {
    return `<div class="stack">
      <p class="progress">${esc(title)} · ${index} of ${total}</p>
      ${extra || ''}
      <h2>${esc(q.q)}</h2>
      ${q.hint ? `<p class="muted">${esc(q.hint)}</p>` : ''}
      <div class="stack-sm">
        ${q.options.map((o, i) => `<button class="btn choice" data-act="answer" data-group="${prefix}" data-q="${esc(q.id)}" data-v="${i}">${esc(o)}</button>`).join('')}
      </div>
      ${checkFooter()}
    </div>`;
  }

  function checkFooter() {
    const canBack = state.check.trail.length > 0;
    return `<div class="row between">
      ${canBack ? '<button class="link" data-act="back">Back</button>' : '<span></span>'}
      <button class="link" data-act="cancel-check">Not now</button>
    </div>`;
  }

  function evidenceLine() {
    const c = current();
    const ev = c && c.startOn ? NS.evidence(c, NS.today()) : null;
    if (!ev) return '';
    const notes = [`${plural(ev.listens, 'listen')} in ${plural(ev.elapsed, 'day')}`, `longest gap ${plural(ev.longestGap, 'day')}`];
    if (ev.lateBy) notes.push(`check-in ${plural(ev.lateBy, 'day')} late`);
    const signals = Object.values(ev.signals).reduce((a, b) => a + b, 0);
    if (signals) notes.push(`${plural(signals, 'thing')} logged as off`);
    return `<div class="card small"><strong>This month:</strong> ${esc(notes.join(', '))}.</div>`;
  }

  function failView(stage, reason, intro) {
    const focus = SCRIPT_FOCUS[reason];
    const last = lastClosed();
    const c = current();
    const prev = c && c.startOn ? c : last;
    const repeat = prev && prev.stage === stage && prev.reason === reason;
    return `<div class="stack">
      <p class="progress">${esc(intro)}</p>
      <div>${badge(stage)}</div>
      <h2>This month's script needs to be about ${stage === 'system' ? 'the system' : 'your direction'}</h2>
      <p>${esc(focus.why)}</p>
      ${repeat ? `<div class="card notice"><p>This came up last month too, so hypnosis alone may not be the fix. Before you repeat it, try changing something outside the script as well, like when you listen or how you get reminded.</p></div>` : ''}
      <div class="card stack-sm"><h3>An angle for the script</h3><p>${esc(focus.angle)}</p></div>
      <div>
        <label for="fail-title">Script idea</label>
        <input id="fail-title" type="text" value="${esc(focus.title)}">
      </div>
      <button class="btn primary" data-act="use-focus" data-stage="${esc(stage)}" data-reason="${esc(reason)}">Make this my script</button>
      ${checkFooter()}
    </div>`;
  }

  function firstView() {
    const focus = {
      title: 'Using Next Script is just what I do',
      angle: 'Systems are what tend to get dropped, so this comes first. Finishing a listen cues the tap, a calendar check-in cues the app, and coming back feels easy, including after a gap. New ideas get parked with a feeling of relief.',
    };
    return `<div class="stack">
      <p class="progress">Your first month</p>
      <div>${badge('system')}</div>
      <h2>Start by making the system stick</h2>
      <p>There's no history to check yet, and everything else depends on you still using this next month.</p>
      <div class="card stack-sm"><h3>An angle for the script</h3><p>${esc(focus.angle)}</p></div>
      <div>
        <label for="fail-title">Script idea</label>
        <input id="fail-title" type="text" value="${esc(focus.title)}">
      </div>
      <button class="btn primary" data-act="use-first" data-angle="${esc(focus.angle)}">Make this my script</button>
      <button class="link" data-act="skip-first">Already have a system script? Go to the checks</button>
      ${checkFooter()}
    </div>`;
  }

  function directionStartView() {
    const text = state.direction ? state.direction.text : '';
    return `<div class="stack">
      ${Object.keys(state.check.sys).length ? '<p class="ok-line">System check passed ✓</p>' : ''}
      <p class="progress">Direction · 1 of 3</p>
      <h2>Where are you heading?</h2>
      <div>
        <label for="dir-text">In one sentence, for work, life or both</label>
        <textarea id="dir-text">${esc(text)}</textarea>
      </div>
      <p class="progress" id="dir-error" role="alert"></p>
      <div class="stack-sm">
        <button class="btn choice" data-act="dir-clarity" data-v="0">That's clear</button>
        <button class="btn choice" data-act="dir-clarity" data-v="1">It's fuzzy</button>
        <button class="btn choice" data-act="dir-clarity" data-v="2">I have no idea yet</button>
      </div>
      ${checkFooter()}
    </div>`;
  }

  function triageView() {
    const idea = pendingTriage()[0];
    const remaining = pendingTriage().length;
    const age = NS.daysBetween(idea.createdOn, NS.today());
    const buttons = idea.kind === 'system'
      ? `<button class="btn choice" data-act="triage" data-to="upgrade" data-id="${esc(idea.id)}">Still good: add it to my upgrade list</button>
         <button class="btn choice" data-act="triage" data-to="binned" data-id="${esc(idea.id)}">The urge has passed: bin it</button>`
      : `<button class="btn choice" data-act="triage" data-to="skill" data-id="${esc(idea.id)}">It serves my direction: add to skill list</button>
         <button class="btn choice" data-act="triage" data-to="keep" data-id="${esc(idea.id)}">Off-direction but still exciting: keep for a wildcard</button>
         <button class="btn choice" data-act="triage" data-to="binned" data-id="${esc(idea.id)}">The spark has gone: bin it</button>`;
    return `<div class="stack">
      <p class="progress">Parked ideas · ${plural(remaining, 'idea')} to sort</p>
      <p class="muted">You parked this ${plural(age, 'day')} ago${idea.kind === 'system' ? ' as a better system' : ''}:</p>
      <h2>${esc(idea.title)}</h2>
      <div class="stack-sm">${buttons}</div>
      ${checkFooter()}
    </div>`;
  }

  function wildView() {
    const wc = NS.wildcardStatus(state.cycles.concat(openAsDone()), state.ideas, NS.today());
    return `<div class="stack">
      <p class="progress">You earned this</p>
      <div>${badge('wildcard')}</div>
      <h2>Wildcard unlocked</h2>
      <p>Spend this month on something you just want, or save it and go to your ranked list. It'll still be here next time.</p>
      <div class="stack-sm">
        ${wc.ripe.map((i) => `<button class="btn choice" data-act="pick" data-stage="wildcard" data-id="${esc(i.id)}">${esc(i.title)}</button>`).join('')}
      </div>
      <button class="btn" data-act="wild-skip">Save it for later</button>
      ${checkFooter()}
    </div>`;
  }

  function rateRow(idea, row) {
    const value = (idea.ratings || {})[row.id] || 2;
    return `<div class="rate">
      <span>${esc(row.label)}</span>
      ${[1, 2, 3].map((v) => `<button data-act="rate" data-id="${esc(idea.id)}" data-r="${row.id}" data-v="${v}" aria-pressed="${v === value}" aria-label="${esc(row.label)}: ${['low', 'medium', 'high'][v - 1]}">${v}</button>`).join('')}
    </div>`;
  }

  function rankView() {
    const skill = state.ideas.filter((i) => i.list === 'skill');
    const c = current();
    const canRepeat = c && c.startOn && (c.stage === 'skill' || c.stage === 'wildcard');
    const cooling = state.ideas.filter((i) => i.list === 'parked' && i.kind === 'hypno' && !NS.isRipe(i, NS.today())).length;
    const head = `<p class="ok-line">System and direction passed ✓</p>
      <h2>${state.check.ranked ? 'Your ranking' : "Rate what's best right now"}</h2>
      ${state.direction ? `<blockquote>${esc(state.direction.text)}</blockquote>` : ''}`;
    const adder = `<div class="card stack-sm">
      <label for="skill-add">What would someone already there believe, notice or do without thinking?</label>
      <div class="row">
        <input id="skill-add" type="text" class="grow" autocomplete="off" placeholder="A belief, habit or skill">
        <button class="btn small-btn" data-act="skill-add">Add</button>
      </div>
    </div>`;
    const repeat = canRepeat ? `<button class="btn" data-act="repeat">Keep "${esc(c.title)}" for another month</button>` : '';
    const coolingNote = cooling ? `<p class="small muted">${plural(cooling, 'parked idea')} still cooling off.</p>` : '';

    if (!skill.length) {
      return `<div class="stack">${head}<p>Your skill list is empty, so add at least one idea to continue.</p>${adder}${repeat}${coolingNote}${checkFooter()}</div>`;
    }

    if (state.check.ranked) {
      const ranked = NS.rank(skill);
      return `<div class="stack">${head}
        ${ranked.map((i, n) => `<div class="card ${n === 0 ? 'top' : ''} stack-sm">
          <div class="row between"><span class="small muted">#${n + 1}</span><span class="score">${i.score}</span></div>
          <p>${esc(i.title)}</p>
          <button class="btn ${n === 0 ? 'primary' : ''}" data-act="pick" data-stage="skill" data-id="${esc(i.id)}">Make this my script</button>
        </div>`).join('')}
        ${repeat}
        <button class="link" data-act="rerate">Change my ratings</button>
        ${checkFooter()}
      </div>`;
    }

    return `<div class="stack">${head}
      <p class="small muted">1 is low, 3 is high. Use what's true today, not what should be true.</p>
      ${skill.map((i) => `<div class="card stack-sm"><p><strong>${esc(i.title)}</strong></p>${RATING_ROWS.map((r) => rateRow(i, r)).join('')}</div>`).join('')}
      <button class="btn primary" data-act="show-rank">Rank them</button>
      ${adder}
      ${repeat}
      ${coolingNote}
      ${checkFooter()}
    </div>`;
  }

  function checkView() {
    const { step } = state.check;
    if (step === 'first') return firstView();
    if (step === 'sys-fail') return failView('system', state.check.sysReason, 'System check');
    if (step.startsWith('sys-')) {
      const index = SYSTEM_QUESTIONS.findIndex((q) => `sys-${q.id}` === step);
      return questionView('sys', 'System', SYSTEM_QUESTIONS[index], index + 1, SYSTEM_QUESTIONS.length, index === 0 ? evidenceLine() : '');
    }
    if (step === 'dir-start') return directionStartView();
    if (step.startsWith('dq-')) {
      const index = DIRECTION_QUESTIONS.findIndex((q) => `dq-${q.id}` === step);
      return questionView('dir', 'Direction', DIRECTION_QUESTIONS[index], index + 2, 3);
    }
    if (step === 'dir-fail') return failView('direction', state.check.dirReason, 'Direction check');
    if (step === 'triage') return pendingTriage().length ? triageView() : rankView();
    if (step === 'wild') return wildView();
    return rankView();
  }

  // ---- Actions ----

  // Close whatever month is open, then begin the new one in its writing phase.
  function beginCycle({ title, stage, reason, why, angle, ideaId }) {
    const on = NS.today();
    const open = current();
    if (open) {
      open.closedOn = on;
      open.completed = !!open.startOn && NS.isCompleted(open, on);
    }
    state.cycles.push({
      id: uid(), title, stage, reason: reason || null, why: why || null, angle: angle || null,
      ideaId: ideaId || null, createdOn: on, startOn: null, endOn: null, listens: [], signals: [],
      closedOn: null, completed: false,
    });
    state.check = null;
    ui.tab = 'today';
    ui.toast = null;
    save();
    render();
    window.scrollTo(0, 0);
  }

  function addIdea(title, list, kind) {
    state.ideas.push({ id: uid(), title, kind, list, createdOn: NS.today(), ratings: { fit: 2, block: 2, excite: 2 }, kept: false });
  }

  function capturedTitle(id) {
    const input = byId(id);
    return input ? input.value.trim() : '';
  }

  const actions = {
    begin() {
      state.onboarded = true;
      state.lastOpen = NS.today();
      startCheck();
    },
    'start-check': startCheck,
    'cancel-check'() {
      state.check = null;
      save();
      render();
    },
    back() {
      const c = state.check;
      c.step = c.trail.pop();
      c.ranked = false;
      save();
      render();
    },
    answer(el) {
      const c = state.check;
      const v = Number(el.dataset.v);
      if (el.dataset.group === 'sys') {
        c.sys[el.dataset.q] = v;
        const index = SYSTEM_QUESTIONS.findIndex((q) => q.id === el.dataset.q);
        if (index < SYSTEM_QUESTIONS.length - 1) return go(`sys-${SYSTEM_QUESTIONS[index + 1].id}`);
        const open = current();
        const result = NS.evaluateSystem(c.sys, open && open.startOn ? NS.evidence(open, NS.today()) : null);
        if (result.pass) return go('dir-start');
        c.sysReason = result.reason;
        return go('sys-fail');
      }
      c.dir[el.dataset.q] = v;
      const index = DIRECTION_QUESTIONS.findIndex((q) => q.id === el.dataset.q);
      if (index < DIRECTION_QUESTIONS.length - 1) return go(`dq-${DIRECTION_QUESTIONS[index + 1].id}`);
      const result = NS.evaluateDirection(c.dir);
      if (result.pass) return afterGates();
      c.dirReason = result.reason;
      return go('dir-fail');
    },
    'dir-clarity'(el) {
      const c = state.check;
      const v = Number(el.dataset.v);
      const text = capturedTitle('dir-text');
      if (v === 0 && !text) {
        byId('dir-error').textContent = 'Write it down first. If you can\'t, pick fuzzy.';
        return undefined;
      }
      if (text && (!state.direction || state.direction.text !== text)) {
        state.direction = { text, setOn: NS.today() };
      }
      c.dir = { clarity: v };
      if (v === 0) return go(`dq-${DIRECTION_QUESTIONS[0].id}`);
      c.dirReason = NS.evaluateDirection(c.dir).reason;
      return go('dir-fail');
    },
    'use-focus'(el) {
      const { stage, reason } = el.dataset;
      const focus = SCRIPT_FOCUS[reason];
      beginCycle({ title: capturedTitle('fail-title') || focus.title, stage, reason, why: focus.why, angle: focus.angle });
    },
    'use-first'(el) {
      beginCycle({
        title: capturedTitle('fail-title') || 'Using Next Script is just what I do',
        stage: 'system',
        reason: 'first',
        why: 'Your first month: making the system stick.',
        angle: el.dataset.angle,
      });
    },
    'skip-first'() {
      go('dir-start');
    },
    triage(el) {
      const idea = state.ideas.find((i) => i.id === el.dataset.id);
      const to = el.dataset.to;
      if (to === 'keep') idea.kept = true;
      else idea.list = to;
      save();
      if (pendingTriage().length) return render();
      state.check.step = 'triage-done';
      state.check.trail = [];
      return afterGates();
    },
    'wild-skip'() {
      state.check.wildSkipped = true;
      go('rank');
    },
    rate(el) {
      const idea = state.ideas.find((i) => i.id === el.dataset.id);
      idea.ratings[el.dataset.r] = Number(el.dataset.v);
      save();
      const scroll = window.scrollY;
      render();
      window.scrollTo(0, scroll);
    },
    'show-rank'() {
      state.check.ranked = true;
      save();
      render();
      window.scrollTo(0, 0);
    },
    rerate() {
      state.check.ranked = false;
      save();
      render();
    },
    pick(el) {
      const idea = state.ideas.find((i) => i.id === el.dataset.id);
      beginCycle({
        title: idea.title,
        stage: el.dataset.stage,
        ideaId: idea.id,
        why: el.dataset.stage === 'wildcard' ? 'Your earned wildcard month.' : 'The best fit for where you are heading right now.',
      });
    },
    repeat() {
      const c = current();
      beginCycle({ title: c.title, stage: c.stage, why: 'Another month on this one. Some changes take longer than 30 days.', angle: c.angle });
    },
    'skill-add'() {
      const title = capturedTitle('skill-add');
      if (!title) return;
      addIdea(title, 'skill', 'hypno');
      save();
      render();
    },
    capture() {
      const title = capturedTitle('capture');
      if (!title) return;
      addIdea(title, 'parked', ui.captureKind);
      ui.toast = `Parked. It's safe, and you'll see it again in ${RULES.coolOffDays} days.`;
      ui.captureKind = 'hypno';
      save();
      render();
    },
    'capture-kind'() {
      ui.captureKind = ui.captureKind === 'system' ? 'hypno' : 'system';
      render();
    },
    listen() {
      const c = current();
      const on = NS.today();
      c.listens = c.listens.includes(on) ? c.listens.filter((d) => d !== on) : [...c.listens, on];
      save();
      render();
    },
    'start-month'() {
      const c = current();
      const on = NS.today();
      c.startOn = on;
      c.endOn = NS.addDays(on, RULES.monthDays - 1);
      // An idea only leaves its list once its month begins, so changing your mind while writing loses nothing.
      const idea = state.ideas.find((i) => i.id === c.ideaId);
      if (idea) idea.list = 'done';
      save();
      render();
      window.scrollTo(0, 0);
    },
    async 'copy-line'(el) {
      try {
        await navigator.clipboard.writeText(CLOSING_LINE);
        el.textContent = 'Copied';
      } catch (e) {
        el.textContent = 'Couldn\'t copy. Select the text above.';
      }
    },
    'off-toggle'() {
      ui.offOpen = !ui.offOpen;
      render();
    },
    signal(el) {
      const c = current();
      c.signals.push({ type: el.dataset.type, on: NS.today() });
      ui.offOpen = false;
      ui.toast = 'Logged. It counts towards your next check. You can run the check early if you need to.';
      save();
      render();
    },
    'off-better'(el) {
      const c = current();
      if (el.dataset.kind === 'system') c.signals.push({ type: 'betterSystem', on: NS.today() });
      ui.captureKind = el.dataset.kind;
      ui.offOpen = false;
      save();
      render();
      const input = byId('capture');
      if (input) input.focus();
    },
    promote(el) {
      const idea = state.ideas.find((i) => i.id === el.dataset.id);
      idea.list = 'skill';
      save();
      render();
    },
    bin(el) {
      const idea = state.ideas.find((i) => i.id === el.dataset.id);
      idea.list = 'binned';
      save();
      render();
    },
    'save-direction'() {
      const text = capturedTitle('direction');
      state.direction = text ? { text, setOn: NS.today() } : null;
      ui.toast = 'Direction saved.';
      save();
      render();
    },
    export() {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `next-script-backup-${NS.today()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    import() {
      byId('import-file').click();
    },
    reset() {
      if (!window.confirm('Erase all your ideas and history from this phone? This can\'t be undone.')) return;
      state = emptyState();
      ui.tab = 'today';
      save();
      render();
    },
    tab(el) {
      ui.tab = el.dataset.tab;
      ui.toast = null;
      ui.offOpen = false;
      render();
      window.scrollTo(0, 0);
    },
  };

  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-act]');
    if (el && actions[el.dataset.act]) actions[el.dataset.act](el);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.id === 'capture') actions.capture();
    if (event.key === 'Enter' && event.target.id === 'skill-add') actions['skill-add']();
  });

  document.addEventListener('change', (event) => {
    if (event.target.id !== 'import-file' || !event.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.cycles) || !Array.isArray(data.ideas)) throw new Error('bad file');
        if (!window.confirm('Replace everything on this phone with this backup?')) return;
        state = { ...emptyState(), ...data };
        ui.toast = 'Backup restored.';
        save();
      } catch (e) {
        ui.toast = 'That file isn\'t a Next Script backup.';
      }
      render();
    };
    reader.readAsText(event.target.files[0]);
  });

  function render() {
    let html;
    if (!state.onboarded) html = onboardingView();
    else if (state.check) html = checkView();
    else if (ui.tab === 'ideas') html = ideasView();
    else if (ui.tab === 'you') html = youView();
    else html = todayView();
    $app.innerHTML = html;

    const showTabs = state.onboarded && !state.check;
    $tabs.hidden = !showTabs;
    $tabs.innerHTML = showTabs
      ? [['today', 'Today'], ['ideas', 'Ideas'], ['you', 'You']].map(([id, name]) => (
        `<button data-act="tab" data-tab="${id}" ${ui.tab === id ? 'aria-current="page"' : ''}>${name}</button>`
      )).join('')
      : '';
  }

  // Coming back after a long absence is itself evidence the system slipped.
  function noteOpen() {
    const on = NS.today();
    if (state.lastOpen) {
      const gap = NS.daysBetween(state.lastOpen, on);
      const c = current();
      if (gap >= RULES.awayDays && c && c.startOn && !state.check) {
        ui.away = gap;
        c.signals.push({ type: 'away', on });
      }
    }
    state.lastOpen = on;
    save();
  }

  noteOpen();
  render();

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
