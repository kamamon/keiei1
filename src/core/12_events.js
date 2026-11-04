/* =========================================================
   ニュースとイベント（選択肢つきの出来事）
   ========================================================= */
/* o.note：お知らせ（ベル）にも出すか。true＝ふつう、'hi'＝大事、false＝出さない。
   指定がなければ「自球団の重要なニュース」だけを出す */
function addNews(type, text, o) {
  o = o || {};
  const n = { y: G.year, m: G.month, w: G.week, type, t: text, imp: !!o.important, tid: o.tid === undefined ? -1 : o.tid };
  G.news.unshift(n);
  if (G.news.length > 400) G.news.length = 400;
  const ut = G.user ? G.user.tid : -2;
  const nt = o.note !== undefined ? o.note : (o.important && n.tid === ut);
  if (nt && G.user) { pushNote({ type, t: text, pr: nt === 'hi' || o.important ? 'hi' : 'lo', go: o.go || NOTE_GO[type] || '', tab: o.tab || '', pid: o.pid != null ? o.pid : null }); n.nt = 1; }
}
const NEWS_TYPES = { game: '試合', post: 'ポストシーズン', award: '表彰', injury: '故障', dev: '育成', camp: 'キャンプ', draft: 'ドラフト', fa: 'FA・移籍', mlb: 'メジャー', trade: 'トレード',
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
/* 通算記録の節目。大台（MS_BIG 以上）は演出と記念イベントつき */
const MILESTONES = { hr: [100, 200, 300, 400, 500, 600], h: [1000, 1500, 2000, 2500, 3000], sb: [200, 300, 400], w: [100, 150, 200, 250], sv: [100, 200, 250, 300, 400], so: [1000, 1500, 2000, 2500, 3000], hld: [100, 200, 300] };
const MS_BAT = { hr: 1, h: 1, sb: 1 };
const MS_BIG = { hr: 400, h: 2000, sb: 400, w: 200, sv: 250, so: 2000, hld: 300 };
const MS_NEAR = { hr: 3, h: 10, sb: 3, w: 1, sv: 3, so: 15, hld: 3 };
const MS_NAME = { hr: '本塁打', h: '安打', sb: '盗塁', w: '勝', sv: 'セーブ', so: '奪三振', hld: 'ホールド' };
const MS_UNIT = { hr: '本', h: '本', sb: '個', w: '勝', sv: '', so: '', hld: '' };
function msLabel(key) { const k = key.replace(/[0-9]+$/, ''); const m = key.slice(k.length); return MS_NAME[k] ? '通算' + m + MS_NAME[k] : ''; }
/* ゲーム開始前に越えていた節目は、達成済みにしておく */
function markPastMilestones(p) { p.ms = p.ms || {}; for (const k in MILESTONES) for (const m of MILESTONES[k]) if ((p.car[k] || 0) >= m) p.ms[k + m] = p.ms[k + m] || 'pre'; }
function milestoneCheck(res) {
  const ids = new Set(res.bp.concat(res.pp.map(x => x.id)));
  for (const id of ids) {
    const p = P_(id); if (!p) continue;
    for (const k in MILESTONES) {
      if (!!MS_BAT[k] === isP(p)) continue;
      const tot = (p.car[k] || 0) + (p.st[k] || 0);
      for (const m of MILESTONES[k]) {
        const key = k + m;
        if (tot < m || (p.ms && p.ms[key])) continue;
        p.ms = p.ms || {}; p.ms[key] = G.year;
        const big = m >= MS_BIG[k]; const user = isUser(p.team); const nm = '通算' + m + MS_NAME[k];
        p.pop = clamp(p.pop + (big ? 6 : 3), 0, 100);
        if (user || big || !LG.mlb || m >= MILESTONES[k][1]) addNews('record', `${tShort(p.team)}の${p.name}が${nm}を達成`, { important: user || big, tid: p.team, note: user ? (big ? 'hi' : true) : false, pid: p.id });
        if (!user) continue;
        uT().pop = clamp(uT().pop + (big ? 1.5 : 0.5), 0, 99);
        goodsBuzz(big ? 3 : 2, big ? 0.3 : 0.12);
        if (big) {
          G.celeQ.push({ art: 'feat', kicker: '偉業達成', title: `${p.name}、${nm}`, sub: `${p.age}歳・プロ${Math.max(1, G.year - (p.join || G.year) + 1)}年目の大台`, body: 'チームメイトから花束が贈られ、スタンドからは大きな拍手。記念グッズを求めるファンが球場に集まっています。', pid: p.id });
          queueEvent('msCele', { pid: p.id, name: p.name, label: nm });
        }
      }
    }
  }
}
/* 大台が近づいたら知らせる（自球団）。記録の瞬間を見ようと観客が増える */
function msCountdown(p) {
  const c = careerOf(p);
  for (const k in MILESTONES) {
    if (!!MS_BAT[k] === isP(p)) continue;
    for (const m of MILESTONES[k]) {
      if (m < MS_BIG[k] || (p.ms && p.ms[k + m])) continue;
      const need = m - (c[k] || 0);
      if (need > 0 && need <= MS_NEAR[k]) {
        p.cd = p.cd || {}; const key = 'ms' + k + m;
        if (!p.cd[key]) { p.cd[key] = 1; notify('record', `${p.name}、通算${m}${MS_NAME[k]}まであと${need}${MS_UNIT[k]}。大台の瞬間を見ようと注目が集まっています`, { pid: p.id, note: 'hi', go: 'roster' }); crowdBuzz(2, 0.08); }
      }
      break;
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
    t: '外国人選手がホームシック', w: 1, cond: () => roster(G.user.tid).some(p => intlPlayer(p) && p.lv === 1),
    prep: () => ({ pid: pick(roster(G.user.tid).filter(p => intlPlayer(p) && p.lv === 1)).id }),
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
    text: d => { const p = P_(d.pid); return `${p ? p.name : '主力選手'}がポスティング制度でのメジャー挑戦を希望しています。メジャー球団の関心は「${d.lab || '―'}」。容認して獲得球団が現れれば、譲渡金（見込み約${fmtOku(d.fee)}）を受け取って送り出します。現れなければ残留です。`; },
    ch: [{ l: '容認する', d: 'メジャー球団と交渉する（2〜4週間で結果）', f: d => { const p = P_(d.pid); if (p && p.team === G.user.tid && !mlbTrying(p)) { startMLB(p, 'post'); p.mor = clamp(p.mor + 8, 0, 100); return `${p.name}のポスティング申請を容認しました。`; } return '対象選手がいませんでした。'; } },
      { l: '認めない', d: '本人のやる気が大きく下がる', f: d => { const p = P_(d.pid); if (p) { p.mor = clamp(p.mor - 25, 0, 100); p.postRef = true; } return '残留を求めました。本人は落胆しています。'; } }]
  },
  kfa: {
    t: '海外FA権の行使', w: 0, cond: () => false,
    text: d => { const p = P_(d.pid); return `${p ? p.name : '主力選手'}が海外FA権を行使し、メジャー挑戦を表明しました。メジャー球団の関心は「${d.lab || '―'}」。大型契約を示して残留を説得することもできます（失敗すれば挑戦へ）。`; },
    ch: [{ l: '残留を説得する', d: d => `${d.yrs}年・年${fmtSal(d.sal)}を提示（説得できる見込み ${Math.round(d.okP * 100)}%）`, f: d => {
        const p = P_(d.pid); if (!p || p.team !== G.user.tid) return '対象選手がいませんでした。';
        if (chance(d.okP)) { p.ren = { st: 'signed', sal: d.sal, yrs: d.yrs }; p.mor = clamp(p.mor + 5, 0, 100); addNews('contract', `${p.name}がメジャー挑戦を断念し、${d.yrs}年契約で残留`, { tid: G.user.tid, important: true, note: false, pid: p.id }); return `${p.name}は残留を決めました（${d.yrs}年・年${fmtSal(d.sal)}）。`; }
        startMLB(p, 'kfa'); return `説得は実らず、${p.name}はメジャー球団との交渉に入りました。`; } },
      { l: '送り出す', d: '挑戦を応援する（人気+1）', f: d => { const p = P_(d.pid); if (p && p.team === G.user.tid) { startMLB(p, 'kfa'); uT().pop = clamp(uT().pop + 1, 0, 99); return `${p.name}の挑戦を応援して送り出します。`; } return '対象選手がいませんでした。'; } }]
  },
  msCele: {
    t: '偉業達成の記念', w: 0, cond: () => false,
    text: d => `${d.name}が${d.label}を達成しました。ファンへの感謝と記念をどう形にしますか。`,
    ch: [{ l: '記念セレモニーを開く', d: '費用1,000万円・人気+1・2週間観客+6%・本人のやる気+5', f: d => { book('exp', 'promo', 1000); uT().pop = clamp(uT().pop + 1, 0, 99); crowdBuzz(2, 0.06); const p = P_(d.pid); if (p) p.mor = clamp(p.mor + 5, 0, 100); return '試合前のセレモニーで、記念のボードと花束が贈られました。'; } },
      { l: '記念グッズを発売する', d: '費用1,500万円・4週間グッズ売上+35%', f: () => { book('exp', 'promo', 1500); goodsBuzz(4, 0.35); return '記念Tシャツと記念ボールが飛ぶように売れています。'; } },
      { l: '記念品を贈る', d: '本人のやる気+10', f: d => { const p = P_(d.pid); if (p) p.mor = clamp(p.mor + 10, 0, 100); return '球団から記念の盾を贈りました。'; } }]
  },
  recCele: {
    t: '新記録の記念', w: 0, cond: () => false,
    text: d => `${d.name}が${d.label}を打ち立てました。歴史に残る記録をどう祝いますか。`,
    ch: [{ l: '記録達成セレモニーと記念グッズ', d: '費用3,000万円・人気+2・3週間観客+10%・4週間グッズ+40%', f: () => { book('exp', 'promo', 3000); uT().pop = clamp(uT().pop + 2, 0, 99); crowdBuzz(3, 0.10); goodsBuzz(4, 0.4); return '記録の瞬間を記念したグッズとセレモニーで、球場は大いに盛り上がりました。'; } },
      { l: '記念品を贈る', d: '本人のやる気+15', f: d => { const p = P_(d.pid); if (p) p.mor = clamp(p.mor + 15, 0, 100); return '球団から記念の盾を贈りました。'; } }]
  },
  featCele: {
    t: '偉業の記念', w: 0, cond: () => false,
    text: d => `${d.name}の${d.label}を記念して、何かしますか。`,
    ch: [{ l: '記念グッズを発売する', d: '費用1,500万円・3週間グッズ売上+35%・人気+1', f: () => { book('exp', 'promo', 1500); goodsBuzz(3, 0.35); uT().pop = clamp(uT().pop + 1, 0, 99); return '記念のボールとフォトカードが完売しました。'; } },
      { l: '本人をたたえる', d: '本人のやる気+10', f: d => { const p = P_(d.pid); if (p) p.mor = clamp(p.mor + 10, 0, 100); return '監督とチームメイトから祝福を受けました。'; } }]
  },
  titleCele: {
    t: 'タイトル獲得の祝賀', w: 0, cond: () => false,
    text: d => `今季、${d.text}がタイトルを獲得しました。どう祝いますか。`,
    ch: [{ l: '祝勝会と記念グッズ', d: '費用2,000万円・人気+1・4週間グッズ売上+25%', f: () => { book('exp', 'promo', 2000); uT().pop = clamp(uT().pop + 1, 0, 99); goodsBuzz(4, 0.25); return '祝勝会は大盛況。記念グッズも好調です。'; } },
      { l: '来季の年俸で報いると約束する', d: '本人たちのやる気+15・契約更改の希望額が少し上がる', f: d => { for (const id of d.pids || []) { const p = P_(id); if (p) { p.mor = clamp(p.mor + 15, 0, 100); p.titleRew = G.year; } } return '選手たちは来季への意欲を燃やしています。'; } },
      { l: '特に何もしない', d: '変化なし', f: () => 'タイトルの表彰だけを見守りました。' }]
  },
  titleSit: {
    t: 'タイトルのための欠場', w: 0, cond: () => false,
    text: d => d.k === 'avg' ? `${d.name}が打率${fmtAvg(d.v)}で首位打者争いのトップに立っています（2位の${d.rival}は${fmtAvg(d.v2)}）。残りの試合を欠場させて打率を守りますか。` : `${d.name}が防御率${fmtEra(d.v)}で最優秀防御率争いのトップです（2位の${d.rival}は${fmtEra(d.v2)}）。残りの登板を回避させますか。`,
    ch: [{ l: '欠場させてタイトルを守る', d: 'タイトルを取りやすくなる・ファンからは賛否で人気−0.5', f: d => { const p = P_(d.pid); if (p) { p.sit = G.year; touch(); } uT().pop = clamp(uT().pop - 0.5, 0, 99); return `${d.name}は残り試合を欠場します。`; } },
      { l: '最後まで出場させる', d: '正々堂々と戦う・人気+0.5・本人のやる気+5', f: d => { const p = P_(d.pid); if (p) p.mor = clamp(p.mor + 5, 0, 100); uT().pop = clamp(uT().pop + 0.5, 0, 99); return `${d.name}は最後まで出場します。`; } }]
  },
  farewell: {
    t: '引退試合', w: 0, cond: () => false,
    text: d => `今季限りで引退する${d.name}${d.legend ? '（球団の歴史に名を刻んだ名選手）' : ''}の最後をどう送り出しますか。`,
    ch: [{ l: '引退試合を開く', d: '最終週に出場・その週の観客+15%・試合後に人気+2とグッズ売上アップ', f: d => { const p = P_(d.pid); if (p) p.farewell = G.year; return `公式戦の最終週を${d.name}の引退試合にします。`; } },
      { l: '引退セレモニーだけ行う', d: '人気+1', f: () => { uT().pop = clamp(uT().pop + 1, 0, 99); return '最終戦の後に引退セレモニーを行います。'; } },
      { l: '特に何もしない', d: '変化なし', f: () => '静かに送り出します。' }]
  },
  retnum: {
    t: '永久欠番', w: 0, cond: () => false,
    text: d => `引退した${d.name}の背番号${d.num}を、永久欠番にしますか。永久欠番にすると、この番号は今後だれも着けられなくなります。`,
    ch: [{ l: '永久欠番にする', d: '人気+2・ファン増', f: d => retireNumber(G.user.tid, { num: d.num, name: d.name, pid: d.pid, pos: d.pos }) ? `背番号${d.num}は${d.name}の永久欠番になりました。` : 'すでに永久欠番です。' },
      { l: '見送る', d: 'あとで球団史から指定することもできる', f: () => '今回は見送りました。' }]
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
  if (G.flags.buzzW > 0) { G.flags.buzzW--; if (G.flags.buzzW === 0) G.flags.buzz = 0; }
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

/* 海外から来た選手（日本版は外国人選手、メジャー版は日本・韓国・台湾から来た選手） */
function intlPlayer(p) { return LG.mlb ? (p.nat === 'JP' || p.nat === 'KR' || p.nat === 'TW') && !!p.prFrom : !!p.frn; }
