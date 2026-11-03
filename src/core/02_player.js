/* =========================================================
   選手：生成・能力・評価・年俸
   能力は1〜100（60が1軍平均）。球速のみkm/h
   ========================================================= */
const BAT_KEYS = ['con', 'pow', 'eye', 'spd', 'arm', 'fld'];
const PIT_KEYS = ['vel', 'ctl', 'brk', 'sta'];
const ATTR_JP = { con: 'ミート', pow: 'パワー', eye: '選球眼', spd: '走力', arm: '肩力', fld: '守備', vel: '球速', ctl: '制球', brk: '変化球', sta: 'スタミナ' };
const MIN_SAL = 440, MIN_SAL_IK = 240;
const GT = [{ n: '早熟', g: 24, p: 27 }, { n: '普通', g: 27, p: 30 }, { n: '晩成', g: 29, p: 33 }];
const POS_DEFW = { C: .40, SS: .36, '2B': .30, CF: .26, '3B': .24, OF: .20, LF: .16, RF: .18, '1B': .12, DH: 0 };
const ARCH = {
  C: { con: -3, pow: 0, eye: 0, spd: -10, arm: 9, fld: 7 },
  '1B': { con: 3, pow: 10, eye: 3, spd: -9, arm: -6, fld: -6 },
  '2B': { con: 3, pow: -8, eye: 1, spd: 6, arm: -3, fld: 7 },
  '3B': { con: 0, pow: 5, eye: 0, spd: -2, arm: 6, fld: 2 },
  SS: { con: -1, pow: -9, eye: 0, spd: 7, arm: 6, fld: 10 },
  OF: { con: 1, pow: 3, eye: 0, spd: 6, arm: 2, fld: 0 }
};

function isP(p) { return p.pos === 'P'; }
function velScore(v) { return clamp((v - 122) * 2.5, 0, 100); }
function batOvr(a, pos) {
  const off = a.con * .40 + a.pow * .36 + a.eye * .12 + a.spd * .12;
  const def = a.fld * .65 + a.arm * .35;
  const w = POS_DEFW[pos] === undefined ? .2 : POS_DEFW[pos];
  return off * (1 - w) + def * w;
}
function pitOvr(a, t) {
  const vs = velScore(a.vel);
  return t === 'RP' ? vs * .32 + a.ctl * .26 + a.brk * .38 + a.sta * .04 : vs * .25 + a.ctl * .25 + a.brk * .32 + a.sta * .18;
}
function ovr(p) { return Math.round(isP(p) ? pitOvr(p.a, p.pt) : batOvr(p.a, p.pos)); }
function potv(p) { return Math.round(isP(p) ? pitOvr(p.cap, p.pt) : batOvr(p.cap, p.pos)); }
function spOvr(p) { return pitOvr(p.a, 'SP'); }
function rpOvr(p) { return pitOvr(p.a, 'RP'); }
function offVal(p) { const a = p.a; return a.con * .40 + a.pow * .36 + a.eye * .12 + a.spd * .12; }
function defVal(p) { return p.a.fld * .65 + p.a.arm * .35; }

function genJpName() {
  for (let i = 0; i < 60; i++) {
    const n = pick(SURNAMES) + ' ' + pick(GIVEN);
    if (!NAMESET.has(n)) { NAMESET.add(n); return n; }
  }
  return pick(SURNAMES) + ' ' + pick(GIVEN) + pick(['之', '郎', '人', '也']);
}
function genFrName() {
  for (let i = 0; i < 60; i++) {
    const n = pick(F_FIRST) + '・' + pick(F_LAST);
    if (!NAMESET.has(n)) { NAMESET.add(n); return n; }
  }
  return pick(F_FIRST) + '・' + pick(F_LAST) + 'Jr.';
}
let NAMESET = new Set();
function lastName(p) { return p.frn ? p.name.split('・').pop() : p.name.split(' ')[0]; }
function pickPers() { const ks = Object.keys(PERS_W); return wpick(ks, k => PERS_W[k]); }

function blankBat() { return { g: 0, pa: 0, ab: 0, r: 0, h: 0, d: 0, t: 0, hr: 0, rbi: 0, bb: 0, hbp: 0, so: 0, sb: 0, cs: 0, sh: 0, sf: 0, gdp: 0, e: 0, pos: {} }; }
function blankPit() { return { g: 0, gs: 0, w: 0, l: 0, sv: 0, hld: 0, outs: 0, bf: 0, h: 0, hr: 0, bb: 0, hbp: 0, so: 0, r: 0, er: 0, cg: 0, sho: 0, qs: 0, np: 0 }; }

