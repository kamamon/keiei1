/* =========================================================
   スカウト・ドラフト会議
   ========================================================= */
function regionName(r) { return r === 'frn' ? (LG.mlb ? '海外のプロ選手' : '海外（外国人）') : REGIONS[r]; }
SCREENS.scout = () => {
  const sc = userScouts();
  const scRows = sc.map(s => `<tr><td>${esc(s.name)}</td><td>${gr(s.eye)} <span class="small muted">眼力</span></td><td>${gr(s.nego)} <span class="small muted">交渉</span></td><td class="small muted">${esc(REGIONS[s.reg])}出身</td>
    <td><select class="inp" data-c="scAssign" data-id="${s.id}">${REGIONS.map((r, i) => opt(i, r, s.assign)).join('')}${opt('frn', regionName('frn'), s.assign)}</select></td></tr>`).join('');
  const all = G.prospects;
  const vis = all.filter(prospectVisible);
  const f = UI.f.scf || (UI.f.scf = { cat: 'all', pos: 'all', reg: 'all', mark: false });
  const list = vis.filter(p => (f.cat === 'all' || p.pr.cat === f.cat) && (f.pos === 'all' || (f.pos === 'p' ? isP(p) : !isP(p))) && (f.reg === 'all' || p.home === +f.reg) && (!f.mark || p.pr.mark));
  const regCount = REGIONS.map((r, i) => ({ r, n: vis.filter(p => p.home === i).length, a: sc.filter(s => s.assign === i).length }));
  const t = curTurn();
  const dT = LG.draftT; const dLeft = t <= dT ? dT - t : 48 - t + dT;
  return `<h1 class="h1">スカウト</h1><p class="lead">${LG.mlb ? `高校・大学の選手を調べ、7月第3週のドラフトに備えます。ドラフトが終わると、すぐ翌年の候補の調査が始まります。` : 'アマチュア選手を調べ、10月第4週のドラフト会議に備えます。'}調査を重ねるほど、能力や伸びしろが正確に見えてきます。注目度の低い選手は、担当スカウトを送り込まないと見つかりません。</p>
  <div class="grid g2">
    ${panel('スカウト陣', `<div class="tw"><table class="t compact"><thead><tr><th>名前</th><th>眼力</th><th>交渉</th><th>出身</th><th>担当地域</th></tr></thead><tbody>${scRows || '<tr><td colspan="5" class="muted">スカウトがいません</td></tr>'}</tbody></table></div>`, { flush: true, act: `<button class="btn sm" data-a="go" data-v="staff">採用する</button>` })}
    ${panel('調査の状況', `<dl class="kv"><dt>スカウト活動費</dt><dd>${fmtOku(G.budget.scout)}／年</dd><dt>見つけた選手</dt><dd>${vis.length}人</dd><dt>指名候補（★）</dt><dd>${all.filter(p => p.pr.mark).length}人</dd><dt>ドラフトまで</dt><dd>${LG.mlb ? dLeft + '週' : t <= 39 ? (39 - t) + '週' : '終了'}</dd></dl>
      <div class="tw" style="margin-top:8px"><table class="t compact"><tbody>${regCount.map(x => `<tr><td>${x.r}</td><td class="num">${x.n}人</td><td class="small muted">${x.a ? 'スカウト' + x.a + '人' : '担当なし'}</td></tr>`).join('')}</tbody></table></div>`, { act: '<button class="btn sm" data-a="go" data-v="finance" data-tab="budget">予算</button>' })}
  </div>
  <div style="margin-top:16px">${panel('アマチュア選手', `<div class="row" style="padding:10px 14px">
      <select class="inp" data-c="scf" data-k="cat">${opt('all', '全区分', f.cat)}${DRAFT_CATS.map(([c]) => opt(c, c, f.cat)).join('')}</select>
      <select class="inp" data-c="scf" data-k="pos">${opt('all', '投手・野手', f.pos)}${opt('p', '投手', f.pos)}${opt('b', '野手', f.pos)}</select>
      <select class="inp" data-c="scf" data-k="reg">${opt('all', '全地域', f.reg)}${REGIONS.map((r, i) => opt(i, r, f.reg)).join('')}</select>
      <label class="chk small"><input type="checkbox" data-c="scf" data-k="mark" ${f.mark ? 'checked' : ''}>指名候補だけ</label></div>` + prospectTable('pros', list), { flush: true })}</div>`;
};
function prospectTable(id, list, pickBtn) {
  const cols = [
    { k: 'm', l: '★', v: p => p.pr.mark ? 1 : 0, h: p => `<button class="btn xs ${p.pr.mark ? 'on' : ''}" data-a="scMark" data-id="${p.id}" aria-label="指名候補">${p.pr.mark ? '★' : '☆'}</button>` },
    { k: 'n', l: '名前', v: p => p.name, h: p => `<a class="pl" data-a="player" data-id="${p.id}">${esc(p.name)}</a>${p.pr.gen ? ' ' + genTag(p, true) : ''}${p.pr.local ? ' <span class="tag b">地元志望</span>' : ''}` },
    { k: 'sch', l: '所属', v: p => p.pr.cat, h: p => `<span class="small">${esc(p.pr.school)}</span> <span class="tag">${p.pr.cat}</span>` },
    { k: 'reg', l: '地域', v: p => p.home, h: p => `<span class="small muted">${esc(REGIONS[p.home])}</span>` },
    { k: 'pos', l: '位置', v: p => p.pos, h: p => isP(p) ? (p.pt === 'SP' ? '投手(先)' : '投手(救)') : POS_JP[p.pos] },
    { k: 'age', l: '年齢', v: p => p.age, num: true, h: p => p.age },
    { k: 'hy', l: '注目度', v: p => p.pr.hype, num: true, h: p => p.pr.hype },
    { k: 'sc', l: '調査', v: p => p.pr.sc, h: p => `<div style="width:64px">${bar(p.pr.sc, 100, 'ball')}</div>` },
    { k: 'o', l: '推定総合', v: shownOvr, h: p => av(shownOvr(p)) },
    { k: 'pt', l: '推定伸びしろ', v: p => shownPot(p) || 0, h: p => gr(shownPot(p)) },
    { k: 'a1', l: '主な能力', h: p => isP(p) ? `<span class="small">${shownAttr(p, 'vel')}km ${gr(shownAttr(p, 'ctl'))}${gr(shownAttr(p, 'brk'))}${gr(shownAttr(p, 'sta'))}</span>` : `<span class="small">${gr(shownAttr(p, 'con'))}${gr(shownAttr(p, 'pow'))}${gr(shownAttr(p, 'spd'))}${gr(shownAttr(p, 'fld'))}</span>`, title: '投手：球速/制球/変化球/スタミナ　野手：ミート/パワー/走力/守備' },
    { k: 'v', l: '評価', v: userDraftValue, num: true, h: p => Math.round(userDraftValue(p)) }
  ];
  if (pickBtn) cols.push({ k: 'pick', l: '', h: pickBtn });
  return table(id, cols, list, { sort: { k: 'v', d: true }, maxH: 620, compact: true });
}
ACT.scAssign = el => { const s = G.staff[+el.dataset.id]; if (s) s.assign = el.value === 'frn' ? 'frn' : +el.value; toast(`${s.name}を${regionName(s.assign)}の担当にしました`); render(); };
ACT.scf = el => { const f = UI.f.scf; f[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; render(); };
ACT.scMark = el => { const p = G.prospects.find(x => x.id === +el.dataset.id); if (p) p.pr.mark = !p.pr.mark; render(); };
function prospectModal(p) {
  const keys = isP(p) ? PIT_KEYS : BAT_KEYS; const sc = p.pr.sc; const sig = scoutSigma(p);
  const attr = keys.map(k => { const v = shownAttr(p, k); const rg = k === 'vel' ? Math.round(sig * 0.3) : Math.round(sig); return `<div class="row sp"><span class="small">${ATTR_JP[k]}</span><span>${k === 'vel' ? v + 'km/h' : av(v)} <span class="small faint">±${rg}</span></span></div>`; }).join('');
  return { title: `${esc(p.name)} <span class="small muted">${esc(p.pr.school)}</span> ${genTag(p)}`, size: 'narrow',
    body: `${p.pr.gen ? `<p class="gen-note">「${esc(p.pr.nick || '怪物')}」と呼ばれる、10年に一度の逸材です。${LG.mlb ? '全体1位指名の最有力候補です。' : '1位指名は複数球団の競合が確実です。'}</p>` : ''}<div class="row"><span class="tag">${p.pr.cat}</span><span class="tag">${isP(p) ? '投手' : POS_JP[p.pos]}</span><span class="small muted">${p.age}歳　${handStr(p)}　${esc(REGIONS[p.home])}</span></div>
      <dl class="kv" style="margin-top:10px"><dt>注目度</dt><dd>${p.pr.hype}</dd><dt>調査度</dt><dd>${Math.round(sc)}%</dd><dt>推定総合</dt><dd>${av(shownOvr(p))}</dd><dt>推定伸びしろ</dt><dd>${shownPot(p) != null ? gr(shownPot(p)) : '<span class="faint">調査25%以上で判明</span>'}</dd>
      <dt>性格</dt><dd>${sc >= 60 ? esc(PERS[p.per].n) : '<span class="faint">調査60%以上で判明</span>'}</dd><dt>故障のしやすさ</dt><dd>${sc >= 80 ? (p.inj >= 65 ? '多い' : p.inj >= 40 ? '普通' : '少ない') : '<span class="faint">調査80%以上で判明</span>'}</dd>
      <dt>意中の球団</dt><dd>${sc >= 50 ? (p.pr.pref != null ? tMark(p.pr.pref) : (p.pr.local ? '地元球団を希望' : '特になし')) : '<span class="faint">調査50%以上で判明</span>'}</dd></dl><hr class="sep">${attr}
      <hr class="sep">${!isP(p) ? `<div class="row small" style="margin-bottom:6px">守れる位置：${POS_JP[p.pos]} ${subTags(p, { empty: '<span class="faint">ほかになし</span>' })}</div>` : ''}<div class="small muted" style="margin-bottom:4px">特殊能力</div>${sc >= 50 ? skChips(p) : '<span class="faint small">調査50%以上で判明</span>'}`,
    foot: `<button class="btn" data-a="closeModal">閉じる</button><button class="btn" data-a="peOpen" data-id="${p.id}">編集</button><button class="btn ${p.pr.mark ? '' : 'pri'}" data-a="scMarkM" data-id="${p.id}">${p.pr.mark ? '候補から外す' : '指名候補に入れる'}</button>` };
}
ACT.scMarkM = el => { const p = G.prospects.find(x => x.id === +el.dataset.id); if (p) p.pr.mark = !p.pr.mark; renderModalRoot(); render(); };

/* ---------- ドラフト会議 ---------- */
SCREENS.draft = () => {
  const t = curTurn(); const D = G.draft; const ut = G.user.tid;
  if (LG.mlb) return draftMLB();
  const head = art('draft', { h1: true, kicker: `${G.year}年 10月第4週`, title: 'ドラフト会議', sub: t === 39 ? 'いよいよ指名の日。1位は一斉入札、重なれば抽選です' : '' });
  if (t !== 39 || !D) {
    const marked = G.prospects.filter(p => p.pr.mark);
    const last = D && D.picks ? draftSummary(D) : '';
    return head + `<p class="lead">10月第4週に開催。1位指名は12球団が同時に入札し、重複したら抽選。2位以降は成績の低い球団から順に指名（3位は逆順）。最後に育成選手の指名があります。</p>` +
      (last || panel(`指名候補（★） ${marked.length}人`, marked.length ? prospectTable('dboard', marked) : '<div class="empty">スカウト画面で、気になる選手に★をつけておきましょう。</div>', { flush: true, act: '<button class="btn sm" data-a="go" data-v="scout">スカウト</button>' }));
  }
  if (D.stage === 'done') return head + `<p class="lead">ドラフト会議が終わりました。指名した選手は2軍（育成は育成）に入団し、来季から公式戦に出られます。</p>` + draftSummary(D);
  const av2 = availableProspects().filter(prospectVisible);
  let main = '';
  const r1log = D.r1log.map((r, i) => panel(i === 0 ? '1位指名の結果' : `外れ1位（${i + 1}回目）の結果`, `<div class="lot">${r.picks.map(x => { const p = G.prospects.find(y => y.id === x.pid); return `<div class="lot-row reveal ${x.teams.includes(ut) ? 'win' : ''}"><div style="flex:1"><b>${p ? esc(p.name) : '?'}</b> <span class="small muted">${p ? esc(p.pr.school) : ''}</span></div><div class="row small">${x.teams.map(tid => `<span class="${tid === x.win ? 'tag team' : 'tag'}">${esc(tShort(tid))}${x.teams.length > 1 && tid === x.win ? ' 交渉権' : ''}</span>`).join('')}</div>${x.teams.length > 1 ? `<span class="tag lamp">${x.teams.length}球団競合</span>` : ''}</div>`; }).join('')}</div>`)).join('<div style="height:12px"></div>');
  if (D.stage === 'r1') {
    const userPending = D.pending.includes(ut);
    main = (r1log ? r1log + '<div style="height:16px"></div>' : '') + (userPending ? panel(D.r1log.length ? '外れ1位を指名してください' : '1位指名する選手を選んでください', prospectTable('d1', av2, p => `<button class="btn xs pri" data-a="dPick" data-id="${p.id}">指名</button>`), { flush: true, cls: 'hl' }) :
      `<div class="row"><button class="btn pri" data-a="dNext">2位以降の指名へ進む</button></div>`);
  } else {
    const myTurn = D.order[D.idx] === ut && !D.userStop;
    const mine = D.picks.filter(x => x.tid === ut);
    main = `<div class="row sp" style="margin-bottom:10px"><div><b>${D.ik ? '育成選手ドラフト' : '支配下ドラフト'} ${D.round}巡目</b>　<span class="small muted">指名済み ${mine.filter(x => !x.ik).length}人（育成${mine.filter(x => x.ik).length}人）／支配下 ${shihai(ut).length + mine.filter(x => !x.ik).length}人見込み</span></div>
      <div class="row">${myTurn ? `<button class="btn" data-a="dStop">${D.ik ? '育成指名を終える' : '支配下の指名を終える'}</button>` : `<button class="btn pri" data-a="dNext">自分の番まで進める</button>`}<button class="btn" data-a="dAuto">残りを自動で指名</button></div></div>` +
      (myTurn ? panel(`あなたの番です（${D.round}巡目）`, prospectTable('dr', av2, p => `<button class="btn xs pri" data-a="dPick" data-id="${p.id}">指名</button>`), { flush: true, cls: 'hl' }) : '') +
      '<div style="height:14px"></div>' + draftPickLog(D);
  }
  return head + `<p class="lead">${D.stage === 'r1' ? '1位は12球団が同時に入札します。人気の選手は抽選になります。' : '指名順は成績の低い球団から。巡目ごとに順番が入れ替わります。'}</p>` + main;
};
function draftPickLog(D) {
  const rows = D.picks.slice().reverse().slice(0, 40).map(x => { const p = G.prospects.find(y => y.id === x.pid) || P_(x.pid); return `<tr class="${x.tid === G.user.tid ? 'me' : ''}"><td class="small">${x.ik ? '育成' : ''}${x.round}${LG.mlb ? '巡目' : '位'}${LG.mlb && x.no ? `<span class="faint">（${x.no}）</span>` : ''}</td><td>${tMark(x.tid)}</td><td>${p ? esc(p.name) : esc(x.name || '?')}</td><td class="small muted">${esc(p ? (p.pr || p.prInfo || {}).school || '' : x.school || '')}</td><td class="small">${p ? (isP(p) ? '投手' : POS_JP[p.pos]) : (x.pos ? POS_JP[x.pos] : '')}</td></tr>`; }).join('');
  return panel('指名の記録（新しい順）', rows ? `<div class="tw" style="max-height:420px;overflow-y:auto"><table class="t compact"><tbody>${rows}</tbody></table></div>` : '<div class="empty">まだ指名はありません</div>', { flush: true });
}
function draftSummary(D) {
  const ut = G.user.tid;
  const mine = D.picks.filter(x => x.tid === ut);
  const rows = mine.map(x => { const p = P_(x.pid) || G.prospects.find(y => y.id === x.pid); return `<tr><td>${x.ik ? '育成' : ''}${x.round}位</td><td>${x.refused || !p ? esc(x.name || (p ? p.name : '?')) : pLink(p)}</td><td class="small muted">${esc(p ? (p.prInfo || p.pr || {}).school || '' : x.school || '')}</td><td>${p ? (isP(p) ? '投手' : POS_JP[p.pos]) : (x.pos ? POS_JP[x.pos] : '')}</td><td class="num">${p ? p.age : ''}</td><td>${x.refused ? '<span class="tag o">入団拒否</span>' : x.lot ? `<span class="tag lamp">${x.lot.length}球団競合</span>` : ''}</td></tr>`; }).join('');
  const others = G.teams.filter(t => t.id !== ut).map(T => { const f = D.picks.find(x => x.tid === T.id && x.round === 1 && !x.ik); const p = f ? (P_(f.pid) || G.prospects.find(y => y.id === f.pid)) : null; return `<tr><td>${tMark(T.id)}</td><td>${p ? esc(p.name) : f && f.name ? esc(f.name) : '―'}</td><td class="num">${D.picks.filter(x => x.tid === T.id && !x.ik).length}人</td><td class="num">${D.picks.filter(x => x.tid === T.id && x.ik).length}人</td></tr>`; }).join('');
  return `<div class="grid g2">${panel('自球団の指名', `<table class="t compact"><tbody>${rows || '<tr><td class="muted">指名なし</td></tr>'}</tbody></table>`, { flush: true })}${panel('他球団の1位と指名数', `<table class="t compact"><thead><tr><th>球団</th><th>1位</th><th class="num">支配下</th><th class="num">育成</th></tr></thead><tbody>${others}</tbody></table>`, { flush: true })}</div>`;
}
ACT.dPick = el => {
  const D = G.draft; const id = +el.dataset.id;
  if (D.stage === 'r1') {
    const r = userDraftPick(id);
    const mine = r && r.picks.find(x => x.teams.includes(G.user.tid));
    if (mine) {
      const p = G.prospects.find(y => y.id === mine.pid);
      if (p && p.pr.gen) openModal('lottery', { pid: p.id, win: mine.win, n: mine.teams.length });
      else if (mine.win === G.user.tid) toast(mine.teams.length > 1 ? `抽選に勝ちました！ ${p.name}の交渉権を獲得` : `${p.name}を単独で1位指名しました`, 'good'); else toast(`抽選で外れました…（${p.name}は${tShort(mine.win)}へ）`, 'bad');
    }
  } else { userDraftPick(id); const st = draftAdvance(); if (st === 'done') finishDraft(); }
  UI.resetScroll = true; render();
};
ACT.dNext = () => { const st = draftAdvance(); if (st === 'done') finishDraft(); render(); };
ACT.dStop = () => { userDraftStop(); const st = draftAdvance(); if (st === 'done') finishDraft(); render(); };
ACT.dAuto = () => { autoUserDraft(); toast('残りの指名を自動で行いました'); render(); };

/* 逸材の抽選の結果 */
MODALS.lottery = ({ pid, win, n }) => {
  const p = G.prospects.find(x => x.id === pid) || P_(pid); if (!p) return null;
  const me = win === G.user.tid; const nick = (p.pr && p.pr.nick) || (p.prInfo && p.prInfo.nick) || '怪物';
  return { title: me ? '交渉権を獲得！' : '抽選の結果', size: 'narrow',
    body: `${art('draft', { h: 'cut', kicker: n > 1 ? `${n}球団が競合` : '単独指名', title: me ? `「${esc(nick)}」の交渉権を獲得` : `${esc(tShort(win))}が交渉権を獲得`, sub: `${esc(p.name)}（${esc((p.pr || p.prInfo || {}).school || '')}）`, eager: true })}
      <p>${me ? `${n > 1 ? '当たりくじを引き当てました！' : ''}10年に一度の逸材、${esc(p.name)}の交渉権を手にしました。入団が決まれば、人気とグッズの売上も期待できます。` : `${esc(p.name)}の交渉権は${esc(tName(win))}が獲得しました。外れ1位の指名に進みます。`}</p>`,
    foot: '<button class="btn pri" data-a="closeModal">次へ</button>' };
};

/* ---------- メジャー版のドラフト（7月・完全ウェーバー） ---------- */
function draftMLB() {
  const t = curTurn(); const D = G.draft; const ut = G.user.tid;
  const head = art('draft', { h1: true, kicker: `${G.year}年 7月第3週`, title: 'ドラフト', sub: t === LG.draftT ? `前の年の成績の逆順に、${LG.draftRounds}巡目まで指名します` : '' });
  const ord = D && D.mlb && D.stage !== 'done' ? D.order : (G.draftOrder ? G.draftOrder.order : []);
  const ordY = D && D.mlb && D.stage !== 'done' ? G.year : (G.draftOrder ? G.draftOrder.y : G.year);
  const lot = G.draftOrder && G.draftOrder.y === ordY ? G.draftOrder.lot || [] : [];
  const orderHtml = ord.length ? panel(`${ordY}年の指名順`, `<div class="dorder">${ord.map((tid, i) => `<span class="${tid === ut ? 'me' : ''}${lot.includes(tid) && i < 6 ? ' lot' : ''}"><b>${i + 1}</b>${esc(tShort(tid))}</span>`).join('')}</div><p class="small muted" style="margin:8px 0 0">ポストシーズンに出なかった球団の中で上位6つを抽選します（成績の悪い球団ほど当たりやすい）。あとは成績の低い順で、どの巡目も同じ順番です。</p>`) : '';
  if (t !== LG.draftT || !D || !D.mlb) {
    const marked = G.prospects.filter(p => p.pr.mark);
    const last = D && D.mlb && D.picks ? draftSummaryMLB(D) : '';
    return head + `<p class="lead">ドラフトは毎年7月第3週（オールスターの週）。指名した選手は契約金を払って、すぐマイナー契約で入団します。契約金の目安は全体1位で約${fmtSal(mlbSlot(1))}、1巡目の最後で約${fmtSal(mlbSlot(30))}。高校生は大学進学を選んで契約しないこともあります。</p>` +
      (last ? last + '<div style="height:14px"></div>' : '') + orderHtml + '<div style="height:14px"></div>' +
      panel(`指名候補（★） ${marked.length}人`, marked.length ? prospectTable('dboard', marked) : '<div class="empty">スカウト画面で、気になる選手に★をつけておきましょう。</div>', { flush: true, act: '<button class="btn sm" data-a="go" data-v="scout">スカウト</button>' });
  }
  if (D.stage === 'done') return head + `<p class="lead">ドラフトが終わりました。指名した選手はマイナー契約で入団しています。</p>` + draftSummaryMLB(D);
  const av2 = availableProspects().filter(prospectVisible);
  const myTurn = D.order[D.idx] === ut && !D.userStop;
  const mine = D.picks.filter(x => x.tid === ut);
  const no = D.picks.length + 1;
  const main = `<div class="row sp" style="margin-bottom:10px"><div><b>${D.round}巡目</b>　<span class="small muted">全体${no}番目　指名済み ${mine.length}人／マイナー契約 ${rosterLv(ut, 3).length + mine.length}人見込み（上限${LIM.ikusei}人）</span></div>
      <div class="row">${myTurn ? '<button class="btn" data-a="dStop">指名を終える</button>' : '<button class="btn pri" data-a="dNext">自分の番まで進める</button>'}<button class="btn" data-a="dAuto">残りを自動で指名</button></div></div>` +
    (myTurn ? panel(`あなたの番です（${D.round}巡目・全体${no}番目・契約金の目安 ${fmtSal(mlbSlot(no))}）`, prospectTable('dr', av2, p => `<button class="btn xs pri" data-a="dPick" data-id="${p.id}">指名</button>`), { flush: true, cls: 'hl' }) : '') +
    '<div style="height:14px"></div>' + orderHtml + '<div style="height:14px"></div>' + draftPickLog(D);
  return head + `<p class="lead">指名順は前の年の成績の逆順（上位6つは抽選）。どの巡目も同じ順番です。</p>` + main;
}
function draftSummaryMLB(D) {
  const ut = G.user.tid;
  const mine = D.picks.filter(x => x.tid === ut);
  const rows = mine.map(x => { const p = P_(x.pid) || G.prospects.find(y => y.id === x.pid); return `<tr><td>${x.round}巡目<span class="small muted">（${x.no || ''}位）</span></td><td>${x.refused || !p ? esc(x.name || (p ? p.name : '?')) : pLink(p)}</td><td class="small muted">${esc(p ? (p.prInfo || p.pr || {}).school || '' : x.school || '')}</td><td>${p ? (isP(p) ? '投手' : POS_JP[p.pos]) : (x.pos ? POS_JP[x.pos] : '')}</td><td class="num">${x.bonus ? fmtSal(x.bonus) : ''}</td><td>${x.refused ? '<span class="tag o">契約せず</span>' : ''}</td></tr>`; }).join('');
  const firsts = D.picks.filter(x => x.round === 1).map(x => { const p = P_(x.pid) || G.prospects.find(y => y.id === x.pid); return `<tr class="${x.tid === ut ? 'me' : ''}"><td class="num">${x.no}</td><td>${tMark(x.tid)}</td><td>${p ? esc(p.name) : esc(x.name || '―')}</td><td class="small muted">${esc(p ? (p.prInfo || p.pr || {}).school || '' : x.school || '')}</td></tr>`; }).join('');
  return `<div class="grid g2">${panel('自球団の指名', `<table class="t compact"><thead><tr><th>巡目</th><th>選手</th><th>所属</th><th>位置</th><th class="num">契約金</th><th></th></tr></thead><tbody>${rows || '<tr><td class="muted">指名なし</td></tr>'}</tbody></table>`, { flush: true })}${panel('1巡目の指名', `<div class="tw" style="max-height:420px;overflow-y:auto"><table class="t compact"><tbody>${firsts}</tbody></table></div>`, { flush: true })}</div>`;
}
