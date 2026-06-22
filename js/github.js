/* github.js — GitHub API adapter for CodeClean (ported from Arcflow) */

function buildGitHubApiUrl(segments, query) {
  var path = segments.filter(s => s != null && s !== '').map(s => encodeURIComponent(String(s))).join('/');
  var url = 'https://api.github.com/' + path;
  if (!query) return url;
  var params = new URLSearchParams();
  Object.keys(query).forEach(k => { if (query[k] != null && query[k] !== '') params.set(k, String(query[k])); });
  var qs = params.toString();
  return qs ? url + '?' + qs : url;
}

function buildRepoApiUrl(owner, repo, segments, query) {
  return buildGitHubApiUrl(['repos', owner, repo].concat(segments || []), query);
}

function decodeBase64Utf8(content) {
  var normalized = String(content || '').replace(/\s+/g, '');
  if (!normalized) return null;
  var binary = atob(normalized);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  try { return new TextDecoder('utf-8').decode(bytes); } catch (e) {
    var text = '';
    for (var j = 0; j < bytes.length; j++) text += String.fromCharCode(bytes[j]);
    return text;
  }
}

function parseGitHubUrl(url) {
  if (!url || typeof url !== 'string') return null;
  url = url.trim();
  var m = url.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
  if (m) return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
  var simple = url.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (simple) return { owner: simple[1], repo: simple[2] };
  return null;
}

var CC_SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.venv', 'venv',
  'env', 'target', 'vendor', 'coverage', '.nyc_output', 'out', 'bin', 'obj',
]);
var CC_SKIP_EXTS = new Set([
  'png','jpg','jpeg','gif','svg','ico','webp','mp4','mp3','woff','woff2','ttf','eot',
  'pdf','zip','gz','tar','map','lock','sum','mod',
]);

function ghShouldSkip(path) {
  var parts = path.split('/');
  if (parts.some(p => CC_SKIP_DIRS.has(p))) return true;
  var ext = parts[parts.length - 1].split('.').pop().toLowerCase();
  return CC_SKIP_EXTS.has(ext);
}

var GitHub = {
  token: '',
  rateLimit: { remaining: 60, limit: 60, reset: 0 },
  requestTimeoutMs: 15000,

  request: function(url, options, errorMap) {
    var self = this;
    var h = Object.assign({ 'Accept': 'application/vnd.github.v3+json' }, (options && options.headers) || {});
    if (this.token && !h.Authorization) h.Authorization = 'Bearer ' + this.token;
    var controller = new AbortController();
    var tid = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    return fetch(url, Object.assign({}, options || {}, { headers: h, signal: controller.signal }))
      .then(r => {
        var rem = r.headers.get('x-ratelimit-remaining');
        if (rem !== null) self.rateLimit.remaining = parseInt(rem, 10);
        if (!r.ok) {
          throw new Error(
            errorMap && errorMap[r.status] ? errorMap[r.status] :
            r.status === 401 ? 'Invalid token — check your PAT' :
            r.status === 403 ? 'Rate limited. Add a GitHub token for 5,000 req/hour' :
            r.status === 404 ? 'Repository not found or private' :
            'GitHub error ' + r.status
          );
        }
        return r.json();
      })
      .catch(err => { if (err && err.name === 'AbortError') throw new Error('Request timed out'); throw err; })
      .finally(() => clearTimeout(tid));
  },

  getFile: function(owner, repo, path) {
    return this.request(buildRepoApiUrl(owner, repo, ['contents'].concat(path.split('/').filter(Boolean))))
      .then(d => d.content ? decodeBase64Utf8(d.content) : null)
      .catch(() => null);
  },

  // Fast: single request for all file paths using Git Trees API
  scanTree: function(owner, repo, onProgress) {
    var self = this;
    if (onProgress) onProgress('Fetching repository info…');
    return this.request(buildRepoApiUrl(owner, repo))
      .then(repo => {
        var branch = repo.default_branch || 'main';
        if (onProgress) onProgress('Loading file tree (' + branch + ')…');
        return self.request(buildRepoApiUrl(owner, repo.name || repo, ['git', 'trees', branch], { recursive: 1 }));
      })
      .then(tree => {
        if (!tree.tree) throw new Error('Invalid tree response');
        var files = [];
        tree.tree.forEach(item => {
          if (item.type !== 'blob') return;
          if (ghShouldSkip(item.path)) return;
          var name = item.path.includes('/') ? item.path.substring(item.path.lastIndexOf('/') + 1) : item.path;
          var folder = item.path.includes('/') ? item.path.substring(0, item.path.lastIndexOf('/')) : '';
          files.push({ path: item.path, name, folder, size: item.size || 0 });
        });
        if (onProgress) onProgress('Found ' + files.length + ' files');
        return files;
      });
  },

  // Fallback: recursive scan via Contents API
  scanRecursive: function(owner, repo, onProgress, path, depth) {
    var self = this;
    path = path || ''; depth = depth || 0;
    if (depth > 10) return Promise.resolve([]);
    return this.request(buildRepoApiUrl(owner, repo, ['contents'].concat(path ? path.split('/').filter(Boolean) : [])))
      .then(contents => {
        var files = [];
        var promises = [];
        contents.forEach(item => {
          if (item.type === 'file' && !ghShouldSkip(item.path)) {
            files.push({ path: item.path, name: item.name, folder: item.path.includes('/') ? item.path.substring(0, item.path.lastIndexOf('/')) : '', size: item.size });
          } else if (item.type === 'dir' && !CC_SKIP_DIRS.has(item.name)) {
            if (onProgress) onProgress('Scanning ' + item.path + '…');
            promises.push(self.scanRecursive(owner, repo, onProgress, item.path, depth + 1).catch(() => []));
          }
        });
        return Promise.all(promises).then(results => { results.forEach(r => { files = files.concat(r); }); return files; });
      })
      .catch(e => { if (depth === 0) throw e; return []; });
  },

  scan: function(owner, repo, onProgress) {
    var self = this;
    return this.scanTree(owner, repo, onProgress)
      .catch(() => {
        if (onProgress) onProgress('Fallback: scanning recursively…');
        return self.scanRecursive(owner, repo, onProgress);
      });
  },
};

window.GitHub = GitHub;
window.parseGitHubUrl = parseGitHubUrl;
