import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_KEY,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  HELIUS_WEBHOOK_SECRET,
  ASSET_BASE
} = process.env;

const PRODUCT_CACHE_MS = 5 * 60 * 1000;
const ASSET_BASE_URL = ASSET_BASE || 'https://uncommonpope-png.github.io/soul-economy/';

function fail(res, status, code, hint) {
  return res.status(status).json({ ok: false, error: code, hint: hint || '' });
}

function makeLicense() {
  const hex = crypto.randomBytes(16).toString('hex').toUpperCase();
  return 'BUYASOUL-' + hex.match(/.{1,4}/g).join('-');
}

function renderProduct(p) {
  return {
    slug: p.slug,
    name: p.name,
    type: p.type,
    icon: p.icon,
    image: p.image,
    desc: p.desc,
    details: p.details,
    mode: p.mode,
    price_cents: p.price_cents,
    suggested_cents: p.suggested_cents,
    min_cents: p.min_cents || 0,
    license: p.license,
    payout_pct: p.payout_pct,
    featured: p.featured,
    tags: p.tags || [],
    version: p.version,
    size: p.size,
    download: p.download,
    contents: p.contents || [],
    requirements: p.requirements,
    install: p.install
  };
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  const supabase =
    SUPABASE_URL && SUPABASE_ANON_KEY
      ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
      : null;
  const supabaseService =
    SUPABASE_URL && SUPABASE_SERVICE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
      : null;
  const stripe = STRIPE_SECRET_KEY ? Stripe(STRIPE_SECRET_KEY) : null;

  const productCache = { at: 0, data: null };

  async function loadProducts(force) {
    if (!supabase) {
      const err = new Error('catalog_not_configured');
      err.status = 503;
      throw err;
    }
    if (!force && productCache.data && Date.now() - productCache.at < PRODUCT_CACHE_MS) {
      return productCache.data;
    }
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('sort', { ascending: true });
    if (error) {
      const err = new Error(error.message);
      err.status = 502;
      throw err;
    }
    productCache.data = data || [];
    productCache.at = Date.now();
    return productCache.data;
  }

  async function findProducts(slugs) {
    const all = await loadProducts(false);
    const map = new Map(all.map((p) => [p.slug, p]));
    const missing = [];
    const found = [];
    for (const s of slugs) {
      const p = map.get(s);
      if (!p) missing.push(s);
      else found.push(p);
    }
    return { found, missing };
  }

  app.get('/', (_req, res) => {
    res.type('text/plain').send('FamilyChat room alive');
  });
  app.get('/healthz', (_req, res) => {
    res.type('text/plain').send('FamilyChat room alive');
  });

  app.get('/api/v1/meta', cors(), (_req, res) => {
    res.json({
      ok: true,
      name: 'soul-economy-api',
      version: process.env.APP_VERSION || '2.0.0',
      chat: 'FamilyChat room alive',
      configured: {
        products: !!supabase,
        checkout: !!(supabaseService && stripe),
        orders: !!supabaseService,
        solana: process.env.HELIUS_WEBHOOK_SECRET ? true : false
      }
    });
  });

  app.get('/api/v1/products', cors(), async (_req, res, next) => {
    try {
      const rows = await loadProducts(false);
      res.json({ ok: true, data: rows.map(renderProduct) });
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/v1/products/:slug', cors(), async (req, res, next) => {
    try {
      const rows = await loadProducts(false);
      const p = rows.find((r) => r.slug === req.params.slug);
      if (!p) return fail(res, 404, 'not_found', 'No soul with that slug.');
      res.json({ ok: true, data: renderProduct(p) });
    } catch (e) {
      next(e);
    }
  });

  app.post(
    '/api/v1/checkout',
    cors(),
    express.json({ limit: '128kb' }),
    async (req, res, next) => {
      try {
        if (!supabaseService) return fail(res, 503, 'orders_not_configured', 'Supabase service key missing.');
        if (!stripe) return fail(res, 503, 'checkout_not_configured', 'Stripe key missing.');

        const items = Array.isArray(req.body?.items) ? req.body.items : null;
        const returnTo = String(req.body?.return_to || '').slice(0, 500);
        if (!items || items.length === 0) return fail(res, 400, 'empty_cart', 'Add a soul first.');

        const slugs = items.map((i) => String(i.slug).slice(0, 120));
        const { found, missing } = await findProducts(slugs);
        if (missing.length) return fail(res, 400, 'unknown_soul', missing.join(', '));

        const bySlug = new Map(found.map((p) => [p.slug, p]));
        const lineItems = [];
        let total = 0;
        for (const it of items) {
          const qty = Math.min(Math.max(parseInt(it.qty, 10) || 1, 1), 20);
          const p = bySlug.get(String(it.slug));
          let cents = Math.min(Math.max(parseInt(it.cents, 10) || 0, 0), 1e8);
          if (p.mode === 'fixed' && p.price_cents) cents = p.price_cents;
          if (cents > 0 && cents < (p.min_cents || 0)) cents = p.min_cents;
          total += cents * qty;
          lineItems.push({
            price_data: {
              currency: 'usd',
              product_data: {
                name: p.name.slice(0, 120),
                description: (p.desc || '').slice(0, 250),
                images: p.image ? [p.image.startsWith('http') ? p.image : ASSET_BASE_URL + p.image.replace(/^\//, '')] : []
              },
              unit_amount: cents
            },
            quantity: qty
          });
        }

        if (total <= 0) return fail(res, 400, 'zero_total', 'Free souls use the Free mint button.');

        const orderId = crypto.randomUUID();
        const { error: insertErr } = await supabaseService.from('orders').insert({
          id: orderId,
          items,
          amount_cents: total,
          currency: 'usd',
          status: 'created'
        });
        if (insertErr) {
          const err = new Error(insertErr.message);
          err.status = 502;
          throw err;
        }

        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          line_items: lineItems,
          success_url: `${returnTo || 'https://uncommonpope-png.github.io/soul-economy/'}?shop=thanks&order=${orderId}`,
          cancel_url: (returnTo || 'https://uncommonpope-png.github.io/soul-economy/').split('?')[0] + '?shop=cancel',
          metadata: { order_id: orderId, slugs: slugs.join(',') },
          allow_promotion_codes: true
        });

        res.json({ ok: true, url: session.url, order_id: orderId });
      } catch (e) {
        next(e);
      }
    }
  );

  app.post(
    '/api/v1/mint-free',
    cors(),
    express.json({ limit: '64kb' }),
    async (req, res, next) => {
      try {
        if (!supabaseService) return fail(res, 503, 'orders_not_configured', 'Supabase service key missing.');

        const slug = String(req.body?.slug || '').slice(0, 120);
        if (!slug) return fail(res, 400, 'no_soul', 'Send a soul slug.');
        const rows = await loadProducts(false);
        const p = rows.find((r) => r.slug === slug);
        if (!p) return fail(res, 404, 'not_found', 'No soul with that slug.');

        const key = makeLicense();
        const { data, error } = await supabaseService
          .from('orders')
          .insert({
            items: [{ slug, qty: 1, cents: 0 }],
            amount_cents: 0,
            currency: 'usd',
            status: 'paid',
            paid_at: new Date().toISOString(),
            licenses: [{ slug, key, created_at: new Date().toISOString() }]
          })
          .select('id,status,licenses')
          .single();
        if (error) {
          const err = new Error(error.message);
          err.status = 502;
          throw err;
        }
        res.json({ ok: true, free: true, data: data });
      } catch (e) {
        next(e);
      }
    }
  );

  app.post('/api/v1/webhooks/stripe', cors(), express.raw({ type: 'application/json' }), async (req, res, next) => {
    try {
      if (!stripe || !STRIPE_WEBHOOK_SECRET) return fail(res, 503, 'webhook_not_configured', 'Stripe webhook secret missing.');
      const sig = req.headers['stripe-signature'];
      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
      } catch (_e) {
        return fail(res, 400, 'bad_signature', 'Webhook signature mismatch.');
      }

      if (event.type === 'checkout.session.completed' && supabaseService) {
        const s = event.data.object;
        const orderId = s.metadata?.order_id;
        if (orderId) {
          const slugs = String(s.metadata?.slugs || '')
            .split(',')
            .filter(Boolean);
          const licenses = slugs.map((slug) => ({ slug, key: makeLicense(), created_at: new Date().toISOString() }));
          await supabaseService
            .from('orders')
            .update({
              status: 'paid',
              stripe_payment_id: s.payment_intent || s.id,
              amount_cents: s.amount_total,
              paid_at: new Date().toISOString(),
              licenses
            })
            .eq('id', orderId);
        }
      }
      res.json({ received: true });
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/v1/webhooks/solana', cors(), express.raw({ type: 'application/json' }), async (req, res, next) => {
    try {
      if (!supabaseService) return fail(res, 503, 'orders_not_configured', 'Supabase service key missing.');
      const dead = req.body || Buffer.alloc(0);
      if (HELIUS_WEBHOOK_SECRET) {
        const sig = String(req.headers['helius-signature'] || '');
        const expected = crypto.createHmac('sha256', HELIUS_WEBHOOK_SECRET).update(dead).digest('hex');
        if (!sig || crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
          return fail(res, 401, 'bad_signature', 'Helius signature mismatch.');
        }
      }

      const memo = String(req.body?.transaction?.meta?.logMessages?.join(' ') || '')
        .replace(/[^a-zA-Z0-9\- ]/g, ' ')
        .match(/soul:[0-9a-fA-F\-]{36}/);
      const orderId = memo ? memo[0].slice(5) : null;
      if (orderId) {
        await supabaseService
          .from('orders')
          .update({ status: 'paid', solana_tx: String(req.body?.signature || req.body?.transaction?.signature || '').slice(0, 128), paid_at: new Date().toISOString() })
          .eq('id', orderId);
      }
      res.json({ received: true });
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/v1/orders/:id', cors(), async (req, res, next) => {
    try {
      if (!supabaseService) return fail(res, 503, 'orders_not_configured', 'Supabase service key missing.');
      const { data, error } = await supabaseService
        .from('orders')
        .select('id,status,amount_cents,currency,licenses,created_at,paid_at')
        .eq('id', req.params.id)
        .single();
      if (error || !data) return fail(res, 404, 'not_found', 'No order with that id.');
      res.json({ ok: true, data });
    } catch (e) {
      next(e);
    }
  });

  app.post(
    '/api/v1/profile',
    cors(),
    express.json({ limit: '64kb' }),
    async (req, res, next) => {
      try {
        if (!supabase || !supabaseService) return fail(res, 503, 'auth_not_configured', 'Supabase keys missing.');
        const auth = String(req.headers.authorization || '');
        if (!auth.startsWith('Bearer ')) return fail(res, 401, 'no_token', 'Send Authorization: Bearer <jwt>.');
        const { data: user, error } = await supabase.auth.getUser(auth.slice(7));
        if (error || !user) return fail(res, 401, 'bad_token', error?.message || 'Session invalid.');
        const meta = user.user_metadata || {};
        const handle = (meta.handle || meta.user_name || meta.name || user.email || 'soul').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
        const avatar = meta.avatar_url || meta.picture || `https://github.com/${handle}.png`;
        await supabaseService
          .from('profiles')
          .upsert(
            { id: user.id, handle, avatar, bio: meta.bio || '', updated_at: new Date().toISOString() },
            { onConflict: 'id' }
          );
        res.json({ ok: true, data: { id: user.id, handle, avatar, email: user.email || null } });
      } catch (e) {
        next(e);
      }
    }
  );

  app.use('/api/v1', (_req, res) => {
    res.status(404).json({ ok: false, error: 'not_found', hint: 'Route does not exist.' });
  });

  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    if (status >= 500) console.error('[api]', err.message);
    res.status(status).json({ ok: false, error: err.message || 'server_error' });
  });

  return app;
}