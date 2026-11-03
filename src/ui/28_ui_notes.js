/* =========================================================
   お知らせ：ベル・一覧・週のまとめ・トースト・ブラウザの通知
   ========================================================= */
function noteLi(n, fresh) {
  const p = n.pid != null ? findPlayer(n.pid) : null;
  const isNew = fresh ? fresh.includes(n.id) : !n.rd;
  return `<li class="note${isNew ? ' new' : ''}${n.pr === 'hi' ? ' hi' : ''}">
    <span class="d">${n.y}/${n.m}月${n.w}週</span>
    <span class="tx"><span class="ty">${NEWS_TYPES[n.type] || 'お知らせ'}</span>${esc(n.t)}</span>
    <span class="acts">${p ? `<button class="btn xs" data-a="player" data-id="${p.id}">選手</button>` : ''}${n.go && SCREENS[n.go] ? `<button class="btn xs" data-a="noteGo" data-v="${n.go}"${n.tab ? ` data-tab="${n.tab}"` : ''}>開く</button>` : ''}</span></li>`;
}
function notesList(list, fresh) { return list.length ? `<ul class="notes">${list.map(n => noteLi(n, fresh)).join('')}</ul>` : '<div class="empty">お知らせはありません。工事の完了・選手の成長や故障・契約の変化などがここに届きます。</div>'; }
ACT.notes = () => {
  const fresh = (G.notes || []).filter(n => !n.rd).map(n => n.id);
  markNotesRead();
  openModal('notes', { fresh });
  render();
};
ACT.noteGo = el => { closeAllModals(); go(el.dataset.v, el.dataset.tab); };
ACT.notesAll = () => go('notes');
/* fresh：開いた時点で未読だったもの。since：まとめて進めた間に届いたものだけを見せる */
MODALS.notes = ({ fresh, since, n }) => {
  const all = G.notes || [];
  const list = since != null ? all.filter(x => x.id > since) : all.slice(0, 40);
  const title = since != null ? `${n ? n + '週の間の' : ''}お知らせ ${list.length}件` : 'お知らせ';
  return { title, body: notesList(list, fresh || []),
    foot: `<button class="btn" data-a="notesAll">すべてのお知らせ</button><button class="btn" data-a="go" data-v="system">通知の設定</button><button class="btn pri" data-a="closeModal">閉じる</button>` };
};
SCREENS.notes = () => {
  const f = getTab('notesF', 'all');
  const all = G.notes || [];
  const list = f === 'hi' ? all.filter(n => n.pr === 'hi') : f === 'all' ? all : all.filter(n => n.type === f);
  const types = [...new Set(all.map(n => n.type))];
  const fresh = UI.notesFresh || [];
  return `<h1 class="h1">お知らせ</h1><p class="lead">工事や練習が終わった、選手が成長した・故障した、契約が決まった・切れたなど、自球団にかかわる「完了」と「変化」をまとめています。直近${NOTE_MAX}件まで残ります。</p>
  <div class="row" style="margin-bottom:12px">${seg('notesF', [['all', 'すべて'], ['hi', '大事なもの']].concat(types.map(t => [t, NEWS_TYPES[t] || t])), f)}</div>
  ${panel('', notesList(list, fresh), { flush: true })}`;
};
ACT.notesF = el => { UI.tab.notesF = el.dataset.v; render(); };
ON_GO.notes = () => { UI.notesFresh = (G.notes || []).filter(n => !n.rd).map(n => n.id); markNotesRead(); };

/* 画面の下に短く出す（大事なものを優先して2件まで） */
function toastNotes(list) {
  if (!list.length || !G.user.noteToast) return;
  const s = list.slice().sort((a, b) => (b.pr === 'hi') - (a.pr === 'hi'));
  for (const n of s.slice(0, 2)) toast(n.t, n.pr === 'hi' ? 'good' : '');
  if (list.length > 2) toast(`ほかにお知らせが${list.length - 2}件あります（右上のベル）`);
}
/* 別のタブを見ているときは、ブラウザの通知で知らせる（設定で許可したとき） */
function osNotify(list) {
  try {
    if (!G.user.osNote || typeof Notification === 'undefined' || Notification.permission !== 'granted' || !document.hidden) return;
    const hi = list.filter(n => n.pr === 'hi');
    if (!hi.length) return;
    const body = hi.length === 1 ? hi[0].t : `${hi[0].t}　ほか${hi.length - 1}件`;
    new Notification(`球団社長：${tName(G.user.tid)}`, { body, tag: 'kyudan-' + hi[0].id });
  } catch (e) { }
}
function osNoteState() {
  if (typeof Notification === 'undefined') return 'この環境では使えません';
  return Notification.permission === 'granted' ? '許可されています' : Notification.permission === 'denied' ? 'ブラウザでブロックされています（ブラウザの設定から許可できます）' : 'まだ許可していません';
}
ACT.osNote = el => {
  const on = el.checked;
  if (!on) { G.user.osNote = false; render(); return; }
  try {
    if (typeof Notification === 'undefined') { el.checked = false; toast('このブラウザでは通知を使えません', 'bad'); return; }
    if (Notification.permission === 'granted') { G.user.osNote = true; toast('ブラウザの通知を使います', 'good'); render(); return; }
    Notification.requestPermission().then(r => { G.user.osNote = r === 'granted'; toast(r === 'granted' ? 'ブラウザの通知を使います' : '通知が許可されませんでした', r === 'granted' ? 'good' : 'bad'); render(); });
  } catch (e) { el.checked = false; toast('通知を設定できませんでした', 'bad'); }
};
ACT.noteTest = () => {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') { new Notification('球団社長', { body: 'お知らせのテストです。大事なお知らせはこのように届きます。' }); return; }
  } catch (e) { }
  toast('お知らせのテストです。ブラウザの通知を使うには、上のチェックを入れて許可してください');
};
