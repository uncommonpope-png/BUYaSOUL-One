// Seed/upsert the 251-soul catalog into Supabase `products`.
//
//   SUPABASE_URL=https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY=service-role-key  (never used by the app; CI only)
//   npm run seed -- data/catalog.json
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = process.argv[2] || path.join(HERE, 'data', 'catalog.json');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY.');
  process.exit(1);
}

// Kneel where the price table already lives: fixed-price flags on the hero
// items that previously sold on the Shopify storefront. Everything else is PWYP.
const FIXED = {
  'the-profit-lovetax-family.zip': 2999, // Workbench 1.0.0 — $29.99
  'scribe.zip': 2999,                    // SCRIBE Soul — $29.99
  'workbench.zip': 2999
};

function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function suggest(type) {
  switch (type) {
    case 'pack':
    case 'soul':
      return 199;
    default:
      return 99;
  }
}

const raw = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
if (!Array.isArray(raw)) {
  console.error(`catalog.json at ${catalogPath} is not an array.`);
  process.exit(1);
}

const seen = new Set();
const products = raw.map((item, i) => {
  let slug = slugify(item.name || item.file || 'soul-' + i);
  while (seen.has(slug)) slug = slug + '-' + i;
  seen.add(slug);

  const fixedCents = FIXED[item.file];
  const mode = fixedCents ? 'fixed' : 'pwyp';
  return {
    slug,
    name: String(item.name || item.file || slug),
    type: String(item.type || 'soul'),
    icon: item.icon || '',
    image: item.image || '',
    desc: item.desc || '',
    details: item.details || '',
    mode,
    price_cents: fixedCents || null,
    suggested_cents: item.suggested ? item.suggested : suggest(item.type),
    min_cents: item.min ? item.min : 0,
    license: item.license || 'BUYASOUL-{key}',
    payout_pct: item.payout_pct || 60,
    featured: !!item.featured,
    tags: Array.isArray(item.tags) ? item.tags : [],
    contents: Array.isArray(item.contents) ? item.contents : [],
    requirements: item.requirements || '',
    install: item.install || '',
    version: item.version || '',
    size: item.size || '',
    download: item.download || item.file || '',
    sort: i,
    active: true
  };
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const { data, error } = await supabase.from('products').upsert(products, {
  onConflict: 'slug'
});
if (error) {
  console.error('seed failed:', error.message);
  process.exit(1);
}
console.log(`seeded ${products.length} products → Supabase (${SUPABASE_URL})`);
process.exit(0);