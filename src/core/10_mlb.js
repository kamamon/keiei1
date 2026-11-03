/* =========================================================
   メジャー挑戦：海外FA・ポスティング・メジャー帰りの選手
   G.mlbTry  = [{ pid, from, how: 'post'|'kfa', wk, fee }]          メジャー球団との交渉中
   G.mlbAway = [{ p, from, y, how, club, yrs, left, log }]           メジャーでプレー中（選手のデータごと保存）
   G.mlb     = [{ name, from, y, how, ovr, pid, club, yrs, st, last }] 記録（st: play／back／ret）
   ========================================================= */
const MLB_CLUBS = ['ニューヨーク・ハーバーキングス', 'ボストン・ベイシャークス', 'ロサンゼルス・サンライダーズ', 'サンフランシスコ・フォグホーンズ', 'シアトル・ノースパインズ', 'シカゴ・レイクウルブズ',
  'ダラス・デザートホークス', 'アトランタ・ピーチフライヤーズ', 'デンバー・サミッツ', 'マイアミ・コーラルウェーブス', 'フェニックス・カクタスジャックス', 'ミネアポリス・ツインレイクス'];
const KFA_YEARS = 9;
const HOW_JP = { post: 'ポスティング', kfa: '海外FA' };
function kfaNeed(p) { return p.faUsed ? p.faUsed + 4 : KFA_YEARS; }
function kfaEligible(p) { return !p.frn && p.svc >= kfaNeed(p) && p.yrs <= 1 && !(p.ren && p.ren.st === 'signed') && p.lv !== 3; }
/* メジャー球団が獲得に動く見込み（0〜1） */
function mlbInterest(p) {
  const o = ovr(p);
  let c = (o - 64) / 16;
  if (isP(p)) c += 0.05;
  if (p.age > 29) c -= (p.age - 29) * 0.06;
  if (p.gen) c += 0.2;
  return clamp(c, 0.02, 0.97);
}
function interestLabel(c) { return c >= 0.8 ? '非常に高い' : c >= 0.55 ? '高い' : c >= 0.3 ? 'そこそこ' : c >= 0.12 ? '低い' : 'ほとんどない'; }
function postingFeeEst(p) { return roundSal(clamp(valueSalary(ovr(p)) * 4 * (p.gen ? 1.5 : 1) * (p.age <= 25 ? 1.2 : p.age >= 30 ? 0.75 : 1), 20000, 400000)); }
function postingFee(p) { return roundSal(postingFeeEst(p) * rf(0.8, 1.25)); }
function mlbTrying(p) { return !!p && (G.mlbTry || []).some(x => x.pid === p.id); }
function mlbYears(p) { return p.age <= 26 ? ri(4, 6) : p.age <= 30 ? ri(2, 5) : ri(1, 3); }

