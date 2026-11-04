/* =========================================================
   スカウト活動とドラフト会議
   ========================================================= */
const DRAFT_CATS = [['高校', 45], ['大学', 35], ['社会人', 20], ['独立', 10]];
const BONUS = [10000, 7000, 5000, 4000, 3500, 3000, 3000, 3000, 3000, 3000];
const ROOKIE_SAL = [1500, 1200, 1000, 900, 900, 800, 720, 720, 720, 720];

function genSchool(cat, home) {
  if (LG.mlb) return genSchoolMLB(cat, home);
  const pl = pick(PLACES[home]);
  if (cat === '高校') return pl + pick(['高', '第一高', '工業高', '商業高', '学院高', '実業高', '西高', '東高', '中央高', '学園高']);
  if (cat === '大学') return pl + pick(['大', '学院大', '国際大', '経済大', '工業大', '体育大']);
  if (cat === '社会人') return pick(['北辰', '東邦', '大和', '富岳', '白鳳', '三星', '旭日', '常盤', '千代田', '若葉', '瑞穂', '日輪']) + pick(['製鉄', '自動車', '電機', '重工', '化学', 'ガス', '生命', '運輸', '硝子', '紡績']);
  return '独立L・' + pl;
}
function draftValue(p) { return potv(p) * 0.78 + ovr(p) * 0.22 - Math.max(0, p.age - 22) * 1.2; }
function genDraftClass() {
  G.prospects = [];
  const ut = uT(); const acad = G.town ? G.town.stat.academy : 0;
  for (const [cat, n] of DRAFT_CATS) for (let i = 0; i < n; i++) {
    let age, cur, pot;
    if (LG.mlb) {
      if (cat === '高校') { age = 18; pot = clamp(rn(52, 12), 33, 96); cur = clamp(pot - rf(22, 36), 15, 52); }
      else if (cat === '大学') { age = ri(21, 22); pot = clamp(rn(52, 10), 36, 90); cur = clamp(pot - rf(9, 20), 25, 64); }
      else { age = ri(19, 20); pot = clamp(rn(49, 10), 33, 86); cur = clamp(pot - rf(14, 26), 20, 56); }
    }
    else if (cat === '高校') { age = 18; pot = clamp(rn(54, 12), 35, 96); cur = clamp(pot - rf(22, 38), 15, 55); }
    else if (cat === '大学') { age = 22; pot = clamp(rn(54, 10), 38, 90); cur = clamp(pot - rf(10, 22), 25, 65); }
    else if (cat === '社会人') { age = ri(23, 27); pot = clamp(rn(55, 8), 40, 84); cur = clamp(pot - rf(3, 12), 35, 72); }
    else { age = ri(20, 27); pot = clamp(rn(49, 9), 35, 80); cur = clamp(pot - rf(6, 18), 25, 62); }
    const home = wpick([0, 1, 2, 3, 4, 5], i2 => REGION_W[i2]);
    if (acad > 0 && home === ut.region && chance(0.3)) pot = Math.min(96, pot + acad * 2.5);
    const pos = chance(0.47) ? 'P' : wpick(['C', '1B', '2B', '3B', 'SS', 'OF'], x => ({ C: 12, '1B': 8, '2B': 12, '3B': 12, SS: 16, OF: 30 })[x]);
    const p = makePlayer({ pos, pt: pos === 'P' ? (chance(0.55) ? 'SP' : 'RP') : '', age, cur, pot, from: cat, home });
    p.team = -2;
    const hype = clamp(Math.round((pot - 50) * 2.2 + (cur - 40) * 0.8 + rn(0, 12) + (cat === '高校' ? 5 : 0)), 0, 100);
    const noise = {}; for (const k of (isP(p) ? PIT_KEYS : BAT_KEYS)) noise[k] = rn(0, 1); noise.pot = rn(0, 1); noise.ovr = rn(0, 1);
    p.pr = { cat, school: genSchool(cat, home), hype, sc: hype >= 55 ? 12 : 0, noise, pref: null, mark: false, rank: 0, local: acad > 0 && home === ut.region && chance(0.15 * acad) };
    if (hype >= 85 && chance(0.25)) p.pr.pref = wpick(G.teams, t => t.pop + (t.region === home ? 40 : 0)).id;
    G.prospects.push(p);
  }
  maybePhenom();
}

