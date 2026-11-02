/* =========================================================
   場面のイラスト（コードで描く SVG。1600x900、動きは style.css の .il）
   同じ場面は一度描いたら使い回す。乱数は場面ごとに固定なので毎回同じ絵になる
   ========================================================= */
const IL_CACHE = {};
let IL_UID = 0;
function ilRand(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function ilHash(k) { let h = 2166136261; for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function ilCtx(key) {
  const uid = 'i' + (++IL_UID) + '_'; const r = ilRand(ilHash(key)); const defs = []; const seen = new Set();
  const def = (n, f) => { if (!seen.has(n)) { seen.add(n); defs.push(f()); } return `url(#${uid + n})`; };
  const c = {
    r, defs, id: n => uid + n,
    rr: (a, b) => a + (b - a) * r(),
    pick: a => a[Math.floor(r() * a.length)],
    lg: (n, stops, x2, y2) => def(n, () => `<linearGradient id="${uid + n}" x1="0" y1="0" x2="${x2 || 0}" y2="${y2 == null ? 1 : y2}">${ilStops(stops)}</linearGradient>`),
    rg: (n, stops, o) => def(n, () => { o = o || {}; return `<radialGradient id="${uid + n}" cx="${o.cx == null ? .5 : o.cx}" cy="${o.cy == null ? .5 : o.cy}" r="${o.r || .5}">${ilStops(stops)}</radialGradient>`; }),
    pat: (n, w, h, body, tf) => def(n, () => `<pattern id="${uid + n}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"${tf ? ` patternTransform="${tf}"` : ''}>${body}</pattern>`)
  };
  return c;
}
function ilStops(st) { return st.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}"${s[2] != null ? ` stop-opacity="${s[2]}"` : ''}/>`).join(''); }
const f1 = v => Math.round(v * 10) / 10;
function ilAnim(cls, dur, delay) { return ` class="${cls}" style="animation-duration:${f1(dur)}s;animation-delay:${f1(-delay)}s"`; }
function ilSvg(c, body) { return `<svg class="il" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs>${c.defs.join('')}</defs>${body}</svg>`; }

/* ---------- 部品 ---------- */
function ilSky(c, stops) { return `<rect width="1600" height="900" fill="${c.lg('sky', stops)}"/>`; }
function ilStars(c, n, y1) {
  let s = '';
  for (let i = 0; i < n; i++) { const x = c.rr(0, 1600), y = c.rr(0, y1), rad = c.rr(.6, 1.8); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rad)}" fill="#fff" opacity="${f1(c.rr(.3, .9))}"${i % 3 === 0 ? ilAnim('twk', c.rr(2, 5), c.rr(0, 5)) : ''}/>`; }
  return s;
}
function ilGlow(c, n, x, y, rad, color, op) { return `<circle cx="${x}" cy="${y}" r="${rad}" fill="${c.rg(n, [[0, color, op == null ? .8 : op], [.35, color, (op == null ? .8 : op) * .35], [1, color, 0]])}"/>`; }
function ilSkyline(c, y, h, col, win, n, x0, x1) {
  x0 = x0 == null ? 0 : x0; x1 = x1 == null ? 1600 : x1;
  const wp = c.pat('win' + y, 14, 18, `<rect x="4" y="4" width="5" height="7" fill="${win}"/>`);
  let s = '', x = x0;
  while (x < x1) { const w = c.rr(40, 110), bh = c.rr(h * .35, h); s += `<rect x="${f1(x)}" y="${f1(y - bh)}" width="${f1(w)}" height="${f1(bh)}" fill="${col}"/>`; if (c.r() < .75) s += `<rect x="${f1(x + 4)}" y="${f1(y - bh + 6)}" width="${f1(w - 8)}" height="${f1(bh - 6)}" fill="${wp}" opacity="${f1(c.rr(.35, .9))}"/>`; x += w + c.rr(0, 10); }
  return s;
}
/* 照明塔：on＝点灯 */
function ilTower(c, x, base, top, sc, on) {
  const w = 34 * sc, pw = 130 * sc, ph = 64 * sc; let s = `<g fill="none" stroke="#0b1512" stroke-width="${f1(3 * sc)}">`;
  s += `<path d="M${x - w} ${base} L${x - w * .35} ${top} M${x + w} ${base} L${x + w * .35} ${top}"/>`;
  for (let y = top + 20 * sc, k = 0; y < base - 10; y += 34 * sc, k++) { const t = (y - top) / (base - top); const hw = w * .35 + (w - w * .35) * t; s += `<path d="M${f1(x - hw)} ${f1(y)} L${f1(x + hw)} ${f1(y + 34 * sc)}"/>`; }
  s += `</g><rect x="${f1(x - pw / 2)}" y="${f1(top - ph)}" width="${f1(pw)}" height="${f1(ph)}" rx="${f1(4 * sc)}" fill="#14201c"/>`;
  if (on) {
    const lp = c.pat('lamp', 12, 12, '<circle cx="6" cy="6" r="4" fill="#fffbe8"/>');
    s += `<rect x="${f1(x - pw / 2 + 5 * sc)}" y="${f1(top - ph + 5 * sc)}" width="${f1(pw - 10 * sc)}" height="${f1(ph - 10 * sc)}" fill="${lp}"/>`;
    s += `<g class="glow" style="animation-delay:${f1(-c.rr(0, 4))}s">${ilGlow(c, 'tg' + Math.round(x), f1(x), f1(top - ph / 2), f1(230 * sc), '#fff4cf', .75)}</g>`;
  }
  return s;
}
function ilBeams(c, xs, top, groundY, col, op) { return xs.map(x => `<path d="M${x - 40} ${top} L${x + 40} ${top} L${x + 520} ${groundY} L${x - 520} ${groundY} Z" fill="${col}" opacity="${op}"/>`).join(''); }
/* 観客席を埋めるドット（色の組み合わせで雰囲気が変わる） */
function ilCrowdPat(c, n, base, cols) {
  let b = `<rect width="24" height="20" fill="${base}"/>`;
  const pts = [[4, 5], [12, 4], [20, 6], [8, 14], [16, 15], [1, 15]];
  pts.forEach((p, i) => { b += `<circle cx="${p[0]}" cy="${p[1]}" r="3.1" fill="${cols[i % cols.length]}"/>`; });
  return c.pat(n, 24, 20, b);
}
/* 球場（バックネット裏の高い所から見た形）。o: crowd, snow, lights, players, fieldCol */
function ilBallpark(c, o) {
  o = o || {}; let s = '';
  const standTop = 'M0 380 C 330 255, 1270 255, 1600 380', fence = 'M0 540 C 330 410, 1270 410, 1600 540';
  // 外野席
  const crowd = o.snow ? c.pat('seat', 26, 18, '<rect width="26" height="18" fill="#c9d6e2"/><rect x="2" y="9" width="20" height="5" rx="2" fill="#e9f0f6"/>') : o.empty ? c.pat('seat', 26, 18, '<rect width="26" height="18" fill="#1d3a33"/><rect x="2" y="9" width="20" height="5" rx="2" fill="#2d5248"/>') : ilCrowdPat(c, 'crowd', o.crowdBase || '#1a2430', o.crowd || ['#e8edf2', '#2c3e64', '#d9b24a', '#c94a4a', '#8fa3b8', '#f4f4f4']);
  s += `<path d="${standTop} L1600 540 C 1270 410, 330 410, 0 540 Z" fill="${crowd}"/>`;
  s += `<path d="${standTop} L1600 540 C 1270 410, 330 410, 0 540 Z" fill="${c.lg('standShade', [[0, '#000', .45], [.5, '#000', .1], [1, '#000', .35]])}"/>`;
  // 屋根のふち
  s += `<path d="M0 372 C 330 247, 1270 247, 1600 372 L1600 360 C 1270 234, 330 234, 0 360 Z" fill="${o.snow ? '#eef3f8' : '#0e1715'}"/>`;
  // スコアボード
  const sb = c.pat('sbl', 10, 10, `<circle cx="5" cy="5" r="2.4" fill="${o.lights === false ? '#3a4a44' : '#ffd36b'}"/>`);
  s += `<rect x="610" y="150" width="380" height="118" rx="6" fill="#0c1411"/><rect x="624" y="162" width="200" height="94" fill="${sb}" opacity="${o.lights === false ? .5 : .85}"/>`;
  s += `<rect x="836" y="162" width="140" height="94" fill="${o.lights === false ? '#1b2a33' : c.lg('vis', [[0, '#5fd0ff'], [1, '#1f6fd1']])}"/>`;
  if (o.lights !== false) s += `<rect x="836" y="162" width="140" height="94" fill="#fff" opacity=".12"${ilAnim('twk', 3.4, 1)}/>`;
  // 照明塔と光
  const towers = [[150, 1], [520, .72], [1080, .72], [1450, 1]];
  if (o.lights !== false) s += ilBeams(c, [150, 1450], 140, 900, '#fff6d8', .05);
  towers.forEach(([x, sc]) => { s += ilTower(c, x, 470, sc === 1 ? 150 : 200, sc, o.lights !== false); });
  // フェンス
  s += `<path d="${fence} L1600 562 C 1270 432, 330 432, 0 562 Z" fill="#0f3b2c"/><path d="${fence}" fill="none" stroke="#e9c84a" stroke-width="4"/>`;
  // フィールド
  const grass = o.snow ? c.lg('snowf', [[0, '#e7eef6'], [1, '#c3d3e4']]) : c.pat('mow', 90, 900, `<rect width="45" height="900" fill="${o.fieldA || '#2f8f4c'}"/><rect x="45" width="45" height="900" fill="${o.fieldB || '#2a8045'}"/>`, 'rotate(28)');
  s += `<path d="M0 562 C 330 432, 1270 432, 1600 562 L1600 900 L0 900 Z" fill="${grass}"/>`;
  if (!o.snow) s += `<path d="M0 562 C 330 432, 1270 432, 1600 562 L1600 588 C 1270 458, 330 458, 0 588 Z" fill="#9c7650"/>`;
  if (!o.snow) {
    s += `<path d="M0 562 C 330 432, 1270 432, 1600 562 L1600 900 L0 900 Z" fill="${c.lg('fieldShade', [[0, '#000', .25], [.35, '#000', 0], [1, '#000', .3]])}"/>`;
    s += `<path d="M260 900 Q 800 440 1340 900 Z" fill="#b9864f"/><path d="M800 610 L1110 770 L800 930 L490 770 Z" fill="${o.fieldA || '#2f8f4c'}"/>`;
    s += `<ellipse cx="800" cy="752" rx="64" ry="20" fill="#c08f58"/><rect x="788" y="748" width="24" height="5" fill="#f4f1e6"/>`;
    [[800, 600], [1122, 770], [478, 770]].forEach(([x, y]) => { s += `<rect x="${x - 9}" y="${y - 9}" width="18" height="18" transform="rotate(45 ${x} ${y})" fill="#f6f4ec"/>`; });
    s += `<path d="M800 930 L1600 520 M800 930 L0 520" stroke="#f3f0e4" stroke-width="3" opacity=".85"/>`;
  } else s += `<path d="M260 900 Q 800 440 1340 900" fill="none" stroke="#b9c9db" stroke-width="3" opacity=".7"/>`;
  if (o.players) [[800, 735], [655, 650], [945, 650], [800, 488], [420, 545], [1180, 545], [1085, 735], [515, 735]].forEach(([x, y]) => { s += ilPlayer(c, x, y, y < 560 ? .55 : .8, o.away ? '#c9d3e6' : '#f4f4f4', '#22314f'); });
  return s;
}
function ilPlayer(c, x, y, sc, pants, shirt, pose) {
  const k = sc;
  let s = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(k)})">`;
  if (pose === 'jump') s += `<path d="M-9 -44 L-22 -78 M9 -44 L22 -78" stroke="${shirt}" stroke-width="8" stroke-linecap="round"/>`;
  s += `<rect x="-10" y="-24" width="8" height="24" rx="3" fill="${pants}"/><rect x="2" y="-24" width="8" height="24" rx="3" fill="${pants}"/>`;
  s += `<rect x="-13" y="-52" width="26" height="30" rx="7" fill="${shirt}"/><circle cx="0" cy="-60" r="9" fill="#e9c7a6"/><path d="M-10 -63 Q0 -75 10 -63 L13 -61 L-10 -61 Z" fill="${shirt}"/>`;
  if (pose !== 'jump') s += `<path d="M-12 -46 L-18 -26 M12 -46 L18 -26" stroke="${shirt}" stroke-width="7" stroke-linecap="round"/>`;
  return s + '</g>';
}
/* 手前の観客（シルエット）。item: flag／towel／none */
function ilFans(c, y0, n, col, item, itemCols) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = (i + .5) * 1600 / n + c.rr(-20, 20), y = y0 + c.rr(-10, 25), sc = c.rr(.85, 1.25);
    s += `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(sc)})"><rect x="-34" y="0" width="68" height="120" rx="26" fill="${col}"/><circle cx="0" cy="-12" r="22" fill="${col}"/>`;
    const up = c.r();
    if (item && up < .5) {
      const side = c.r() < .5 ? -1 : 1, ic = c.pick(itemCols);
      s += `<g${ilAnim('wave', c.rr(1.1, 2), c.rr(0, 2))}><path d="M${side * 26} 8 L${side * 44} -66" stroke="${col}" stroke-width="15" stroke-linecap="round"/>`;
      if (item === 'flag') s += `<path d="M${side * 44} -66 L${side * 50} -150" stroke="#2a2a2a" stroke-width="4"/><path d="M${side * 50} -150 Q ${side * 100} -135 ${side * 140} -150 L${side * 136} -100 Q ${side * 98} -88 ${side * 48} -102 Z" fill="${ic}"/>`;
      else s += `<rect x="${side * 44 - 22}" y="-98" width="44" height="30" rx="8" fill="${ic}"/>`;
      s += '</g>';
    }
    s += '</g>';
  }
  return s;
}
function ilFall(c, n, kind, cols, y0) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = c.rr(0, 1600), d = kind === 'snow' ? c.rr(7, 14) : c.rr(5, 9), dl = c.rr(0, d), y = c.rr(y0 || -80, -20);
    if (kind === 'snow') s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(c.rr(1.6, 4.2))}" fill="#fff" opacity="${f1(c.rr(.55, .95))}"${ilAnim('fall', d, dl)}/>`;
    else s += `<g${ilAnim('fall', d, dl)}><rect x="${f1(x)}" y="${f1(y)}" width="${f1(c.rr(7, 13))}" height="${f1(c.rr(4, 8))}" fill="${c.pick(cols)}" transform="rotate(${Math.round(c.rr(0, 180))} ${f1(x)} ${f1(y)})"/></g>`;
  }
  return s;
}
function ilFirework(c, x, y, rad, col, dur, delay) {
  let s = `<g transform="translate(${x} ${y})"><g${ilAnim('burst', dur, delay)}>`;
  const n = 18;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x2 = Math.cos(a) * rad, y2 = Math.sin(a) * rad; s += `<path d="M${f1(x2 * .25)} ${f1(y2 * .25)} L${f1(x2)} ${f1(y2)}" stroke="${col}" stroke-width="3" stroke-linecap="round"/><circle cx="${f1(x2 * 1.08)}" cy="${f1(y2 * 1.08)}" r="3.4" fill="${col}"/>`; }
  s += `<circle r="${f1(rad * .55)}" fill="${c.rg('fwg' + x + '_' + y, [[0, col, .45], [1, col, 0]])}"/>`;
  return s + '</g></g>';
}
function ilPalm(c, x, y, h, lean) {
  let s = `<path d="M${x} ${y} Q ${x + lean * .5} ${y - h * .5} ${x + lean} ${y - h}" stroke="#6b4f33" stroke-width="${f1(h * .045)}" fill="none" stroke-linecap="round"/>`;
  const tx = x + lean, ty = y - h;
  for (let i = 0; i < 7; i++) { const a = -Math.PI + i * Math.PI / 6 + c.rr(-.15, .15), L = h * c.rr(.32, .42); const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * .55 + L * .25; s += `<path d="M${tx} ${ty} Q ${f1((tx + ex) / 2)} ${f1(ty - L * .3)} ${f1(ex)} ${f1(ey)}" stroke="#2f7a3d" stroke-width="${f1(h * .05)}" fill="none" stroke-linecap="round"/>`; }
  return s;
}
function ilLanterns(c, x0, y0, x1, y1, sag, n, col, big) {
  let s = `<path d="M${x0} ${y0} Q ${(x0 + x1) / 2} ${(y0 + y1) / 2 + sag * 2} ${x1} ${y1}" stroke="#2b1d16" stroke-width="2" fill="none"/>`;
  for (let i = 1; i < n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, yy = y0 + (y1 - y0) * t + sag * 4 * t * (1 - t), w = big || 16;
    s += `<g${ilAnim('sway', c.rr(2.4, 4), c.rr(0, 4))}><circle cx="${f1(x)}" cy="${f1(yy + w)}" r="${w * 2.2}" fill="${c.rg('lg' + Math.round(x) + '_' + Math.round(yy), [[0, '#ffb347', .55], [1, '#ffb347', 0]])}"/><rect x="${f1(x - w * .55)}" y="${f1(yy + 2)}" width="${f1(w * 1.1)}" height="${f1(w * 1.9)}" rx="${f1(w * .5)}" fill="${col}"/><rect x="${f1(x - w * .5)}" y="${f1(yy + 2)}" width="${f1(w)}" height="3" fill="#2b1d16"/></g>`;
  }
  return s;
}
function ilBunting(c, x0, x1, y, sag, n, cols) {
  let s = `<path d="M${x0} ${y} Q ${(x0 + x1) / 2} ${y + sag * 2} ${x1} ${y}" stroke="#3b3b3b" stroke-width="2" fill="none"/>`;
  for (let i = 0; i < n; i++) { const t = (i + .5) / n, x = x0 + (x1 - x0) * t, yy = y + sag * 4 * t * (1 - t); s += `<path d="M${f1(x - 13)} ${f1(yy)} L${f1(x + 13)} ${f1(yy)} L${f1(x)} ${f1(yy + 30)} Z" fill="${cols[i % cols.length]}"/>`; }
  return s;
}
function ilStall(c, x, y, w, h, cols, lit) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#3a2a22"/><rect x="${x + 8}" y="${y + h * .55}" width="${w - 16}" height="${h * .45}" fill="#5a4030"/>`;
  const sw = w / 6;
  for (let i = 0; i < 6; i++) s += `<path d="M${f1(x - 10 + i * sw * 1.07)} ${y} L${f1(x - 10 + (i + 1) * sw * 1.07)} ${y} L${f1(x - 10 + (i + 1) * sw * 1.07)} ${y + 30} Q ${f1(x - 10 + (i + .5) * sw * 1.07)} ${y + 44} ${f1(x - 10 + i * sw * 1.07)} ${y + 30} Z" fill="${cols[i % 2]}"/>`;
  if (lit) s += `<rect x="${x + 10}" y="${y + 36}" width="${w - 20}" height="${h * .35}" fill="#ffd27a" opacity=".55"/>`;
  return s;
}
function ilPeople(c, y0, n, cols, sc0, x0, x1) {
  let s = ''; x0 = x0 == null ? 0 : x0; x1 = x1 == null ? 1600 : x1;
  for (let i = 0; i < n; i++) { const x = c.rr(x0, x1), y = y0 + c.rr(-15, 15), sc = (sc0 || 1) * c.rr(.8, 1.2), col = c.pick(cols); s += `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(sc)})"><path d="M-14 0 L-11 -46 Q0 -54 11 -46 L14 0 Z" fill="${col}"/><circle cx="0" cy="-58" r="10" fill="#2a211c"/></g>`; }
  return s;
}
/* 街並み（通りの奥に球場）。o: lanes, lanterns, dusk */
function ilStreet(c, o) {
  let s = '';
  s += `<path d="M560 900 L780 455 L820 455 L1040 900 Z" fill="${o.road || '#5b5f66'}"/><path d="M0 900 L780 455 L560 900 Z" fill="${o.walk || '#8a857c'}"/><path d="M1600 900 L820 455 L1040 900 Z" fill="${o.walk || '#8a857c'}"/>`;
  s += `<path d="M800 470 L800 900" stroke="#e8e2d0" stroke-width="5" stroke-dasharray="26 22" opacity=".6"/>`;
  // 両側の建物
  const sides = [[-1, 0, 780], [1, 820, 1600]];
  for (const [sd, a, b] of sides) {
    let x = sd < 0 ? 0 : 1600; const n = o.n || 5;
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const xa = sd < 0 ? t0 * 760 : 1600 - t0 * 760, xb = sd < 0 ? t1 * 760 : 1600 - t1 * 760;
      const hb = c.rr(.55, 1), top0 = 455 - (1 - t0) * (o.tall || 330) * hb, top1 = 455 - (1 - t1) * (o.tall || 330) * hb;
      const bot0 = 455 + (1 - t0) * 445, bot1 = 455 + (1 - t1) * 445;
      const col = c.pick(o.bcols || ['#c9b79c', '#b8a38a', '#d8cbb5', '#a99886']);
      s += `<path d="M${f1(xa)} ${f1(top0)} L${f1(xb)} ${f1(top1)} L${f1(xb)} ${f1(bot1)} L${f1(xa)} ${f1(bot0)} Z" fill="${col}"/>`;
      s += `<path d="M${f1(xa)} ${f1(top0)} L${f1(xb)} ${f1(top1)} L${f1(xb)} ${f1(bot1)} L${f1(xa)} ${f1(bot0)} Z" fill="#000" opacity="${f1(.08 + t0 * .1)}"/>`;
      // 窓・店の入口
      const ww = (xb - xa) * .5, wy = top0 + (bot0 - top0) * .25;
      s += `<rect x="${f1(Math.min(xa, xb) + Math.abs(xb - xa) * .25)}" y="${f1(wy)}" width="${f1(Math.abs(ww))}" height="${f1((bot0 - top0) * .15)}" fill="${o.win || '#6c7f8f'}" opacity=".85"/>`;
      if (o.shops) { const sc = c.pick(o.awn || ['#c8473a', '#2f6fa8', '#e2a33b', '#3b8a5a']); const ay = top0 + (bot0 - top0) * .6; s += `<path d="M${f1(xa)} ${f1(ay)} L${f1(xb)} ${f1(top1 + (bot1 - top1) * .6)} L${f1(xb)} ${f1(top1 + (bot1 - top1) * .68)} L${f1(xa)} ${f1(ay + (bot0 - top0) * .08)} Z" fill="${sc}"/>`; if (o.lit) s += `<path d="M${f1(xa)} ${f1(ay + (bot0 - top0) * .09)} L${f1(xb)} ${f1(top1 + (bot1 - top1) * .69)} L${f1(xb)} ${f1(bot1)} L${f1(xa)} ${f1(bot0)} Z" fill="#ffd27a" opacity=".35"/>`; }
    }
  }
  return s;
}
function ilFerris(c, x, y, rad) {
  let s = `<path d="M${x - rad * .6} ${y + rad * 1.25} L${x} ${y} L${x + rad * .6} ${y + rad * 1.25}" stroke="#d9dde8" stroke-width="7" fill="none"/>`;
  s += `<g transform="translate(${x} ${y})"><g${ilAnim('spin', 60, 0)}><circle r="${rad}" fill="none" stroke="#f2f4fb" stroke-width="5"/>`;
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, cx = Math.cos(a) * rad, cy = Math.sin(a) * rad; s += `<path d="M0 0 L${f1(cx)} ${f1(cy)}" stroke="#c9cfe0" stroke-width="2"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="9" fill="${['#ff6b9a', '#ffd166', '#6be1ff', '#a98bff'][i % 4]}"/>`; }
  return s + `</g><circle r="12" fill="#f2f4fb"/></g>`;
}
function ilTree(c, x, y, h, col, lights) {
  let s = `<path d="M${x} ${y - h} L${x + h * .32} ${y} L${x - h * .32} ${y} Z" fill="${col}"/>`;
  if (lights) for (let i = 0; i < Math.round(h / 7); i++) { const t = c.r(), yy = y - h + t * h, hw = h * .32 * t; s += `<circle cx="${f1(x + c.rr(-hw, hw))}" cy="${f1(yy)}" r="${f1(c.rr(2, 3.6))}" fill="${c.pick(lights)}"${i % 2 ? ilAnim('twk', c.rr(1.4, 3), c.rr(0, 3)) : ''}/>`; }
  return s;
}

