# Next Script

A phone web app that picks what to hypnotise yourself on each month. It checks System, then Direction, then ranks your Skill ideas, with a wildcard you earn.

All data stays in the browser on your phone. There is no server and no account.

- Rules and numbers: `logic.js` (the `RULES` object is at the top)
- Screens and wording: `app.js`
- Look: `style.css`, `scenes.js` (illustrations), `assets/` (artwork from TrueNorth)
- Tests: `node --test logic.test.js`

When you change any file, bump `VERSION` in `sw.js`, or phones will keep the old copy.