/* ---------- 10年に一度の逸材 ----------
   前に現れてからの年数が長いほど出やすい（平均でおよそ8〜10年に1人） */
function phenomChance() {
  const last = G.genLast != null ? G.genLast : (G.startYear || G.year) - 6;
  const y = G.year - last;
  return y < 4 ? 0.02 : clamp(0.06 + (y - 4) * 0.05, 0.06, 0.6);
}
function phenomOf() { return G.prospects.find(p => p.pr && p.pr.gen) || null; }
function maybePhenom(force) {
  if (!force && (phenomOf() || !chance(phenomChance()))) return null;
  const cat = LG.mlb ? wpick(['高校', '大学'], x => ({ 高校: 55, 大学: 45 })[x]) : wpick(['高校', '大学', '社会人'], x => ({ 高校: 70, 大学: 25, 社会人: 5 })[x]);
  const age = cat === '高校' ? 18 : cat === '大学' ? (LG.mlb ? 21 : 22) : ri(23, 25);
  const pot = rf(95, 99);
  const cur = cat === '高校' ? rf(55, 62) : cat === '大学' ? rf(64, 70) : rf(68, 73);
  const pos = chance(0.5) ? 'P' : wpick(['SS', 'OF', 'C', '3B', '2B'], x => ({ SS: 30, OF: 35, C: 10, '3B': 15, '2B': 10 })[x]);
  const home = LG.mlb ? wpick([0, 1, 2, 3, 4], i => REGION_W[i]) : wpick([0, 1, 2, 3, 4, 5], i => REGION_W[i]);
  const p = makePlayer({ pos, pt: pos === 'P' ? 'SP' : '', age, cur, pot, from: cat, home, gen: true, gt: cat === '高校' ? wpick([1, 2], x => x === 1 ? 60 : 40) : 1 });
  p.team = -2; p.inj = Math.min(p.inj, ri(15, 35));
  const V = velOff();
  if (isP(p)) { p.a.vel = Math.max(p.a.vel, V + rf(cat === '高校' ? 148 : 150, cat === '高校' ? 155 : 157)); p.cap.vel = Math.max(p.cap.vel, V + rf(159, 165)); }
  // 伸びしろが目標に届くまで上限を少しずつ上げる
  for (let i = 0; i < 40 && potv(p) < pot; i++) { const ks = Object.keys(p.cap).filter(k => k === 'vel' ? p.cap.vel < 166 + V : p.cap[k] < 99); if (!ks.length) break; const k = pick(ks); p.cap[k] = Math.min(k === 'vel' ? 166 + V : 99, p.cap[k] + (k === 'vel' ? 1 : 2)); }
  genSkills(p, 1);
  const noise = {}; for (const k of (isP(p) ? PIT_KEYS : BAT_KEYS)) noise[k] = rn(0, 0.5); noise.pot = rn(0, 0.3); noise.ovr = rn(0, 0.5);
  const school = genSchool(cat, home);
  const place = PLACES[home].find(x => school.startsWith(x)) || pick(PLACES[home]);
  p.pr = { cat, school, hype: 100, sc: 30, noise, pref: chance(0.2) ? wpick(G.teams, t => t.pop + (t.region === home ? 40 : 0)).id : null, mark: false, rank: 0, local: false, gen: true, nick: place + 'の怪物' };
  G.prospects.push(p);
  G.genLast = G.year;
  addNews('draft', `「10年に一度の逸材」${school}の${p.name}（${isP(p) ? '投手' : POS_JP[p.pos]}・${p.pr.nick}）に${G.teams.length}球団のスカウトが熱視線`, { important: true, note: 'hi', go: 'scout', pid: p.id });
  return p;
}
/* 夏の大会などでの話題 */
function phenomBuzz(t) {
  const p = phenomOf(); if (!p) return;
  if (LG.mlb) {
    if (t !== 20) return;
    const t2 = p.pr.cat === '高校' ? `全米の高校ランキングで1位に。${isP(p) ? `最速${velNews(p.a.vel + rf(0, 2))}の速球` : '長打力'}にスカウトが集まっています` : `大学の全米選手権で圧巻の活躍。${isP(p) ? `最速${velNews(p.a.vel + rf(0, 2))}` : ri(3, 6) + '本塁打'}を記録しました`;
    addNews('draft', `${p.pr.school}の${p.name}が${t2}。「${p.pr.nick}」はドラフトの目玉です`, { important: true, note: true, go: 'scout', pid: p.id });
    p.pr.sc = Math.max(p.pr.sc, 45);
    return;
  }
  if (t === 29 && p.pr.cat === '高校') {
    const t2 = isP(p) ? `最速${velNews(p.a.vel + rf(0, 2))}を記録` : `${ri(3, 6)}本塁打を放つ`;
    addNews('draft', `夏の甲子園で${p.pr.school}の${p.name}が${t2}。「${p.pr.nick}」の評価はさらに上がっています`, { important: true, note: true, go: 'scout', pid: p.id });
    p.pr.sc = Math.max(p.pr.sc, 45);
  }
  if (t === 22 && p.pr.cat !== '高校') addNews('draft', `${p.pr.school}の${p.name}が日本代表で圧巻の活躍。ドラフトの目玉に`, { important: true, note: true, go: 'scout', pid: p.id });
}
function prospectVisible(p) { return p.pr.sc > 0 || p.pr.hype >= 55; }
function scoutSigma(p) { return 2 + 16 * (1 - p.pr.sc / 100); }
function shownAttr(p, k) { const s = scoutSigma(p); return clamp(Math.round(p.a[k] + (k === 'vel' ? p.pr.noise[k] * s * 0.3 : p.pr.noise[k] * s)), 1, k === 'vel' ? 170 + velOff() : 99); }
function shownOvr(p) { return clamp(Math.round(ovr(p) + p.pr.noise.ovr * scoutSigma(p) * 0.7), 1, 99); }
function shownPot(p) { if (p.pr.sc < 25) return null; return clamp(Math.round(potv(p) + p.pr.noise.pot * (3 + 14 * (1 - p.pr.sc / 100))), 1, 99); }
function userDraftValue(p) { const sp = shownPot(p); return (sp != null ? sp : shownOvr(p) + 12) * 0.78 + shownOvr(p) * 0.22 - Math.max(0, p.age - 22) * 1.2 + (p.pr.mark ? 6 : 0); }

