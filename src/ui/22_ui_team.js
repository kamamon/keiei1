/* =========================================================
   チーム：選手一覧・選手詳細・オーダー・育成・キャンプ
   ========================================================= */
function findPlayer(id) { id = +id; return G.players[id] || G.prospects.find(p => p.id === id) || G.foreign.find(p => p.id === id) || null; }
function roleOf(p) {
  if (!isP(p)) return POS_S[p.pos];
  if (p.team < 0 || p.lv !== 1) return p.pt === 'SP' ? '先' : '救';
  const R = getRoles(p.team);
  if (R.rot.includes(p.id)) return '先発';
  if (R.cl === p.id) return '抑え';
  if (R.su.includes(p.id)) return '勝継';
  return '中継';
}
function statLine(p, s) {
  s = s || p.st;
  if (isP(p)) { if (!s.g) return '<span class="faint">―</span>'; return `${s.g}試 ${s.w}勝${s.l}敗${s.sv ? ' ' + s.sv + 'S' : ''}${s.hld ? ' ' + s.hld + 'H' : ''} 防${fmtEra(pEra(s))}`; }
  if (!s.pa) return '<span class="faint">―</span>';
  return `${fmtAvg(bAvg(s))} ${s.hr}本 ${s.rbi}点${s.sb ? ' ' + s.sb + '盗' : ''}`;
}
function canMove(p, to) {
  const ut = G.user.tid;
  if (to === 1) {
    if (p.lv === 3) return '育成選手は1軍に上げられません（先に支配下登録）';
    if (p.injW > 0) return '故障中です';
    if (rosterLv(ut, 1).length >= LIM.first) return `1軍登録は${LIM.first}人までです`;
    if (!LG.mlb && p.frn && firstFrnCount(ut) >= LIM.frn1) return '1軍の外国人枠（4人）が埋まっています';
  }
  return '';
}
ACT.move = el => {
  const p = P_(+el.dataset.id); const to = +el.dataset.to; if (!p || p.team !== G.user.tid) return;
  const why = canMove(p, to); if (why) { toast(why, 'bad'); return; }
  p.lv = to; touch(); render();
};
ACT.autoRoster = () => { autoRoster(G.user.tid); toast('1軍の顔ぶれを監督と相談して組み直しました', 'good'); render(); };
ACT.setUser = el => { const k = el.dataset.k; G.user[k] = el.type === 'checkbox' ? el.checked : el.value; touch(); render(); };

SCREENS.roster = () => {
  const ut = G.user.tid;
  const tab = getTab('roster', '1'); const f = getTab('rosterF', 'all');
  const all = roster(ut);
  const lists = { '1': all.filter(p => p.lv === 1), '2': all.filter(p => p.lv === 2), '3': all.filter(p => p.lv === 3), inj: all.filter(p => p.injW > 0), all };
  const list = lists[tab] || lists['1'];
  const pit = list.filter(isP), bat = list.filter(p => !isP(p));
  const moveBtns = p => {
    if (p.lv === 1) return `<button class="btn xs" data-a="move" data-id="${p.id}" data-to="2">2軍へ</button>`;
    if (p.lv === 2) return `<button class="btn xs" data-a="move" data-id="${p.id}" data-to="1" ${canMove(p, 1) ? 'disabled title="' + esc(canMove(p, 1)) + '"' : ''}>1軍へ</button>`;
    return `<button class="btn xs" data-a="promoteIk" data-id="${p.id}">支配下へ</button>`;
  };
  const common = (pre) => [
    { k: 'num', l: '背番', v: p => p.num, h: p => `<span class="num">${numStr(p)}</span>`, num: true },
    { k: 'name', l: '名前', v: p => p.name, h: p => `${pLink(p)} ${p.frn ? '<span class="tag">外</span>' : ''}${LG.mlb && p.nat && p.nat !== 'US' && p.nat !== 'LAT' ? '<span class="tag">' + ({ JP: '日', KR: '韓', TW: '台' })[p.nat] + '</span>' : ''}${genTag(p, true)} ${statusTag(p)}${mlbTrying(p) ? ' <span class="tag lamp">メジャー交渉中</span>' : ''}` },
    { k: 'pos', l: pre === 'p' ? '役割' : '位置', v: p => pre === 'p' ? roleOf(p) : p.pos, h: p => posCell(p) },
    { k: 'age', l: '年齢', v: p => p.age, num: true, h: p => p.age },
    { k: 'ovr', l: '総合', v: ovr, h: p => av(ovr(p)) },
    { k: 'pot', l: '伸びしろ', v: potv, h: p => gr(potv(p)), title: '能力の上限の目安' },
    { k: 'sk', l: '特殊能力', v: skScore, h: skMini, title: '金・プラス・マイナスの特殊能力の数' }
  ];
  const tail = [
    { k: 'form', l: '調子', v: p => p.form, h: p => formTag(p.form) + ' ' + morDot(p.mor) },
    { k: 'st', l: '今季', v: p => isP(p) ? war(p) : war(p), h: p => `<span class="small">${statLine(p)}</span>` },
    { k: 'sal', l: '年俸', v: p => p.sal, num: true, h: p => fmtSal(p.sal) },
    { k: 'yrs', l: '契約', v: p => p.yrs, num: true, h: p => p.yrs + '年' },
    { k: 'act', l: '', h: moveBtns }
  ];
  const pCols = common('p').concat([
    { k: 'vel', l: '球速', v: p => p.a.vel, num: true, h: p => `<span class="num">${Math.round(p.a.vel)}</span>` },
    { k: 'ctl', l: '制球', v: p => p.a.ctl, h: p => av(p.a.ctl) }, { k: 'brk', l: '変化球', v: p => p.a.brk, h: p => av(p.a.brk) }, { k: 'sta', l: 'スタミナ', v: p => p.a.sta, h: p => av(p.a.sta) }
  ], tail);
  const bCols = common('b').concat(BAT_KEYS.map(k => ({ k, l: ATTR_JP[k], v: p => p.a[k], h: p => av(p.a[k]) })), tail);
  const showP = f !== 'bat', showB = f !== 'pit';
  const sh = shihai(ut).length; const f1 = lists['1'].length;
  return `<h1 class="h1">選手一覧</h1>
  <div class="row sp" style="margin-bottom:12px">
    <div class="row small">
      <span class="tag ${f1 > LIM.first ? 'o' : ''}">1軍 ${f1}/${LIM.first}</span><span class="tag ${sh > LIM.shihai ? 'o' : ''}">支配下 ${sh}/${LIM.shihai}</span>
      ${LG.mlb ? `<span class="tag ${lists['3'].length > LIM.ikusei ? 'o' : ''}">マイナー契約 ${lists['3'].length}/${LIM.ikusei}</span><span class="tag">投手 ${lists['1'].filter(isP).length}/13</span>` : `<span class="tag ${firstFrnCount(ut) > LIM.frn1 ? 'o' : ''}">1軍外国人 ${firstFrnCount(ut)}/${LIM.frn1}</span><span class="tag">育成 ${lists['3'].length}</span>`}
    </div>
    <div class="row">
      <label class="chk small"><input type="checkbox" data-c="setUser" data-k="autoSwap" ${G.user.autoSwap ? 'checked' : ''}>故障者を自動で入れ替え</label>
      <label class="chk small"><input type="checkbox" data-c="setUser" data-k="autoRoster" ${G.user.autoRoster ? 'checked' : ''}>毎週おまかせ編成</label>
      <button class="btn sm" data-a="autoRoster">おまかせで組み直す</button>
    </div>
  </div>
  ${tabs('roster', [['1', '1軍', lists['1'].length], ['2', '2軍', lists['2'].length], ['3', lv3Name(), lists['3'].length], ['inj', '故障者', lists.inj.length], ['all', '全員', all.length]], tab)}
  <div class="row" style="margin-bottom:10px">${seg('rosterF', [['all', 'すべて'], ['pit', '投手'], ['bat', '野手']], f)}</div>
  <div class="stack">
  ${showP ? panel(`投手 ${pit.length}人`, table('ro-p' + tab, pCols, pit, { sort: { k: 'ovr', d: true } }), { flush: true }) : ''}
  ${showB ? panel(`野手 ${bat.length}人`, table('ro-b' + tab, bCols, bat, { sort: { k: 'ovr', d: true } }), { flush: true }) : ''}
  </div>`;
};
ACT.rosterF = el => { UI.tab.rosterF = el.dataset.v; render(); };
ACT.promoteIk = el => { const p = P_(+el.dataset.id); const r = promoteIkusei(p); if (!r.ok) toast(r.why || '登録できません', 'bad'); else toast(`${p.name}を支配下登録しました`, 'good'); render(); };

