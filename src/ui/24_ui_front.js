/* =========================================================
   編成：契約更改・FA・トレード・外国人・トライアウト
   ========================================================= */
function renStatus(p) {
  const R = p.ren; if (!R) return '';
  if (R.st === 'signed') return `<span class="tag b">合意 ${fmtSal(R.sal)}${R.yrs > 1 ? '・' + R.yrs + '年' : ''}</span>`;
  if (R.st === 'hold') return '<span class="tag o">保留</span>';
  return R.tries ? `<span class="tag s">交渉中（${R.tries}回）</span>` : '<span class="tag">未交渉</span>';
}
SCREENS.contracts = () => {
  const ut = G.user.tid; const t = curTurn();
  const tab = getTab('contracts', t >= 44 ? 'renew' : 'pay');
  const ps = roster(ut);
  const pay = teamPayroll(ut);
  const nextPay = sum(ps, p => p.ren && p.ren.st === 'signed' ? p.ren.sal : (p.yrs > 1 ? p.sal : (p.ren ? p.ren.dem : p.sal)));
  const lgAvg = avg(G.teams, T => teamPayroll(T.id));
  const head = `<h1 class="h1">契約・年俸</h1><p class="lead">${LG.mlb ? '12月は契約の季節。メジャー在籍（サービスタイム）3〜5年の選手とは年俸調停の交渉をします。0〜2年の選手は最低年俸に近い額で自動更新、6年を過ぎて契約が切れた選手はFAです。合意できないまま年末を迎えると、調停の公聴会で選手側か球団側のどちらかの額に決まります。' : '12月は契約更改。成績と査定をもとに選手と年俸交渉をします。合意できないまま年末を迎えると年俸調停になります。'}</p>
    <div class="panel" style="margin-bottom:16px">${tiles([['年俸総額', fmtOku(pay), `リーグ平均 ${fmtOku(lgAvg)}`], ['来季の見込み', fmtOku(nextPay), '合意済み＋希望額で計算'], LG.mlb ? ['ぜいたく税の基準', fmtOku(LG.lux.th), nextPay > LG.lux.th ? `<span class="neg">超過 ${fmtOku(nextPay - LG.lux.th)}（税 約${fmtOku(luxTaxCalc(nextPay, uT().luxY || 0))}）</span>` : `あと${fmtOku(LG.lux.th - nextPay)}`] : ['目安の上限', fmtOku(aiPayBudget(uT())), '球団規模からの目安'], ['平均年俸', fmtSal(pay / Math.max(1, ps.length)), ps.length + '人']])}</div>`;
  const tb = tabs('contracts', [['renew', '契約更改', t >= 44 ? renewalList().length : null], ['pay', '年俸一覧'], ['release', '戦力外・自由契約']], tab);
  let body = '';
  if (tab === 'renew') {
    if (t < 44) body = `<div class="empty">契約更改は12月第1週から始まります。それまでは選手詳細から「契約延長を打診」できます。</div>`;
    else {
      const list = ps.filter(p => p.ren && !p.ren.rookie && !p.ren.auto).sort((a, b) => (a.ren.st === 'signed') - (b.ren.st === 'signed') || b.sal - a.sal);
      const autoN = ps.filter(p => p.ren && p.ren.auto).length;
      body = (autoN ? `<p class="small muted">調停権のない${autoN}人（サービスタイム0〜2年とマイナー契約）は、最低年俸に近い額で自動的に更新しました。</p>` : '') + `<div class="row" style="margin-bottom:10px"><button class="btn sm" data-a="renAll" data-m="dem">未合意の全員と希望額で合意</button><button class="btn sm" data-a="renAll" data-m="off">未合意の全員に査定額を提示</button><span class="small muted">締切：12月第4週（残り${47 - t + 1}週）</span></div>` +
        panel('', table('renew', [
          { k: 'n', l: '選手', v: p => p.name, h: p => `${pLink(p)} <span class="small muted">${POS_S[p.pos]}</span>${LG.mlb ? ` <span class="tag ${p.ren.arb ? 's' : ''}">${p.ren.auto ? '自動更新' : SVC_LABEL[svcClass(p)]}</span>` : ''}` },
          { k: 'age', l: '年齢', v: p => p.age, num: true, h: p => p.age },
          { k: 'st', l: '今季成績', h: p => `<span class="small">${statLine(p)}</span>` },
          { k: 'war', l: 'WAR', v: p => war(p), num: true, h: p => r1(war(p)) },
          { k: 'sal', l: '今季年俸', v: p => p.sal, num: true, h: p => fmtSal(p.sal) },
          { k: 'off', l: '球団査定', v: p => p.ren.off, num: true, h: p => fmtSal(p.ren.off) },
          { k: 'dem', l: '選手の希望', v: p => p.ren.dem, num: true, h: p => `${fmtSal(p.ren.dem)} <span class="small ${p.ren.dem > p.sal ? 'pos' : p.ren.dem < p.sal ? 'neg' : 'faint'}">${p.sal ? (p.ren.dem >= p.sal ? '+' : '') + Math.round((p.ren.dem / p.sal - 1) * 100) + '%' : ''}</span>` },
          { k: 'state', l: '状態', v: p => p.ren.st === 'signed' ? 2 : p.ren.st === 'hold' ? 1 : 0, h: renStatus },
          { k: 'a', l: '', h: p => p.ren.st === 'signed' ? '' : `<button class="btn xs pri" data-a="negOpen" data-id="${p.id}">交渉</button> <button class="btn xs danger" data-a="releaseAsk" data-id="${p.id}">${LG.mlb ? 'ノンテンダー' : '戦力外'}</button>` }
        ], list, { sort: { k: 'state', d: false } }), { flush: true });
    }
  } else if (tab === 'pay') {
    body = panel('', table('pay', [
      { k: 'n', l: '選手', v: p => p.name, h: p => `${pLink(p)} ${p.frn ? '<span class="tag">外</span>' : ''}` },
      { k: 'pos', l: '位置', v: p => p.pos, h: p => POS_S[p.pos] }, { k: 'age', l: '年齢', v: p => p.age, num: true, h: p => p.age },
      { k: 'ovr', l: '総合', v: ovr, h: p => av(ovr(p)) },
      { k: 'sal', l: '年俸', v: p => p.sal, num: true, h: p => fmtSal(p.sal) }, { k: 'yrs', l: '残り', v: p => p.yrs, num: true, h: p => p.yrs + '年' },
      { k: 'fair', l: '能力相応の目安', v: p => valueSalary(ovr(p)), num: true, h: p => `<span class="faint">${fmtSal(roundSal(valueSalary(ovr(p))))}</span>` },
      { k: 'svc', l: 'FA', v: p => p.svc, h: p => LG.mlb ? `<span class="small">${p.svc}年・${SVC_LABEL[svcClass(p)]}</span>` : p.frn ? '<span class="faint">―</span>' : (faEligible(p) ? '<span class="tag lamp">FA権</span>' : `<span class="small faint">あと${Math.max(0, (p.faUsed ? p.faUsed + 4 : 8) - p.svc)}年</span>`) + (p.svc >= kfaNeed(p) ? ' <span class="tag s">海外FA</span>' : '') + (p.per === 'mlb' ? ' <span class="small muted">メジャー志向</span>' : '') },
      { k: 'nx', l: '来季', h: p => p.ren && p.ren.st === 'signed' ? `<span class="small">${fmtSal(p.ren.sal)}</span>` : '' }
    ], ps, { sort: { k: 'sal', d: true } }), { flush: true });
  } else {
    const can = ps.slice().sort((a, b) => pVal(a) - pVal(b));
    body = `<p class="small muted">${LG.mlb ? `40人枠は${LIM.shihai}人まで、マイナー契約は${LIM.ikusei}人まで（2月第1週に判定）。調停を迎える選手と契約しない（ノンテンダー）なら費用はかかりませんが、複数年契約が残る選手を外すと、残りの年俸を払う必要があります。` : '支配下は70人まで（2月第1週に判定）。11月は戦力外通告の時期です。複数年契約が残る選手を外すと、残りの年俸を払う必要があります。'}</p>` + panel('', table('rel', [
      { k: 'n', l: '選手', v: p => p.name, h: p => `${pLink(p)} ${p.lv === 3 ? `<span class="tag">${lv3Name()}</span>` : ''}` },
      { k: 'pos', l: '位置', v: p => p.pos, h: p => POS_S[p.pos] }, { k: 'age', l: '年齢', v: p => p.age, num: true, h: p => p.age },
      { k: 'ovr', l: '総合', v: ovr, h: p => av(ovr(p)) }, { k: 'pot', l: '伸びしろ', v: potv, h: p => gr(potv(p)) },
      { k: 'val', l: '評価', v: p => pVal(p), num: true, h: p => Math.round(pVal(p)) },
      { k: 'sal', l: '年俸', v: p => p.sal, num: true, h: p => fmtSal(p.sal) },
      { k: 'c', l: '解除費用', v: releaseCost, num: true, h: p => releaseCost(p) > 0 ? fmtOku(releaseCost(p)) : '―' },
      { k: 'a', l: '', h: p => `<button class="btn xs danger" data-a="releaseAsk" data-id="${p.id}">戦力外</button>` }
    ], can, { sort: { k: 'val', d: false } }), { flush: true });
  }
  return head + tb + body;
};
ACT.renAll = el => {
  const m = el.dataset.m; let ok = 0, ng = 0;
  for (const p of renewalList()) {
    if (p.ren.st === 'signed') continue;
    if (m === 'dem') { negotiate(p, p.ren.dem, 1); ok++; }
    else { const r = negotiate(p, p.ren.off, 1); if (r.res === 'signed') ok++; else ng++; }
  }
  toast(m === 'dem' ? `${ok}人と合意しました` : `${ok}人が合意、${ng}人は保留・交渉継続`, 'good'); render();
};
ACT.negOpen = el => { UI.f.neg = null; openModal('neg', { id: +el.dataset.id }); render(); };
ACT.extOpen = el => { const p = P_(+el.dataset.id); if (!p) return; startExtension(p); UI.f.neg = null; replaceModal('neg', { id: p.id }); render(); };
function accHint(p, off, yrs) {
  const need = demandFor(p, yrs); const r = off / need;
  if (r >= 1) return '<span class="pos">合意できます</span>';
  const th = p.per === 'money' ? 0.9 : p.per === 'loyal' ? 0.8 : 0.85;
  if (r >= th + (1 - th) * 0.6) return '<span class="warn">合意できそう</span>';
  if (r >= th) return '<span class="warn">五分五分より厳しい</span>';
  return '<span class="neg">まず合意できない</span>';
}
MODALS.neg = ({ id }) => {
  const p = P_(id); if (!p || !p.ren) return null;
  const R = p.ren; const my = maxYears(p);
  const f = UI.f.neg && UI.f.neg.id === id ? UI.f.neg : (UI.f.neg = { id, off: R.lastOff || R.off, yrs: R.yrs || 1 });
  const need = demandFor(p, f.yrs);
  const steps = LG.mlb ? [-1e6, -1e5, 1e5, 1e6].map(v => v / 300) : [-1000, -100, 100, 1000];
  return { title: `${esc(p.name)}との${R.ext ? '契約延長' : LG.mlb && R.arb ? '年俸調停の交渉' : '契約更改'}`, size: 'narrow',
    body: `<dl class="kv"><dt>今季の年俸</dt><dd>${fmtSal(p.sal)}</dd><dt>今季成績</dt><dd class="small">${statLine(p)}（WAR ${r1(war(p))}）</dd><dt>${LG.mlb && R.arb ? '球団側の額（調停）' : '球団の査定額'}</dt><dd>${fmtSal(R.off)}</dd><dt>${LG.mlb && R.arb ? '選手側の額' : '選手の希望'}（${f.yrs}年）</dt><dd><b>${fmtSal(need)}</b></dd><dt>性格</dt><dd>${esc(PERS[p.per].n)}</dd></dl>
      <hr class="sep"><div class="field"><span>提示額（${moneyUnit()}）</span><div class="row"><input class="inp num" style="width:140px" type="number" step="${LG.mlb ? 1 : 10}" min="${moneyShow(minSal(p))}" value="${moneyShow(f.off)}" data-i="negOff"> <span class="small muted" id="negFmt">${fmtSal(f.off)}</span></div>
      <div class="row" style="margin-top:6px">${steps.map(s => `<button class="btn xs" data-a="negStep" data-v="${s}">${s > 0 ? '+' : '−'}${LG.mlb ? fmtSal(Math.abs(s)) : (Math.abs(s) >= 1000 ? Math.abs(s) / 1000 + '千万' : Math.abs(s) + '万')}</button>`).join('')}<button class="btn xs" data-a="negSet" data-v="${R.off}">査定額</button><button class="btn xs" data-a="negSet" data-v="${need}">希望額</button></div></div>
      ${my > 1 ? `<div class="field" style="margin-top:10px"><span>契約年数</span>${seg('negYrs', Array.from({ length: my }, (_, i) => [i + 1, (i + 1) + '年']), f.yrs)}<span class="small muted">${p.age >= 31 ? 'ベテランは複数年なら年額を抑えても応じやすい' : '若い選手は複数年だと年額を上乗せしたがる'}</span></div>` : ''}
      <p style="margin:12px 0 0" id="negHint">見込み：${accHint(p, f.off, f.yrs)}</p>
      ${f.off < reductionLimit(p) ? '<p class="small neg">減額制限を超える大幅ダウンの提示です。強い反発が予想されます。</p>' : ''}
      ${R.st === 'hold' ? '<p class="small warn">いったん保留しています。再交渉は可能ですが、希望額が上がっています。</p>' : ''}${LG.mlb && R.arb ? '<p class="small muted">12月第4週までに合意できなければ公聴会で、選手側か球団側のどちらかの額（1年）に決まります。複数年にすれば、FAになるまでの年数を買い取れます。</p>' : ''}`,
    foot: `<button class="btn" data-a="closeModal">あとで</button><button class="btn pri" data-a="negGo" data-id="${id}">この条件で提示する</button>` };
};
ACT.negOff = el => { const f = UI.f.neg; if (!f) return; f.off = Math.max(0, LG.mlb ? roundSal(moneyFrom(+el.value || 0)) : Math.round(+el.value || 0)); const p = P_(f.id); const a = $('#negFmt'); if (a) a.textContent = fmtSal(f.off); const h = $('#negHint'); if (h && p) h.innerHTML = '見込み：' + accHint(p, f.off, f.yrs); };
ACT.negStep = el => { const f = UI.f.neg; const v = f.off + +el.dataset.v; f.off = Math.max(0, LG.mlb ? roundSal(v) : v); renderModalRoot(); };
ACT.negSet = el => { UI.f.neg.off = +el.dataset.v; renderModalRoot(); };
ACT.negYrs = el => { UI.f.neg.yrs = +el.dataset.v; renderModalRoot(); };
ACT.negGo = el => {
  const p = P_(+el.dataset.id); const f = UI.f.neg; if (!p || !f) return;
  const r = negotiate(p, f.off, f.yrs);
  if (r.res === 'signed') { toast(`${p.name}と合意しました（${fmtSal(f.off)}${f.yrs > 1 ? '・' + f.yrs + '年' : ''}）`, 'good'); closeModal(); }
  else if (r.res === 'hold') { toast(`${p.name}は保留しました。希望は${fmtSal(p.ren.dem)}に上がっています`, 'bad'); renderModalRoot(); }
  else { toast(`${p.name}「もう少し評価してほしい」（希望 ${fmtSal(r.need)}）`, 'bad'); renderModalRoot(); }
  render();
};