function weeklyScouting() {
  const t = curTurn(); if (t > 38 && !LG.mlb) return;
  if (!G.prospects.length) return;
  const bud = clamp(G.budget.scout / 20000, 0.25, 4);
  const bf = 0.55 + Math.sqrt(bud) * 0.45;
  for (const s of userScouts()) {
    if (s.assign === 'frn') {
      const pool = G.foreign.filter(p => p.pr && p.pr.sc < 100);
      for (let i = 0; i < 2 && pool.length; i++) { const p = pick(pool); p.pr.sc = Math.min(100, p.pr.sc + (6 + s.eye * 0.12) * bf * (1 + G.tfac.analytics.lv * 0.05)); }
      continue;
    }
    const pool = G.prospects.filter(p => p.home === s.assign);
    if (!pool.length) continue;
    const k = Math.round(2 + bud * 0.6);
    for (let i = 0; i < k; i++) {
      const p = wpick(pool, x => (x.pr.mark ? 5 : 1) * (1 + x.pr.hype / 50) * (x.pr.sc >= 100 ? 0 : (110 - x.pr.sc) / 100) + 0.01);
      const gain = (6 + s.eye * 0.12) * bf * rf(0.7, 1.3) * (p.pr.sc === 0 ? 0.6 : 1);
      const was = p.pr.sc;
      p.pr.sc = Math.min(100, p.pr.sc + gain);
      if (was < 100 && p.pr.sc >= 100 && p.pr.mark) notify('draft', `指名候補の${p.name}（${p.pr.school}）の調査が終わりました。能力がほぼ正確にわかります`, { go: 'scout' });
    }
  }
  // アマチュア選手も少しずつ成長
  if (t % 2 === 0) for (const p of G.prospects) growPlayer(p, { mult: 0.5, team: null });
}

