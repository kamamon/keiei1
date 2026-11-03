/* =========================================================
   サブポジション・特殊能力・特別練習
   p.sub  = { '2B': 2 }       本職以外に守れる位置（1=△ 2=○ 3=◎）
   p.sx   = { '2B': 61 }      その位置の経験（公式戦で守る・練習で増える）
   p.sk   = { chance: 2, power: 1 }  特殊能力（段階つきは -3〜+3＝G〜A。ほかは 1）
   p.prac = { k: 'sub'|'sk', key, xp }  特別練習（自球団の選手）
   ========================================================= */

/* ---------- サブポジション ---------- */
const SUB_KEYS = ['C', '1B', '2B', '3B', 'SS', 'OF'];
const SUB_FIT = [0, 0.86, 0.93, 0.98];
const SUB_MARK = ['', '△', '○', '◎'];
const SUB_LVN = ['', 'こなせる', '上手', '本職並み'];
const SUB_NEED = [0, 18, 50, 100];
const SUB_GEN = {
  C: { '1B': .14, '3B': .05, OF: .03 },
  '1B': { OF: .30, '3B': .18, C: .03 },
  '2B': { SS: .45, '3B': .30, OF: .20, '1B': .12 },
  '3B': { '1B': .40, SS: .20, '2B': .22, OF: .18 },
  SS: { '2B': .55, '3B': .45, OF: .14, '1B': .08 },
  OF: { '1B': .30, '3B': .05, '2B': .05 }
};
function subKey(slot) { return slot === 'LF' || slot === 'CF' || slot === 'RF' ? 'OF' : slot; }
function subLv(p, slot) { const k = subKey(slot); return (p.sub && p.sub[k]) || 0; }
function subNeed(k, lv) { return SUB_NEED[clamp(lv, 0, 3)] * (k === 'C' ? 1.6 : 1); }
function subLvFromXp(k, xp) { let l = 0; for (let i = 1; i <= 3; i++) if (xp >= subNeed(k, i)) l = i; return l; }
function canCatch(p) { return p.pos === 'C' || subLv(p, 'C') > 0; }
function setSub(p, k, lv) {
  p.sub = p.sub || {}; p.sx = p.sx || {};
  if (lv > 0 && k !== p.pos) { p.sub[k] = lv; p.sx[k] = subNeed(k, lv); }
  else { delete p.sub[k]; delete p.sx[k]; }
}
function genSubs(p) {
  p.sub = {}; p.sx = {};
  if (isP(p)) return;
  const row = SUB_GEN[p.pos] || {}; const ageF = clamp(0.75 + (p.age - 18) * 0.035, 0.75, 1.3);
  for (const k in row) {
    if (!chance(row[k] * ageF)) continue;
    const lv = wpick([1, 2, 3], x => (p.age >= 27 ? [35, 40, 25] : [52, 35, 13])[x - 1]);
    p.sub[k] = lv;
    p.sx[k] = Math.round(subNeed(k, lv) + (lv < 3 ? rf(0, (subNeed(k, lv + 1) - subNeed(k, lv)) * 0.6) : 0));
  }
}
/* 公式戦や練習で経験を積む。新しい段階に上がったらその段階を返す */
function addSubXp(p, k, x) {
  if (isP(p) || k === p.pos || k === 'DH') return 0;
  p.sx = p.sx || {}; p.sub = p.sub || {};
  p.sx[k] = (p.sx[k] || 0) + x;
  const lv = subLvFromXp(k, p.sx[k]);
  if (lv > (p.sub[k] || 0)) { p.sub[k] = lv; return lv; }
  return 0;
}
function subList(p) { return SUB_KEYS.filter(k => p.sub && p.sub[k]).map(k => ({ k, lv: p.sub[k] })); }
function subStr(p, sep) { return subList(p).map(x => POS_S[x.k] + SUB_MARK[x.lv]).join(sep === undefined ? '' : sep); }
function subLearned(p, k, lv) {
  if (p.team >= 0 && G.user && isUser(p.team)) notify('dev', `${p.name}が${POS_JP[k]}の守備を覚えました（${SUB_MARK[lv]} ${SUB_LVN[lv]}）`, { pid: p.id, go: 'training' });
}

