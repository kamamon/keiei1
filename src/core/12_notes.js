/* =========================================================
   お知らせ（何かが完了した・変わったときの通知）
   G.notes = [{ id, y, m, w, type, t, pr: 'hi'|'lo', go, tab, pid, rd }]
   ニュースのうち、自球団にかかわる「完了・変化」をここにも残す
   ========================================================= */
const NOTE_GO = { injury: 'roster', dev: 'training', camp: 'camp', draft: 'draft', fa: 'fa', mlb: 'fa', trade: 'trade', contract: 'contracts', retire: 'records', biz: 'finance',
  town: 'town', staff: 'staff', owner: 'plan', event: 'home', record: 'stats', award: 'stats', post: 'standings', league: 'standings', game: 'schedule' };
const NOTE_MAX = 150;
function pushNote(n) {
  G.notes = G.notes || [];
  n.id = G.noteSeq = (G.noteSeq || 0) + 1;
  n.y = G.year; n.m = G.month; n.w = G.week; n.rd = 0;
  G.notes.unshift(n);
  if (G.notes.length > NOTE_MAX) G.notes.length = NOTE_MAX;
  return n;
}
/* 自球団あてのお知らせ（ニュースにも残る） */
function notify(type, text, o) { addNews(type, text, Object.assign({ tid: G.user.tid, note: true }, o || {})); }
function unreadNotes() { let n = 0; for (const x of G.notes || []) if (!x.rd) n++; return n; }
function notesSince(id) { return (G.notes || []).filter(x => x.id > id); }
function markNotesRead(ids) { for (const x of G.notes || []) if (!ids || ids.includes(x.id)) x.rd = 1; }

/* 時期ごとの「そろそろ」のお知らせ（週が変わった直後に呼ぶ） */
function noteReminders(t) {
  const ut = G.user.tid;
  if (t === 27) notify('league', '今週が7月最終週です。トレードと新しい選手の登録はこの週まで', { go: 'trade' });
  if (t === 33) { const mk = G.prospects.filter(p => p.pr && p.pr.mark).length; notify('draft', `ドラフト会議まであと6週です。指名候補（★）は${mk}人`, { go: 'scout' }); }
  if (t === 46) { const n = renewalList().length; if (n) notify('contract', `契約更改の締切は来週（12月第4週）です。まだ${n}人と合意していません`, { go: 'contracts', note: 'hi' }); }
  if (t === 40) { const mine = G.faMarket.filter(f => f.from === ut).length; notify('fa', `FA市場が開きました。${G.faMarket.length}人が権利を行使${mine ? `（うち自球団から${mine}人）` : ''}`, { go: 'fa', note: mine ? 'hi' : true }); }
}
