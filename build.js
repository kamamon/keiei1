// src/ をまとめて1ファイルの index.html を作る（場面の画像は img/ に置き、ここで一覧を埋め込む）
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const src = path.join(__dirname, 'src');
const read = f => fs.readFileSync(f, 'utf8');
const js = ['core', 'ui'].flatMap(d => fs.readdirSync(path.join(src, d)).filter(f => f.endsWith('.js')).sort().map(f => read(path.join(src, d, f)))).join('\n');
const css = read(path.join(src, 'style.css'));
// 出力先：引数があればそのパス（例：node build.js index.html）、なければ dist/index.html
const out = path.resolve(__dirname, process.argv[2] || path.join('dist', 'index.html'));
const outDir = path.dirname(out);
// img/ にある画像の一覧（ファイルが変わったらキャッシュを更新できるよう、中身から短い印をつける）
const imgDir = path.join(__dirname, 'img');
const imgs = fs.existsSync(imgDir) ? fs.readdirSync(imgDir).filter(f => /\.(jpe?g|png|webp)$/i.test(f)).sort() : [];
const art = {};
for (const f of imgs) {
  const buf = fs.readFileSync(path.join(imgDir, f));
  art[f.replace(/\.[^.]+$/, '')] = 'img/' + f + '?v=' + crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);
  if (path.resolve(outDir) !== path.resolve(__dirname)) { fs.mkdirSync(path.join(outDir, 'img'), { recursive: true }); fs.copyFileSync(path.join(imgDir, f), path.join(outDir, 'img', f)); }
}
const tpl = read(path.join(src, 'template.html'));
fs.mkdirSync(outDir, { recursive: true });
/* 日本版（index.html）と、メジャー版から始まる mlb.html を作る（中身は同じで、最初に選ばれているリーグだけ違う） */
function emit(file, mlb) {
  let html = tpl;
  const head = 'const ART_FILES = ' + JSON.stringify(art) + ';\n' + (mlb ? "const START_LEAGUE = 'mlb';\n" : '');
  if (mlb) html = html.replace('<title>球団社長 プロ野球経営シミュレーション</title>', '<title>球団社長 メジャーリーグ経営シミュレーション</title>')
    .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="162試合・地区制・年俸調停・FA・ぜいたく税・ドラフトまで、メジャーリーグ球団のすべてを動かす経営シミュレーションゲーム">');
  html = html.replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => (head + js).replace(/<\/script/gi, '<\\/script'));
  fs.writeFileSync(file, html);
  console.log(path.relative(__dirname, file), (html.length / 1024).toFixed(0) + 'KB', '画像', imgs.length + '枚');
}
emit(out, false);
emit(path.join(outDir, 'mlb.html'), true);