/* ---------- FA ---------- */
SCREENS.fa = () => {
  const ut = G.user.tid; const t = curTurn();
  let html = `<h1 class="h1">FA市場</h1><p class="lead">${LG.mlb ? 'ワールドシリーズが終わると、保有6年を過ぎて契約が切れた選手がみなFAになります。11月第2〜4週に各球団が条件を提示し、選手は金額・年数・チームの強さ・人気・街の魅力を比べて移籍先を選びます。獲得に補償は要りません。売れ残った選手は自由契約のリストに移り、安い額で契約できることもあります。' : '11月第1週にFA権を持つ選手が権利を行使します。第2〜4週に各球団が条件を提示し、選手は金額・年数・チームの強さ・人気・街の魅力・出身地を比べて移籍先を選びます。'}</p>`;
  if (G.compPending && G.compPending.length) {
    html += G.compPending.map((c, i) => {
      const fa = P_(c.fa); const cands = unprotected(c.to).sort((a, b) => pVal(b) - pVal(a)).slice(0, 12);
      const money = c.prev * (c.rank === 'A' ? 0.8 : 0.6), money2 = c.prev * (c.rank === 'A' ? 0.5 : 0.4);
      return panel(`補償の選択：${fa ? esc(fa.name) : 'FA選手'}（${c.rank}ランク）→ ${esc(tName(c.to))}`, `<p class="small">金銭のみなら <b>${fmtOku(money)}</b>。人的補償を選ぶと、選手1人＋金銭${fmtOku(money2)}を受け取れます（相手のプロテクト28人以外から）。</p>
        <button class="btn pri sm" data-a="compMoney" data-i="${i}">金銭補償を受け取る</button>
        <div style="margin-top:10px">${table('comp' + i, [
          { k: 'n', l: '選手', h: p => pLink(p) }, { k: 'pos', l: '位置', h: p => POS_S[p.pos] }, { k: 'age', l: '年齢', h: p => p.age, num: true },
          { k: 'o', l: '総合', h: p => av(ovr(p)) }, { k: 'sal', l: '年俸', h: p => fmtSal(p.sal), num: true },
          { k: 'a', l: '', h: p => `<button class="btn xs team" data-a="compPick" data-i="${i}" data-id="${p.id}">この選手を獲得</button>` }], cands)}</div>`, { cls: 'hl' });
    }).join('<div style="height:12px"></div>') + '<div style="height:16px"></div>';
  }
  const open = t >= 40 && t <= 43 && G.faMarket.some(f => !f.done);
  if (G.faMarket.length && t >= 40 && t <= 43) {
    const all = G.faMarket.map(f => ({ f, p: P_(f.id) })).filter(x => x.p);
    const ff = getTab('faF', 'all');
    const rows = all.filter(x => ff === 'all' || (ff === 'p' ? isP(x.p) : ff === 'b' ? !isP(x.p) : ff === 'mine' ? x.f.from === ut : ff === 'top' ? ovr(x.p) >= 65 : true));
    html += `<div class="row" style="margin-bottom:10px">${seg('faF', [['all', 'すべて'], ['top', '総合65以上'], ['p', '投手'], ['b', '野手'], ['mine', '自球団から']], ff)}</div>`;
    html += panel(`今オフのFA選手 ${all.length}人${rows.length !== all.length ? `（表示 ${rows.length}人）` : ''}`, table('fam', [
      { k: 'n', l: '選手', v: x => x.p.name, h: x => pLink(x.p) },
      { k: 'pos', l: '位置', v: x => x.p.pos, h: x => POS_JP[x.p.pos] }, { k: 'age', l: '年齢', v: x => x.p.age, num: true, h: x => x.p.age },
      { k: 'o', l: '総合', v: x => ovr(x.p), h: x => av(ovr(x.p)) },
      { k: 'st', l: '今季', h: x => `<span class="small">${statLine(x.p)}</span>` },
      { k: 'from', l: '前所属', v: x => x.f.from, h: x => x.f.mlb ? `<span class="tag lamp">メジャー帰り</span> ${x.f.prev != null ? tMark(x.f.prev) : ''}` : tMark(x.f.from) }, { k: 'rk', l: LG.mlb ? '' : 'ランク', v: x => x.f.rank, h: x => LG.mlb ? '' : `<span class="tag ${x.f.rank === 'A' ? 'o' : x.f.rank === 'B' ? 's' : ''}">${x.f.rank}</span>` },
      { k: 'ask', l: '希望', v: x => x.f.ask, num: true, h: x => `${fmtSal(x.f.ask)}<span class="small muted">×${x.f.askYrs}年</span>` },
      { k: 'of', l: '獲得に動く球団', v: x => Object.keys(x.f.offers).length, num: true, h: x => Object.keys(x.f.offers).filter(k => +k !== ut).length },
      { k: 'me', l: 'あなたの提示', h: x => x.f.offers[ut] ? `${fmtSal(x.f.offers[ut].sal)}×${x.f.offers[ut].yrs}年` : '' },
      { k: 'res', l: '結果', v: x => x.f.done ? 1 : 0, h: x => x.f.done ? (x.f.to != null ? `→ ${tMark(x.f.to)}` : '引退') : '交渉中' },
      { k: 'a', l: '', h: x => x.f.done ? '' : `<button class="btn xs pri" data-a="faOfferOpen" data-id="${x.p.id}">${x.f.offers[ut] ? '条件を変える' : '獲得を申し込む'}</button>` }
    ], rows, { sort: { k: 'o', d: true }, maxH: 720 }), { flush: true });
    html += `<p class="small muted">${open ? (LG.mlb ? '11月第3週の終わりに一部の選手が、第4週の終わりに残り全員が移籍先を決めます。' : '11月第3週の終わりに一部の選手が、第4週の終わりに残り全員が移籍先を決めます。A・Bランクの選手を獲得すると、前所属球団に補償（金銭または人的補償）が必要です。') : 'FA交渉は終了しました。'}</p>`;
  } else {
    const soon = [];
    for (const T of G.teams) for (const p of shihai(T.id)) if ((LG.mlb ? faEligibleSoon(p) && p.yrs <= 1 : !p.frn && p.svc + 1 >= (p.faUsed ? p.faUsed + 4 : 8)) && ovr(p) >= 60) soon.push(p);
    html += panel('今オフFA権を持つ見込みの主な選手', table('fasoon', [
      { k: 'n', l: '選手', v: p => p.name, h: p => pLink(p) }, { k: 't', l: '所属', v: p => p.team, h: p => tMark(p.team) },
      { k: 'pos', l: '位置', v: p => p.pos, h: p => POS_JP[p.pos] }, { k: 'age', l: '年齢', v: p => p.age, num: true, h: p => p.age },
      { k: 'o', l: '総合', v: ovr, h: p => av(ovr(p)) }, { k: 'sal', l: '年俸', v: p => p.sal, num: true, h: p => fmtSal(p.sal) },
      { k: 'y', l: '契約', v: p => p.yrs, h: p => p.yrs > 1 ? `<span class="faint">残り${p.yrs}年</span>` : '今季まで' },
      { k: 'per', l: '性格', h: p => p.team === ut ? esc(PERS[p.per].n) : '' }
    ], soon, { sort: { k: 'o', d: true }, limit: 40 }), { flush: true }) + `<p class="small muted">${LG.mlb ? '自球団の選手は、選手詳細の「契約延長を打診」で複数年契約を結べば、FAになるのを防げます。' : '自球団の選手は、選手詳細の「契約延長を打診」で複数年契約を結べば、FA宣言を防げます。'}</p>`;
  }
  html += mlbPanel();
  return html;
};
/* メジャー挑戦（交渉中・今オフ海を渡った選手） */
function mlbPanel() {
  const T = G.mlbTry || []; const gone = (G.mlb || []).filter(x => x.y === G.year && curTurn() >= 40);
  if (!T.length && !gone.length) return '';
  const rows = T.map(x => { const p = P_(x.pid); if (!p) return ''; return `<tr class="${isUser(x.from) ? 'me' : ''}"><td>${pLink(p)}</td><td>${tMark(x.from)}</td><td>${HOW_JP[x.how]}</td><td>${interestLabel(mlbInterest(p))}</td><td class="small">交渉中（あと${Math.max(1, x.wk)}週ほど）</td></tr>`; }).join('') +
    gone.map(x => `<tr class="${isUser(x.from) ? 'me' : ''}"><td>${esc(x.name)}</td><td>${tMark(x.from)}</td><td>${esc(x.how)}</td><td></td><td class="small">${esc(x.club || 'メジャー')}へ${x.yrs ? '（' + x.yrs + '年契約）' : ''}${x.fee ? '・譲渡金' + fmtOku(x.fee) : ''}</td></tr>`).join('');
  return '<div style="height:16px"></div>' + panel('メジャー挑戦', `<div class="tw"><table class="t compact"><thead><tr><th>選手</th><th>所属</th><th>方法</th><th>メジャーの関心</th><th>状況</th></tr></thead><tbody>${rows}</tbody></table></div>`, { flush: true }) +
    '<p class="small muted">海外FA権（1軍で9年）を持つ選手や、球団がポスティングを認めた選手が、メジャー球団と交渉します。獲得球団が現れなければ残留します。自球団の選手は、11月〜12月第2週に選手の詳細からポスティングにかけられます。</p>';
}
ACT.compMoney = el => { resolveComp(+el.dataset.i, null); toast('金銭補償を受け取りました', 'good'); render(); };
ACT.compPick = el => { const p = P_(+el.dataset.id); resolveComp(+el.dataset.i, +el.dataset.id); toast(`人的補償で${p ? p.name : '選手'}を獲得しました`, 'good'); render(); };
ACT.faOfferOpen = el => { const f = G.faMarket.find(x => x.id === +el.dataset.id); if (!f) return; const cur = f.offers[G.user.tid]; UI.f.fa = { id: f.id, sal: cur ? cur.sal : f.ask, yrs: cur ? cur.yrs : f.askYrs }; openModal('faOffer', { id: f.id }); render(); };
MODALS.faOffer = ({ id }) => {
  const f = G.faMarket.find(x => x.id === id); const p = P_(id); if (!f || !p) return null;
  const st = UI.f.fa; const others = Object.entries(f.offers).filter(([k]) => +k !== G.user.tid);
  return { title: `${esc(p.name)}の獲得交渉`, size: 'narrow', body: `<dl class="kv"><dt>希望条件</dt><dd>${fmtSal(f.ask)} × ${f.askYrs}年</dd>${LG.mlb ? '' : `<dt>FAランク</dt><dd>${f.rank}${f.rank !== 'C' ? `（補償 最大${fmtOku(f.prevSal * (f.rank === 'A' ? 0.8 : 0.6))}）` : '（補償なし）'}</dd>`}<dt>性格</dt><dd>${esc(PERS[p.per].n)}</dd><dt>出身</dt><dd>${esc(LG.mlb ? birthOf(p) : REGIONS[p.home])}</dd><dt>競合</dt><dd>${others.length ? others.length + '球団' : 'なし'}</dd></dl>
    <hr class="sep"><div class="field"><span>年俸（${moneyUnit()}）</span><input class="inp num" type="number" step="${LG.mlb ? 10 : 100}" value="${moneyShow(st.sal)}" data-i="faSal"><span class="small muted" id="faFmt">${fmtSal(st.sal)}</span></div>
    <div class="field" style="margin-top:8px"><span>年数</span>${seg('faYrs', Array.from({ length: LG.maxYrs || 5 }, (_, i) => [i + 1, (i + 1) + '年']), st.yrs)}</div>
    <p class="small muted">総額 <span id="faTot">${fmtOku(st.sal * st.yrs)}</span>。金額だけでなく、チームの強さ・人気・街の賑わいも選手の判断材料になります。</p>`,
    foot: `<button class="btn" data-a="closeModal">やめる</button><button class="btn pri" data-a="faOfferGo">この条件で申し込む</button>` };
};
ACT.faSal = el => { UI.f.fa.sal = Math.max(MIN_SAL, LG.mlb ? roundSal(moneyFrom(+el.value || 0)) : Math.round(+el.value || 0)); const a = $('#faFmt'); if (a) a.textContent = fmtSal(UI.f.fa.sal); const b = $('#faTot'); if (b) b.textContent = fmtOku(UI.f.fa.sal * UI.f.fa.yrs); };
ACT.faYrs = el => { UI.f.fa.yrs = +el.dataset.v; renderModalRoot(); };
ACT.faOfferGo = () => { const s = UI.f.fa; if (userFAOffer(s.id, s.sal, s.yrs)) toast('条件を伝えました。選手の返事を待ちましょう', 'good'); closeModal(); render(); };

