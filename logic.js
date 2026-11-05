// Decision rules for Next Script. Pure functions, no page access, so they can be tested in Node.
(function (root) {
  const RULES = {
    monthDays: 30,
    coolOffDays: 14,
    wildcardEvery: 3,
    completedMinDays: 21,
    listenMinRate: 0.5,
    longGapDays: 7,
    lateCheckDays: 7,
    driftDays: 5,
    awayDays: 14,
    writingNudgeDays: 3,
  };

  const pad = (n) => String(n).padStart(2, '0');
  const toDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => toDay(new Date());
  const utc = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / 86400000);
  const addDays = (s, n) => {
    const d = new Date(utc(s) + n * 86400000);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  };

  // What the month's taps say, separate from what you remember.
  function evidence(cycle, on) {
    if (!cycle || !cycle.startOn) return null;
    const last = on < cycle.endOn ? on : cycle.endOn;
    const elapsed = Math.max(1, daysBetween(cycle.startOn, last) + 1);
    const listens = [...new Set(cycle.listens || [])].sort();
    // A gap is a run of days with no listen, including before the first and after the last.
    let longestGap = 0;
    let prev = null;
    for (const l of listens) {
      longestGap = Math.max(longestGap, prev ? daysBetween(prev, l) - 1 : daysBetween(cycle.startOn, l));
      prev = l;
    }
    longestGap = Math.max(longestGap, prev ? daysBetween(prev, last) : elapsed);
    const signals = (cycle.signals || []).reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {});
    return {
      elapsed,
      listens: listens.length,
      rate: listens.length / elapsed,
      longestGap,
      lateBy: Math.max(0, daysBetween(cycle.endOn, on)),
      signals,
    };
  }

  function isCompleted(cycle, on) {
    const e = evidence(cycle, on);
    return !!e && e.elapsed >= RULES.completedMinDays && e.rate >= RULES.listenMinRate;
  }

  // Answers run 0 (fine), 1 (wobbly), 2 (problem). One problem, or two wobbles, fails the gate.
  function evaluateSystem(answers, ev) {
    const signals = (ev && ev.signals) || {};
    const score = {
      forget: Math.max(answers.forget || 0, signals.forgot || signals.away ? 1 : 0),
      bored: Math.max(answers.bored || 0, signals.bored ? 1 : 0),
      switch: Math.max(answers.switch || 0, signals.betterSystem ? 1 : 0),
      doubt: answers.doubt || 0,
    };
    const order = ['forget', 'bored', 'switch', 'doubt'];
    const firstAt = (level) => order.find((k) => score[k] === level);
    const wobbles = order.filter((k) => score[k] === 1).length;

    const strong = firstAt(2);
    if (strong) return { pass: false, reason: strong };
    if (ev) {
      if (ev.lateBy >= RULES.lateCheckDays || ev.longestGap >= RULES.longGapDays) {
        return { pass: false, reason: 'forget' };
      }
      if (ev.elapsed >= 3 && ev.rate < RULES.listenMinRate) return { pass: false, reason: 'lapse' };
    }
    if (wobbles >= 2) return { pass: false, reason: firstAt(1) };
    return { pass: true, reason: null };
  }

  function evaluateDirection(answers) {
    const { clarity = 0, fit = 0, level = 0 } = answers;
    if (clarity === 2) return { pass: false, reason: 'notice' };
    if (clarity === 1) return { pass: false, reason: 'clarify' };
    if (fit === 2) return { pass: false, reason: 'realign' };
    if (level === 2) return { pass: false, reason: 'levelUp' };
    if (fit === 1 && level === 1) return { pass: false, reason: 'realign' };
    return { pass: true, reason: null };
  }

  // Direction fit and how much it's blocking you outweigh excitement, but excitement still counts.
  function score(r) {
    const { fit = 2, block = 2, excite = 2 } = r || {};
    return Math.round(((fit * 3 + block * 3 + excite * 2 - 8) / 16) * 100);
  }

  function rank(ideas) {
    return [...ideas]
      .map((idea) => ({ ...idea, score: score(idea.ratings) }))
      .sort((a, b) => b.score - a.score || (a.createdOn < b.createdOn ? -1 : 1));
  }

  const isRipe = (idea, on) => daysBetween(idea.createdOn, on) >= RULES.coolOffDays;

  function wildcardStatus(cycles, ideas, on) {
    let earned = 0;
    for (const c of cycles) {
      // A wildcard is only spent once its month starts, not when it's picked.
      if (c.stage === 'wildcard' && c.startOn) earned = 0;
      else if (c.stage === 'wildcard') continue;
      else if (c.completed) earned += 1;
    }
    const ripe = ideas.filter((i) => i.kind === 'hypno' && i.list === 'parked' && isRipe(i, on));
    return {
      earned,
      needed: RULES.wildcardEvery,
      unlocked: earned >= RULES.wildcardEvery,
      ripe,
    };
  }

  const api = {
    RULES, today, toDay, daysBetween, addDays, evidence, isCompleted,
    evaluateSystem, evaluateDirection, score, rank, isRipe, wildcardStatus,
  };
  root.NS = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
