/* =========================================================
   試合：日程・結果・ボックススコア・順位表・成績
   ========================================================= */
SCREENS.schedule = () => {
  const ut = G.user.tid; const list = userSchedule();
  const tab = getTab('sched', 'mine');
  if (tab === 'league') return scheduleLeague();
  const byMonth = {};
  for (const x of list) {
    const d = typeof x.d === 'number' ? x.d : null;
    const m = d != null ? Math.floor(dayTurn(d) / 4) + 1 : 9;
    (byMonth[m] = byMonth[m] || []).push(x);
  }
  const done = list.filter(x => x.g.done && !x.g.rain);
  const home = done.filter(x => x.g.h === ut);
  const att = sum(home, x => x.g.att || 0);
  const html = Object.keys(byMonth).sort((a, b) => a - b).map(m => {
    const rows = byMonth[m].map(x => {
      const g = x.g; const hm = g.h === ut; const opp = hm ? g.a : g.h;
      let res = '';
      if (g.rain) res = '<span class="faint">雨天中止</span>';
      else if (g.done) { const my = hm ? g.hs : g.as, op = hm ? g.as : g.hs; res = `<span class="wl ${my > op ? 'w' : my < op ? 'l' : 'd'}" style="width:24px;height:24px;font-size:12px">${my > op ? '勝' : my < op ? '敗' : '分'}</span> <span class="num">${my}-${op}</span>`; }
      const box = g.id != null && G.boxes[g.id] ? `<button class="btn xs" data-a="box" data-id="${g.id}">詳細</button>` : '';
      return `<tr class="${g.done ? '' : 'dim'}"><td class="small">${x.mk ? '予備日' : dayLabel(x.d)}</td><td>${hm ? 'vs' : '@'} ${tMark(opp)}</td><td class="small muted">${esc(hm ? stadiumName() : stadiumNameOf(g.h))}</td><td>${res}</td><td class="num">${g.done && hm && g.att ? comma(g.att) : ''}</td><td>${box}</td></tr>`;
    }).join('');
    return panel(m + '月', `<div class="tw"><table class="t compact"><thead><tr><th>日付</th><th>対戦</th><th>球場</th><th>結果</th><th class="num">観客</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`, { flush: true });
  }).join('');
  return `<h1 class="h1">日程・結果</h1><p class="lead">公式戦${LG.games}試合。ホーム${home.length}試合の観客は合計${fmtPeople(att)}（平均${home.length ? comma(att / home.length) : 0}人）。</p>
  ${tabs('sched', [['mine', '自球団の日程'], ['league', 'リーグ全体の結果']], tab)}<div class="stack">${html}</div>`;
};
function scheduleLeague() {
  const d = Math.max(0, Math.min(G.day - 1, G.sched.days.length - 1));
  const sel = UI.f.leagueDay != null ? UI.f.leagueDay : d;
  const day = G.sched.days[sel] || [];
  const rows = day.map(g => `<tr><td>${tMark(g.a)}</td><td class="num">${g.done && !g.rain ? g.as : ''}</td><td class="center">-</td><td class="num">${g.done && !g.rain ? g.hs : ''}</td><td>${tMark(g.h)}</td><td class="small muted">${g.rain ? '雨天中止' : g.done ? '' : '試合前'}</td><td class="num small">${g.att ? comma(g.att) + '人' : ''}</td></tr>`).join('');
  return `<h1 class="h1">日程・結果</h1>${tabs('sched', [['mine', '自球団の日程'], ['league', 'リーグ全体の結果']], 'league')}
  <div class="row" style="margin-bottom:10px"><button class="btn sm" data-a="lgDay" data-v="${sel - 1}" ${sel <= 0 ? 'disabled' : ''}>前の日</button><b>${dayLabel(sel)}</b><button class="btn sm" data-a="lgDay" data-v="${sel + 1}" ${sel >= G.sched.days.length - 1 ? 'disabled' : ''}>次の日</button></div>
  ${panel('', rows ? `<table class="t"><thead><tr><th>ビジター</th><th></th><th></th><th></th><th>ホーム</th><th></th><th class="num">観客</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">この日は試合がありません（移動日・オールスター休み）</div>', { flush: true })}`;
}
ACT.lgDay = el => { UI.f.leagueDay = clamp(+el.dataset.v, 0, G.sched.days.length - 1); render(); };

