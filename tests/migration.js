// Checks for the GIGO migration: every file a page references exists, no runtime dependency on the GIGO repo,
// and src/project-lab rebuilds the committed projects.html byte for byte.
var fs = require('fs'), path = require('path'), cp = require('child_process');
var root = path.join(__dirname, '..'), fails = 0;
function ok(c, m) { console.log((c ? 'ok    ' : 'FAIL  ') + m); if (!c) fails++; }
['index.html', 'play.html', 'projects.html', 'learn.html'].forEach(function (p) {
  var dir = path.join(root, 'gigo'), h = fs.readFileSync(path.join(dir, p), 'utf8'), re = /(?:src|href)="([^"#?]+\.(?:js|css|png|jpg|svg))"/g, m, n = 0, miss = [];
  while ((m = re.exec(h))) { n++; if (!fs.existsSync(path.join(dir, m[1]))) miss.push(m[1]); }
  ok(n > 0 && !miss.length, 'gigo/' + p + ': ' + n + ' referenced files exist' + (miss.length ? ' (missing ' + miss.join(', ') + ')' : ''));
});
function walk(d, out) { fs.readdirSync(d).forEach(function (f) { var q = path.join(d, f); if (fs.statSync(q).isDirectory()) { if (f !== 'tests') walk(q, out); } else if (/\.(js|html|css)$/.test(f)) out.push(q); }); return out; }
var runtime = walk(path.join(root, 'gigo'), []).concat(['index.html', 'projects.html'].map(function (f) { return path.join(root, f); }));
var bad = runtime.filter(function (f) { return /datamakergh\.github\.io\/GIGO|github\.com\/Datamakergh\/GIGO/i.test(fs.readFileSync(f, 'utf8')); });
ok(!bad.length, 'no runtime reference to the GIGO repo or its Pages site' + (bad.length ? ': ' + bad.join(', ') : ''));
var before = fs.readFileSync(path.join(root, 'projects.html'));
cp.execSync('python3 build.py', { cwd: path.join(root, 'src', 'project-lab') });
ok(Buffer.compare(before, fs.readFileSync(path.join(root, 'projects.html'))) === 0, 'src/project-lab rebuilds projects.html identically');
ok(/gigo\/play\.html/.test(fs.readFileSync(path.join(root, 'projects.html'), 'utf8')), 'Project Lab lists the GIGO scenes');
console.log(fails ? '\n' + fails + ' failed' : '\nall passed'); process.exit(fails ? 1 : 0);
