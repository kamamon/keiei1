/* =========================================================
   選手の編集（エディット）：一覧・編集画面・新しい選手の作成
   ========================================================= */
function editPool(who) {
  const ut = G.user.tid;
  if (who === 'mine') return roster(ut);
  if (who && who.startsWith('t:')) return roster(+who.slice(2));
  if (who === 'free') return G.fapool.map(P_).filter(Boolean);
  if (who === 'pros') return G.prospects.slice();
  if (who === 'frn') return G.foreign.slice();
  const out = []; for (const T of G.teams) out.push(...roster(T.id)); return out;
}
function whereLabel(p) {
  if (p.team >= 0) return `${tMark(p.team)} <span class="small muted">${p.lv === 3 ? lv3Name() : p.lv === 1 ? '1軍' : '2軍'}</span>`;
  return p.team === -2 ? '<span class="small">ドラフト候補</span>' : p.team === -3 ? '<span class="small">外国人候補</span>' : '<span class="small">自由契約</span>';
}
SCREENS.edit = () => {
  const f = UI.f.ed || (UI.f.ed = { who: 'mine', kind: 'all', q: '' });
  const nw = UI.f.nw || (UI.f.nw = { dest: 'u2', pos: 'OF', age: 22, cur: 55, pot: 68, name: '' });
  const list = editPool(f.who).filter(p => f.kind === 'all' || (f.kind === 'p' ? isP(p) : !isP(p)));
  const q = (f.q || '').trim();
  const cols = [
    { k: 'num', l: '背番', v: p => p.num, num: true, h: p => p.num >= 0 ? `<span class="num">${numStr(p)}</span>` : '' },
    { k: 'n', l: '名前', v: p => p.name, h: p => `${pLink(p)}${genTag(p, true)}${p.frn ? ' <span class="tag">外</span>' : ''}` },
    { k: 't', l: '所属', v: p => p.team * 10 + (p.lv || 0), h: whereLabel },
    { k: 'pos', l: '位置', v: p => p.pos, h: p => isP(p) ? (p.pt === 'SP' ? '先発' : '救援') : POS_S[p.pos] + subTags(p) },
    { k: 'age', l: '年齢', v: p => p.age, num: true, h: p => p.age },
    { k: 'o', l: '総合', v: ovr, h: p => av(ovr(p)) },
    { k: 'pt', l: '伸びしろ', v: potv, h: p => gr(potv(p)) },
    { k: 'sk', l: '特殊能力', v: skScore, h: skMini },
    { k: 'a', l: '', h: p => `<button class="btn xs pri" data-a="peOpen" data-id="${p.id}">編集</button>` }
  ];
  const posOpts = [['P:SP', '投手（先発）'], ['P:RP', '投手（救援）'], ['C', '捕手'], ['1B', '一塁手'], ['2B', '二塁手'], ['3B', '三塁手'], ['SS', '遊撃手'], ['OF', '外野手']];
  const dests = [['u2', '自球団（支配下）'], ['u3', '自球団（育成）']].concat(G.teams.filter(t => !isUser(t.id)).map(t => ['t:' + t.id, tName(t.id)]), [['free', '自由契約（どこにも所属しない）']]);
  return `<h1 class="h1">選手の編集</h1><p class="lead">名前・背番号・年齢・投打・守備位置・サブポジション・能力と上限・特殊能力・成長タイプ・性格などを自由に変えられます。新しい選手を作ることもできます。</p>
  <div class="row" style="margin-bottom:12px">
    <select class="inp" data-c="edWho" aria-label="所属">${opt('mine', '自球団', f.who)}${G.teams.filter(t => !isUser(t.id)).map(t => opt('t:' + t.id, tName(t.id), f.who)).join('')}${opt('all', '12球団すべて', f.who)}${opt('free', '自由契約', f.who)}${opt('pros', 'ドラフト候補', f.who)}${opt('frn', '外国人候補', f.who)}</select>
    ${seg('edKind', [['all', 'すべて'], ['p', '投手'], ['b', '野手']], f.kind)}
    <input class="inp" type="search" placeholder="名前で探す" value="${esc(q)}" data-i="edQ" aria-label="名前で探す" style="width:180px">
    <span class="small muted" id="edCount">${list.length}人</span>
  </div>
  <div class="grid g-edit">
    ${panel('', table('ed-' + f.who, cols, list, { sort: { k: 'o', d: true }, compact: true, rowAttr: p => `data-q="${esc(p.name)}"${q && !p.name.includes(q) ? ' hidden' : ''}`, empty: 'この条件の選手はいません' }), { flush: true })}
    ${panel('新しい選手を作る', `<div class="stack">
      <label class="field"><span>入るところ</span><select class="inp" data-c="nwSel" data-k="dest">${dests.map(([v, l]) => opt(v, l, nw.dest)).join('')}</select></label>
      <label class="field"><span>守備位置</span><select class="inp" data-c="nwSel" data-k="pos">${posOpts.map(([v, l]) => opt(v, l, nw.pos)).join('')}</select></label>
      <div class="ed-grid">
        <label class="field"><span>年齢</span><input class="inp num" type="number" min="15" max="50" value="${nw.age}" data-i="nwNum" data-k="age"></label>
        <label class="field"><span>総合の目安</span><input class="inp num" type="number" min="15" max="95" value="${nw.cur}" data-i="nwNum" data-k="cur"></label>
        <label class="field"><span>伸びしろの目安</span><input class="inp num" type="number" min="15" max="99" value="${nw.pot}" data-i="nwNum" data-k="pot"></label>
      </div>
      <label class="field"><span>名前（空欄なら自動で決めます）</span><input class="inp" maxlength="16" value="${esc(nw.name)}" data-i="nwTxt" data-k="name"></label>
      <button class="btn pri" data-a="nwGo">作って編集する</button>
      <p class="small muted" style="margin:0">能力は目安から自動で作り、すぐに細かく編集できます。支配下は${LIM.shihai}人、育成は${LIM.ikusei}人までです。</p></div>`)}
  </div>`;
};
ACT.edWho = el => { UI.f.ed.who = el.value; render(); };
ACT.edKind = el => { UI.f.ed.kind = el.dataset.v; render(); };
ACT.edQ = el => {
  const q = el.value.trim(); UI.f.ed.q = q; let n = 0;
  document.querySelectorAll('tr[data-q]').forEach(tr => { const hit = !q || tr.dataset.q.includes(q); tr.hidden = !hit; if (hit) n++; });
  const c = $('#edCount'); if (c) c.textContent = n + '人';
};
ACT.nwSel = el => { UI.f.nw[el.dataset.k] = el.value; };
ACT.nwNum = el => { UI.f.nw[el.dataset.k] = +el.value; };
ACT.nwTxt = el => { UI.f.nw[el.dataset.k] = el.value; };
ACT.nwGo = () => {
  const o = UI.f.nw; const [pos, pt] = o.pos.split(':');
  const r = createPlayer({ dest: o.dest, pos, pt, age: o.age, cur: o.cur, pot: o.pot, name: o.name });
  if (!r.ok) { toast(r.why, 'bad'); return; }
  UI.f.nw.name = '';
  toast(`${r.p.name}を作りました`, 'good');
  UI.f.pe = editDraft(r.p); openModal('pedit', { id: r.p.id }); render();
};