/* ---------- ボックススコア ---------- */
ACT.box = el => { openModal('box', { id: +el.dataset.id }); render(); };
function lineScore(b) {
  const n = Math.max(9, b.line[0].length, b.line[1].length);
  const head = Array.from({ length: n }, (_, i) => `<th>${i + 1}</th>`).join('');
  const row = (i, tid) => `<tr><td class="tn">${esc(tShort(tid))}</td>${Array.from({ length: n }, (_, k) => `<td>${b.line[i][k] != null ? b.line[i][k] : ''}</td>`).join('')}<td class="tot">${i ? b.hs : b.as}</td><td class="he">${b.hits ? b.hits[i] : ''}</td><td class="he">${b.errs ? b.errs[i] : ''}</td></tr>`;
  return `<div class="ls"><table><thead><tr><th></th>${head}<th>計</th><th>安</th><th>失</th></tr></thead><tbody>${row(0, b.a)}${row(1, b.h)}</tbody></table></div>`;
}
MODALS.box = ({ id }) => {
  const b = G.boxes[id]; if (!b) return { title: '試合', body: '<p>この試合の詳細は保存されていません。</p>' };
  const side = i => {
    const bx = b.box[i]; const tid = i ? b.h : b.a;
    const bat = `<table class="t compact"><thead><tr><th></th><th>打者</th><th class="num">打数</th><th class="num">安打</th><th class="num">打点</th><th class="num">本</th><th class="num">四死</th><th class="num">三振</th></tr></thead><tbody>${bx.bat.map(r => { const p = P_(r.id); return `<tr><td class="small muted">${POS_S[r.pos]}</td><td>${p ? pLink(p) : '?'}</td><td class="num">${r.ab}</td><td class="num">${r.h}</td><td class="num">${r.rbi}</td><td class="num">${r.hr || ''}</td><td class="num">${r.bb || ''}</td><td class="num">${r.so || ''}</td></tr>`; }).join('')}</tbody></table>`;
    const pit = `<table class="t compact"><thead><tr><th>投手</th><th></th><th class="num">回</th><th class="num">球数</th><th class="num">安</th><th class="num">失</th><th class="num">自責</th><th class="num">四死</th><th class="num">三振</th></tr></thead><tbody>${bx.pit.map(r => { const p = P_(r.id); return `<tr><td>${p ? pLink(p) : '?'}</td><td>${r.dec ? `<span class="tag ${r.dec === '勝' ? 'b' : r.dec === '敗' ? 'o' : 'lamp'}">${r.dec}</span>` : ''}</td><td class="num">${fmtIP(r.outs)}</td><td class="num">${r.pc}</td><td class="num">${r.h}</td><td class="num">${r.r}</td><td class="num">${r.er}</td><td class="num">${r.bb}</td><td class="num">${r.so}</td></tr>`; }).join('')}</tbody></table>`;
    return `<div><h4 style="margin:6px 0">${tMark(tid, true)}</h4><div class="tw">${bat}</div><div class="tw" style="margin-top:8px">${pit}</div></div>`;
  };
  const log = (b.log || []).map(l => `<li><span class="d">${l.inn}回${l.half ? '裏' : '表'}</span><span class="tx">${l.k === 'chg' ? '<span class="faint">' + esc(l.t) + '</span>' : `${l.k === 'hr' ? '<b>' : ''}${esc(l.t)}${l.k === 'hr' ? '</b>' : ''}${l.sc ? ` <span class="num faint">${l.sc[0]}-${l.sc[1]}</span>` : ''}`}</span></li>`).join('');
  return { title: `${esc(tShort(b.a))} ${b.as} - ${b.hs} ${esc(tShort(b.h))}`, size: 'wide',
    body: `<div class="small muted" style="margin-bottom:8px">${esc(b.date)}${b.day ? '(' + b.day + ')' : ''}　${esc(stadiumNameOf(b.h))}${b.att ? '　観客 ' + comma(b.att) + '人' : ''}${b.post ? '　ポストシーズン' : ''}</div>
      ${lineScore(b)}
      ${log ? `<h4 style="margin:14px 0 4px">得点経過</h4><ul class="news">${log}</ul>` : ''}
      <div class="grid g2" style="margin-top:14px">${side(0)}${side(1)}</div>` };
};

