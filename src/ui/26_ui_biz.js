/* =========================================================
   組織・経営：スタッフ・財務・球場・スポンサー・ファン・街・計画
   ========================================================= */
/* ---------- スタッフ ---------- */
function staffDetail(s) {
  if (s.role === 'mgr' || s.role === 'head') return `<span class="small">采配${gr(s.tac)} 育成${gr(s.dev)} 人望${gr(s.lead)} 知名度${gr(s.fame)}　${esc(s.style || '')}</span>`;
  if (s.role === 'scout') return `<span class="small">眼力${gr(s.eye)} 交渉${gr(s.nego)}　${esc(REGIONS[s.reg])}出身</span>`;
  return `<span class="small">${gr(s.abil)} ${s.abil}</span>`;
}
SCREENS.staff = () => {
  const cur = USER_ROLES.map(r => ({ r, s: uStaff(r) }));
  const rows = cur.map(({ r, s }) => `<tr><td>${STAFF_ROLES[r].n}</td><td>${s ? esc(s.name) + (s.ex ? ' <span class="tag lamp">元選手</span>' : '') : '<span class="neg">空席</span>'}</td><td class="num">${s ? s.age : ''}</td><td>${s ? staffDetail(s) : ''}</td><td class="num">${s ? fmtSal(s.sal) : ''}</td><td class="num">${s ? s.yrs + '年' : ''}</td><td class="small muted">${ROLE_DESC[r]}</td><td>${s ? `<button class="btn xs danger" data-a="staffFire" data-id="${s.id}">解任</button>` : ''}</td></tr>`).join('') +
    userScouts().map(s => `<tr><td>スカウト</td><td>${esc(s.name)}</td><td class="num">${s.age}</td><td>${staffDetail(s)}</td><td class="num">${fmtSal(s.sal)}</td><td class="num">${s.yrs}年</td><td class="small muted">担当：${esc(regionName(s.assign))}</td><td><button class="btn xs danger" data-a="staffFire" data-id="${s.id}">解任</button></td></tr>`).join('');
  const rf = getTab('staffRole', 'all');
  const pool = (G.staffPool || []).map(id => G.staff[id]).filter(s => s && (rf === 'all' || s.role === rf));
  const total = sum(userStaffList(), s => s.sal);
  return `<h1 class="h1">スタッフ</h1><p class="lead">監督・コーチの力は試合の采配と選手の成長に、フロントの力は営業や人気に効きます。契約が残っているスタッフを解任すると、残り年俸の半額を支払います。市場の顔ぶれは毎年12月に入れ替わります。</p>
  ${panel(`現在のスタッフ（人件費 ${fmtOku(total)}／年）`, `<div class="tw"><table class="t compact"><thead><tr><th>役職</th><th>名前</th><th class="num">年齢</th><th>能力</th><th class="num">年俸</th><th class="num">契約</th><th>効果</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`, { flush: true })}
  <div style="height:16px"></div>
  ${panel('スタッフ市場', `<div style="padding:10px 14px"><select class="inp" data-c="staffRole">${opt('all', 'すべての役職', rf)}${Object.entries(STAFF_ROLES).map(([k, v]) => opt(k, v.n, rf)).join('')}</select></div>` + table('spool', [
    { k: 'r', l: '役職', v: s => s.role, h: s => STAFF_ROLES[s.role].n },
    { k: 'n', l: '名前', v: s => s.name, h: s => esc(s.name) + (s.ex ? ' <span class="tag lamp">元選手</span>' : '') },
    { k: 'age', l: '年齢', v: s => s.age, num: true, h: s => s.age },
    { k: 'a', l: '能力', v: s => s.abil, h: staffDetail },
    { k: 'sal', l: '年俸', v: s => s.sal, num: true, h: s => fmtSal(s.sal) },
    { k: 'y', l: '契約', v: s => s.yrs, num: true, h: s => s.yrs + '年' },
    { k: 'x', l: '', h: s => { const c = s.role === 'scout' ? null : uStaff(s.role); return `<button class="btn xs pri" data-a="staffHire" data-id="${s.id}">${c ? '交代させる' : '採用'}</button>${c && fireCost(c) > 0 ? ` <span class="small faint">違約金${fmtOku(fireCost(c))}</span>` : ''}`; } }
  ], pool, { sort: { k: 'a', d: true } }), { flush: true })}`;
};
ACT.staffRole = el => { UI.tab.staffRole = el.value; render(); };
ACT.staffHire = el => { const r = hireStaff(+el.dataset.id); if (r.ok) toast('就任が決まりました', 'good'); else toast(r.why, 'bad'); render(); };
ACT.staffFire = el => { const s = G.staff[+el.dataset.id]; if (!s) return; fireStaff(s.id); toast(`${s.name}を解任しました`); render(); };

