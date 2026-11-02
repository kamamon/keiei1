// src/ をまとめて dist/index.html（1ファイル）を作る
const fs = require('fs'); const path = require('path');
const src = path.join(__dirname, 'src');
const read = f => fs.readFileSync(f, 'utf8');
const js = ['core', 'ui'].flatMap(d => fs.readdirSync(path.join(src, d)).filter(f => f.endsWith('.js')).sort().map(f => read(path.join(src, d, f)))).join('\n');
const css = read(path.join(src, 'style.css'));
let html = read(path.join(src, 'template.html'));
html = html.replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js.replace(/<\/script/gi, '<\\/script'));
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'index.html'), html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + 'KB');
