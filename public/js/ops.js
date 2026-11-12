// Tiny path-based patch language, shared by server (authoritative) and browser (optimistic).
// op: set | merge | push | upsert | remove | del
const BAD = new Set(['__proto__', 'constructor', 'prototype']);

function walk(root, path, create) {
  let cur = root;
  for (let i = 0; i < path.length; i++) {
    const k = path[i];
    if (BAD.has(k)) throw new Error('bad path');
    if (cur[k] === undefined || cur[k] === null) {
      if (!create) return undefined;
      cur[k] = typeof path[i + 1] === 'number' ? [] : {};
    }
    cur = cur[k];
  }
  return cur;
}

export function applyOps(doc, ops) {
  for (const o of ops) {
    const path = o.path || [];
    switch (o.op) {
      case 'set': {
        if (!path.length) throw new Error('empty path');
        const parent = walk(doc, path.slice(0, -1), true);
        const k = path[path.length - 1];
        if (BAD.has(k)) throw new Error('bad path');
        parent[k] = o.value;
        break;
      }
      case 'merge': {
        const t = walk(doc, path, true);
        for (const [k, v] of Object.entries(o.value || {})) {
          if (BAD.has(k)) continue;
          t[k] = v;
        }
        break;
      }
      case 'push': {
        const parent = walk(doc, path.slice(0, -1), true);
        const k = path[path.length - 1];
        if (!Array.isArray(parent[k])) parent[k] = [];
        parent[k].push(o.value);
        break;
      }
      case 'upsert': {
        const parent = walk(doc, path.slice(0, -1), true);
        const k = path[path.length - 1];
        if (!Array.isArray(parent[k])) parent[k] = [];
        const key = o.key || 'id';
        const i = parent[k].findIndex((x) => x && x[key] === o.value[key]);
        if (i >= 0) parent[k][i] = o.value; else parent[k].push(o.value);
        break;
      }
      case 'remove': {
        const parent = walk(doc, path.slice(0, -1), false);
        if (!parent) break;
        const k = path[path.length - 1];
        if (Array.isArray(parent[k])) parent[k] = parent[k].filter((x) => !(x && x[o.key || 'id'] === o.id));
        break;
      }
      case 'del': {
        const parent = walk(doc, path.slice(0, -1), false);
        if (!parent) break;
        const k = path[path.length - 1];
        if (Array.isArray(parent) && typeof k === 'number') parent.splice(k, 1); else delete parent[k];
        break;
      }
      default:
        throw new Error('unknown op ' + o.op);
    }
  }
  return doc;
}