/* ---------- 場面 ---------- */
const IL_SCENES = {
  title(c) {
    return ilSky(c, [[0, '#050b16'], [.45, '#0b1a2e'], [.62, '#1c2f45']]) + ilStars(c, 90, 330) + ilSkyline(c, 300, 90, '#0c1626', '#ffd58a', 30) +
      ilBallpark(c, { players: true }) + ilFans(c, 790, 13, '#05080b', 'flag', ['#e8edf2', '#2c3e64', '#d9b24a', '#c94a4a']);
  },
  season(c) {
    return ilSky(c, [[0, '#0f1d3f'], [.4, '#3b2e66'], [.6, '#d5794a'], [.66, '#f2b25f']]) + ilStars(c, 30, 200) + ilSkyline(c, 305, 80, '#1c1830', '#ffcf86', 30) +
      ilBallpark(c, { players: true, fieldA: '#3a9a52', fieldB: '#338a49' }) + ilFans(c, 800, 12, '#0a0d12', 'towel', ['#f4f4f4', '#ffd166', '#e8edf2']);
  },
  post(c) {
    return ilSky(c, [[0, '#06070f'], [.5, '#151a33'], [.65, '#2a2742']]) + ilStars(c, 50, 300) +
      `<g opacity=".18">${[300, 700, 900, 1300].map((x, i) => `<path d="M${x - 20} 480 L${x + 20} 480 L${x + 160} -40 L${x - 160} -40 Z" fill="#fff3c4"${ilAnim('beam', 6 + i, i * 1.7)}/>`).join('')}</g>` +
      ilSkyline(c, 300, 80, '#0d1022', '#ffd58a', 30) + ilBallpark(c, { players: true, crowd: ['#ffe08a', '#f4f4f4', '#d9b24a', '#ffffff', '#c94a4a', '#ffd166'] }) +
      ilFall(c, 70, 'confetti', ['#ffd166', '#f6e7b0', '#ffb347', '#ffffff']) + ilFans(c, 800, 12, '#05070b', 'towel', ['#ffd166', '#f4f4f4']);
  },
  champ(c) {
    let s = ilSky(c, [[0, '#070614'], [.5, '#1b1838'], [.65, '#3a2d4a']]) + ilStars(c, 40, 260);
    s += ilFirework(c, 360, 150, 110, '#ffd166', 3.6, 0) + ilFirework(c, 1240, 120, 130, '#ff6b9a', 4.2, 1.5) + ilFirework(c, 820, 90, 90, '#6be1ff', 3.2, 2.4) + ilFirework(c, 560, 230, 70, '#b8ff8a', 3.8, .8);
    s += ilBallpark(c, { crowd: ['#ffe08a', '#f4f4f4', '#ffd166', '#ffffff', '#c94a4a'] });
    [[740, 760], [790, 742], [840, 758], [700, 784], [880, 782], [765, 800], [820, 803]].forEach(([x, y], i) => { s += `<g${ilAnim('hop', .9, i * .13)}>${ilPlayer(c, x, y, 1.15, '#f4f4f4', '#22314f', 'jump')}</g>`; });
    return s + ilFall(c, 90, 'confetti', ['#ffd166', '#ff6b9a', '#6be1ff', '#ffffff', '#b8ff8a']);
  },
  off(c) {
    return ilSky(c, [[0, '#1e2b45'], [.42, '#5d7192'], [.62, '#c4b5bd']]) + ilSkyline(c, 305, 80, '#3b4760', '#ffe2a8', 30) +
      ilBallpark(c, { snow: true, lights: false }) + ilFall(c, 110, 'snow');
  },
  camp(c) {
    let s = ilSky(c, [[0, '#2d7fd0'], [.48, '#7cc0ee'], [.55, '#a9d8f2']]) + ilGlow(c, 'sun', 1330, 130, 260, '#fff6c8', .9);
    for (let i = 0; i < 7; i++) { const x = c.rr(0, 1600), y = c.rr(70, 330); s += `<g opacity=".92"${ilAnim('drift', c.rr(40, 70), c.rr(0, 60))}><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(c.rr(70, 130))}" ry="${f1(c.rr(18, 30))}" fill="#fff"/><ellipse cx="${f1(x + 40)}" cy="${f1(y - 14)}" rx="${f1(c.rr(40, 70))}" ry="${f1(c.rr(16, 26))}" fill="#fff"/></g>`; }
    s += `<rect y="468" width="1600" height="28" fill="#3a8fc4"/><rect y="494" width="1600" height="20" fill="#7ab36a"/>`;
    for (let i = 0; i < 16; i++) s += ilPalm(c, 40 + i * 104 + c.rr(-20, 20), 540, c.rr(130, 190), c.rr(-30, 30));
    s += `<rect y="520" width="1600" height="380" fill="${c.pat('mow', 90, 900, '<rect width="45" height="900" fill="#58a64f"/><rect x="45" width="45" height="900" fill="#4f9a48"/>', 'rotate(20)')}"/>`;
    s += `<path d="M250 900 Q 800 560 1350 900 Z" fill="#b98a5b"/><path d="M800 700 L1040 820 L800 940 L560 820 Z" fill="#58a64f"/>`;
    s += `<rect x="60" y="530" width="300" height="170" fill="${c.pat('net', 16, 16, '<path d="M0 0 L16 16 M16 0 L0 16" stroke="#2c6b45" stroke-width="2"/>')}" opacity=".9"/><path d="M60 530 L360 530 L360 700 L60 700 Z" fill="none" stroke="#2c6b45" stroke-width="5"/>`;
    [[560, 600, .7], [760, 588, .65], [1040, 596, .7], [1260, 606, .72], [700, 800, 1.2], [905, 800, 1.2], [800, 745, 1.1], [620, 690, .95], [985, 690, .95], [1180, 660, .9], [430, 660, .9], [1290, 770, 1], [180, 770, 1], [1420, 700, .95]].forEach(([x, y, k]) => { s += ilPlayer(c, x, y, k, '#f6f6f6', '#1f2d4d'); });
    return s;
  },
  draft(c) {
    let s = ilSky(c, [[0, '#060a1a'], [.6, '#101a3a'], [1, '#0a1124']]);
    s += `<g opacity=".28">${[260, 640, 960, 1340].map((x, i) => `<path d="M${x - 14} 0 L${x + 14} 0 L${x + 150} 560 L${x - 150} 560 Z" fill="#cfe0ff"${ilAnim('beamt', 7 + i, i * 2)}/>`).join('')}</g>`;
    s += `<rect x="380" y="120" width="840" height="330" rx="10" fill="#0b1630"/><rect x="400" y="138" width="800" height="294" fill="${c.lg('scr', [[0, '#1d4fa8'], [1, '#0f2a66']])}"/>`;
    for (let i = 0; i < 12; i++) { const x = 470 + (i % 6) * 132, y = 210 + Math.floor(i / 6) * 120; s += `<circle cx="${x}" cy="${y}" r="38" fill="#fff" opacity=".1"/><circle cx="${x}" cy="${y}" r="26" fill="${['#e5383b', '#f7c600', '#9b5de5', '#2e86de', '#f49ac1', '#19b3a6'][i % 6]}" opacity=".85"${ilAnim('twk', c.rr(1.6, 3), c.rr(0, 3))}/>`; }
    s += `<rect x="0" y="450" width="1600" height="40" fill="#1a2440"/><rect x="740" y="400" width="120" height="90" fill="#24335c"/>`;
    for (let row = 0; row < 3; row++) for (let i = 0; i < 6 + row; i++) {
      const sc = .7 + row * .28, y = 560 + row * 110, x = (i + .5) * 1600 / (6 + row) + (row % 2 ? 40 : 0);
      s += `<g transform="translate(${f1(x)} ${y}) scale(${f1(sc)})"><ellipse cx="0" cy="0" rx="110" ry="34" fill="#e9edf6"/><rect x="-110" y="0" width="220" height="44" fill="#c8cfdf"/>`;
      for (let k = -2; k <= 2; k++) s += `<g transform="translate(${k * 42} -18)"><path d="M-14 0 L-11 -40 Q0 -48 11 -40 L14 0 Z" fill="#141a2b"/><circle cy="-52" r="10" fill="#141a2b"/></g>`;
      s += `<circle cx="0" cy="-4" r="8" fill="#ffd27a"/><circle cx="0" cy="-4" r="40" fill="${c.rg('tl', [[0, '#ffd27a', .45], [1, '#ffd27a', 0]])}"/></g>`;
    }
    return s;
  },
  office(c) {
    let s = `<rect width="1600" height="900" fill="#1c1614"/>`;
    s += `<g><rect x="250" y="90" width="1100" height="560" fill="${c.lg('dusk', [[0, '#25204a'], [.55, '#a4506a'], [1, '#f1a35c']])}"/>`;
    s += `<svg x="250" y="300" width="1100" height="350" viewBox="0 120 1600 520" preserveAspectRatio="xMidYMax slice">${ilSkyline(c, 330, 110, '#2a2140', '#ffd58a', 30) + ilBallpark(c, { players: false, crowd: ['#ffe08a', '#8a7a9a', '#d9b24a', '#c9b0c0'] })}</svg>`;
    s += `<path d="M250 90 L1350 90 L1350 650 L250 650 Z M800 90 L800 650 M250 370 L1350 370" fill="none" stroke="#0e0a09" stroke-width="16"/></g>`;
    s += `<rect y="650" width="1600" height="250" fill="#2a1f1a"/><path d="M120 700 L1480 700 L1560 900 L40 900 Z" fill="#5a3a26"/><path d="M120 700 L1480 700 L1490 722 L110 722 Z" fill="#7a5134"/>`;
    s += `<g transform="translate(1180 640)"><path d="M0 60 L60 60 L45 0 L15 0 Z" fill="#2b2b2b"/><path d="M-30 0 L90 0 L60 -50 L0 -50 Z" fill="#e9b45a"/></g>${ilGlow(c, 'deskLamp', 1210, 640, 300, '#ffc76b', .55)}`;
    s += `<rect x="420" y="676" width="200" height="22" fill="#f0ece2" transform="rotate(-4 520 687)"/><rect x="440" y="668" width="180" height="22" fill="#e2ddd0" transform="rotate(3 530 679)"/>`;
    s += `<g transform="translate(860 662)"><circle r="26" fill="#f5f2ea"/><path d="M-14 -20 Q-4 0 -14 20 M14 -20 Q4 0 14 20" stroke="#d24b3c" stroke-width="2.5" fill="none"/><rect x="-18" y="24" width="36" height="12" fill="#6b4a2f"/></g>`;
    s += `<rect x="0" y="0" width="230" height="900" fill="#241a16"/>`;
    for (let i = 0; i < 5; i++) { s += `<rect x="20" y="${120 + i * 110}" width="190" height="8" fill="#3b2a21"/>`; for (let k = 0; k < 8; k++) s += `<rect x="${28 + k * 22}" y="${128 + i * 110 - c.rr(60, 90)}" width="16" height="${f1(c.rr(60, 90))}" fill="${c.pick(['#7a3b2e', '#2f4a6b', '#6b6b3b', '#4b3b6b', '#8a6a3a'])}" transform="translate(0 ${f1(c.rr(0, 10))})"/>`; }
    return s;
  },
  stadium(c) {
    let s = ilSky(c, [[0, '#1b2350'], [.5, '#7c4a78'], [.72, '#f0a35e']]) + ilStars(c, 20, 160);
    [[330, 1], [1270, 1], [640, .7], [960, .7]].forEach(([x, sc]) => { s += ilTower(c, x, 330, 110, sc, true); });
    s += `<path d="M120 640 L120 380 Q 800 250 1480 380 L1480 640 Z" fill="#cdbfae"/><path d="M120 380 Q 800 250 1480 380 L1480 410 Q 800 282 120 410 Z" fill="#8f7f6c"/>`;
    for (let i = 0; i < 18; i++) { const x = 170 + i * 74; const yt = 410 - Math.sin(Math.PI * (x - 120) / 1360) * 118 + 30; s += `<rect x="${x}" y="${f1(yt)}" width="44" height="${f1(600 - yt)}" rx="22" fill="#5c4f45"/><rect x="${x + 6}" y="${f1(yt + 8)}" width="32" height="${f1(560 - yt)}" rx="16" fill="#ffd89a" opacity=".55"/>`; }
    s += `<rect y="640" width="1600" height="260" fill="#6b6259"/><rect y="640" width="1600" height="12" fill="#857b70"/>`;
    for (let i = 0; i < 7; i++) { const x = 160 + i * 215; s += `<path d="M${x} 640 L${x} 420" stroke="#3a332e" stroke-width="5"/><rect x="${x + 2}" y="430" width="34" height="90" fill="${['#e5383b', '#2e86de', '#f7c600', '#19b3a6'][i % 4]}"${ilAnim('sway', c.rr(2.6, 4), c.rr(0, 4))}/>`; }
    s += ilPeople(c, 760, 70, ['#2c3e64', '#c94a4a', '#e8edf2', '#3b3b3b', '#d9b24a'], 1.3);
    return s;
  },
  dome(c) {
    let s = ilSky(c, [[0, '#04060f'], [.6, '#101a33'], [.72, '#22304d']]) + ilStars(c, 70, 300) + ilSkyline(c, 470, 160, '#0b1222', '#ffd58a', 40);
    s += `<path d="M180 560 Q 800 120 1420 560 Z" fill="${c.lg('dm', [[0, '#e9eef7'], [1, '#9aa8c0']])}"/>`;
    for (let i = 1; i < 10; i++) { const t = i / 10; s += `<path d="M${f1(180 + 1240 * t)} 560 Q ${f1(800 + (t - .5) * 500)} ${f1(150 + Math.abs(t - .5) * 120)} 800 340" stroke="#7d8aa3" stroke-width="2" fill="none" opacity=".6"/>`; }
    s += `<path d="M180 560 Q 800 120 1420 560" fill="none" stroke="#ffe8b0" stroke-width="6"${ilAnim('glow', 3, 0)}/>`;
    s += `<rect x="150" y="560" width="1300" height="110" fill="#2a3346"/><rect x="170" y="585" width="1260" height="40" fill="${c.pat('dwin', 40, 40, '<rect x="6" y="4" width="28" height="30" fill="#ffd89a"/>')}" opacity=".8"/>`;
    s += `<rect y="670" width="1600" height="230" fill="#1b2232"/>` + ilPeople(c, 790, 70, ['#2c3e64', '#c94a4a', '#e8edf2', '#3b3b3b'], 1.3);
    return s;
  },
  town1(c) {
    let s = ilSky(c, [[0, '#7fb3dd'], [.5, '#cfe2ee'], [.55, '#efe3cc']]);
    [[700, .5], [900, .5]].forEach(([x, sc]) => { s += ilTower(c, x, 455, 330, sc, false); });
    s += `<path d="M640 455 Q 800 400 960 455 Z" fill="#8c958f"/>`;
    s += ilStreet(c, { n: 4, tall: 260, bcols: ['#d6c9b4', '#c4b49c', '#e0d6c4', '#b9aa93'] });
    for (const x of [470, 1130]) s += `<path d="M${x} 900 L${x + (800 - x) * .05} 260" stroke="#6b5a4a" stroke-width="10"/><path d="M${x - 40} 300 L${x + 40} 300" stroke="#6b5a4a" stroke-width="6"/>`;
    s += `<path d="M450 300 Q 800 360 1150 300 M450 318 Q 800 380 1150 318" stroke="#3b3b3b" stroke-width="2" fill="none"/>`;
    s += `<rect x="330" y="660" width="70" height="120" rx="6" fill="#c8473a"/><rect x="342" y="676" width="46" height="50" fill="#f4e7d4"/>`;
    return s + ilPeople(c, 760, 4, ['#4a5a6a', '#8a6a4a', '#5a4a6a'], 1.4, 620, 980);
  },
  town2(c) {
    let s = ilSky(c, [[0, '#2b2c5a'], [.4, '#a2567a'], [.55, '#f0a35e']]);
    [[690, .5], [910, .5]].forEach(([x, sc]) => { s += ilTower(c, x, 455, 330, sc, true); });
    s += `<path d="M620 455 Q 800 392 980 455 Z" fill="#6f6a7a"/>`;
    s += ilStreet(c, { n: 5, tall: 280, shops: true, lit: true, bcols: ['#b9a28c', '#a68f7a', '#c9b49c'] });
    for (let i = 0; i < 4; i++) { const y = 250 + i * 60, xs = 120 + i * 150; s += ilLanterns(c, xs, y, 1600 - xs, y, 30 - i * 4, 9 - i, '#d8402f', 20 - i * 3); }
    return s + ilPeople(c, 800, 26, ['#2c3e64', '#c94a4a', '#e8edf2', '#3b3b3b', '#d9b24a', '#7a4a8a'], 1.5, 520, 1080);
  },
  town3(c) {
    let s = ilSky(c, [[0, '#3a3f78'], [.45, '#e0875a'], [.62, '#f7c46a']]) + ilGlow(c, 'sun', 420, 380, 380, '#ffe0a0', .8);
    s += ilSkyline(c, 470, 260, '#5a4a62', '#ffd58a', 25, 0, 700);
    s += `<path d="M760 520 L760 300 Q 1180 200 1600 300 L1600 520 Z" fill="#cfc3b2"/><path d="M760 300 Q 1180 200 1600 300 L1600 326 Q 1180 228 760 326 Z" fill="#8f7f6c"/>`;
    [[900, .8], [1180, 1], [1460, .8]].forEach(([x, sc]) => { s += ilTower(c, x, 300, 140, sc, true); });
    s += `<rect y="520" width="1600" height="380" fill="#c9b79a"/><path d="M0 520 L1600 520 L1600 560 L0 560 Z" fill="#b5a385"/>`;
    for (let i = 0; i < 9; i++) { const x = 60 + i * 180; s += `<rect x="${x + 10}" y="440" width="10" height="90" fill="#5b4535"/><circle cx="${x + 15}" cy="430" r="46" fill="#4f8a4a"/><circle cx="${x - 5}" cy="450" r="30" fill="#5d9a55"/>`; }
    s += ilBunting(c, 0, 1600, 470, 40, 34, ['#e5383b', '#f7c600', '#2e86de', '#19b3a6', '#f49ac1']);
    for (let i = 0; i < 5; i++) { const x = 120 + i * 320; s += `<path d="M${x - 60} 650 Q ${x} 600 ${x + 60} 650 Z" fill="${['#e5383b', '#f7c600', '#2e86de', '#19b3a6', '#f49ac1'][i]}"/><path d="M${x} 650 L${x} 720" stroke="#555" stroke-width="5"/><rect x="${x - 40}" y="700" width="80" height="12" fill="#efe6d6"/>`; }
    return s + ilPeople(c, 800, 34, ['#2c3e64', '#c94a4a', '#e8edf2', '#3b3b3b', '#d9b24a', '#7a4a8a', '#2f7a5a'], 1.4);
  },
  town4(c) {
    let s = ilSky(c, [[0, '#070a1c'], [.55, '#1c1f45'], [.7, '#3b2a5a']]) + ilStars(c, 50, 260);
    s += ilSkyline(c, 560, 420, '#121433', '#ffe0a0', 30);
    s += ilFerris(c, 330, 420, 200);
    s += `<path d="M820 560 L820 380 Q 1210 300 1600 380 L1600 560 Z" fill="#2e3550"/><path d="M820 380 Q 1210 300 1600 380" fill="none" stroke="#ffe8b0" stroke-width="5"${ilAnim('glow', 3, 1)}/>`;
    [[950, .8], [1250, 1], [1520, .8]].forEach(([x, sc]) => { s += ilTower(c, x, 380, 200, sc, true); });
    s += `<rect y="560" width="1600" height="340" fill="#1a1d33"/>`;
    for (let k = 0; k < 3; k++) { const y = 600 + k * 50; for (let i = 0; i < 40; i++) s += `<circle cx="${i * 41 + (k % 2) * 20}" cy="${y}" r="3.2" fill="${['#ffd166', '#ff6b9a', '#6be1ff', '#ffffff'][i % 4]}"${i % 2 ? ilAnim('twk', c.rr(1.2, 2.6), c.rr(0, 3)) : ''}/>`; }
    for (let i = 0; i < 6; i++) s += ilTree(c, 160 + i * 260, 760, 120, '#16402e', ['#ffe08a', '#ffffff', '#ffd166']);
    return s + ilPeople(c, 830, 60, ['#2c3e64', '#c94a4a', '#e8edf2', '#3b3b3b', '#d9b24a', '#7a4a8a'], 1.3);
  },
  ev_matsuri(c) {
    let s = ilSky(c, [[0, '#1b1840'], [.5, '#6b3a6a'], [.68, '#d97a52']]) + ilStars(c, 20, 200);
    [[260, .7], [1340, .7]].forEach(([x, sc]) => { s += ilTower(c, x, 470, 280, sc, true); });
    s += `<rect y="470" width="1600" height="430" fill="#3a2d33"/>`;
    s += `<rect x="690" y="380" width="220" height="16" fill="#6b3b22"/><rect x="700" y="396" width="200" height="200" fill="#8a4b2a"/><rect x="680" y="364" width="240" height="20" fill="#c8473a"/><path d="M700 470 L900 470" stroke="#e9d6b0" stroke-width="8"/>`;
    for (const [x1, y1] of [[0, 300], [1600, 300], [120, 150], [1480, 150]]) s += ilLanterns(c, 800, 366, x1, y1, 22, 10, '#e2483a', 15);
    s += ilStall(c, 60, 520, 260, 170, ['#e5383b', '#f6f2ea'], true) + ilStall(c, 1280, 520, 260, 170, ['#2e6fa8', '#f6f2ea'], true);
    let ppl = '';
    for (let i = 0; i < 24; i++) { const x = 380 + (i % 12) * 75 + c.rr(-10, 10), y = 760 + Math.floor(i / 12) * 70, col = c.pick(['#2f4a8a', '#c94a6a', '#3b8a6a', '#e0a040', '#6a4a9a']); ppl += `<g transform="translate(${f1(x)} ${y})"><g${ilAnim('wave', c.rr(1.2, 1.8), c.rr(0, 2))}><path d="M-18 0 L-13 -64 Q0 -74 13 -64 L18 0 Z" fill="${col}"/><rect x="-14" y="-40" width="28" height="7" fill="#f2e2b8"/><circle cy="-80" r="12" fill="#1f1714"/></g></g>`; }
    return s + ppl;
  },
  ev_hanabi(c) {
    let s = ilSky(c, [[0, '#03040c'], [.6, '#0b1030'], [.78, '#1a1d3a']]) + ilStars(c, 60, 400);
    [[300, 200, 150, '#ffd166', 4.4, 0], [760, 140, 190, '#ff6b9a', 5, 1.2], [1220, 210, 160, '#6be1ff', 4.6, 2.4], [520, 330, 100, '#b8ff8a', 3.6, 3], [1000, 330, 110, '#ffb347', 3.8, .6], [1420, 120, 90, '#ffffff', 3.4, 1.8]].forEach(a => { s += ilFirework(c, ...a); });
    s += `<path d="M0 620 L0 520 Q 800 430 1600 520 L1600 620 Z" fill="#101827"/><path d="M0 520 Q 800 430 1600 520" fill="none" stroke="#ffd58a" stroke-width="3" opacity=".55"/>`;
    for (let i = 0; i < 40; i++) { const x = i * 40 + 20, y = 545 - Math.sin(Math.PI * x / 1600) * 60; s += `<circle cx="${x}" cy="${f1(y)}" r="2.2" fill="#ffd58a" opacity=".6"/>`; }
    [[220, .8], [1380, .8]].forEach(([x, sc]) => { s += ilTower(c, x, 520, 330, sc, false); });
    s += `<rect y="620" width="1600" height="280" fill="#05070c"/>` + ilFans(c, 760, 14, '#020306', null);
    return s;
  },
  ev_gourmet(c) {
    let s = ilSky(c, [[0, '#4a9ad8'], [.5, '#a8d4ef'], [.55, '#d8ecf6']]) + ilGlow(c, 'sun', 1350, 80, 220, '#fff6c8', .85);
    s += `<path d="M300 460 L300 300 Q 800 230 1300 300 L1300 460 Z" fill="#d6cbbb"/><path d="M300 300 Q 800 230 1300 300 L1300 322 Q 800 252 300 322 Z" fill="#9a8a76"/>`;
    [[420, .7], [1180, .7]].forEach(([x, sc]) => { s += ilTower(c, x, 300, 170, sc, false); });
    s += `<rect y="460" width="1600" height="440" fill="#d9c9a8"/>`;
    s += ilBunting(c, 0, 1600, 420, 50, 38, ['#e5383b', '#f7c600', '#2e86de', '#19b3a6', '#f49ac1', '#ffffff']);
    const cols = [['#e5383b', '#fff2e0'], ['#2e86de', '#ffffff'], ['#19b3a6', '#f6f2ea'], ['#f7a600', '#fff']];
    for (let i = 0; i < 5; i++) { const x = 40 + i * 320; s += ilStall(c, x, 520, 240, 160, cols[i % 4], false); s += `<g opacity=".45">${[0, 1, 2].map(k => `<circle cx="${x + 80 + k * 40}" cy="508" r="${10 + k * 3}" fill="#fff"${ilAnim('rise', c.rr(3, 5), c.rr(0, 5))}/>`).join('')}</g>`; }
    return s + ilPeople(c, 810, 40, ['#2c3e64', '#c94a4a', '#e8edf2', '#3b3b3b', '#d9b24a', '#7a4a8a', '#2f7a5a'], 1.4);
  },
  ev_music(c) {
    let s = ilSky(c, [[0, '#05030f'], [.6, '#1a0f33'], [1, '#2a1240']]);
    const beams = ['#ff4fa3', '#4fd6ff', '#ffd14f', '#9b6bff', '#4fff9b'];
    for (let i = 0; i < 10; i++) { const x = 300 + i * 110; s += `<path d="M${x - 10} 330 L${x + 10} 330 L${x + 240} -60 L${x - 240} -60 Z" fill="${beams[i % 5]}" opacity=".16"${ilAnim('beam', c.rr(3, 6), c.rr(0, 6))}/>`; }
    s += `<path d="M260 330 L1340 330 L1340 350 L260 350 Z M280 330 L280 640 M1320 330 L1320 640" stroke="#9aa0b4" stroke-width="12" fill="#9aa0b4"/>`;
    s += `<rect x="560" y="380" width="480" height="210" fill="${c.lg('scr', [[0, '#ff4fa3'], [.5, '#9b6bff'], [1, '#4fd6ff']], 1, 0)}" opacity=".85"${ilAnim('glow', 2.4, 0)}/>`;
    s += `<rect x="240" y="600" width="1120" height="60" fill="#1d1d2a"/>` + ilGlow(c, 'stage', 800, 600, 600, '#ff4fa3', .35);
    let crowd = '';
    for (let i = 0; i < 34; i++) { const x = i * 48 + c.rr(-8, 8), y = 760 + c.rr(0, 60); crowd += `<g transform="translate(${f1(x)} ${f1(y)})"><rect x="-22" y="0" width="44" height="160" rx="18" fill="#05040a"/><circle cy="-10" r="16" fill="#05040a"/>${c.r() < .55 ? `<path d="M14 6 L30 -60" stroke="#05040a" stroke-width="10" stroke-linecap="round"${ilAnim('wave', c.rr(.8, 1.4), c.rr(0, 1.4))}/>` : ''}</g>`; }
    return s + crowd;
  },
  ev_xmas(c) {
    let s = ilSky(c, [[0, '#060a1c'], [.6, '#16224a'], [.75, '#2a3a63']]) + ilStars(c, 50, 300);
    s += `<path d="M900 470 L900 300 Q 1250 230 1600 300 L1600 470 Z" fill="#3a4766"/>`;
    [[1060, .7], [1460, .7]].forEach(([x, sc]) => { s += ilTower(c, x, 300, 170, sc, true); });
    s += `<rect y="470" width="1600" height="430" fill="#dfe8f2"/><rect y="470" width="1600" height="430" fill="${c.lg('snowsh', [[0, '#9fb2cc', .5], [1, '#fff', 0]])}"/>`;
    s += ilTree(c, 560, 700, 440, '#174a35', ['#ffe08a', '#ff6b6b', '#6be1ff', '#ffffff', '#ffd166']) + `<path d="M560 240 l14 30 33 4 -24 22 6 33 -29 -16 -29 16 6 -33 -24 -22 33 -4 Z" fill="#ffd166"${ilAnim('twk', 1.8, 0)}/>`;
    for (const [x, h] of [[200, 220], [330, 180], [860, 200], [1000, 160], [1250, 230], [1420, 190]]) s += ilTree(c, x, 720, h, '#1d5a40', ['#ffe08a', '#ffffff', '#6be1ff']);
    s += ilLanterns(c, 0, 470, 1600, 470, 30, 30, '#ffe08a', 5);
    return s + ilPeople(c, 830, 30, ['#2c3e64', '#c94a4a', '#3b3b3b', '#7a4a8a', '#e8edf2'], 1.3) + ilFall(c, 70, 'snow');
  }
};
/* 場面の SVG（なければ空） */
function ilScene(k) {
  if (IL_CACHE[k] !== undefined) return IL_CACHE[k];
  const f = IL_SCENES[k]; if (!f) return (IL_CACHE[k] = '');
  try { const c = ilCtx(k); IL_CACHE[k] = ilSvg(c, f(c)); } catch (e) { console.error(e); IL_CACHE[k] = ''; }
  return IL_CACHE[k];
}
