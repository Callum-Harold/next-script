// Run with: node --test logic.test.js
const test = require('node:test');
const assert = require('node:assert');
const NS = require('./logic.js');

const cycle = (over = {}) => ({
  startOn: '2026-01-01', endOn: '2026-01-31', listens: [], signals: [], stage: 'skill', ...over,
});
const everyDay = (n) => Array.from({ length: n }, (_, i) => NS.addDays('2026-01-01', i));
const fine = { forget: 0, bored: 0, switch: 0, doubt: 0 };

test('date helpers cross month ends', () => {
  assert.equal(NS.addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(NS.daysBetween('2026-01-31', '2026-03-01'), 29);
});

test('evidence counts listens and gaps', () => {
  const e = NS.evidence(cycle({ listens: ['2026-01-01', '2026-01-02', '2026-01-10'] }), '2026-01-10');
  assert.equal(e.elapsed, 10);
  assert.equal(e.listens, 3);
  assert.equal(e.longestGap, 7);
  assert.equal(e.lateBy, 0);
});

test('evidence caps at the end of the month and counts a late check', () => {
  const e = NS.evidence(cycle({ listens: everyDay(31) }), '2026-02-10');
  assert.equal(e.elapsed, 31);
  assert.equal(e.lateBy, 10);
  assert.equal(e.longestGap, 0);
});

test('a month with no listens counts the whole gap', () => {
  assert.equal(NS.evidence(cycle(), '2026-01-08').longestGap, 8);
});

test('system passes on a clean month', () => {
  const ev = NS.evidence(cycle({ listens: everyDay(31) }), '2026-01-31');
  assert.deepEqual(NS.evaluateSystem(fine, ev), { pass: true, reason: null });
});

test('system passes on one wobble, fails on two', () => {
  assert.equal(NS.evaluateSystem({ ...fine, bored: 1 }, null).pass, true);
  const r = NS.evaluateSystem({ ...fine, bored: 1, doubt: 1 }, null);
  assert.deepEqual(r, { pass: false, reason: 'bored' });
});

test('a strong answer fails and beats a lower wobble', () => {
  assert.equal(NS.evaluateSystem({ ...fine, forget: 1, switch: 2 }, null).reason, 'switch');
});

test('logged signals count as a wobble', () => {
  const ev = NS.evidence(cycle({ listens: everyDay(31), signals: [{ type: 'bored' }] }), '2026-01-31');
  assert.equal(NS.evaluateSystem({ ...fine, doubt: 1 }, ev).pass, false);
  assert.equal(NS.evaluateSystem(fine, ev).pass, true);
});

test('taps can fail the system even if you say it is fine', () => {
  const lapsed = NS.evidence(cycle({ listens: everyDay(10).filter((_, i) => i % 3 === 0) }), '2026-01-10');
  assert.equal(NS.evaluateSystem(fine, lapsed).reason, 'lapse');
  const late = NS.evidence(cycle({ listens: everyDay(31) }), '2026-02-08');
  assert.equal(NS.evaluateSystem(fine, late).reason, 'forget');
});

test('direction reasons', () => {
  assert.equal(NS.evaluateDirection({ clarity: 2 }).reason, 'notice');
  assert.equal(NS.evaluateDirection({ clarity: 1 }).reason, 'clarify');
  assert.equal(NS.evaluateDirection({ clarity: 0, fit: 2 }).reason, 'realign');
  assert.equal(NS.evaluateDirection({ clarity: 0, fit: 0, level: 2 }).reason, 'levelUp');
  assert.equal(NS.evaluateDirection({ clarity: 0, fit: 1, level: 1 }).reason, 'realign');
  assert.equal(NS.evaluateDirection({ clarity: 0, fit: 1, level: 0 }).pass, true);
});

test('score spans 0 to 100 and weights fit over excitement', () => {
  assert.equal(NS.score({ fit: 1, block: 1, excite: 1 }), 0);
  assert.equal(NS.score({ fit: 3, block: 3, excite: 3 }), 100);
  assert.ok(NS.score({ fit: 3, block: 2, excite: 1 }) > NS.score({ fit: 1, block: 2, excite: 3 }));
});

test('rank orders by score then oldest first', () => {
  const r = NS.rank([
    { title: 'new', createdOn: '2026-02-01', ratings: { fit: 2, block: 2, excite: 2 } },
    { title: 'old', createdOn: '2026-01-01', ratings: { fit: 2, block: 2, excite: 2 } },
    { title: 'top', createdOn: '2026-03-01', ratings: { fit: 3, block: 3, excite: 3 } },
  ]);
  assert.deepEqual(r.map((i) => i.title), ['top', 'old', 'new']);
});

test('wildcard needs three completed months and resets after use', () => {
  const done = { stage: 'skill', completed: true };
  const idea = { kind: 'hypno', list: 'parked', createdOn: '2026-01-01' };
  const on = '2026-01-20';
  assert.equal(NS.wildcardStatus([done, done], [idea], on).unlocked, false);
  assert.equal(NS.wildcardStatus([done, { stage: 'skill', completed: false }, done], [idea], on).unlocked, false);
  const open = NS.wildcardStatus([done, done, done], [idea], on);
  assert.equal(open.unlocked, true);
  assert.equal(open.ripe.length, 1);
  assert.equal(NS.wildcardStatus([done, done, done, { stage: 'wildcard', startOn: on, completed: true }], [idea], on).earned, 0);
});

test('a wildcard dropped before its month starts is not spent', () => {
  const done = { stage: 'skill', completed: true };
  assert.equal(NS.wildcardStatus([done, done, done, { stage: 'wildcard', startOn: null }], [], '2026-01-20').earned, 3);
});

test('ideas stay out of the wildcard until they have cooled off', () => {
  const idea = { kind: 'hypno', list: 'parked', createdOn: '2026-01-10' };
  assert.equal(NS.wildcardStatus([], [idea], '2026-01-23').ripe.length, 0);
  assert.equal(NS.wildcardStatus([], [idea], '2026-01-24').ripe.length, 1);
});

test('a short or thin month does not count as completed', () => {
  assert.equal(NS.isCompleted(cycle({ listens: everyDay(20) }), '2026-01-20'), false);
  assert.equal(NS.isCompleted(cycle({ listens: everyDay(5) }), '2026-01-31'), false);
  assert.equal(NS.isCompleted(cycle({ listens: everyDay(20) }), '2026-01-31'), true);
});
