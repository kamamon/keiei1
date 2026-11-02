/* =========================================================
   ニュースとイベント（選択肢つきの出来事）
   ========================================================= */
function addNews(type, text, o) {
  o = o || {};
  G.news.unshift({ y: G.year, m: G.month, w: G.week, type, t: text, imp: !!o.important, tid: o.tid === undefined ? -1 : o.tid });
  if (G.news.length > 400) G.news.length = 400;
}
const NEWS_TYPES = { game: '試合', post: 'ポストシーズン', award: '表彰', injury: '故障', dev: '育成', camp: 'キャンプ', draft: 'ドラフト', fa: 'FA・移籍', trade: 'トレード',
  contract: '契約', retire: '引退', biz: '経営', town: '街づくり', staff: 'スタッフ', owner: 'オーナー', event: '出来事', record: '記録', league: 'リーグ' };

function userGameNews(res, g) {
  const ut = G.user.tid; const home = g.h === ut;
  const my = home ? res.hs : res.as, op = home ? res.as : res.hs; const opp = home ? g.a : g.h;
  const r = res.tie ? '引き分け' : my > op ? '勝利' : '敗戦';
  let t = `${tShort(opp)}戦 ${my}-${op}で${r}`;
  const myHr = res.hrs.filter(h => h.tid === ut);
  if (res.walkoff && home && my > op) t = `${tShort(opp)}戦 サヨナラ勝ち（${my}-${op}）`;
  else if (myHr.length) { const b = maxBy(myHr, h => h.n); const p = P_(b.id); if (p) t += `。${p.name}が${b.n === 4 ? '満塁弾' : b.n > 1 ? b.n + 'ラン' : 'ソロ'}（${b.no}号）`; }
  addNews('game', t, { tid: ut });
}
const MILESTONES = { hr: [100, 200, 300, 400, 500], h: [1000, 1500, 2000, 2500], w: [100, 150, 200], sv: [100, 200, 250, 300], so: [1000, 1500, 2000, 2500], hld: [100, 200, 300] };
function milestoneCheck(res) {
  const ids = new Set(res.bp.concat(res.pp.map(x => x.id)));
  for (const id of ids) {
    const p = P_(id); if (!p) continue;
    for (const k in MILESTONES) {
      if ((k === 'hr' || k === 'h') === isP(p)) continue;
      const tot = (p.car[k] || 0) + (p.st[k] || 0);
      for (const m of MILESTONES[k]) {
        const key = k + m;
        if (tot >= m && !(p.ms && p.ms[key])) {
          p.ms = p.ms || {}; p.ms[key] = 1; p.pop = clamp(p.pop + 3, 0, 100);
          const nm = { hr: '通算' + m + '本塁打', h: '通算' + m + '安打', w: '通算' + m + '勝', sv: '通算' + m + 'セーブ', so: '通算' + m + '奪三振', hld: '通算' + m + 'ホールド' }[k];
          addNews('record', `${tShort(p.team)}の${p.name}が${nm}を達成`, { important: isUser(p.team), tid: p.team });
          if (isUser(p.team)) { uT().pop = clamp(uT().pop + 0.5, 0, 99); G.flags.goodsWeeks = 3; }
        }
      }
    }
  }
}

