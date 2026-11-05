// Screens and state for Next Script. Everything is stored on this device.
(function () {
  const { RULES } = NS;
  const KEY = 'next-script-v1';
  const $app = document.getElementById('app');
  const $tabs = document.getElementById('tabs');

  const STAGE_NAMES = { system: 'System', direction: 'Direction', skill: 'Skill', wildcard: 'Wildcard' };

  const SCRIPT_FOCUS = {
    forget: {
      why: "You lost track of this app, or checked in late.",
      title: 'I remember to use Next Script',
      angle: 'Write a script that keeps this app on your mind. For example, suggest that when you finish listening, you open the app and tap "I listened" without thinking about it, and that you open it as soon as your calendar reminder appears.',
    },
    lapse: {
      why: 'You listened on fewer than half the days.',
      title: 'Listening is the easy part of my day',
      angle: 'Write a script that makes listening automatic. Pick a moment you already have every day, like getting into bed, and suggest that you press play at that moment without having to decide to.',
    },
    bored: {
      why: 'Using this app has started to feel boring.',
      title: 'I enjoy coming back to this',
      angle: 'Write a script that makes using this system feel rewarding. Suggest that you are curious about what each new script will change, and that coming back feels like making progress, not doing a chore.',
    },
    switch: {
      why: "You're tempted to replace this system with something else.",
      title: 'I save new ideas and feel relieved',
      angle: 'Write a script for handling the pull of new ideas. Suggest that when a new idea or a better system pops up, you save it in this app, feel relieved that it is safe, and go back to what you were doing.',
    },
    doubt: {
      why: "You don't think you'll still be using this in three months.",
      title: "I'm someone who sticks with this",
      angle: 'Write a script that makes sticking with this part of who you are. Suggest that you are the kind of person who keeps coming back, and that missing a week just means picking it up again, not giving up.',
    },
    notice: {
      why: "You don't have a direction yet, and trying harder isn't producing ideas.",
      title: 'I start noticing options',
      angle: 'Write a script that gets your subconscious looking for options. Suggest that work and life paths you had not considered start catching your eye during the day, and that you write them down. You don\'t need to choose one yet.',
    },
    clarify: {
      why: 'You have a rough direction, but it\'s too vague to build skills towards.',
      title: 'My direction becomes clear',
      angle: 'Write a script that helps one direction stand out. Suggest that out of the options you have noticed, one keeps pulling you back, and that you can soon say it in one clear sentence.',
    },
    realign: {
      why: "Your current direction doesn't feel right any more.",
      title: 'I can tell where I want to go',
      angle: 'Write a script that helps you notice what you really want. Suggest that you can tell what genuinely excites you from what you only do out of habit, and that changing course feels fine, not like failing.',
    },
    levelUp: {
      why: "Where you're heading isn't a real step up from your life now.",
      title: 'My standards rise',
      angle: 'Write a script that raises what you expect from life. Suggest that your current level starts to feel like the minimum, that wanting more feels normal, and that you start noticing what the next level looks like and how people get there.',
    },
  };

  const SYSTEM_QUESTIONS = [
    { id: 'forget', q: 'Since you started this script, did you forget this app existed?', options: ['No', 'For a few days', 'For a week or more'] },
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
    { id: 'block', label: 'Not having it holds me back now' },
    { id: 'excite', label: "I'd be excited to listen to it" },
  ];

  const CLOSING_LINE = 'Each time you finish listening, you open Next Script and tap "I listened". And when your check-in appears on your calendar, you open the app, easily and automatically, curious about what comes next.';

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
      <p>This app tells you what your next hypnosis script should be about. You listen to that one script until it's sorted, usually for about a month, then the app helps you choose the next one.</p>
      <p>It asks three questions, in this order:</p>
      <div class="card stage-card">
        <div class="stack-sm"><h3>1. System</h3><p class="small">Are you still using this app? If not, your next script helps you stick with it.</p></div>
        ${Scenes.scene('system')}
      </div>
      <div class="card stage-card">
        <div class="stack-sm"><h3>2. Direction</h3><p class="small">Do you know where you're heading, and is it a step up from your life now? If not, your next script works on that.</p></div>
        ${Scenes.scene('direction')}
      </div>
      <div class="card stage-card">
        <div class="stack-sm"><h3>3. Skill</h3><p class="small">If both are fine, your next script builds a belief, habit or skill you need. You rate your ideas and the app ranks them. Most of your scripts will be these.</p></div>
        ${Scenes.scene('skill')}
      </div>
      <div class="card stage-card">
        <div class="stack-sm"><h3>New ideas are welcome</h3><p class="small">Save them in seconds. If one still excites you after ${RULES.coolOffDays} days, it can become a wildcard: a free-choice script you earn every ${RULES.wildcardEvery} completed scripts.</p></div>
        ${Scenes.scene('wildcard')}
      </div>
      <button class="btn primary" data-act="begin">Start</button>
    </div>`;
  }

  function captureCard() {
    const system = ui.captureKind === 'system';
    return `<div class="card stack-sm">
      <label for="capture">${system ? 'Thought of a better system? Save it here and carry on with this one. You\'ll look at it again after ' + RULES.coolOffDays + ' days.' : 'Had a new script idea? Save it here so it can\'t distract you. You\'ll look at it again after ' + RULES.coolOffDays + ' days.'}</label>
      <div class="row">
        <input id="capture" type="text" class="grow" autocomplete="off" placeholder="${system ? 'What is the better system?' : 'e.g. being more charismatic'}">
        <button class="btn primary small-btn" data-act="capture">Save</button>
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
      <button class="btn choice" data-act="start-check">Stop this script and choose a new one</button>
      <p class="small muted">The first two get counted at your next check. Stopping before day ${RULES.completedMinDays} means this script won't count towards a wildcard.</p>
      <button class="link" data-act="off-toggle">Never mind</button>
    </div>`;
  }

  function writingView(c) {
    const waited = NS.daysBetween(c.createdOn, NS.today());
    return `<div class="stack">
      ${Scenes.scene(c.stage)}
      <div class="stack-sm">
        <div>${badge(c.stage)}</div>
        <h1>${esc(c.title)}</h1>
      </div>
      ${c.why ? `<p class="muted"><strong>Why this script:</strong> ${esc(c.why)}</p>` : ''}
      <p><strong>Your next step:</strong> write and record this script, then come back here and start your ${RULES.monthDays} days.</p>
      ${waited >= RULES.writingNudgeDays ? `<div class="card notice"><p>It's been ${plural(waited, 'day')}. A rough draft is fine, because the idea matters more than the wording. Write it badly in ten minutes and hit record.</p></div>` : ''}
      ${c.angle ? `<div class="card stack-sm"><h3>Script idea</h3><p>${esc(c.angle)}</p></div>` : ''}
      <div class="card stack-sm">
        <h3>Add this to the end of every script</h3>
        <blockquote>${esc(CLOSING_LINE)}</blockquote>
        <p class="small muted">This is a suggestion to come back to this app. It's what keeps you using it when you'd otherwise forget. Reword it however you like.</p>
        <button class="btn small-btn" data-act="copy-line">Copy</button>
      </div>
      <button class="btn primary" data-act="start-month">I've recorded it, start my ${RULES.monthDays} days</button>
      ${captureCard()}
      <button class="link" data-act="start-check">Changed your mind? Choose a different script</button>
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
    const lit = Array.from({ length: RULES.monthDays }, (_, i) => (c.listens || []).includes(NS.addDays(c.startOn, i)));
    const todayIndex = finished ? -1 : NS.daysBetween(c.startOn, on);

    let banner = '';
    if (finished) {
      banner = `<div class="card notice stack-sm"><h2>Your ${RULES.monthDays} days are up</h2><p>A few quick questions will tell you what your next script should be. It takes about a minute.</p><button class="btn primary" data-act="start-check">Choose my next script</button></div>`;
    } else if (ui.away) {
      banner = `<div class="card notice stack-sm"><p><strong>Welcome back.</strong> You were away for ${plural(ui.away, 'day')}. You came back, and that's the part that counts. You can keep going with this script, or choose a new one.</p><button class="btn" data-act="start-check">Choose a new script</button></div>`;
    } else if (quiet >= RULES.driftDays) {
      banner = `<div class="card notice stack-sm"><p>It's been ${plural(quiet, 'day')} since your last listen. Nothing's broken. Listen today, or choose a new script if this one has stopped working.</p><button class="btn" data-act="start-check">Choose a new script</button></div>`;
    }

    let earlyFinish = '';
    if (!finished) {
      earlyFinish = day >= RULES.completedMinDays
        ? `<div class="card stack-sm"><p class="small">Some things install faster than others. If this one already feels sorted, you can move on now.</p><button class="btn" data-act="start-check">This feels sorted, choose my next script</button></div>`
        : `<p class="small muted">Some things install faster than others. If this feels sorted early, you can move on from day ${RULES.completedMinDays}.</p>`;
    }

    return `<div class="stack">
      <div class="stack-sm">
        <div class="row between">${badge(c.stage)}<span class="small muted">${finished ? 'Finished' : `Day ${day} of ${RULES.monthDays}`}</span></div>
        <h1>${esc(c.title)}</h1>
      </div>
      ${banner}
      ${finished ? '' : `<button class="listen ${listened ? 'done' : ''}" data-act="listen" aria-pressed="${listened}">${listened ? 'Listened today ✓' : 'I listened'}</button>`}
      <div class="card flush">
        ${Scenes.constellation(lit, todayIndex)}
        <p class="pad small muted">Tap "I listened" after each listen and a star lights up. Listens on back-to-back days join together. ${plural(ev.listens, 'listen')} so far, and a missed day is fine.</p>
      </div>
      ${earlyFinish}
      ${captureCard()}
      ${finished ? '' : `<a class="btn" href="${esc(calendarUrl(c))}" target="_blank" rel="noopener">Add a reminder for day ${RULES.monthDays} to Google Calendar</a>`}
      ${offCard()}
    </div>`;
  }

  function todayView() {
    const c = current();
    if (!c) {
      return `<div class="stack">
        <h1>No script yet</h1>
        <p class="muted">Answer a few quick questions and the app will tell you what your next script should be.</p>
        <button class="btn primary" data-act="start-check">Choose my next script</button>
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
      meta = left > 0 ? `Waiting ${plural(left, 'more day')}` : "You'll sort this next time you choose a script";
      if (idea.kind === 'hypno') actions += `<button class="btn small-btn" data-act="promote" data-id="${esc(idea.id)}">It helps my direction, add to skill list</button>`;
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
    const group = (title, about, items, empty) => `<div class="stack-sm section">
      <h3>${esc(title)}</h3>
      ${about ? `<p class="small muted">${esc(about)}</p>` : ''}
      <div class="card">${items.length ? items.map(ideaRow).join('') : `<p class="small muted">${esc(empty)}</p>`}</div>
    </div>`;
    return `<div class="stack">
      <h1>Ideas</h1>
      ${captureCard()}
      <div class="row">
        <button class="link" data-act="capture-kind">${ui.captureKind === 'system' ? 'Saving a script idea instead?' : 'Saving a better system instead?'}</button>
      </div>
      <div class="card stack-sm">
        <label for="skill-add">Know it will help your direction? Add it to your skill list. Ask yourself: what would someone already there believe, notice or do without thinking?</label>
        <div class="row">
          <input id="skill-add" type="text" class="grow" autocomplete="off" placeholder="A belief, habit or skill">
          <button class="btn small-btn" data-act="skill-add">Add</button>
        </div>
      </div>
      ${group('Skill list', 'Beliefs, habits and skills that help your direction. You rate these and the app ranks them when you choose a script.', skill, 'Nothing here yet.')}
      ${group('Saved script ideas', `New ideas wait here for ${RULES.coolOffDays} days. After that, you decide whether each one goes on your skill list, stays as a possible wildcard, or gets removed.`, parked, 'Nothing saved.')}
      ${systems.length ? group('Ideas for a better system', `These wait ${RULES.coolOffDays} days too, so you don't drop this system on impulse.`, systems, '') : ''}
      ${upgrades.length ? group('Improvements to make to this system', 'Good ideas that survived the wait. Use them to improve this system instead of replacing it.', upgrades, '') : ''}
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
        <p class="small">A wildcard is a free pick: a script on anything you're excited about, even if it doesn't help your direction.</p>
        <p class="small"><strong>${wc.unlocked ? 'Unlocked. You can use it next time you choose a script, if a saved idea has waited long enough.' : `${shown} of ${wc.needed} completed scripts needed.`}</strong></p>
        <p class="small muted">A script counts as completed if you stay on it for ${RULES.completedMinDays}+ days and listen on at least half of them.</p>
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
          <p><strong>System:</strong> your next script is about the system if you pick the last answer on any question, pick a middle answer on two questions, come back ${RULES.lateCheckDays}+ days after your ${RULES.monthDays} days end, go ${RULES.longGapDays}+ days without a listen, or listen on under half the days. Anything you logged under "Something feels off?" counts as a middle answer.</p>
          <p><strong>Direction:</strong> your next script is about direction if you can't say it clearly, it no longer feels like yours, or it isn't a step up from your life now.</p>
          <p><strong>Skill:</strong> each idea's score uses how much it moves you towards your direction (×3), how much not having it holds you back (×3) and how excited you are (×2). The top score is a suggestion, and you can pick any of them.</p>
          <p><strong>Wildcard:</strong> needs ${RULES.wildcardEvery} completed scripts since your last wildcard, the system and direction questions passed, and an idea saved for ${RULES.coolOffDays}+ days.</p>
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
      ${prefix === 'sys' && index === 1 ? '<p class="muted">First, a check that you\'re still using this app. If you\'re not, your next script will help with that.</p>' : ''}
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
    if (signals) notes.push(`${plural(signals, 'problem')} logged`);
    return `<div class="card small"><strong>Your current script:</strong> ${esc(notes.join(', '))}.</div>`;
  }

  function failView(stage, reason, intro) {
    const focus = SCRIPT_FOCUS[reason];
    const last = lastClosed();
    const c = current();
    const prev = c && c.startOn ? c : last;
    const repeat = prev && prev.stage === stage && prev.reason === reason;
    return `<div class="stack">
      <p class="progress">${esc(intro)}</p>
      ${Scenes.scene(stage)}
      <div>${badge(stage)}</div>
      <h2>Your next script should be about ${stage === 'system' ? 'sticking with this system' : 'your direction'}</h2>
      <p><strong>Why:</strong> ${esc(focus.why)}</p>
      ${repeat ? `<div class="card notice"><p>This came up last time too, so hypnosis alone may not be the fix. Before you repeat it, try changing something outside the script as well, like when you listen or how you get reminded.</p></div>` : ''}
      <div class="card stack-sm"><h3>Script idea</h3><p>${esc(focus.angle)}</p></div>
      <div>
        <label for="fail-title">Name for this script (change it if you like)</label>
        <input id="fail-title" type="text" value="${esc(focus.title)}">
      </div>
      <button class="btn primary" data-act="use-focus" data-stage="${esc(stage)}" data-reason="${esc(reason)}">Make this my script</button>
      ${checkFooter()}
    </div>`;
  }

  function firstView() {
    const focus = {
      title: 'Using Next Script is just what I do',
      angle: 'Write a script that makes this app a normal part of your routine. Suggest that after you listen, you open the app and tap "I listened". Suggest that you open it when your calendar reminder appears, and that coming back feels easy, even after a gap. Suggest too that when a new idea pops up, you save it here and feel relieved.',
    };
    return `<div class="stack">
      <p class="progress">Your first month</p>
      ${Scenes.scene('system')}
      <div>${badge('system')}</div>
      <h2>Your first script should be about sticking with this system</h2>
      <p><strong>Why:</strong> a goal system only helps if you keep using it, and everything else in this app depends on that. There's no history to check yet, so this comes first.</p>
      <div class="card stack-sm"><h3>Script idea</h3><p>${esc(focus.angle)}</p></div>
      <div>
        <label for="fail-title">Name for this script (change it if you like)</label>
        <input id="fail-title" type="text" value="${esc(focus.title)}">
      </div>
      <button class="btn primary" data-act="use-first" data-angle="${esc(focus.angle)}">Make this my script</button>
      <button class="link" data-act="skip-first">Already have a script like this? Skip this step</button>
      ${checkFooter()}
    </div>`;
  }

  function directionStartView() {
    const text = state.direction ? state.direction.text : '';
    return `<div class="stack">
      ${Object.keys(state.check.sys).length ? '<p class="ok-line">You\'re sticking with the system ✓</p>' : ''}
      <p class="progress">Direction · 1 of 3</p>
      <p class="muted">Next, a check that you know where you're heading. Skills only help once you know what they're for.</p>
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
      ? `<button class="btn choice" data-act="triage" data-to="upgrade" data-id="${esc(idea.id)}">Still a good idea: use it to improve this system</button>
         <button class="btn choice" data-act="triage" data-to="binned" data-id="${esc(idea.id)}">Not interested any more: remove it</button>`
      : `<button class="btn choice" data-act="triage" data-to="skill" data-id="${esc(idea.id)}">It helps my direction: add it to my skill list</button>
         <button class="btn choice" data-act="triage" data-to="keep" data-id="${esc(idea.id)}">It doesn't help my direction, but I'm still excited: keep it for a wildcard</button>
         <button class="btn choice" data-act="triage" data-to="binned" data-id="${esc(idea.id)}">Not interested any more: remove it</button>`;
    return `<div class="stack">
      <p class="progress">Saved ideas · ${plural(remaining, 'idea')} to sort</p>
      <p class="muted">You saved this ${plural(age, 'day')} ago${idea.kind === 'system' ? ' as a better system' : ''}. It's waited long enough, so decide what to do with it:</p>
      <h2>${esc(idea.title)}</h2>
      <div class="stack-sm">${buttons}</div>
      ${checkFooter()}
    </div>`;
  }

  function wildView() {
    const wc = NS.wildcardStatus(state.cycles.concat(openAsDone()), state.ideas, NS.today());
    return `<div class="stack">
      <p class="progress">You earned this</p>
      ${Scenes.scene('wildcard')}
      <div>${badge('wildcard')}</div>
      <h2>Wildcard unlocked</h2>
      <p>A wildcard is a free pick: your next script can be about something you're just excited about, even if it doesn't help your direction. Pick one of your saved ideas, or save the wildcard for later and go to your skill list.</p>
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
    const head = `<p class="ok-line">System and direction are both fine ✓</p>
      <h2>${state.check.ranked ? 'Your ranking' : 'Rate your skill ideas'}</h2>
      ${state.direction ? `<p class="small muted">Your direction:</p><blockquote>${esc(state.direction.text)}</blockquote>` : ''}`;
    const adder = `<div class="card stack-sm">
      <label for="skill-add">What would someone already there believe, notice or do without thinking?</label>
      <div class="row">
        <input id="skill-add" type="text" class="grow" autocomplete="off" placeholder="A belief, habit or skill">
        <button class="btn small-btn" data-act="skill-add">Add</button>
      </div>
    </div>`;
    const repeat = canRepeat ? `<button class="btn" data-act="repeat">Not sorted yet: stay on "${esc(c.title)}" for another ${RULES.monthDays} days</button>` : '';
    const coolingNote = cooling ? `<p class="small muted">${plural(cooling, 'saved idea')} still waiting out the ${RULES.coolOffDays} days.</p>` : '';

    if (!skill.length) {
      return `<div class="stack">${head}<p>Your skill list is empty. Add at least one belief, habit or skill to work on, and it can become your next script.</p>${adder}${repeat}${coolingNote}${checkFooter()}</div>`;
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
      <p class="small muted">Give each idea a score from 1 (low) to 3 (high) on the three lines below it, based on how things are today. The app then ranks them for you.</p>
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
        why: el.dataset.stage === 'wildcard' ? "You earned a wildcard and chose this idea." : 'You chose this from your ranked skill list.',
        angle: `Write a script that installs this idea: "${idea.title}". Suggest that it is already true of you, then describe what you notice, feel and do differently in everyday situations because of it.`,
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
      ui.toast = `Saved. You'll look at it again the next time you choose a script after ${RULES.coolOffDays} days.`;
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
      ui.toast = 'Noted. This will count when you next choose a script.';
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
    // When an update lands, reload onto it. Your data and any check in progress are already saved.
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) location.reload();
    });
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