/* ---------- AIの見立て ---------- */
function aiKnows(p, tid) { return p.pr.hype >= 35 || hash2(p.id, tid * 13 + 5) < 0.55; }
function aiView(p, tid) { const sig = p.pr.hype >= 60 ? 5 : 11; return draftValue(p) + (hash2(p.id, tid) - 0.5) * 2 * sig + aiNeedBonus(tid, p) + (p.pr.gen ? 40 : 0); }
function aiNeedBonus(tid, p) {
  const r = shihai(tid);
  const np = r.filter(isP).length, nb = r.length - np;
  const half = LG.mlb ? 32 : 33;
  let b = isP(p) ? (np < half ? 3 : -1) : (nb < half ? 3 : -1);
  if (!isP(p)) { const same = r.filter(x => x.pos === p.pos).length; if (p.pos === 'C' && same < 4) b += 3; if (p.pos === 'SS' && same < 3) b += 2; }
  return b;
}
function waiverOrder() {
  return G.teams.slice().sort((a, b) => pctOf(a.rec) - pctOf(b.rec) || a.rec.w - b.rec.w).map(t => t.id);
}

/* ---------- ドラフト会議の進行 ---------- */
function startDraft() {
  if (LG.mlb) {
    const ord = G.draftOrder && G.draftOrder.y === G.year ? G.draftOrder.order.slice() : mlbDraftOrder(true).order;
    G.draft = { stage: 'rounds', round: 1, picks: [], r1log: [], pending: [], order: ord, idx: 0, stopped: {}, userStop: false, ik: false, finished: false, maxRound: LG.draftRounds || 8, mlb: true };
    for (const T of G.teams) T.dPicks = 0;
    return;
  }
  G.draft = { stage: 'r1', round: 1, picks: [], r1log: [], pending: G.teams.map(t => t.id), order: waiverOrder(), idx: 0, stopped: {}, userStop: false, ik: false, finished: false, maxRound: 10 };
  for (const T of G.teams) T.dPicks = 0;
}
function availableProspects() { const taken = new Set(G.draft.picks.map(x => x.pid)); return G.prospects.filter(p => !taken.has(p.id)); }
function aiChoose(tid) {
  let av = availableProspects().filter(p => aiKnows(p, tid));
  // 逸材の1位入札は球団の判断が分かれる（およそ3分の2が入札）
  if (G.draft.stage === 'r1') av = av.filter(p => !p.pr.gen || hash2(p.id, tid * 3 + 1) < 0.65 || G.draft.r1log.length);
  if (!av.length) return null;
  return maxBy(av, p => aiView(p, tid) + (G.draft.ik ? -potv(p) * 0.1 : 0));
}
function draftR1(userPid) {
  const D = G.draft; const ut = G.user.tid;
  const choices = {};
  for (const tid of D.pending.slice()) {
    if (tid === ut) { if (userPid != null) choices[tid] = userPid; else D.pending = D.pending.filter(t => t !== tid); }
    else { const p = aiChoose(tid); if (p) choices[tid] = p.id; else D.pending = D.pending.filter(t => t !== tid); }
  }
  const byP = {};
  for (const tid in choices) { const pid = choices[tid]; (byP[pid] = byP[pid] || []).push(+tid); }
  const round = { picks: [] };
  for (const pid in byP) {
    const ts = byP[pid];
    const win = ts.length > 1 ? pick(ts) : ts[0];
    round.picks.push({ pid: +pid, teams: ts, win });
    const gp = G.prospects.find(x => x.id === +pid);
    if (gp && gp.pr.gen) addNews('draft', `「10年に一度の逸材」${gp.name}に${ts.length > 1 ? ts.length + '球団が競合。抽選の結果' : '単独指名で'}${tName(win)}が交渉権を獲得`, { important: true, tid: win, note: ts.includes(ut) ? 'hi' : true, pid: gp.id });
    D.picks.push({ round: 1, tid: win, pid: +pid, ik: false, lot: ts.length > 1 ? ts : null });
    G.teams[win].dPicks++;
    D.pending = D.pending.filter(t => t !== win);
  }
  D.r1log.push(round);
  if (!D.pending.length) { D.stage = 'rounds'; D.round = 2; D.order = waiverOrder(); D.idx = 0; }
  return round;
}
function aiWantsMore(tid) {
  const T = G.teams[tid]; const D = G.draft;
  if (D.mlb) return true;
  if (D.ik) { const ik = rosterLv(tid, 3).length + G.draft.picks.filter(x => x.tid === tid && x.ik).length; return ik < 14 && T.ikPicks < (T.market >= 4 ? 4 : 2); }
  const projected = shihai(tid).length + T.dPicks - 7;
  return T.dPicks < 8 && projected < 70 && (T.dPicks < 5 || chance(0.6));
}
/* 自分の番まで進める。戻り値: 'user' | 'done' */
function draftAdvance() {
  const D = G.draft; const ut = G.user.tid;
  if (D.stage === 'r1') return D.pending.includes(ut) ? 'user' : (draftR1(null), draftAdvance());
  let guard = 0;
  while (guard++ < 500) {
    if (D.stage === 'done') return 'done';
    if (D.idx >= D.order.length) {
      D.round++; if (!D.mlb) D.order.reverse(); D.idx = 0;
      const allStop = G.teams.every(t => D.stopped[t.id]);
      if (D.round > D.maxRound || allStop) {
        if (!D.ik && !D.mlb) { D.ik = true; D.round = 1; D.stopped = {}; D.order = waiverOrder(); D.idx = 0; D.userStop = false; for (const T of G.teams) T.ikPicks = 0; D.maxRound = 6; continue; }
        D.stage = 'done'; return 'done';
      }
    }
    const tid = D.order[D.idx];
    if (D.stopped[tid]) { D.idx++; continue; }
    if (tid === ut) { if (D.userStop) { D.stopped[tid] = true; D.idx++; continue; } return 'user'; }
    if (!aiWantsMore(tid)) { D.stopped[tid] = true; D.idx++; continue; }
    const p = aiChoose(tid);
    if (!p) { D.stopped[tid] = true; D.idx++; continue; }
    D.picks.push({ round: D.round, tid, pid: p.id, ik: D.ik, no: D.picks.length + 1 });
    if (D.ik) G.teams[tid].ikPicks++; else G.teams[tid].dPicks++;
    D.idx++;
  }
  return 'done';
}
function userDraftPick(pid) {
  const D = G.draft; const ut = G.user.tid;
  if (D.stage === 'r1') return draftR1(pid);
  if (D.order[D.idx] !== ut) return null;
  D.picks.push({ round: D.round, tid: ut, pid, ik: D.ik, no: D.picks.length + 1 });
  if (D.ik) G.teams[ut].ikPicks = (G.teams[ut].ikPicks || 0) + 1; else G.teams[ut].dPicks++;
  D.idx++;
  return true;
}
function userDraftStop() { const D = G.draft; D.userStop = true; D.stopped[G.user.tid] = true; D.idx++; }
function autoUserDraft() {
  let guard = 0;
  while (G.draft.stage !== 'done' && guard++ < 400) {
    const st = draftAdvance();
    if (st === 'done') break;
    const ut = G.user.tid;
    const av = availableProspects().filter(prospectVisible);
    const mine = G.draft.picks.filter(x => x.tid === ut && x.ik === G.draft.ik).length;
    const room = LIM.shihai - shihai(ut).length + 6;
    if (G.draft.stage === 'r1') { const p = maxBy(av, userDraftValue) || maxBy(availableProspects(), draftValue); draftR1(p ? p.id : null); continue; }
    if (G.draft.mlb) { if (!av.length) { userDraftStop(); continue; } }
    else if ((G.draft.ik && mine >= 2) || (!G.draft.ik && (mine >= 6 || mine >= room)) || !av.length) { userDraftStop(); continue; }
    userDraftPick(maxBy(av, userDraftValue).id);
  }
  finishDraft();
}
function finishDraft() {
  const D = G.draft; if (D.finished) return;
  if (D.mlb) return finishDraftMLB();
  D.finished = true;
  const ut = G.user.tid;
  for (const pk of D.picks) {
    const p = G.prospects.find(x => x.id === pk.pid); if (!p) continue;
    pk.name = p.name; pk.school = p.pr.school; pk.pos = p.pos;
    let refuse = 0.01 + (p.pr.cat === '社会人' || p.pr.cat === '大学' ? 0.015 : 0);
    if (p.pr.pref != null && p.pr.pref !== pk.tid) refuse += p.pr.gen ? 0.3 : 0.45;
    if (pk.tid === ut) { const sc = userScouts().find(s => s.assign === p.home); refuse *= (p.pr.sc >= 80 ? 0.3 : 1) * (sc ? 1.2 - sc.nego / 100 : 1); if (p.pr.local) refuse = 0; }
    if (chance(refuse)) { pk.refused = true; if (pk.tid === ut) addNews('draft', `${pk.round}位指名の${p.name}（${p.pr.school}）が入団を拒否しました`, { important: true, tid: ut, note: 'hi' }); else if (p.pr.gen) addNews('draft', `逸材の${p.name}が${tShort(pk.tid)}への入団を拒否`, { important: true }); continue; }
    const r = Math.min(9, pk.round - 1);
    const bonus = pk.ik ? 300 : BONUS[r];
    const sal = pk.ik ? 400 : ROOKIE_SAL[r];
    p.team = -1; G.players[p.id] = p;
    p.join = G.year + 1; p.dr = { y: G.year, r: pk.round, ik: pk.ik, t: pk.tid };
    addToTeam(p, pk.tid, pk.ik ? 3 : 2);
    p.sal = 0; p.ren = { st: 'signed', sal, yrs: 1, rookie: true };
    p.mor = 70; p.pop = clamp(Math.round(p.pr.hype * 0.4), 0, 60);
    p.orig = pk.tid;
    if (pk.tid === ut) book('exp', 'bonus', bonus);
    p.prInfo = { school: p.pr.school, cat: p.pr.cat, hype: p.pr.hype, nick: p.pr.nick || '' };
    if (p.pr.gen) {
      p.gen = true; p.pop = Math.max(p.pop, 60);
      const T = G.teams[pk.tid]; T.pop = clamp(T.pop + 2, 0, 99); T.fans += 3;
      if (pk.tid === ut) { G.flags.goodsWeeks = 4; G.flags.goodsBoost = 0.2; notify('draft', `「${p.pr.nick}」${p.name}が入団に合意！ ファンの期待が高まり、グッズの注文が殺到しています`, { pid: p.id, note: 'hi', go: 'roster' }); }
    }
    delete p.pr;
  }
  const mine = D.picks.filter(x => x.tid === ut && !x.refused);
  addNews('draft', `ドラフト会議終了。支配下${mine.filter(x => !x.ik).length}人・育成${mine.filter(x => x.ik).length}人と入団合意しました`, { important: true, tid: ut });
  const first = D.picks.filter(x => x.round === 1 && !x.ik);
  const ln = first.map(x => { const p = P_(x.pid) || G.prospects.find(y => y.id === x.pid); return tShort(x.tid) + '：' + (p ? p.name : '?'); }).join(' ／ ');
  addNews('draft', `各球団の1位指名 ${ln}`, {});
  G.prospects = [];
}