/* ---------- 選択肢つきイベント ---------- */
function queueEvent(id, data) { G.pending.push({ id, data: data || {}, y: G.year, t: curTurn(), age: 0 }); }
function teamMorale(d) { for (const p of roster(G.user.tid)) p.mor = clamp(p.mor + d, 0, 100); }
const EVENTS = {
  tvdoc: {
    t: '密着ドキュメンタリーの打診', w: 1, cond: () => true,
    text: () => '地元テレビ局から、球団の舞台裏に1か月密着する番組を作りたいと連絡がありました。',
    ch: [{ l: '受ける', d: '人気+2、選手のやる気−2', f: () => { uT().pop = clamp(uT().pop + 2, 0, 99); teamMorale(-2); return '放送後、球団の知名度が上がりました。'; } },
      { l: '断る', d: '変化なし', f: () => '今回は見送りました。' }]
  },
  sns: {
    t: '選手のSNSが炎上', w: 1, cond: () => roster(G.user.tid).some(p => p.pop >= 40 && p.lv === 1),
    prep: () => ({ pid: pick(roster(G.user.tid).filter(p => p.pop >= 40 && p.lv === 1)).id }),
    text: d => `${P_(d.pid) ? P_(d.pid).name : '選手'}の不用意な投稿がSNSで批判を集めています。`,
    ch: [{ l: '謝罪会見を開く', d: '人気−1、本人のやる気−8', f: d => { uT().pop = clamp(uT().pop - 1, 0, 99); const p = P_(d.pid); if (p) p.mor = clamp(p.mor - 8, 0, 100); return '誠実な対応で騒動は収まりました。'; } },
      { l: '厳重注意で済ませる', d: '半々の確率で人気−3', f: () => { if (chance(0.5)) { uT().pop = clamp(uT().pop - 3, 0, 99); return '対応が甘いと批判され、人気が下がりました。'; } return '騒動は自然に落ち着きました。'; } },
      { l: '2軍で再調整させる', d: '本人は2軍へ、やる気−15', f: d => { const p = P_(d.pid); if (p && p.team === G.user.tid) { p.lv = p.lv === 3 ? 3 : 2; p.mor = clamp(p.mor - 15, 0, 100); touch(); } return '処分が評価され、批判は収まりました。'; } }]
  },
  idol: {
    t: '人気アイドルが始球式を希望', w: 1, cond: () => curTurn() >= SEASON_START && curTurn() <= SEASON_END,
    text: () => '人気アイドルグループの事務所から、次のホームゲームで始球式をしたいと連絡がありました。出演料は500万円です。',
    ch: [{ l: '受ける（500万円）', d: '人気+1、次の観客が増える', f: () => { book('exp', 'promo', 500); uT().pop = clamp(uT().pop + 1, 0, 99); G.promo.queue.unshift('celeb'); return '始球式の話題で、チケットが売れています。'; } },
      { l: '断る', d: '変化なし', f: () => '丁重にお断りしました。' }]
  },
  noise: {
    t: '近隣住民から騒音の苦情', w: 1, cond: () => !G.stad.dome,
    text: () => '試合中の応援や花火の音について、球場近くの住民から苦情が寄せられています。',
    ch: [{ l: '防音対策工事（1.5億円）', d: '地域の愛着+5', f: () => { book('exp', 'capex', 15000); G.town.attach = clamp(G.town.attach + 5, 0, 100); return '工事で騒音が減り、地域との関係が良くなりました。'; } },
      { l: '鳴り物を控える', d: '満足度が少し下がる', f: () => { G.flags.satBonus = (G.flags.satBonus || 0) - 1; return '応援が少し静かになりました。'; } },
      { l: '様子を見る', d: '地域の愛着−4', f: () => { G.town.attach = clamp(G.town.attach - 4, 0, 100); return '苦情はくすぶり続けています。'; } }]
  },
  shotengai: {
    t: '地元商店街からコラボの提案', w: 1, cond: () => true,
    text: () => '地元の商店街から、優勝セールや選手パネル展示などのコラボ企画を一緒にやりたいと提案がありました。費用は800万円です。',
    ch: [{ l: '協力する（800万円）', d: '地域の愛着+5、ファン増', f: () => { book('exp', 'promo', 800); G.town.attach = clamp(G.town.attach + 5, 0, 100); uT().fans += 3; return '街に球団カラーの旗が並びました。'; } },
      { l: '見送る', d: '変化なし', f: () => '今回は見送りました。' }]
  },
  homesick: {
    t: '外国人選手がホームシック', w: 1, cond: () => roster(G.user.tid).some(p => p.frn && p.lv === 1),
    prep: () => ({ pid: pick(roster(G.user.tid).filter(p => p.frn && p.lv === 1)).id }),
    text: d => `${P_(d.pid) ? P_(d.pid).name : '外国人選手'}が家族と離れて元気がありません。通訳から相談が来ています。`,
    ch: [{ l: '家族を呼び寄せる（1000万円）', d: '本人のやる気+20', f: d => { book('exp', 'other', 1000); const p = P_(d.pid); if (p) { p.mor = clamp(p.mor + 20, 0, 100); p.form = Math.min(2, p.form + 1); } return '家族と再会して笑顔が戻りました。'; } },
      { l: '様子を見る', d: '本人のやる気−12', f: d => { const p = P_(d.pid); if (p) p.mor = clamp(p.mor - 12, 0, 100); return 'しばらく元気がない状態が続きそうです。'; } }]
  },
  parentGood: {
    t: '親会社の業績が好調', w: 0.6, cond: () => true,
    text: () => `${uT().parent}の決算が好調で、球団への追加の支援金3億円が決まりました。`,
    ch: [{ l: 'ありがたく受け取る', d: '資金+3億円', f: () => { book('rev', 'subsidy', 30000); G.owner.trust = clamp(G.owner.trust + 1, 0, 100); return '支援金を受け取りました。'; } }]
  },
  parentBad: {
    t: '親会社の業績が悪化', w: 0.6, cond: () => true,
    text: () => `${uT().parent}の業績が悪化し、球団にも経費削減の協力を求めています。`,
    ch: [{ l: '広告費を半分に減らす', d: 'オーナー信頼+5', f: () => { for (const k in G.ads.lv) G.ads.lv[k] = Math.floor(G.ads.lv[k] / 2); G.owner.trust = clamp(G.owner.trust + 5, 0, 100); return '経費削減に協力し、親会社から感謝されました。'; } },
      { l: '現状維持を求める', d: 'オーナー信頼−5', f: () => { G.owner.trust = clamp(G.owner.trust - 5, 0, 100); return '親会社との関係が少しぎくしゃくしています。'; } }]
  },
  youth: {
    t: '少年野球大会の冠スポンサー', w: 1, cond: () => true,
    text: () => '地元の少年野球大会に球団名を冠したいと依頼がありました。協賛金は600万円です。',
    ch: [{ l: '協賛する（600万円）', d: '地域の愛着+4、ファン増', f: () => { book('exp', 'promo', 600); G.town.attach = clamp(G.town.attach + 4, 0, 100); uT().fans += 2; return '子どもたちが球団の帽子をかぶって大会に臨みました。'; } },
      { l: '見送る', d: '変化なし', f: () => '今回は見送りました。' }]
  },
  anime: {
    t: '人気アニメとのコラボ企画', w: 1, cond: () => true,
    text: () => '人気アニメの制作会社から、コラボグッズとコラボデーの企画が届きました。費用は2000万円です。',
    ch: [{ l: '実施する（2000万円）', d: 'グッズ売上が4週間+30%、人気+2', f: () => { book('exp', 'promo', 2000); G.flags.goodsWeeks = 4; G.flags.goodsBoost = 0.3; uT().pop = clamp(uT().pop + 2, 0, 99); return 'コラボグッズが飛ぶように売れています。'; } },
      { l: '見送る', d: '変化なし', f: () => '今回は見送りました。' }]
  },
  vet: {
    t: 'ベテランが出場機会を求めている', w: 1, cond: () => roster(G.user.tid).some(p => p.lv === 2 && p.age >= 30 && ovr(p) >= 58),
    prep: () => ({ pid: pick(roster(G.user.tid).filter(p => p.lv === 2 && p.age >= 30 && ovr(p) >= 58)).id }),
    text: d => `2軍の${P_(d.pid) ? P_(d.pid).name : 'ベテラン'}が「1軍でもう一度勝負したい」と直訴してきました。`,
    ch: [{ l: '1軍に上げる', d: '本人のやる気+20', f: d => { const p = P_(d.pid); if (p && rosterLv(G.user.tid, 1).length < LIM.first && (!p.frn || firstFrnCount(G.user.tid) < LIM.frn1)) { p.lv = 1; touch(); } if (p) p.mor = clamp(p.mor + 20, 0, 100); return '気合十分で1軍に合流しました。'; } },
      { l: 'もう少し待ってもらう', d: '本人のやる気−12', f: d => { const p = P_(d.pid); if (p) p.mor = clamp(p.mor - 12, 0, 100); return '不満そうな表情を浮かべています。'; } }]
  },
  brewery: {
    t: '地ビールメーカーから限定醸造の提案', w: 0.8, cond: () => curTurn() <= 30,
    text: () => '地元の醸造所から、球団オリジナルの限定ビールを作りたいと提案がありました。初期費用は1000万円です。',
    ch: [{ l: '採用する（1000万円）', d: '今季の飲食売上+5%', f: () => { book('exp', 'promo', 1000); G.flags.foodBoost = 0.05; return '限定ビールが球場の名物になりました。'; } },
      { l: '見送る', d: '変化なし', f: () => '今回は見送りました。' }]
  },
  city: {
    t: '自治体から再開発の協議', w: 0.7, cond: () => G.town.cells.some(c => !c.own && !c.sp),
    text: () => '市役所から、球場周辺の再開発に協力してほしいと打診がありました。協力すれば周辺の土地を1区画、半額で譲ってもらえます。',
    ch: [{ l: '協力する', d: '土地1区画を半額で取得', f: () => { const c = minBy(G.town.cells.filter(c => !c.own && !c.sp), c => Math.abs(c.x - 3) + Math.abs(c.y - 2)); if (c) { const p = Math.round(landPrice(c) / 2); book('exp', 'land', p); c.own = true; return `土地を${fmtOku(p)}で取得しました。`; } return '対象の土地がありませんでした。'; } },
      { l: '見送る', d: '変化なし', f: () => '今回は見送りました。' }]
  },
  mascot: {
    t: 'マスコットがSNSで大人気', w: 0.7, cond: () => true,
    text: () => '球団マスコットのダンス動画が拡散され、全国から問い合わせが殺到しています。',
    ch: [{ l: 'グッズを増産する（800万円）', d: 'グッズ売上が3週間+25%、人気+1', f: () => { book('exp', 'promo', 800); G.flags.goodsWeeks = 3; G.flags.goodsBoost = 0.25; uT().pop = clamp(uT().pop + 1, 0, 99); return 'マスコットグッズが品切れ続出です。'; } },
      { l: 'そのまま見守る', d: '人気+1', f: () => { uT().pop = clamp(uT().pop + 1, 0, 99); return 'マスコットの知名度が上がりました。'; } }]
  },
  breakdown: {
    t: '球場設備の故障', w: 1, cond: () => avg(Object.values(G.stad.fac), f => f.cond) < 70,
    text: () => '老朽化した設備が故障しました。すぐに修理しないと満足度が下がります。修理費は5000万円です。',
    ch: [{ l: 'すぐ修理する（5000万円）', d: '変化なし', f: () => { book('exp', 'maint', 5000); return '修理が完了しました。'; } },
      { l: '応急処置で済ませる', d: '満足度が下がる', f: () => { G.flags.satBonus = (G.flags.satBonus || 0) - 2; return 'お客様から不満の声が上がっています。'; } }]
  },
  posting: {
    t: 'ポスティングでのメジャー挑戦を希望', w: 0, cond: () => false,
    text: d => { const p = P_(d.pid); return `${p ? p.name : '主力選手'}がポスティング制度でのメジャー挑戦を希望しています。容認すれば譲渡金はおよそ${fmtOku(d.fee)}の見込みです。`; },
    ch: [{ l: '容認する', d: '選手は退団し、譲渡金を得る', f: d => { const p = P_(d.pid); if (p && p.team === G.user.tid) { leaveToMLB(p, 'ポスティング', d.fee); return `${p.name}の挑戦を送り出しました。`; } return '対象選手がいませんでした。'; } },
      { l: '認めない', d: '本人のやる気が大きく下がる', f: d => { const p = P_(d.pid); if (p) { p.mor = clamp(p.mor - 25, 0, 100); p.postRef = true; } return '残留を求めました。本人は落胆しています。'; } }]
  },
  tradeOffer: {
    t: 'トレードの打診', w: 0, cond: () => false,
    text: d => { const a = P_(d.want), b = P_(d.give); return `${tName(d.tid)}から、${a ? a.name : '?'}と${b ? b.name : '?'}（${b ? POS_JP[b.pos] + '・' + b.age + '歳・総合' + ovr(b) : ''}）の交換トレードを打診されています。`; },
    ch: [{ l: '応じる', d: 'トレード成立', f: d => { const a = P_(d.want), b = P_(d.give); if (a && b && a.team === G.user.tid && b.team === d.tid && tradeOpen()) { doTrade(d.tid, [a], [b], 0); return 'トレードが成立しました。'; } return '条件が変わり、話は流れました。'; } },
      { l: '断る', d: '変化なし', f: () => 'お断りしました。' }]
  }
};
function maybeRandomEvent() {
  if (G.pending.length >= 2 || !chance(0.16)) return;
  const ks = Object.keys(EVENTS).filter(k => EVENTS[k].w > 0 && EVENTS[k].cond() && !(G.evCool[k] > 0));
  if (!ks.length) return;
  const k = wpick(ks, x => EVENTS[x].w);
  const data = EVENTS[k].prep ? EVENTS[k].prep() : {};
  queueEvent(k, data);
  G.evCool[k] = 20;
}
function resolveEvent(i, ci) {
  const e = G.pending[i]; if (!e) return '';
  const def = EVENTS[e.id]; const c = def.ch[ci] || def.ch[def.ch.length - 1];
  const msg = c.f(e.data) || '';
  addNews('event', `${def.t}：${c.l}。${msg}`, { tid: G.user.tid });
  G.pending.splice(i, 1);
  return msg;
}
function eventsWeekly() {
  for (const k in G.evCool) if (G.evCool[k] > 0) G.evCool[k]--;
  for (const e of G.pending) e.age++;
  // 2週間放置したイベントは無難な選択で自動処理
  for (let i = G.pending.length - 1; i >= 0; i--) if (G.pending[i].age >= 3) { const def = EVENTS[G.pending[i].id]; resolveEvent(i, def.ch.length - 1); }
  if (G.flags.goodsWeeks > 0) { G.flags.goodsWeeks--; if (G.flags.goodsWeeks === 0) G.flags.goodsBoost = 0; }
  maybeRandomEvent();
  maybeTradeOffer();
}
function maybeTradeOffer() {
  if (!tradeOpen() || !chance(0.05) || G.pending.some(e => e.id === 'tradeOffer')) return;
  const ut = G.user.tid;
  const mine = shihai(ut).filter(p => { const v = pVal(p); return v > 120 && v < 520 && p.injW === 0; });
  if (!mine.length) return;
  const want = pick(mine);
  const T = pick(G.teams.filter(t => t.id !== ut));
  const target = pVal(want, T.id);
  const cands = shihai(T.id).filter(p => p.injW === 0 && isP(p) !== isP(want) || (p.injW === 0 && p.pos !== want.pos)).filter(p => { const v = pVal(p, T.id); return v > target * 0.85 && v < target * 1.1; });
  if (!cands.length) return;
  const give = pick(cands);
  queueEvent('tradeOffer', { tid: T.id, want: want.id, give: give.id });
}
