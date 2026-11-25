import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';
import { Buffer } from 'node:buffer';

function cleanHtmlText(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Dynamically retrieves real products from the live Zoho Commerce store catalog.
 */
async function fetchLiveZohoStoreProducts(storeDomain, orgId) {
  try {
    const homeRes = await fetch(`https://${storeDomain}/`);
    if (!homeRes.ok) return [];

    const html = await homeRes.text();
    const productMatches = [...html.matchAll(/href="\/products\/([^"?#]+)"/g)].map((m) => m[1]);
    const uniqueSlugs = [...new Set(productMatches)].filter((s) => s && !s.includes('/') && s !== 'products');

    const products = [];
    for (const slug of uniqueSlugs) {
      try {
        const pRes = await fetch(`https://${storeDomain}/products/${slug}`);
        if (!pRes.ok) continue;

        const pHtml = await pRes.text();

        // Strategy A: Direct window.product_data extraction (complete official Zoho Storefront model)
        const productDataMatch = pHtml.match(/window\.product_data\s*=\s*(\{[\s\S]*?\})\s*(?:;|\n|<\/script>)/);
        if (productDataMatch) {
          try {
            const pd = JSON.parse(productDataMatch[1]);
            const productId = String(pd.id || '');
            const rawVariants = Array.isArray(pd.variants) ? pd.variants : [];
            const variantId = String(rawVariants[0]?.id || productId);
            const rawName = pd.title || pd.name || 'Product';
            const name = rawName.includes('-') ? rawName.split('-')[0].trim() : rawName.trim();
            const price = parseFloat(pd.price_min ?? rawVariants[0]?.selling_price ?? pd.price ?? 0);
            const currency = 'INR';
            const inStock = pd.available !== false;
            const description = cleanHtmlText(pd.short_description || pd.description || '');

            const rawImages = [];
            if (pd.cover_media?.url) rawImages.push(pd.cover_media.url);
            if (Array.isArray(pd.media)) {
              pd.media.forEach((m) => {
                if (m.url && !rawImages.includes(m.url)) rawImages.push(m.url);
              });
            }

            const images = rawImages.map((img) => {
              if (typeof img === 'string') {
                return img.replace('/variant-images/', '/product-images/').replace(variantId, productId);
              }
              return img;
            });

            const brand = pd.brand || (
              name.toLowerCase().includes('iphone') || name.toLowerCase().includes('apple')
                ? 'Apple'
                : (name.toLowerCase().includes('samsung') ? 'Samsung' : 'Zoho Store')
            );

            const primaryImage = images[0] || `https://lyra.zohoecommerce.com/${orgId}/product-images/${productId}-${slug}.jpg`;

            products.push({
              product_id: productId,
              variant_id: variantId,
              item_id: variantId,
              name,
              product_name: name,
              title: name,
              brand,
              category_name: pd.category?.name || 'Electronics',
              url_slug: slug,
              rate: price,
              selling_price: price,
              price,
              currency_code: currency,
              in_stock: inStock,
              stock_on_hand: 10,
              description,
              product_description: description,
              images: images.map((url) => ({ url })),
              image_url: primaryImage,
              featured_image: primaryImage,
              variants: rawVariants.length > 0 ? rawVariants.map((v) => ({
                variant_id: String(v.id || variantId),
                item_id: String(v.id || variantId),
                name: v.title || name,
                rate: parseFloat(v.selling_price || price),
                selling_price: parseFloat(v.selling_price || price),
                in_stock: v.available !== false,
                stock_on_hand: 10,
              })) : [
                {
                  variant_id: variantId,
                  item_id: variantId,
                  name,
                  rate: price,
                  selling_price: price,
                  in_stock: inStock,
                  stock_on_hand: 10,
                },
              ],
            });
            continue;
          } catch (e) {
            console.warn(`[Vite Zoho Live Extractor] Failed parsing window.product_data for ${slug}:`, e.message);
          }
        }

        // Strategy B: Schema LD+JSON extraction fallback
        const schemaMatch = pHtml.match(/<script type="application\/ld\+json" id="schemagenerator">([\s\S]*?)<\/script>/);

        if (schemaMatch) {
          const schema = JSON.parse(schemaMatch[1]);
          const productId = schema.additionalProperty?.[0]?.value || '';
          const variantId = schema.productID || productId;
          const rawName = schema.name || 'Product';
          const name = rawName.includes('-') ? rawName.split('-')[0].trim() : rawName.trim();
          const price = parseFloat(schema.offers?.price || 0);
          const currency = schema.offers?.priceCurrency || 'INR';
          const inStock = schema.offers?.availability ? schema.offers.availability.includes('InStock') : true;
          const description = cleanHtmlText(schema.description);
          const rawImages = Array.isArray(schema.image) ? schema.image : (schema.image ? [schema.image] : []);
          const images = rawImages.map((img) => {
            if (typeof img === 'string') {
              return img.replace('/variant-images/', '/product-images/').replace(variantId, productId);
            }
            return img;
          });
          const brand = name.toLowerCase().includes('iphone') || name.toLowerCase().includes('apple')
            ? 'Apple'
            : (name.toLowerCase().includes('samsung') ? 'Samsung' : 'Zoho Store');

          const primaryImage = images[0] || `https://lyra.zohoecommerce.com/${orgId}/product-images/${productId}-${slug}.jpg`;

          products.push({
            product_id: productId,
            variant_id: variantId,
            item_id: variantId,
            name,
            product_name: name,
            title: name,
            brand,
            category_name: 'Smartphones',
            url_slug: slug,
            rate: price,
            selling_price: price,
            price,
            currency_code: currency,
            in_stock: inStock,
            stock_on_hand: 10,
            description,
            product_description: description,
            images: images.map((url) => ({ url })),
            image_url: primaryImage,
            featured_image: primaryImage,
            variants: [
              {
                variant_id: variantId,
                item_id: variantId,
                name,
                rate: price,
                selling_price: price,
                in_stock: inStock,
                stock_on_hand: 10,
              },
            ],
          });
        }
      } catch (err) {
        console.warn(`[Vite Zoho Live Extractor] Failed parsing slug ${slug}:`, err.message);
      }
    }
    return products;
  } catch (err) {
    console.error('[Vite Zoho Live Extractor] Failed to load store:', err.message);
    return [];
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const orgId = (env.ZOHO_ORG_ID || env.VITE_ZOHO_ORG_ID || '60096917552').trim();
  const storefrontDomain = (env.VITE_ZOHO_STOREFRONT_DOMAIN || 'demo-60096917552.zohoecommerce.in').trim();

  let currentAccessToken = (env.ZOHO_ADMIN_ACCESS_TOKEN || env.VITE_ZOHO_ACCESS_TOKEN || '').trim();
  let tokenExpiresAt = 0;
  let refreshPromise = null;
  
  // Persistent session tracking for Zoho Commerce Cart & Checkout
  let activeGuestZcid = '';
  let activeMemberZcid = '';
  let activeCsrfc = '';
  let activeZalb = '';
  let activeAuthCookies = {};
  let activeMemberEmail = '';
  const registeredCustomers = new Map();

  /**
   * Safe parser for Zoho Commerce API responses
   * Reads raw response text first and reports HTTP status and error messages on non-JSON
   */
  async function safeParseZohoResponse(response, context = 'Zoho API') {
    let rawText;
    try {
      rawText = await response.text();
    } catch (readErr) {
      console.error(`[${context}] Failed to read response stream (HTTP ${response.status}):`, readErr.message);
      return {
        data: { status_code: String(response.status), error: { message: readErr.message } },
        isJson: false,
        rawText: '',
      };
    }

    try {
      const data = JSON.parse(rawText);
      return { data, isJson: true, rawText };
    } catch {
      console.warn(`[${context}] Non-JSON response received (HTTP ${response.status}): ${rawText.trim().slice(0, 200)}`);
      return {
        data: {
          status_code: String(response.status),
          code: response.status,
          message: `HTTP ${response.status}: ${rawText.trim().slice(0, 150)}`,
          error: { message: rawText.trim().slice(0, 150), code: response.status },
        },
        isJson: false,
        rawText: rawText.trim(),
      };
    }
  }

  function updateZohoSessionCookies(res, payload = null, cartType = 'guest') {
    let rawCookies = [];
    if (typeof res.headers.getSetCookie === 'function') {
      rawCookies = res.headers.getSetCookie();
    } else {
      const single = res.headers.get('set-cookie');
      if (single) rawCookies = [single];
    }
    const joined = rawCookies.join('; ');
    const zcid = joined.match(/\bzcid=([^;]+)/)?.[1] || joined.match(/\bzcidg=([^;]+)/)?.[1];
    const csrfc = joined.match(/\bcsrfc=([^;]+)/)?.[1];
    const zalb = joined.match(/\bzalb_[^=]+=([^;]+)/)?.[0];

    // Only update member auth cookies for member requests or auth endpoints
    if (cartType === 'member') {
      rawCookies.forEach((c) => {
        const parts = c.split(';')[0].split('=');
        if (parts.length >= 2) {
          const k = parts[0].trim();
          const v = parts.slice(1).join('=').trim();
          if (k.startsWith('_iam') || k.startsWith('_zcsrft') || k.startsWith('zlogin') || k.startsWith('iam_')) {
            activeAuthCookies[k] = v;
          }
        }
      });
    }

    if (cartType === 'guest') {
      if (zcid) activeGuestZcid = zcid;
    } else if (cartType === 'member') {
      if (zcid) activeMemberZcid = zcid;
    }

    if (csrfc) activeCsrfc = csrfc;
    if (zalb) activeZalb = zalb;

    // Check payload for cart_id as well
    const payloadCartId = payload?.payload?.cart_id || payload?.payload?.cart?.cart_id || payload?.cart_id;
    if (payloadCartId) {
      if (cartType === 'member') {
        activeMemberZcid = payloadCartId;
      } else {
        activeGuestZcid = payloadCartId;
      }
    }
  }

  function forwardZohoCookies(zohoRes, clientRes, cartType = 'guest') {
    let rawCookies = [];
    if (typeof zohoRes.headers.getSetCookie === 'function') {
      rawCookies = zohoRes.headers.getSetCookie();
    } else {
      const single = zohoRes.headers.get('set-cookie');
      if (single) rawCookies = [single];
    }

    const rewritten = rawCookies.map((cookieStr) => {
      return cookieStr
        .replace(/Domain=[^;]+;?/gi, '')
        .replace(/Secure;?/gi, '')
        .replace(/SameSite=[^;]+;?/gi, 'SameSite=Lax;')
        .replace(/;;+/g, ';')
        .trim();
    }).filter(Boolean);

    const activeId = cartType === 'member' ? (activeMemberZcid || activeGuestZcid) : (activeGuestZcid || activeMemberZcid);
    if (activeId && activeId !== 'zoho-cart-active' && activeId !== 'undefined' && activeId !== 'null') {
      if (!rewritten.some(c => c.startsWith('zcid='))) {
        rewritten.push(`zcid=${activeId}; Path=/; SameSite=Lax`);
      }
    }

    if (rewritten.length > 0) {
      clientRes.setHeader('Set-Cookie', rewritten);
    }
  }

  function getZohoHeaders(customCartId = null, cartType = 'guest', incomingCookieHeader = null) {
    const cookieParts = [];

    // ONLY attach cart ID cookie if explicitly provided by the active session
    const cid = (customCartId && customCartId !== 'zoho-cart-active' && customCartId !== 'undefined' && customCartId !== 'null') ? String(customCartId).trim() : null;
    if (cid) {
      cookieParts.push(`zcid=${cid}`);
    }

    if (cartType === 'member') {
      // Member authentication cookies only
      Object.entries(activeAuthCookies).forEach(([k, v]) => {
        cookieParts.push(`${k}=${v}`);
      });
    }

    if (activeCsrfc) cookieParts.push(`csrfc=${activeCsrfc}`);
    if (activeZalb) cookieParts.push(activeZalb);

    if (incomingCookieHeader) {
      const incomingParts = incomingCookieHeader.split(';').map((s) => s.trim()).filter(Boolean);
      incomingParts.forEach((p) => {
        const k = p.split('=')[0].trim();
        // Never forward browser's stale zcid/zcidg cookies if a specific cart ID was not explicitly requested
        if (k === 'zcid' || k === 'zcidg') {
          return;
        }
        // Prevent cross-contamination:
        // Guest requests must not forward member auth cookies
        if (cartType === 'guest') {
          if (k.startsWith('_iam') || k.startsWith('_zcsrft') || k.startsWith('zlogin') || k.startsWith('iam_')) {
            return;
          }
        }

        if (!cookieParts.some((cp) => cp.startsWith(k + '='))) {
          cookieParts.push(p);
        }
      });
    }

    const h = {
      'domain-name': storefrontDomain,
      'Content-Type': 'application/json',
      'x-zoho-include-formatted': 'true',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
    };

    if (cookieParts.length > 0) {
      h.Cookie = cookieParts.join('; ');
    }
    if (activeCsrfc) {
      h['X-ZCSRF-TOKEN'] = `csrfp=${activeCsrfc}`;
    }

    return h;
  }

  /**
   * OAuth Access Token Refresh for Zoho India Accounts
   * Deduplicates concurrent refresh operations and safely inspects raw response text
   */
  async function refreshAccessToken() {
    // Prevent concurrent token refresh operations from creating race conditions
    if (refreshPromise) {
      console.log('[Vite Zoho Token Manager] Token refresh already in progress; reusing in-flight promise.');
      return refreshPromise;
    }

    refreshPromise = (async () => {
      const clientId = (env.ZOHO_CLIENT_ID || '').trim();
      const clientSecret = (env.ZOHO_CLIENT_SECRET || '').trim();
      const refreshToken = (env.ZOHO_REFRESH_TOKEN || '').trim();

      if (!clientId || !clientSecret || !refreshToken) {
        console.warn('[Vite Zoho Token Manager] Missing OAuth client credentials or refresh token in .env');
        return null;
      }

      try {
        const params = new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        });

        console.log('[Vite Zoho Token Manager] Refreshing OAuth access token via https://accounts.zoho.in/oauth/v2/token...');
        const res = await fetch('https://accounts.zoho.in/oauth/v2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        const { data, isJson, rawText } = await safeParseZohoResponse(res, 'Zoho India OAuth Accounts');

        if (!isJson) {
          console.error(`[Vite Zoho Token Manager] OAuth accounts returned non-JSON (HTTP ${res.status}): ${rawText}`);
          return null;
        }

        if (res.ok && data?.access_token) {
          currentAccessToken = data.access_token;
          const expiresInSec = data.expires_in || 3600;
          tokenExpiresAt = Date.now() + (expiresInSec * 1000) - 60000; // 1 min buffer
          console.log(`[Vite Zoho Token Manager] Refreshed access token successfully. Valid for ${expiresInSec}s.`);
          return currentAccessToken;
        } else {
          const errMsg = data?.error_description || data?.error || data?.message || rawText;
          console.error(`[Vite Zoho Token Manager] Token refresh failed with HTTP ${res.status}: ${errMsg}`);
          return null;
        }
      } catch (e) {
        console.error('[Vite Zoho Token Manager] Token refresh request error:', e.message);
        return null;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }

  /**
   * Helper to parse request body as JSON
   */
  async function parseRequestBody(req) {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
    });
  }

  return {
    plugins: [
      react(),
      {
        name: 'zoho-commerce-api-middleware',
        configureServer(server) {
          // =========================================================================
          // 1. Endpoint: Live Products API
          // =========================================================================
          server.middlewares.use(async (req, res, next) => {
            if (!req.url.startsWith('/api/zoho-products')) {
              return next();
            }

            const envCheck = loadEnv(mode, process.cwd(), '');
            let tokenToUse = currentAccessToken || (envCheck.ZOHO_ADMIN_ACCESS_TOKEN || envCheck.VITE_ZOHO_ACCESS_TOKEN || '').trim();
            if (tokenExpiresAt && Date.now() >= tokenExpiresAt) {
              const refreshed = await refreshAccessToken();
              if (refreshed) tokenToUse = refreshed;
            }

            async function queryAdminProducts(token) {
              return fetch('https://commerce.zoho.in/store/api/v1/products', {
                method: 'GET',
                headers: {
                  Authorization: `Zoho-oauthtoken ${token}`,
                  'X-com-zoho-store-organizationid': String(orgId),
                  'Content-Type': 'application/json',
                },
              });
            }

            // Strategy 1: Admin API with OAuth Token
            if (tokenToUse) {
              try {
                let zohoRes = await queryAdminProducts(tokenToUse);
                let { data, isJson, rawText } = await safeParseZohoResponse(zohoRes, 'Zoho Products Admin API');

                // Inspect response: detect 401 status or INVALID_TOKEN error message
                const isInvalidToken = zohoRes.status === 401 ||
                  (!isJson && rawText.includes('INVALID_TOKEN')) ||
                  (isJson && (data?.message === 'INVALID_TOKEN' || data?.error === 'INVALID_TOKEN' || data?.error_description?.includes('INVALID_TOKEN')));

                if (isInvalidToken) {
                  console.warn(`[Vite Zoho Proxy] Admin API returned HTTP ${zohoRes.status} (${rawText.slice(0, 100)}). Refreshing access token...`);
                  const refreshed = await refreshAccessToken();
                  if (refreshed) {
                    tokenToUse = refreshed;
                    zohoRes = await queryAdminProducts(refreshed);
                    const retryResult = await safeParseZohoResponse(zohoRes, 'Zoho Products Admin API (Retry)');
                    data = retryResult.data;
                    isJson = retryResult.isJson;
                  }
                }

                if (zohoRes.ok && isJson && data) {
                  const products = data.products || data.data || [];
                  if (products.length > 0) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ code: 0, message: 'success', source: 'admin-api', products }));
                    return;
                  }
                }
              } catch (adminErr) {
                console.warn('[Vite Zoho Proxy] Admin API query failed:', adminErr.message);
              }
            }

            // Strategy 2: Live catalog retrieval from Zoho Commerce storefront
            const liveProducts = await fetchLiveZohoStoreProducts(storefrontDomain, orgId);
            if (liveProducts.length > 0) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  code: 0,
                  message: 'success',
                  source: 'zoho-storefront-live',
                  products: liveProducts,
                })
              );
              return;
            }

            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                code: 'ZOHO_CATALOG_UNAVAILABLE',
                message: 'Unable to retrieve live products from Zoho Commerce store.',
              })
            );
          });

          // =========================================================================
          // 1b. Endpoint: Zoho Customer Authentication & Portal API (/api/zoho-auth)
          // =========================================================================
          server.middlewares.use(async (req, res, next) => {
            if (!req.url.startsWith('/api/zoho-auth')) {
              return next();
            }

            const urlObj = new URL(req.url, 'http://localhost');
            const path = urlObj.pathname;
            res.setHeader('Content-Type', 'application/json');

            try {
              // GET /api/zoho-auth/signup-fields
              if (path === '/api/zoho-auth/signup-fields' && req.method === 'GET') {
                const zohoRes = await fetch(`https://${storefrontDomain}/portaluser/signupfields`, {
                  headers: { 'domain-name': storefrontDomain, 'Content-Type': 'application/json' },
                });
                const { data } = await safeParseZohoResponse(zohoRes, 'Zoho Auth SignupFields');
                updateZohoSessionCookies(zohoRes, data, 'member');
                res.statusCode = zohoRes.status;
                res.end(JSON.stringify(data));
                return;
              }

              // GET /api/zoho-auth/current-user
              if (path === '/api/zoho-auth/current-user' && req.method === 'GET') {
                const cookieEmailMatch = req.headers.cookie?.match(/\bzc_user_email=([^;]+)/)?.[1];
                const emailToCheck = activeMemberEmail || (cookieEmailMatch ? decodeURIComponent(cookieEmailMatch) : null);

                if (emailToCheck && registeredCustomers.has(emailToCheck)) {
                  const cust = registeredCustomers.get(emailToCheck);
                  res.statusCode = 200;
                  res.end(
                    JSON.stringify({
                      is_logged_in: true,
                      user: cust,
                      member_cart_id: activeMemberZcid || null,
                    })
                  );
                  return;
                }

                // Fallback check to Zoho Commerce Portal
                try {
                  const zohoRes = await fetch(`https://${storefrontDomain}/portaluser/getCurrentPortalUser`, {
                    headers: getZohoHeaders(null, 'member', req.headers.cookie),
                  });
                  const { data } = await safeParseZohoResponse(zohoRes, 'Zoho Auth CurrentUser');
                  const portalUser = data.payload?.current_user;
                  const isLoggedIn = Boolean(
                    portalUser &&
                    portalUser.user &&
                    portalUser.user !== 'null' &&
                    portalUser.site_visibility !== 0
                  );

                  res.statusCode = 200;
                  res.end(
                    JSON.stringify({
                      is_logged_in: isLoggedIn,
                      user: isLoggedIn ? portalUser : null,
                      member_cart_id: activeMemberZcid || null,
                      raw: data,
                    })
                  );
                  return;
                } catch {
                  res.statusCode = 200;
                  res.end(JSON.stringify({ is_logged_in: false, user: null }));
                  return;
                }
              }

              // POST /api/zoho-auth/check-email
              if (path === '/api/zoho-auth/check-email' && req.method === 'POST') {
                const body = await parseRequestBody(req);
                const zohoRes = await fetch(`https://${storefrontDomain}/portaluser/checkSignupUserEmail`, {
                  method: 'POST',
                  headers: getZohoHeaders(null, 'guest', req.headers.cookie),
                  body: JSON.stringify({ email: body.email }),
                });
                updateZohoSessionCookies(zohoRes);
                const { data } = await safeParseZohoResponse(zohoRes, 'Zoho Auth CheckEmail');
                res.statusCode = zohoRes.status;
                res.end(JSON.stringify(data));
                return;
              }

              // POST /api/zoho-auth/login (Email-based instant sign-in & Zoho Cart association)
              if (path === '/api/zoho-auth/login' && req.method === 'POST') {
                const body = await parseRequestBody(req);
                const email = (body.email || '').trim().toLowerCase();

                if (!email || !email.includes('@')) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ code: 400, message: 'Please provide a valid email address.' }));
                  return;
                }

                activeMemberEmail = email;
                let customer = registeredCustomers.get(email);
                if (!customer) {
                  customer = {
                    email,
                    first_name: email.split('@')[0],
                    last_name: '',
                    name: email.split('@')[0],
                    phone: '',
                    created_at: new Date().toISOString(),
                  };
                  registeredCustomers.set(email, customer);
                }

                // Associate customer with Zoho Commerce checkout if cart exists
                const targetCartId = activeMemberZcid || activeGuestZcid;
                if (targetCartId) {
                  try {
                    console.log(`[Vite Zoho Auth] Associating customer ${email} with Zoho Commerce cart ${targetCartId}`);
                    await fetch(`https://${storefrontDomain}/storefront/api/v2/checkout/${targetCartId}`, {
                      method: 'PUT',
                      headers: getZohoHeaders(targetCartId, 'member', req.headers.cookie),
                      body: JSON.stringify({
                        customer: {
                          email: customer.email,
                          first_name: customer.first_name || customer.name,
                          last_name: customer.last_name || '',
                          mobile: customer.phone || '',
                        },
                      }),
                    });
                    activeMemberZcid = targetCartId;
                  } catch (e) {
                    console.warn('[Vite Zoho Auth] Checkout customer sync warning:', e.message);
                  }
                }

                res.setHeader('Set-Cookie', [
                  `zcid=${activeMemberZcid || targetCartId || ''}; Path=/; SameSite=Lax`,
                  `zc_user_email=${encodeURIComponent(email)}; Path=/; SameSite=Lax`,
                ]);

                res.statusCode = 200;
                res.end(
                  JSON.stringify({
                    code: 0,
                    message: 'Login successful',
                    customer,
                    member_cart_id: activeMemberZcid || null,
                  })
                );
                return;
              }

              // POST /api/zoho-auth/signup (Email-based customer registration & Zoho Cart sync)
              if (path === '/api/zoho-auth/signup' && req.method === 'POST') {
                const body = await parseRequestBody(req);
                const email = (body.email || '').trim().toLowerCase();
                const firstName = (body.first_name || '').trim();
                const lastName = (body.last_name || '').trim();
                const phone = (body.phone || '').trim();

                if (!email || !email.includes('@')) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ code: 400, message: 'Please provide a valid email address.' }));
                  return;
                }
                if (!firstName) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ code: 400, message: 'Please provide your first name.' }));
                  return;
                }

                const newCustomer = {
                  first_name: firstName,
                  last_name: lastName,
                  name: `${firstName} ${lastName}`.trim(),
                  email,
                  phone,
                  receive_promotional_emails: Boolean(body.receive_promotional_emails),
                  created_at: new Date().toISOString(),
                };

                registeredCustomers.set(email, newCustomer);
                activeMemberEmail = email;

                // Sync customer with Zoho Commerce checkout if cart exists
                const targetCartId = activeMemberZcid || activeGuestZcid;
                if (targetCartId) {
                  try {
                    console.log(`[Vite Zoho Auth] Registering customer ${email} on Zoho Commerce cart ${targetCartId}`);
                    await fetch(`https://${storefrontDomain}/storefront/api/v2/checkout/${targetCartId}`, {
                      method: 'PUT',
                      headers: getZohoHeaders(targetCartId, 'member', req.headers.cookie),
                      body: JSON.stringify({
                        customer: {
                          email: newCustomer.email,
                          first_name: newCustomer.first_name,
                          last_name: newCustomer.last_name,
                          mobile: newCustomer.phone,
                        },
                      }),
                    });
                    activeMemberZcid = targetCartId;
                  } catch (e) {
                    console.warn('[Vite Zoho Auth] Checkout customer sync warning:', e.message);
                  }
                }

                res.setHeader('Set-Cookie', [
                  `zcid=${activeMemberZcid || targetCartId || ''}; Path=/; SameSite=Lax`,
                  `zc_user_email=${encodeURIComponent(email)}; Path=/; SameSite=Lax`,
                ]);

                res.statusCode = 200;
                res.end(
                  JSON.stringify({
                    code: 0,
                    message: 'Account created successfully',
                    customer: newCustomer,
                    member_cart_id: activeMemberZcid || null,
                  })
                );
                return;
              }

              // POST /api/zoho-auth/logout
              if ((path === '/api/zoho-auth/logout' || path === '/api/zoho-auth/signout') && req.method === 'POST') {
                try {
                  await fetch(`https://${storefrontDomain}/signout?logout=true`, {
                    headers: getZohoHeaders(null, 'member'),
                  });
                } catch {
                  // ignore
                }

                activeMemberEmail = '';
                activeMemberZcid = '';
                activeAuthCookies = {};
                res.setHeader('Set-Cookie', [
                  'zcid=; Path=/; Max-Age=0; SameSite=Lax',
                  'zc_user_email=; Path=/; Max-Age=0; SameSite=Lax',
                  '_iamadt_client=; Path=/; Max-Age=0; SameSite=Lax',
                  '_iambdt_client=; Path=/; Max-Age=0; SameSite=Lax',
                ]);
                res.statusCode = 200;
                res.end(JSON.stringify({ code: 0, message: 'Logged out successfully' }));
                return;
              }

              // GET /api/zoho-auth/profile
              if (path === '/api/zoho-auth/profile' && req.method === 'GET') {
                const zohoRes = await fetch(`https://${storefrontDomain}/portaluser/userProfile`, {
                  headers: getZohoHeaders(null, 'member', req.headers.cookie),
                });
                const { data } = await safeParseZohoResponse(zohoRes, 'Zoho Auth Profile');
                res.statusCode = zohoRes.status;
                res.end(JSON.stringify(data));
                return;
              }

              // GET /api/zoho-auth/address
              if (path === '/api/zoho-auth/address' && req.method === 'GET') {
                const zohoRes = await fetch(`https://${storefrontDomain}/portaluser/address`, {
                  headers: getZohoHeaders(null, 'member', req.headers.cookie),
                });
                const { data } = await safeParseZohoResponse(zohoRes, 'Zoho Auth Address');
                res.statusCode = zohoRes.status;
                res.end(JSON.stringify(data));
                return;
              }

              // GET /api/zoho-auth/orders
              if (path === '/api/zoho-auth/orders' && req.method === 'GET') {
                const filterDate = urlObj.searchParams.get('filterDate') || '3';
                const zohoRes = await fetch(`https://${storefrontDomain}/portaluser/orders?filterDate=${filterDate}`, {
                  headers: getZohoHeaders(null, 'member', req.headers.cookie),
                });
                const { data } = await safeParseZohoResponse(zohoRes, 'Zoho Auth Orders');
                res.statusCode = zohoRes.status;
                res.end(JSON.stringify(data));
                return;
              }
            } catch (err) {
              console.error('[Vite Zoho Auth Error]:', err.message);
              res.statusCode = 500;
              res.end(JSON.stringify({ code: 500, error: err.message }));
              return;
            }

            next();
          });

          // =========================================================================
          // 2. Endpoint: Zoho Cart API Handlers (/api/zoho-cart)
          // Supports both guest cart (zcidg) and authenticated member cart (zcid)
          // =========================================================================
          server.middlewares.use(async (req, res, next) => {
            if (!req.url.startsWith('/api/zoho-cart')) {
              return next();
            }

            const urlObj = new URL(req.url, 'http://localhost');
            const path = urlObj.pathname;
            const cartType = req.headers['x-cart-type'] || urlObj.searchParams.get('cart_type') || 'guest';
            // Only accept explicit client cart IDs; never reuse old background cookies or stale module state on fresh sessions
            const clientCartId = (urlObj.searchParams.get('cart_id') || req.headers['x-cart-id'] || '').trim();

            res.setHeader('Content-Type', 'application/json');

            try {
              // POST /api/zoho-cart/add - Add product to Zoho Commerce Cart
              if (path === '/api/zoho-cart/add' && req.method === 'POST') {
                const body = await parseRequestBody(req);
                let { product_variant_id, quantity = 1, cart_id } = body;

                if (typeof product_variant_id === 'object' && product_variant_id !== null) {
                  product_variant_id =
                    product_variant_id.variantId ||
                    product_variant_id.variant_id ||
                    product_variant_id.default_variant_id ||
                    product_variant_id.item_id ||
                    product_variant_id.id;
                }
                product_variant_id = String(product_variant_id || '').trim();

                if (!product_variant_id || product_variant_id === '[object Object]') {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ status_code: '400', error: { message: 'Invalid product_variant_id provided' } }));
                  return;
                }
                
                // Only reuse cart ID if explicitly passed by client in active session
                const explicitCid = (cart_id || req.headers['x-cart-id'] || urlObj.searchParams.get('cart_id') || '').trim();
                const cid = (explicitCid && explicitCid !== 'zoho-cart-active' && explicitCid !== 'undefined' && explicitCid !== 'null') ? explicitCid : '';

                console.log(`[Vite Zoho Cart] Posting to Zoho Commerce Cart (${cartType}): variant=${product_variant_id}, qty=${quantity}, cartId=${cid || '(new)'}`);

                async function sendAddToCart(zcidParam) {
                  return fetch(`https://${storefrontDomain}/storefront/api/v1/cart`, {
                    method: 'POST',
                    headers: getZohoHeaders(zcidParam, cartType, req.headers.cookie),
                    body: JSON.stringify({
                      product_variant_id: String(product_variant_id),
                      quantity: Math.max(1, parseInt(quantity, 10)),
                    }),
                  });
                }

                let zohoRes = await sendAddToCart(cid || null);
                let { data } = await safeParseZohoResponse(zohoRes, 'Zoho Cart Add');

                const isSessionError =
                  (data.status_code !== '0' && data.status_code !== 0) &&
                  (data.error?.code === 107401 || data.error?.code === 15 ||
                   (data.developer_message && data.developer_message.toLowerCase().includes('cart')) ||
                   (data.error?.message && data.error.message.toLowerCase().includes('unable to process')));

                if (isSessionError && cid) {
                  console.warn(`[Vite Zoho Cart] Session error with cartId=${cid} (${cartType}). Auto-retrying with fresh cart session...`);
                  if (cartType === 'member') activeMemberZcid = '';
                  else activeGuestZcid = '';
                  zohoRes = await sendAddToCart(null);
                  const retryRes = await safeParseZohoResponse(zohoRes, 'Zoho Cart Add (Retry)');
                  data = retryRes.data;
                }

                updateZohoSessionCookies(zohoRes, data, cartType);
                forwardZohoCookies(zohoRes, res, cartType);

                const resultingCartId = data.payload?.cart_id || data.payload?.cart?.cart_id || (cartType === 'member' ? activeMemberZcid : activeGuestZcid);
                if (resultingCartId) {
                  if (cartType === 'member') activeMemberZcid = resultingCartId;
                  else activeGuestZcid = resultingCartId;
                  res.setHeader('X-Cart-Id', resultingCartId);

                  // If member is authenticated, automatically associate customer details with Zoho Checkout
                  if (cartType === 'member' && activeMemberEmail && registeredCustomers.has(activeMemberEmail)) {
                    const cust = registeredCustomers.get(activeMemberEmail);
                    try {
                      await fetch(`https://${storefrontDomain}/storefront/api/v2/checkout/${resultingCartId}`, {
                        method: 'PUT',
                        headers: getZohoHeaders(resultingCartId, 'member', req.headers.cookie),
                        body: JSON.stringify({
                          customer: {
                            email: cust.email,
                            first_name: cust.first_name || cust.name,
                            last_name: cust.last_name || '',
                            mobile: cust.phone || '',
                          },
                        }),
                      });
                    } catch (syncErr) {
                      console.warn('[Vite Zoho Cart] Customer checkout sync warning:', syncErr.message);
                    }
                  }
                }

                res.statusCode = zohoRes.status;
                res.end(JSON.stringify(data));
                return;
              }

              // GET /api/zoho-cart - Fetch current cart from Zoho Commerce
              if ((path === '/api/zoho-cart' || path === '/api/zoho-cart/') && req.method === 'GET') {
                const queryCid = (urlObj.searchParams.get('cart_id') || req.headers['x-cart-id'] || '').trim();

                // If no specific cart ID was passed, start empty cart; do not auto-fetch from background cookies
                if (!queryCid || queryCid === 'zoho-cart-active' || queryCid === 'undefined' || queryCid === 'null') {
                  res.statusCode = 200;
                  res.end(JSON.stringify({
                    status_message: 'success',
                    status_code: '0',
                    payload: { line_items: [], items: [], cart_id: null, count: 0, sub_total: 0 }
                  }));
                  return;
                }

                console.log(`[Vite Zoho Cart] Fetching cart (${cartType}) for cartId=${queryCid}`);
                let zohoRes = await fetch(`https://${storefrontDomain}/storefront/api/v1/cart`, {
                  method: 'GET',
                  headers: getZohoHeaders(queryCid, cartType, req.headers.cookie),
                });

                let { data } = await safeParseZohoResponse(zohoRes, 'Zoho Cart Get');

                if (data.status_code !== '0' && data.status_code !== 0 && (data.error?.code === 107401 || data.error?.code === 15)) {
                  console.warn(`[Vite Zoho Cart] Cart session expired for cartId=${queryCid} (${cartType}). Resetting session.`);
                  if (cartType === 'member') activeMemberZcid = '';
                  else activeGuestZcid = '';
                  res.statusCode = 200;
                  res.setHeader('X-Cart-Id', '');
                  res.setHeader('Set-Cookie', `${cartType === 'member' ? 'zcid' : 'zcidg'}=; Max-Age=0; Path=/; SameSite=Lax`);
                  res.end(JSON.stringify({
                    status_message: 'success',
                    status_code: '0',
                    payload: { line_items: [], items: [], cart_id: null, count: 0, sub_total: 0 }
                  }));
                  return;
                }

                updateZohoSessionCookies(zohoRes, data, cartType);
                forwardZohoCookies(zohoRes, res, cartType);
                const activeIdToReturn = cartType === 'member' ? activeMemberZcid : activeGuestZcid;
                if (activeIdToReturn) res.setHeader('X-Cart-Id', activeIdToReturn);
                res.statusCode = zohoRes.status;
                res.end(JSON.stringify(data));
                return;
              }

              // PUT /api/zoho-cart/item/:id - Update quantity in Zoho Commerce Cart
              if (path.startsWith('/api/zoho-cart/item/') && req.method === 'PUT') {
                const variantId = path.split('/api/zoho-cart/item/')[1];
                const body = await parseRequestBody(req);
                const qty = Math.max(0, parseInt(body.quantity, 10));

                console.log(`[Vite Zoho Cart] Updating variant ${variantId} to qty=${qty} (${cartType})`);

                if (qty === 0) {
                  // Quantity 0 is a permanent deletion request
                  const zohoRes = await fetch(`https://${storefrontDomain}/storefront/api/v1/cart?product_variant_id=${encodeURIComponent(variantId)}`, {
                    method: 'DELETE',
                    headers: getZohoHeaders(clientCartId || null, cartType, req.headers.cookie),
                  });

                  const { data: delData } = await safeParseZohoResponse(zohoRes, 'Zoho Cart Delete Item (qty 0)');
                  updateZohoSessionCookies(zohoRes, delData, cartType);

                  if (!zohoRes.ok || (delData.status_code && delData.status_code !== '0' && delData.status_code !== 0)) {
                    res.statusCode = zohoRes.status || 400;
                    res.end(JSON.stringify(delData));
                    return;
                  }

                  // Retrieve verified cart after removal
                  const verifyRes = await fetch(`https://${storefrontDomain}/storefront/api/v1/cart`, {
                    method: 'GET',
                    headers: getZohoHeaders(clientCartId || null, cartType, req.headers.cookie),
                  });
                  const { data: verifiedCart } = await safeParseZohoResponse(verifyRes, 'Zoho Cart Verify Get');
                  updateZohoSessionCookies(verifyRes, verifiedCart, cartType);
                  forwardZohoCookies(verifyRes, res, cartType);

                  const activeIdToReturn = cartType === 'member' ? activeMemberZcid : activeGuestZcid;
                  if (activeIdToReturn) res.setHeader('X-Cart-Id', activeIdToReturn);
                  res.statusCode = 200;
                  res.end(JSON.stringify(verifiedCart));
                  return;
                }

                // Official Zoho Commerce Storefront quantity update endpoint: PUT /storefront/api/v1/cart
                const zohoRes = await fetch(`https://${storefrontDomain}/storefront/api/v1/cart`, {
                  method: 'PUT',
                  headers: getZohoHeaders(clientCartId || null, cartType, req.headers.cookie),
                  body: JSON.stringify({
                    product_variant_id: String(variantId),
                    quantity: qty,
                  }),
                });

                const { data } = await safeParseZohoResponse(zohoRes, 'Zoho Cart Update Item');
                updateZohoSessionCookies(zohoRes, data, cartType);
                forwardZohoCookies(zohoRes, res, cartType);
                const activeIdToReturn = cartType === 'member' ? activeMemberZcid : activeGuestZcid;
                if (activeIdToReturn) res.setHeader('X-Cart-Id', activeIdToReturn);
                res.statusCode = zohoRes.status;
                res.end(JSON.stringify(data));
                return;
              }

              // DELETE /api/zoho-cart/item/:id - Permanently remove item from Zoho Commerce Cart
              if (path.startsWith('/api/zoho-cart/item/') && req.method === 'DELETE') {
                const variantId = path.split('/api/zoho-cart/item/')[1];
                console.log(`[Vite Zoho Cart] Permanently removing variant ${variantId} (${cartType}) for cartId=${clientCartId || '(active)'}`);

                // Official Zoho Commerce Storefront deletion endpoint: DELETE /storefront/api/v1/cart?product_variant_id=...
                const zohoRes = await fetch(`https://${storefrontDomain}/storefront/api/v1/cart?product_variant_id=${encodeURIComponent(variantId)}`, {
                  method: 'DELETE',
                  headers: getZohoHeaders(clientCartId || null, cartType, req.headers.cookie),
                });

                const { data: delData } = await safeParseZohoResponse(zohoRes, 'Zoho Cart Delete Item');
                updateZohoSessionCookies(zohoRes, delData, cartType);

                if (!zohoRes.ok || (delData.status_code && delData.status_code !== '0' && delData.status_code !== 0)) {
                  console.error(`[Vite Zoho Cart] Delete failed for variant ${variantId}:`, delData);
                  res.statusCode = zohoRes.status || 400;
                  res.end(JSON.stringify(delData));
                  return;
                }

                // After confirmed deletion in Zoho Commerce, fetch verified remaining cart contents
                const verifyRes = await fetch(`https://${storefrontDomain}/storefront/api/v1/cart`, {
                  method: 'GET',
                  headers: getZohoHeaders(clientCartId || null, cartType, req.headers.cookie),
                });

                const { data: verifiedCart } = await safeParseZohoResponse(verifyRes, 'Zoho Cart Verify Get');
                updateZohoSessionCookies(verifyRes, verifiedCart, cartType);
                forwardZohoCookies(verifyRes, res, cartType);

                const activeIdToReturn = cartType === 'member' ? activeMemberZcid : activeGuestZcid;
                if (activeIdToReturn) res.setHeader('X-Cart-Id', activeIdToReturn);
                res.statusCode = 200;
                res.end(JSON.stringify(verifiedCart));
                return;
              }

              // POST /api/zoho-cart/clear - Clear active cart
              if (path === '/api/zoho-cart/clear') {
                if (cartType === 'member') {
                  activeMemberZcid = '';
                } else {
                  activeGuestZcid = '';
                }
                res.statusCode = 200;
                res.setHeader('X-Cart-Id', '');
                res.setHeader('Set-Cookie', `${cartType === 'member' ? 'zcid' : 'zcidg'}=; Max-Age=0; Path=/; SameSite=Lax`);
                res.end(JSON.stringify({ code: 0, message: 'Cart cleared successfully' }));
                return;
              }
            } catch (err) {
              console.error('[Vite Zoho Cart Error]:', err.message);
              res.statusCode = 500;
              res.end(JSON.stringify({ code: 500, error: err.message }));
              return;
            }

            next();
          });

          // =========================================================================
          // 3. Endpoint: Zoho Checkout API Handlers (/api/zoho-checkout)
          // Native Headless Checkout & Payment Processing via Zoho Commerce Checkout API
          // =========================================================================
          server.middlewares.use(async (req, res, next) => {
            if (!req.url.startsWith('/api/zoho-checkout')) {
              return next();
            }

            const urlObj = new URL(req.url, 'http://localhost');
            const path = urlObj.pathname;
            const cartType = req.headers['x-cart-type'] || urlObj.searchParams.get('cart_type') || (activeMemberZcid ? 'member' : 'guest');
            const cookieZcid = req.headers.cookie ? req.headers.cookie.match(/\bzcid=([^;]+)/)?.[1] : null;
            const cookieZcidg = req.headers.cookie ? req.headers.cookie.match(/\bzcidg=([^;]+)/)?.[1] : null;
            const currentCookieId = cartType === 'member' ? (cookieZcid || cookieZcidg) : (cookieZcidg || cookieZcid);
            const activeId = cartType === 'member' ? (activeMemberZcid || activeGuestZcid) : (activeGuestZcid || activeMemberZcid);
            let clientCartId = (urlObj.searchParams.get('cart_id') || req.headers['x-cart-id'] || currentCookieId || activeId || '').trim();
            if (clientCartId === 'zoho-cart-active' || clientCartId === 'undefined' || clientCartId === 'null') {
              clientCartId = '';
            }

            res.setHeader('Content-Type', 'application/json');

            try {
              // GET /api/zoho-checkout - Retrieve checkout editpage details (items, totals, shipping options, payment options)
              if ((path === '/api/zoho-checkout' || path === '/api/zoho-checkout/') && req.method === 'GET') {
                if (!clientCartId) {
                  res.statusCode = 200;
                  res.end(JSON.stringify({ code: 0, message: 'No active checkout session', checkout: null }));
                  return;
                }

                console.log(`[Vite Zoho Checkout] Fetching checkout details (${cartType}) for active cartId=${clientCartId}`);
                const zohoRes = await fetch(`https://${storefrontDomain}/storefront/api/v2/checkout/editpage?checkout_id=${clientCartId}`, {
                  method: 'GET',
                  headers: getZohoHeaders(clientCartId, cartType, req.headers.cookie),
                });

                const { data } = await safeParseZohoResponse(zohoRes, 'Zoho Checkout Details');
                if (zohoRes.status === 404 || zohoRes.status === 400) {
                  res.statusCode = 200;
                  res.end(JSON.stringify({ code: 0, message: 'Cart session expired', checkout: null }));
                  return;
                }
                updateZohoSessionCookies(zohoRes, data, cartType);
                forwardZohoCookies(zohoRes, res, cartType);
                res.statusCode = zohoRes.status;
                res.end(JSON.stringify(data));
                return;
              }

              // PUT /api/zoho-checkout/address - Update customer info, shipping & billing address
              if (path === '/api/zoho-checkout/address' && req.method === 'PUT') {
                const body = await parseRequestBody(req);
                let cid = (body.cart_id || clientCartId || '').trim();
                if (cid === 'zoho-cart-active' || cid === 'undefined' || cid === 'null') {
                  cid = '';
                }

                const payloadData = body.payload || body;
                const lines = body.lines || payloadData.lines || [];

                async function sendAddressUpdate(targetCid) {
                  return fetch(`https://${storefrontDomain}/storefront/api/v2/checkout/${targetCid}`, {
                    method: 'PUT',
                    headers: getZohoHeaders(targetCid, cartType, req.headers.cookie),
                    body: JSON.stringify(payloadData),
                  });
                }

                let zohoRes = null;
                if (cid) {
                  console.log(`[Vite Zoho Checkout] Updating customer and shipping address for cartId=${cid} (${cartType})`);
                  zohoRes = await sendAddressUpdate(cid);
                }

                // If missing or Zoho returned 404 / 400 (session expired or invalid cart ID), auto-recover
                const isInvalidCart = !zohoRes || zohoRes.status === 404 || zohoRes.status === 400;

                if (isInvalidCart && lines && lines.length > 0) {
                  console.warn(`[Vite Zoho Checkout] Cart session (${cid || 'none'}) invalid or not found on Zoho Commerce (status: ${zohoRes?.status}). Auto-creating fresh cart session from ${lines.length} item(s)...`);
                  try {
                    let freshCartId = '';
                    for (const line of lines) {
                      const variantId = line.variantId || line.product_variant_id || line.id;
                      const qty = line.quantity || 1;
                      if (variantId) {
                        const addRes = await fetch(`https://${storefrontDomain}/storefront/api/v1/cart`, {
                          method: 'POST',
                          headers: getZohoHeaders(freshCartId || null, cartType, req.headers.cookie),
                          body: JSON.stringify({
                            product_variant_id: String(variantId),
                            quantity: Math.max(1, parseInt(qty, 10)),
                          }),
                        });
                        const { data: addData } = await safeParseZohoResponse(addRes, 'Zoho Checkout Auto-Cart Add');
                        updateZohoSessionCookies(addRes, addData, cartType);
                        const newId = addData.payload?.cart_id || addData.payload?.cart?.cart_id;
                        if (newId) freshCartId = newId;
                      }
                    }

                    if (freshCartId) {
                      cid = freshCartId;
                      if (cartType === 'member') activeMemberZcid = freshCartId;
                      else activeGuestZcid = freshCartId;
                      console.log(`[Vite Zoho Checkout] Fresh cart session created: ${freshCartId}. Retrying address update...`);
                      zohoRes = await sendAddressUpdate(freshCartId);
                    }
                  } catch (recErr) {
                    console.error('[Vite Zoho Checkout] Cart auto-recovery error:', recErr.message);
                  }
                }

                if (!zohoRes) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ code: 400, message: 'Please add items to your cart before proceeding to checkout.' }));
                  return;
                }

                const { data } = await safeParseZohoResponse(zohoRes, 'Zoho Checkout Address');
                updateZohoSessionCookies(zohoRes, data, cartType);
                forwardZohoCookies(zohoRes, res, cartType);
                if (cid) res.setHeader('X-Cart-Id', cid);
                res.statusCode = zohoRes.status;
                res.end(JSON.stringify(data));
                return;
              }

              // PUT /api/zoho-checkout/shipping-method - Select shipping method
              if (path === '/api/zoho-checkout/shipping-method' && req.method === 'PUT') {
                const body = await parseRequestBody(req);
                let cid = (body.cart_id || clientCartId || activeId || '').trim();
                if (cid === 'zoho-cart-active' || cid === 'undefined' || cid === 'null') {
                  cid = activeId || '';
                }

                console.log(`[Vite Zoho Checkout] Selecting shipping method ${body.shipping_charge_id} for cartId=${cid} (${cartType})`);
                const zohoRes = await fetch(`https://${storefrontDomain}/storefront/api/v2/checkout/${cid}`, {
                  method: 'PUT',
                  headers: getZohoHeaders(cid, cartType, req.headers.cookie),
                  body: JSON.stringify({ shipping_charge_id: body.shipping_charge_id }),
                });

                const { data } = await safeParseZohoResponse(zohoRes, 'Zoho Checkout Shipping');
                updateZohoSessionCookies(zohoRes, data, cartType);
                forwardZohoCookies(zohoRes, res, cartType);
                res.statusCode = zohoRes.status;
                res.end(JSON.stringify(data));
                return;
              }

              // POST /api/zoho-checkout/pay - Process payment via Zoho Checkout API
              if (path === '/api/zoho-checkout/pay' && req.method === 'POST') {
                const body = await parseRequestBody(req);
                let cid = (body.cart_id || clientCartId || activeId || '').trim();
                if (cid === 'zoho-cart-active' || cid === 'undefined' || cid === 'null') {
                  cid = activeId || '';
                }
                const paymentMethod = body.payment_method || 'card';
                const isOffline = body.is_offline || paymentMethod === 'offline_payment' || paymentMethod === 'cash_on_delivery';

                console.log(`[Vite Zoho Checkout] Processing payment for cartId=${cid}, method=${paymentMethod}, isOffline=${isOffline} (${cartType})`);

                if (isOffline) {
                  // Offline order completion - Zoho Commerce requires exact gateway name 'Cash on Delivery '
                  const compRes = await fetch(`https://${storefrontDomain}/storefront/api/v2/checkout/${cid}/complete`, {
                    method: 'POST',
                    headers: getZohoHeaders(cid, cartType, req.headers.cookie),
                    body: JSON.stringify({
                      payment_gateway: 'Cash on Delivery ',
                      order_notes: body.order_notes || 'Placed via headless checkout',
                    }),
                  });

                  const { data: compData } = await safeParseZohoResponse(compRes, 'Zoho Checkout Pay Complete');
                  updateZohoSessionCookies(compRes, compData, cartType);
                  forwardZohoCookies(compRes, res, cartType);
                  if (compRes.ok && (compData.code === 0 || compData.salesorder_number || compData.order_id)) {
                    if (cartType === 'member') activeMemberZcid = '';
                    else activeGuestZcid = '';
                  }
                  res.statusCode = compRes.status;
                  res.end(JSON.stringify(compData));
                  return;
                } else {
                  // Online payment gateway initiation
                  const payRes = await fetch(`https://${storefrontDomain}/storefront/api/v2/checkout/${cid}`, {
                    method: 'PUT',
                    headers: getZohoHeaders(cid, cartType, req.headers.cookie),
                    body: JSON.stringify({
                      payment_method: paymentMethod,
                      order_notes: body.order_notes || 'Placed via headless checkout',
                    }),
                  });

                  const { data: payData } = await safeParseZohoResponse(payRes, 'Zoho Checkout Online Pay');
                  updateZohoSessionCookies(payRes, payData, cartType);
                  forwardZohoCookies(payRes, res, cartType);
                  res.statusCode = payRes.status;
                  res.end(JSON.stringify({
                    code: payData.code,
                    message: payData.message,
                    checkout_id: cid,
                    total: payData.checkout?.total,
                    currency_code: payData.checkout?.currency_code || 'INR',
                    payment_url: payData.checkout?.payment_url,
                    new_payment_url: payData.checkout?.new_payment_url,
                    checkout: payData.checkout,
                  }));
                  return;
                }
              }
            } catch (err) {
              console.error('[Vite Zoho Checkout Error]:', err.message);
              res.statusCode = 500;
              res.end(JSON.stringify({ code: 500, error: err.message }));
              return;
            }

            next();
          });

          // =========================================================================
          // 4. Endpoint: Zoho Image Proxy
          // =========================================================================
          server.middlewares.use(async (req, res, next) => {
            if (!req.url.startsWith('/api/zoho-image')) {
              return next();
            }
            const urlObj = new URL(req.url, 'http://localhost');
            const targetUrl = urlObj.searchParams.get('url');
            if (!targetUrl || !targetUrl.includes('zohoecommerce')) {
              res.statusCode = 400;
              res.end('Missing or invalid image url');
              return;
            }
            try {
              const imgRes = await fetch(targetUrl);
              if (!imgRes.ok) {
                res.statusCode = imgRes.status;
                res.end('Failed to fetch image');
                return;
              }
              const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
              res.setHeader('Content-Type', contentType);
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Cache-Control', 'public, max-age=86400');
              const buffer = Buffer.from(await imgRes.arrayBuffer());
              res.end(buffer);
            } catch (err) {
              res.statusCode = 502;
              res.end('Image proxy error: ' + err.message);
            }
          });
        },
      },
    ],
    server: {
      port: 3000,
      strictPort: true,
      proxy: {
        // Proxy Storefront Cart & Store-Meta API
        '/storefront/api': {
          target: `https://${storefrontDomain}`,
          changeOrigin: true,
          secure: true,
          cookieDomainRewrite: {
            '*': '',
          },
          cookiePathRewrite: {
            '*': '/',
          },
          headers: {
            'domain-name': storefrontDomain,
          },
          onProxyReq(proxyReq, req) {
            const cartType = req.headers['x-cart-type'] || 'guest';
            if (cartType === 'member' && activeMemberZcid) {
              proxyReq.setHeader('Cookie', `zcid=${activeMemberZcid}`);
            } else if (activeGuestZcid) {
              proxyReq.setHeader('Cookie', `zcid=${activeGuestZcid}`);
            }
          },
        },
        '/store/api': {
          target: 'https://commerce.zoho.in',
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