/* メジャー版：7月のドラフト。指名した選手はすぐにマイナー契約で入団し、契約金は指名順で決まる */
function finishDraftMLB() {
  const D = G.draft; D.finished = true;
  const ut = G.user.tid; let bonusSum = 0;
  for (const pk of D.picks) {
    const p = G.prospects.find(x => x.id === pk.pid); if (!p) continue;
    pk.name = p.name; pk.school = p.pr.school; pk.pos = p.pos;
    let refuse = 0.01 + (p.pr.cat === '高校' && pk.round >= 3 ? 0.12 : 0) + (p.pr.cat === '短大' ? 0.03 : 0);
    if (p.pr.pref != null && p.pr.pref !== pk.tid) refuse += 0.05;
    if (pk.tid === ut) { const sc = userScouts().find(s => s.assign === p.home); refuse *= (p.pr.sc >= 80 ? 0.4 : 1) * (sc ? 1.2 - sc.nego / 100 : 1); if (p.pr.local) refuse = 0; }
    if (p.pr.gen) refuse = Math.min(refuse, 0.02);
    if (chance(refuse)) {
      pk.refused = true;
      if (pk.tid === ut) addNews('draft', `${pk.round}巡目に指名した${p.name}（${p.pr.school}）は契約せず、${p.pr.cat === '高校' ? '大学へ進学します' : '来年のドラフトを待ちます'}`, { important: true, tid: ut, note: 'hi' });
      continue;
    }
    const no = pk.no || 1;
    const bonus = roundSal(mlbSlot(no) * (p.pr.gen ? 1.3 : rf(0.85, 1.05)));
    pk.bonus = bonus;
    p.team = -1; G.players[p.id] = p;
    p.join = G.year; p.dr = { y: G.year, r: pk.round, ik: false, t: pk.tid, no };
    addToTeam(p, pk.tid, 3);
    p.sal = MIN_SAL_IK; p.yrs = 6; p.ren = null; p.svc = 0;
    p.mor = 72; p.pop = clamp(Math.round(p.pr.hype * 0.35), 0, 55);
    p.orig = pk.tid;
    if (pk.tid === ut) { book('exp', 'bonus', bonus); bonusSum += bonus; }
    p.prInfo = { school: p.pr.school, cat: p.pr.cat, hype: p.pr.hype, nick: p.pr.nick || '' };
    if (p.pr.gen) {
      p.gen = true; p.pop = Math.max(p.pop, 60);
      const T = G.teams[pk.tid]; T.pop = clamp(T.pop + 2, 0, 99); T.fans += 3;
      if (pk.tid === ut) { G.flags.goodsWeeks = 4; G.flags.goodsBoost = 0.2; notify('draft', `「${p.pr.nick}」${p.name}が契約に合意！ ファンの期待が高まり、グッズの注文が殺到しています`, { pid: p.id, note: 'hi', go: 'roster' }); }
    }
    delete p.pr;
  }
  const mine = D.picks.filter(x => x.tid === ut && !x.refused);
  addNews('draft', `ドラフト終了。${mine.length}人とマイナー契約を結びました（契約金 計${fmtOku(bonusSum)}）`, { important: true, tid: ut });
  const first = D.picks.filter(x => x.round === 1).slice(0, 5);
  addNews('draft', `1巡目の上位指名　${first.map(x => `${x.no}位 ${tShort(x.tid)}：${x.name || '?'}`).join(' ／ ')}`, {});
  const over = rosterLv(ut, 3).length - LIM.ikusei;
  if (over > 0) notify('contract', `マイナー契約の選手が${LIM.ikusei}人の上限を${over}人超えています。2月までに整理しないと、評価の低い選手から自動で放出されます`, { go: 'contracts', note: 'hi' });
  G.prospects = [];
  genDraftClass();
}
