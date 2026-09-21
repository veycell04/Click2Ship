import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const site = 'https://www.shipdime.com';
const store = 'https://chromewebstore.google.com/detail/shipdime/efjokppnnolhmjgmdokogmacmcojglek';
const oldId = ['bigbipcdmphkgaa', 'jnjkhjdnkidcmplmg'].join('');
const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true }))
  .map((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : path.join(dir, entry.name)))).flat();
const decode = (value) => value.replace(/&(?:amp|quot|apos|lt|gt|nbsp|#\d+|#x[\da-f]+);/gi, (entity) => {
  const named = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' };
  return named[entity] ?? String.fromCodePoint(entity.startsWith('&#x') ? parseInt(entity.slice(3), 16) : parseInt(entity.slice(2), 10));
});
const plain = (value) => decode(value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], decode(m[2])]));

// Start the built app on an unused local port; never contact production to mutate it.
const reservation = net.createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
server.stdout.on('data', (data) => { output += data; });
server.stderr.on('data', (data) => { output += data; });
const base = `http://127.0.0.1:${port}`;
const get = (route, options = {}) => fetch(new URL(route, base), { ...options, signal: AbortSignal.timeout(15000) });
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(output);
    try { ready = (await get('/')).ok; } catch { /* Wait for startup. */ }
    if (ready) break;
    await delay(300);
  }
  assert(ready, `Production server did not start: ${output}`);
  const files = (await walk('.next/server/app')).filter((f) => f.endsWith('.html') && !f.includes('_not-found'));
  const links = new Set();
  const images = new Set();
  const renderedPages = new Map();
  let jsonLdCount = 0;
  let faqCount = 0;
  for (const file of files) {
    let route = '/' + path.relative('.next/server/app', file).replaceAll('\\', '/').replace(/\.html$/, '');
    if (route === '/index') route = '/';
    const response = await get(route);
    assert.equal(response.status, 200, route);
    const html = await response.text();
    renderedPages.set(route, html);
    assert(!html.includes(oldId), `${route}: old extension ID`);
    const meta = Object.fromEntries([...html.matchAll(/<meta\b[^>]*>/g)].map((m) => { const a = attrs(m[0]); return [a.property ?? a.name, a.content]; }));
    const canonical = [...html.matchAll(/<link\b[^>]*>/g)].map((m) => attrs(m[0])).filter((a) => a.rel === 'canonical');
    assert.equal(canonical.length, 1, `${route}: canonical count`);
    assert.equal(new URL(canonical[0].href).href, new URL(site + route).href, `${route}: canonical`);
    assert(!/noindex/i.test(meta.robots ?? ''), `${route}: noindex`);
    assert.equal(meta['twitter:card'], 'summary_large_image', route);
    assert.equal(meta['og:site_name'], 'ShipDime', route);
    for (const key of ['og:title', 'og:description', 'og:url', 'og:type', 'og:image', 'twitter:title', 'twitter:description', 'twitter:image']) assert(meta[key], `${route}: missing ${key}`);
    assert.equal(meta['twitter:title'], meta['og:title'], `${route}: inconsistent social title`);
    for (const key of ['og:image', 'twitter:image']) {
      assert(meta[key].startsWith(site + '/opengraph-image'), `${route}: invalid ${key}`);
      images.add(new URL(meta[key]).pathname + new URL(meta[key]).search);
    }
    const schemas = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    assert.equal(schemas.filter((s) => s['@type'] === 'Organization').length, 1, route);
    assert.equal(schemas.filter((s) => s['@type'] === 'SoftwareApplication').length, 1, route);
    assert(schemas.filter((s) => s['@type'] === 'FAQPage').length <= 1, route);
    const checkValues = (value) => {
      assert(value !== undefined && value !== null && value !== '', `${route}: empty JSON-LD value`);
      if (typeof value === 'object') Object.values(value).forEach(checkValues);
      if (typeof value === 'number') assert(Number.isFinite(value));
    };
    const visible = plain(html);
    for (const schema of schemas) {
      checkValues(schema);
      assert.equal(schema['@context'], 'https://schema.org');
      assert(['Organization', 'SoftwareApplication', 'FAQPage', 'BreadcrumbList'].includes(schema['@type']));
      assert(!('aggregateRating' in schema) && !('review' in schema));
      if (schema['@type'] === 'SoftwareApplication') {
        assert.equal(schema.publisher['@id'], site + '/#organization');
        assert.equal(schema.installUrl, store);
      }
      if (schema['@type'] === 'FAQPage') for (const question of schema.mainEntity) {
        assert.equal(question['@type'], 'Question');
        assert.equal(question.acceptedAnswer['@type'], 'Answer');
        assert(visible.includes(plain(question.name)), `${route}: FAQ question missing from page`);
        assert(visible.includes(plain(question.acceptedAnswer.text)), `${route}: FAQ answer missing from page`);
        faqCount++;
      }
      jsonLdCount++;
    }
    for (const match of html.matchAll(/<(?:a|link|img|source|script)\b[^>]*>/g)) {
      const a = attrs(match[0]);
      const ref = a.href ?? a.src;
      if (!ref || /^(mailto:|tel:|data:)/.test(ref)) continue;
      const url = new URL(ref, site + route);
      if (url.origin === site) links.add(url.pathname + url.search);
    }
  }
  for (const link of links) {
    const response = await get(link, { method: link.startsWith('/_next/image?') ? 'GET' : 'HEAD' });
    assert.equal(response.status, 200, `Broken link/asset: ${link}; ${response.ok ? '' : await response.text()}`);
  }
  for (const route of images) {
    const response = await get(route);
    assert.equal(response.status, 200, route);
    assert(response.headers.get('content-type')?.includes('image/png'));
    const png = Buffer.from(await response.arrayBuffer());
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
    await writeFile(path.join(os.tmpdir(), 'shipdime-social-preview.png'), png);
  }
  const expectedHeaders = {
    'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'cross-origin-opener-policy': 'same-origin-allow-popups',
  };
  for (const route of ['/', '/cheap-shipping-labels', '/cookie-policy', '/llms.txt', '/llms-full.txt', '/ai.txt', '/robots.txt', '/sitemap.xml']) {
    const response = await get(route);
    assert.equal(response.status, 200, route);
    for (const [key, value] of Object.entries(expectedHeaders)) assert.equal(response.headers.get(key), value, `${route}: ${key}`);
    const csp = response.headers.get('content-security-policy');
    for (const required of ["object-src 'none'", "frame-ancestors 'none'", 'https://www.googletagmanager.com', 'https://www.googleadservices.com']) assert(csp?.includes(required), `${route}: CSP ${required}`);
    assert(!response.headers.get('cache-control')?.includes('immutable'), `${route}: immutable content`);
    if (route.endsWith('.txt')) assert(response.headers.get('content-type')?.includes('text/plain'), route);
  }
  for (const route of ['/icon48.png', '/icon128.png', '/videos/shipdime-demo.mp4']) {
    assert.equal((await get(route, { method: 'HEAD' })).headers.get('cache-control'), 'public, max-age=3600, must-revalidate');
  }
  const hashed = [...links].find((link) => link.startsWith('/_next/static/') && link.endsWith('.js'));
  assert(hashed);
  assert((await get(hashed)).headers.get('cache-control')?.includes('immutable'));
  const robots = await (await get('/robots.txt')).text();
  assert(robots.includes('Allow: /') && robots.includes(`${site}/sitemap.xml`));
  const sitemap = await (await get('/sitemap.xml')).text();
  for (const route of renderedPages.keys()) assert(sitemap.includes(`<loc>${site}${route === '/' ? '' : route}</loc>`), `Missing sitemap route: ${route}`);
  for (const route of ['/llms.txt', '/llms-full.txt', '/ai.txt']) {
    const text = await (await get(route)).text();
    assert(!text.includes('<html') && !text.includes(oldId), route);
    for (const link of text.matchAll(/https:\/\/www\.shipdime\.com[^\s\][()<>]*/g)) {
      assert.equal((await get(new URL(link[0].replace(/[.,;]+$/, '')).pathname, { method: 'HEAD' })).status, 200, link[0]);
    }
  }
  const layout = await readFile('app/layout.tsx', 'utf8');
  assert.equal((layout.match(/src="https:\/\/www\.googletagmanager\.com\/gtag\/js/g) ?? []).length, 1);
  assert.equal((layout.match(/gtag\('config', 'AW-18426517051'\)/g) ?? []).length, 1);
  console.log(JSON.stringify({ pages: files.length, jsonLdBlocks: jsonLdCount, visibleFaqs: faqCount,
    internalLinksAndAssets: links.size, socialImage: '1200x630 PNG', headers: 'passed', staticCaching: 'passed',
    aiFiles: 'passed', canonicals: 'passed', sitemap: 'passed', googleTag: 'one unchanged loader/config',
    socialPreview: path.join(os.tmpdir(), 'shipdime-social-preview.png') }, null, 2));
} finally {
  server.kill();
}
