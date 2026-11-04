/* =========================================================
   起動
   ========================================================= */
(function boot() {
  try { const th = localStorage.getItem('kyudan_theme'); if (th) document.documentElement.dataset.theme = th === 'day' ? 'day' : 'night'; } catch (e) { }
  setLeague(typeof START_LEAGUE !== 'undefined' ? START_LEAGUE : 'npb');
  UI.title.mode = LG.mode;
  UI.screen = 'title';
  render();
  window.addEventListener('hashchange', () => { if (!G) return; const h = location.hash.slice(1); if (SCREENS[h] && h !== UI.screen && h !== 'title') go(h); });
})();
