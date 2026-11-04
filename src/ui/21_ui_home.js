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
    localStorage.setItem(SAVE_KEY + slot + '_meta', JSON.stringify({ t: Date.now(), team: tName(G.user.tid), date: nowStr(), name: G.user.name, tid: G.user.tid, mode: LG.mode }));
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
  if (s.step === 4) return titleCustom();
  const tp = artPhoto('title'), ti = tp ? '' : ilScene('title');
  return `<div class="title${tp ? ' art-bg' : ti ? ' art-il' : ''}"${tp ? ` style="--art:url('${tp}')"` : ''}>${ti ? `<div class="title-il">${ti}</div>` : ''}<div class="title-board">
    <h1>球団社長</h1>
    <p>${LG.sub}</p>
    <div class="lamps"><span><i class="dot b"></i>補強</span><span><i class="dot s"></i>育成</span><span><i class="dot o"></i>経営</span></div>
    <div class="lgpick" role="group" aria-label="リーグを選ぶ">${[['npb', '日本のプロ野球', '12<wbr>球団・143<wbr>試合'], ['mlb', 'メジャーリーグ', '30<wbr>球団・162<wbr>試合']].map(([k, n, d]) => `<button class="${LG.mode === k ? 'on' : ''}" data-a="tMode" data-v="${k}" aria-pressed="${LG.mode === k}"><b>${n}</b><span>${d}</span></button>`).join('')}</div>
    <p class="small" style="opacity:.75;max-width:46ch;margin:12px auto 0">${LG.mlb ? '162試合・地区制・12球団のポストシーズン。年俸調停、保有6年でFA、ぜいたく税、7月のドラフト。架空の30球団から1つを選び、球団のすべてを動かします。' : '予算・街づくり・ドラフト・FA・スタッフ・球場・ファンクラブ…。架空の12球団から1つを選び、球団のすべてを動かします。'}</p>
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
  const rows = ['auto', '1', '2', '3'].map(s => { const m = slotMeta(s); return `<div class="lot-row"><div style="flex:1"><b>${SLOT_NAMES[s]}</b><div class="small muted">${m ? `${m.mode === 'mlb' ? '<span class="tag">メジャー</span> ' : ''}${esc(m.team)}　${esc(m.date)}　（保存 ${fmtTime(m.t)}）` : '空き'}</div></div>${m ? `<button class="btn pri sm" data-a="tLoad" data-s="${s}">読み込む</button>` : ''}</div>`; }).join('');
  return `<div class="title"><div style="width:100%;max-width:640px"><h1 class="h1">続きから</h1><div class="lot">${rows}</div><div class="row" style="margin-top:16px"><button class="btn" data-a="tBack">戻る</button></div></div></div>`;
}
function titleTeams() {
  const s = UI.title;
  const card = (d, i) => {
    const T = { color: d.color, color2: d.color2, kanji: d.kanji };
    return `<button class="tcard ${s.team === i ? 'on' : ''}" style="--c:${d.color}" data-a="tPick" data-v="${i}">
      <div class="row">${emblem(T, 40)}<div><div class="nm">${d.city}${LG.mlb ? '・' : ''}${d.nick}</div>${LG.mlb ? '' : `<div class="small muted">${LEAGUES[d.league]}</div>`}</div></div>
      <div class="row sp small"><span>難易度 ${stars(d.star)}</span><span class="muted">市場規模 ${'●'.repeat(d.market)}${'○'.repeat(5 - d.market)}</span></div>
      <div class="small muted">${d.stadium}（${comma(d.cap)}人・${d.dome ? 'ドーム' : '屋外'}）</div>
      <div class="small muted">${LG.mlb ? 'オーナー' : '親会社'}：${d.parent}　資金 ${fmtOku(d.cash)}</div>
    </button>`;
  };
  const cards = LG.mlb ? '' : TEAM_DEFS.map(card).join('');
  const groups = LG.mlb ? [0, 1].map(lg => `<h2 class="tg-h">${LEAGUES[lg]}</h2>` + [0, 1, 2].map(dv => `<h3 class="tg-d">${LG.divs[dv]}</h3><div class="teamgrid t5">${TEAM_DEFS.map((d, i) => d.league === lg && d.div === dv ? card(d, i) : '').join('')}</div>`).join('')).join('') : '';
  return `<div class="main" style="max-width:1200px;margin:0 auto"><h1 class="h1">球団を選ぶ</h1><p class="lead">難易度が低いほど資金と人気があり、戦力も整っています。地方の小さな球団を強くするのも醍醐味です。</p>
    ${groups}<div class="teamgrid">${cards}<button class="tcard custom" data-a="tCustom"><div class="nm">カスタムスタート</div><div class="small muted">球団名・色・球場・資金・戦力・街の状態・オーナーの厳しさまで、自分で決めて始めます。${s.team != null ? `<br>選んでいる「${esc(TEAM_DEFS[s.team].city + TEAM_DEFS[s.team].nick)}」をひな形にします。` : ''}</div></button></div>
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
ACT.tBack = () => { const st = UI.title.step; UI.title.step = st === 3 ? 0 : st === 4 ? 1 : Math.max(0, st - 1); UI.resetScroll = true; render(); };
ACT.tPick = el => { UI.title.team = +el.dataset.v; render(); };
ACT.tNext = () => { if (UI.title.team == null) return; UI.title.step = 2; UI.resetScroll = true; render(); };
ACT.tName = el => { UI.title.name = el.value; };
ACT.tNick = el => { UI.title.nick = el.value; };
ACT.tPol = el => { UI.title.policy = el.value; };
ACT.tStart = () => {
  const s = UI.title;
  newGame({ team: s.team, name: s.name.trim() || '球団社長', nick: s.nick.trim() || null, policy: s.policy, mode: LG.mode });
  try { G.user.theme = localStorage.getItem('kyudan_theme') || 'night'; } catch (e) { }
  UI.screen = 'home'; UI.resetScroll = true; UI.title = { step: 0, team: null, name: '', nick: '', policy: 'balance', mode: LG.mode };
  render(); openModal('welcome'); autosave();
};
ACT.tMode = el => { setLeague(el.dataset.v); UI.title.mode = LG.mode; UI.title.team = null; UI.title.c = null; try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { } render(); };
/* ---------- カスタムスタート ---------- */
const CS_NICKS = [['グリフォンズ', '鷲'], ['ペガサス', '翼'], ['コメッツ', '彗'], ['オーシャンズ', '海'], ['ボルケーノズ', '炎'], ['ミーティアーズ', '星'],
  ['アルバトロス', '翔'], ['ブリザーズ', '雪'], ['サンライズ', '旭'], ['クラウンズ', '冠'], ['フォレスターズ', '森'], ['トルネーズ', '嵐']];
