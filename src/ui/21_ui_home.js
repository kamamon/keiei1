/* =========================================================
   タイトル・ホーム・週の進行・セーブ
   ========================================================= */
/* ---------- 保存（圧縮して localStorage へ） ---------- */
const SLOT_NAMES = { auto: 'オートセーブ', 1: 'スロット1', 2: 'スロット2', 3: 'スロット3' };
function storageOK() { try { const k = '__kyudan_t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; } }
function b64enc(buf) { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
function b64dec(str) { const s = atob(str); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
async function packStr(str) {
  if (typeof CompressionStream === 'undefined') return str;
  try { const st = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip')); return 'gz:' + b64enc(await new Response(st).arrayBuffer()); } catch (e) { return str; }
}
async function unpackStr(str) {
  if (!str.startsWith('gz:')) return str;
  const st = new Blob([b64dec(str.slice(3))]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(st).text();
}
async function saveTo(slot) {
  try {
    const data = await packStr(serialize());
    localStorage.setItem(SAVE_KEY + slot, data);
    localStorage.setItem(SAVE_KEY + slot + '_meta', JSON.stringify({ t: Date.now(), team: tName(G.user.tid), date: nowStr(), name: G.user.name, tid: G.user.tid }));
    return true;
  } catch (e) { return false; }
}
async function loadFrom(slot) {
  try { const s = localStorage.getItem(SAVE_KEY + slot); if (!s) return false; deserialize(await unpackStr(s)); return true; }
  catch (e) { console.error(e); return false; }
}
let autosaveWarned = false;
function autosave() { if (!G || G.gameOver) return; saveTo('auto').then(ok => { if (!ok && !autosaveWarned) { autosaveWarned = true; toast('ブラウザに保存できませんでした。「セーブ・設定」からファイルに書き出せます', 'bad'); } }); }
function anySave() { return ['auto', '1', '2', '3'].some(s => slotMeta(s)); }
function fmtTime(t) { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

/* ---------- タイトル ---------- */
SCREENS.title = () => {
  const s = UI.title;
  if (s.step === 1) return titleTeams();
  if (s.step === 2) return titleSetup();
  if (s.step === 3) return titleLoad();
  return `<div class="title"><div class="title-board">
    <h1>球団社長</h1>
    <p>プロ野球経営シミュレーション</p>
    <div class="lamps"><span><i class="dot b"></i>補強</span><span><i class="dot s"></i>育成</span><span><i class="dot o"></i>経営</span></div>
    <p class="small" style="opacity:.75;max-width:44ch;margin:12px auto 0">予算・街づくり・ドラフト・FA・スタッフ・球場・ファンクラブ…。架空の12球団から1つを選び、球団のすべてを動かします。</p>
  </div>
  <div class="title-actions">
    <button class="btn pri" data-a="tNew">新しく始める</button>
    ${anySave() ? '<button class="btn" data-a="tLoadMenu">続きから</button>' : ''}
    <label class="btn" style="cursor:pointer">ファイルから読み込む<input type="file" accept=".kyudan,.json,.txt" data-c="importFile" hidden></label>
  </div>
  ${storageOK() ? '' : '<p class="small warn" style="margin-top:16px;max-width:52ch;text-align:center">この表示環境ではブラウザに保存できません。遊んだ内容は「セーブ・設定」からファイルに書き出してください。</p>'}
  </div>`;
};
function titleLoad() {
  const rows = ['auto', '1', '2', '3'].map(s => { const m = slotMeta(s); return `<div class="lot-row"><div style="flex:1"><b>${SLOT_NAMES[s]}</b><div class="small muted">${m ? `${esc(m.team)}　${esc(m.date)}　（保存 ${fmtTime(m.t)}）` : '空き'}</div></div>${m ? `<button class="btn pri sm" data-a="tLoad" data-s="${s}">読み込む</button>` : ''}</div>`; }).join('');
  return `<div class="title"><div style="width:100%;max-width:640px"><h1 class="h1">続きから</h1><div class="lot">${rows}</div><div class="row" style="margin-top:16px"><button class="btn" data-a="tBack">戻る</button></div></div></div>`;
}
function titleTeams() {
  const s = UI.title;
  const cards = TEAM_DEFS.map((d, i) => {
    const T = { color: d.color, color2: d.color2, kanji: d.kanji };
    return `<button class="tcard ${s.team === i ? 'on' : ''}" style="--c:${d.color}" data-a="tPick" data-v="${i}">
      <div class="row">${emblem(T, 40)}<div><div class="nm">${d.city}${d.nick}</div><div class="small muted">${LEAGUES[d.league]}</div></div></div>
      <div class="row sp small"><span>難易度 ${stars(d.star)}</span><span class="muted">市場規模 ${'●'.repeat(d.market)}${'○'.repeat(5 - d.market)}</span></div>
      <div class="small muted">${d.stadium}（${comma(d.cap)}人・${d.dome ? 'ドーム' : '屋外'}）</div>
      <div class="small muted">親会社：${d.parent}　資金 ${fmtOku(d.cash)}</div>
    </button>`;
  }).join('');
  return `<div class="main" style="max-width:1200px;margin:0 auto"><h1 class="h1">球団を選ぶ</h1><p class="lead">難易度が低いほど資金と人気があり、戦力も整っています。地方の小さな球団を強くするのも醍醐味です。</p>
    <div class="teamgrid">${cards}</div>
    <div class="row" style="margin-top:18px"><button class="btn" data-a="tBack">戻る</button><button class="btn pri" data-a="tNext" ${s.team == null ? 'disabled' : ''}>この球団で始める</button></div></div>`;
}
function titleSetup() {
  const s = UI.title; const d = TEAM_DEFS[s.team];
  const pol = Object.entries(POLICIES).map(([k, p]) => `<label class="lot-row" style="cursor:pointer"><input type="radio" name="pol" value="${k}" ${s.policy === k ? 'checked' : ''} data-c="tPol"><div><b>${p.n}</b><div class="small muted">${p.d}</div></div></label>`).join('');
  return `<div class="main" style="max-width:760px;margin:0 auto"><h1 class="h1">${d.city}${d.nick}の球団社長に就任</h1><p class="lead">オーナーからの期待：「${ownerHope({ star: d.star })}」</p>
    <div class="stack">
    ${panel('あなたの名前', `<input class="inp" style="width:100%" maxlength="16" placeholder="球団社長" value="${esc(s.name)}" data-i="tName">`)}
    ${panel('球団の愛称（変更できます）', `<div class="row"><span>${d.city}</span><input class="inp" style="flex:1" maxlength="12" placeholder="${d.nick}" value="${esc(s.nick)}" data-i="tNick"></div><p class="small muted" style="margin:6px 0 0">空欄なら「${d.nick}」のままです。</p>`)}
    ${panel('球団方針', `<div class="lot">${pol}</div><p class="small muted" style="margin:8px 0 0">方針は毎年1月に見直せます。</p>`)}
    </div>
    <div class="row" style="margin-top:18px"><button class="btn" data-a="tBack">戻る</button><button class="btn pri" data-a="tStart">シーズンを始める</button></div></div>`;
}
ACT.tNew = () => { UI.title.step = 1; UI.resetScroll = true; render(); };
ACT.tLoadMenu = () => { UI.title.step = 3; render(); };
ACT.tBack = () => { UI.title.step = Math.max(0, UI.title.step === 3 ? 0 : UI.title.step - 1); render(); };
ACT.tPick = el => { UI.title.team = +el.dataset.v; render(); };
ACT.tNext = () => { if (UI.title.team == null) return; UI.title.step = 2; UI.resetScroll = true; render(); };
ACT.tName = el => { UI.title.name = el.value; };
ACT.tNick = el => { UI.title.nick = el.value; };
ACT.tPol = el => { UI.title.policy = el.value; };
ACT.tStart = () => {
  const s = UI.title;
  newGame({ team: s.team, name: s.name.trim() || '球団社長', nick: s.nick.trim() || null, policy: s.policy });
  try { G.user.theme = localStorage.getItem('kyudan_theme') || 'night'; } catch (e) { }
  UI.screen = 'home'; UI.resetScroll = true; UI.title = { step: 0, team: null, name: '', nick: '', policy: 'balance' };
  render(); openModal('welcome'); autosave();
};
ACT.tLoad = async el => {
  const ok = await loadFrom(el.dataset.s);
  if (!ok) { toast('読み込めませんでした', 'bad'); return; }
  UI.screen = 'home'; UI.resetScroll = true; UI.title.step = 0; render(); toast('読み込みました：' + nowStr(), 'good');
};
ACT.importFile = el => {
  const f = el.files && el.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = async () => {
    try { deserialize(await unpackStr(String(rd.result).trim())); UI.screen = 'home'; UI.resetScroll = true; UI.title.step = 0; closeAllModals(); render(); toast('ファイルから読み込みました', 'good'); }
    catch (e) { console.error(e); toast('このファイルは読み込めません', 'bad'); }
  };
  rd.readAsText(f);
};
MODALS.welcome = () => {
  const T = uT();
  return { title: `${esc(G.user.name)}社長、ようこそ`, size: 'narrow', body: `<p>${esc(tName(T.id))}の球団社長に就任しました。チームを強くし、ファンを増やし、球団を黒字にするのがあなたの仕事です。</p>
    <ol class="small" style="padding-left:1.2em;margin:10px 0">
      <li>ホームの「やること」から、予算・中期計画・キャンプを決めます。</li>
      <li>右上の<b>「次の週へ」</b>で1週間ずつ進みます。▾ からまとめて進めることもできます。</li>
      <li>3月末に開幕。ドラフトは10月、FAは11月、契約更改は12月です。</li>
      <li>年末にオーナーが1年を評価します。信頼がなくなると解任です。</li>
    </ol><p class="small muted">進行は毎週ブラウザに自動保存されます。</p>`,
    foot: '<button class="btn pri" data-a="closeModal">はじめる</button>' };
};

/* ---------- 週を進める ---------- */
ACT.next = () => doNext();
function doNext() {
  if (UI.busy) return;
  if (G.gameOver) { openModal('gameover'); render(); return; }
  const b = blockingTasks();
  if (b.length) { openModal('blocked', { tasks: b }); render(); return; }
  const rep = advanceWeek();
  afterAdvance(rep, false);
}
function afterAdvance(rep, quiet) {
  autosave();
  closeAllModals();
  if (G.gameOver) openModal('gameover');
  else {
    const T = uT();
    if (G.post && G.post.champ === T.id && G.flags.celGs !== G.year) { G.flags.celGs = G.year; openModal('cele', { k: 'gs' }); }
    else if (G.post && curTurn() === 36 && G.post.lgChamp && G.post.lgChamp.includes(T.id) && G.flags.celLg !== G.year) { G.flags.celLg = G.year; openModal('cele', { k: 'lg' }); }
    if (curTurn() === 0 && G.owner.review && !G.owner.review.seen) openModal('review');
    if (!quiet && rep && G.user.showWeekly && (rep.games.length || rep.exh || rep.news.length)) openModal('weekly');
    if (G.pending.length) openModal('event', { i: 0 });
    if (curTurn() === 39 && G.draft && G.draft.stage !== 'done') toast('ドラフト会議が始まります。「ドラフト会議」画面へ', 'good');
  }
  render();
}
MODALS.blocked = ({ tasks }) => ({
  title: '先に済ませることがあります', size: 'narrow',
  body: `<ul class="tasks">${tasks.map(t => `<li>${esc(t.t)}</li>`).join('')}</ul><p class="small muted">自動で処理すると、スカウトの評価が高い順に指名します。</p>`,
  foot: `<button class="btn" data-a="go" data-v="draft">ドラフト会議へ</button><button class="btn pri" data-a="autoBlock">自動で処理して進む</button>`
});
ACT.autoBlock = () => { autoResolveBlocking(); closeModal(); doNext(); };
ACT.nextMenu = () => { openModal('nextMenu'); render(); };
MODALS.nextMenu = () => ({
  title: 'まとめて進める', size: 'narrow',
  body: `<div class="lot">
    <button class="btn" data-a="ahead" data-m="4">4週間進める</button>
    <button class="btn" data-a="ahead" data-m="event">次の行事・判断まで進める</button>
    <button class="btn" data-a="ahead" data-m="season">${curTurn() < MAKEUP_TURN ? '公式戦の終わりまで進める' : '年末まで進める'}</button>
  </div><p class="small muted" style="margin-top:10px">ドラフト会議や判断が必要な出来事があると、そこで止まります。</p>`
});
let aheadStop = false;
ACT.stopAhead = () => { aheadStop = true; };
ACT.ahead = el => {
  const m = el.dataset.m; closeAllModals(); renderModalRoot();
  const startT = curTurn(), startY = G.year; let n = 0; const ut = G.user.tid; const r0 = { w: uT().rec.w, l: uT().rec.l };
  const keyTurns = [0, 4, 11, 36, 39, 40, 44];
  aheadStop = false; UI.busy = true; render();
  const step = () => {
    let stop = aheadStop || G.gameOver || blockingTasks().length > 0;
    if (!stop && n > 0) {
      const t = curTurn();
      if (m === '4' && n >= 4) stop = true;
      if (m === 'event' && (G.pending.length || keyTurns.includes(t) || (G.compPending && G.compPending.length))) stop = true;
      if (m === 'season' && ((startT < MAKEUP_TURN && t >= 36) || (startT >= MAKEUP_TURN && t === 0) || G.year > startY + 1)) stop = true;
      if (n >= 60) stop = true;
    }
    if (stop) {
      UI.busy = null; busyHide();
      const R = uT().rec;
      const msg = `${n}週進めました` + (R.w + R.l > r0.w + r0.l ? `（${R.w - r0.w}勝${R.l - r0.l}敗）` : '');
      afterAdvance(G.weekly, true); toast(msg, 'good');
      return;
    }
    advanceWeek(); n++;
    busyShow(phaseLabel() + (curTurn() >= SEASON_START && curTurn() <= MAKEUP_TURN ? `　${uT().rec.w}勝${uT().rec.l}敗` : ''));
    setTimeout(step, 0);
  };
  busyShow('');
  setTimeout(step, 30);
};
MODALS.weekly = () => {
  const r = G.weekly; if (!r) return null;
  const ut = G.user.tid; const T = uT();
  let body = '';
  const games = r.games.map(id => G.boxes[id]).filter(Boolean);
  if (games.length) {
    body += `<div class="row sp" style="margin-bottom:8px"><div><span class="stat-big">${r.w}勝${r.l}敗${r.d ? r.d + '分' : ''}</span> <span class="muted">今週</span></div><div class="muted">${G.post && curTurn() >= 36 ? '' : `${LEAGUES[T.league]} ${teamRank(ut)}位　${T.rec.w}勝${T.rec.l}敗${T.rec.d ? T.rec.d + '分' : ''}`}</div></div>`;
    body += `<div class="panel">${games.map(miniGame).join('')}</div>`;
  }
  if (r.exh) body += panel('オープン戦', r.exh.map(x => `<div class="row sp small"><span>${x.home ? 'vs' : '@'} ${tMark(x.opp)}</span><span class="num">${x.my}-${x.op} ${x.my > x.op ? '<span class="pos">勝</span>' : x.my < x.op ? '<span class="neg">敗</span>' : '分'}</span></div>`).join(''));
  if (r.rev != null) body += `<div class="row" style="margin:12px 0;gap:22px"><span class="small muted">今週の収入 ${money(r.rev)}</span><span class="small muted">支出 ${money(r.exp)}</span><span class="small">資金 ${signed(r.cash)}</span></div>`;
  if (r.news.length) body += `<ul class="news">${r.news.map(newsLi).join('')}</ul>`;
  if (!body) return null;
  return { title: r.date + 'のまとめ', body, foot: `<label class="chk small muted" style="margin-right:auto"><input type="checkbox" data-c="toggleWeekly" ${G.user.showWeekly ? 'checked' : ''}>毎週このまとめを表示する</label><button class="btn pri" data-a="closeModal">閉じる</button>` };
};
ACT.toggleWeekly = el => { G.user.showWeekly = el.checked; };
function miniGame(b) {
  const ut = G.user.tid; const home = b.h === ut; const my = home ? b.hs : b.as, op = home ? b.as : b.hs; const opp = home ? b.a : b.h;
  const wl = my > op ? 'w' : my < op ? 'l' : 'd';
  return `<div class="mini-ls" data-a="box" data-id="${b.id}"><span class="wl ${wl}">${wl === 'w' ? '勝' : wl === 'l' ? '敗' : '分'}</span>
    <div><div>${home ? 'vs' : '@'} ${tMark(opp)} ${b.post ? '<span class="tag lamp">ポストシーズン</span>' : ''}</div><div class="small muted">${esc(b.date)}${b.day ? '(' + b.day + ')' : ''}${b.att ? '　観客 ' + comma(b.att) + '人' : ''}${b.W && P_(b.W) ? '　勝 ' + esc(lastName(P_(b.W))) : ''}${b.SV && P_(b.SV) ? '　S ' + esc(lastName(P_(b.SV))) : ''}</div></div>
    <span class="score">${my} - ${op}</span></div>`;
}
function newsLi(n) { return `<li class="${n.imp ? 'imp' : ''}"><span class="d">${n.y}/${n.m}月${n.w}週</span><span class="tx"><span class="ty">${NEWS_TYPES[n.type] || ''}</span>${esc(n.t)}</span></li>`; }

/* ---------- 出来事（選択肢） ---------- */
MODALS.event = ({ i }) => {
  const e = G.pending[i || 0]; if (!e) return null;
  const def = EVENTS[e.id];
  return { title: esc(def.t), size: 'narrow', body: `<p>${esc(def.text(e.data))}</p><div class="lot">${def.ch.map((c, ci) => `<button class="btn" style="justify-content:space-between;text-align:left;white-space:normal" data-a="evChoose" data-i="${i || 0}" data-c="${ci}"><b>${esc(c.l)}</b><span class="small muted">${esc(c.d)}</span></button>`).join('')}</div><p class="small faint" style="margin-top:10px">決めずに閉じると、3週後に一番下の選択肢で自動的に処理されます。</p>`,
    foot: '<button class="btn" data-a="closeModal">あとで決める</button>' };
};
ACT.evChoose = el => { const msg = resolveEvent(+el.dataset.i, +el.dataset.c); closeModal(); if (msg) toast(msg); if (G.pending.length && !UI.modal) openModal('event', { i: 0 }); render(); };
ACT.openEvent = () => { if (G.pending.length) openModal('event', { i: 0 }); render(); };

/* ---------- 年次評価・ゲームオーバー ---------- */
MODALS.review = () => {
  const r = G.owner.review; if (!r) return null; r.seen = true;
  const T = uT(); const h = G.fin.hist[G.fin.hist.length - 1];
  return { title: `${r.y}年 オーナー評価`, size: 'narrow', body: `<div class="row sp"><div><div class="small muted">オーナーの信頼</div><div class="stat-big ${r.d >= 0 ? 'pos' : 'neg'}">${Math.round(r.trust)} <span class="small">（${r.d >= 0 ? '+' : ''}${Math.round(r.d)}）</span></div></div><div class="right small muted">${h ? `営業収支 ${fmtSigned(h.op != null ? h.op : h.net)}<br>観客 ${fmtPeople(h.att)}` : ''}</div></div>
    <table class="t compact" style="margin-top:10px"><tbody>${r.notes.map(n => `<tr><td>${esc(n[0])}</td><td class="num ${n[1] >= 0 ? 'pos' : 'neg'}">${n[1] >= 0 ? '+' : ''}${n[1]}</td></tr>`).join('')}</tbody></table>
    ${r.subsidy ? `<p class="small">親会社が赤字のうち${fmtOku(r.subsidy)}を補填しました。</p>` : ''}${r.capex ? `<p class="small muted">設備投資 ${fmtOku(r.capex)} は営業収支の評価に含めていません。</p>` : ''}${r.tax ? `<p class="small muted">法人税等 ${fmtOku(r.tax)} を納めました。</p>` : ''}
    <p class="small muted">新しい年が始まりました。予算・中期計画・キャンプを確認しましょう。</p>`,
    foot: '<button class="btn" data-a="go" data-v="plan">中長期計画へ</button><button class="btn pri" data-a="closeModal">閉じる</button>' };
};
MODALS.gameover = () => ({ title: '球団社長を解任されました', size: 'narrow', body: `<p>${esc(G.gameOver.why)}。</p><p class="muted">在任：${START_YEAR}年〜${G.gameOver.y}年</p>`,
  foot: '<button class="btn" data-a="go" data-v="records">球団史を見る</button><button class="btn pri" data-a="toTitle">タイトルへ</button>' });
ACT.toTitle = () => { closeAllModals(); UI.screen = 'title'; UI.title.step = 0; G = null; render(); };

/* ---------- ホーム ---------- */
SCREENS.home = () => {
  const T = uT(); const ut = T.id; const t = curTurn(); const R = T.rec;
  const tasks = userTasks();
  const taskHtml = tasks.length ? `<ul class="tasks">${tasks.map(x => `<li><span>${x.urgent ? '<span class="dot o"></span> ' : '<span class="dot s"></span> '}${esc(x.t)}</span><button class="btn sm" data-a="${x.go === 'event' ? 'openEvent' : 'go'}" data-v="${x.go}">開く</button></li>`).join('')}</ul>` : '<div class="empty">いま急ぎの用事はありません。「次の週へ」で進めましょう。</div>';
  const recent = G.boxOrder.slice(-6).reverse().map(id => G.boxes[id]).filter(Boolean);
  const recentHtml = recent.length ? recent.map(miniGame).join('') : `<div class="empty">${t < SEASON_START ? `開幕は3月第4週です（あと${SEASON_START - t}週）` : 'まだ試合がありません'}</div>`;
  const st = standings(T.league);
  const stHtml = table('home-st', [
    { k: 'r', l: '', h: x => x.rank, num: true },
    { k: 't', l: '球団', h: x => tMark(x.t.id) },
    { k: 'w', l: '勝', h: x => x.t.rec.w, num: true }, { k: 'l', l: '敗', h: x => x.t.rec.l, num: true }, { k: 'd', l: '分', h: x => x.t.rec.d, num: true },
    { k: 'p', l: '勝率', h: x => fmtAvg(pctOf(x.t.rec)), num: true }, { k: 'g', l: '差', h: x => x.rank === 1 ? '―' : x.gb.toFixed(1), num: true }
  ], st, { rowCls: x => x.t.id === ut ? 'me' : '', compact: true });
  const pw = teamPower(ut);
  const F = G.fin; const ytdNet = opNet();
  const week = thisWeekGames();
  const leaders = homeLeaders();
  return `<h1 class="h1">${phaseLabel()}</h1><p class="lead">${homeLead()}</p>
  <div class="grid g-home">
    <div class="stack">
      ${panel('やること', taskHtml, { flush: true })}
      ${week ? panel('今週の日程', week, { flush: true }) : ''}
      ${panel('直近の試合', recentHtml, { flush: true, act: '<button class="btn sm" data-a="go" data-v="schedule">日程・結果</button>' })}
      ${panel('ニュース', `<ul class="news">${G.news.slice(0, 10).map(newsLi).join('')}</ul>`, { flush: true, act: '<button class="btn sm" data-a="go" data-v="news">すべて</button>' })}
    </div>
    <div class="stack">
      ${panel(LEAGUES[T.league] + ' 順位', stHtml, { flush: true, act: '<button class="btn sm" data-a="go" data-v="standings">順位表</button>' })}
      ${panel('チーム状況', `<dl class="kv">
        <dt>得点 / 失点</dt><dd>${R.rs} / ${R.ra}（${R.rs - R.ra >= 0 ? '+' : ''}${R.rs - R.ra}）</dd>
        <dt>連勝・連敗</dt><dd>${R.strk > 0 ? R.strk + '連勝' : R.strk < 0 ? (-R.strk) + '連敗' : '―'}</dd>
        <dt>直近10試合</dt><dd>${R.l10.filter(x => x === 1).length}勝${R.l10.filter(x => x === 0).length}敗</dd>
        <dt>1軍の故障者</dt><dd>${rosterLv(ut, 1).filter(p => p.injW > 0).length + roster(ut).filter(p => p.injW > 0 && p.lv !== 1).length}人</dd></dl>
        <div class="stack" style="margin-top:10px">${[['打撃力', pw.bat], ['先発', pw.sp], ['救援', pw.rp], ['守備力', pw.def]].map(([k, v]) => `<div class="row" style="gap:10px"><span class="small" style="width:52px">${k}</span><div style="flex:1">${bar(v, 100, 'team')}</div>${gr(v)}</div>`).join('')}</div>`)}
      ${panel('経営', `<dl class="kv">
        <dt>資金</dt><dd>${money(F.cash)}</dd><dt>今年の営業収支</dt><dd>${signed(ytdNet)}</dd>
        <dt>観客動員（平均）</dt><dd>${F.att.g ? comma(F.att.tot / F.att.g) + '人' : '―'}</dd><dt>ファンクラブ</dt><dd>${fmtPeople(Math.round(G.fc.members))}</dd>
        <dt>人気</dt><dd>${Math.round(T.pop)}</dd><dt>ファン人口</dt><dd>${Math.round(T.fans)}万人</dd></dl>
        <div style="margin-top:10px"><div class="row sp small"><span>オーナーの信頼</span><span class="num">${Math.round(G.owner.trust)}</span></div>${bar(G.owner.trust, 100, G.owner.trust >= 50 ? 'ball' : G.owner.trust >= 25 ? 'strike' : 'out')}</div>`,
        { act: '<button class="btn sm" data-a="go" data-v="finance">財務</button>' })}
      ${leaders ? panel('チームの成績上位', leaders) : ''}
    </div>
  </div>`;
};
function homeLead() {
  const t = curTurn();
  if (t <= 3) return '新しいシーズンの準備期間です。予算、中期計画、春季キャンプを決めましょう。';
  if (t <= 7) return 'キャンプで選手を鍛えています。オープン戦は3月から。';
  if (t <= 10) return 'オープン戦で開幕に向けた最終調整中。1軍の顔ぶれとオーダーを確認しましょう。';
  if (t <= MAKEUP_TURN) return '毎週6試合を戦います。故障者の入れ替えや補強（7月末まで）も考えましょう。';
  if (t <= 38) return '上位3球団によるプレーオフと、日本一を決めるグランドシリーズの期間です。';
  if (t === 39) return 'ドラフト会議の週です。指名する選手を決めましょう。';
  if (t <= 43) return '戦力外通告、FA、秋季キャンプの時期です。来季に向けた編成を進めましょう。';
  return '契約更改の季節です。12月第4週までに全選手と合意しましょう。';
}
function thisWeekGames() {
  const t = curTurn(); if (t < SEASON_START || t > SEASON_END) return '';
  const ut = G.user.tid; const w = t - SEASON_START; const out = [];
  for (let i = 0; i < 6; i++) { const d = w * 6 + i; const day = G.sched.days[d]; if (!day) continue; const g = day.find(x => x.h === ut || x.a === ut); if (g) out.push(`<div class="row sp" style="padding:6px 14px;border-bottom:1px solid var(--line)"><span class="small muted">${DOW[d % 6]}</span><span style="flex:1;margin-left:10px">${g.h === ut ? 'vs' : '@'} ${tMark(g.h === ut ? g.a : g.h)}</span><span class="small muted">${g.h === ut ? esc(stadiumName()) : esc(stadiumNameOf(g.h))}</span></div>`); }
  return out.join('');
}
function homeLeaders() {
  const ut = G.user.tid; const ps = roster(ut);
  if (!ps.some(p => isP(p) ? p.st.outs > 0 : p.st.pa > 0)) return '';
  const bats = ps.filter(p => !isP(p) && p.st.pa >= 30).sort((a, b) => bOps(b.st) - bOps(a.st)).slice(0, 3);
  const pits = ps.filter(p => isP(p) && p.st.outs >= 30).sort((a, b) => war(b) - war(a)).slice(0, 3);
  return `<table class="t compact"><tbody>${bats.map(p => `<tr><td>${pLink(p)}</td><td class="num">${fmtAvg(bAvg(p.st))}</td><td class="num">${p.st.hr}本</td><td class="num">${p.st.rbi}点</td></tr>`).join('')}${pits.map(p => `<tr><td>${pLink(p)}</td><td class="num">防${fmtEra(pEra(p.st))}</td><td class="num">${p.st.w}勝${p.st.l}敗</td><td class="num">${p.st.sv ? p.st.sv + 'S' : p.st.hld ? p.st.hld + 'H' : p.st.so + 'K'}</td></tr>`).join('')}</tbody></table>`;
}

MODALS.cele = ({ k }) => {
  const T = uT(); const gs = k === 'gs'; const y = gs ? G.year : G.year;
  const R = T.rec; const s = gs ? G.post.series.find(x => x.kind === 'gs') : null;
  const mvp = gs && G.post.mvp != null ? P_(G.post.mvp) : null;
  return { title: gs ? '日本一！' : 'リーグ優勝！', size: 'narrow',
    body: `<div class="title-board" style="padding:26px 18px;box-shadow:none">${emblem(T, 84)}<h1 style="font-size:46px;margin-top:10px">${gs ? '日本一' : '優勝'}</h1><p>${esc(tName(T.id))}　${y}年${gs ? '' : '　' + LEAGUES[T.league]}</p>
      <p class="small">${gs && s ? `グランドシリーズ ${s.winner === s.hi ? s.w[0] + '勝' + s.w[1] + '敗' : s.w[1] + '勝' + s.w[0] + '敗'}` : `${R.w}勝${R.l}敗${R.d ? R.d + '分' : ''}`}${mvp ? '　シリーズMVP ' + esc(mvp.name) : ''}</p></div>
      <p class="small muted" style="margin-top:12px">${gs ? '優勝記念グッズが飛ぶように売れています。オーナーもきっと喜んでいるはずです。' : 'このあとプレーオフで日本一を目指します。'}</p>`,
    foot: '<button class="btn pri" data-a="closeModal">閉じる</button>' };
};
