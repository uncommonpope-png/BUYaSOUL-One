const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\Users\\uncom\\Desktop\\genesis-foundation';
const exts = new Set(['glb','gltf','png','jpg','jpeg','jfif','webp','mp4','mp3','json','hdr','ktx2','bin']);

// 1. Gather every asset path referenced in code
const refRe = /(?:assets|covers)[\w\-./\\ ]+\.(?:glb|gltf|png|jpg|jpeg|jfif|webp|mp4|mp3|json|hdr|ktx2|bin)/gi;
const referenced = new Set();
function scan(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules','.git'].includes(e.name)) continue;
      scan(fp);
    } else if (/\.(html|js|json|md|cjs)$/i.test(e.name)) {
      let txt;
      try { txt = fs.readFileSync(fp, 'utf8'); } catch (_) { continue; }
      let m;
      while ((m = refRe.exec(txt))) {
        referenced.add(m[0].replace(/\\/g, '/').toLowerCase());
      }
    }
  }
}
scan(ROOT);

// 2. Enumerate actual asset files on disk
function listAssets(dir, base) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listAssets(fp, path.join(base, e.name)));
    else if (exts.has(e.name.split('.').pop().toLowerCase())) out.push({ rel: path.join(base, e.name).replace(/\\/g,'/').toLowerCase(), size: fs.statSync(fp).size });
  }
  return out;
}
const files = [...listAssets(path.join(ROOT, 'assets'), 'assets'), ...listAssets(path.join(ROOT, 'covers'), 'covers')];

// 3. Match: a file is USED if any referenced token is a suffix of its path (or equal)
function isUsed(rel) {
  for (const r of referenced) {
    if (rel === r || rel.endsWith('/' + r) || rel.includes(r)) return true;
  }
  return false;
}
const used = files.filter(f => isUsed(f.rel));
const dead = files.filter(f => !isUsed(f.rel));

// Output only the relative paths of dead files
dead.forEach(f => console.log(f.rel));
