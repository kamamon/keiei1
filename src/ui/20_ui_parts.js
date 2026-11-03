/* =========================================================
   選手まわりの小さな部品：サブポジション・特殊能力・逸材の印・お知らせのベル
   ========================================================= */
function subTags(p, o) {
  o = o || {};
  const l = subList(p); if (!l.length) return o.empty || '';
  return `<span class="subs">${l.map(x => `<span class="sub l${x.lv}" title="${esc(POS_JP[x.k])}：${SUB_LVN[x.lv]}">${POS_S[x.k]}${SUB_MARK[x.lv]}</span>`).join('')}</span>`;
}
/* 一覧の「位置」欄：本職＋サブ */
function posCell(p) { return isP(p) ? roleOf(p) : `${POS_S[p.pos]}${subTags(p)}`; }
function skChip(x) { return `<span class="sk ${x.cls}" title="${esc(x.d)}">${esc(x.lbl)}</span>`; }
function skChips(p, max) {
  const l = skItems(p); if (!l.length) return '<span class="faint small">なし</span>';
  const shown = max ? l.slice(0, max) : l;
  return `<span class="sks">${shown.map(skChip).join('')}${max && l.length > max ? `<span class="small faint">ほか${l.length - max}</span>` : ''}</span>`;
}
/* 一覧用：金・プラス・マイナスの数 */
function skMini(p) {
  const c = skCount(p);
  if (!c.au && !c.pos && !c.neg) return '<span class="faint">―</span>';
  return `<span class="skn" title="${esc(skItems(p).map(x => x.lbl).join('・'))}">${c.au ? `<b class="au">金${c.au}</b>` : ''}${c.pos ? `<b class="pos">${c.pos}</b>` : ''}${c.neg ? `<b class="neg">${c.neg}</b>` : ''}</span>`;
}
function skScore(p) { const c = skCount(p); return c.au * 3 + c.pos - c.neg; }
function isGen(p) { return !!(p.gen || (p.pr && p.pr.gen)); }
function genTag(p, short) { return isGen(p) ? `<span class="tag gen" title="10年に一度の逸材">${short ? '逸材' : '10年に一度の逸材'}</span>` : ''; }
/* お知らせのベル（ヘッダー） */
const BELL_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3a6 6 0 0 0-6 6v3.2c0 .9-.3 1.8-.9 2.5L4 16h16l-1.1-1.3a3.9 3.9 0 0 1-.9-2.5V9a6 6 0 0 0-6-6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.5 19a2.5 2.5 0 0 0 5 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
function bellBtn() {
  const u = unreadNotes();
  return `<button class="bell${u ? ' on' : ''}" data-a="notes" aria-label="お知らせ${u ? '（未読' + u + '件）' : ''}" title="お知らせ">${BELL_SVG}${u ? `<span class="bdg">${u > 99 ? '99+' : u}</span>` : ''}</button>`;
}
