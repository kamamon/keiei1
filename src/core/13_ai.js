/* =========================================================
   AI球団の運営
   ========================================================= */
function aiPayBudget(T) { return Math.round((150000 + T.market * 100000 + T.pop * 1500) * (0.9 + (T.lastPct || 0.5) * 0.2)); }
function aiWeekly() {
  const t = curTurn();
  for (const T of G.teams) {
    if (isUser(T.id)) continue;
    autoRoster(T.id);
    if (t === 22) {
      const ik = rosterLv(T.id, 3).filter(p => ovr(p) >= 46).sort((a, b) => ovr(b) - ovr(a));
      if (ik.length && shihai(T.id).length < 68) promoteIkusei(ik[0]);
    }
    if (t >= 18 && t <= 27 && G.foreign.length && chance(0.04)) {
      const inj = rosterLv(T.id, 2).filter(p => p.injW > 4 && ovr(p) >= 62).length;
      const frn = shihai(T.id).filter(p => p.frn).length;
      if (inj && frn < 5 && shihai(T.id).length < 70) {
        const room = T.payBudget - teamPayroll(T.id);
        const c = G.foreign.filter(p => p.fa.ask < Math.max(5000, room * 0.5));
        if (c.length) signForeign(maxBy(c, p => ovr(p)).id, T.id);
      }
    }
  }
  // ユーザー：故障者の自動入れ替え・全面おまかせ
  const ut = G.user.tid;
  if (G.user.autoRoster) autoRoster(ut);
  else if (G.user.autoSwap) swapInjured(ut);
}
function aiReleases() {
  for (const T of G.teams) {
    if (isUser(T.id)) continue;
    const tid = T.id;
    for (const p of shihai(tid).filter(p => p.frn && (ovr(p) < 57 || p.age >= 35) && p.yrs <= 1)) releasePlayer(p, true);
    const sh = shihai(tid);
    const target = 62;
    if (sh.length > target) {
      const cands = sh.filter(p => p.yrs <= 1).sort((a, b) => pVal(a, tid) - pVal(b, tid));
      let n = sh.length - target;
      for (const p of cands) { if (n <= 0) break; releasePlayer(p, true); n--; }
    }
    const ik = rosterLv(tid, 3).sort((a, b) => pVal(a, tid) - pVal(b, tid));
    let extra = ik.length - 12;
    for (const p of ik) { if ((p.age >= 24 && ovr(p) < 44) || extra > 0) { releasePlayer(p, true); extra--; } }
  }
}
function aiForeignSignings() {
  for (const T of G.teams) {
    if (isUser(T.id)) continue;
    const frn = shihai(T.id).filter(p => p.frn).length;
    if (frn >= 5 || shihai(T.id).length >= 69) continue;
    const room = T.payBudget - teamPayroll(T.id, true);
    const cands = G.foreign.filter(p => p.fa.ask < Math.max(4000, room * 0.6));
    if (!cands.length) continue;
    const best = maxBy(cands, p => ovr(p) + rn(0, 4) - p.fa.ask / 5000);
    if (chance(frn <= 2 ? 0.9 : 0.55)) signForeign(best.id, T.id);
  }
}
function aiTryouts() {
  for (const T of G.teams) {
    if (isUser(T.id)) continue;
    if (shihai(T.id).length >= 64) continue;
    const c = G.fapool.map(P_).filter(p => p && ovr(p) >= 50 && p.age <= 33).sort((a, b) => ovr(b) - ovr(a));
    const p = c[0]; if (!p || !chance(0.6)) continue;
    G.fapool = G.fapool.filter(x => x !== p.id);
    addToTeam(p, T.id, 2);
    p.sal = 0; p.ren = { st: 'signed', sal: p.fa ? p.fa.ask : MIN_SAL, yrs: 1 }; p.fa = null;
    addNews('contract', `${tShort(T.id)}が${p.name}と契約（トライアウト）`, {});
  }
}
function prunePool() {
  const keep = G.fapool.map(P_).filter(Boolean).sort((a, b) => ovr(b) - ovr(a)).slice(0, 12).map(p => p.id);
  for (const id of G.fapool) if (!keep.includes(id)) delete G.players[id];
  G.fapool = keep;
}