/* ---------- 特殊能力 ---------- */
/* c: lv＝段階つき（G〜A）、b＝プラス、r＝マイナス、au＝金（特別）
   t: b＝野手、p＝投手、a＝両方。up＝この能力の上位版になる能力 */
const SKILLS = {
  chance: { n: 'チャンス', c: 'lv', t: 'b', d: '得点圏に走者がいるときの打撃' },
  vsL: { n: '対左投手', c: 'lv', t: 'b', d: '左投手との対戦での打撃' },
  steal: { n: '盗塁', c: 'lv', t: 'b', d: '盗塁を試みる回数と成功率' },
  run: { n: '走塁', c: 'lv', t: 'b', d: '安打で次の塁まで進めるか' },
  throw: { n: '送球', c: 'lv', t: 'b', d: '送球の確かさ（失策と守備力）' },
  catcher: { n: 'キャッチャー', c: 'lv', t: 'b', pos: 'C', d: '捕手として投手の力を引き出すリード' },
  pinch: { n: '対ピンチ', c: 'lv', t: 'p', d: '得点圏に走者を背負ったときの投球' },
  vsLB: { n: '対左打者', c: 'lv', t: 'p', d: '左打者との対戦での投球' },
  nobi: { n: 'ノビ', c: 'lv', t: 'p', d: '直球のノビ。空振りが取れ、長打を打たれにくい' },
  quick: { n: 'クイック', c: 'lv', t: 'p', d: '走者を出したときの盗塁の防ぎやすさ' },
  tough: { n: '打たれ強さ', c: 'lv', t: 'p', d: '失点したあとに崩れにくいか' },
  recover: { n: '回復', c: 'lv', t: 'p', d: '連投や登板のあとの回復の早さ' },
  power: { n: 'パワーヒッター', c: 'b', t: 'b', d: '本塁打が出やすい' },
  avg: { n: 'アベレージヒッター', c: 'b', t: 'b', d: '安打になりやすい打球を打つ' },
  wide: { n: '広角打法', c: 'b', t: 'b', d: '逆方向にも打ち返し、安打が増える' },
  infhit: { n: '内野安打○', c: 'b', t: 'b', d: '足を生かして内野ゴロを安打にする' },
  eyeK: { n: '粘り打ち', c: 'b', t: 'b', x: ['strikeout'], d: '追い込まれても三振しにくい' },
  bunt: { n: 'バント○', c: 'b', t: 'b', d: '送りバントを決めやすい' },
  walkoff: { n: 'サヨナラ男', c: 'b', t: 'b', d: '9回以降の接戦のホームゲームで打撃力が上がる' },
  kk: { n: '奪三振', c: 'b', t: 'p', d: '三振を奪いやすい' },
  kire: { n: 'キレ○', c: 'b', t: 'p', d: '変化球のキレがよく、芯で捉えられにくい' },
  heavy: { n: '重い球', c: 'b', t: 'p', x: ['light'], d: '長打を打たれにくい' },
  lowball: { n: '低め○', c: 'b', t: 'p', d: '低めに集め、ゴロを打たせる' },
  late: { n: '尻上がり', c: 'b', t: 'p', sp: true, x: ['slow'], d: '7回以降に球威が増す（先発）' },
  holdball: { n: '球持ち○', c: 'b', t: 'p', d: '打者が球を見極めにくく、制球が安定する' },
  tempo: { n: 'テンポ○', c: 'b', t: 'p', d: '投球のテンポがよく、守備のリズムがよくなる' },
  mood: { n: 'ムード○', c: 'b', t: 'a', x: ['moodX'], d: 'チーム全体のやる気を高める' },
  strikeout: { n: '三振', c: 'r', t: 'b', x: ['eyeK'], d: '三振が多い' },
  gdp: { n: '併殺', c: 'r', t: 'b', d: '併殺打になりやすい' },
  error: { n: 'エラー', c: 'r', t: 'b', d: '守備で失策しやすい' },
  walk: { n: '四球', c: 'r', t: 'p', x: ['machine'], d: '四球を出しやすい' },
  hrX: { n: '一発', c: 'r', t: 'p', x: ['monster'], d: '本塁打を浴びやすい' },
  light: { n: '軽い球', c: 'r', t: 'p', x: ['heavy', 'monster'], d: '打球を遠くへ飛ばされやすい' },
  shaky: { n: '乱調', c: 'r', t: 'p', d: 'ときどき制球を大きく乱す' },
  slow: { n: 'スロースターター', c: 'r', t: 'p', sp: true, x: ['late'], d: '立ち上がりに不安がある（先発）' },
  moodX: { n: 'ムード×', c: 'r', t: 'a', x: ['mood'], d: 'チームのやる気を下げる' },
  swing: { n: '調子極端', c: 'r', t: 'a', d: '調子の波が激しい' },
  artist: { n: 'アーチスト', c: 'au', t: 'b', up: 'power', d: '本塁打を量産する（パワーヒッターの上位）' },
  hitman: { n: '安打製造機', c: 'au', t: 'b', up: 'avg', d: '安打を打つ天才（アベレージヒッターの上位）' },
  clutch: { n: '勝負師', c: 'au', t: 'b', up: 'chance', d: '得点圏で無類の強さを見せる（チャンスの上位）' },
  laser: { n: 'レーザービーム', c: 'au', t: 'b', up: 'throw', d: '強く正確な送球で走者を止める（送球の上位）' },
  thief: { n: '電光石火', c: 'au', t: 'b', up: 'steal', d: '次々に盗塁を決める（盗塁の上位）' },
  drk: { n: 'ドクターK', c: 'au', t: 'p', up: 'kk', d: '三振の山を築く（奪三振の上位）' },
  machine: { n: '精密機械', c: 'au', t: 'p', x: ['walk'], d: '針の穴を通す制球' },
  monster: { n: '怪物球威', c: 'au', t: 'p', up: 'heavy', x: ['light', 'hrX'], d: '打者を力でねじ伏せる球威（重い球の上位）' },
  ironarm: { n: '鉄腕', c: 'au', t: 'p', up: 'recover', d: '連投も長いイニングも苦にしない（回復の上位）' },
  ace: { n: '強心臓', c: 'au', t: 'p', up: 'pinch', d: 'ピンチでこそ力を発揮する（対ピンチの上位）' }
};
const SK_CLS = { lv: '段階つき', b: 'プラス', r: 'マイナス', au: '金' };
function gradeL(v) { return 'GFEDCBA'[clamp(Math.round(v), -3, 3) + 3]; }
function skOk(p, k) {
  const d = SKILLS[k]; if (!d) return false;
  if (d.t !== 'a' && (d.t === 'p') !== isP(p)) return false;
  if (d.pos && p.pos !== d.pos) return false;
  if (d.sp && p.pt !== 'SP') return false;
  return true;
}
/* 守備位置や先発・救援が変わったら、合わない能力を外す */
function pruneSkills(p) {
  const s = p.sk || (p.sk = {});
  for (const k of Object.keys(s)) if (!skOk(p, k) || !s[k]) delete s[k];
  p._fx = null;
}
function hasUpper(p, k) { const s = p.sk || {}; for (const g in s) if (SKILLS[g] && SKILLS[g].up === k) return true; return false; }
function setSkill(p, k, v) {
  const s = p.sk || (p.sk = {}); const d = SKILLS[k]; if (!d) return;
  if (!v) delete s[k];
  else {
    s[k] = d.c === 'lv' ? clamp(Math.round(v), -3, 3) : 1;
    for (const x of d.x || []) delete s[x];
    if (d.up) delete s[d.up];
  }
  if (s[k] === 0) delete s[k];
  p._fx = null;
}
function genSkills(p, boost) {
  boost = boost || 0;
  const s = {}; const a = p.a;
  const lvG = (k, mu) => { const v = clamp(Math.round(rn(mu || 0, 0.62)), -3, 3); if (v) s[k] = v; };
  const has = (k, pr) => { if (chance(clamp(pr, 0, 0.95))) s[k] = 1; };
  if (!isP(p)) {
    lvG('chance', 0.05 + boost * 0.6); lvG('vsL', 0); lvG('steal', (a.spd - 62) / 13); lvG('run', (a.spd - 62) / 16);
    lvG('throw', (a.arm - 60) / 16 + (a.fld - 60) / 30);
    if (p.pos === 'C') lvG('catcher', 0.15 + (a.fld - 60) / 40);
    has('power', a.pow >= 80 ? .5 : a.pow >= 72 ? .22 : .02);
    has('avg', a.con >= 80 ? .45 : a.con >= 72 ? .2 : .02);
    has('wide', a.con >= 70 ? .16 : .05);
    has('infhit', a.spd >= 75 ? .45 : a.spd >= 65 ? .18 : .02);
    has('eyeK', a.eye >= 75 ? .35 : a.eye >= 65 ? .12 : .03);
    has('bunt', (p.pos === '2B' || p.pos === 'SS' || a.con < 58) ? .15 : .04);
    has('walkoff', .03);
    has('strikeout', a.con <= 48 ? .4 : a.con <= 56 ? .18 : a.pow >= 75 ? .14 : .03);
    has('gdp', a.spd <= 42 ? .35 : a.spd <= 50 ? .15 : .03);
    has('error', a.fld <= 45 ? .35 : a.fld <= 52 ? .15 : .03);
  } else {
    const stf = velScore(a.vel) * 0.45 + a.brk * 0.55;
    lvG('pinch', 0.05 + boost * 0.6); lvG('vsLB', p.thr === 'L' ? 0.3 : 0); lvG('nobi', (a.vel - 148) / 7); lvG('quick', 0); lvG('tough', 0);
    lvG('recover', p.pt === 'RP' ? 0.3 : 0);
    has('kk', stf >= 75 ? .45 : stf >= 66 ? .2 : .03);
    has('kire', a.brk >= 78 ? .4 : a.brk >= 68 ? .15 : .03);
    has('heavy', a.vel >= 152 ? .2 : .06);
    has('lowball', a.ctl >= 75 ? .35 : a.ctl >= 65 ? .14 : .03);
    if (p.pt === 'SP') { has('late', .1); has('slow', .1); }
    has('holdball', .08); has('tempo', .07);
    has('walk', a.ctl <= 45 ? .45 : a.ctl <= 55 ? .2 : .03);
    has('hrX', a.vel < 142 ? .2 : .08); has('light', .07); has('shaky', a.ctl <= 50 ? .15 : .04);
  }
  has('mood', p.per === 'leader' ? .5 : p.per === 'passion' ? .15 : .04);
  has('moodX', p.per === 'money' ? .07 : .02);
  has('swing', p.per === 'shy' ? .3 : p.per === 'genius' ? 0 : .06);
  // 両立しない組み合わせは片方だけ残す
  for (const k of Object.keys(s)) { const d = SKILLS[k]; if (!s[k] || !d.x) continue; for (const x of d.x) if (s[x]) delete s[chance(0.5) ? k : x]; }
  p.sk = s; p._fx = null;
  const o = ovr(p);
  const gp = boost >= 1 ? 1 : o >= 85 ? .55 : o >= 80 ? .35 : o >= 76 ? .15 : o >= 72 ? .05 : 0;
  if (gp && chance(gp)) giveGold(p);
  if (boost >= 1 && chance(.3)) giveGold(p);
  pruneSkills(p);
}
/* 金の能力の候補（その選手の持ち味に合うもの） */
function goldFor(p, needBase) {
  const s = p.sk || {};
  const a = {}; for (const k in p.a) a[k] = Math.max(p.a[k], (p.cap && p.cap[k] != null ? p.cap[k] : p.a[k]) - (k === 'vel' ? 3 : 8));
  const w2 = v => Math.pow(Math.max(1, v - 58), 2);
  const c = isP(p)
    ? [['drk', w2(velScore(a.vel) * 0.45 + a.brk * 0.55)], ['machine', w2(a.ctl)], ['monster', w2(velScore(a.vel))], ['ironarm', p.pt === 'RP' ? 250 : w2(a.sta) * 0.6], ['ace', 120]]
    : [['artist', w2(a.pow)], ['hitman', w2(a.con)], ['thief', w2(a.spd)], ['laser', w2((a.arm + a.fld) / 2)], ['clutch', 120]];
  const ok = c.filter(([k]) => !s[k] && skOk(p, k) && (!needBase || !SKILLS[k].up || (s[SKILLS[k].up] || 0) >= 1 || k === 'machine'));
  if (!ok.length) return null;
  return wpick(ok, x => x[1])[0];
}
function giveGold(p, k) {
  k = k || goldFor(p); if (!k) return null;
  setSkill(p, k, 1);
  return k;
}
/* ケガしにくさは「故障のしやすさ」から段階で表す */
function duraGrade(p) { const i = p.inj; return i <= 20 ? 3 : i <= 30 ? 2 : i <= 38 ? 1 : i < 62 ? 0 : i < 74 ? -1 : i < 86 ? -2 : -3; }
function duraToInj(g) { return [92, 80, 68, 50, 34, 26, 15][clamp(g, -3, 3) + 3]; }
/* 表示用の一覧（金→プラス→マイナスの順） */
function skItems(p) {
  const s = p.sk || {}; const out = [];
  for (const k in SKILLS) {
    const v = s[k]; if (!v) continue; const d = SKILLS[k];
    if (d.c === 'lv') out.push({ k, n: d.n, lbl: d.n + gradeL(v), cls: v > 0 ? 'pos' : 'neg', v, d: d.d, ord: v > 0 ? 1 : 3 });
    else out.push({ k, n: d.n, lbl: d.n, cls: d.c === 'au' ? 'au' : d.c === 'b' ? 'pos' : 'neg', v: 1, d: d.d, ord: d.c === 'au' ? 0 : d.c === 'b' ? 2 : 4 });
  }
  const dg = duraGrade(p);
  if (dg) out.push({ k: 'dura', n: 'ケガしにくさ', lbl: 'ケガしにくさ' + gradeL(dg), cls: dg > 0 ? 'pos' : 'neg', v: dg, d: '故障のしやすさ（故障の起きやすさと重さ）', ord: dg > 0 ? 1 : 3 });
  return out.sort((x, y) => x.ord - y.ord || (y.v - x.v));
}
function skCount(p) { const c = { au: 0, pos: 0, neg: 0 }; for (const x of skItems(p)) c[x.cls]++; return c; }