/* ---------- トレード ---------- */
function tradeState() { if (!UI.trade) UI.trade = { tid: G.teams.find(t => t.id !== G.user.tid).id, give: [], get: [], cash: 0, res: null }; return UI.trade; }
ACT.tradeWith = el => {
  const p = P_(+el.dataset.id); if (!p) return; const S = tradeState();
  if (p.team === G.user.tid) { if (!S.give.includes(p.id)) S.give.push(p.id); }
  else { if (S.tid !== p.team) { S.tid = p.team; S.get = []; } if (!S.get.includes(p.id)) S.get.push(p.id); }
  S.res = null; go('trade');
};
SCREENS.trade = () => {
  const ut = G.user.tid; const S = tradeState();
  const give = S.give.map(P_).filter(p => p && p.team === ut), get = S.get.map(P_).filter(p => p && p.team === S.tid);
  S.give = give.map(p => p.id); S.get = get.map(p => p.id);
  const flt = getTab('tradeF', 'all');
  const fl = p => flt === 'all' || (flt === 'p' ? isP(p) : !isP(p));
  const list = (tid, sel, key) => table('tr-' + key, [
    { k: 'c', l: '', h: p => `<input type="checkbox" data-c="trPick" data-k="${key}" data-id="${p.id}" ${sel.includes(p.id) ? 'checked' : ''} aria-label="選択">` },
    { k: 'n', l: '選手', v: p => p.name, h: p => `${pLink(p)} ${p.lv === 3 ? `<span class="tag">${lv3Name()}</span>` : p.lv === 1 ? '<span class="tag team">1軍</span>' : ''}` },
    { k: 'pos', l: '位置', v: p => p.pos, h: p => isP(p) ? (p.pt === 'SP' ? '先発' : '救援') : POS_S[p.pos] },
    { k: 'age', l: '年齢', v: p => p.age, num: true, h: p => p.age },
    { k: 'o', l: '総合', v: ovr, h: p => av(ovr(p)) },
    { k: 'sal', l: '年俸', v: p => p.sal, num: true, h: p => fmtSal(p.sal) },
    { k: 'st', l: '今季', h: p => `<span class="small">${statLine(p)}</span>` }
  ], roster(tid).filter(fl), { sort: { k: 'o', d: true }, maxH: 460, compact: true });
  const r = S.res;
  return `<h1 class="h1">トレード</h1><p class="lead">相手球団は選手の能力・年齢・伸びしろ・年俸を見て判断します。トレード期限は7月末。11月から3月までは再び交渉できます。</p>
  ${tradeOpen() ? '' : '<div class="panel" style="margin-bottom:12px"><div class="panel-b warn">現在はトレード期間外です（8月〜10月）。</div></div>'}
  <div class="panel" style="margin-bottom:16px"><div class="panel-b"><div class="row sp">
    <div class="row">相手球団 <select class="inp" data-c="trTeam">${G.teams.filter(t => t.id !== ut).map(t => opt(t.id, tName(t.id), S.tid)).join('')}</select>${seg('tradeF', [['all', 'すべて'], ['p', '投手'], ['b', '野手']], flt)}</div>
    <div class="row" style="min-width:280px;flex:1;max-width:460px"><span class="small nowrap">金銭</span><input type="range" min="${LG.mlb ? -100000 : -50000}" max="${LG.mlb ? 100000 : 50000}" step="${LG.mlb ? 1000 / 0.3 : 1000}" value="${S.cash}" data-c="trCash" data-i="trCashL"><span class="num small nowrap" id="trCashV" style="width:150px;text-align:right">${S.cash > 0 ? 'こちらが' + fmtOku(S.cash) + '払う' : S.cash < 0 ? '相手が' + fmtOku(-S.cash) + '払う' : 'なし'}</span></div>
  </div>
  <div class="row sp" style="margin-top:12px"><div><b>出す：</b>${give.map(p => esc(p.name)).join('、') || '<span class="muted">なし</span>'}　<b>もらう：</b>${get.map(p => esc(p.name)).join('、') || '<span class="muted">なし</span>'}</div>
    <div class="row"><button class="btn" data-a="trClear">クリア</button><button class="btn pri" data-a="trPropose" ${tradeOpen() ? '' : 'disabled'}>提案する</button></div></div>
  ${r ? `<p style="margin:10px 0 0" class="${r.ok ? 'pos' : 'neg'}">${esc(r.msg)}</p>` : ''}</div></div>
  <div class="grid g2">${panel('自球団', list(ut, S.give, 'give'), { flush: true })}${panel(esc(tName(S.tid)), list(S.tid, S.get, 'get'), { flush: true })}</div>
  ${G.trades.length ? panel('トレードの記録', `<table class="t compact"><tbody>${G.trades.slice(0, 15).map(x => `<tr><td class="small">${x.y}年${x.m}月</td><td>${tMark(x.tid)}</td><td class="small">出：${esc(x.give.join('・') || '―')}　入：${esc(x.get.join('・') || '―')}${x.cash ? '　金銭' + fmtOku(Math.abs(x.cash)) : ''}</td></tr>`).join('')}</tbody></table>`) : ''}`;
};
ACT.tradeF = el => { UI.tab.tradeF = el.dataset.v; render(); };
ACT.trTeam = el => { const S = tradeState(); S.tid = +el.value; S.get = []; S.res = null; render(); };
ACT.trPick = el => { const S = tradeState(); const id = +el.dataset.id; const arr = el.dataset.k === 'give' ? S.give : S.get; const i = arr.indexOf(id); if (el.checked && i < 0) arr.push(id); if (!el.checked && i >= 0) arr.splice(i, 1); S.res = null; render(); };
ACT.trCashL = el => { const v = +el.value; const a = $('#trCashV'); if (a) a.textContent = v > 0 ? 'こちらが' + fmtOku(v) + '払う' : v < 0 ? '相手が' + fmtOku(-v) + '払う' : 'なし'; };
ACT.trCash = el => { tradeState().cash = +el.value; tradeState().res = null; render(); };
ACT.trClear = () => { const S = tradeState(); S.give = []; S.get = []; S.cash = 0; S.res = null; render(); };
ACT.trPropose = () => {
  const S = tradeState(); const give = S.give.map(P_).filter(Boolean), get = S.get.map(P_).filter(Boolean);
  const e = evalTrade(S.tid, give, get, S.cash);
  if (e.ok) { doTrade(S.tid, give, get, S.cash); S.give = []; S.get = []; S.cash = 0; S.res = { ok: true, msg: 'トレードが成立しました！ 移籍した選手は2軍に合流します。' }; toast('トレード成立', 'good'); }
  else S.res = { ok: false, msg: `${tShort(S.tid)}：「${e.why}」` };
  render();
};