/* ---------- 財務・予算 ---------- */
SCREENS.finance = () => {
  const tab = getTab('finance', 'sum');
  const tb = tabs('finance', [['sum', '収支'], ['budget', '予算'], ['ticket', 'チケット価格'], ['loan', '融資'], ['hist', '過去の決算']], tab);
  const F = G.fin; const rev = yearTotal('rev'), exp = yearTotal('exp');
  const op = opNet(); const cx = (F.y.exp.capex || 0) + (F.y.exp.land || 0);
  const head = `<h1 class="h1">財務・予算</h1><div class="panel" style="margin-bottom:16px">${tiles([['資金', fmtOku(F.cash), '', F.cash < 0 ? 'neg' : ''], ['今年の収入', fmtOku(rev)], ['今年の支出', fmtOku(exp)], ['営業収支', fmtSigned(op), 'オーナーが評価する本業の収支', op < 0 ? 'neg' : 'pos'], ['設備投資', fmtOku(cx), '土地取得を含む'], ['借入金', fmtOku(debt())]])}</div>`;
  let body = '';
  if (tab === 'sum') {
    const items = (o, cats, c) => Object.entries(o).filter(([, v]) => Math.abs(v) >= 1).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ l: cats[k] || k, v, s: fmtOku(v), c }));
    const ri = items(F.y.rev, REV_CATS, 'var(--ball)'), ei = items(F.y.exp, EXP_CATS, 'var(--out)');
    const ms = F.months.filter(m => m.y === G.year || F.months.length <= 12).slice(-12);
    const allM = F.months.slice(-24);
    body = `<div class="grid g2">${panel('収入の内訳', ri.length ? barChart(ri, { label: '収入の内訳' }) : '<div class="empty">まだ収入がありません</div>')}${panel('支出の内訳', ei.length ? barChart(ei, { label: '支出の内訳' }) : '<div class="empty">まだ支出がありません</div>')}</div><div style="height:16px"></div>` +
      panel('月ごとの収支（直近24か月）', lineChart([{ n: '収入', c: 'var(--ball)', v: allM.map(m => bigMoney(m.rev)) }, { n: '支出', c: 'var(--out)', v: allM.map(m => bigMoney(m.exp)) }, { n: '資金', c: 'var(--lamp)', v: allM.map(m => bigMoney(m.cash)) }], allM.map(m => `${String(m.y).slice(2)}/${m.m}`), { fmt: v => trimNum(v.toFixed(LG.mlb ? 2 : 1)) + (LG.mlb ? '億ドル' : '億'), label: '月ごとの収支' }));
  } else if (tab === 'budget') {
    const B = G.budget;
    const ads = adWeeklyCost() * 48;
    const sl = Object.entries(BUDGET_ITEMS).map(([k, d]) => `<div class="field" style="margin-bottom:14px"><span><b>${d.n}</b>　${d.d}</span><div class="row"><input type="range" min="${d.min}" max="${d.max}" step="${k === 'capex' ? 10000 : 1000}" value="${B[k]}" data-c="budget" data-i="budgetL" data-k="${k}" style="flex:1"><span class="num" style="width:110px;text-align:right" id="bv-${k}">${fmtOku(B[k])}</span></div>
      ${k === 'ads' ? `<span class="small muted">現在の広告出稿ペース：年${fmtOku(ads)}</span>` : k === 'capex' ? `<span class="small muted">今年の設備投資：${fmtOku(G.fin.capexY || 0)}（枠を大きく超えるとオーナーの評価が下がります）</span>` : ''}</div>`).join('');
    const proj = projectYear();
    body = `<div class="grid g2">${panel('予算の配分', sl + '<p class="small muted">スカウト・育成・営業の費用は毎週支払われ、効果に直結します。</p>')}${panel('今年の見通し', `<dl class="kv"><dt>予想収入</dt><dd>${fmtOku(proj.rev)}</dd><dt>予想支出（設備投資を除く）</dt><dd>${fmtOku(proj.exp)}</dd><dt>予想営業収支</dt><dd>${signed(proj.rev - proj.exp)}</dd><dt>オーナーの目標</dt><dd>${signed(expectedNet())}</dd><dt>親会社が補填できる赤字</dt><dd>${fmtOku(subsidyCap())}まで</dd></dl><p class="small muted">見通しは昨年と今年の実績からの概算です。</p>`)}</div>`;
  } else if (tab === 'ticket') {
    const p = UI.f.tix || (UI.f.tix = Object.assign({}, G.tix));
    const now = previewAttendance(G.tix), nx = previewAttendance(p);
    const T = uT(); const rm = tixRefMul(T);
    const ref = refTix(T);
    const rows = Object.entries(TIX).map(([k, d]) => `<tr><td>${d.n}</td><td class="num">${fmtPrice(ref[k])}</td><td><input class="inp num" style="width:110px" type="number" step="${LG.mlb ? 1 : 100}" min="${LG.mlb ? 5 : 500}" value="${priceShow(p[k])}" data-c="tixSet" data-k="${k}"> ${LG.mlb ? 'ドル' : '円'}</td><td class="small muted">${k === 'pre' ? `プレミアム席Lv${G.stad.fac.vip.lv}` : ''}</td></tr>`).join('');
    body = `<div class="grid g2">${panel('席種ごとの価格', `<table class="t"><thead><tr><th>席種</th><th class="num">相場</th><th>設定</th><th></th></tr></thead><tbody>${rows}</tbody></table><div class="row" style="margin-top:12px"><button class="btn" data-a="tixReset">相場に戻す</button><button class="btn pri" data-a="tixApply">この価格にする</button></div>`)}
      ${panel('1試合あたりの見込み', `<table class="t compact"><thead><tr><th></th><th class="num">現在</th><th class="num">変更後</th></tr></thead><tbody><tr><td>観客数</td><td class="num">${comma(now.att)}人</td><td class="num">${comma(nx.att)}人</td></tr><tr><td>入場率</td><td class="num">${fmtPct(now.fill)}</td><td class="num">${fmtPct(nx.fill)}</td></tr><tr><td>入場料収入</td><td class="num">${fmtOku(now.rev)}</td><td class="num">${fmtOku(nx.rev)}</td></tr></tbody></table>
      <p class="small muted">値上げすると客単価は上がりますが、観客が減ると飲食・グッズの売上も下がります。満員なら値上げの余地があります。</p>`)}</div>`;
  } else if (tab === 'loan') {
    const L = G.fin.loans;
    body = `<div class="grid g2">${panel('借り入れる', `<dl class="kv"><dt>借入枠</dt><dd>${fmtOku(Math.max(0, loanLimit() - debt()))}</dd><dt>金利（年）</dt><dd>${(loanRate() * 100).toFixed(2)}%</dd></dl>
      <div class="row" style="margin-top:12px">${[50000, 100000, 300000].map(a => `<button class="btn" data-a="borrow" data-v="${a}" data-y="5">${fmtOku(a)}（5年）</button>`).join('')}<button class="btn" data-a="borrow" data-v="1000000" data-y="15">${fmtOku(1000000)}（15年）</button></div><p class="small muted">新球場の建設や球場の買収など、大きな投資のための資金です。毎年12月に元本を返済します。</p>`)}
      ${panel('借入金の一覧', L.length ? `<table class="t compact"><thead><tr><th>借入年</th><th class="num">残高</th><th class="num">金利</th><th class="num">年間返済</th><th></th></tr></thead><tbody>${L.map((l, i) => `<tr><td>${l.taken}</td><td class="num">${fmtOku(l.bal)}</td><td class="num">${(l.rate * 100).toFixed(2)}%</td><td class="num">${fmtOku(l.pay)}</td><td><button class="btn xs" data-a="repay" data-i="${i}">繰り上げ返済</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">借入金はありません</div>')}</div>`;
  } else {
    const H = G.fin.hist.slice().reverse();
    body = H.length ? panel('', `<div class="tw"><table class="t"><thead><tr><th>年度</th><th class="num">収入</th><th class="num">支出</th><th class="num">収支</th><th class="num">営業収支</th><th class="num">観客動員</th><th class="num">FC会員</th><th class="num">人気</th><th class="num">年俸総額</th><th class="num">年末資金</th><th class="num">順位</th></tr></thead><tbody>${H.map(h => `<tr><td>${h.y}</td><td class="num">${fmtOku(h.rev)}</td><td class="num">${fmtOku(h.exp)}</td><td class="num ${h.net < 0 ? 'neg' : 'pos'}">${fmtSigned(h.net)}</td><td class="num ${(h.op || 0) < 0 ? 'neg' : 'pos'}">${h.op != null ? fmtSigned(h.op) : '―'}</td><td class="num">${fmtPeople(h.att)}</td><td class="num">${fmtPeople(h.fc)}</td><td class="num">${h.pop}</td><td class="num">${fmtOku(h.pay)}</td><td class="num">${fmtOku(h.cash)}</td><td class="num">${rankStr(h.rank)}</td></tr>`).join('')}</tbody></table></div>`, { flush: true }) : '<div class="empty">決算は12月末に確定します。</div>';
  }
  return head + tb + body;
};
function projectYear() {
  const F = G.fin; const t = curTurn(); const last = F.hist[F.hist.length - 1];
  const rev = yearTotal('rev') - (F.y.rev.subsidy || 0), exp = yearTotal('exp') - (F.y.exp.capex || 0) - (F.y.exp.land || 0);
  if (last && t < 20) { const k = t / 48; return { rev: Math.max(rev, last.rev * (1 - k) + rev), exp: Math.max(exp, last.exp * (1 - k) + exp) }; }
  const f = Math.max(1, 48 / Math.max(1, t));
  return { rev: rev * (t >= 11 ? 48 / Math.max(12, t) : f), exp: exp * f };
}
ACT.budgetL = el => { const a = $('#bv-' + el.dataset.k); if (a) a.textContent = fmtOku(+el.value); };
ACT.budget = el => { G.budget[el.dataset.k] = +el.value; render(); };
ACT.tixSet = el => { UI.f.tix[el.dataset.k] = LG.mlb ? priceFrom(clamp(Math.round(+el.value), 5, 1500)) : clamp(Math.round(+el.value / 100) * 100, 500, 50000); render(); };
ACT.tixReset = () => { UI.f.tix = refTix(uT()); render(); };
ACT.tixApply = () => { G.tix = Object.assign({}, UI.f.tix); toast('チケット価格を変更しました', 'good'); render(); };
ACT.borrow = el => { if (borrow(+el.dataset.v, +el.dataset.y)) toast('借り入れました', 'good'); else toast('借入枠が足りません', 'bad'); render(); };
ACT.repay = el => { const l = G.fin.loans[+el.dataset.i]; if (!l) return; repay(+el.dataset.i, l.bal); toast('返済しました'); render(); };

/* ---------- 球場・設備 ---------- */
function facRow(kind, key) {
  const d = facDef(kind, key); const f = facObj(kind, key); const b = facBuilding(kind, key);
  const c = canUpgrade(kind, key); const rc = renovateCost(kind, key);
  return `<tr><td><b>${d.n}</b><div class="small muted">${d.d}</div></td><td class="num">Lv${f.lv}<span class="faint">/${d.max}</span></td>
    <td style="min-width:110px">${f.lv ? `${bar(f.cond, 100, f.cond >= 70 ? 'ball' : f.cond >= 50 ? 'strike' : 'out')}<span class="small faint">状態 ${Math.round(f.cond)}%</span>` : '<span class="faint small">未整備</span>'}</td>
    <td>${b ? `<span class="tag lamp">工事中 残り${b.wk}週</span>` : f.lv >= d.max ? '<span class="tag b">最大</span>' : `<button class="btn xs pri" data-a="facUp" data-k="${kind}" data-key="${key}" ${c.ok ? '' : 'disabled title="' + esc(c.why) + '"'}>Lv${f.lv + 1}へ ${fmtOku(d.cost[f.lv])}・${d.wk[f.lv]}週</button>${!c.ok && c.why !== '資金が足りません' ? `<div class="small faint">${esc(c.why)}</div>` : ''}`}</td>
    <td>${f.lv && f.cond < 95 ? `<button class="btn xs" data-a="facRen" data-k="${kind}" data-key="${key}" ${G.fin.cash >= rc ? '' : 'disabled'}>改修 ${fmtOku(rc)}</button>` : ''}</td></tr>`;
}
SCREENS.stadium = () => {
  const tab = getTab('stadium', 'stad');
  const S = G.stad; const T = uT();
  const tb = tabs('stadium', [['stad', '本拠地球場'], ['team', 'チーム施設'], ['new', '球場の買収・新球場']], tab);
  const head = `${art(S.dome ? 'dome' : 'stadium', { h1: true, kicker: '球場・設備', title: esc(stadiumName()), sub: `${comma(capOf(T.id))}人・${S.dome ? 'ドーム' : '屋外'}・${S.owned ? '球団が保有' : '借りている球場'}` })}<div class="panel" style="margin-bottom:16px">${tiles([['本拠地', esc(stadiumName()), S.dome ? 'ドーム' : '屋外'], ['収容人数', comma(capOf(T.id)) + '人', S.fac.seats.lv ? `増設Lv${S.fac.seats.lv}` : ''], ['観戦満足度', Math.round(stadSatisfaction()), '設備・状態・築年数で決まる'], ['所有', S.owned ? '球団所有' : '賃借', S.owned ? '使用料なし' : `使用料 ${fmtOku(S.rent)}／年`], ['築年数', (S.age || 0) + '年']])}</div>`;
  let body = '';
  if (tab === 'stad') body = panel('球場の設備', `<div class="tw"><table class="t"><thead><tr><th>設備</th><th class="num">レベル</th><th>状態</th><th>増強</th><th>改修</th></tr></thead><tbody>${Object.keys(STAD_FAC).map(k => facRow('stad', k)).join('')}</tbody></table></div>`, { flush: true }) + '<p class="small muted">設備は少しずつ傷み、状態が下がると効果が落ちます。スタンド増設とフィールド整備はオフシーズン（10月〜2月）だけ着工できます。</p>';
  else if (tab === 'team') body = panel('チーム施設', `<div class="tw"><table class="t"><thead><tr><th>施設</th><th class="num">レベル</th><th>状態</th><th>増強</th><th>改修</th></tr></thead><tbody>${Object.keys(TEAM_FAC).map(k => facRow('team', k)).join('')}</tbody></table></div>`, { flush: true });
  else {
    const P = G.project;
    const ns = UI.f.ns || (UI.f.ns = { type: 'roof', cap: 38000 });
    const cost = newStadiumCost(ns.type, ns.cap);
    body = `<div class="grid g2">${panel('球場を買い取る', S.owned ? '<p>本拠地はすでに球団の所有です。飲食の売上とネーミングライツの収入をすべて球団が受け取っています。</p>' : `<p>いまは球場を借りており、使用料（年${fmtOku(S.rent)}）がかかるうえ、飲食売上とネーミングライツ収入の半分が球場側に入ります。買い取れば、これらがすべて球団の収入になります（維持費は増えます）。</p><dl class="kv"><dt>買収価格</dt><dd>${fmtOku(stadiumPrice())}</dd><dt>資金</dt><dd>${money(G.fin.cash)}</dd></dl><div class="row" style="margin-top:10px"><button class="btn pri" data-a="buyStad" ${G.fin.cash >= stadiumPrice() ? '' : 'disabled'}>買収する</button><button class="btn" data-a="go" data-v="finance" data-tab="loan">融資を受ける</button></div>`)}
      ${panel('新球場の建設', P ? `<p><b>${NEWSTAD[P.type].n}</b>（${comma(P.cap)}人）を建設中です。</p>${bar(P.tot - P.wk, P.tot, 'team')}<p class="small muted">${P.ready ? '完成しました。来季1月から本拠地になります。' : `完成まで残り${P.wk}週。工事費は毎週支払います（残り${fmtOku(P.cost / P.tot * P.wk)}）。`}</p>` :
      `<div class="field"><span>タイプ</span>${seg('nsType', Object.entries(NEWSTAD).map(([k, v]) => [k, v.n]), ns.type)}<span class="small muted">${NEWSTAD[ns.type].d}</span></div>
       <div class="field" style="margin-top:10px"><span>収容人数</span>${seg('nsCap', [30000, 34000, 38000, 42000, 46000].map(c => [c, comma(c) + '人']), ns.cap)}</div>
       <dl class="kv" style="margin-top:10px"><dt>総工費</dt><dd>${fmtOku(cost)}</dd><dt>着工金（1割）</dt><dd>${fmtOku(Math.round(cost * 0.1))}</dd><dt>工期</dt><dd>約2年（96週）</dd></dl>
       <p class="small muted">完成すると球団所有の新球場に移り、満足度と人気が大きく上がり、数年は観客が増えます。着工はオフシーズンのみ。</p>
       <button class="btn pri" data-a="nsStart" ${isOffseason() ? '' : 'disabled'}>建設を始める</button>`)}</div>`;
  }
  return head + tb + body;
};
ACT.facUp = el => { const r = startUpgrade(el.dataset.k, el.dataset.key); if (r.ok) toast('工事を始めました', 'good'); else toast(r.why, 'bad'); render(); };
ACT.facRen = el => { if (renovate(el.dataset.k, el.dataset.key)) toast('改修しました', 'good'); render(); };
ACT.buyStad = () => { if (buyStadium()) toast('球場を買収しました！', 'good'); else toast('資金が足りません', 'bad'); render(); };
ACT.nsType = el => { UI.f.ns.type = el.dataset.v; render(); };
ACT.nsCap = el => { UI.f.ns.cap = +el.dataset.v; render(); };
ACT.nsStart = () => { const r = startNewStadium(UI.f.ns.type, UI.f.ns.cap); if (r.ok) toast('新球場の建設を始めました', 'good'); else toast(r.why, 'bad'); render(); };

/* ---------- スポンサー・球場内広告・ネーミングライツ ---------- */
function adStatus(slot) {
  const S = G.sponsors;
  if (!sponsorReq(slot).ok) return 'lock';
  if (S.cur[slot]) return 'sold';
  if (S.offers.some(o => o.slot === slot)) return 'offer';
  if (S.sol && S.sol[slot]) return 'sol';
  return 'open';
}
const AD_ST = { sold: '契約中', offer: '提案あり', sol: '営業中', open: '空き', lock: '未設置' };
/* 球場の広告マップ（SVG）。枠ごとに、契約状況の色で塗る */
const AD_SHAPES = {
  seat: { s: '<path d="M22 116 L76 112 L200 236 L324 112 L378 116 L378 140 L200 268 L22 140 Z"/>', l: [346, 136, '座席'] },
  concourse: { s: '<path class="ln dash" d="M16 146 L200 278 L384 146"/>', l: [356, 184, 'コンコース'] },
  ribbon: { s: '<path class="ln" d="M151.5 210 L89.5 148 M248.5 210 L310.5 148"/>', l: [47, 164, 'リボンビジョン'] },
  fence: { s: '<path class="ln" d="M76 112 Q200 -14 324 112"/>', l: [200, 68, '外野フェンス'] },
  score: { s: '<rect x="160" y="6" width="80" height="24" rx="2"/>', l: [200, 22, 'スコアボード'], inside: true },
  vision: { s: '<rect x="248" y="12" width="58" height="22" rx="2"/>', l: [277, 27, 'ビジョン'], inside: true },
  pole: { s: '<rect x="72" y="86" width="7" height="28"/><rect x="321" y="86" width="7" height="28"/>', l: [60, 80, 'ポール'] },
  bench: { s: '<rect x="160.5" y="217.3" width="24" height="8" transform="rotate(45 172.5 221.3)"/><rect x="215.5" y="217.3" width="24" height="8" transform="rotate(-45 227.5 221.3)"/>', l: [200, 208, 'ダッグアウト'] },
  backnet: { s: '<rect x="168" y="244" width="64" height="8" rx="2"/>', l: [200, 296, 'バックネット裏LED'] },
  wall: { s: '<rect x="8" y="268" width="84" height="26" rx="3"/>', l: [50, 285, '外壁看板'], inside: true }
};
function adMapSvg(sel) {
  const order = ['seat', 'concourse', 'ribbon', 'fence', 'score', 'vision', 'pole', 'bench', 'backnet', 'wall'];
  const spots = order.filter(k => SPONSOR_SLOTS[k]).map(k => {
    const a = AD_SHAPES[k]; const st = adStatus(k);
    return `<g class="ad ${st}${sel === k ? ' on' : ''}" data-a="adSel" data-k="${k}" role="button" tabindex="0" aria-label="${SPONSOR_SLOTS[k].n}：${AD_ST[st]}"><title>${SPONSOR_SLOTS[k].n}（${AD_ST[st]}）</title>${a.s}<text x="${a.l[0]}" y="${a.l[1]}" class="${a.inside ? 'in' : ''}">${a.l[2]}</text></g>`;
  }).join('');
  return `<svg class="admap" viewBox="0 0 400 304" role="group" aria-label="球場の広告マップ">
    <path class="grass" d="M200 236 L76 112 Q200 -14 324 112 Z"/><path class="dirt" d="M200 248 L258 190 L200 132 L142 190 Z"/>
    <path class="foul" d="M200 236 L76 112 M200 236 L324 112"/>
    <rect class="base" x="196" y="232" width="8" height="8" transform="rotate(45 200 236)"/><rect class="base" x="240.5" y="188.5" width="7" height="7" transform="rotate(45 244 192)"/>
    <rect class="base" x="196.5" y="144.5" width="7" height="7" transform="rotate(45 200 148)"/><rect class="base" x="152.5" y="188.5" width="7" height="7" transform="rotate(45 156 192)"/>
    ${spots}</svg>
    <div class="adleg">${['sold', 'offer', 'sol', 'open', 'lock'].map(k => `<span><i class="${k}"></i>${AD_ST[k]}</span>`).join('')}</div>`;
}
function dealTags(o) {
  const t = [];
  if (o.renew) t.push('<span class="tag b">契約更新</span>');
  if (o.int >= 0.75) t.push('<span class="tag lamp">熱心</span>');
  if (o.rd) t.push(`<span class="tag">交渉${o.rd}回目</span>`);
  return t.join(' ');
}
function offerRow(kind, o, extra) {
  return `<div class="lot-row"><div style="flex:1;min-width:150px"><b>${esc(o.co)}</b> ${dealTags(o)}<div class="small muted">${extra || ''}年${fmtOku(o.annual)}×${o.yrs}年・あと${o.exp}週</div></div>
    <button class="btn sm pri" data-a="dealOpen" data-k="${kind}" data-id="${o.id}">交渉する</button><button class="btn sm" data-a="dealTake" data-k="${kind}" data-id="${o.id}">この条件で契約</button></div>`;
}
/* 枠の詳細（球場内広告の右側・ユニフォーム枠のカード） */
function slotDetail(slot) {
  const S = G.sponsors; const d = SPONSOR_SLOTS[slot]; const st = adStatus(slot); const c = S.cur[slot];
  const stad = sponsorCat(slot) === 'stad'; const share = stad ? stadAdShare() : 1;
  const offers = S.offers.filter(o => o.slot === slot);
  let h = `<p class="small muted" style="margin:0 0 8px">${d.d || ''}</p><dl class="kv"><dt>相場（年）</dt><dd>${st === 'lock' ? '―' : fmtOku(sponsorValue(slot))}</dd>${stad ? `<dt>球団の取り分</dt><dd>${share < 1 ? '6割（球場を借りているため）' : '全額（球場を保有）'}</dd>` : ''}</dl>`;
  if (st === 'lock') h += `<p class="small warn" style="margin:10px 0 0">${sponsorReq(slot).why}</p><button class="btn sm" style="margin-top:8px" data-a="go" data-v="stadium">球場・設備へ</button>`;
  if (c) h += `<div class="lot-row" style="margin-top:10px"><div style="flex:1"><b>${esc(c.co)}</b> <span class="tag b">契約中</span><div class="small muted">年${fmtOku(c.annual)}${share < 1 ? `（球団の取り分 ${fmtOku(c.annual * share)}）` : ''}・残り${c.yrs}年</div></div></div><p class="small faint" style="margin:6px 0 0">契約が終わる年の12月に、更新の提案が届きます。人気が上がっていれば値上げを交渉できます。</p>`;
  if (offers.length) h += `<div class="lot" style="margin-top:10px">${offers.map(o => offerRow('sp', o)).join('')}</div>`;
  else if (st === 'sol') h += `<p class="small" style="margin:10px 0 0">営業中です。あと${S.sol[slot]}週で提案が届きます。</p>`;
  else if (st === 'open') h += `<p class="small" style="margin:10px 0 6px">いまは空いています。</p><button class="btn sm pri" data-a="adSolicit" data-k="${slot}">企業に営業をかける</button>`;
  return h;
}
SCREENS.sponsor = () => {
  const S = G.sponsors; const N = G.naming;
  for (const o of S.offers) if (!o.id) dealEnsure('sp', o);
  for (const o of N.offers) if (!o.id) dealEnsure('nm', o);
  const tab = getTab('sponsor', 'stad');
  const keys = Object.keys(SPONSOR_SLOTS);
  const stadK = keys.filter(k => sponsorCat(k) === 'stad'), uniK = keys.filter(k => sponsorCat(k) !== 'stad');
  const sumOf = ks => sum(ks.filter(k => S.cur[k]), k => S.cur[k].annual);
  const share = stadAdShare(); const nmShare = G.stad.owned ? 1 : 0.5;
  const nOpen = keys.filter(k => ['open', 'offer', 'sol'].includes(adStatus(k))).length;
  const sales = uStaff('sales');
  const head = `<h1 class="h1">スポンサー・広告</h1><p class="lead">企業からの提案は、そのまま受けても、広告料を交渉してもかまいません。強気に出るほど高く売れることもありますが、相手の上限を大きく超える要求は決裂のもとです。</p>
    <div class="panel" style="margin-bottom:16px">${tiles([['スポンサー（年）', fmtOku(sumOf(uniK))], ['球場内広告（年）', fmtOku(sumOf(stadK) * share), share < 1 ? '取り分6割' : '全額が球団に'], ['ネーミングライツ（年）', fmtOku((N.main ? N.main.annual * nmShare : 0) + (N.farm ? N.farm.annual : 0))], ['空いている枠', nOpen + '枠'], ['届いている提案', S.offers.length + N.offers.length + '件'], ['営業部長', sales ? esc(sales.name) : 'なし', sales ? `能力 ${sales.abil}${sales.abil >= 45 ? '・相手の上限を読める' : ''}` : '', 'txt']])}</div>
    ${tabs('sponsor', [['stad', '球場内広告', S.offers.filter(o => sponsorCat(o.slot) === 'stad').length || null], ['uni', 'ユニフォーム・協賛', S.offers.filter(o => sponsorCat(o.slot) !== 'stad').length || null], ['naming', 'ネーミングライツ', N.offers.length || null]], tab)}`;
  let body = '';
  if (tab === 'stad') {
    const sel = UI.sel.ad && SPONSOR_SLOTS[UI.sel.ad] ? UI.sel.ad : null;
    const list = `<div class="adlist">${stadK.map(k => { const st = adStatus(k); const c = S.cur[k]; const n = S.offers.filter(o => o.slot === k).length;
      const right = st === 'sold' ? `年${fmtOku(c.annual * share)}・残り${c.yrs}年` : st === 'offer' ? `提案${n}件` : st === 'sol' ? `あと${S.sol[k]}週` : st === 'lock' ? sponsorReq(k).why.replace('から販売できます', '') : `相場 年${fmtOku(sponsorValue(k))}`;
      return `<button class="adrow" data-a="adSel" data-k="${k}"><i class="${st}"></i><span class="nm">${SPONSOR_SLOTS[k].n}</span><span class="r">${right}</span></button>`; }).join('')}</div>`;
    body = `<div class="grid g2"><div class="panel"><div class="panel-b">${adMapSvg(sel)}</div></div>
      ${sel ? panel(SPONSOR_SLOTS[sel].n, slotDetail(sel), { act: '<button class="btn sm" data-a="adSel" data-k="">一覧に戻る</button>' }) : panel('広告枠', list + `<p class="small muted" style="margin:10px 0 0">${share < 1 ? '球場を借りているため、球場内広告の収入の4割は球場の持ち主に入ります。球場を買い取ると全額が球団の収入になります。' : '球場を保有しているので、球場内広告の収入は全額が球団に入ります。'}</p>`)}</div>`;
  } else if (tab === 'uni') {
    body = `<div class="grid g2">${uniK.map(k => panel(SPONSOR_SLOTS[k].n, slotDetail(k))).join('')}</div>`;
  } else {
    const nrow = kind => { const c = N[kind]; const offers = N.offers.filter(o => o.kind === kind);
      return panel(kind === 'main' ? '本拠地球場のネーミングライツ' : '2軍球場のネーミングライツ', `${c ? `<p>現在の名称：<b>${esc(c.name)}</b>（${esc(c.co)}・年${fmtOku(c.annual)}・残り${c.yrs}年）</p>` : `<p class="muted">現在の名称：${kind === 'main' ? esc(G.stad.name) : '2軍球場'}（命名権は未販売）</p>`}
        <dl class="kv" style="margin-bottom:10px"><dt>相場（年）</dt><dd>${fmtOku(namingValue(kind))}</dd></dl>
        ${offers.length ? `<div class="lot">${offers.map(o => offerRow('nm', o, `「${esc(o.name)}」　`)).join('')}</div>` : ''}
        ${!c && !offers.length ? (N.solicit > 0 && N.solicitKind === kind ? `<p class="small">募集中…あと${N.solicit}週で提案が届きます</p>` : `<button class="btn" data-a="nmSolicit" data-k="${kind}">命名権の購入企業を募集する</button>`) : ''}
        ${kind === 'main' && nmShare < 1 ? '<p class="small muted">球場を借りているため、命名権料の半分は球場の持ち主に入ります。</p>' : ''}${kind === 'main' ? '<p class="small faint">名前が変わると、長年のファンの一部は少し残念がります。</p>' : ''}`); };
    body = `<div class="grid g2">${nrow('main')}${nrow('farm')}</div>`;
  }
  return head + body;
};
ACT.adSel = el => { UI.sel.ad = el.dataset.k || null; render(); };
ACT.adSolicit = el => { if (solicitSponsor(el.dataset.k)) toast('営業を始めました。1〜3週で提案が届きます', 'good'); render(); };
ACT.spAccept = el => { acceptSponsor(+el.dataset.i); toast('スポンサー契約を結びました', 'good'); render(); };
ACT.nmAccept = el => { acceptNaming(+el.dataset.i); toast('ネーミングライツ契約を結びました', 'good'); render(); };
ACT.nmSolicit = el => { G.naming.solicit = ri(2, 4); G.naming.solicitKind = el.dataset.k; toast('募集を始めました。数週間で提案が届きます'); render(); };

/* ---------- 広告料・命名権料の交渉 ---------- */
MODALS.deal = ({ kind, id }) => {
  const o = dealFind(kind, id); if (!o) return null;
  dealEnsure(kind, o);
  const f = UI.f.deal && UI.f.deal.id === id && UI.f.deal.kind === kind ? UI.f.deal : (UI.f.deal = { kind, id, ask: roundSal(o.annual * 1.1), yrs: o.yrs });
  const [y0, y1] = dealYearRange(kind);
  const v = dealValue(kind, o); const mood = dealMood(o); const hint = dealHint(kind, o, f.yrs);
  const share = kind === 'sp' ? (sponsorCat(o.slot) === 'stad' ? stadAdShare() : 1) : (o.kind === 'main' && !G.stad.owned ? 0.5 : 1);
  const log = o.log.map(l => l.w === 'me' ? `<li class="me">あなた：年${fmtOku(l.a)}×${l.y}年でどうですか</li>`
    : `<li class="co">${esc(o.co)}：${l.t === 'final' ? `年${fmtOku(l.a)}×${l.y}年。これが精一杯です` : `年${fmtOku(l.a)}×${l.y}年なら出せます`}</li>`).join('');
  return { title: `${esc(o.co)}と交渉`, size: 'narrow', body: `<p class="small muted" style="margin:0 0 8px">${dealLabel(kind, o)}${kind === 'nm' ? `「${esc(o.name)}」` : ''}${o.renew ? '（契約更新）' : ''}</p>
    <dl class="kv"><dt>相手の条件</dt><dd><b>年${fmtOku(o.annual)}</b>×${o.yrs}年</dd><dt>相場</dt><dd>年${fmtOku(v)}</dd><dt>相手が望む年数</dt><dd>${o.py}年</dd>
      <dt>相手の様子</dt><dd><span class="${mood.c}">${mood.t}</span></dd><dt>営業部長の読み</dt><dd>${hint ? `上限は年${fmtOku(hint.lo)}〜${fmtOku(hint.hi)}くらい` : '<span class="faint">読めない</span>'}</dd></dl>
    ${log ? `<ul class="dlog">${log}</ul>` : ''}
    <hr class="sep">
    <div class="field"><span>契約年数</span>${seg('dealYrs', Array.from({ length: y1 - y0 + 1 }, (_, i) => [y0 + i, (y0 + i) + '年']), f.yrs)}<span class="small muted">相手が望む年数から外れるほど、出せる額は下がります</span></div>
    <div class="field" style="margin-top:10px"><span>こちらの希望額（年・${moneyUnit()}）</span><div class="row"><input class="inp num" style="width:150px" type="number" step="${LG.mlb ? 1 : 100}" min="0" value="${moneyShow(f.ask)}" data-i="dealAsk" aria-label="希望額（${moneyUnit()}）"><span class="small muted" id="dealFmt">${fmtOku(f.ask)}</span></div>
      <div class="row" style="margin-top:6px">${[1.05, 1.1, 1.2].map(m => `<button class="btn xs" data-a="dealMul" data-v="${m}">相手の条件の${Math.round((m - 1) * 100)}%増し</button>`).join('')}<button class="btn xs" data-a="dealSet" data-v="${roundSal(v)}">相場</button>${hint ? `<button class="btn xs" data-a="dealSet" data-v="${hint.lo}">読みの下限</button>` : ''}</div></div>
    ${share < 1 ? `<p class="small muted" style="margin:10px 0 0">球場を借りているため、球団に入るのは${share * 10}割です。</p>` : ''}`,
    foot: `<button class="btn" data-a="closeModal">あとで</button><button class="btn" data-a="dealTake" data-k="${kind}" data-id="${id}">相手の条件で契約</button><button class="btn pri" data-a="dealGo" data-k="${kind}" data-id="${id}">この条件で提案する</button>` };
};
ACT.dealOpen = el => { const kind = el.dataset.k, id = +el.dataset.id; const o = dealFind(kind, id); if (!o) return; UI.f.deal = { kind, id, ask: roundSal(o.annual * 1.1), yrs: o.yrs }; openModal('deal', { kind, id }); render(); };
ACT.dealYrs = el => { if (!UI.f.deal) return; UI.f.deal.yrs = +el.dataset.v; renderModalRoot(); };
ACT.dealAsk = el => { const f = UI.f.deal; if (!f) return; f.ask = Math.max(0, LG.mlb ? moneyFrom(+el.value || 0) : Math.round(+el.value || 0)); const a = $('#dealFmt'); if (a) a.textContent = fmtOku(f.ask); };
ACT.dealMul = el => { const f = UI.f.deal; if (!f) return; const o = dealFind(f.kind, f.id); if (!o) return; f.ask = roundSal(o.annual * +el.dataset.v); renderModalRoot(); };
ACT.dealSet = el => { if (!UI.f.deal) return; UI.f.deal.ask = +el.dataset.v; renderModalRoot(); };
ACT.dealGo = el => {
  const kind = el.dataset.k, id = +el.dataset.id; const f = UI.f.deal; if (!f) return;
  const o = dealFind(kind, id); if (!o) { closeModal(); render(); return; }
  const co = o.co; const r = negotiateDeal(kind, id, f.ask, f.yrs);
  if (r.res === 'signed') { toast(`${co}と合意しました（年${fmtOku(r.annual)}×${r.yrs}年）`, 'good'); closeModal(); }
  else if (r.res === 'walk') { toast(r.angry ? `${co}は気分を害して、交渉を打ち切りました` : `${co}との交渉は決裂しました`, 'bad'); closeModal(); }
  else if (r.res === 'counter') { toast(`${co}「年${fmtOku(r.annual)}×${r.yrs}年${r.final ? 'が精一杯です' : 'なら出せます'}」`); renderModalRoot(); }
  else closeModal();
  render();
};
ACT.dealTake = el => { const kind = el.dataset.k, id = +el.dataset.id; const o = dealFind(kind, id); if (!o) return; const co = o.co; if (takeDeal(kind, id)) toast(`${co}と契約しました（年${fmtOku(o.annual)}×${o.yrs}年）`, 'good'); if (UI.modal && UI.modal.k === 'deal') closeModal(); render(); };

/* ---------- ファン・広報 ---------- */
SCREENS.fans = () => {
  const tab = getTab('fans', 'sum'); const T = uT();
  const tb = tabs('fans', [['sum', '人気とファン'], ['fc', 'ファンクラブ'], ['ads', '広告'], ['promo', '球場イベント'], ['goods', 'グッズ企画']], tab);
  const pt = popTarget(T);
  const head = `<h1 class="h1">ファン・広報</h1><div class="panel" style="margin-bottom:16px">${tiles([['人気', Math.round(T.pop), `目標水準 ${Math.round(pt.v)}`], ['ファン人口', Math.round(T.fans) + '万人'], ['ファンクラブ', fmtPeople(Math.round(G.fc.members))], ['観戦満足度', Math.round(stadSatisfaction())], ['地域の愛着', Math.round(G.town.attach)]])}</div>`;
  let body = '';
  if (tab === 'sum') {
    const P = pt.parts; const L = { base: '球団の地力（市場規模）', perf: 'チームの成績', star: 'スター選手', mgr: '監督の知名度', bonus: '優勝などの余韻', ads: '広告', sat: '観戦満足度', town: '街と地域の愛着', pr: '広報部長', pol: '球団方針' };
    const rows = Object.entries(P).map(([k, v]) => `<tr><td>${L[k] || k}</td><td class="num ${v < 0 ? 'neg' : ''}">${v >= 0 ? '+' : ''}${v.toFixed(1)}</td></tr>`).join('');
    const H = G.fin.hist;
    body = `<div class="grid g2">${panel('人気を決める要因', `<table class="t compact"><tbody>${rows}<tr><td><b>目標水準</b></td><td class="num"><b>${pt.v.toFixed(1)}</b></td></tr></tbody></table><p class="small muted">人気は毎週少しずつ目標水準に近づきます。勝てば上がり、負ければ下がります。</p>`)}
      ${panel('他球団との比較', `<table class="t compact"><thead><tr><th>球団</th><th class="num">人気</th><th class="num">ファン人口</th><th class="num">平均観客</th></tr></thead><tbody>${G.teams.slice().sort((a, b) => b.pop - a.pop).map(t => `<tr class="${isUser(t.id) ? 'me' : ''}"><td>${tMark(t.id)}</td><td class="num">${Math.round(t.pop)}</td><td class="num">${Math.round(t.fans)}万</td><td class="num">${t.att && t.att.g ? comma(t.att.tot / t.att.g) : '―'}</td></tr>`).join('')}</tbody></table>`, { flush: true })}</div>` +
      (H.length ? '<div style="height:16px"></div>' + panel('人気とファンクラブの推移', lineChart([{ n: '人気', c: 'var(--team)', v: H.map(h => h.pop) }], H.map(h => String(h.y)), { label: '人気の推移' })) : '');
  } else if (tab === 'fc') {
    const FC = G.fc;
    const rows = Object.entries(FC_TIERS).map(([k, d]) => `<tr><td>${d.n}</td><td class="num">${fmtPct(d.mix, 0)}</td><td class="num">${fmtPrice(d.ref)}</td><td><input class="inp num" style="width:100px" type="number" step="${LG.mlb ? 5 : 500}" min="0" value="${priceShow(FC.fee[k])}" data-c="fcFee" data-k="${k}"> ${LG.mlb ? 'ドル' : '円'}</td></tr>`).join('');
    body = `<div class="grid g2">${panel('会費と特典', `<table class="t"><thead><tr><th>会員種別</th><th class="num">構成比</th><th class="num">相場</th><th>年会費</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="field" style="margin-top:12px"><span>特典の充実度（会員1人あたり年${comma(FC.ben * 800)}円の費用）</span>${seg('fcBen', [1, 2, 3, 4, 5].map(i => [i, 'Lv' + i]), FC.ben)}</div>
      <div class="row" style="margin-top:12px"><button class="btn" data-a="fcCamp" ${FC.camp > 0 ? 'disabled' : ''}>入会キャンペーン（4週・毎週300万円）</button>${FC.camp > 0 ? `<span class="small">実施中 残り${FC.camp}週</span>` : ''}</div>`)}
      ${panel('会員数', `<dl class="kv"><dt>会員数</dt><dd>${fmtPeople(Math.round(FC.members))}</dd><dt>目標水準</dt><dd>${fmtPeople(Math.round(fcTarget()))}</dd><dt>平均年会費</dt><dd>${fmtPrice(fcAvgFee())}</dd><dt>今年の新規入会</dt><dd>${fmtPeople(Math.round(FC.joinY || 0))}</dd><dt>前回の継続率</dt><dd>${fmtPct(FC.lastRet || 0.8, 0)}</dd></dl><p class="small muted">会員は毎年1月に更新します。会費が相場より高いと入会が減り、特典が充実すると増えます。会員は球場にもよく来てくれます。</p>`)}</div>`;
  } else if (tab === 'ads') {
    const rows = Object.entries(ADS).map(([k, d]) => `<tr><td><b>${d.n}</b><div class="small muted">${d.d}</div></td><td class="num">${fmtOku(d.cost)}</td><td>${seg('adLv', [0, 1, 2, 3].map(i => [i, i ? '強度' + i : '止める']), G.ads.lv[k] || 0, `data-k="${k}"`)}</td><td class="num">${fmtOku(d.cost * (G.ads.lv[k] || 0))}</td></tr>`).join('');
    const yearly = adWeeklyCost() * 48;
    body = panel(`広告の出稿（年${fmtOku(yearly)}・予算${fmtOku(G.budget.ads)}）`, `<div class="tw"><table class="t"><thead><tr><th>媒体</th><th class="num">週あたり単価</th><th>強度</th><th class="num">週あたり費用</th></tr></thead><tbody>${rows}</tbody></table></div>${yearly > G.budget.ads ? '<p class="small neg" style="padding:0 14px">出稿ペースが広告予算を超えています。</p>' : ''}`, { flush: true }) + '<p class="small muted">強度を上げるほど効果は増えますが、伸び方はゆるやかになります。広報部長の力で効果が変わります。</p>';
  } else if (tab === 'goods') {
    const fl = G.flags; const on = fl.goodsWeeks > 0;
    body = `<div class="grid g2">${panel('新しいグッズを企画する', `<div class="lot">${Object.entries(GOODS).map(([k, d]) => `<div class="lot-row"><div style="flex:1"><b>${d.n}</b> <span class="small muted">${fmtOku(d.cost)}・${d.wk}週間</span><div class="small muted">${d.d}（グッズ売上+${Math.round(d.boost * 100)}%）</div></div><button class="btn sm pri" data-a="goodsGo" data-k="${k}" ${on ? 'disabled' : ''}>企画する</button></div>`).join('')}</div>`)}
      ${panel('いまの売れ行き', `<dl class="kv"><dt>今年のグッズ売上</dt><dd>${fmtOku(G.fin.y.rev.goods || 0)}</dd><dt>グッズショップ</dt><dd>Lv${G.stad.fac.shop.lv}</dd><dt>企画の効果</dt><dd>${on ? `+${Math.round((fl.goodsBoost || 0) * 100)}%（残り${fl.goodsWeeks}週）` : 'なし'}</dd></dl><p class="small muted">企画は1つずつ。売上は人気・観客数・グッズショップの規模でも変わります。</p>`)}</div>`;
  } else {
    const q = G.promo.queue;
    const cards = Object.entries(PROMOS).map(([k, d]) => `<div class="lot-row"><div style="flex:1"><b>${d.n}</b> <span class="small muted">${fmtOku(d.cost)}／回</span><div class="small muted">${d.d}</div></div><span class="small">予定 ${q.filter(x => x === k).length}回</span><button class="btn sm" data-a="promoAdd" data-k="${k}">1回追加</button><button class="btn sm" data-a="promoDel" data-k="${k}" ${q.includes(k) ? '' : 'disabled'}>減らす</button></div>`).join('');
    body = `<div class="grid g2">${panel('イベントの予約', `<div class="lot">${cards}</div><p class="small muted">予約した順に、週末のホームゲームで1試合ずつ開催します。季節限定のものは時期が来るまで飛ばされます。</p>`)}
      ${panel('最近の開催', G.promo.log.length ? `<table class="t compact"><tbody>${G.promo.log.slice(0, 12).map(l => `<tr><td class="small">${esc(l.date)}</td><td>${PROMOS[l.k].n}</td><td class="num">${comma(l.att)}人</td></tr>`).join('')}</tbody></table>` : '<div class="empty">まだ開催していません</div>')}</div>`;
  }
  return head + tb + body;
};
ACT.fcFee = el => { G.fc.fee[el.dataset.k] = LG.mlb ? priceFrom(clamp(Math.round(+el.value), 0, 3000)) : clamp(Math.round(+el.value / 100) * 100, 0, 100000); render(); };
ACT.fcBen = el => { G.fc.ben = +el.dataset.v; render(); };
ACT.fcCamp = () => { G.fc.camp = 4; toast('入会キャンペーンを始めました', 'good'); render(); };
ACT.adLv = el => { G.ads.lv[el.dataset.k] = +el.dataset.v; render(); };
ACT.promoAdd = el => { G.promo.queue.push(el.dataset.k); render(); };
ACT.promoDel = el => { const i = G.promo.queue.lastIndexOf(el.dataset.k); if (i >= 0) G.promo.queue.splice(i, 1); render(); };

/* ---------- 街づくり ---------- */
SCREENS.town = () => {
  const tw = G.town; const st = tw.stat;
  const tab = getTab('town', 'map');
  const nEv = (tw.events || []).length;
  const stg = townStage();
  const head = `${art(townArt(stg.i), { h1: true, kicker: `街づくり・段階 ${stg.i}／${stg.max}`, title: stg.n, sub: '球場の周りに街をつくり、試合がない日も人が集まる「ボールパーク」を目指します。イベントで人を呼ぶと、空いている土地に民間の店や住宅が建っていきます。' })}
  <div class="panel" style="margin-bottom:16px">${tiles([['街の段階', stg.n, `段階 ${stg.i}／${stg.max}`, 'txt'], ['アクセス', st.acc], ['賑わい', st.vib, st.vib !== st.vibBase ? `いつもの賑わい ${st.vibBase}` : ''], ['住民', fmtPeople(Math.round(st.pop))], ['地域の愛着', Math.round(tw.attach)], ['発展の勢い', Math.round(tw.dev || 0), (tw.dev || 0) >= DEV_START ? '民間の開発が進行中' : DEV_START + 'で民間の開発が始まる'], ['地価', '×' + tw.landIdx.toFixed(2)], ['街の収入', fmtOku(townWeeklyRevenue(curTurn() >= 11 && curTurn() <= 38)) + '／週']])}</div>
  ${tabs('town', [['map', '区画と建物'], ['ev', '街のイベント', nEv || null]], tab)}`;
  return head + (tab === 'ev' ? townEventsView() : townMapView());
};
function townMapView() {
  const tw = G.town;
  const sel = UI.sel.cell != null ? tw.cells[UI.sel.cell] : null;
  const grid = tw.cells.map((c, i) => {
    let ic = '', lb = '', cls = c.own ? 'own' : '';
    if (c.sp === 'stadium') { ic = '🏟️'; lb = '本拠地'; cls += ' stadium'; }
    else if (c.sp === 'station') { ic = '🚉'; lb = '最寄り駅'; cls += ' station'; }
    else if (c.pv) { ic = PRIV_BLD[c.pv.k].i; lb = PRIV_BLD[c.pv.k].n; cls += ' priv'; }
    else if (c.b) { ic = BLD[c.b.k].i; lb = c.b.wk ? `工事中 ${c.b.wk}週` : BLD[c.b.k].n; if (c.b.wk) cls += ' wip'; }
    else { ic = c.own ? '<span style="color:var(--lamp)">＋</span>' : ''; lb = c.own ? '空き地' : '売地 ' + fmtOku(landPrice(c)).replace('円', ''); }
    return `<button class="cell ${cls} ${UI.sel.cell === i ? 'sel' : ''}" data-a="cell" data-i="${i}" aria-label="${esc(lb)}">${c.b && c.b.lv > 1 ? `<span class="lvb">Lv${c.b.lv}</span>` : ''}<span class="ic">${ic}</span><span class="lb">${esc(lb)}</span></button>`;
  }).join('');
  let side = null;
  if (sel) {
    if (sel.sp === 'stadium') side = `<p><b>${esc(stadiumName())}</b></p><button class="btn" data-a="go" data-v="stadium">球場・設備へ</button>`;
    else if (sel.sp === 'station') side = '<p>既存の最寄り駅です。駅からのアクセスは「シャトルバス乗り場」や「新駅」で改善できます。</p>';
    else if (sel.pv) {
      const d = PRIV_BLD[sel.pv.k]; const bp = buyoutPrice(sel);
      const fx = [d.vib ? `賑わい+${d.vib}` : '', d.pop ? `住民+${comma(d.pop)}` : '', d.attach ? '地域の愛着がじわじわ上がる' : '', d.food ? '飲食売上+' + Math.round(d.food * 100) + '%' : '', d.fans ? 'ファンが少し増える' : ''].filter(Boolean).join('　');
      side = `<p><b>${d.i} ${d.n}</b>（民間・${sel.pv.y}年〜）</p><p class="small muted">街の発展で民間が建てた建物です。球団にお金はかかりません。</p><div class="evfx">${fx}</div>
        <dl class="kv" style="margin-top:10px"><dt>買い取り価格</dt><dd>${fmtOku(bp)}</dd></dl>
        <button class="btn" style="margin-top:10px" data-a="buyPriv" ${G.fin.cash >= bp ? '' : 'disabled'}>買い取って球団の土地にする</button><p class="small muted">買い取ると建物はなくなり、上の効果も消えます。大きな施設を建てたいときに。</p>`;
    }
    else if (!sel.own) side = `<p>民有地です。購入すると建物を建てられます。</p><dl class="kv"><dt>土地の価格</dt><dd>${fmtOku(landPrice(sel))}</dd></dl><button class="btn pri" style="margin-top:10px" data-a="buyLand" ${G.fin.cash >= landPrice(sel) ? '' : 'disabled'}>購入する</button><p class="small muted">街が賑わうほど地価は上がります。放っておくと民間の建物が建つこともあります。</p>`;
    else if (sel.b) {
      const d = BLD[sel.b.k]; const up = sel.b.lv < 3 && !sel.b.wk;
      side = `<p><b>${d.i} ${d.n}</b> Lv${sel.b.lv}${sel.b.wk ? `（工事中・残り${sel.b.wk}週）` : ''}</p><p class="small muted">${d.d}</p>${bldEffects(d, bldMul(sel.b))}
        <div class="row" style="margin-top:10px">${up ? `<button class="btn pri" data-a="bldUp" ${G.fin.cash >= bldCost(sel.b.k, sel.b.lv + 1) ? '' : 'disabled'}>拡張 Lv${sel.b.lv + 1}（${fmtOku(bldCost(sel.b.k, sel.b.lv + 1))}）</button>` : ''}<button class="btn danger" data-a="bldDel">取り壊す</button></div>`;
    } else {
      side = `<p class="small muted">球団の空き地です。建てる施設を選んでください。${nearStadium(sel) ? '<b>球場隣接のため飲食・商業の効果が2割増し。</b>' : ''}</p><div class="lot">${Object.entries(BLD).map(([k, d]) => { const c = canBuild(sel, k); return `<div class="lot-row"><span style="font-size:22px">${d.i}</span><div style="flex:1"><b>${d.n}</b> <span class="small muted">${fmtOku(d.cost)}・${d.wk}週・維持${fmtOku(d.maint)}/週</span><div class="small muted">${d.d}</div>${bldEffects(d, 1)}</div><button class="btn sm pri" data-a="bld" data-k="${k}" ${c.ok ? '' : `disabled title="${esc(c.why)}"`}>建てる</button></div>`; }).join('')}</div>`;
    }
  }
  const hint = '<p class="small muted" style="margin:10px 0 0">区画を選ぶと、土地の購入や建物の建設ができます（もう一度押すと選択を外します）。球場の周り（隣接8マス）は飲食や商業の効果が2割増し。「民」の印は、街の発展で民間が建てた建物です。</p>';
  return `<div class="grid g2"><div class="panel"><div class="panel-b"><div class="town">${grid}</div>${hint}</div></div>${side ? panel('選んだ区画', side, { act: '<button class="btn sm" data-a="cellOff">選択を外す</button>' }) : panel('街の段階', townStageLadder())}</div>`;
}
/* 10段階の一覧。上ほど発展した姿 */
function townStageLadder() {
  const tw = G.town; const s = townStage(); const log = tw.stageLog || []; const top = Math.max(tw.stageMax || 0, s.i);
  const rows = TOWN_STAGES.map(([t, n], k) => {
    const i = k + 1; const at = log.find(l => l.i === i);
    const cls = i === s.i ? 'cur' : i <= top ? 'done' : '';
    const note = i === s.i ? 'いま' : at ? `${at.y}年${at.m}月` : i <= top ? '到達' : `賑わい${t}`;
    return `<li class="${cls}"><span class="no">${i}</span><span class="nm">${n}</span><span class="th">${note}</span></li>`;
  }).reverse().join('');
  const prog = s.next != null
    ? `<p class="small" style="margin:0 0 6px">次の「${s.nextN}」まで、いつもの賑わいがあと <b>${Math.max(1, s.next - Math.floor(s.v))}</b></p>${bar(s.v - s.cur, s.next - s.cur)}`
    : '<p class="small" style="margin:0">最後の段階に到達しました。</p>';
  return `${prog}<ol class="ladder">${rows}</ol><p class="small muted" style="margin:10px 0 0">段階は、建物と民間の店でできた「いつもの賑わい」で決まります（イベント中の上乗せは含みません）。新しい段階に届くたびに、地域の愛着・人気・ファンが少し増えます。</p>`;
}
function evEffects(d, m) {
  const out = [];
  if (d.vib) out.push(`開催中の賑わい+${d.vib}`);
  out.push(`発展の勢い+${Math.round(d.dev * m)}`);
  if (d.attach) out.push(`地域の愛着+${r1(d.attach * m)}`);
  if (d.fans) out.push(`ファン+${r1(d.fans * m)}`);
  if (d.pop) out.push(`人気+${r1(d.pop * m)}`);
  if (d.acc) out.push(`アクセス+${d.acc}（ずっと）`);
  if (d.rev) out.push(`収入 約${fmtOku(d.rev * m)}`);
  return `<div class="evfx">${out.join('　')}</div>`;
}
function townEventsView() {
  const tw = G.town; const evs = tw.events || [];
  const evPic = evs.find(e => hasArt('ev_' + e.k));
  const running = evs.length ? (evPic ? art('ev_' + evPic.k, { h: 'mini', title: TOWN_EVENTS[evPic.k].n, sub: '開催中' }) : '') + `<div class="lot">${evs.map(e => { const d = TOWN_EVENTS[e.k]; return `<div class="lot-row"><span style="font-size:22px">${d.i}</span><div style="flex:1;min-width:160px"><b>${d.n}</b> <span class="small muted">残り${e.wk}週</span>${bar(e.tot - e.wk, e.tot)}</div></div>`; }).join('')}</div>`
    : '<p class="muted" style="margin:0">いま開いているイベントはありません。下の一覧から開催できます（同時に2つまで）。</p>';
  const dev = tw.dev || 0;
  const sg = townStage();
  const devHtml = `${bar(dev, DEV_MAX, '', DEV_START)}<p class="small" style="margin:8px 0 0">街の段階：<b>${sg.n}</b>（${sg.i}／${sg.max}）${sg.next != null ? `。次の「${sg.nextN}」まで、いつもの賑わいがあと${Math.max(1, sg.next - Math.floor(sg.v))}` : ''}</p><p class="small muted" style="margin:6px 0 0">勢いが${DEV_START}を超えると、空いている民有地に民間の店や住宅が建ち始めます。勢いはイベントや街の賑わいでたまり、建物が1つ建つたびに使われます。今年のイベント来場者：<b>${fmtPeople(tw.visitY || 0)}</b></p>`;
  const list = Object.entries(TOWN_EVENTS).map(([k, d]) => {
    const c = eventCanHost(k); const m = eventMult(k); const on = evs.some(e => e.k === k);
    const when = [d.months ? d.months.join('・') + '月' : '通年', d.off ? 'オフ限定' : '', `${d.wk}週間`].filter(Boolean).join('・');
    return `<div class="evrow ${on ? 'on' : ''}${hasArt('ev_' + k) ? ' pic' : ''}">${hasArt('ev_' + k) ? art('ev_' + k, { h: 'thumb' }) : `<div class="ei">${d.i}</div>`}<div><b>${d.n}</b> <span class="small muted">${fmtOku(d.cost)}・${when}</span><div class="small muted">${d.d}</div>${evEffects(d, m)}</div>
      <button class="btn sm pri" data-a="hostEv" data-k="${k}" ${c.ok ? '' : 'disabled'}>開催する</button>${c.ok ? '' : `<div class="why">${esc(c.why)}</div>`}</div>`;
  }).join('');
  const log = (tw.evLog || []).slice(0, 8);
  const logHtml = log.length ? `<ul class="tasks">${log.map(l => `<li><span>${TOWN_EVENTS[l.k].i} ${TOWN_EVENTS[l.k].n}</span><span class="small muted">${l.y}年${l.m}月・約${fmtPeople(l.visit)}</span></li>`).join('')}</ul>` : '<p class="muted" style="margin:0">まだ開催していません。</p>';
  return `<div class="grid g2 evgrid"><div class="stack">${panel('開催できるイベント', `<div class="lot">${list}</div>`)}</div>
    <div class="stack">${panel('開催中', running)}${panel('発展の勢いと街の段階', devHtml)}${panel('これまでのイベント', logHtml, { flush: !!log.length })}</div></div>`;
}
function bldEffects(d, m) {
  const L = { acc: 'アクセス', vib: '賑わい', pop: '住民', attach: '地域の愛着', fans: 'ファン', food: '飲食売上', goods: 'グッズ売上', heal: '故障回復', sat: '満足度', popw: '人気' };
  const out = [];
  for (const k in L) if (d[k]) out.push(`${L[k]}+${k === 'food' || k === 'goods' || k === 'heal' ? Math.round(d[k] * m * 100) + '%' : k === 'popw' ? '' : r1(d[k] * m)}`);
  if (d.rev) out.push(`収入${fmtOku(d.rev * m)}/週`);
  if (d.offrev) out.push(`オフ収入${fmtOku(d.offrev * m)}/週`);
  if (d.game) out.push(`試合日${fmtOku(d.game * m)}`);
  if (d.academy) out.push('地元の有望株が増える');
  return `<div class="small" style="color:var(--ball)">${out.join('　')}</div>`;
}
ACT.cell = el => { const i = +el.dataset.i; UI.sel.cell = UI.sel.cell === i ? null : i; render(); };
ACT.cellOff = () => { UI.sel.cell = null; render(); };
ACT.buyLand = () => { const c = G.town.cells[UI.sel.cell]; if (buyLand(c)) toast('土地を購入しました', 'good'); render(); };
ACT.bld = el => { const c = G.town.cells[UI.sel.cell]; const r = build(c, el.dataset.k); if (r.ok) toast('建設を始めました', 'good'); else toast(r.why, 'bad'); render(); };
ACT.bldUp = () => { const c = G.town.cells[UI.sel.cell]; if (upgradeBld(c)) toast('拡張工事を始めました', 'good'); render(); };
ACT.bldDel = () => { const c = G.town.cells[UI.sel.cell]; if (c && c.b) { demolish(c); toast('取り壊しました'); } render(); };
ACT.buyPriv = () => { const c = G.town.cells[UI.sel.cell]; if (c && buyOutPrivate(c)) toast('区画を買い取りました', 'good'); else toast('資金が足りません', 'bad'); render(); };
ACT.hostEv = el => { const k = el.dataset.k; const r = hostEvent(k); if (r.ok) toast(`${TOWN_EVENTS[k].n}を開催します`, 'good'); else toast(r.why, 'bad'); render(); };

/* ---------- 中長期計画・オーナー ---------- */
SCREENS.plan = () => {
  const T = uT(); const t = curTurn();
  const polOpen = t <= 3 || t >= 44;
  const pl = G.plan;
  const sel = UI.f.goals || (UI.f.goals = []);
  let planHtml;
  if (!pl.set) {
    planHtml = `<p>${pl.start}〜${pl.end}年の3か年計画を立てましょう。目標を3つ選びます。達成するとオーナーの信頼が大きく上がり、届かないと下がります。</p><div class="lot">${Object.entries(GOALS).map(([k, g]) => `<label class="lot-row" style="cursor:pointer"><input type="checkbox" data-c="goalPick" data-k="${k}" ${sel.includes(k) ? 'checked' : ''}><div style="flex:1"><b>${g.n}</b>${g.tgt ? `（目標 ${g.fmt(g.tgt())}）` : ''}<div class="small muted">${g.d}</div></div><span class="tag lamp">信頼+${g.r}</span></label>`).join('')}</div><button class="btn pri" style="margin-top:12px" data-a="planSet" ${sel.length === 3 ? '' : 'disabled'}>この3つで計画を立てる（${sel.length}/3）</button>`;
  } else {
    planHtml = `<p class="small muted">${pl.start}〜${pl.end}年の計画</p><div class="stack">${pl.goals.map(g => { const d = GOALS[g.k]; const pr = clamp(goalProgress(g), 0, 1); return `<div><div class="row sp"><b>${d.n}${g.tgt ? `（目標 ${d.fmt(g.tgt)}）` : ''}</b>${g.st === 'done' ? '<span class="tag b">達成</span>' : g.st === 'fail' ? '<span class="tag o">未達</span>' : `<span class="small muted">${Math.round(pr * 100)}%</span>`}</div><div class="small muted">${d.d}</div>${bar(pr, 1, g.st === 'fail' ? 'out' : 'ball')}</div>`; }).join('')}</div>`;
  }
  const R = G.owner.review;
  const hist = G.hist.user;
  return `<h1 class="h1">中長期計画</h1><p class="lead">球団方針と3か年の目標を決め、オーナーの期待に応えます。オーナーの信頼は毎年12月末の評価で変わり、なくなると解任されます。</p>
  <div class="grid g2">
    ${panel('オーナー', `<div class="row" style="gap:16px">${emblem(T, 52)}<div><div><b>${esc(T.parent)}</b></div><div class="small muted">${LG.mlb ? 'オーナーグループ' : '親会社'}</div></div></div>
      <div style="margin-top:12px"><div class="row sp"><span>オーナーの信頼</span><span class="stat-big">${Math.round(G.owner.trust)}</span></div>${bar(G.owner.trust, 100, G.owner.trust >= 50 ? 'ball' : G.owner.trust >= 25 ? 'strike' : 'out')}</div>
      <dl class="kv" style="margin-top:12px"><dt>期待される順位</dt><dd>${expectedRank()}位前後</dd><dt>収支の目標</dt><dd>${fmtSigned(expectedNet())}</dd><dt>補填してもらえる赤字</dt><dd>${fmtOku(subsidyCap())}まで</dd></dl>
      ${R ? `<p class="small muted" style="margin-top:10px">${R.y}年の評価：${R.d >= 0 ? '+' : ''}${Math.round(R.d)}（${R.notes.map(n => esc(n[0])).join('、')}）</p>` : ''}`)}
    ${panel('球団方針', `<div class="lot">${Object.entries(POLICIES).map(([k, p]) => `<label class="lot-row" style="cursor:${polOpen ? 'pointer' : 'default'}"><input type="radio" name="pol2" value="${k}" ${G.user.policy === k ? 'checked' : ''} ${polOpen ? '' : 'disabled'} data-c="polSet"><div><b>${p.n}</b><div class="small muted">${p.d}</div></div></label>`).join('')}</div>${polOpen ? '' : '<p class="small muted">方針の変更はオフシーズン（12月〜1月）にできます。</p>'}`)}
  </div>
  <div style="height:16px"></div>${panel('3か年計画', planHtml)}
  ${G.project ? '<div style="height:16px"></div>' + panel('進行中の大型事業', `<p>新球場（${NEWSTAD[G.project.type].n}）：${G.project.ready ? '完成' : '残り' + G.project.wk + '週'}</p>${bar(G.project.tot - G.project.wk, G.project.tot, 'team')}`) : ''}
  ${hist.length ? '<div style="height:16px"></div>' + panel('就任からの歩み', `<table class="t compact"><thead><tr><th>年</th><th>順位</th><th>成績</th><th class="num">観客</th><th class="num">収支</th><th class="num">信頼</th></tr></thead><tbody>${hist.slice().reverse().map(h => `<tr><td>${h.y}</td><td>${rankStr(h.rank)} ${h.champ ? `<span class="tag lamp">${LG.champ}</span>` : h.lg ? '<span class="tag b">優勝</span>' : ''}</td><td>${h.w}勝${h.l}敗${h.d ? h.d + '分' : ''}</td><td class="num">${fmtPeople(h.att)}</td><td class="num ${h.net < 0 ? 'neg' : 'pos'}">${fmtSigned(h.net)}</td><td class="num">${Math.round(h.trust)}</td></tr>`).join('')}</tbody></table>`, { flush: true }) : ''}`;
};
ACT.goalPick = el => { const s = UI.f.goals; const k = el.dataset.k; const i = s.indexOf(k); if (el.checked && i < 0) { if (s.length >= 3) { el.checked = false; toast('目標は3つまでです', 'bad'); return; } s.push(k); } if (!el.checked && i >= 0) s.splice(i, 1); render(); };
ACT.planSet = () => { if (UI.f.goals.length !== 3) return; setPlan(UI.f.goals); UI.f.goals = []; toast('中期計画を策定しました', 'good'); render(); };
ACT.polSet = el => { G.user.policy = el.value; toast(`球団方針を「${POLICIES[el.value].n}」にしました`); render(); };

ACT.goodsGo = el => {
  const d = GOODS[el.dataset.k]; if (!d || G.flags.goodsWeeks > 0) return;
  book('exp', 'promo', d.cost); G.flags.goodsBoost = d.boost; G.flags.goodsWeeks = d.wk;
  if (d.fans) uT().fans += d.fans; if (d.pop) uT().pop = clamp(uT().pop + d.pop, 0, 99);
  addNews('biz', `新グッズ「${d.n}」を発売しました`, { tid: G.user.tid }); toast(`「${d.n}」を発売しました`, 'good'); render();
};
