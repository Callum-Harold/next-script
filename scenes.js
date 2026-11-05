// Illustrations used around the app, plus the month's constellation of listens.
(function (root) {
  function stars(count, seed, width, height) {
    let n = seed;
    const next = () => {
      n = (n * 9301 + 49297) % 233280;
      return n / 233280;
    };
    let out = '';
    for (let i = 0; i < count; i += 1) {
      const x = (next() * width).toFixed(0);
      const y = (next() * height).toFixed(0);
      const r = (0.3 + next() * 0.6).toFixed(1);
      out += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${(0.35 + next() * 0.6).toFixed(2)}"/>`;
    }
    return out;
  }

  const sparkle = (x, y, s) => `<path fill="#fffbe8" d="M${x} ${y - s}L${x + s * 0.14} ${y - s * 0.14}L${x + s} ${y}L${x + s * 0.14} ${y + s * 0.14}L${x} ${y + s}L${x - s * 0.14} ${y + s * 0.14}L${x - s} ${y}L${x - s * 0.14} ${y - s * 0.14}Z"/>`;

  const person = (x, y, colour) => `<g fill="${colour}">
    <circle cx="${x}" cy="${y - 27}" r="4.2"/>
    <path d="M${x - 6} ${y - 21}Q${x} ${y - 25} ${x + 6} ${y - 21}L${x + 7} ${y - 8}L${x + 4.5} ${y}H${x - 4.5}L${x - 7} ${y - 8}Z"/>
  </g>`;

  const IMAGES = {
    system: 'assets/CreateGoal.svg',
    direction: 'assets/ViewGoal.svg',
    skill: 'assets/TrackGoal.svg',
  };

  // A shooting star over the pines, drawn to sit alongside the TrueNorth artwork.
  const wildcard = () => `<svg class="scene" viewBox="0 0 220 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs><linearGradient id="dusk-wild" x2="0" y2="1"><stop stop-color="#1c1a3e"/><stop offset="1" stop-color="#b0705f"/></linearGradient></defs>
    <rect width="220" height="120" fill="url(#dusk-wild)"/>
    ${stars(55, 37, 220, 76)}
    <path stroke="#fffbe8" stroke-width="1.6" stroke-linecap="round" d="M78 16L146 44"/>
    ${sparkle(148, 45, 6)}
    <path fill="#0e1a12" d="M0 120V98L12 76L24 98L36 82L48 100L62 72L78 102L92 86L106 104L122 80L138 102L152 84L166 102L182 76L198 100L210 86L220 100V120Z"/>
  </svg>`;

  function scene(name) {
    if (name === 'wildcard') return wildcard();
    return IMAGES[name] ? `<img class="scene" src="${IMAGES[name]}" alt="">` : '';
  }

  // Thirty stars, one per day. Each listen lights a star, and neighbouring listens join up.
  function constellation(flags, todayIndex) {
    const point = (i) => {
      const row = Math.floor(i / 10);
      const col = i % 10;
      const across = row % 2 ? 9 - col : col;
      return [18 + across * 29.5, 22 + row * 42 + Math.sin(i * 2.3) * 11];
    };
    let lines = '';
    let dots = '';
    flags.forEach((on, i) => {
      const [x, y] = point(i);
      if (on && flags[i + 1]) {
        const [x2, y2] = point(i + 1);
        lines += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#fff" stroke-width="1" stroke-dasharray="3 3"/>`;
      }
      dots += on
        ? sparkle(Number(x.toFixed(1)), Number(y.toFixed(1)), 5.5)
        : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.5" fill="#fff" opacity=".4"/>`;
      if (i === todayIndex) dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="none" stroke="#e8c98f" stroke-width="1.3"/>`;
    });
    return `<svg class="scene" viewBox="0 0 300 165" aria-hidden="true" focusable="false">
      <defs><linearGradient id="dusk-sky" x2="0" y2="1"><stop stop-color="#101d33"/><stop offset="1" stop-color="#4d7395"/></linearGradient></defs>
      <rect width="300" height="165" fill="url(#dusk-sky)"/>
      ${stars(70, 5, 300, 130)}
      ${lines}${dots}
      <path fill="#0a0f1a" d="M0 158L100 150L190 160L300 152V165H0Z"/>
      <g transform="translate(0 2)">${person(262, 152, '#0a0f1a')}</g>
    </svg>`;
  }

  root.Scenes = { scene, constellation };
})(globalThis);