/* ---------- 順位表 ---------- */
SCREENS.standings = () => {
  const ut = G.user.tid;
  if (LG.mlb) return standingsMLB();
  const one = lg => {
    const st = standings(lg);
    return panel(LEAGUES[lg], table('st' + lg, [
      { k: 'r', l: '順位', h: x => x.rank, num: true },
      { k: 't', l: '球団', h: x => tMark(x.t.id, true) },
      { k: 'g', l: '試合', h: x => x.t.rec.w + x.t.rec.l + x.t.rec.d, num: true },
      { k: 'w', l: '勝', h: x => x.t.rec.w, num: true }, { k: 'l', l: '敗', h: x => x.t.rec.l, num: true }, { k: 'd', l: '分', h: x => x.t.rec.d, num: true },
      { k: 'p', l: '勝率', h: x => fmtAvg(pctOf(x.t.rec)), num: true }, { k: 'gb', l: '差', h: x => x.rank === 1 ? '―' : x.gb.toFixed(1), num: true },
      { k: 'rs', l: '得点', h: x => x.t.rec.rs, num: true }, { k: 'ra', l: '失点', h: x => x.t.rec.ra, num: true },
      { k: 'hm', l: 'ホーム', h: x => `${x.t.rec.hw}-${x.t.rec.hl}`, num: true },
      { k: 'il', l: '交流戦', h: x => `${x.t.rec.il[0]}-${x.t.rec.il[1]}`, num: true },
      { k: 'st', l: '連続', h: x => x.t.rec.strk > 0 ? x.t.rec.strk + '連勝' : x.t.rec.strk < 0 ? (-x.t.rec.strk) + '連敗' : '' },
      { k: 'att', l: '平均観客', h: x => x.t.att && x.t.att.g ? comma(x.t.att.tot / x.t.att.g) : '―', num: true }
    ], st, { rowCls: x => x.t.id === ut ? 'me' : '' }), { flush: true });
  };
  const T = uT();
  const vs = G.teams.filter(t => t.id !== ut).map(t => { const v = T.rec.vs[t.id] || [0, 0, 0]; return `<tr><td>${tMark(t.id)}</td><td class="num">${v[0]}勝${v[1]}敗${v[2] ? v[2] + '分' : ''}</td></tr>`; }).join('');
  return `<h1 class="h1">順位表</h1><p class="lead">各リーグ上位3球団がプレーオフへ進み、勝ち抜いた2球団がグランドシリーズで日本一を争います。</p>
  ${G.post ? postBracket() : ''}
  <div class="stack">${one(0)}${one(1)}
  ${panel('対戦成績（' + esc(tShort(ut)) + '）', `<table class="t compact"><tbody>${vs}</tbody></table>`)}</div>`;
};
function postBracket() {
  if (LG.mlb) return postBracketMLB();
  const P = G.post; const ser = k => P.series.filter(s => s.kind === k);
  const sline = s => { if (!s) return ''; const st = s.winner == null ? (s.games.length ? '進行中' : '予定') : '勝ち抜け：' + esc(tShort(s.winner)); return `<div class="lot-row ${s.winner != null && (isUser(s.winner)) ? 'win' : ''}"><div style="flex:1">${tMark(s.hi)} <span class="num">${s.w[0]}</span> - <span class="num">${s.w[1]}</span> ${tMark(s.lo)}${s.d ? ` <span class="small muted">${s.d}分</span>` : ''}</div><span class="small muted">${st}</span>${s.games.length ? s.games.map(g => g.id != null && G.boxes[g.id] ? `<button class="btn xs" data-a="box" data-id="${g.id}">${g.as}-${g.hs}</button>` : '').join('') : ''}</div>`; };
  return panel('ポストシーズン', `<div class="grid g3">
    <div><h4 style="margin:0 0 6px">プレーオフ1st（3試合）</h4>${ser('cs1').map(sline).join('')}</div>
    <div><h4 style="margin:0 0 6px">プレーオフ最終（6試合・1位に1勝）</h4>${ser('cs2').map(sline).join('') || '<span class="muted small">10月第2週</span>'}</div>
    <div><h4 style="margin:0 0 6px">グランドシリーズ（7試合）</h4>${ser('gs').map(sline).join('') || '<span class="muted small">10月第3週</span>'}${P.champ != null ? `<p><b>日本一：${tMark(P.champ, true)}</b>${P.mvp != null && P_(P.mvp) ? `<br><span class="small">シリーズMVP ${pLinkId(P.mvp)}</span>` : ''}</p>` : ''}</div>
  </div>`, { cls: 'hl' });
}

