/* =========================================================
   記録・ニュース・セーブと設定
   ========================================================= */
SCREENS.records = () => {
  const tab = getTab('records', 'mine');
  const tb = tabs('records', [['mine', '球団の歩み'], ['recs', '記録'], ['feats', '偉業'], ['hof', '野球殿堂'], ['retnum', '永久欠番'], ['league', '歴代の優勝'], ['legends', '名選手'], ['mlb', 'メジャー移籍']], tab);
  let body = '';
  if (tab === 'mine') {
    const H = G.hist.user; const F = G.fin.hist;
    body = H.length ? panel('', `<div class="tw"><table class="t"><thead><tr><th>年</th><th>順位</th><th>勝敗</th><th>ポストシーズン</th><th class="num">観客動員</th><th class="num">収支</th><th class="num">オーナー信頼</th></tr></thead><tbody>${H.slice().reverse().map(h => `<tr><td>${h.y}</td><td>${h.rank}位</td><td>${h.w}勝${h.l}敗${h.d ? h.d + '分' : ''}</td><td>${h.champ ? '<span class="tag lamp">日本一</span>' : h.lg ? '<span class="tag b">リーグ優勝</span>' : ''}</td><td class="num">${fmtPeople(h.att)}</td><td class="num ${h.net < 0 ? 'neg' : 'pos'}">${fmtSigned(h.net)}</td><td class="num">${Math.round(h.trust)}</td></tr>`).join('')}</tbody></table></div>`, { flush: true }) +
      (F.length > 1 ? '<div style="height:16px"></div>' + panel('観客動員と収支の推移', lineChart([{ n: '観客動員（万人）', c: 'var(--team)', v: F.map(h => h.att / 10000) }, { n: '収支（億円）', c: 'var(--lamp)', v: F.map(h => h.net / 10000) }], F.map(h => String(h.y)), { fmt: v => trimNum(v.toFixed(1)), label: '推移' })) : '')
      : '<div class="empty">1年目のシーズンが終わると、ここに球団の歩みが記録されます。</div>';
  } else if (tab === 'recs') body = recordsTab();
  else if (tab === 'feats') body = featsTab();
  else if (tab === 'hof') body = hofTab();
  else if (tab === 'retnum') body = retnumTab();
  else if (tab === 'league') {
    const S = G.hist.seasons.slice().reverse();
    const titles = G.teams.slice().sort((a, b) => (b.titles.gs * 10 + b.titles.lg) - (a.titles.gs * 10 + a.titles.lg));
    body = `<div class="grid g2">${panel('歴代の優勝', S.length ? `<table class="t compact"><thead><tr><th>年</th><th>${LEAGUES[0]}</th><th>${LEAGUES[1]}</th><th>日本一</th></tr></thead><tbody>${S.map(s => `<tr><td>${s.y}</td><td>${s.lgChamp ? tMark(s.lgChamp[0]) : '―'}</td><td>${s.lgChamp ? tMark(s.lgChamp[1]) : '―'}</td><td>${s.champ != null ? tMark(s.champ) : '―'}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">まだ記録がありません</div>', { flush: true })}
      ${panel('優勝回数（就任後）', `<table class="t compact"><thead><tr><th>球団</th><th class="num">リーグ優勝</th><th class="num">日本一</th></tr></thead><tbody>${titles.map(t => `<tr class="${isUser(t.id) ? 'me' : ''}"><td>${tMark(t.id)}</td><td class="num">${t.titles.lg}</td><td class="num">${t.titles.gs}</td></tr>`).join('')}</tbody></table>`, { flush: true })}</div>`;
  } else if (tab === 'legends') {
    const L = G.legends.slice().reverse();
    body = L.length ? panel('', table('leg', [
      { k: 'y', l: '引退年', v: x => x.y, num: true, h: x => x.y }, { k: 'n', l: '名前', v: x => x.name, h: x => `<b>${esc(x.name)}</b>` },
      { k: 't', l: '最終所属', v: x => x.team, h: x => tMark(x.team) }, { k: 'p', l: '位置', h: x => POS_JP[x.pos] },
      { k: 'c', l: '通算成績', h: x => x.pos === 'P' ? `${x.c.w}勝${x.c.l}敗 ${x.c.sv}S 防${fmtEra(pEra(x.c))}` : `${x.c.h}安打 ${x.c.hr}本 打率${fmtAvg(bAvg(x.c))}` },
      { k: 'w', l: 'WAR', v: x => x.war, num: true, h: x => x.war }
    ], L), { flush: true }) : '<div class="empty">通算WAR18以上、1200安打、200本塁打、100勝などの名選手が引退すると、ここに記録されます。</div>';
  } else {
    const M = G.mlb.slice().reverse();
    const stL = x => x.st === 'play' ? '<span class="tag lamp">メジャーで活躍中</span>' : x.st === 'back' ? `<span class="tag b">${x.by || ''}年に日本へ復帰</span>` : x.st === 'ret' ? `<span class="tag">${x.ry || ''}年に引退</span>` : '';
    body = M.length ? panel('', `<div class="tw"><table class="t compact"><thead><tr><th>年</th><th>選手</th><th>元所属</th><th>経路</th><th>移籍先</th><th>いま</th><th>最近の成績</th></tr></thead><tbody>${M.map(x => `<tr class="${isUser(x.from) ? 'me' : ''}"><td>${x.y}</td><td>${P_(x.pid) ? pLink(P_(x.pid)) : esc(x.name)}</td><td>${tMark(x.from)}</td><td>${esc(x.how)}${x.fee ? `<div class="small faint">譲渡金 ${fmtOku(x.fee)}</div>` : ''}</td><td class="small">${esc(x.club || '')}${x.yrs ? `（${x.yrs}年契約）` : ''}</td><td>${stL(x)}</td><td class="small">${esc(x.last || '')}</td></tr>`).join('')}</tbody></table></div>`, { flush: true }) : '<div class="empty">まだメジャーへ渡った選手はいません。海外FA権（1軍で9年）やポスティングで挑戦します。</div>';
  }
  return `<h1 class="h1">球団史・記録</h1>${tb}${body}`;
};

/* ---------- 記録・偉業・殿堂・永久欠番 ---------- */
function recWho(r) { if (!r) return ''; const p = r.pid != null ? P_(r.pid) : null; return (p ? pLink(p) : esc(r.name)) + (r.y === G.year && !r.seed ? ' <span class="tag lamp">今季</span>' : ''); }
function recRow(k, r, car, extra) {
  const d = car ? CAR_DEFS[k] : REC_DEFS[k]; const p = r && r.pid != null ? P_(r.pid) : null;
  return `<tr class="${p && isUser(p.team) ? 'me' : ''}"><td>${d.n}</td><td class="num"><b>${r ? recFmt(k, r.v, car) : '―'}</b></td><td>${recWho(r)}</td><td>${r ? tMark(r.tid) : ''}</td><td class="num">${r ? r.y : ''}</td>${extra != null ? `<td class="small">${extra}</td>` : ''}</tr>`;
}
function activeTop(k) {
  let best = null, bv = 0;
  for (const T of G.teams) for (const p of roster(T.id)) { if ((!!CAR_DEFS[k].bat) === isP(p)) continue; const v = (p.car[k] || 0) + (p.st[k] || 0); if (v > bv) { bv = v; best = p; } }
  return best ? `${pLink(best)} ${recFmt(k, bv, true)}` : '';
}
function recordsTab() {
  const R = G.recs; if (!R) return '<div class="empty">記録はまだありません。</div>';
  const tid = UI.tab.recTeam != null ? +UI.tab.recTeam : G.user.tid;
  const head = '<thead><tr><th>記録</th><th class="num">数字</th><th>選手</th><th>球団</th><th class="num">年</th></tr></thead>';
  const lg = panel('リーグ記録（シーズン）', `<div class="tw"><table class="t compact">${head}<tbody>${Object.keys(REC_DEFS).map(k => recRow(k, R.lg[k])).join('')}</tbody></table></div>`, { flush: true });
  const car = panel('歴代最多（通算）', `<div class="tw"><table class="t compact"><thead><tr><th>記録</th><th class="num">数字</th><th>選手</th><th>球団</th><th class="num">年</th><th>現役トップ</th></tr></thead><tbody>${Object.keys(CAR_DEFS).map(k => recRow(k, R.car[k], true, activeTop(k))).join('')}</tbody></table></div>`, { flush: true });
  const tm = panel('球団記録（シーズン）', `<div class="tw"><table class="t compact">${head}<tbody>${Object.keys(REC_DEFS).map(k => recRow(k, (R.tm[tid] || {})[k])).join('')}</tbody></table></div>`,
    { flush: true, act: `<select class="inp" data-c="recTeam" aria-label="球団">${G.teams.map(t => opt(t.id, tName(t.id), tid)).join('')}</select>` });
  return `<p class="small muted">シーズン中に記録を塗り替えると、その場でお知らせと演出があります。記録が近づくと「あと○本」のお知らせが届き、観客も増えます。打率と防御率は規定打席・規定投球回に届いた選手だけで、シーズン終了時に決まります。</p><div class="grid g2">${lg}${tm}</div><div style="height:16px"></div>${car}`;
}
ACT.recTeam = el => { UI.tab.recTeam = el.value; render(); };
function featsTab() {
  const F = (G.recs && G.recs.feats) || [];
  return F.length ? panel('', `<div class="tw"><table class="t compact"><thead><tr><th>年月</th><th>偉業</th><th>選手</th><th>球団</th><th>相手</th></tr></thead><tbody>${F.map(f => { const p = P_(f.pid); return `<tr class="${isUser(f.tid) ? 'me' : ''}"><td class="small">${f.y}年${f.m}月</td><td><b>${esc(FEATS[f.k] ? FEATS[f.k].n : f.k)}</b>${f.v && (f.k === 'k15' || f.k === 'hr3' || f.k === 'h5') ? ` <span class="small muted">${f.v}${f.k === 'k15' ? '奪三振' : f.k === 'hr3' ? '本' : '安打'}</span>` : ''}</td><td>${p ? pLink(p) : esc(f.name)}</td><td>${tMark(f.tid)}</td><td>${tMark(f.opp)}</td></tr>`; }).join('')}</tbody></table></div>`, { flush: true })
    : '<div class="empty">完全試合・ノーヒットノーラン・サイクルヒット・1試合3本塁打・1試合15奪三振などの偉業が、ここに記録されます。</div>';
}
function hofTab() {
  const H = G.hof; if (!H) return '<div class="empty">野球殿堂はまだありません。</div>';
  const ut = G.user.tid;
  const cards = H.members.slice().reverse().map(m => `<article class="plaque${m.y === G.year ? ' new' : ''}${m.team === ut || m.orig === ut ? ' mine' : ''}"><div class="pl-y">${m.y}年 殿堂入り${m.y === G.year ? '<span class="pl-new">今年</span>' : ''}</div><h3 class="pl-n">${esc(m.name)}</h3>
    <div class="pl-s">${m.pos === 'P' ? '投手' : POS_JP[m.pos] || ''}　${m.from}〜${m.to}年　${G.teams[m.team] ? esc(G.teams[m.team].nick) : ''}</div><div class="pl-l">${esc(m.line)}</div><div class="pl-f">得票率 ${m.pct}%${m.first ? '・資格1年目' : ''}${m.titles ? `・タイトル${m.titles}回` : ''}</div></article>`).join('');
  const L = H.last; const ballot = H.ballot.slice().sort((a, b) => b.pct - a.pct);
  const vote = panel(L ? `${L.y}年の投票` : '投票', `${L && L.res.length ? `<p>殿堂入り：<b>${L.res.map(x => `${esc(x.name)}（${x.pct}%）`).join('、')}</b></p>` : L ? '<p class="muted">今年の殿堂入りはありませんでした。</p>' : ''}
    ${ballot.length ? `<div class="tw"><table class="t compact"><thead><tr><th>候補</th><th>元所属</th><th class="num">得票率</th><th class="num">候補年数</th></tr></thead><tbody>${ballot.map(b => `<tr class="${b.L.team === ut || b.L.orig === ut ? 'me' : ''}"><td>${esc(b.L.name)}</td><td>${tMark(b.L.team)}</td><td class="num">${b.pct}%</td><td class="num">${b.yrs}年</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">いまは候補がいません。</p>'}
    <p class="small muted">名選手として引退した選手が、引退から3年たつと候補になります。毎年1月の記者投票で75%以上を集めると殿堂入り。候補でいられるのは15年までです。通算WAR、大台の記録、タイトルと表彰、偉業が評価されます。</p>`);
  return `<div class="grid g-hof"><div class="plaques">${cards}</div>${vote}</div>`;
}
function retnumTab() {
  const ut = G.user.tid; const R = G.retNums || {};
  const chip = r => `<div class="retnum"><b>${r.num}</b><span>${esc(r.name)}</span><span class="small faint">${r.seed ? '歴代' : r.y + '年'}</span></div>`;
  const cands = retNumCands(ut);
  const mine = panel(`${esc(tName(ut))}の永久欠番`, `${(R[ut] || []).length ? `<div class="retnums">${R[ut].map(chip).join('')}</div>` : '<p class="muted">まだ永久欠番はありません。</p>'}
    ${cands.length ? `<h4 style="margin:14px 0 6px">永久欠番にできる名選手</h4><table class="t compact"><tbody>${cands.map(L => `<tr><td><b>${L.num}</b></td><td>${esc(L.name)}</td><td class="small muted">${L.y}年引退・通算WAR ${L.war}</td><td><button class="btn xs pri" data-a="retNumGo" data-key="${esc(legendKey(L))}">永久欠番にする</button></td></tr>`).join('')}</tbody></table>` : ''}
    <p class="small muted" style="margin:10px 0 0">名選手が引退すると、背番号を永久欠番にするか聞かれます。永久欠番にした番号は、だれも着けられなくなります。</p>`);
  const others = G.teams.filter(t => t.id !== ut).map(t => `<div class="ret-row"><span class="ret-t">${tMark(t.id)}</span><span class="ret-l">${(R[t.id] || []).map(r => `<span class="tag" title="${esc(r.name)}"><b>${r.num}</b>&nbsp;${esc(r.name)}</span>`).join(' ') || '<span class="faint small">なし</span>'}</span></div>`).join('');
  return `<div class="grid g2">${mine}${panel('ほかの球団', `<div class="stack" style="gap:8px">${others}</div>`)}</div>`;
}
ACT.retNumGo = el => {
  const L = G.legends.find(x => legendKey(x) === el.dataset.key); if (!L) return;
  if (retireNumber(G.user.tid, { num: L.num, name: L.name, pid: L.pid, pos: L.pos }, true)) { toast(`背番号${L.num}を${L.name}の永久欠番にしました`, 'good'); const cq = G.celeQ.splice(0); for (const it of cq) openModal('cele2', it); }
  render();
};

SCREENS.news = () => {
  const f = getTab('newsF', 'mine');
  const types = Object.entries(NEWS_TYPES);
  const list = G.news.filter(n => f === 'all' ? true : f === 'mine' ? (n.tid === G.user.tid || n.imp) : n.type === f);
  return `<h1 class="h1">ニュース</h1><div class="row" style="margin-bottom:12px"><select class="inp" data-c="newsF">${opt('mine', '自球団と重要なもの', f)}${opt('all', 'すべて', f)}${types.map(([k, v]) => opt(k, v, f)).join('')}</select><span class="small muted">${list.length}件</span></div>
  ${panel('', list.length ? `<ul class="news">${list.slice(0, 250).map(newsLi).join('')}</ul>` : '<div class="empty">ニュースはありません</div>', { flush: true })}`;
};
ACT.newsF = el => { UI.tab.newsF = el.value; render(); };

SCREENS.system = () => {
  const ok = storageOK();
  const rows = ['auto', '1', '2', '3'].map(s => { const m = slotMeta(s); return `<tr><td><b>${SLOT_NAMES[s]}</b></td><td class="small">${m ? `${esc(m.team)}　${esc(m.date)}<div class="faint">保存 ${fmtTime(m.t)}</div>` : '<span class="faint">空き</span>'}</td><td class="nowrap">${s !== 'auto' ? `<button class="btn xs pri" data-a="sysSave" data-s="${s}" ${ok ? '' : 'disabled'}>ここに保存</button> ` : ''}${m ? `<button class="btn xs" data-a="sysLoad" data-s="${s}">読み込む</button> <button class="btn xs danger" data-a="sysDel" data-s="${s}">消す</button>` : ''}</td></tr>`; }).join('');
  const th = G.user.theme || 'night';
  return `<h1 class="h1">セーブ・設定</h1>
  ${ok ? '' : '<div class="panel" style="margin-bottom:12px"><div class="panel-b warn">この表示環境ではブラウザに保存できません。下の「ファイルに書き出す」で保存してください。</div></div>'}
  <div class="grid g2">
    ${panel('セーブデータ', `<div class="tw"><table class="t compact"><tbody>${rows}</tbody></table></div><p class="small muted" style="padding:0 14px">毎週の進行時にオートセーブされます。データはこのブラウザの中だけに保存されます。</p>`, { flush: true })}
    ${panel('ファイルで保存・引き継ぎ', `<p class="small">別の端末やブラウザで続きを遊ぶときは、ファイルに書き出して読み込みます。</p><div class="row"><button class="btn pri" data-a="sysExport">ファイルに書き出す</button><label class="btn" style="cursor:pointer">ファイルから読み込む<input type="file" accept=".kyudan,.json,.txt" data-c="importFile" hidden></label></div>`)}
    ${panel('表示と進行', `<div class="field"><span>画面のテーマ</span>${seg('sysTheme', [['night', 'ナイター（暗い）'], ['day', 'デーゲーム（明るい）']], th)}</div>
      <div class="field" style="margin-top:10px"><span>場面の絵</span>${seg('sysArt', [['il', 'イラスト'], ['photo', '写真（Canva）']], artMode())}<span class="small muted">写真は Canva で作った場面だけです。写真のない場面はイラストで表示します。</span></div>
      <div class="stack" style="margin-top:12px"><label class="chk"><input type="checkbox" data-c="setUser" data-k="showWeekly" ${G.user.showWeekly ? 'checked' : ''}>毎週のまとめを表示する</label>
      <label class="chk"><input type="checkbox" data-c="setUser" data-k="autoSwap" ${G.user.autoSwap ? 'checked' : ''}>1軍の故障者を自動で入れ替える</label>
      <label class="chk"><input type="checkbox" data-c="setUser" data-k="autoRoster" ${G.user.autoRoster ? 'checked' : ''}>1軍の編成を毎週監督に任せる</label></div>`)}
    ${panel('お知らせ（通知）', `<div class="stack"><label class="chk"><input type="checkbox" data-c="setUser" data-k="noteToast" ${G.user.noteToast ? 'checked' : ''}>週を進めたとき、お知らせを画面の下にも出す（週のまとめを出さないとき）</label>
      <label class="chk"><input type="checkbox" data-c="setUser" data-k="noteStop" ${G.user.noteStop ? 'checked' : ''}>まとめて進めているとき、大事なお知らせ（工事の完了・長い故障・FA・メジャー挑戦の結果など）で止まる</label>
      <label class="chk"><input type="checkbox" data-c="osNote" ${G.user.osNote ? 'checked' : ''}>ブラウザの通知も使う（ほかのタブを見ているときに、大事なお知らせを知らせる）</label>
      <div class="row small"><span class="muted">ブラウザの通知：${esc(osNoteState())}</span><button class="btn xs" data-a="noteTest">テスト</button></div></div>
      <p class="small muted" style="margin:10px 0 0">工事・練習・契約・選手の成長や故障など、自球団に何かが完了したり変わったりすると、右上のベルに届きます。</p>`)}
    ${panel('遊び方', `<button class="btn" data-a="help">遊び方を読む</button> <button class="btn danger" data-a="toTitleAsk">タイトルに戻る</button><p class="small faint" style="margin-top:10px">球団社長 ver.1.1　登場する球団・企業・人物はすべて架空です。${G.flags.edited ? '　この球団のデータは選手の編集を使っています。' : ''}</p>`)}
  </div>`;
};
ACT.sysSave = async el => { const ok = await saveTo(el.dataset.s); toast(ok ? '保存しました' : '保存できませんでした（容量不足の可能性）', ok ? 'good' : 'bad'); render(); };
ACT.sysLoad = async el => { const ok = await loadFrom(el.dataset.s); if (ok) { closeAllModals(); UI.screen = 'home'; toast('読み込みました：' + nowStr(), 'good'); } else toast('読み込めませんでした', 'bad'); render(); };
ACT.sysDel = el => { deleteSlot(el.dataset.s); toast('消去しました'); render(); };
ACT.sysExport = async () => {
  const data = await packStr(serialize());
  const blob = new Blob([data], { type: 'text/plain' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `kyudan_${tShort(G.user.tid)}_${G.year}_${G.month}月.kyudan`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  toast('ファイルに書き出しました', 'good');
};
ACT.sysArt = el => { G.user.artMode = el.dataset.v; try { localStorage.setItem('kyudan_art', el.dataset.v); } catch (e) { } render(); };
ACT.sysTheme = el => { G.user.theme = el.dataset.v; try { localStorage.setItem('kyudan_theme', el.dataset.v); } catch (e) { } render(); };
ACT.toTitleAsk = () => { openModal('toTitle'); render(); };
MODALS.toTitle = () => ({ title: 'タイトルに戻りますか', size: 'narrow', body: '<p>オートセーブ済みのデータは「続きから」で再開できます。</p>', foot: '<button class="btn" data-a="closeModal">やめる</button><button class="btn pri" data-a="toTitle">タイトルへ</button>' });
ACT.help = () => { openModal('help'); render(); };
MODALS.help = () => ({
  title: '遊び方', size: 'wide', body: `<div class="grid g2"><div>
    <h4>1年の流れ</h4><table class="t compact"><tbody>
    <tr><td>1月</td><td>予算・中期計画・キャンプ地を決める。FC会員が更新。</td></tr><tr><td>2月</td><td>春季キャンプ（成長が約2倍）。</td></tr>
    <tr><td>3月</td><td>オープン戦。第4週に開幕。</td></tr><tr><td>4〜9月</td><td>公式戦143試合。5月末〜6月は交流戦。7月末で補強締切。</td></tr>
    <tr><td>10月</td><td>プレーオフ、グランドシリーズ、第4週にドラフト会議。</td></tr><tr><td>11月</td><td>引退・戦力外・FA・秋季キャンプ・表彰。</td></tr>
    <tr><td>12月</td><td>契約更改・外国人補強・年末にオーナー評価。</td></tr></tbody></table>
    <h4>能力の見かた</h4><p class="small">能力は1〜100で、S（90〜）A（80〜）B（70〜）C（60〜）D（50〜）E（40〜）F（20〜）G。1軍の平均的な選手はC前後です。「伸びしろ」は将来到達できそうな水準です。</p>
  </div><div>
    <h4>経営のコツ</h4><ul class="small"><li>観客は人気・成績・曜日・対戦相手・天気・価格で決まります。満員続きなら値上げ、空席が多いなら値下げやイベントを。</li>
    <li>ネーミングライツやスポンサーは大事な収入源。球場を買い取ると命名権料と飲食売上をすべて受け取れます。</li>
    <li>街づくりで駐車場・バス・新駅をつくるとアクセスが上がり、モールやホテルは賃料収入を生みます。</li>
    <li>赤字は親会社がある程度補填してくれますが、オーナーの評価は下がります。</li></ul>
    <h4>チームづくりのコツ</h4><ul class="small"><li>若手は2軍・育成でも成長しますが、1軍で試合に出ると伸びが早くなります。</li><li>スカウトを地域に送り込むと隠れた好素材が見つかります。</li>
    <li>主力のFA流出を防ぐには、FA権を得る前に複数年契約を。</li><li>外国人は当たり外れが大きいので、海外担当スカウトで調査を。</li>
    <li>サブポジション（△こなせる・○上手・◎本職並み）があると、本職以外の守備にも就けます。公式戦で守るか、「特別練習」で覚えます。</li>
    <li>特殊能力（チャンス・盗塁・ノビなどのA〜G、パワーヒッター・奪三振などのプラス、三振・四球などのマイナス）は、試合のその場面で効きます。金の能力はスターの証です。</li>
    <li>数年に一度、「10年に一度の逸材」がドラフト候補に現れます。1位入札は競合必至です。</li>
    <li>海外FA権は1軍9年で得ます。11月〜12月第2週は、選手詳細からポスティングにかけられます。メジャーから戻った選手はFA市場に出ます。</li></ul>
    <h4>記録と殿堂</h4><ul class="small"><li>シーズン・通算・球団の記録を塗り替えたり、ノーヒットノーラン・サイクルヒットなどの偉業や大台（2000安打・200勝など）を達成すると、演出と記念イベントがあります。記録が近づくと観客も増えます。</li>
    <li>9月はタイトル争いのお知らせが届き、最終週には首位打者・最優秀防御率のために選手を休ませるかを決められます。</li>
    <li>ベテランが引退を表明したら、最終週に引退試合を開けます。名選手が引退すると、背番号を永久欠番にできます。</li>
    <li>名選手は引退から3年後に野球殿堂の候補になり、毎年1月の投票で75%以上を集めると殿堂入りします。「球団史・記録」で見られます。</li></ul>
    <h4>お知らせと編集</h4><ul class="small"><li>右上のベルに、工事の完了・選手の成長や故障・契約の変化など、自球団のお知らせが届きます。設定でブラウザの通知も使えます。</li>
    <li>「選手の編集」では、名前・背番号・能力・特殊能力・サブポジションなどを自由に変えたり、新しい選手を作ったりできます。</li></ul>
  </div></div>`, foot: '<button class="btn pri" data-a="closeModal">閉じる</button>'
});