/* 自球団の選手をポスティングにかけられるか（だめな理由を返す） */
function postingCheck(p) {
  const t = curTurn();
  if (!p || !isUser(p.team)) return '自球団の選手ではありません';
  if (!(t >= 40 && t <= 45)) return 'ポスティングの申請は11月第1週〜12月第2週です';
  if (p.frn) return '外国人選手は対象外です';
  if (p.lv === 3) return '育成選手は対象外です';
  if (p.svc >= kfaNeed(p)) return '海外FA権を持っているので、ポスティングは使えません';
  if (mlbTrying(p)) return 'すでにメジャー球団と交渉中です';
  if (p.postFail === G.year) return '今オフはすでに挑戦して残留が決まりました';
  if (p.postAsk === G.year) return '今オフは本人がメジャー挑戦を望んでいません';
  if (p.age >= 36) return '年齢的にメジャー球団の関心が見込めません';
  return '';
}
/* 本人がメジャー挑戦を望む見込み */
function mlbWill(p) { return p.per === 'mlb' ? 1 : clamp(0.25 + (ovr(p) - 70) * 0.03 + (p.age <= 27 ? 0.1 : 0), 0.05, 0.8); }
function userPosting(p) {
  const why = postingCheck(p); if (why) return { ok: false, why };
  if (!chance(mlbWill(p))) { p.postAsk = G.year; return { ok: false, why: `${p.name}は「まず日本で結果を残したい」と、メジャー挑戦を望みませんでした` }; }
  startMLB(p, 'post');
  return { ok: true };
}
function startMLB(p, how) {
  G.mlbTry = G.mlbTry || [];
  if (mlbTrying(p)) return;
  const fee = how === 'post' ? postingFee(p) : 0;
  const wk = ri(2, 4);
  G.mlbTry.push({ pid: p.id, from: p.team, how, wk, fee });
  if (isUser(p.team)) notify('mlb', `${p.name}の${HOW_JP[how]}でのメジャー挑戦が始まりました。メジャー球団との交渉の結果は${wk}週間ほどで出ます`, { pid: p.id, go: 'fa' });
  else if (ovr(p) >= 72) addNews('mlb', `${tShort(p.team)}の${p.name}が${HOW_JP[how]}でメジャー挑戦へ`, { tid: p.team });
}
/* 毎週：交渉の結果を出す（12月第4週までにすべて決まる） */
function weeklyMLB() {
  if (!G.mlbTry || !G.mlbTry.length) return;
  const t = curTurn();
  for (const x of G.mlbTry.slice()) {
    const p = P_(x.pid);
    if (!p || p.team !== x.from) { G.mlbTry = G.mlbTry.filter(y => y !== x); continue; }
    x.wk--;
    if (x.wk > 0 && t < 47) continue;
    G.mlbTry = G.mlbTry.filter(y => y !== x);
    if (chance(mlbInterest(p))) leaveToMLB(p, HOW_JP[x.how], x.fee);
    else mlbFail(p, x);
  }
}
function mlbFail(p, x) {
  p.mor = clamp(p.mor - 12, 0, 100); p.postFail = G.year;
  if (x.how === 'kfa' && !(p.ren && p.ren.st === 'signed')) p.ren = { st: 'signed', sal: roundSal(Math.max(p.sal, calcDemand(p))), yrs: 1 };
  const t = `${p.name}は${x.how === 'post' ? '交渉期限までにメジャー球団と合意できず' : 'メジャー球団と条件が折り合わず'}、${tShort(p.team)}に残ることになりました`;
  if (isUser(p.team)) notify('mlb', t, { pid: p.id, note: 'hi', go: 'fa' });
  else addNews('mlb', t, { tid: p.team });
}
function leaveToMLB(p, how, fee) {
  const from = p.team;
  if (fee && isUser(from)) book('rev', 'transfer', fee);
  const club = pick(MLB_CLUBS); const yrs = mlbYears(p);
  G.mlb.push({ name: p.name, from, y: G.year, how, ovr: ovr(p), pid: p.id, club, yrs, st: 'play', fee: fee || 0 });
  addNews('mlb', `${tShort(from)}の${p.name}が${how}で${club}へ（${yrs}年契約${fee ? '・譲渡金' + fmtOku(fee) : ''}）`, { important: isUser(from) || ovr(p) >= 78, tid: from, note: isUser(from) ? 'hi' : false, go: 'records', tab: 'mlb' });
  removeFromTeam(p);
  delete G.players[p.id];
  p.ren = null; p.fa = null; p.lv = 2; p.prac = null; p.mlbFrom = from;
  G.mlbAway = G.mlbAway || [];
  G.mlbAway.push({ p, from, y: G.year, how, club, yrs, left: yrs, log: [] });
}
/* メジャーでの1年の成績（記録用のざっくりした数字） */
function mlbLine(p) {
  const o = ovr(p);
  if (isP(p)) {
    const era = clamp(4.6 - (o - 70) * 0.09 + rn(0, 0.45), 1.6, 7.5);
    if (p.pt === 'SP') { const gs = Math.round(clamp(8 + (o - 62) * 1.1 + rn(0, 3), 0, 33)); const w = Math.max(0, Math.round(gs * (0.42 + (4.2 - era) * 0.05) + rn(0, 1.5))); return `${gs}先発 ${w}勝 防御率${era.toFixed(2)}`; }
    const g = Math.round(clamp(20 + (o - 62) * 2 + rn(0, 6), 5, 75)); const sv = o >= 78 ? Math.round(rf(10, 40)) : 0;
    return `${g}登板${sv ? ' ' + sv + 'セーブ' : ''} 防御率${era.toFixed(2)}`;
  }
  const g = Math.round(clamp(40 + (o - 62) * 5 + rn(0, 12), 10, 160));
  const av = clamp(0.235 + (p.a.con - 70) * 0.0025 + rn(0, 0.018), 0.17, 0.34);
  const hr = Math.max(0, Math.round(g / 150 * (p.a.pow - 50) * 0.75 + rn(0, 3)));
  return `${g}試合 打率${fmtAvg(av)} ${hr}本塁打`;
}
/* 11月第1週：メジャーのシーズンを終えた選手の去就。日本に戻る選手を返す */
function mlbSeasonEnd() {
  const back = [];
  for (const m of (G.mlbAway || []).slice()) {
    if (m.y >= G.year) continue;
    const p = m.p;
    for (let i = 0; i < 44; i++) growPlayer(p, { mult: 1, team: null, season: 1 });
    skillEvolve(p, false);
    const line = mlbLine(p); const o = ovr(p);
    m.log.push({ y: G.year, club: m.club, line, ovr: o });
    const rec = G.mlb.find(r => r.pid === p.id && r.st === 'play');
    if (rec) rec.last = line;
    m.left--;
    let ret = false, home = false;
    if (m.left <= 0) {
      if (p.age >= 38 || (p.age >= 35 && o < 62) || o < 50) ret = true;
      else if (o < 72 || chance(0.35)) home = true;
      else { m.left = ri(1, 3); if (chance(0.3)) m.club = pick(MLB_CLUBS); if (rec) rec.club = m.club; }
    } else if (o < 66 && chance(0.3)) home = true;
    if (!ret && !home) continue;
    G.mlbAway = G.mlbAway.filter(x => x !== m);
    if (ret) {
      if (rec) { rec.st = 'ret'; rec.ry = G.year; }
      addNews('mlb', `メジャーでプレーした${p.name}（元${tShort(m.from)}）が現役を引退`, { tid: m.from, note: isUser(m.from) ? true : false, go: 'records', tab: 'mlb' });
    } else { if (rec) { rec.st = 'back'; rec.by = G.year; } back.push(m); }
  }
  return back;
}
/* メジャー帰りの選手をFA市場に出す（declareFA の中から呼ぶ） */
function mlbReturnToMarket(list) {
  for (const m of list) {
    const p = m.p;
    G.players[p.id] = p; p.team = -1; p.lv = 2; p.yrs = 0; p.ren = null; p.faUsed = p.svc; p.mor = 60;
    const ask = roundSal(Math.max(MIN_SAL, marketSalary(p) * 1.05));
    const askYrs = p.age <= 31 ? ri(2, 4) : ri(1, 2);
    p.fa = { kind: 'fa', from: -4 };
    G.faMarket.push({ id: p.id, from: -4, prev: m.from, rank: 'C', ask, askYrs, offers: {}, done: false, prevSal: p.sal, mlb: true, club: m.club });
    const o = ovr(p);
    addNews('mlb', `${m.club}でプレーした${p.name}（元${tShort(m.from)}）が日本球界への復帰を目指してFA市場へ`, { important: o >= 72, tid: m.from, note: isUser(m.from) ? 'hi' : o >= 72, go: 'fa' });
  }
}
/* 古い記録の名前から、FA市場の「前所属」の表示 */
function faFromLabel(f) { return f.from === -4 ? 'メジャー帰り' : ''; }
