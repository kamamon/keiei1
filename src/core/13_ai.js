/* =========================================================
   AI球団の運営
   ========================================================= */
function aiPayBudget(T) { if (LG.mlb) return aiPayBudgetMLB(T); return Math.round((150000 + T.market * 100000 + T.pop * 1500) * (0.9 + (T.lastPct || 0.5) * 0.2)); }
function aiWeekly() {
  const t = curTurn();
  for (const T of G.teams) {
    if (isUser(T.id)) continue;
    autoRoster(T.id);
    if (t === 22) {
      const ik = rosterLv(T.id, 3).filter(p => ovr(p) >= 46).sort((a, b) => ovr(b) - ovr(a));
      if (ik.length && shihai(T.id).length < LIM.shihai - 2) promoteIkusei(ik[0]);
    }
    if (LG.mlb && (t === 44 || t === 10 || t === 30)) aiFill40(T.id);
    if (!LG.mlb && t >= 18 && t <= 27 && G.foreign.length && chance(0.04)) {
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
  if (LG.mlb && t >= 8 && t <= 39) userFill40();
  if (G.user.autoRoster) autoRoster(ut);
  else if (G.user.autoSwap) swapInjured(ut);
}
function aiReleases() {
  if (LG.mlb) return aiReleasesMLB();
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
  if (LG.mlb) return aiForeignSigningsMLB();
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
  if (LG.mlb) return aiFreeAgentsMLB();
  for (const T of G.teams) {
    if (isUser(T.id)) continue;
    if (shihai(T.id).length >= LIM.shihai - (LG.mlb ? 2 : 6)) continue;
    const c = G.fapool.map(P_).filter(p => p && ovr(p) >= 50 && p.age <= 33).sort((a, b) => ovr(b) - ovr(a));
    const p = c[0]; if (!p || !chance(0.6)) continue;
    G.fapool = G.fapool.filter(x => x !== p.id);
    addToTeam(p, T.id, 2);
    p.sal = 0; p.ren = { st: 'signed', sal: p.fa ? p.fa.ask : MIN_SAL, yrs: 1 }; p.fa = null;
    addNews('contract', `${tShort(T.id)}が${p.name}と契約（トライアウト）`, {});
  }
}
function prunePool() {
  const keep = G.fapool.map(P_).filter(Boolean).sort((a, b) => ovr(b) - ovr(a)).slice(0, LG.mlb ? 40 : 12).map(p => p.id);
  for (const id of G.fapool) if (!keep.includes(id)) delete G.players[id];
  G.fapool = keep;
}

/* メジャー版：40人枠を38人に、マイナー契約を上限の手前に整える */
function aiReleasesMLB() {
  for (const T of G.teams) {
    if (isUser(T.id)) continue;
    const tid = T.id;
    const sh = shihai(tid);
    if (sh.length > 38) {
      const c = sh.filter(p => p.yrs <= 1 && !(p.ren && p.ren.st === 'signed')).sort((a, b) => pVal(a, tid) - pVal(b, tid));
      let n = sh.length - 38;
      for (const p of c) { if (n <= 0) break; releasePlayer(p, true); n--; }
    }
    const ik = rosterLv(tid, 3).sort((a, b) => pVal(a, tid) - pVal(b, tid));
    let extra = ik.length - (LIM.ikusei - 9);
    for (const p of ik) { if ((p.age >= 26 && ovr(p) < 46) || extra > 0) { releasePlayer(p, true); extra--; } }
  }
}
/* メジャー版：海外のプロ選手（ポスティング・FA）の獲得 */
function aiForeignSigningsMLB() {
  const list = G.foreign.slice().sort((a, b) => ovr(b) - ovr(a));
  for (const p of list) {
    if (!G.foreign.includes(p)) continue;
    const o = ovr(p);
    const bids = G.teams.filter(T => !isUser(T.id) && shihai(T.id).length < LIM.shihai && T.payBudget - teamPayroll(T.id, true) > p.fa.ask * 0.9 + p.fa.fee / Math.max(1, p.fa.yrs));
    if (!bids.length) continue;
    const want = clamp((o - 58) / 20, 0, 0.9);
    if (!chance(want)) continue;
    const T = wpick(bids, t => t.market + t.pop / 30 + (teamPower(t.id).total > 63 ? 1 : 0));
    signForeign(p.id, T.id);
  }
}

/* メジャー版：売れ残ったFA・自由契約の選手と、枠の空いた球団が契約する（1年・安めの額） */
function aiFreeAgentsMLB() {
  const t = curTurn();
  for (const T of shuffle(G.teams.slice())) {
    if (isUser(T.id)) continue;
    aiFill40(T.id);
    let n = shihai(T.id).length;
    for (let k = 0; k < 6 && n < 38; k++) {
      const room = T.payBudget - teamPayroll(T.id, t >= 40);
      const c = G.fapool.map(P_).filter(p => p && p.team < 0 && ovr(p) >= 48 && p.age <= 36 && (p.fa ? p.fa.ask : MIN_SAL) <= Math.max(MIN_SAL * 2, room * 0.5)).sort((a, b) => ovr(b) - ovr(a));
      const p = c[0]; if (!p) break;
      G.fapool = G.fapool.filter(x => x !== p.id);
      const sal = roundSal(Math.max(MIN_SAL, p.fa ? p.fa.ask : MIN_SAL));
      addToTeam(p, T.id, 2);
      if (t >= 40) { p.sal = 0; p.ren = { st: 'signed', sal, yrs: 1 }; } else { p.sal = sal; p.yrs = 1; }
      p.fa = null; n++;
      if (ovr(p) >= 68) addNews('contract', `${tShort(T.id)}が${p.name}と1年契約`, {});
    }
  }
}