/* 試合で使う効果（選手ごとに計算して持っておく。能力が変わったら _fx を消す） */
function skFx(p) {
  if (p._fx) return p._fx;
  const s = p.sk || {};
  const g = k => s[k] || 0;
  const f = {
    chance: s.clutch ? 4.5 : g('chance'), vsL: g('vsL'), steal: s.thief ? 4 : g('steal'), run: g('run'), thr: s.laser ? 4 : g('throw'), cat: g('catcher'),
    pinch: s.ace ? 5 : g('pinch'), vsLB: g('vsLB'), nobi: g('nobi'), quick: g('quick'), tough: g('tough'), rec: s.ironarm ? 3 : g('recover'),
    bk: 1, bhr: 1, bab: 0, bcon: 0, inf: !!s.infhit, bunt: s.bunt ? 0.09 : 0, wo: !!s.walkoff, gdp: s.gdp ? 0.10 : 0, err: s.error ? 1.8 : s.laser ? 0.7 : 1,
    pk: 1, pbb: 1, phr: 1, pbab: 0, go: 0, st: 0, ct: 0, late: !!s.late, slow: !!s.slow, shaky: !!s.shaky, tempo: !!s.tempo, iron: !!s.ironarm,
    mood: (s.mood ? 1 : 0) - (s.moodX ? 1 : 0), swing: !!s.swing, laser: !!s.laser, thief: !!s.thief
  };
  if (s.power) f.bhr *= 1.12; if (s.artist) f.bhr *= 1.25;
  if (s.avg) { f.bab += 0.010; f.bcon += 0.02; } if (s.hitman) { f.bab += 0.022; f.bcon += 0.05; }
  if (s.wide) f.bab += 0.008;
  if (s.eyeK) f.bk *= 0.9; if (s.strikeout) f.bk *= 1.12;
  if (s.kk) f.pk *= 1.10; if (s.drk) f.pk *= 1.22;
  if (s.kire) { f.pk *= 1.05; f.pbab -= 0.006; }
  if (s.heavy) f.phr *= 0.88; if (s.monster) { f.phr *= 0.85; f.st += 0.12; }
  if (s.lowball) { f.phr *= 0.93; f.go += 0.05; }
  if (s.holdball) f.ct += 0.05;
  if (s.machine) { f.pbb *= 0.7; f.ct += 0.12; }
  if (s.walk) f.pbb *= 1.18;
  if (s.hrX) f.phr *= 1.15;
  if (s.light) { f.phr *= 1.08; f.pbab += 0.004; }
  return (p._fx = f);
}