/* ---------- 編集画面（モーダル） ---------- */
ACT.peOpen = el => {
  const p = findPlayer(+el.dataset.id); if (!p) return;
  UI.f.pe = editDraft(p);
  if (UI.modal) replaceModal('pedit', { id: p.id }); else openModal('pedit', { id: p.id });
  render();
};
function edFld(label, html, cls) { return `<label class="field ${cls || ''}"><span>${label}</span>${html}</label>`; }
function edNum(k, v, lo, hi, step) { return `<input class="inp num" type="number" min="${lo}" max="${hi}" step="${step || 1}" value="${Math.round(v)}" data-i="peNum" data-k="${k}">`; }
function edSel(k, opts, cur) { return `<select class="inp" data-c="peSel" data-k="${k}">${opts.map(([v, l]) => opt(v, l, cur)).join('')}</select>`; }
function injLabel(v) { const g = duraGrade({ inj: v }); return `ケガしにくさ ${gradeL(g)}（${v >= 65 ? '故障が多い' : v >= 40 ? 'ふつう' : '故障が少ない'}）`; }
MODALS.pedit = ({ id }) => {
  const p = findPlayer(id); const d = UI.f.pe; if (!p || !d || d.id !== id) return null;
  const P = d.pos === 'P'; const keys = editKeys(d); const onTeam = p.team >= 0;
  const posOpts = [['P', '投手'], ['C', '捕手'], ['1B', '一塁手'], ['2B', '二塁手'], ['3B', '三塁手'], ['SS', '遊撃手'], ['OF', '外野手']];
  const basic = `<div class="ed-grid">
      ${edFld('名前', `<input class="inp" maxlength="16" value="${esc(d.name)}" data-i="peTxt" data-k="name">`, 'w2')}
      ${onTeam ? edFld('背番号', edNum('num', d.num, p.lv === 3 ? 100 : 0, p.lv === 3 ? 199 : 99)) : ''}
      ${edFld('年齢', edNum('age', d.age, 15, 50))}
      ${edFld('投げる', edSel('thr', [['R', '右'], ['L', '左']], d.thr))}
      ${edFld('打つ', edSel('bats', [['R', '右'], ['L', '左'], ['S', '両']], d.bats))}
      ${edFld('守備位置', `<select class="inp" data-c="pePos">${posOpts.map(([v, l]) => opt(v, l, d.pos)).join('')}</select>`)}
      ${P ? edFld('投手の型', edSel('pt', [['SP', '先発'], ['RP', '救援']], d.pt)) : ''}
      ${p.pr ? edFld(p.team === -3 ? '前所属' : '学校・チーム', `<input class="inp" maxlength="20" value="${esc(d.school)}" data-i="peTxt" data-k="school">`, 'w2') : ''}
    </div>
    <div class="row" style="margin-top:10px"><label class="chk"><input type="checkbox" data-c="peChk" data-k="frn" ${d.frn ? 'checked' : ''}>外国人選手</label><label class="chk"><input type="checkbox" data-c="peChk" data-k="gen" ${d.gen ? 'checked' : ''}>10年に一度の逸材（成長が早く、覚醒しやすい）</label></div>
    ${d.wasP !== P && d.hasStats ? '<p class="small warn" style="margin:8px 0 0">投手と野手を入れ替えると、これまでの成績の記録は消えます。</p>' : ''}`;
  const attrs = `<table class="t compact ed-attr"><thead><tr><th>能力</th><th class="num">いま</th><th></th><th class="num">上限</th></tr></thead><tbody>${keys.map(k => {
    const [lo, hi] = attrRange(k);
    return `<tr><td>${ATTR_JP[k]}</td><td class="num"><input class="inp num" type="number" min="${lo}" max="${hi}" value="${Math.round(d.a[k])}" data-i="peAttr" data-w="a" data-k="${k}" aria-label="${ATTR_JP[k]}（いま）"></td><td>${k === 'vel' ? '<span class="small muted">km/h</span>' : `<span data-gr="${k}">${gr(d.a[k])}</span>`}</td><td class="num"><input class="inp num" type="number" min="${lo}" max="${k === 'vel' ? 172 : 99}" value="${Math.round(Math.max(d.cap[k], d.a[k]))}" data-i="peAttr" data-w="cap" data-k="${k}" aria-label="${ATTR_JP[k]}（上限）"></td></tr>`;
  }).join('')}</tbody></table>
    <div class="row" style="margin-top:8px"><button class="btn xs" data-a="peAll" data-v="-5">全体 −5</button><button class="btn xs" data-a="peAll" data-v="5">全体 +5</button><button class="btn xs" data-a="peCap" data-v="0">上限をいまに合わせる</button><button class="btn xs" data-a="peCap" data-v="10">上限を+10</button></div>`;
  const subs = P ? '<p class="small muted" style="margin:0">投手にはサブポジションはありません。</p>' : `<div class="ed-grid">${SUB_KEYS.filter(k => k !== d.pos).map(k => edFld(POS_JP[k], `<select class="inp" data-c="peSub" data-k="${k}">${[0, 1, 2, 3].map(v => opt(v, v ? SUB_MARK[v] + ' ' + SUB_LVN[v] : '守れない', d.sub[k] || 0)).join('')}</select>`)).join('')}</div>`;
  const ref = { pos: d.pos, pt: d.pt };
  const ks = Object.keys(SKILLS).filter(k => skOk(ref, k));
  const grp = c => ks.filter(k => SKILLS[k].c === c);
  const lvSel = `<div class="ed-grid">${grp('lv').map(k => edFld(SKILLS[k].n, `<select class="inp" data-c="peSkL" data-k="${k}" title="${esc(SKILLS[k].d)}">${[3, 2, 1, 0, -1, -2, -3].map(v => opt(v, gradeL(v) + (v === 0 ? '（ふつう）' : ''), d.sk[k] || 0)).join('')}</select>`)).join('')}</div>`;
  const chk = (c, label) => `<div class="sk-pick"><span class="small muted">${label}</span>${grp(c).map(k => `<label class="chk sk-c ${c}" title="${esc(SKILLS[k].d)}"><input type="checkbox" data-c="peSk" data-k="${k}" ${d.sk[k] ? 'checked' : ''}>${esc(SKILLS[k].n)}</label>`).join('')}</div>`;
  const grow = `<div class="ed-grid">
      ${edFld('成長タイプ', edSel('gt', GT.map((g, i) => [i, `${g.n}（〜${g.g}歳まで伸びる）`]), d.gt), 'w2')}
      ${edFld('性格', edSel('per', Object.entries(PERS).map(([k, v]) => [k, v.n]), d.per))}
      ${edFld('人気', edNum('pop', d.pop, 0, 100))}${edFld('やる気', edNum('mor', d.mor, 0, 100))}
      ${edFld('故障のしやすさ', `<input type="range" min="5" max="95" value="${d.inj}" data-i="peRange" data-k="inj" aria-label="故障のしやすさ"><span class="small" id="peInj">${injLabel(d.inj)}</span>`, 'w2')}
    </div>`;
  const con = onTeam ? `<div class="ed-grid">${edFld(`年俸（${moneyUnit()}）`, edNum('sal', moneyShow(d.sal), 0, LG.mlb ? 99999 : 999999, LG.mlb ? 1 : 10))}${edFld('契約の残り年数', edNum('yrs', d.yrs, 1, 10))}${edFld('1軍在籍年数（FA権の計算）', edNum('svc', d.svc, 0, 30), 'w2')}</div>` : '';
  return { title: `選手を編集：${esc(p.name)}`, size: 'wide edit',
    body: `<div class="ed"><div class="ed-col">
      <section class="ed-sec"><h4>基本</h4>${basic}</section>
      <section class="ed-sec"><h4>能力 <span class="small muted">総合 <b id="peOvr">${draftOvr(d)}</b>　伸びしろ <b id="pePot">${draftPot(d)}</b></span></h4>${attrs}</section>
      <section class="ed-sec"><h4>サブポジション</h4>${subs}</section>
    </div><div class="ed-col">
      <section class="ed-sec"><h4>特殊能力</h4><div class="small muted" style="margin-bottom:6px">段階つき（A〜G。Dがふつう）</div>${lvSel}${chk('b', 'プラス')}${chk('r', 'マイナス')}${chk('au', '金（特別）')}</section>
      <section class="ed-sec"><h4>育成・性格</h4>${grow}</section>
      ${con ? `<section class="ed-sec"><h4>契約</h4>${con}</section>` : ''}
    </div></div>`,
    foot: `<button class="btn" data-a="peCancel" data-id="${id}">やめる</button><button class="btn pri" data-a="peSave" data-id="${id}">保存する</button>` };
};
function peLive() {
  const d = UI.f.pe; if (!d) return;
  const o = $('#peOvr'), t = $('#pePot'); if (o) o.textContent = draftOvr(d); if (t) t.textContent = draftPot(d);
  for (const k of editKeys(d)) { const el = document.querySelector(`[data-gr="${k}"]`); if (el) el.innerHTML = gr(d.a[k]); }
}
ACT.peTxt = el => { UI.f.pe[el.dataset.k] = el.value; };
ACT.peNum = el => { UI.f.pe[el.dataset.k] = el.dataset.k === 'sal' ? moneyFrom(+el.value) : +el.value; };
ACT.peAttr = el => { const d = UI.f.pe; const [lo, hi] = attrRange(el.dataset.k); d[el.dataset.w][el.dataset.k] = clamp(+el.value || lo, lo, el.dataset.w === 'cap' && el.dataset.k === 'vel' ? 172 : hi); peLive(); };
ACT.peRange = el => { UI.f.pe.inj = +el.value; const s = $('#peInj'); if (s) s.textContent = injLabel(+el.value); };
ACT.peSel = el => {
  const d = UI.f.pe; const k = el.dataset.k;
  d[k] = k === 'gt' ? +el.value : el.value;
  if (k === 'pt') for (const x of Object.keys(d.sk)) if (SKILLS[x] && SKILLS[x].sp && d.pt !== 'SP') delete d.sk[x];
  renderModalRoot();
};
ACT.pePos = el => {
  const d = UI.f.pe; const np = el.value; const old = d.pos;
  if ((old === 'P') !== (np === 'P')) draftSwitchType(d, np);
  else if (np !== 'P') { d.pos = np; delete d.sub[np]; d.sub[old] = Math.max(d.sub[old] || 0, 3); }
  for (const x of Object.keys(d.sk)) if (!skOk({ pos: d.pos, pt: d.pt }, x)) delete d.sk[x];
  renderModalRoot();
};
ACT.peChk = el => { UI.f.pe[el.dataset.k] = el.checked; };
ACT.peSub = el => { UI.f.pe.sub[el.dataset.k] = +el.value; };
ACT.peSkL = el => {
  const d = UI.f.pe; const k = el.dataset.k; const v = +el.value;
  if (v) d.sk[k] = v; else delete d.sk[k];
  if (v) for (const g in SKILLS) if (SKILLS[g].up === k) delete d.sk[g];
  renderModalRoot();
};
ACT.peSk = el => {
  const d = UI.f.pe; const k = el.dataset.k; const def = SKILLS[k];
  if (!el.checked) { delete d.sk[k]; renderModalRoot(); return; }
  d.sk[k] = 1;
  for (const x of def.x || []) delete d.sk[x];
  if (def.up) delete d.sk[def.up];
  for (const g in SKILLS) if (SKILLS[g].up === k) delete d.sk[g];
  renderModalRoot();
};
ACT.peAll = el => {
  const d = UI.f.pe; const v = +el.dataset.v;
  for (const k of editKeys(d)) { const [lo, hi] = attrRange(k); d.a[k] = clamp(d.a[k] + (k === 'vel' ? v * 0.6 : v), lo, hi); d.cap[k] = Math.max(d.cap[k], d.a[k]); }
  renderModalRoot();
};
ACT.peCap = el => {
  const d = UI.f.pe; const v = +el.dataset.v;
  for (const k of editKeys(d)) d.cap[k] = v ? clamp(Math.max(d.cap[k], d.a[k]) + (k === 'vel' ? v * 0.4 : v), d.a[k], k === 'vel' ? 172 : 99) : d.a[k];
  renderModalRoot();
};
ACT.peCancel = el => { const id = +el.dataset.id; UI.f.pe = null; replaceModal('player', { id }); render(); };
ACT.peSave = el => {
  const id = +el.dataset.id; const p = findPlayer(id); const d = UI.f.pe; if (!p || !d) return;
  const r = applyEdit(p, d);
  if (!r.ok) { toast(r.why, 'bad'); return; }
  UI.f.pe = null;
  toast(`${p.name}を保存しました${r.msgs.length ? '。' + r.msgs.join('。') : ''}`, 'good');
  replaceModal('player', { id });
  render();
};