/* ---------- 外国人・トライアウト ---------- */
SCREENS.foreign = () => {
  const ut = G.user.tid;
  const tab = getTab('foreign', 'frn');
  const frnSc = userScouts().filter(s => s.assign === 'frn').length;
  let body;
  if (tab === 'frn') {
    body = `<p class="small muted">${LG.mlb ? `日本・韓国・台湾のプロ野球や、キューバ・中南米の選手です。表示の能力は推定で、スカウトを「海外」担当にしたりデータ分析室を強化すると精度が上がり、メジャーへの適応力も見えてきます（海外担当 ${frnSc}人）。日本と韓国の選手はポスティングのため、元の球団に譲渡金を払います。契約が切れるとFAになります。` : `表示の能力は推定です。スカウトを「海外」担当にしたり、データ分析室を強化すると精度が上がり、日本への適応力も見えてきます（海外担当 ${frnSc}人）。1軍に登録できる外国人は4人までです。`}</p>` +
      panel(`獲得できる外国人 ${G.foreign.length}人`, table('frn', [
        { k: 'n', l: '選手', v: p => p.name, h: p => `<a class="pl" data-a="player" data-id="${p.id}">${esc(p.name)}</a>` },
        { k: 'pos', l: '位置', v: p => p.pos, h: p => isP(p) ? (p.pt === 'SP' ? '先発' : '救援') : POS_JP[p.pos] },
        { k: 'age', l: '年齢', v: p => p.age, num: true, h: p => p.age },
        { k: 'from', l: '前所属', v: p => p.pr.school, h: p => esc(p.pr.school) },
        { k: 'o', l: '推定総合', v: shownFrnOvr, h: p => av(shownFrnOvr(p)) },
        { k: 'sc', l: '調査', v: p => p.pr.sc, h: p => `<div style="width:70px">${bar(p.pr.sc, 100, 'ball')}</div>` },
        { k: 'ad', l: '適応力', v: p => p.pr.sc, h: p => adaptLabel(p) },
        { k: 'ask', l: '年俸', v: p => p.fa.ask, num: true, h: p => fmtSal(p.fa.ask) + `<span class="small muted">×${p.fa.yrs}年</span>` },
        { k: 'fee', l: LG.mlb ? '譲渡金' : '移籍金', v: p => p.fa.fee, num: true, h: p => p.fa.fee ? fmtOku(p.fa.fee) : '―' },
        { k: 'a', l: '', h: p => `<button class="btn xs pri" data-a="signFrn" data-id="${p.id}" ${frnWindow() ? '' : 'disabled'}>獲得</button>` }
      ], G.foreign, { sort: { k: 'o', d: true } }), { flush: true });
  } else {
    const list = G.fapool.map(P_).filter(Boolean);
    body = `<p class="small muted">${LG.mlb ? '他球団を自由契約になった選手や、FAで売れ残った選手と1年契約を結べます（いつでも）。' : '他球団を自由契約になった選手と契約できます（7月末まで・11月〜）。'}</p>` + panel(`自由契約の選手 ${list.length}人`, table('free', [
      { k: 'n', l: '選手', v: p => p.name, h: p => pLink(p) },
      { k: 'pos', l: '位置', v: p => p.pos, h: p => POS_JP[p.pos] }, { k: 'age', l: '年齢', v: p => p.age, num: true, h: p => p.age },
      { k: 'o', l: '総合', v: ovr, h: p => av(ovr(p)) }, { k: 'pot', l: '伸びしろ', v: potv, h: p => gr(potv(p)) },
      { k: 'from', l: '前所属', v: p => p.fa ? p.fa.from : -1, h: p => p.fa && p.fa.from >= 0 ? tMark(p.fa.from) : '―' },
      { k: 'ask', l: '希望年俸', v: p => p.fa ? p.fa.ask : 0, num: true, h: p => fmtSal(p.fa ? p.fa.ask : MIN_SAL) },
      { k: 'a', l: '', h: p => `<button class="btn xs pri" data-a="signFree" data-id="${p.id}">契約</button>` }
    ], list, { sort: { k: 'o', d: true } }), { flush: true });
  }
  return `<h1 class="h1">外国人・トライアウト</h1><p class="lead">${LG.mlb ? '海外のプロ選手の獲得は7月末まで、11月から再開します。活躍できるかは調査しだいです。' : 'シーズン途中の補強は7月末まで。外国人は当たり外れが大きいので、調査を重ねてから獲得しましょう。'}</p>
  ${tabs('foreign', [['frn', LG.mlb ? '海外選手' : '外国人選手', G.foreign.length], ['free', LG.mlb ? '自由契約・FA残り' : 'トライアウト（自由契約）', G.fapool.length]], tab)}${body}`;
};
ACT.signFrn = el => { const r = signForeign(+el.dataset.id); if (r.ok) toast('契約しました。2軍に合流します', 'good'); else toast(r.why, 'bad'); closeAllModals(); render(); };
ACT.signFree = el => { const r = signFree(+el.dataset.id); if (r.ok) toast('契約しました', 'good'); else toast(r.why, 'bad'); closeAllModals(); render(); };
function foreignModal(p) {
  const keys = isP(p) ? PIT_KEYS : BAT_KEYS; const s = 2 + 10 * (1 - p.pr.sc / 100);
  return { title: `${esc(p.name)} <span class="small muted">${POS_JP[p.pos]}・${p.age}歳</span>`, size: 'narrow',
    body: `<dl class="kv"><dt>前所属</dt><dd>${esc(p.pr.school)}</dd><dt>推定総合</dt><dd>${av(shownFrnOvr(p))}</dd><dt>適応力</dt><dd>${adaptLabel(p)}</dd><dt>調査度</dt><dd>${Math.round(p.pr.sc)}%</dd><dt>条件</dt><dd>${fmtSal(p.fa.ask)}×${p.fa.yrs}年／${LG.mlb ? '譲渡金' : '移籍金'}${p.fa.fee ? fmtOku(p.fa.fee) : 'なし'}</dd><dt>性格</dt><dd>${p.pr.sc >= 50 ? esc(PERS[p.per].n) : '不明'}</dd></dl>
      <hr class="sep">${keys.map(k => `<div class="row sp"><span class="small">${ATTR_JP[k]}</span><span>${k === 'vel' ? velHtml(p.a.vel + (p.pr.noise.ovr * s * 0.3)) : av(clamp(Math.round(p.a[k] + p.pr.noise.ovr * s), 1, 99))}</span></div>`).join('')}
      <hr class="sep">${!isP(p) ? `<div class="row small" style="margin-bottom:6px">守れる位置：${POS_JP[p.pos]} ${subTags(p, { empty: '<span class="faint">ほかになし</span>' })}</div>` : ''}<div class="small muted" style="margin-bottom:4px">特殊能力</div>${p.pr.sc >= 50 ? skChips(p) : '<span class="faint small">調査50%以上で判明</span>'}`,
    foot: `<button class="btn" data-a="closeModal">閉じる</button><button class="btn" data-a="peOpen" data-id="${p.id}">編集</button><button class="btn pri" data-a="signFrn" data-id="${p.id}">獲得する</button>` };
}

ACT.faF = el => { UI.tab.faF = el.dataset.v; render(); };
