// src/ をまとめて1ファイルの index.html を作る
const fs = require('fs'); const path = require('path');
const src = path.join(__dirname, 'src');
const read = f => fs.readFileSync(f, 'utf8');
const js = ['core', 'ui'].flatMap(d => fs.readdirSync(path.join(src, d)).filter(f => f.endsWith('.js')).sort().map(f => read(path.join(src, d, f)))).join('\n');
const css = read(path.join(src, 'style.css'));
let html = read(path.join(src, 'template.html'));
html = html.replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js.replace(/<\/script/gi, '<\\/script'));
// 出力先：引数があればそのパス（例：node build.js index.html）、なければ dist/index.html
const out = path.resolve(__dirname, process.argv[2] || path.join('dist', 'index.html'));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(path.relative(__dirname, out), (html.length / 1024).toFixed(0) + 'KB');