/* ---------- 成績・タイトル ---------- */
SCREENS.stats = () => {
  const tab = getTab('stats', 'leaders');
  const t = [['leaders', 'リーグ上位'], ['mine', '自球団の個人成績'], ['teams', 'チーム成績'], ['awards', '表彰']];
  let body = '';
  if (tab === 'leaders') {
    const lg = +(getTab('statsLg', String(uT().league)));
    const box = (k) => { const d = STAT_DEFS[k]; const l = leaders(lg, k, 5); return panel(d.n, l.length ? `<table class="t compact"><tbody>${l.map((x, i) => `<tr class="${x.p.team === G.user.tid ? 'me' : ''}"><td class="num">${i + 1}</td><td>${pLink(x.p)}</td><td class="small">${tMark(x.p.team)}</td><td class="num">${d.fmt ? d.fmt(x.v) : x.v}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">規定に達した選手はまだいません</div>', { flush: true }); };
    body = `<div class="row" style="margin-bottom:12px">${seg('statsLg', [['0', LEAGUES[0]], ['1', LEAGUES[1]]], lg)}</div>
      <div class="grid g3">${['avg', 'hr', 'rbi', 'h', 'sb', 'obp', 'era', 'w', 'so', 'sv', 'hp', 'whip'].map(box).join('')}</div>`;
  } else if (tab === 'mine') {
    const ps = roster(G.user.tid);
    const bat = ps.filter(p => !isP(p) && p.st.pa > 0), pit = ps.filter(p => isP(p) && p.st.g > 0);
    body = panel('打撃成績', table('ms-b', [
      { k: 'n', l: '選手', v: p => p.name, h: p => pLink(p) }, { k: 'g', l: '試合', v: p => p.st.g, num: true, h: p => p.st.g },
      { k: 'pa', l: '打席', v: p => p.st.pa, num: true, h: p => p.st.pa }, { k: 'avg', l: '打率', v: p => bAvg(p.st), num: true, h: p => fmtAvg(bAvg(p.st)) },
      { k: 'h', l: '安打', v: p => p.st.h, num: true, h: p => p.st.h }, { k: 'hr', l: '本塁打', v: p => p.st.hr, num: true, h: p => p.st.hr },
      { k: 'rbi', l: '打点', v: p => p.st.rbi, num: true, h: p => p.st.rbi }, { k: 'sb', l: '盗塁', v: p => p.st.sb, num: true, h: p => p.st.sb },
      { k: 'bb', l: '四球', v: p => p.st.bb, num: true, h: p => p.st.bb }, { k: 'so', l: '三振', v: p => p.st.so, num: true, h: p => p.st.so },
      { k: 'obp', l: '出塁率', v: p => bObp(p.st), num: true, h: p => fmtAvg(bObp(p.st)) }, { k: 'ops', l: 'OPS', v: p => bOps(p.st), num: true, h: p => bOps(p.st).toFixed(3) },
      { k: 'e', l: '失策', v: p => p.st.e, num: true, h: p => p.st.e }, { k: 'war', l: 'WAR', v: p => war(p), num: true, h: p => r1(war(p)) }
    ], bat, { sort: { k: 'pa', d: true } }), { flush: true }) + '<div style="height:16px"></div>' + panel('投手成績', table('ms-p', [
      { k: 'n', l: '選手', v: p => p.name, h: p => pLink(p) }, { k: 'g', l: '登板', v: p => p.st.g, num: true, h: p => p.st.g }, { k: 'gs', l: '先発', v: p => p.st.gs, num: true, h: p => p.st.gs },
      { k: 'w', l: '勝', v: p => p.st.w, num: true, h: p => p.st.w }, { k: 'l', l: '敗', v: p => p.st.l, num: true, h: p => p.st.l },
      { k: 'sv', l: 'S', v: p => p.st.sv, num: true, h: p => p.st.sv }, { k: 'hld', l: 'H', v: p => p.st.hld, num: true, h: p => p.st.hld },
      { k: 'ip', l: '投球回', v: p => p.st.outs, num: true, h: p => fmtIP(p.st.outs) }, { k: 'so', l: '奪三振', v: p => p.st.so, num: true, h: p => p.st.so },
      { k: 'bb', l: '与四球', v: p => p.st.bb, num: true, h: p => p.st.bb }, { k: 'era', l: '防御率', v: p => -pEra(p.st), num: true, h: p => fmtEra(pEra(p.st)) },
      { k: 'whip', l: 'WHIP', v: p => -pWhip(p.st), num: true, h: p => pWhip(p.st).toFixed(2) }, { k: 'qs', l: 'QS', v: p => p.st.qs, num: true, h: p => p.st.qs },
      { k: 'war', l: 'WAR', v: p => war(p), num: true, h: p => r1(war(p)) }
    ], pit, { sort: { k: 'ip', d: true } }), { flush: true });
  } else if (tab === 'teams') {
    const rows = G.teams.map(T => {
      const ps = roster(T.id); let ab = 0, h = 0, hr = 0, sb = 0, er = 0, outs = 0, so = 0, e = 0;
      for (const p of ps) { if (isP(p)) { er += p.st.er; outs += p.st.outs; so += p.st.so; } else { ab += p.st.ab; h += p.st.h; hr += p.st.hr; sb += p.st.sb; e += p.st.e; } }
      return { T, avg: ab ? h / ab : 0, hr, sb, era: outs ? er * 27 / outs : 0, so, e, rs: T.rec.rs, ra: T.rec.ra, pay: teamPayroll(T.id) };
    });
    body = panel('', table('teams', [
      { k: 't', l: '球団', v: r => r.T.id, h: r => tMark(r.T.id, true) },
      { k: 'avg', l: '打率', v: r => r.avg, num: true, h: r => fmtAvg(r.avg) }, { k: 'hr', l: '本塁打', v: r => r.hr, num: true, h: r => r.hr },
      { k: 'sb', l: '盗塁', v: r => r.sb, num: true, h: r => r.sb }, { k: 'rs', l: '得点', v: r => r.rs, num: true, h: r => r.rs },
      { k: 'era', l: '防御率', v: r => -r.era, num: true, h: r => fmtEra(r.era) }, { k: 'so', l: '奪三振', v: r => r.so, num: true, h: r => r.so },
      { k: 'ra', l: '失点', v: r => -r.ra, num: true, h: r => r.ra }, { k: 'e', l: '失策', v: r => -r.e, num: true, h: r => r.e },
      { k: 'pay', l: '年俸総額', v: r => r.pay, num: true, h: r => fmtOku(r.pay) }
    ], rows, { rowCls: r => isUser(r.T.id) ? 'me' : '' }), { flush: true });
  } else {
    body = awardsView();
  }
  return `<h1 class="h1">成績・タイトル</h1>${tabs('stats', t, tab)}${body}`;
};
ACT.statsLg = el => { UI.tab.statsLg = el.dataset.v; render(); };
function awardsView() {
  const yrs = G.hist.seasons.slice().reverse();
  const cur = G.awards ? [{ y: G.year, awards: G.awards, titles: G.seasonTitles, names: null }] : [];
  const all = cur.concat(yrs);
  if (!all.length) return '<div class="empty">表彰はシーズン終了後（11月）に発表されます。</div>';
  const nm = (s, id) => { const p = P_(id); if (p) return pLink(p); const n = s.names && s.names[id]; return n ? esc(n.n) : '―'; };
  return all.map(s => {
    if (!s.awards && !s.titles) return '';
    const cols = [0, 1].map(lg => {
      const A = s.awards ? s.awards[lg] : null; const T = s.titles ? s.titles[lg] : null;
      let h = `<h4 style="margin:0 0 6px">${LEAGUES[lg]}</h4><table class="t compact"><tbody>`;
      if (A) { h += `<tr><td>MVP</td><td>${A.mvp != null ? nm(s, A.mvp) : '―'}</td></tr><tr><td>新人王</td><td>${A.roy != null ? nm(s, A.roy) : '該当なし'}</td></tr><tr><td>${LG.aceAward}</td><td>${A.ace != null ? nm(s, A.ace) : '―'}</td></tr>`; }
      if (T) for (const k in T) h += `<tr><td>${esc(T[k].n)}</td><td>${T[k].ids.map(id => nm(s, id)).join('、')} <span class="num faint">${STAT_DEFS[k] && STAT_DEFS[k].fmt ? STAT_DEFS[k].fmt(T[k].v) : T[k].v}</span></td></tr>`;
      if (A) { h += `<tr><td>ベストナイン</td><td class="small">${Object.entries(A.b9).map(([k, v]) => `${POS_S[k] || k}:${[].concat(v).map(id => nm(s, id)).join('・')}`).join('　')}</td></tr>`; }
      return h + '</tbody></table>';
    }).join('');
    return panel(`${s.y}年`, `<div class="grid g2">${cols}</div>`) + '<div style="height:14px"></div>';
  }).join('');
}

/* ---------- メジャー版の順位表：地区ごと＋ワイルドカード ---------- */
function standingsMLB() {
  const ut = G.user.tid; const T = uT();
  const cols = (id, wc) => [
    { k: 'r', l: wc ? 'WC' : '順位', h: x => x.rank, num: true },
    { k: 't', l: '球団', h: x => tMark(x.t.id, true) },
    { k: 'w', l: '勝', h: x => x.t.rec.w, num: true }, { k: 'l', l: '敗', h: x => x.t.rec.l, num: true },
    { k: 'p', l: '勝率', h: x => fmtAvg(pctOf(x.t.rec)), num: true },
    { k: 'gb', l: '差', h: x => wc ? (x.rank < 3 ? '+' + (-x.gb).toFixed(1) : x.rank === 3 ? '―' : x.gb.toFixed(1)) : x.rank === 1 ? '―' : x.gb.toFixed(1), num: true },
    { k: 'rs', l: '得点', h: x => x.t.rec.rs, num: true }, { k: 'ra', l: '失点', h: x => x.t.rec.ra, num: true },
    { k: 'hm', l: 'ホーム', h: x => `${x.t.rec.hw}-${x.t.rec.hl}`, num: true },
    { k: 'l10', l: '直近10', h: x => `${x.t.rec.l10.filter(v => v === 1).length}-${x.t.rec.l10.filter(v => v === 0).length}`, num: true },
    { k: 'st', l: '連続', h: x => x.t.rec.strk > 0 ? x.t.rec.strk + '連勝' : x.t.rec.strk < 0 ? (-x.t.rec.strk) + '連敗' : '' },
    { k: 'att', l: '平均観客', h: x => x.t.att && x.t.att.g ? comma(x.t.att.tot / x.t.att.g) : '―', num: true }
  ];
  const lgHtml = lg => {
    const divs = [0, 1, 2].map(d => panel(`${LEAGUES[lg]} ${LG.divs[d]}`, table('stm' + lg + d, cols('stm' + lg + d), grpStandings(lg * 3 + d), { rowCls: x => (x.t.id === ut ? 'me' : '') + (x.rank === 1 ? ' div1' : '') }), { flush: true })).join('');
    const wc = wildCard(lg);
    return divs + panel(`${LEAGUES[lg]} ワイルドカード`, table('stw' + lg, cols('stw' + lg, true), wc, { rowCls: x => (x.t.id === ut ? 'me' : '') + (x.rank === 3 ? ' wc-cut' : '') }), { flush: true });
  };
  const lgSel = +(getTab('stLg', String(T.league)));
  const vs = G.teams.filter(t => t.id !== ut && (t.league === T.league || (T.rec.vs[t.id] && T.rec.vs[t.id][0] + T.rec.vs[t.id][1] > 0))).map(t => { const v = T.rec.vs[t.id] || [0, 0, 0]; return `<tr><td>${tMark(t.id)}</td><td class="num">${v[0]}勝${v[1]}敗</td></tr>`; }).join('');
  return `<h1 class="h1">順位表</h1><p class="lead">各リーグの地区1位3球団と、それ以外で勝率の高い3球団（ワイルドカード）がポストシーズンへ。上位2シードはワイルドカードシリーズが免除され、勝ち抜いた2球団がワールドシリーズで頂点を争います。</p>
  ${G.post ? postBracket() : ''}
  <div class="row" style="margin-bottom:12px">${seg('stLgSel', [['0', LEAGUES[0]], ['1', LEAGUES[1]]], lgSel)}</div>
  <div class="stack">${lgHtml(lgSel)}
  ${panel('対戦成績（' + esc(tShort(ut)) + '）', `<table class="t compact"><tbody>${vs}</tbody></table>`)}</div>`;
}
ACT.stLgSel = el => { UI.tab.stLg = el.dataset.v; render(); };
function postBracketMLB() {
  const P = G.post; const ser = (k, lg) => P.series.filter(s => s.kind === k && (lg == null || s.lg === lg));
  const sline = s => { if (!s) return ''; const st = s.winner == null ? (s.games.length ? '進行中' : '予定') : '勝ち抜け：' + esc(tShort(s.winner)); return `<div class="lot-row ${s.winner != null && isUser(s.winner) ? 'win' : ''}"><div style="flex:1">${tMark(s.hi)} <span class="num">${s.w[0]}</span> - <span class="num">${s.w[1]}</span> ${tMark(s.lo)}</div><span class="small muted">${st}</span>${s.games.length ? s.games.map(g => g.id != null && G.boxes[g.id] ? `<button class="btn xs" data-a="box" data-id="${g.id}">${g.as}-${g.hs}</button>` : '').join('') : ''}</div>`; };
  const col = (k, n, when) => `<div><h4 style="margin:0 0 6px">${n}</h4>${[0, 1].map(lg => ser(k, lg).map(sline).join('')).join('') || `<span class="muted small">${when}</span>`}</div>`;
  const seeds = [0, 1].map(lg => `<div class="small"><b>${LEAGUES[lg]}</b>　${P.seeds[lg].map((id, i) => `${i + 1}.${esc(tShort(id))}`).join('　')}</div>`).join('');
  return panel('ポストシーズン', `${seeds}<div class="grid g4" style="margin-top:10px">
    ${col('wc', 'ワイルドカードシリーズ（3試合）', '10月第1週')}${col('ds', '地区シリーズ（5試合）', '10月第2週')}${col('lcs', 'リーグ優勝決定シリーズ（7試合）', '10月第3週')}
    <div><h4 style="margin:0 0 6px">ワールドシリーズ（7試合）</h4>${ser('ws').map(sline).join('') || '<span class="muted small">10月第4週</span>'}${P.champ != null ? `<p><b>ワールドチャンピオン：${tMark(P.champ, true)}</b>${P.mvp != null && P_(P.mvp) ? `<br><span class="small">シリーズMVP ${pLinkId(P.mvp)}</span>` : ''}</p>` : ''}</div>
  </div>`, { cls: 'hl' });
}