function makePlayer(o) {
  const frn = !!o.frn;
  const pos = o.pos;
  const p = {
    id: G.nid++, name: frn ? genFrName() : genJpName(), frn, age: o.age, pos, pt: pos === 'P' ? (o.pt || 'SP') : '',
    bats: 'R', thr: 'R', a: {}, cap: {}, gt: o.gt !== undefined ? o.gt : wpick([0, 1, 2], x => [25, 50, 25][x]),
    inj: clamp(Math.round(rn(40, 18)), 5, 95), per: pickPers(), pop: 0, mor: ri(52, 70), form: 0, fat: 0, injW: 0, injN: '',
    sal: MIN_SAL, yrs: 1, svc: 0, num: -1, team: -1, lv: 2, orig: -1, join: G.year, from: o.from || '', home: o.home !== undefined ? o.home : wpick([0, 1, 2, 3, 4, 5], i => REGION_W[i]),
    st: null, car: null, hist: [], focus: '', dr: null, faUsed: 0, wkG: 0, rel: null, ls: -99, adapt: 0, fa: null, ikusei: false,
    note: '', grow: 0, sub: {}, sx: {}, sk: {}, prac: null, gen: !!o.gen
  };
  if (pos === 'P') { p.thr = chance(0.3) ? 'L' : 'R'; p.bats = chance(0.25) ? 'L' : 'R'; }
  else {
    p.thr = (pos === 'C' || pos === '2B' || pos === 'SS' || pos === '3B') ? 'R' : (chance(0.22) ? 'L' : 'R');
    const r = rnd(); p.bats = r < 0.36 ? 'L' : (r < 0.40 ? 'S' : 'R');
    if (p.thr === 'L') p.bats = chance(0.85) ? 'L' : 'R';
  }
  genAttrs(p, o.cur, o.pot);
  genSubs(p);
  genSkills(p, o.gen ? 1 : 0);
  p.st = isP(p) ? blankPit() : blankBat();
  p.car = isP(p) ? blankPit() : blankBat();
  return p;
}

function genAttrs(p, cur, pot) {
  pot = Math.max(pot, cur);
  const g = pot - cur;
  if (isP(p)) {
    const rp = p.pt === 'RP';
    const a = { vel: clamp(145 + (cur - 60) * 0.30 + rn(0, 3.2) + (rp ? 2 : 0), 126, 162), ctl: cur + rn(0, 9), brk: cur + rn(0, 9), sta: rp ? cur - 16 + rn(0, 8) : cur + 8 + rn(0, 8) };
    for (let i = 0; i < 4; i++) { const d = cur - pitOvr(a, p.pt); a.ctl += d * 0.8; a.brk += d * 0.8; a.sta += d * 0.5; }
    for (const k of ['ctl', 'brk', 'sta']) a[k] = clamp(a[k], 5, 99);
    const c = {
      vel: clamp(a.vel + g * 0.24 + Math.abs(rn(0, 1.5)), a.vel, 165),
      ctl: clamp(a.ctl + g + rn(0, 4), a.ctl, 99), brk: clamp(a.brk + g + rn(0, 4), a.brk, 99), sta: clamp(a.sta + g * 0.9 + rn(0, 4), a.sta, 99)
    };
    p.a = a; p.cap = c;
  } else {
    const ar = ARCH[p.pos]; const a = {};
    for (const k of BAT_KEYS) a[k] = cur + ar[k] + rn(0, 9);
    for (let i = 0; i < 4; i++) { const d = cur - batOvr(a, p.pos); for (const k of BAT_KEYS) a[k] += d; }
    for (const k of BAT_KEYS) a[k] = clamp(a[k], 5, 99);
    const c = {};
    for (const k of BAT_KEYS) c[k] = clamp(a[k] + g * (k === 'spd' ? 0.6 : 1) + rn(0, 4), a[k], 99);
    p.a = a; p.cap = c;
  }
}

/* 年俸の目安（能力ベース） */
function valueSalary(o) { const s = 1400 * Math.exp((o - 45) * 0.105); return s > 50000 ? 50000 + (s - 50000) * 0.35 : s; }
function roundSal(s) { return s >= 10000 ? Math.round(s / 500) * 500 : Math.round(s / 10) * 10; }
function marketSalary(p) {
  let s = valueSalary(ovr(p));
  s *= clamp(0.35 + p.svc * 0.11, 0.35, 1.0);
  if (p.frn) s *= 1.25;
  if (p.age >= 35) s *= 0.8;
  if (p.team >= 0 && G.teams[p.team]) s *= 0.88 + G.teams[p.team].market * 0.05;
  return roundSal(Math.max(p.lv === 3 ? MIN_SAL_IK : MIN_SAL, s));
}

/* 選手の価値（トレード・AI判断用） tidを渡すとそのチームの見立て（ポテンシャルに誤差） */
function pVal(p, tid) {
  const o = ovr(p);
  let pt = potv(p);
  if (tid !== undefined) pt += (hash2(p.id, tid + 7) - 0.5) * 12;
  let v = Math.pow(Math.max(0, o - 35), 1.7);
  if (p.age <= 27) { const room = Math.max(0, pt - o); v += Math.pow(room, 1.3) * (p.age <= 22 ? 2.2 : p.age <= 25 ? 1.6 : 0.9); }
  if (p.age >= 31) v *= Math.max(0.25, 1 - (p.age - 30) * 0.08);
  const fair = valueSalary(o);
  v -= Math.max(0, p.sal - fair) / 1000 * 0.8 * Math.max(1, p.yrs);
  if (p.injW > 8) v *= 0.8;
  return Math.max(0, v);
}

function mainPos(p) {
  if (isP(p)) return 'P';
  const m = p.st && p.st.pos; let best = null, bv = 0;
  if (m) for (const k in m) if (m[k] > bv) { bv = m[k]; best = k; }
  if (best) return best;
  return p.pos === 'OF' ? 'CF' : p.pos;
}
function potGrade(p) { return grade(potv(p)); }
function formArrow(f) { return ['↓', '↘', '→', '↗', '↑'][f + 2]; }
function formName(f) { return ['絶不調', '不調', '普通', '好調', '絶好調'][f + 2]; }
function handStr(p) { return (p.thr === 'L' ? '左' : '右') + '投' + (p.bats === 'L' ? '左' : p.bats === 'S' ? '両' : '右') + '打'; }
function displayName(p) { return p.name; }
function velStr(v) { return Math.round(v) + 'km/h'; }