/* ---------- 選手詳細 ---------- */
/* モーダルの中から開いたときは差し替える（後ろに隠れないように） */
function showModal(k, args) { if (UI.modal) replaceModal(k, args); else openModal(k, args); }
ACT.player = el => { showModal('player', { id: +el.dataset.id }); render(); };
MODALS.player = ({ id }) => {
  const p = findPlayer(id); if (!p) return { title: '選手', body: '<p>この選手はすでに球界を去りました。</p>' };
  if (p.pr && p.team === -2) return prospectModal(p);
  if (p.team === -3) return foreignModal(p);
  const mine = p.team === G.user.tid;
  const keys = isP(p) ? PIT_KEYS : BAT_KEYS;
  const showCap = mine;
  const attrs = keys.map(k => {
    const v = p.a[k], c = p.cap[k];
    if (k === 'vel') return `<div class="row" style="gap:10px"><span style="width:64px" class="small">${ATTR_JP[k]}</span><div style="flex:1">${bar(velScore(v), 100, '', showCap ? velScore(c) : null)}</div><span class="num" style="width:74px;text-align:right">${velHtml(v, true)}</span></div>`;
    return `<div class="row" style="gap:10px"><span style="width:64px" class="small">${ATTR_JP[k]}</span><div style="flex:1">${bar(v, 100, '', showCap ? c : null)}</div><span style="width:74px;text-align:right">${av(v)}</span></div>`;
  }).join('');
  const T = p.team >= 0 ? G.teams[p.team] : null;
  const fa = LG.mlb ? mlbSvcText(p) : p.frn ? '外国人選手（FAの対象外）' : faEligible(p) ? '<span class="lamp">FA権あり（今オフ行使可能）</span>' : p.svc >= (p.faUsed ? p.faUsed + 4 : 8) ? 'FA権あり' : `取得まであと${(p.faUsed ? p.faUsed + 4 : 8) - p.svc}年`;
  const kfa = p.frn || LG.mlb ? '' : p.svc >= kfaNeed(p) ? '<span class="lamp">海外FA権あり</span>' : `海外FA権まであと${kfaNeed(p) - p.svc}年`;
  const tryX = (G.mlbTry || []).find(x => x.pid === p.id);
  const posts = mine && !LG.mlb && !postingCheck(p);
  const stPos = !isP(p) && p.st && p.st.pos ? Object.entries(p.st.pos).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${POS_S[k] || k}${v}`).join(' ') : '';
  const rows = p.hist.slice().reverse().map(h => `<tr><td>${h.y}</td><td>${tMark(h.t)}</td>${isP(p) ? `<td class="num">${h.s.g}</td><td class="num">${h.s.w}-${h.s.l}</td><td class="num">${h.s.sv}</td><td class="num">${h.s.hld}</td><td class="num">${fmtIP(h.s.outs)}</td><td class="num">${h.s.so}</td><td class="num">${fmtEra(pEra(h.s))}</td>` :
    `<td class="num">${h.s.g}</td><td class="num">${h.s.pa}</td><td class="num">${fmtAvg(bAvg(h.s))}</td><td class="num">${h.s.hr}</td><td class="num">${h.s.rbi}</td><td class="num">${h.s.sb}</td><td class="num">${bOps(h.s).toFixed(3)}</td>`}<td class="num">${h.war}</td><td class="num">${fmtSal(h.sal)}</td></tr>`).join('');
  const s = p.st; const c = careerOf(p);
  const cur = isP(p) ? `<td class="num">${s.g}</td><td class="num">${s.w}-${s.l}</td><td class="num">${s.sv}</td><td class="num">${s.hld}</td><td class="num">${fmtIP(s.outs)}</td><td class="num">${s.so}</td><td class="num">${fmtEra(pEra(s))}</td>` :
    `<td class="num">${s.g}</td><td class="num">${s.pa}</td><td class="num">${fmtAvg(bAvg(s))}</td><td class="num">${s.hr}</td><td class="num">${s.rbi}</td><td class="num">${s.sb}</td><td class="num">${bOps(s).toFixed(3)}</td>`;
  const car = isP(p) ? `<td class="num">${c.g}</td><td class="num">${c.w}-${c.l}</td><td class="num">${c.sv}</td><td class="num">${c.hld}</td><td class="num">${fmtIP(c.outs)}</td><td class="num">${c.so}</td><td class="num">${fmtEra(pEra(c))}</td>` :
    `<td class="num">${c.g}</td><td class="num">${c.pa}</td><td class="num">${fmtAvg(bAvg(c))}</td><td class="num">${c.hr}</td><td class="num">${c.rbi}</td><td class="num">${c.sb}</td><td class="num">${bOps(c).toFixed(3)}</td>`;
  const head = isP(p) ? '<th class="num">登板</th><th class="num">勝敗</th><th class="num">S</th><th class="num">H</th><th class="num">投球回</th><th class="num">奪三振</th><th class="num">防御率</th>' : '<th class="num">試合</th><th class="num">打席</th><th class="num">打率</th><th class="num">本塁打</th><th class="num">打点</th><th class="num">盗塁</th><th class="num">OPS</th>';
  const hons = honorsHtml(p);
  let actions = '';
  if (mine) {
    const ex = curTurn() >= 44 || (p.yrs <= 1 && !(p.ren && p.ren.st === 'signed'));
    actions = `<div class="row">
      ${p.lv === 1 ? `<button class="btn sm" data-a="move" data-id="${p.id}" data-to="2">2軍に下げる</button>` : p.lv === 2 ? `<button class="btn sm" data-a="move" data-id="${p.id}" data-to="1">1軍に上げる</button>` : `<button class="btn sm" data-a="promoteIk" data-id="${p.id}">支配下登録する</button>`}
      <label class="small muted">練習の重点 <select class="inp" data-c="setFocus" data-id="${p.id}">${opt('', 'おまかせ', p.focus)}${keys.map(k => opt(k, ATTR_JP[k], p.focus)).join('')}</select></label>
      ${p.yrs <= 1 && !(p.ren && p.ren.st === 'signed') && curTurn() < 40 ? `<button class="btn sm" data-a="extOpen" data-id="${p.id}">契約延長を打診</button>` : ''}
      <button class="btn sm" data-a="tradeWith" data-id="${p.id}" ${tryX ? 'disabled' : ''}>トレードに出す</button>
      <button class="btn sm danger" data-a="releaseAsk" data-id="${p.id}" ${tryX ? 'disabled' : ''}>戦力外にする</button>
      ${posts ? `<button class="btn sm" data-a="postAsk" data-id="${p.id}">ポスティングでメジャーへ</button>` : ''}
      <button class="btn sm" data-a="peOpen" data-id="${p.id}">編集</button>
    </div>
    <div class="prac"><label class="small muted">特別練習 ${pracSelect(p)}</label>${pracBar(p)}<span class="small faint">サブポジションや特殊能力を、時間をかけて身につけます（キャンプ中は約3倍の速さ）。</span></div>`;
  } else if (p.team >= 0) actions = `<div class="row"><button class="btn sm team" data-a="tradeWith" data-id="${p.id}">トレードを申し込む</button><button class="btn sm" data-a="peOpen" data-id="${p.id}">編集</button></div>`;
  else if (G.fapool.includes(p.id)) actions = `<div class="row"><button class="btn sm team" data-a="signFree" data-id="${p.id}">契約する（${fmtSal(p.fa ? p.fa.ask : MIN_SAL)}）</button><button class="btn sm" data-a="peOpen" data-id="${p.id}">編集</button></div>`;
  return {
    title: `<span class="num faint">${p.num >= 0 ? numStr(p) : ''}</span> ${esc(p.name)} <span class="small muted">${POS_JP[p.pos]}${isP(p) ? '（' + (p.pt === 'SP' ? '先発' : '救援') + '型）' : ''}</span> ${genTag(p)}`, size: 'wide',
    body: `<div class="grid g2">
      <div class="stack">
        <div class="row">${T ? emblem(T, 34) : ''}<div><div>${T ? esc(tName(T.id)) : '所属なし（自由契約）'} ${p.lv === 3 ? `<span class="tag">${lv3Name()}</span>` : p.lv === 1 ? '<span class="tag team">1軍</span>' : '<span class="tag">2軍</span>'} ${statusTag(p)}</div>
          <div class="small muted">${p.age}歳　${handStr(p)}　${p.frn ? '外国人（' + esc(p.prFrom || '海外') + '）' : LG.mlb ? esc(birthOf(p)) : esc(REGIONS[p.home]) + '出身'}　${p.dr ? p.dr.y + '年ドラフト' + (p.dr.ik ? '育成' : '') + p.dr.r + (LG.mlb ? '巡目' + (p.dr.no ? '（全体' + p.dr.no + '位）' : '') : '位') : esc(p.prFrom || p.from || '')}${p.prInfo && p.prInfo.nick ? '　「' + esc(p.prInfo.nick) + '」' : ''}</div></div></div>
        <div class="row" style="gap:20px"><div><div class="small muted">総合</div><div class="row">${gr(ovr(p))}<span class="stat-big">${ovr(p)}</span></div></div>
          <div><div class="small muted">伸びしろ</div><div>${mine ? gr(potv(p)) + ' <span class="small muted">' + GT[p.gt].n + '</span>' : '<span class="gr Q">?</span>'}</div></div>
          <div><div class="small muted">調子・やる気</div><div>${formTag(p.form)} ${formName(p.form)}　${morDot(p.mor)} ${Math.round(p.mor)}</div></div></div>
        <div class="stack">${attrs}</div>
        ${mine ? '<p class="small faint" style="margin:0">バーの縦線は現時点で見込める上限です。</p>' : ''}
        ${!isP(p) ? `<div class="pdef"><span class="small muted">守備位置</span><span class="sub main">${POS_JP[p.pos]}</span>${subList(p).map(x => `<span class="sub l${x.lv}" title="${SUB_LVN[x.lv]}">${POS_JP[x.k]}${SUB_MARK[x.lv]}</span>`).join('')}${stPos ? `<span class="small faint">今季 ${stPos}</span>` : ''}</div>` : ''}
        <div><div class="small muted" style="margin-bottom:4px">特殊能力</div>${skChips(p)}</div>
      </div>
      <div class="stack">
        <dl class="kv"><dt>年俸</dt><dd>${fmtSal(p.sal)}${p.ren && p.ren.st === 'signed' ? `<div class="small muted">来季 ${fmtSal(p.ren.sal)}・${p.ren.yrs}年</div>` : ''}</dd><dt>契約残り</dt><dd>${p.yrs}年</dd>
          <dt>${LG.mlb ? 'サービスタイム' : '1軍在籍（FA）'}</dt><dd>${p.svc}年　<span class="small">${fa}</span>${kfa ? `<div class="small">${kfa}</div>` : ''}${tryX ? `<div class="small lamp">メジャー球団と交渉中（${HOW_JP[tryX.how]}・あと${Math.max(1, tryX.wk)}週ほど）</div>` : ''}</dd><dt>性格</dt><dd>${esc(PERS[p.per].n)}<div class="small muted">${esc(PERS[p.per].d)}</div></dd>
          <dt>故障のしやすさ</dt><dd>${p.inj >= 65 ? '<span class="neg">多い</span>' : p.inj >= 40 ? '普通' : '<span class="pos">少ない</span>'}${p.injW > 0 ? `<div class="small neg">${esc(p.injN)}（残り${Math.ceil(p.injW)}週）</div>` : ''}</dd>
          <dt>人気</dt><dd>${Math.round(p.pop)}</dd><dt>通算WAR</dt><dd>${careerWar(p)}</dd></dl>
        ${hons ? `<div><div class="small muted" style="margin-bottom:4px">勲章</div><div class="hons">${hons}</div></div>` : ''}
        ${actions}
      </div>
    </div>
    <h4 style="margin:18px 0 6px">成績</h4>
    <div class="tw"><table class="t compact"><thead><tr><th>年</th><th>球団</th>${head}<th class="num">WAR</th><th class="num">年俸</th></tr></thead><tbody>
      <tr class="me"><td>${G.year}</td><td>${p.team >= 0 ? tMark(p.team) : '―'}</td>${cur}<td class="num">${r1(war(p))}</td><td class="num">${fmtSal(p.sal)}</td></tr>${rows}
      <tr><td colspan="2"><b>通算</b>${p.preWar ? '<span class="small faint">（就任前を含む概算）</span>' : ''}</td>${car}<td class="num">${careerWar(p)}</td><td></td></tr></tbody></table></div>`
  };
};
/* 勲章：タイトル・表彰（回数）、通算の節目（いちばん上）、偉業、持っている記録、連続試合安打 */
function honorsHtml(p) {
  const out = [];
  const cnt = {}; for (const a of p.awards || []) cnt[a.n] = (cnt[a.n] || 0) + 1;
  for (const [n, c] of Object.entries(cnt)) out.push(`<span class="hon ${TITLE_NAMES.includes(n) ? 't' : 'a'}">${esc(n)}${c > 1 ? '×' + c : ''}</span>`);
  const top = {};
  for (const key of Object.keys(p.ms || {})) { const k = key.replace(/[0-9]+$/, ''), m = +key.slice(k.length); if (MS_NAME[k] && (!top[k] || m > top[k])) top[k] = m; }
  for (const k in top) out.push(`<span class="hon m">通算${top[k]}${MS_NAME[k]}</span>`);
  for (const f of p.feats || []) out.push(`<span class="hon f">${f.y} ${esc(FEATS[f.k] ? FEATS[f.k].n : f.k)}</span>`);
  if (G.recs) {
    for (const k in G.recs.lg) { const r = G.recs.lg[k]; if (r && r.pid === p.id) out.push(`<span class="hon r">リーグ記録 ${REC_DEFS[k].n} ${recFmt(k, r.v)}</span>`); }
    for (const k in G.recs.car) { const r = G.recs.car[k]; if (r && r.pid === p.id) out.push(`<span class="hon r">歴代最多 ${CAR_DEFS[k].n} ${recFmt(k, r.v, true)}</span>`); }
    const tm = p.team >= 0 ? G.recs.tm[p.team] || {} : {};
    for (const k in tm) { const r = tm[k]; if (r && r.pid === p.id && !(G.recs.lg[k] && G.recs.lg[k].pid === p.id)) out.push(`<span class="hon r2">球団記録 ${REC_DEFS[k].n} ${recFmt(k, r.v)}</span>`); }
  }
  if ((p.hstr || 0) >= 10) out.push(`<span class="hon s">${p.hstr}試合連続安打中</span>`);
  if (p.retAnn === G.year) out.push('<span class="hon a">今季限りで引退</span>');
  return out.join('');
}
ACT.setFocus = el => { const p = P_(+el.dataset.id); if (p) p.focus = el.value; toast(el.value ? `${p.name}は${ATTR_JP[el.value]}を重点的に鍛えます` : 'おまかせにしました'); };
function pracSelect(p) {
  const opts = pracOptions(p); const cur = p.prac ? p.prac.k + ':' + p.prac.key : '';
  const groups = {}; for (const o of opts) (groups[o.g] = groups[o.g] || []).push(o);
  return `<select class="inp" data-c="setPrac" data-id="${p.id}">${opt('', 'なし', cur)}${Object.entries(groups).map(([g, l]) => `<optgroup label="${esc(g)}">${l.map(o => opt(o.v, o.l, cur)).join('')}</optgroup>`).join('')}</select>`;
}
function pracBar(p) { if (!p.prac) return ''; const v = pracProgress(p); return `<span class="row small" style="gap:6px"><span style="width:84px;display:inline-block">${bar(v * 100, 100, 'ball')}</span><span class="faint">${Math.round(v * 100)}%</span></span>`; }
ACT.setPrac = el => {
  const p = P_(+el.dataset.id); if (!p || p.team !== G.user.tid) return;
  setPractice(p, el.value);
  toast(el.value ? `${p.name}は特別練習「${pracLabel(p)}」に取り組みます` : `${p.name}の特別練習をやめました`);
  render();
};
ACT.postAsk = el => { showModal('posting', { id: +el.dataset.id }); render(); };
MODALS.posting = ({ id }) => {
  const p = P_(id); if (!p) return null;
  const why = postingCheck(p); const c = mlbInterest(p); const fee = postingFeeEst(p);
  return { title: `${esc(p.name)}をポスティングにかけますか`, size: 'narrow', body: `<p>ポスティング制度でメジャー球団との交渉を認めます。獲得する球団が現れれば移籍し、球団は譲渡金を受け取ります。現れなければ残留します。</p>
    <dl class="kv"><dt>メジャー球団の関心</dt><dd>${interestLabel(c)}</dd><dt>譲渡金の見込み</dt><dd>${fmtOku(roundSal(fee * 0.8))}〜${fmtOku(roundSal(fee * 1.25))}</dd><dt>本人の気持ち</dt><dd>${p.per === 'mlb' ? '<span class="pos">メジャー挑戦を熱望</span>' : '本人に意向を確かめます'}</dd><dt>交渉の期間</dt><dd>2〜4週間</dd></dl>
    ${why ? `<p class="small neg">${esc(why)}</p>` : ''}<p class="small muted">交渉中はトレードや戦力外にできません。</p>`,
    foot: `<button class="btn" data-a="closeModal">やめる</button><button class="btn pri" data-a="postGo" data-id="${id}" ${why ? 'disabled' : ''}>申請する</button>` };
};
ACT.postGo = el => {
  const p = P_(+el.dataset.id); if (!p) return;
  const r = userPosting(p);
  closeModal();
  if (r.ok) toast(`${p.name}のポスティングを申請しました。結果はお知らせで届きます`, 'good'); else toast(r.why, 'bad');
  render();
};
ACT.releaseAsk = el => { const p = P_(+el.dataset.id); if (mlbTrying(p)) { toast('メジャー球団と交渉中の選手は戦力外にできません', 'bad'); return; } showModal('release', { id: +el.dataset.id }); render(); };
MODALS.release = ({ id }) => {
  const p = P_(id); if (!p) return null;
  const c = releaseCost(p);
  return { title: `${esc(p.name)}を戦力外にしますか`, size: 'narrow', body: `<p>${esc(p.name)}（${p.age}歳・総合${ovr(p)}）との契約を解除し、自由契約にします。</p>${c > 0 ? `<p>残りの契約分 <b>${fmtOku(c)}</b> を支払う必要があります。</p>` : '<p class="muted">今季限りの契約のため、追加の支払いはありません。</p>'}<p class="small muted">他球団が獲得する可能性があります。</p>`,
    foot: `<button class="btn" data-a="closeModal">やめる</button><button class="btn danger" data-a="releaseDo" data-id="${id}">戦力外にする</button>` };
};
ACT.releaseDo = el => { const p = P_(+el.dataset.id); if (p && p.team === G.user.tid) { releasePlayer(p); toast(`${p.name}に戦力外を通告しました`); } closeAllModals(); render(); };

/* ---------- オーダー・起用 ---------- */
SCREENS.lineup = () => {
  const ut = G.user.tid; const mode = G.user.lineupMode;
  const lu = getLineup(ut); const R = getRoles(ut);
  const bats1 = rosterLv(ut, 1).filter(p => !isP(p)); const pits1 = rosterLv(ut, 1).filter(isP);
  let lineupHtml, pitHtml;
  if (mode === 'manual') {
    const m = G.user.manual;
    lineupHtml = `<table class="t"><thead><tr><th>打順</th><th>守備</th><th>選手</th><th class="num">打率</th><th class="num">本</th><th>ミート</th><th>パワー</th><th>走力</th><th>守備適性</th></tr></thead><tbody>${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
      const e = m.lu[i] || { id: -1, pos: SLOTS[i] }; const p = P_(e.id);
      const okp = p && p.team === ut && p.lv === 1 && p.injW === 0;
      return `<tr><td class="num">${i + 1}</td><td><select class="inp" data-c="luPos" data-i="${i}">${SLOTS.map(s => opt(s, POS_JP[s], e.pos)).join('')}</select></td>
        <td><select class="inp" data-c="luPl" data-i="${i}">${opt(-1, '（自動で選ぶ）', okp ? e.id : -1)}${bats1.filter(x => x.injW === 0).map(x => opt(x.id, `${x.name}（${POS_S[x.pos]}${subStr(x)}・${ovr(x)}）`, e.id)).join('')}</select>${p && !okp ? ' <span class="tag o">出場できません</span>' : ''}</td>
        <td class="num">${okp ? fmtAvg(bAvg(p.st)) : ''}</td><td class="num">${okp ? p.st.hr : ''}</td><td>${okp ? av(p.a.con) : ''}</td><td>${okp ? av(p.a.pow) : ''}</td><td>${okp ? av(p.a.spd) : ''}</td><td>${okp ? fitLabel(p, e.pos) : ''}</td></tr>`;
    }).join('')}</tbody></table>`;
    const pSel = (key, i, cur) => `<select class="inp" data-c="pitSel" data-k="${key}" data-i="${i}">${opt(-1, '（自動）', cur == null ? -1 : cur)}${pits1.filter(x => x.injW === 0).map(x => opt(x.id, `${x.name}（${x.pt === 'SP' ? '先' : '救'}・${ovr(x)}）`, cur)).join('')}</select>`;
    pitHtml = `<div class="grid g2"><div><h4 style="margin:0 0 6px">先発ローテーション</h4>${Array.from({ length: LG.rot || 6 }, (_, i) => i).map(i => `<div class="row" style="margin-bottom:6px"><span class="num" style="width:20px">${i + 1}</span>${pSel('rot', i, m.rot[i])}</div>`).join('')}</div>
      <div><h4 style="margin:0 0 6px">救援</h4><div class="row" style="margin-bottom:6px"><span style="width:84px">抑え</span>${pSel('cl', 0, m.cl)}</div>
      <div class="row" style="margin-bottom:6px"><span style="width:84px">セットアッパー</span>${pSel('su', 0, m.su[0])}</div><div class="row" style="margin-bottom:6px"><span style="width:84px">7回担当</span>${pSel('su', 1, m.su[1])}</div>
      <p class="small muted">そのほかの投手は監督が状況に応じて起用します。故障や疲労で投げられない投手は自動で代わりを立てます。</p></div></div>`;
  } else {
    lineupHtml = `<table class="t"><thead><tr><th>打順</th><th>守備</th><th>選手</th><th class="num">打率</th><th class="num">本</th><th class="num">打点</th><th>ミート</th><th>パワー</th><th>走力</th></tr></thead><tbody>${lu.map((x, i) => `<tr><td class="num">${i + 1}</td><td>${POS_JP[x.pos]}${x.pos !== 'DH' && subKey(x.pos) !== x.p.pos ? ` <span class="small">${fitLabel(x.p, x.pos)}</span>` : ''}</td><td>${pLink(x.p)}</td><td class="num">${fmtAvg(bAvg(x.p.st))}</td><td class="num">${x.p.st.hr}</td><td class="num">${x.p.st.rbi}</td><td>${av(x.p.a.con)}</td><td>${av(x.p.a.pow)}</td><td>${av(x.p.a.spd)}</td></tr>`).join('')}</tbody></table>`;
    pitHtml = `<div class="grid g2"><div><h4 style="margin:0 0 6px">先発ローテーション</h4><table class="t compact"><tbody>${R.rot.map((id, i) => { const p = P_(id); return `<tr><td class="num">${i + 1}</td><td>${pLink(p)}</td><td class="num">${p.st.w}勝${p.st.l}敗</td><td class="num">防${fmtEra(pEra(p.st))}</td></tr>`; }).join('')}</tbody></table></div>
      <div><h4 style="margin:0 0 6px">救援</h4><table class="t compact"><tbody>${[['抑え', R.cl]].concat(R.su.map((id, i) => [i ? '7回担当' : 'セットアッパー', id])).concat(R.mr.map(id => ['中継ぎ', id])).map(([l, id]) => { const p = P_(id); return p ? `<tr><td class="small muted">${l}</td><td>${pLink(p)}</td><td class="num">${p.st.sv ? p.st.sv + 'S' : p.st.hld + 'H'}</td><td class="num">防${fmtEra(pEra(p.st))}</td></tr>` : ''; }).join('')}</tbody></table></div></div>`;
  }
  const inLu = new Set(lu.map(x => x.p.id));
  const bench = bats1.filter(p => !inLu.has(p.id));
  const mg = uStaff('mgr');
  return `<h1 class="h1">オーダー・起用</h1><p class="lead">${mode === 'manual' ? '打順・守備位置・投手の役割を自分で決めます。空欄や出場できない選手の枠は、監督が自動で埋めます。' : `${mg ? esc(mg.name) + '監督（' + esc(mg.style) + '）' : '監督'}が、選手の能力・調子・疲労を見て毎試合オーダーを組みます。`}</p>
  <div class="row" style="margin-bottom:14px">${seg('luMode', [['auto', '監督におまかせ'], ['manual', '自分で決める']], mode)}${mode === 'manual' ? '<button class="btn sm" data-a="luReset">監督のおすすめを読み込む</button>' : '<button class="btn sm" data-a="luCopy">この内容を手で直す</button>'}</div>
  <div class="stack">
    ${panel('スタメン（指名打者あり）', lineupHtml, { flush: true })}
    ${panel('投手陣', pitHtml)}
    ${panel('ベンチの野手', bench.length ? `<div class="row">${bench.map(p => `<span class="tag">${pLink(p)} ${POS_S[p.pos]}${subStr(p)} ${ovr(p)}${p.injW ? ' 故障' : ''}</span>`).join('')}</div>` : '<span class="muted">なし</span>')}
  </div>`;
};
function fitLabel(p, pos) {
  if (pos === 'DH' || subKey(pos) === p.pos) return '<span class="pos">本職</span>';
  const lv = subLv(p, pos);
  if (lv) return `<span class="${lv >= 2 ? 'pos' : 'warn'}" title="${SUB_LVN[lv]}">サブ${SUB_MARK[lv]}</span>`;
  return fitPos(p, pos) >= 0.75 ? '<span class="warn">経験なし</span>' : '<span class="neg">不慣れ</span>';
}
ACT.luMode = el => { G.user.lineupMode = el.dataset.v; if (el.dataset.v === 'manual' && !G.user.manual.lu.length) copyAutoToManual(); touch(); render(); };
function copyAutoToManual() {
  const ut = G.user.tid; const save = G.user.lineupMode; G.user.lineupMode = 'auto'; touch();
  const lu = getLineup(ut); const R = getRoles(ut);
  G.user.manual = { lu: lu.map(x => ({ id: x.p.id, pos: x.pos })), rot: R.rot.slice(), su: R.su.slice(), cl: R.cl };
  G.user.lineupMode = save; touch();
}
ACT.luReset = () => { copyAutoToManual(); toast('監督のおすすめを読み込みました'); render(); };
ACT.luCopy = () => { copyAutoToManual(); G.user.lineupMode = 'manual'; touch(); render(); };
ACT.luPos = el => { const i = +el.dataset.i; const m = G.user.manual; m.lu[i] = m.lu[i] || { id: -1, pos: SLOTS[i] }; const old = m.lu[i].pos; const j = m.lu.findIndex((e, k) => e && k !== i && e.pos === el.value); if (j >= 0) m.lu[j].pos = old; m.lu[i].pos = el.value; touch(); render(); };
ACT.luPl = el => { const i = +el.dataset.i; const m = G.user.manual; const id = +el.value; m.lu[i] = m.lu[i] || { id: -1, pos: SLOTS[i] }; const j = m.lu.findIndex((e, k) => e && k !== i && e.id === id); if (j >= 0 && id >= 0) m.lu[j].id = m.lu[i].id; m.lu[i].id = id; touch(); render(); };
ACT.pitSel = el => {
  const k = el.dataset.k, i = +el.dataset.i, id = +el.value; const m = G.user.manual;
  const clear = x => { m.rot = m.rot.map(v => v === x ? null : v); m.su = m.su.map(v => v === x ? null : v); if (m.cl === x) m.cl = null; };
  if (id >= 0) clear(id);
  if (k === 'rot') m.rot[i] = id >= 0 ? id : null; else if (k === 'su') m.su[i] = id >= 0 ? id : null; else m.cl = id >= 0 ? id : null;
  m.rot = m.rot.map(v => v == null ? null : v); touch(); render();
};

/* ---------- 育成・練習 ---------- */
SCREENS.training = () => {
  const ut = G.user.tid; const t = curTurn();
  const ps = roster(ut);
  const tab = getTab('trainF', 'young');
  const list = tab === 'young' ? ps.filter(p => p.age <= 25) : tab === 'p' ? ps.filter(isP) : ps.filter(p => !isP(p));
  const winterOpen = t >= 40 && t <= 47;
  const cols = [
    { k: 'name', l: '名前', v: p => p.name, h: p => `${pLink(p)} ${p.lv === 1 ? '<span class="tag team">1軍</span>' : p.lv === 3 ? `<span class="tag">${lv3Name()}</span>` : ''}` },
    { k: 'age', l: '年齢', v: p => p.age, num: true, h: p => p.age },
    { k: 'ovr', l: '総合', v: ovr, h: p => av(ovr(p)) },
    { k: 'pot', l: '伸びしろ', v: potv, h: p => gr(potv(p)) + ' <span class="small faint">' + GT[p.gt].n + '</span>' },
    { k: 'grow', l: '今年の成長', v: p => p.grow || 0, num: true, h: p => { const g = (p.grow || 0) / (isP(p) ? 4 : 6); return `<span class="${g > 0.2 ? 'pos' : g < -0.2 ? 'neg' : 'faint'}">${g >= 0 ? '+' : ''}${g.toFixed(1)}</span>`; }, title: '能力の平均的な変化' },
    { k: 'focus', l: '練習の重点', h: p => `<select class="inp" data-c="setFocus" data-id="${p.id}">${opt('', 'おまかせ', p.focus)}${(isP(p) ? PIT_KEYS : BAT_KEYS).map(k => opt(k, ATTR_JP[k], p.focus)).join('')}</select>` },
    { k: 'sub', l: '守れる位置', v: p => subList(p).length, h: p => isP(p) ? '' : subTags(p, { empty: '<span class="faint">―</span>' }) },
    { k: 'sk', l: '特殊能力', v: skScore, h: skMini },
    { k: 'prac', l: '特別練習', v: p => p.prac ? 1 + pracProgress(p) : 0, h: p => `<div class="stack" style="gap:4px">${pracSelect(p)}${pracBar(p)}</div>` }
  ];
  if (winterOpen) cols.push({ k: 'w', l: 'ウィンターリーグ', h: p => p.age <= 25 ? `<label class="chk small"><input type="checkbox" data-c="winter" data-id="${p.id}" ${G.winter.includes(p.id) ? 'checked' : ''}>派遣</label>` : '' });
  const ti = TRAIN_INT[G.user.train];
  return `<h1 class="h1">育成・練習</h1><p class="lead">練習の強度と、選手ごとの重点項目を決めます。成長はコーチの指導力・施設・育成費・やる気・出場機会で変わります。「特別練習」では、サブポジション（守れる位置）や特殊能力を時間をかけて身につけられます。</p>
  <div class="grid g2">
    ${panel('チームの練習量', `${seg('trainInt', Object.entries(TRAIN_INT).map(([k, v]) => [k, v.n]), G.user.train)}<p class="small muted" style="margin:8px 0 0">${esc(ti.d)}（成長×${ti.grow}・故障×${ti.inj}）</p>`)}
    ${panel('育成を支える体制', `<dl class="kv"><dt>打撃コーチ</dt><dd>${gr(coach('bat'))}</dd><dt>投手コーチ</dt><dd>${gr(coach('pit'))}</dd><dt>2軍監督</dt><dd>${gr(coach('farm'))}</dd><dt>育成コーチ</dt><dd>${gr(coach('ikusei'))}</dd><dt>育成費</dt><dd>${fmtOku(G.budget.dev)}／年</dd><dt>成長の補正（リーグ全体）</dt><dd>${Math.round((G.growAdj || 1) * 100)}%</dd></dl>`, { act: '<button class="btn sm" data-a="go" data-v="staff">スタッフ</button><button class="btn sm" data-a="go" data-v="stadium" data-tab="team">施設</button>' })}
  </div>
  ${t >= 36 && t <= 42 ? panel('秋季キャンプ（11月第2〜3週）', `<label class="chk"><input type="checkbox" data-c="fallOn" ${G.fallCamp.on ? 'checked' : ''}>実施する（費用4,000万円・25歳以下が大きく伸びる）</label><div class="row" style="margin-top:8px">テーマ ${`<select class="inp" data-c="fallTheme">${Object.entries(CAMP_THEMES).filter(([k]) => k !== 'youth').map(([k, v]) => opt(k, v.n, G.fallCamp.theme)).join('')}</select>`}</div>`, { cls: '' }) : ''}
  ${winterOpen ? `<p class="small muted" style="margin:14px 0 0">ウィンターリーグ：25歳以下の若手を最大3人まで海外へ派遣できます（1人600万円・12月末に成長）。派遣中 ${G.winter.length}/3人</p>` : ''}
  <div style="margin-top:16px">${tabs('trainF', [['young', '若手（25歳以下）'], ['p', '投手'], ['b', '野手']], tab)}${panel('', table('train-' + tab, cols, list, { sort: { k: 'pot', d: true } }), { flush: true })}</div>`;
};
ACT.trainInt = el => { G.user.train = el.dataset.v; render(); };
ACT.fallOn = el => { G.fallCamp.on = el.checked; };
ACT.fallTheme = el => { G.fallCamp.theme = el.value; };
ACT.winter = el => {
  const id = +el.dataset.id; G.user.lastSeenWinter = G.year;
  if (el.checked) { if (G.winter.length >= 3) { el.checked = false; toast('派遣は3人までです', 'bad'); return; } G.winter.push(id); book('exp', 'dev', 600); toast('ウィンターリーグへの派遣を決めました（600万円）'); }
  else { G.winter = G.winter.filter(x => x !== id); book('exp', 'dev', -600); }
};

/* ---------- キャンプ ---------- */
SCREENS.camp = () => {
  const t = curTurn();
  const c = G.camp || { site: defaultCampSite(), theme: 'balance', int: 'normal', guest: false };
  const locked = t >= 4;
  const site = Object.entries(CAMP_SITES).map(([k, s]) => `<button class="tcard ${c.site === k ? 'on' : ''}" style="--c:var(--lamp)" data-a="campSet" data-k="site" data-v="${k}" ${locked ? 'disabled' : ''}><div class="nm">${s.n}</div><div class="small muted">${s.d}</div><div class="row sp small"><span>費用 ${fmtOku(s.cost)}</span><span>成長×${s.grow}</span><span>人気+${s.pop}</span></div></button>`).join('');
  const theme = Object.entries(CAMP_THEMES).map(([k, s]) => `<button class="tcard ${c.theme === k ? 'on' : ''}" style="--c:var(--team)" data-a="campSet" data-k="theme" data-v="${k}" ${locked ? 'disabled' : ''}><div class="nm" style="font-size:15px">${s.n}</div><div class="small muted">${s.d}</div></button>`).join('');
  let status;
  if (t < 4) status = G.camp ? `<span class="tag b">決定済み</span> 2月第1週から ${CAMP_SITES[c.site].n} でキャンプを始めます。` : '<span class="tag s">未定</span> 決めないまま2月になると、宮崎・バランス・通常で行います。';
  else if (t <= 7) status = `<span class="tag lamp">キャンプ中</span> 第${t - 3}週。成長は通常の約2倍のペースです。`;
  else status = '今年の春季キャンプは終了しました。';
  const top = t >= 4 ? roster(G.user.tid).filter(p => p.grow > 0).sort((a, b) => b.grow - a.grow).slice(0, 8) : [];
  return `<h1 class="h1">春季キャンプ</h1><p class="lead">2月の4週間は1年でいちばん選手が伸びる時期です。場所・テーマ・練習量を1月中に決めましょう。</p>
  <div class="panel" style="margin-bottom:16px"><div class="panel-b">${status}</div></div>
  <div class="stack">
    ${panel('キャンプ地', `<div class="teamgrid">${site}</div>`)}
    ${panel('テーマ', `<div class="teamgrid">${theme}</div>`)}
    ${panel('練習量と臨時コーチ', `${seg('campInt', Object.entries(CAMP_INT).map(([k, v]) => [k, v.n]), c.int, locked ? 'disabled' : '')}<p class="small muted">${esc(CAMP_INT[c.int].n)}：成長×${CAMP_INT[c.int].grow}・故障×${CAMP_INT[c.int].inj}</p><label class="chk"><input type="checkbox" data-c="campGuest" ${c.guest ? 'checked' : ''} ${locked ? 'disabled' : ''}>球団OBのレジェンドを臨時コーチに招く（2,000万円・成長×1.06）</label>`)}
    ${top.length ? panel('キャンプで伸びた選手', `<table class="t compact"><tbody>${top.map(p => `<tr><td>${pLink(p)}</td><td>${POS_JP[p.pos]}</td><td class="num">総合 ${ovr(p)}</td><td class="num pos">+${(p.grow / (isP(p) ? 4 : 6)).toFixed(1)}</td></tr>`).join('')}</tbody></table>`) : ''}
  </div>`;
};
function ensureCamp() { if (!G.camp) G.camp = { site: defaultCampSite(), theme: 'balance', int: 'normal', guest: false }; return G.camp; }
ACT.campSet = el => { if (curTurn() >= 4) return; ensureCamp()[el.dataset.k] = el.dataset.v; render(); };
ACT.campInt = el => { if (curTurn() >= 4) return; ensureCamp().int = el.dataset.v; render(); };
ACT.campGuest = el => { ensureCamp().guest = el.checked; render(); };

/* メジャー版：サービスタイムと契約の段階 */
function mlbSvcText(p) {
  const c = svcClass(p);
  if (c === 'minor') return 'マイナー契約（40人枠の外）';
  if (p.intlFA) return '<span class="lamp">契約が切れるとFA</span>';
  if (c === 'fa') return faEligible(p) ? '<span class="lamp">今オフFA</span>' : 'FA権あり';
  if (c === 'arb') return `年俸調停の権利あり（FAまであと${LG.faYears - p.svc}年）`;
  return `調停権なし（調停まであと${LG.arbYears - p.svc}年・FAまであと${LG.faYears - p.svc}年）`;
}
const NAT_JP = { US: 'アメリカ', LAT: '中南米', JP: '日本', KR: '韓国', TW: '台湾' };
function birthOf(p) {
  if (p.prFrom) return p.prFrom + 'から';
  if (p.nat === 'LAT') return ['ドミニカ共和国', 'ベネズエラ', 'プエルトリコ', 'キューバ', 'メキシコ', 'パナマ', 'コロンビア'][p.id % 7] + '出身';
  if (p.nat && p.nat !== 'US') return NAT_JP[p.nat] + '出身';
  return (REGIONS[p.home] || 'アメリカ') + '出身';
}
