/* =========================================================
   場面の画像（Canva で生成し img/ に置いたもの）
   画像がまだない場面は、場面ごとの色だけで表示する
   ========================================================= */
const ART = {
  title: { alt: '満員のナイター', tone: 'night' },
  camp: { alt: '春季キャンプの練習風景', tone: 'sun' },
  season: { alt: 'ナイターの試合', tone: 'night', or: ['title'] },
  post: { alt: 'ポストシーズンの夜', tone: 'gold', or: ['season', 'title'] },
  draft: { alt: 'ドラフト会議の会場', tone: 'navy' },
  off: { alt: '冬の球場', tone: 'ice' },
  champ: { alt: '優勝の瞬間', tone: 'gold', or: ['post'] },
  office: { alt: '球場を見下ろす社長室', tone: 'dusk' },
  stadium: { alt: '本拠地の球場', tone: 'dusk' },
  dome: { alt: 'ドーム球場', tone: 'night', or: ['stadium'] },
  town1: { alt: '静かな球場前の通り', tone: 'dusk' },
  town2: { alt: '店が並ぶ球場通り', tone: 'dusk', or: ['town1'] },
  town3: { alt: 'にぎわうボールパークの街', tone: 'gold', or: ['town2', 'town1'] },
  town4: { alt: '観光客でにぎわう夜のボールパークシティ', tone: 'night', or: ['town3', 'town2'] },
  ev_matsuri: { alt: '夏祭り', tone: 'dusk' },
  ev_hanabi: { alt: '球場の上の花火', tone: 'night' },
  ev_gourmet: { alt: 'グルメフェス', tone: 'sun' },
  ev_music: { alt: '音楽フェス', tone: 'night' },
  ev_xmas: { alt: 'イルミネーション', tone: 'ice' }
};
/* その場面の画像がなければ、近い場面の画像を使う（or） */
/* 場面の絵：イラスト（コードで描く）か、写真（Canva で作ったもの。ない場面はイラスト） */
function artMode() { try { if (G && G.user && G.user.artMode) return G.user.artMode; return localStorage.getItem('kyudan_art') || 'il'; } catch (e) { return 'il'; } }
function artSrc(k) {
  if (typeof ART_FILES === 'undefined') return '';
  if (ART_FILES[k]) return ART_FILES[k];
  for (const o of ((ART[k] && ART[k].or) || [])) if (ART_FILES[o]) return ART_FILES[o];
  return '';
}
function hasArt(k) { return !!(typeof IL_SCENES !== 'undefined' && IL_SCENES[k]) || !!artSrc(k); }
function artPhoto(k) { return artMode() === 'photo' ? artSrc(k) : ''; }
/* 場面の画像。o.h＝高さのクラス（banner／cut／thumb）、o.title・o.sub＝画像の上に重ねる文字 */
function art(k, o) {
  o = o || {}; const a = ART[k] || { alt: '', tone: 'night' }; const src = artPhoto(k); const il = src ? '' : ilScene(k);
  const tt = o.h1 ? 'h1' : 'span';
  const txt = o.title || o.sub ? `<figcaption>${o.kicker ? `<span class="k">${o.kicker}</span>` : ''}${o.title ? `<${tt} class="t">${o.title}</${tt}>` : ''}${o.sub ? `<span class="s">${o.sub}</span>` : ''}</figcaption>` : '';
  const media = src ? `<img src="${src}" alt="${esc(a.alt)}" decoding="async"${o.eager ? '' : ' loading="lazy"'} onerror="this.parentNode.classList.remove('has');this.remove()">` : il ? `<div class="ilw" role="img" aria-label="${esc(a.alt)}">${il}</div>` : '';
  return `<figure class="art ${o.h || 'banner'} tone-${a.tone}${media ? ' has' : ''} ${o.cls || ''}">${media}${txt}</figure>`;
}
/* いまの時期の場面 */
function phaseArt(t) {
  t = t === undefined ? curTurn() : t;
  if (t >= 4 && t <= 10) return 'camp';
  if (t >= 11 && t <= MAKEUP_TURN) return 'season';
  if (t >= 36 && t <= 38) return 'post';
  if (t === 39) return 'draft';
  return 'off';
}
/* 街の段階（10段階）→ 4枚の絵 */
function townArt(i) { return i <= 3 ? 'town1' : i <= 5 ? 'town2' : i <= 7 ? 'town3' : 'town4'; }
