(async () => {
  const routes = ['#/','#/objectives','#/business-cases','#/architecture','#/discovery',
                  '#/solution','#/implementation','#/company'];
  const results = [];
  for (const r of routes) {
    location.hash = r;
    await new Promise(res => setTimeout(res, 450));
    const app = document.querySelector('.hud-app') || document.body;
    const widest = Math.max(app.scrollWidth,
      ...[...document.querySelectorAll('.hud-app *')].slice(0, 400)
        .map(e => Math.round(e.getBoundingClientRect().right)));
    // widestRight beyond viewport is OK ONLY inside an overflow-auto ancestor
    results.push({ route: r, viewport: innerWidth,
      clippedPx: Math.max(0, app.scrollWidth - innerWidth), widestRight: widest });
  }
  console.table(results);
})();