/* ---------- 年ごとの変化（若手は覚え、ベテランは失う） ---------- */
function skGainCand(p) {
  const a = p.a; const s = p.sk || {}; const c = [];
  const add = (k, w) => { if (!s[k] && skOk(p, k) && !hasUpper(p, k) && !(SKILLS[k].x || []).some(x => s[x])) c.push([k, w]); };
  if (!isP(p)) {
    if (a.pow >= 68) add('power', a.pow - 60); if (a.con >= 68) add('avg', a.con - 60); if (a.spd >= 65) add('infhit', a.spd - 58);
    if (a.eye >= 62) add('eyeK', a.eye - 55); add('wide', 6); add('bunt', 4); add('walkoff', 2);
  } else {
    const stf = velScore(a.vel) * 0.45 + a.brk * 0.55;
    if (stf >= 62) add('kk', stf - 55); if (a.brk >= 64) add('kire', a.brk - 58); if (a.ctl >= 62) add('lowball', a.ctl - 56);
    if (a.vel >= 147) add('heavy', 8); add('holdball', 5); add('tempo', 4); if (p.pt === 'SP') add('late', 4);
  }
  add('mood', p.per === 'leader' ? 12 : 2);
  return c.length ? wpick(c, x => x[1])[0] : null;
}
function skLvCand(p, dir) {
  const s = p.sk || {};
  const ks = Object.keys(SKILLS).filter(k => SKILLS[k].c === 'lv' && skOk(p, k) && !hasUpper(p, k) && (dir > 0 ? (s[k] || 0) < 2 : (s[k] || 0) > 0));
  return ks.length ? pick(ks) : null;
}
function skillEvolve(p, user) {
  const out = []; const s = p.sk || (p.sk = {}); const age = p.age; const o = ovr(p);
  const young = age <= 26, mid = age <= 31, old = age >= 33;
  const cf = user ? 0.8 + coach(isP(p) ? 'pit' : 'bat') / 250 : 1;
  const gain = (young ? 0.3 : mid ? 0.14 : 0.04) * cf * (p.gen ? 1.5 : 1) * (p.lv === 1 ? 1.2 : 0.8);
  if (chance(gain)) { const k = skGainCand(p); if (k) { setSkill(p, k, 1); out.push({ k, t: 'gain' }); } }
  if (chance((young ? 0.3 : mid ? 0.18 : 0.08) * cf)) { const k = skLvCand(p, 1); if (k) { setSkill(p, k, (s[k] || 0) + 1); out.push({ k, t: 'up', v: s[k] || 0 }); } }
  if (old && chance(0.25)) { const k = skLvCand(p, -1); if (k) { setSkill(p, k, s[k] - 1); out.push({ k, t: 'down', v: s[k] || 0 }); } }
  const reds = Object.keys(s).filter(k => SKILLS[k] && SKILLS[k].c === 'r');
  if (reds.length && chance((young ? 0.25 : mid ? 0.15 : 0.06) * cf)) { const k = pick(reds); setSkill(p, k, 0); out.push({ k, t: 'fix' }); }
  if (old && chance(0.18)) { const bl = Object.keys(s).filter(k => SKILLS[k] && SKILLS[k].c === 'b'); if (bl.length) { const k = pick(bl); setSkill(p, k, 0); out.push({ k, t: 'lose' }); } }
  if (o >= 82 && chance(p.gen ? 0.25 : o >= 88 ? 0.1 : 0.05)) { const k = goldFor(p, true); if (k) { giveGold(p, k); out.push({ k, t: 'gold' }); } }
  if (old && chance(0.08)) { const k = isP(p) ? pick(['hrX', 'light', 'shaky']) : pick(['strikeout', 'gdp']); if (!s[k] && skOk(p, k) && !(SKILLS[k].x || []).some(x => s[x])) { setSkill(p, k, 1); out.push({ k, t: 'bad' }); } }
  pruneSkills(p);
  return out;
}
function skChangeText(p, c) {
  const n = SKILLS[c.k] ? SKILLS[c.k].n : c.k;
  switch (c.t) {
    case 'gain': return `「${n}」を身につけた`;
    case 'gold': return `金の特殊能力「${n}」に目覚めた`;
    case 'up': return `「${n}」が${gradeL(c.v)}に上がった`;
    case 'down': return `「${n}」が${gradeL(c.v)}に下がった`;
    case 'fix': return `弱点の「${n}」を克服した`;
    case 'lose': return `「${n}」が消えた`;
    case 'bad': return `「${n}」がついてしまった`;
  }
  return n;
}
/* 12月：全球団の選手の特殊能力が少し入れ替わる */
function skillYearly() {
  const lines = [];
  for (const T of G.teams) for (const p of roster(T.id)) {
    const ch = skillEvolve(p, isUser(T.id));
    if (isUser(T.id) && ch.length) lines.push({ p, ch });
  }
  const good = lines.filter(x => x.ch.some(c => c.t === 'gain' || c.t === 'gold' || c.t === 'up' || c.t === 'fix'));
  for (const x of lines.slice(0, 8)) notify('dev', `${x.p.name}：${x.ch.map(c => skChangeText(x.p, c)).join('、')}`, { pid: x.p.id, go: 'training', note: x.ch.some(c => c.t === 'gold') ? 'hi' : true });
  if (lines.length > 8) notify('dev', `ほかに${lines.length - 8}人の特殊能力が変わりました（育成・練習の画面で確認できます）`, { go: 'training' });
  return good.length;
}

