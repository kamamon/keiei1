/* =========================================================
   選手の編集（エディット）と、新しい選手の作成
   画面では写し（下書き）を編集し、保存したときに選手へ反映する
   ========================================================= */
const ATTR_RANGE = { vel: [110, 170] };
function attrRange(k) { return ATTR_RANGE[k] || [1, 99]; }
function editDraft(p) {
  return {
    id: p.id, name: p.name, num: p.num, age: p.age, thr: p.thr, bats: p.bats, pos: p.pos, pt: p.pt || 'SP',
    a: Object.assign({}, p.a), cap: Object.assign({}, p.cap), sub: Object.assign({}, p.sub || {}), sk: Object.assign({}, p.sk || {}),
    gt: p.gt, per: p.per, inj: p.inj, pop: Math.round(p.pop || 0), mor: Math.round(p.mor || 0), frn: !!p.frn, gen: !!p.gen,
    sal: p.sal, yrs: p.yrs, svc: p.svc, school: p.pr ? p.pr.school : '', hasStats: !!((p.st && p.st.g) || (p.car && p.car.g) || (p.hist && p.hist.length)), wasP: isP(p)
  };
}
/* 下書きの守備位置を投手⇔野手で入れ替えたときに、能力の形を作り直す */
function draftSwitchType(d, pos) {
  const ref = { pos, pt: pos === 'P' ? (d.pt || 'SP') : '', a: {}, cap: {} };
  const keys0 = d.pos === 'P' ? PIT_KEYS : BAT_KEYS;
  const cur = Math.round(d.pos === 'P' ? pitOvr(d.a, d.pt) : batOvr(d.a, d.pos));
  const pot = Math.round(d.pos === 'P' ? pitOvr(d.cap, d.pt) : batOvr(d.cap, d.pos));
  genAttrs(ref, clamp(cur, 20, 95), clamp(pot, 20, 99));
  for (const k of keys0) { delete d.a[k]; delete d.cap[k]; }
  d.a = ref.a; d.cap = ref.cap; d.pos = pos; d.sub = {};
  for (const k of Object.keys(d.sk)) if (SKILLS[k] && SKILLS[k].t !== 'a') delete d.sk[k];
}
function editKeys(d) { return d.pos === 'P' ? PIT_KEYS : BAT_KEYS; }
function draftOvr(d) { return Math.round(d.pos === 'P' ? pitOvr(d.a, d.pt) : batOvr(d.a, d.pos)); }
function draftPot(d) { const c = {}; for (const k of editKeys(d)) c[k] = Math.max(d.cap[k], d.a[k]); return Math.round(d.pos === 'P' ? pitOvr(c, d.pt) : batOvr(c, d.pos)); }

