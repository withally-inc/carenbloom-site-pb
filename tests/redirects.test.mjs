import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Normalize both deployment contracts, including their permanent redirect status.
// Preserve input query parameters unless a destination explicitly replaces them.
const cloudflare = readFileSync(new URL('../_redirects', import.meta.url), 'utf8').split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#')).map((s) => {
  const [source, destination, code] = s.split(/\s+/);
  return { source, destination, status: Number(code) };
});
const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url))).redirects.map((rule) => ({
  source: rule.source.replace(':path*', '*'), destination: rule.destination.replace(':path*', ':splat'), status: rule.statusCode ?? (rule.permanent ? 308 : 307),
}));
function resolve(rules, path) {
  const url = new URL(path, 'https://carenbloom.com');
  for (const rule of rules) {
    const wildcard = rule.source.endsWith('*');
    const prefix = wildcard ? rule.source.slice(0, -1) : rule.source;
    if (wildcard ? !url.pathname.startsWith(prefix) : url.pathname !== prefix) continue;
    const destination = rule.destination.replace(':splat', url.pathname.slice(prefix.length));
    const target = new URL(destination, url.origin);
    if (!target.search) target.search = url.search;
    return { status: rule.status, destination: target.pathname + target.search + target.hash };
  }
  return null;
}
for (const [provider, rules] of [['Cloudflare', cloudflare], ['Vercel', vercel]]) {
  test(`${provider} preserves legacy routes and their queries without swallowing unknown paths`, () => {
    for (const path of ['/talents', '/talents/']) {
      assert.deepEqual(resolve(rules, path + '?source=legacy'), { status: 301, destination: '/careers/?source=legacy' });
    }
    for (const path of ['/pb-live', '/pb-live/']) {
      assert.deepEqual(resolve(rules, path + '?source=legacy'), { status: 308, destination: '/?source=legacy' });
    }
    assert.deepEqual(resolve(rules, '/talents/apply?role=chief-of-staff&source=legacy'), { status: 301, destination: '/careers/apply?role=chief-of-staff&source=legacy' });
    assert.equal(resolve(rules, '/genuinely-unknown-route'), null);
  });
}