/* ---------- 特別練習（サブポジション・特殊能力） ---------- */
const PRAC_NEED = { up: [30, 30, 30, 36, 45], gain: 45, fix: 35 };
function pracNeed(p) {
  const P = p.prac; if (!P) return 0;
  if (P.k === 'sub') { const lv = (p.sub && p.sub[P.key]) || 0; return subNeed(P.key, lv + 1); }
  const d = SKILLS[P.key]; const v = (p.sk && p.sk[P.key]) || 0;
  if (d.c === 'lv') return PRAC_NEED.up[clamp(v + 3, 0, 4)];
  return d.c === 'r' ? PRAC_NEED.fix : PRAC_NEED.gain;
}
/* いまの練習がどこまで進んだか（0〜1） */
function pracProgress(p) {
  const P = p.prac; if (!P) return 0;
  if (P.k === 'sub') { const lv = (p.sub && p.sub[P.key]) || 0; const a = subNeed(P.key, lv), b = subNeed(P.key, lv + 1); return clamp((((p.sx && p.sx[P.key]) || 0) - a) / Math.max(1, b - a), 0, 1); }
  return clamp(P.xp / Math.max(1, pracNeed(p)), 0, 1);
}
function pracLabel(p) {
  const P = p.prac; if (!P) return '';
  if (P.k === 'sub') { const lv = (p.sub && p.sub[P.key]) || 0; return `${POS_JP[P.key]}の守備（${lv ? SUB_MARK[lv] : 'なし'}→${SUB_MARK[lv + 1]}）`; }
  const d = SKILLS[P.key]; const v = (p.sk && p.sk[P.key]) || 0;
  if (d.c === 'lv') return `${d.n}（${gradeL(v)}→${gradeL(v + 1)}）`;
  return d.c === 'r' ? `「${d.n}」を直す` : `「${d.n}」を覚える`;
}
/* 選べる練習の一覧 */
function pracOptions(p) {
  const out = []; const s = p.sk || {};
  if (!isP(p)) for (const k of SUB_KEYS) { if (k === p.pos) continue; const lv = (p.sub && p.sub[k]) || 0; if (lv < 3) out.push({ v: 'sub:' + k, g: 'サブポジション', l: `${POS_JP[k]}（${lv ? '今' + SUB_MARK[lv] : 'まだ守れない'}）` }); }
  for (const k in SKILLS) {
    const d = SKILLS[k]; if (!skOk(p, k) || d.c === 'au' || hasUpper(p, k)) continue;
    const v = s[k] || 0;
    if (d.c === 'lv' && v < 2) out.push({ v: 'sk:' + k, g: '特殊能力を伸ばす', l: `${d.n} ${gradeL(v)}→${gradeL(v + 1)}` });
    else if (d.c === 'b' && !v && !(d.x || []).some(x => s[x])) out.push({ v: 'sk:' + k, g: '特殊能力を覚える', l: d.n });
    else if (d.c === 'r' && v) out.push({ v: 'sk:' + k, g: '弱点を直す', l: `「${d.n}」を直す` });
  }
  return out;
}
function setPractice(p, v) {
  if (!v) { p.prac = null; return; }
  const [k, key] = v.split(':');
  if (p.prac && p.prac.k === k && p.prac.key === key) return;
  p.prac = { k, key, xp: 0 };
}
/* 1週間の練習で積む経験 */
function pracGain(p) {
  const t = curTurn(); const P = p.prac;
  let g = t >= 4 && t <= 7 ? 3.0 : (t === 41 || t === 42) && G.fallCamp && G.fallCamp.on && p.age <= 25 ? 2.5 : (t >= 40 || t <= 3) ? 0.6 : 1.0;
  let role = 'fld';
  if (P.k === 'sk') { const d = SKILLS[P.key]; role = d.t === 'p' ? 'pit' : ['steal', 'run', 'throw', 'catcher', 'infhit', 'error', 'bunt'].includes(P.key) ? 'fld' : 'bat'; }
  g *= 0.75 + coach(role) / 100 * 0.5;
  g *= p.age <= 22 ? 1.3 : p.age <= 26 ? 1.1 : p.age <= 30 ? 0.9 : 0.7;
  g *= p.per === 'hard' ? 1.2 : p.per === 'genius' ? 1.3 : p.per === 'mypace' ? 0.85 : 1;
  if (p.injW > 0) g *= 0.3;
  return g;
}
function weeklyPractice() {
  const ut = G.user.tid;
  for (const p of roster(ut)) {
    const P = p.prac; if (!P) continue;
    if (P.k === 'sub') {
      if (isP(p) || P.key === p.pos) { p.prac = null; continue; }
      const lv = addSubXp(p, P.key, pracGain(p));
      if (lv) { subLearned(p, P.key, lv); if (lv >= 3) { p.prac = null; } }
      continue;
    }
    const d = SKILLS[P.key]; if (!d || !skOk(p, P.key)) { p.prac = null; continue; }
    P.xp += pracGain(p);
    if (P.xp < pracNeed(p)) continue;
    const v = (p.sk && p.sk[P.key]) || 0; P.xp = 0;
    if (d.c === 'lv') {
      setSkill(p, P.key, v + 1);
      notify('dev', `${p.name}の特別練習が実り、「${d.n}」が${gradeL(v + 1)}に上がりました`, { pid: p.id, go: 'training' });
      if (v + 1 >= 2) p.prac = null;
    } else if (d.c === 'r') {
      setSkill(p, P.key, 0); p.prac = null;
      notify('dev', `${p.name}が特別練習で弱点の「${d.n}」を克服しました`, { pid: p.id, go: 'training' });
    } else {
      setSkill(p, P.key, 1); p.prac = null;
      notify('dev', `${p.name}が特別練習で「${d.n}」を身につけました`, { pid: p.id, go: 'training' });
    }
  }
}