const CS_COLORS = [['#0F5BA7', '#F2C230'], ['#1E7B4A', '#F4EBD0'], ['#B3122E', '#1B1B1B'], ['#F07F1A', '#20304F'], ['#5B2C83', '#E8C35A'],
  ['#14A3C7', '#FFFFFF'], ['#2B2B2B', '#D4A017'], ['#C2185B', '#FCE4EC'], ['#00897B', '#FFD54F'], ['#8D1C1C', '#E9D8A6']];
const CS_CASH = [50000, 100000, 200000, 350000, 500000, 1000000];
function csFrom(i) {
  const d = TEAM_DEFS[i];
  return { base: i, city: d.city, nick: d.nick, kanji: d.kanji, color: d.color, color2: d.color2, parent: d.parent, region: d.region,
    stadium: d.stadium, cap: d.cap, dome: d.dome, owned: false, fac: d.fac, cash: d.cash, market: d.market, pop: d.pop,
    str: 'n', ai: 'n', town: 'normal', land: 'normal', owner: 'normal', year: START_YEAR };
}
function csNorm(c) {
  const t = v => String(v || '').trim();
  const nick = t(c.nick), kanji = t(c.kanji) || nick.slice(0, 1) || '球';
  return Object.assign({}, c, { city: t(c.city), nick, kanji: Array.from(kanji)[0], parent: t(c.parent) || t(c.city) + 'ホールディングス', stadium: t(c.stadium) || t(c.city) + 'スタジアム',
    cap: clamp(Math.round(+c.cap || 30000), 15000, 55000), pop: clamp(Math.round(+c.pop || 50), 20, 90), market: clamp(+c.market || 3, 1, 5), fac: clamp(+c.fac || 2, 1, 5), cash: Math.max(0, +c.cash || 0),
    region: clamp(+c.region || 0, 0, REGIONS.length - 1), year: clamp(Math.round(+c.year || START_YEAR), 1950, 2200) });
}
function csRandomize(c) {
  const rp = a => a[Math.floor(Math.random() * a.length)];
  c.region = Math.floor(Math.random() * REGIONS.length);
  c.city = rp(PLACES[c.region]);
  const [nk, kj] = rp(CS_NICKS); c.nick = nk; c.kanji = kj;
  const [c1, c2] = rp(CS_COLORS); c.color = c1; c.color2 = c2;
  c.parent = c.city + (LG.mlb ? rp(['・スポーツ', '・キャピタル', '・グループ', '・ホールディングス', '・パートナーズ']) : rp(['電鉄', 'フーズ', 'ガス', '信用金庫', '通信', '観光', 'ホールディングス', '製菓']));
  c.stadium = c.dome ? c.city + (LG.mlb ? '・ドーム' : 'ドーム') : c.city + (LG.mlb ? rp(['・ボールパーク', '・フィールド', '・パーク']) : rp(['スタジアム', 'ボールパーク', '市民球場', 'フィールド']));
}
function csPlate(c) {
  const n = csNorm(c); const T = { color: n.color, color2: n.color2, kanji: n.kanji };
  const b = TEAM_DEFS[n.base]; const st = customStars(n);
  return `<div class="cs-plate" style="--c:${n.color};--c2:${n.color2}">${emblem(T, 84)}<div class="nm">${esc(n.city || '（都市名）')}${LG.mlb ? '・' : ''}${esc(n.nick || '（愛称）')}</div>
    <div class="sub">${LEAGUES[b.league]}${LG.mlb ? ' ' + LG.divs[b.div] : ''}　${esc(n.stadium)}</div></div>
    <div class="panel"><div class="panel-b"><dl class="kv">
      <dt>難易度の目安</dt><dd>${stars(st)}</dd>
      <dt>本拠地</dt><dd>${comma(n.cap)}人・${n.dome ? 'ドーム' : '屋外'}・${n.owned ? '自前' : '借りる'}</dd>
      <dt>資金</dt><dd>${fmtOku(n.cash)}</dd>
      <dt>戦力</dt><dd>${CUSTOM_STR[n.str].n}／他球団 ${CUSTOM_AI[n.ai].n}</dd>
      <dt>街</dt><dd>${CUSTOM_TOWN[n.town].n}・土地${CUSTOM_LAND[n.land].n}</dd>
      <dt>オーナー</dt><dd>${CUSTOM_OWNER[n.owner].n}</dd>
      <dt>開始</dt><dd>${n.year}年</dd>
    </dl><p class="small" style="margin:10px 0 0">オーナーの期待：「${ownerHope({ star: st })}」</p></div></div>`;
}
function csRefresh() { const el = document.getElementById('csSide'); if (el) el.innerHTML = csPlate(UI.title.c); }
function titleCustom() {
  const s = UI.title; const c = s.c || (s.c = csFrom(s.team != null ? s.team : 7));
  const f = (label, html, note) => `<div class="cf"><div class="cf-l">${label}</div><div class="cf-v">${html}${note ? `<div class="note">${note}</div>` : ''}</div></div>`;
  const txt = (k, max, w) => `<input class="inp" ${w ? `style="flex:0 0 ${w}"` : ''} maxlength="${max}" value="${esc(c[k])}" data-i="csTxt" data-k="${k}" aria-label="${k}">`;
  const sg = (k, opts) => seg('csSet', opts, typeof c[k] === 'boolean' ? (c[k] ? 1 : 0) : c[k], `data-k="${k}"`);
  const rng = (k, min, max, step, fmt) => `<input type="range" min="${min}" max="${max}" step="${step}" value="${c[k]}" data-i="csNum" data-k="${k}" aria-label="${k}"><output data-out="${k}">${fmt(c[k])}</output>`;
  const pol = Object.entries(POLICIES).map(([k, p]) => `<label class="lot-row" style="cursor:pointer"><input type="radio" name="pol" value="${k}" ${s.policy === k ? 'checked' : ''} data-c="tPol"><div><b>${p.n}</b><div class="small muted">${p.d}</div></div></label>`).join('');
  const objOpts = o => Object.entries(o).map(([k, v]) => [k, v.n]);
  return `<div class="main" style="max-width:1120px;margin:0 auto"><h1 class="h1">カスタムスタート</h1>
    <p class="lead">選んだ球団の枠（リーグと日程）を使って、自分だけの球団を立ち上げます。決めた内容はプレートにすぐ反映されます。</p>
    <div class="cs"><div class="stack">
    ${panel('球団', f('ひな形', `<select class="inp" data-c="csBase">${TEAM_DEFS.map((d, i) => opt(i, `${d.city}${LG.mlb ? '・' : ''}${d.nick}（${LEAGUES[d.league]}${LG.mlb ? ' ' + LG.divs[d.div] : ''}）`, c.base)).join('')}</select>`, 'この球団の枠を置き換えます。選び直すと名前や球場などの設定を読み込み直します。') +
      f('都市名', txt('city', 8)) + f('愛称', txt('nick', 12)) + f('マークの文字', txt('kanji', 2, '4.5em'), '漢字1文字がおすすめです') +
      f('チームカラー', `<input type="color" value="${esc(c.color)}" data-i="csTxt" data-k="color" aria-label="メインカラー"><span class="small muted">メイン</span><input type="color" value="${esc(c.color2)}" data-i="csTxt" data-k="color2" aria-label="サブカラー"><span class="small muted">サブ</span>`) +
      f('親会社', txt('parent', 20)) +
      f('本拠地の地域', `<select class="inp" data-c="csSel" data-k="region">${REGIONS.map((r, i) => opt(i, r, c.region)).join('')}</select>`, '地元出身の有望株やスカウトの担当地域に関わります'),
      { act: '<button class="btn sm" data-a="csRandom">名前と色をおまかせ</button>' })}
    ${panel('球場', f('球場名', txt('stadium', 20)) + f('収容人数', rng('cap', 15000, 55000, 1000, v => comma(v) + '人')) +
      f('屋根', sg('dome', [[0, '屋外'], [1, 'ドーム']]), 'ドームは雨天中止がなく、使用料が高めです') +
      f('持ち主', sg('owned', [[0, '借りる'], [1, '自前で保有']]), '自前なら使用料がかからず、維持費がかかります') +
      f('設備の水準', sg('fac', [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']]), '球場とトレーニング施設の最初のレベル'))}
    ${panel('お金と人気', f('資金', sg('cash', CS_CASH.map(v => [v, fmtOku(v).replace('円', '')]))) +
      f('市場規模', sg('market', [[1, '1 小'], [2, '2'], [3, '3'], [4, '4'], [5, '5 大']]), '都市の大きさ。観客・スポンサー・放映権の土台になります') +
      f('人気', rng('pop', 20, 90, 1, v => v)))}
    ${panel('戦力', f('自分の球団', sg('str', objOpts(CUSTOM_STR))) + f('ほかの11球団', sg('ai', objOpts(CUSTOM_AI))))}
    ${panel('街', f('球場の周り', sg('town', objOpts(CUSTOM_TOWN)), CUSTOM_TOWN[c.town].d) + f('最初の土地', sg('land', objOpts(CUSTOM_LAND)), CUSTOM_LAND[c.land].d))}
    ${panel('ルール', f('オーナー', sg('owner', objOpts(CUSTOM_OWNER)), CUSTOM_OWNER[c.owner].d) +
      f('開始年', `<input class="inp num" type="number" min="1950" max="2200" style="flex:0 0 7em" value="${c.year}" data-c="csYear" aria-label="開始年"><span class="small muted">年</span>`))}
    ${panel('あなた', f('名前', `<input class="inp" maxlength="16" placeholder="球団社長" value="${esc(s.name)}" data-i="tName" aria-label="あなたの名前">`) + `<div class="lot" style="margin-top:10px">${pol}</div>`)}
    <div class="row"><button class="btn" data-a="tBack">戻る</button><button class="btn pri" data-a="csStart">この球団で始める</button></div>
    </div><aside class="cs-side" id="csSide">${csPlate(c)}</aside></div></div>`;
}
ACT.tCustom = () => { const s = UI.title; if (!s.c || (s.team != null && s.c.base !== s.team)) s.c = csFrom(s.team != null ? s.team : 7); s.step = 4; UI.resetScroll = true; render(); };
ACT.csBase = el => { const o = UI.title.c; UI.title.c = Object.assign(csFrom(+el.value), { str: o.str, ai: o.ai, town: o.town, land: o.land, owner: o.owner, year: o.year }); UI.title.team = +el.value; render(); };
ACT.csTxt = el => { UI.title.c[el.dataset.k] = el.value; csRefresh(); };
ACT.csNum = el => { const k = el.dataset.k; UI.title.c[k] = +el.value; const o = document.querySelector(`output[data-out="${k}"]`); if (o) o.textContent = k === 'cap' ? comma(+el.value) + '人' : el.value; csRefresh(); };
ACT.csSel = el => { UI.title.c[el.dataset.k] = +el.value; render(); };
ACT.csSet = el => {
  const k = el.dataset.k; let v = el.dataset.v;
  if (k === 'dome' || k === 'owned') v = v === '1'; else if (k === 'fac' || k === 'cash' || k === 'market') v = +v;
  UI.title.c[k] = v; render();
};
ACT.csYear = el => { UI.title.c.year = clamp(Math.round(+el.value || START_YEAR), 1950, 2200); render(); };
ACT.csRandom = () => { csRandomize(UI.title.c); render(); };
ACT.csStart = () => {
  const s = UI.title; const c = csNorm(s.c);
  if (!c.city || !c.nick) { toast('都市名と愛称を入れてください', 'bad'); return; }
  newGame({ team: c.base, name: s.name.trim() || '球団社長', policy: s.policy, custom: c, mode: LG.mode });
  try { G.user.theme = localStorage.getItem('kyudan_theme') || 'night'; } catch (e) { }
  UI.screen = 'home'; UI.resetScroll = true; UI.title = { step: 0, team: null, name: '', nick: '', policy: 'balance', mode: LG.mode };
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
  return { title: `${esc(G.user.name)}社長、ようこそ`, size: 'narrow', body: `${art('office', { h: 'cut', kicker: `${G.year}年1月`, title: `${esc(tName(T.id))}の球団社長に就任`, eager: true })}<p>${esc(tName(T.id))}の球団社長に就任しました。チームを強くし、ファンを増やし、球団を黒字にするのがあなたの仕事です。</p>
    <ol class="small" style="padding-left:1.2em;margin:10px 0">
      <li>ホームの「やること」から、予算・中期計画・キャンプを決めます。</li>
      <li>右上の<b>「次の週へ」</b>で1週間ずつ進みます。▾ からまとめて進めることもできます。</li>
      <li>${LG.mlb ? '3月末に開幕して162試合。ドラフトは7月、ポストシーズンは10月、FAは11月、年俸調停は12月です。' : '3月末に開幕。ドラフトは10月、FAは11月、契約更改は12月です。'}</li>
      <li>年末にオーナーが1年を評価します。信頼がなくなると解任です。</li>
      <li>右上のベルには、工事の完了や選手の成長・故障など、何かが完了したり変わったりしたときのお知らせが届きます。</li>
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
function afterAdvance(rep, quiet, since, weeks) {
  const cq = (G.celeQ || []).splice(0);
  autosave();
  closeAllModals();
  const fresh = notesSince(since != null ? since : rep ? rep.note0 || 0 : G.noteSeq);
  if (G.gameOver) openModal('gameover');
  else {
    const T = uT();
    if (G.post && G.post.champ === T.id && G.flags.celGs !== G.year) { G.flags.celGs = G.year; openModal('cele', { k: 'gs' }); }
    else if (G.post && curTurn() === (LG.mlb ? 39 : 36) && G.post.lgChamp && G.post.lgChamp.includes(T.id) && G.flags.celLg !== G.year) { G.flags.celLg = G.year; openModal('cele', { k: 'lg' }); }
    else if (LG.mlb && G.post && curTurn() === 36 && G.post.divChamp && G.post.divChamp.includes(T.id) && G.flags.celDiv !== G.year) { G.flags.celDiv = G.year; openModal('cele', { k: 'div' }); }
    if (curTurn() === 0 && G.owner.review && !G.owner.review.seen) openModal('review');
    if (curTurn() === SEASON_START && G.flags.openY !== G.year) { G.flags.openY = G.year; openModal('scene', { k: 'open' }); }
    if (curTurn() === LG.draftT && G.flags.draftY !== G.year) { G.flags.draftY = G.year; openModal('scene', { k: 'draft' }); }
    const sl = (G.town.stageLog || []); if (sl.length && (G.flags.stageSeen || 0) < sl.length) { G.flags.stageSeen = sl.length; openModal('scene', { k: 'stage' }); }
    for (const it of cq.slice(quiet ? -2 : -4)) openModal('cele2', it);
    const weekly = !quiet && rep && G.user.showWeekly && (rep.games.length || rep.exh || rep.news.length || fresh.length);
    if (weekly) { openModal('weekly'); markNotesRead(fresh.map(n => n.id)); }
    else if (!quiet) toastNotes(fresh);
    if (quiet && fresh.length) { openModal('notes', { since, n: weeks, fresh: fresh.map(n => n.id) }); markNotesRead(fresh.map(n => n.id)); }
    if (G.pending.length) openModal('event', { i: 0 });
    osNotify(fresh);

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
  </div><p class="small muted" style="margin-top:10px">ドラフト会議や判断が必要な出来事があると、そこで止まります。${G.user.noteStop ? '「4週間」「次の行事」では、大事なお知らせ（工事の完了や長期の故障など）でも止まります。' : ''}進めた間のお知らせは、終わったあとにまとめて表示します。</p>`
});
let aheadStop = false;
ACT.stopAhead = () => { aheadStop = true; };
ACT.ahead = el => {
  const m = el.dataset.m; closeAllModals(); renderModalRoot();
  const startT = curTurn(), startY = G.year; let n = 0; const ut = G.user.tid; const r0 = { w: uT().rec.w, l: uT().rec.l }; const seq0 = G.noteSeq || 0;
  const keyTurns = LG.mlb ? [0, 4, 11, LG.draftT, 36, 40, 44] : [0, 4, 11, 36, 39, 40, 44];
  aheadStop = false; UI.busy = true; render();
  const step = () => {
    let stop = aheadStop || G.gameOver || blockingTasks().length > 0;
    if (!stop && n > 0) {
      const t = curTurn();
      if (m === '4' && n >= 4) stop = true;
      if (m === 'event' && (G.pending.length || keyTurns.includes(t) || (G.compPending && G.compPending.length))) stop = true;
      if (m === 'season' && ((startT < MAKEUP_TURN && t >= 36) || (startT >= MAKEUP_TURN && t === 0) || G.year > startY + 1)) stop = true;
      if (m !== 'season' && G.user.noteStop && notesSince(seq0).some(x => x.pr === 'hi')) stop = true;
      if (n >= 60) stop = true;
    }
    if (stop) {
      UI.busy = null; busyHide();
      const R = uT().rec;
      const msg = `${n}週進めました` + (R.w + R.l > r0.w + r0.l ? `（${R.w - r0.w}勝${R.l - r0.l}敗）` : '');
      afterAdvance(G.weekly, true, seq0, n); toast(msg, 'good');
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
  const ns = (r.notes || []).map(id => (G.notes || []).find(n => n.id === id)).filter(Boolean);
  if (ns.length) body += panel(`お知らせ ${ns.length}件`, notesList(ns, ns.map(n => n.id)), { flush: true, cls: 'hl' }) + '<div style="height:12px"></div>';
  if (games.length) {
    body += `<div class="row sp" style="margin-bottom:8px"><div><span class="stat-big">${r.w}勝${r.l}敗${r.d ? r.d + '分' : ''}</span> <span class="muted">今週</span></div><div class="muted">${G.post && curTurn() >= 36 ? '' : `${grpName(grpOf(T))} ${teamRank(ut)}位　${T.rec.w}勝${T.rec.l}敗${T.rec.d ? T.rec.d + '分' : ''}`}</div></div>`;
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
  return { title: esc(def.t), size: 'narrow', body: `<p>${esc(def.text(e.data))}</p><div class="lot">${def.ch.map((c, ci) => `<button class="btn" style="justify-content:space-between;text-align:left;white-space:normal" data-a="evChoose" data-i="${i || 0}" data-c="${ci}"><b>${esc(c.l)}</b><span class="small muted">${esc(typeof c.d === 'function' ? c.d(e.data) : c.d)}</span></button>`).join('')}</div><p class="small faint" style="margin-top:10px">決めずに閉じると、3週後に一番下の選択肢で自動的に処理されます。</p>`,
    foot: '<button class="btn" data-a="closeModal">あとで決める</button>' };
};
ACT.evChoose = el => { const msg = resolveEvent(+el.dataset.i, +el.dataset.c); closeModal(); if (msg) toast(msg); if (G.pending.length && !UI.modal) openModal('event', { i: 0 }); render(); };
ACT.openEvent = () => { if (G.pending.length) openModal('event', { i: 0 }); render(); };

/* ---------- 年次評価・ゲームオーバー ---------- */
MODALS.review = () => {
  const r = G.owner.review; if (!r) return null; r.seen = true;
  const T = uT(); const h = G.fin.hist[G.fin.hist.length - 1];
  return { title: `${r.y}年 オーナー評価`, size: 'narrow', body: `${art('office', { h: 'cut', kicker: `${r.y}年 年度末`, title: 'オーナー会議', eager: true })}<div class="row sp"><div><div class="small muted">オーナーの信頼</div><div class="stat-big ${r.d >= 0 ? 'pos' : 'neg'}">${Math.round(r.trust)} <span class="small">（${r.d >= 0 ? '+' : ''}${Math.round(r.d)}）</span></div></div><div class="right small muted">${h ? `営業収支 ${fmtSigned(h.op != null ? h.op : h.net)}<br>観客 ${fmtPeople(h.att)}` : ''}</div></div>
    <table class="t compact" style="margin-top:10px"><tbody>${r.notes.map(n => `<tr><td>${esc(n[0])}</td><td class="num ${n[1] >= 0 ? 'pos' : 'neg'}">${n[1] >= 0 ? '+' : ''}${n[1]}</td></tr>`).join('')}</tbody></table>
    ${r.subsidy ? `<p class="small">親会社が赤字のうち${fmtOku(r.subsidy)}を補填しました。</p>` : ''}${r.capex ? `<p class="small muted">設備投資 ${fmtOku(r.capex)} は営業収支の評価に含めていません。</p>` : ''}${r.tax ? `<p class="small muted">法人税等 ${fmtOku(r.tax)} を納めました。</p>` : ''}
    <p class="small muted">新しい年が始まりました。予算・中期計画・キャンプを確認しましょう。</p>`,
    foot: '<button class="btn" data-a="go" data-v="plan">中長期計画へ</button><button class="btn pri" data-a="closeModal">閉じる</button>' };
};
MODALS.gameover = () => ({ title: '球団社長を解任されました', size: 'narrow', body: `${art('off', { h: 'cut', eager: true })}<p>${esc(G.gameOver.why)}。</p><p class="muted">在任：${G.startYear || START_YEAR}年〜${G.gameOver.y}年</p>`,
  foot: '<button class="btn" data-a="go" data-v="records">球団史を見る</button><button class="btn pri" data-a="toTitle">タイトルへ</button>' });
ACT.toTitle = () => { closeAllModals(); UI.screen = 'title'; UI.title.step = 0; G = null; render(); };

/* ---------- ホーム ---------- */
SCREENS.home = () => {
  const T = uT(); const ut = T.id; const t = curTurn(); const R = T.rec;
  const tasks = userTasks();
  const taskHtml = tasks.length ? `<ul class="tasks">${tasks.map(x => `<li><span>${x.urgent ? '<span class="dot o"></span> ' : '<span class="dot s"></span> '}${esc(x.t)}</span><button class="btn sm" data-a="${x.go === 'event' ? 'openEvent' : 'go'}" data-v="${x.go}" ${x.tab ? `data-tab="${x.tab}"` : ''}>開く</button></li>`).join('')}</ul>` : '<div class="empty">いま急ぎの用事はありません。「次の週へ」で進めましょう。</div>';
  const recent = G.boxOrder.slice(-6).reverse().map(id => G.boxes[id]).filter(Boolean);
  const recentHtml = recent.length ? recent.map(miniGame).join('') : `<div class="empty">${t < SEASON_START ? `開幕は3月第4週です（あと${SEASON_START - t}週）` : 'まだ試合がありません'}</div>`;
  const st = grpTable(grpOf(T));
  const stHtml = table('home-st', [
    { k: 'r', l: '', h: x => x.rank, num: true },
    { k: 't', l: '球団', h: x => tMark(x.t.id) },
    { k: 'w', l: '勝', h: x => x.t.rec.w, num: true }, { k: 'l', l: '敗', h: x => x.t.rec.l, num: true }].concat(LG.mlb ? [] : [{ k: 'd', l: '分', h: x => x.t.rec.d, num: true }], [
    { k: 'p', l: '勝率', h: x => fmtAvg(pctOf(x.t.rec)), num: true }, { k: 'g', l: '差', h: x => x.rank === 1 ? '―' : x.gb.toFixed(1), num: true }
  ]), st, { rowCls: x => x.t.id === ut ? 'me' : '', compact: true });
  const wcHtml = LG.mlb && t >= SEASON_START && t <= MAKEUP_TURN ? wcMini(T.league) : '';
  const pw = teamPower(ut);
  const F = G.fin; const ytdNet = opNet();
  const week = thisWeekGames();
  const leaders = homeLeaders();
  return `${art(phaseArt(t), { h1: true, kicker: `${G.year}年 ${G.month}月 第${G.week}週`, title: phaseLabel(), sub: homeLead(), eager: true })}
  <div class="grid g-home">
    <div class="stack">
      ${panel('やること', taskHtml, { flush: true })}
      ${week ? panel('今週の日程', week, { flush: true }) : ''}
      ${panel('直近の試合', recentHtml, { flush: true, act: '<button class="btn sm" data-a="go" data-v="schedule">日程・結果</button>' })}
      ${panel('ニュース', `<ul class="news">${G.news.slice(0, 10).map(newsLi).join('')}</ul>`, { flush: true, act: '<button class="btn sm" data-a="go" data-v="news">すべて</button>' })}
    </div>
    <div class="stack">
      ${panel(grpName(grpOf(T)) + ' 順位', stHtml, { flush: true, act: '<button class="btn sm" data-a="go" data-v="standings">順位表</button>' })}
      ${wcHtml ? panel('ワイルドカード争い', wcHtml, { flush: true }) : ''}
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
      ${recWatchHtml()}
    </div>
  </div>`;
};
/* 注目の記録：大台・連続試合安打・シーズン記録に迫る自球団の選手 */
function recWatchHtml() {
  if (!G.recs) return '';
  const t = curTurn(); const ut = G.user.tid; const items = [];
  for (const p of roster(ut)) {
    const c = careerOf(p);
    for (const k in MILESTONES) {
      if (!!MS_BAT[k] === isP(p)) continue;
      const m = MILESTONES[k].find(x => x >= MS_BIG[k] && !(p.ms && p.ms[k + x])); if (!m) continue;
      const need = m - (c[k] || 0); if (need > 0 && need <= MS_NEAR[k] * 4) items.push({ s: need / MS_NEAR[k], h: `${pLink(p)} 通算${m}${MS_NAME[k]}まで<b>あと${need}${MS_UNIT[k]}</b>` });
    }
    if (t >= SEASON_START && t <= MAKEUP_TURN) {
      if ((p.hstr || 0) >= 10) items.push({ s: 2 - p.hstr / 20, h: `${pLink(p)} <b>${p.hstr}試合連続安打</b>中（リーグ記録${recFmt('hstr', G.recs.lg.hstr.v)}）` });
      for (const k of ['hr', 'h', 'sb', 'so', 'sv']) {
        const d = REC_DEFS[k]; if ((!!d.bat) === isP(p)) continue; const r = G.recs.lg[k]; const v = d.f(p.st);
        if (r && r.pid !== p.id && v >= r.v * 0.8 && v > 0) items.push({ s: (r.v - v) / Math.max(1, r.v * 0.1), h: `${pLink(p)} ${d.n} <b>${recFmt(k, v)}</b>（リーグ記録${recFmt(k, r.v)}）` });
      }
    }
  }
  if (!items.length) return '';
  items.sort((a, b) => a.s - b.s);
  return panel('注目の記録', `<ul class="watch">${items.slice(0, 5).map(x => `<li>${x.h}</li>`).join('')}</ul>`, { act: '<button class="btn sm" data-a="go" data-v="records" data-tab="recs">記録</button>' });
}
function homeLead() {
  const t = curTurn();
  if (LG.mlb) {
    if (t <= 3) return '新しいシーズンの準備期間です。予算、中期計画、スプリングトレーニングを決めましょう。';
    if (t <= 7) return 'スプリングトレーニングで選手を鍛えています。オープン戦は3月から。';
    if (t <= 10) return 'オープン戦で開幕に向けた最終調整中。26人のメジャー登録とオーダーを確認しましょう。';
    if (t === LG.draftT) return 'オールスターとドラフトの週です。指名する選手を決めましょう。';
    if (t <= MAKEUP_TURN) return '毎週6〜7試合を戦います。トレードの期限は7月末。地区優勝かワイルドカードで、ポストシーズンを目指しましょう。';
    if (t <= 39) return '12球団によるポストシーズン。ワールドシリーズで頂点を争います。';
    if (t <= 43) return 'FA市場が開いています。保有6年を過ぎた選手はみなFAです。来季に向けた編成を進めましょう。';
    return '契約の季節です。年俸調停の選手と12月第4週までに合意しましょう。合意できなければ調停の公聴会で決まります。';
  }
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
  const ut = G.user.tid; const w = t - SEASON_START; const out = []; const n = LG.dpw || 6;
  for (let i = 0; i < n; i++) { const d = w * n + i; const day = G.sched.days[d]; if (!day) continue; const g = day.find(x => x.h === ut || x.a === ut); if (g) out.push(`<div class="row sp" style="padding:6px 14px;border-bottom:1px solid var(--line)"><span class="small muted">${DOW[d % DOW.length]}</span><span style="flex:1;margin-left:10px">${g.h === ut ? 'vs' : '@'} ${tMark(g.h === ut ? g.a : g.h)}</span><span class="small muted">${g.h === ut ? esc(stadiumName()) : esc(stadiumNameOf(g.h))}</span></div>`); }
  return out.join('');
}
function homeLeaders() {
  const ut = G.user.tid; const ps = roster(ut);
  if (!ps.some(p => isP(p) ? p.st.outs > 0 : p.st.pa > 0)) return '';
  const bats = ps.filter(p => !isP(p) && p.st.pa >= 30).sort((a, b) => bOps(b.st) - bOps(a.st)).slice(0, 3);
  const pits = ps.filter(p => isP(p) && p.st.outs >= 30).sort((a, b) => war(b) - war(a)).slice(0, 3);
  return `<table class="t compact"><tbody>${bats.map(p => `<tr><td>${pLink(p)}</td><td class="num">${fmtAvg(bAvg(p.st))}</td><td class="num">${p.st.hr}本</td><td class="num">${p.st.rbi}点</td></tr>`).join('')}${pits.map(p => `<tr><td>${pLink(p)}</td><td class="num">防${fmtEra(pEra(p.st))}</td><td class="num">${p.st.w}勝${p.st.l}敗</td><td class="num">${p.st.sv ? p.st.sv + 'S' : p.st.hld ? p.st.hld + 'H' : p.st.so + 'K'}</td></tr>`).join('')}</tbody></table>`;
}

/* 大きな節目のカットイン */
MODALS.scene = ({ k }) => {
  const T = uT();
  if (k === 'open') return { title: '開幕', size: 'narrow', body: `${art('season', { h: 'cut', kicker: `${G.year}年 3月`, title: LG.mlb ? 'レギュラーシーズン開幕' : 'ペナントレース開幕', sub: `${esc(tName(T.id))}の${G.year}年シーズンが始まります`, eager: true })}<p>${LG.mlb ? '162試合の戦いが始まります。毎週6〜7試合。地区優勝か、ワイルドカード3枠でポストシーズンへ。トレードの期限は7月末です。' : '143試合の戦いが始まります。毎週6試合。故障者の入れ替えと、7月末までの補強を忘れずに。'}</p><p class="small muted">去年の順位：${rankStr(T.lastRank)}　オーナーの期待：${LG.mlb ? '地区' : ''}${expectedRank()}位前後</p>`,
    foot: '<button class="btn" data-a="closeModal">閉じる</button><button class="btn pri" data-a="go" data-v="lineup">オーダーを確認する</button>' };
  if (k === 'draft') return { title: 'ドラフト会議', size: 'narrow', body: LG.mlb ? `${art('draft', { h: 'cut', kicker: `${G.year}年 7月`, title: 'ドラフト', sub: `指名順は前の年の成績の逆順（上位6つは抽選）。${LG.draftRounds}巡目まで`, eager: true })}<p>スカウトが追いかけてきた高校・大学の有望株を指名する日です。指名した選手はすぐマイナー契約で入団します。</p>` : `${art('draft', { h: 'cut', kicker: `${G.year}年 10月`, title: '運命のドラフト会議', sub: '1位は12球団が一斉に入札。重なれば抽選です', eager: true })}<p>スカウトが追いかけてきた有望株を指名する日です。</p>`,
    foot: '<button class="btn" data-a="closeModal">あとで</button><button class="btn pri" data-a="go" data-v="draft">ドラフト会議へ</button>' };
  if (k === 'stage') { const s = townStage(); const L = G.town.stageLog[G.town.stageLog.length - 1]; const n = TOWN_STAGES[L.i - 1][1];
    return { title: '街が発展しました', size: 'narrow', body: `${art(townArt(L.i), { h: 'cut', kicker: `街の段階 ${L.i}／${TOWN_STAGES.length}`, title: n, eager: true })}<p>球場のまわりが「${n}」になりました。地域の愛着と人気が少し上がっています。</p>${s.next != null ? `<p class="small muted">次の「${s.nextN}」まで、いつもの賑わいがあと${Math.max(1, s.next - Math.floor(s.v))}です。</p>` : '<p class="small muted">これが最後の段階です。</p>'}`,
      foot: '<button class="btn" data-a="closeModal">閉じる</button><button class="btn pri" data-a="go" data-v="town">街づくりへ</button>' }; }
  return null;
};
/* 記録・偉業・殿堂入り・永久欠番・引退試合の演出 */
const CELE_HEAD = { feat: '記録達成', hof: '野球殿堂入り', retnum: '永久欠番', post: 'タイトル獲得', season: '引退試合' };
MODALS.cele2 = it => {
  const p = it.pid != null ? P_(it.pid) : null;
  return { title: it.head || CELE_HEAD[it.art] || 'おめでとうございます', size: 'narrow',
    body: `${art(it.art || 'feat', { h: 'cut', kicker: esc(it.kicker || ''), title: esc(it.title || ''), sub: esc(it.sub || ''), eager: true })}<p>${esc(it.body || '')}</p>`,
    foot: `${p ? `<button class="btn" data-a="player" data-id="${p.id}">選手を見る</button>` : ''}<button class="btn pri" data-a="closeModal">閉じる</button>` };
};
MODALS.cele = ({ k }) => {
  const T = uT(); const gs = k === 'gs'; const y = G.year;
  const R = T.rec; const s = gs ? G.post.series.find(x => x.kind === (LG.mlb ? 'ws' : 'gs')) : null;
  if (k === 'div') return { title: '地区優勝！', size: 'narrow', body: `${art('post', { h: 'cut', eager: true })}<div class="title-board" style="padding:26px 18px;box-shadow:none">${emblem(T, 84)}<h1 style="font-size:40px;margin-top:10px">地区優勝</h1><p>${esc(tName(T.id))}　${y}年　${esc(grpName(grpOf(T)))}</p><p class="small">${R.w}勝${R.l}敗</p></div><p class="small muted" style="margin-top:12px">ポストシーズンでワールドシリーズ制覇を目指します。</p>`, foot: '<button class="btn pri" data-a="closeModal">閉じる</button>' };
  const mvp = gs && G.post.mvp != null ? P_(G.post.mvp) : null;
  return { title: gs ? '日本一！' : 'リーグ優勝！', size: 'narrow',
    body: `${art(gs ? 'champ' : 'post', { h: 'cut', eager: true })}<div class="title-board" style="padding:26px 18px;box-shadow:none">${emblem(T, 84)}<h1 style="font-size:${LG.mlb && gs ? 34 : 46}px;margin-top:10px">${gs ? LG.champ : LG.mlb ? 'リーグ優勝' : '優勝'}</h1><p>${esc(tName(T.id))}　${y}年${gs ? '' : '　' + LEAGUES[T.league]}</p>
      <p class="small">${gs && s ? `${LG.series} ${s.winner === s.hi ? s.w[0] + '勝' + s.w[1] + '敗' : s.w[1] + '勝' + s.w[0] + '敗'}` : `${R.w}勝${R.l}敗${R.d ? R.d + '分' : ''}`}${mvp ? '　シリーズMVP ' + esc(mvp.name) : ''}</p></div>
      <p class="small muted" style="margin-top:12px">${gs ? '優勝記念グッズが飛ぶように売れています。オーナーもきっと喜んでいるはずです。' : LG.mlb ? 'このあとワールドシリーズで頂点を目指します。' : 'このあとプレーオフで日本一を目指します。'}</p>`,
    foot: '<button class="btn pri" data-a="closeModal">閉じる</button>' };
};

/* ワイルドカード争い（メジャー版のホーム） */
function wcMini(lg) {
  const ut = G.user.tid; const w = wildCard(lg).slice(0, 6);
  return `<table class="t compact"><tbody>${w.map(x => `<tr class="${x.t.id === ut ? 'me' : ''}${x.rank === 3 ? ' wc-cut' : ''}"><td class="num">${x.rank}</td><td>${tMark(x.t.id)}</td><td class="num">${x.t.rec.w}-${x.t.rec.l}</td><td class="num">${x.rank <= 3 ? (x.rank === 3 ? '―' : '+' + (-x.gb).toFixed(1)) : x.gb.toFixed(1)}</td></tr>`).join('')}</tbody></table>`;
}
