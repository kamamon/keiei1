/* =========================================================
   記録・ニュース・セーブと設定
   ========================================================= */
SCREENS.records = () => {
  const tab = getTab('records', 'mine');
  const tb = tabs('records', [['mine', '球団の歩み'], ['league', '歴代の優勝'], ['legends', '名選手'], ['mlb', 'メジャー移籍']], tab);
  let body = '';
  if (tab === 'mine') {
    const H = G.hist.user; const F = G.fin.hist;
    body = H.length ? panel('', `<div class="tw"><table class="t"><thead><tr><th>年</th><th>順位</th><th>勝敗</th><th>ポストシーズン</th><th class="num">観客動員</th><th class="num">収支</th><th class="num">オーナー信頼</th></tr></thead><tbody>${H.slice().reverse().map(h => `<tr><td>${h.y}</td><td>${h.rank}位</td><td>${h.w}勝${h.l}敗${h.d ? h.d + '分' : ''}</td><td>${h.champ ? '<span class="tag lamp">日本一</span>' : h.lg ? '<span class="tag b">リーグ優勝</span>' : ''}</td><td class="num">${fmtPeople(h.att)}</td><td class="num ${h.net < 0 ? 'neg' : 'pos'}">${fmtSigned(h.net)}</td><td class="num">${Math.round(h.trust)}</td></tr>`).join('')}</tbody></table></div>`, { flush: true }) +
      (F.length > 1 ? '<div style="height:16px"></div>' + panel('観客動員と収支の推移', lineChart([{ n: '観客動員（万人）', c: 'var(--team)', v: F.map(h => h.att / 10000) }, { n: '収支（億円）', c: 'var(--lamp)', v: F.map(h => h.net / 10000) }], F.map(h => String(h.y)), { fmt: v => trimNum(v.toFixed(1)), label: '推移' })) : '')
      : '<div class="empty">1年目のシーズンが終わると、ここに球団の歩みが記録されます。</div>';
  } else if (tab === 'league') {
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
    body = M.length ? panel('', `<table class="t compact"><thead><tr><th>年</th><th>選手</th><th>元所属</th><th>経路</th></tr></thead><tbody>${M.map(x => `<tr><td>${x.y}</td><td>${esc(x.name)}</td><td>${tMark(x.from)}</td><td>${esc(x.how)}</td></tr>`).join('')}</tbody></table>`, { flush: true }) : '<div class="empty">まだメジャーへ渡った選手はいません。</div>';
  }
  return `<h1 class="h1">球団史・記録</h1>${tb}${body}`;
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
    ${panel('遊び方', `<button class="btn" data-a="help">遊び方を読む</button> <button class="btn danger" data-a="toTitleAsk">タイトルに戻る</button><p class="small faint" style="margin-top:10px">球団社長 ver.1.0　登場する球団・企業・人物はすべて架空です。</p>`)}
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
    <li>主力のFA流出を防ぐには、FA権を得る前に複数年契約を。</li><li>外国人は当たり外れが大きいので、海外担当スカウトで調査を。</li></ul>
  </div></div>`, foot: '<button class="btn pri" data-a="closeModal">閉じる</button>'
});