function applyEdit(p, d) {
  const msgs = [];
  const name = String(d.name || '').replace(/\s+/g, ' ').trim().slice(0, 16);
  if (!name) return { ok: false, why: '名前を入れてください' };
  if (name !== p.name) { NAMESET.delete(p.name); NAMESET.add(name); p.name = name; }
  const wasP = isP(p), nowP = d.pos === 'P';
  p.age = clamp(Math.round(+d.age || p.age), 15, 50);
  p.thr = d.thr === 'L' ? 'L' : 'R'; p.bats = d.bats === 'L' || d.bats === 'S' ? d.bats : 'R';
  if (wasP !== nowP) {
    p.st = nowP ? blankPit() : blankBat(); p.car = nowP ? blankPit() : blankBat(); p.hist = []; p.preWar = 0; p.ms = null;
    if (p.team >= 0 && isUser(p.team)) cleanManual(p.id);
    msgs.push('投手と野手を入れ替えたので、成績の記録を新しくしました');
  }
  p.pos = POS_JP[d.pos] && d.pos !== 'LF' && d.pos !== 'CF' && d.pos !== 'RF' && d.pos !== 'DH' ? d.pos : p.pos;
  p.pt = isP(p) ? (d.pt === 'RP' ? 'RP' : 'SP') : '';
  const a = {}, c = {};
  for (const k of isP(p) ? PIT_KEYS : BAT_KEYS) {
    const [lo, hi] = attrRange(k);
    a[k] = clamp(+d.a[k] || lo, lo, hi);
    c[k] = clamp(Math.max(+d.cap[k] || 0, a[k]), lo, k === 'vel' ? 172 : 99);
  }
  p.a = a; p.cap = c;
  const sx0 = p.sx || {};
  p.sub = {}; p.sx = {};
  if (!isP(p)) for (const k of SUB_KEYS) {
    const lv = clamp(Math.round(+d.sub[k] || 0), 0, 3);
    if (!lv || k === p.pos) continue;
    p.sub[k] = lv;
    p.sx[k] = clamp(sx0[k] || 0, subNeed(k, lv), lv < 3 ? subNeed(k, lv + 1) - 1 : 1e6);
  }
  p.sk = {};
  for (const k in d.sk) if (d.sk[k] && SKILLS[k]) setSkill(p, k, d.sk[k]);
  pruneSkills(p);
  if (p.prac && ((p.prac.k === 'sub' && (isP(p) || p.prac.key === p.pos)) || (p.prac.k === 'sk' && !skOk(p, p.prac.key)))) p.prac = null;
  p.gt = clamp(Math.round(+d.gt), 0, 2);
  if (PERS[d.per]) p.per = d.per;
  p.inj = clamp(Math.round(+d.inj || 40), 5, 95);
  p.pop = clamp(Math.round(+d.pop || 0), 0, 100);
  p.mor = clamp(Math.round(+d.mor || 0), 0, 100);
  p.frn = !!d.frn; p.gen = !!d.gen;
  if (p.pr && d.school != null && String(d.school).trim()) p.pr.school = String(d.school).trim().slice(0, 20);
  if (p.team >= 0) {
    p.sal = Math.max(p.lv === 3 ? MIN_SAL_IK : MIN_SAL, Math.round(+d.sal || 0));
    p.yrs = clamp(Math.round(+d.yrs || 1), 1, 10);
    p.svc = clamp(Math.round(+d.svc || 0), 0, 30);
    const num = Math.round(+d.num);
    if (isFinite(num) && num !== p.num) {
      const ok = p.lv === 3 ? num >= 100 && num <= 199 : num >= 0 && num <= 99;
      if (!ok) msgs.push(p.lv === 3 ? '育成選手の背番号は100〜199です（変えませんでした）' : '支配下選手の背番号は0〜99です（変えませんでした）');
      else if (isRetiredNum(p.team, num)) msgs.push(`背番号${num}は永久欠番です（変えませんでした）`);
      else {
        const other = roster(p.team).find(x => x !== p && x.num === num);
        const old = p.num; p.num = num;
        if (other) {
          other.num = old >= 0 && ((other.lv === 3) === (old >= 100)) ? old : -1;
          if (other.num < 0) assignNumber(other, other.team);
          msgs.push(`${other.name}の背番号は${numStr(other)}になりました`);
        }
      }
    }
  }
  p._fx = null;
  G.flags.edited = (G.flags.edited || 0) + 1;
  touch();
  return { ok: true, msgs };
}

/* 新しい選手を作る。dest：'u2'（自球団の支配下）／'u3'（自球団の育成）／'t:球団番号'／'free'（自由契約） */
function createPlayer(o) {
  const pos = o.pos && (POS_JP[o.pos] && !['LF', 'CF', 'RF', 'DH'].includes(o.pos)) ? o.pos : 'OF';
  const age = clamp(Math.round(+o.age || 24), 15, 50);
  const cur = clamp(Math.round(+o.cur || 55), 15, 95), pot = Math.max(cur, clamp(Math.round(+o.pot || cur + 6), 15, 99));
  const dest = o.dest || 'u2';
  let tid = -1, lv = 2;
  if (dest === 'u2' || dest === 'u3') { tid = G.user.tid; lv = dest === 'u3' ? 3 : 2; }
  else if (dest.startsWith('t:')) tid = +dest.slice(2);
  if (tid >= 0) {
    if (lv === 2 && shihai(tid).length >= LIM.shihai) return { ok: false, why: `${tName(tid)}の支配下登録が70人に達しています` };
    if (lv === 3 && rosterLv(tid, 3).length >= LIM.ikusei) return { ok: false, why: `育成選手が${LIM.ikusei}人に達しています` };
  }
  const p = makePlayer({ pos, pt: pos === 'P' ? (o.pt === 'RP' ? 'RP' : 'SP') : '', age, cur, pot, from: 'エディット', gt: 1, frn: !!o.frn });
  if (o.name && String(o.name).trim()) { NAMESET.delete(p.name); p.name = String(o.name).trim().slice(0, 16); NAMESET.add(p.name); }
  p.join = G.year; p.mor = 65; p.pop = 5; p.svc = 0;
  G.players[p.id] = p;
  if (tid < 0) {
    p.team = -1; p.fa = { kind: 'free', from: -1, ask: roundSal(Math.max(MIN_SAL, marketSalary(p) * 0.6)), y: G.year };
    G.fapool.push(p.id);
  } else {
    addToTeam(p, tid, lv);
    p.orig = tid; p.sal = lv === 3 ? MIN_SAL_IK : Math.max(MIN_SAL, marketSalary(p)); p.yrs = 1;
  }
  G.flags.edited = (G.flags.edited || 0) + 1;
  touch();
  return { ok: true, p };
}
