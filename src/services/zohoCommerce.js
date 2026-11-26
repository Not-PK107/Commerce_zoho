/**
 * Zoho Commerce Storefront & Admin API Service Layer
 * 
 * Target: Zoho Commerce India Data Centre
 * Storefront Domain: demo-60096917552.zohoecommerce.in
 * Store ID: 60096917646 | Org ID: 60096917552
 * 
 * 100% Dynamic integration with live Zoho Commerce Cart and Checkout APIs.
 */

const STOREFRONT_DOMAIN = import.meta.env?.VITE_ZOHO_STOREFRONT_DOMAIN || 'demo-60096917552.zohoecommerce.in';
const STOREFRONT_API_BASE = '/storefront/api/v1';
const ORG_ID = import.meta.env?.VITE_ZOHO_ORG_ID || '60096917552';

/**
 * Standard Headers for Zoho Storefront API
 */
function getStorefrontHeaders() {
  return {
    'Content-Type': 'application/json',
    'domain-name': STOREFRONT_DOMAIN,
  };
}

/**
 * Helper to strip HTML tags from rich text descriptions
 */
function cleanHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Maps actual Zoho Commerce Admin / Storefront API response into React product model.
 */
export function normalizeZohoProduct(raw) {
  if (!raw) return null;

  const id = String(raw.product_id || raw.id || '');
  const rawVariants = Array.isArray(raw.variants) ? raw.variants : (Array.isArray(raw.items) ? raw.items : []);

  // Determine the primary variant ID
  const variantId = String(
    (rawVariants[0] && (rawVariants[0].variant_id || rawVariants[0].item_id || rawVariants[0].id)) ||
    raw.default_variant_id ||
    raw.variant_id ||
    raw.item_id ||
    raw.product_variant_id ||
    id
  );

  const name = raw.name || raw.product_name || raw.title || 'Product';
  
  // Rate / Price
  const price = parseFloat(
    raw.min_rate ??
    (rawVariants[0] && rawVariants[0].rate) ??
    raw.rate ??
    raw.selling_price ??
    raw.price ??
    0
  );

  const currency = raw.currency_code || raw.currency || 'INR';

  // Description
  const rawDesc = raw.product_short_description || raw.product_description || raw.description || '';
  const description = cleanHtml(rawDesc);

  // Document & Image URLs (Prioritize verified fast Lyra CloudFront CDN)
  const images = [];
  if (raw.document_name) {
    images.push(`https://lyra.zohoecommerce.com/${ORG_ID}/product-images/${id}-${raw.document_name}`);
  }
  if (Array.isArray(raw.documents)) {
    raw.documents.forEach((doc) => {
      const fileName = doc.file_name || doc.document_name;
      if (fileName) {
        const prodUrl = `https://lyra.zohoecommerce.com/${ORG_ID}/product-images/${id}-${fileName}`;
        if (!images.includes(prodUrl)) images.push(prodUrl);
      }
    });
  }
  if (Array.isArray(raw.images)) {
    raw.images.forEach((img) => {
      let u = typeof img === 'string' ? img : img.url || img.image_url;
      if (u) {
        if (u.includes('/variant-images/')) {
          u = u.replace('/variant-images/', '/product-images/').replace(variantId, id);
        }
        if (!images.includes(u)) images.push(u);
      }
    });
  }
  if (raw.image_url) {
    let u = raw.image_url;
    if (u.includes('/variant-images/')) {
      u = u.replace('/variant-images/', '/product-images/').replace(variantId, id);
    }
    if (!images.includes(u)) images.push(u);
  }
  if (raw.featured_image) {
    let u = raw.featured_image;
    if (u.includes('/variant-images/')) {
      u = u.replace('/variant-images/', '/product-images/').replace(variantId, id);
    }
    if (!images.includes(u)) images.push(u);
  }

  const featuredImage = images[0] || null;

  // Stock calculations & normalization
  // Safely extract raw stock quantity
  const rawStock = raw.stock_on_hand ?? raw.overall_stock ?? raw.variants?.[0]?.stock_on_hand;
  const parsedStockOnHand = Number(rawStock);
  const stock_on_hand = !isNaN(parsedStockOnHand) && rawStock !== null && rawStock !== ''
    ? parsedStockOnHand
    : 0;

  // Safely extract in_stock flag (boolean)
  const rawInStock = raw.in_stock !== undefined
    ? raw.in_stock
    : (raw.is_in_stock !== undefined
        ? raw.is_in_stock
        : (raw.variants?.[0]?.in_stock !== undefined
            ? raw.variants[0].in_stock
            : (raw.status ? raw.status === 'active' : stock_on_hand > 0)));

  const in_stock = rawInStock === true || rawInStock === 'true';

  // Availability determination: product.in_stock === true && Number(product.stock_on_hand) > 0
  const inStock = in_stock === true && Number(stock_on_hand) > 0;
  const stockAvailability = inStock ? 'in_stock' : 'out_of_stock';

  const brand = raw.brand || raw.brand_name || (
    name.toLowerCase().includes('iphone') || name.toLowerCase().includes('apple')
      ? 'Apple'
      : (name.toLowerCase().includes('samsung') ? 'Samsung' : 'Zoho Store')
  );

  const category = raw.category_name || raw.category || 'Electronics';

  const variants = rawVariants.map((v) => {
    const rawVStock = v.stock_on_hand !== undefined ? v.stock_on_hand : rawStock;
    const parsedVStock = Number(rawVStock);
    const vStockOnHand = !isNaN(parsedVStock) && rawVStock !== null && rawVStock !== ''
      ? parsedVStock
      : 0;

    const rawVInStock = v.in_stock !== undefined
      ? v.in_stock
      : (v.available !== undefined
          ? v.available
          : in_stock);

    const vInStock = rawVInStock === true || rawVInStock === 'true';
    const vInStockAvailable = vInStock === true && Number(vStockOnHand) > 0;

    return {
      id: String(v.variant_id || v.item_id || v.id || variantId),
      name: v.name || v.variant_name || v.title || name,
      price: parseFloat(v.rate ?? v.selling_price ?? v.price ?? price),
      sku: v.sku || '',
      inStock: vInStockAvailable,
      in_stock: vInStock,
      stockOnHand: vStockOnHand,
      stock_on_hand: vStockOnHand,
    };
  });

  return {
    id,
    variantId,
    name,
    title: name,
    handle: raw.url || raw.url_slug || raw.handle || id,
    brand,
    category,
    price,
    currency,
    description,
    shortDescription: description,
    stockOnHand: stock_on_hand,
    stock_on_hand,
    stockAvailability,
    inStock,
    in_stock,
    status: raw.status || (inStock ? 'active' : 'inactive'),
    isPublished: raw.show_in_storefront !== false && raw.is_published !== false,
    featuredImage,
    images: images.length > 0 ? images : (featuredImage ? [featuredImage] : []),
    variants: variants.length > 0 ? variants : [
      {
        id: variantId,
        name: 'Default Variant',
        price,
        sku: raw.sku || '',
        inStock,
        in_stock,
        stockOnHand: stock_on_hand,
        stock_on_hand,
      },
    ],
  };
}

/**
 * Diagnostic info regarding Zoho Commerce API capabilities
 */
export const apiCapabilities = {
  storefrontCartApi: 'Active: POST /storefront/api/v1/cart',
  storefrontCheckoutApi: 'Active: Zoho Commerce Headless Checkout API (v2)',
  storeMetaApi: 'Active: GET /storefront/api/v1/store-meta',
  adminCatalogApi: 'Active: GET /store/api/v1/products (OAuth token)',
};

/**
 * Fetch Store Metadata
 */
export async function fetchStoreMeta() {
  try {
    const response = await fetch(`${STOREFRONT_API_BASE}/store-meta`, {
      method: 'GET',
      headers: getStorefrontHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      return { success: false, status: response.status };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * In-flight promise registries to deduplicate concurrent requests across React renders & Strict Mode
 */
let inFlightProductsPromise = null;
const inFlightCartPromises = new Map();
const inFlightCheckoutPromises = new Map();

/**
 * Safely parses response body as JSON after inspecting raw text
 */
async function safeJsonParse(response, context = 'Zoho Commerce API') {
  let rawText;
  try {
    rawText = await response.text();
  } catch (err) {
    console.error(`[${context}] Stream read error:`, err.message);
    return { status_code: response.status, error: { message: err.message } };
  }

  try {
    return JSON.parse(rawText);
  } catch {
    console.warn(`[${context}] Non-JSON response (HTTP ${response.status}): ${rawText.trim().slice(0, 200)}`);
    return {
      status_code: response.status,
      code: response.status,
      message: `HTTP ${response.status}: ${rawText.trim().slice(0, 150)}`,
      error: { message: rawText.trim().slice(0, 150), code: response.status },
      raw: rawText.trim(),
    };
  }
}

/**
 * Fetch Real Products from Zoho Commerce
 */
export async function fetchProducts() {
  if (inFlightProductsPromise) {
    return inFlightProductsPromise;
  }

  inFlightProductsPromise = (async () => {
    try {
      const response = await fetch('/api/zoho-products', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const json = await safeJsonParse(response, 'Zoho Products');
        let rawList = Array.isArray(json.products)
          ? json.products
          : (Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []));

        // Resilient fallback to .json if static hosting serves SPA index.html for extensionless path
        if (rawList.length === 0) {
          try {
            const fallbackRes = await fetch('/api/zoho-products.json', {
              method: 'GET',
              headers: { 'Accept': 'application/json' },
            });
            if (fallbackRes.ok) {
              const fallbackJson = await safeJsonParse(fallbackRes, 'Zoho Products JSON Fallback');
              rawList = Array.isArray(fallbackJson.products)
                ? fallbackJson.products
                : (Array.isArray(fallbackJson.data) ? fallbackJson.data : (Array.isArray(fallbackJson) ? fallbackJson : []));
            }
          } catch {
            // ignore
          }
        }

        if (rawList.length > 0) {
          console.log(`[Zoho Commerce] Successfully retrieved ${rawList.length} real products from Zoho store.`);
          return rawList.map(normalizeZohoProduct);
        }
      }
    } catch (err) {
      console.error('[Zoho Commerce Product Retrieval Failed]:', err.message);
    } finally {
      inFlightProductsPromise = null;
    }

    return [];
  })();

  return inFlightProductsPromise;
}

/**
 * Normalizes Zoho Storefront Cart response into a clean client structure
 */
export function normalizeZohoCartResponse(json) {
  if (!json) return null;

  // Check if Zoho returned an error payload
  if (json.status_code && json.status_code !== '0' && json.status_code !== 0) {
    const msg = json.error?.message || json.developer_message || 'Zoho Cart Error';
    const err = new Error(msg);
    err.code = json.error?.code || json.status_code;
    throw err;
  }

  const rawCart = json.payload?.cart || json.payload || json.cart || json.data || json;

  const id = rawCart.cart_id || json.payload?.cart_id || json.payload?.cart?.cart_id || json.cart_id || null;
  const checkoutPath = rawCart.checkout_url || json.payload?.checkout_url || '/checkout';
  let checkoutUrl = checkoutPath.startsWith('http')
    ? checkoutPath
    : `https://${STOREFRONT_DOMAIN}${checkoutPath}`;

  if (id && !checkoutUrl.includes('checkout_id=')) {
    checkoutUrl += (checkoutUrl.includes('?') ? '&' : '?') + `checkout_id=${id}`;
  }

  const storeCartUrl = id
    ? `https://${STOREFRONT_DOMAIN}/cart?checkout_id=${id}`
    : `https://${STOREFRONT_DOMAIN}/cart`;

  const rawLines = rawCart.line_items || rawCart.items || rawCart.lines || json.payload?.line_items || [];

  const lines = rawLines.map((item) => {
    const lineId = String(item.line_item_id || item.id || item.product_variant_id || item.variant_id);
    const variantId = String(item.product_variant_id || item.variant_id || item.item_id || '');
    const productId = String(item.product_id || '');
    const title = item.product_name || item.name || item.title || 'Product';
    const price = parseFloat(item.rate ?? item.price ?? item.unit_price ?? item.selling_price ?? 0);
    const quantity = parseInt(item.quantity || 1, 10);
    
    let image = null;
    const docName = item.image_name || item.document_name;
    if (docName && productId) {
      image = `https://lyra.zohoecommerce.com/${ORG_ID}/product-images/${productId}-${docName}`;
    } else {
      const rawImage = item.image_url || item.image?.url || item.image || (Array.isArray(item.images) ? item.images[0]?.url || item.images[0] : null);
      if (typeof rawImage === 'string') {
        if (rawImage.includes('lyra.zohoecommerce.com')) {
          image = rawImage.replace('/variant-images/', '/product-images/');
        } else if (rawImage.startsWith('/')) {
          const parts = rawImage.split('/').filter(Boolean);
          const fname = parts[1];
          if (fname && productId) {
            image = `https://lyra.zohoecommerce.com/${ORG_ID}/product-images/${productId}-${fname}`;
          } else {
            image = `https://${STOREFRONT_DOMAIN}${rawImage}`;
          }
        } else {
          image = rawImage;
        }
      } else if (rawImage?.url) {
        image = rawImage.url;
      }
    }

    return {
      id: lineId,
      lineItemId: lineId,
      variantId,
      productId,
      title,
      price,
      currency: rawCart.currency_code || item.currency_code || item.currency || 'INR',
      quantity,
      image,
      variantTitle: item.variant_name || item.attribute_name || null,
    };
  });

  const subtotal = typeof rawCart.sub_total === 'number'
    ? rawCart.sub_total
    : parseFloat(rawCart.sub_total || rawCart.subtotal || rawCart.total_price || rawCart.total || 0);

  const totalItems = typeof rawCart.count === 'number'
    ? rawCart.count
    : (typeof rawCart.cart_count === 'number' ? rawCart.cart_count : lines.reduce((sum, item) => sum + item.quantity, 0));

  return {
    id,
    checkoutUrl,
    storeCartUrl,
    lines,
    totalItems,
    subtotal: subtotal || lines.reduce((sum, it) => sum + it.price * it.quantity, 0),
    currency: rawCart.currency_code || 'INR',
  };
}

// ==============================================================================
// CART API INTEGRATION
// ==============================================================================

/**
 * Add product variant to Zoho Commerce Cart
 * Supports both guest ('guest') and registered customer ('member') cart types.
 */
export async function addToCartApi(productVariantId, quantity = 1, cartId = null, cartType = 'guest') {
  let cleanVariantId = productVariantId;
  if (typeof cleanVariantId === 'object' && cleanVariantId !== null) {
    cleanVariantId =
      cleanVariantId.variantId ||
      cleanVariantId.variant_id ||
      cleanVariantId.default_variant_id ||
      cleanVariantId.item_id ||
      cleanVariantId.variants?.[0]?.id ||
      cleanVariantId.id;
  }
  cleanVariantId = String(cleanVariantId || '').trim();

  if (!cleanVariantId || cleanVariantId === '[object Object]') {
    throw new Error('Missing or invalid product_variant_id for Zoho Add to Cart API');
  }

  const payload = {
    product_variant_id: cleanVariantId,
    quantity: Math.max(1, parseInt(quantity, 10)),
  };
  if (cartId && String(cartId) !== 'zoho-cart-active') {
    payload.cart_id = String(cartId);
  }

  // 1. Try our server-side Cart endpoint (auto-session handling & auto-recovery)
  try {
    const response = await fetch('/api/zoho-cart/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cart-Type': cartType,
        ...(cartId ? { 'X-Cart-Id': String(cartId) } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await safeJsonParse(response, 'Zoho Cart Add');

    if (!response.ok || (data.status_code && data.status_code !== '0' && data.status_code !== 0)) {
      const errText = data.error?.message || data.developer_message || `Cart request failed with status ${response.status}`;
      const err = new Error(errText);
      err.code = data.error?.code;
      throw err;
    }

    const normalized = normalizeZohoCartResponse(data);
    if (normalized && !normalized.id) {
      normalized.id = response.headers.get('x-cart-id') || (cartId ? String(cartId) : null);
    }
    return normalized;
  } catch (err) {
    // If it's a specific validation error from Zoho (e.g. quantity exceeded), rethrow immediately
    if (err.code && err.code !== 107401 && err.code !== 15) {
      throw err;
    }

    console.warn('[Cart API] Server-side /api/zoho-cart/add fallback to storefront:', err.message);

    // 2. Direct storefront proxy fallback
    const headers = getStorefrontHeaders();
    headers['X-Cart-Type'] = cartType;
    if (cartId) {
      headers['X-Cart-Id'] = String(cartId);
    }

    const response = await fetch(`${STOREFRONT_API_BASE}/cart`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await safeJsonParse(response, 'Zoho Storefront Add');
    if (!response.ok || (data.status_code && data.status_code !== '0' && data.status_code !== 0)) {
      const errText = data.error?.message || data.developer_message || `Zoho Cart API returned HTTP ${response.status}`;
      throw new Error(errText, { cause: err });
    }

    return normalizeZohoCartResponse(data);
  }
}

/**
 * Fetch current Cart session from Zoho Commerce
 */
export async function getCartApi(cartId = null, cartType = 'guest') {
  const reqKey = `${cartType}:${cartId || 'active'}`;
  if (inFlightCartPromises.has(reqKey)) {
    return inFlightCartPromises.get(reqKey);
  }

  const promise = (async () => {
    // 1. Try server-side Cart endpoint
    try {
      const params = new URLSearchParams();
      if (cartId) params.set('cart_id', cartId);
      if (cartType) params.set('cart_type', cartType);
      const qs = params.toString();
      const url = qs ? `/api/zoho-cart?${qs}` : '/api/zoho-cart';

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Cart-Type': cartType,
          ...(cartId ? { 'X-Cart-Id': String(cartId) } : {}),
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await safeJsonParse(response, 'Zoho Cart Get');
        if (data.status_code && data.status_code !== '0' && data.status_code !== 0) {
          return null;
        }
        const normalized = normalizeZohoCartResponse(data);
        if (normalized && !normalized.id) {
          normalized.id = response.headers.get('x-cart-id') || (cartId ? String(cartId) : null);
        }
        return normalized;
      }
    } catch (err) {
      console.warn('[Cart API] Server-side /api/zoho-cart fallback to storefront:', err.message);
    }

    // 2. Direct storefront proxy fallback
    const headers = getStorefrontHeaders();
    headers['X-Cart-Type'] = cartType;
    if (cartId) {
      headers['X-Cart-Id'] = String(cartId);
    }

    try {
      const response = await fetch(`${STOREFRONT_API_BASE}/cart`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (response.ok) {
        const data = await safeJsonParse(response, 'Zoho Storefront Cart');
        if (data.status_code && data.status_code !== '0' && data.status_code !== 0) {
          return null;
        }
        const normalized = normalizeZohoCartResponse(data);
        if (normalized && !normalized.id) {
          normalized.id = response.headers.get('x-cart-id') || (cartId ? String(cartId) : null);
        }
        return normalized;
      }
    } catch (err) {
      console.warn('Zoho Get Cart error:', err.message);
    }

    return null;
  })();

  inFlightCartPromises.set(reqKey, promise);
  promise.finally(() => {
    inFlightCartPromises.delete(reqKey);
  });

  return promise;
}

/**
 * Update Line Item Quantity in Zoho Commerce Cart
 */
export async function updateCartItemApi(variantId, quantity, cartId = null, cartType = 'guest') {
  const cleanVariantId = String(variantId || '').trim();
  const qty = Math.max(0, parseInt(quantity, 10));
  if (!cleanVariantId) {
    throw new Error('Missing variant ID for updateCartItemApi');
  }

  // 1. Try server-side Cart endpoint
  try {
    const response = await fetch(`/api/zoho-cart/item/${encodeURIComponent(cleanVariantId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Cart-Type': cartType,
        ...(cartId ? { 'X-Cart-Id': String(cartId) } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ quantity: qty, product_variant_id: cleanVariantId, cart_id: cartId }),
    });

    const data = await safeJsonParse(response, 'Zoho Cart Update');
    if (!response.ok || (data.status_code && data.status_code !== '0' && data.status_code !== 0)) {
      const errText = data.error?.message || data.developer_message || `Cart update request failed with status ${response.status}`;
      throw new Error(errText);
    }

    const normalized = normalizeZohoCartResponse(data);
    if (normalized && !normalized.id) {
      normalized.id = response.headers.get('x-cart-id') || (cartId ? String(cartId) : null);
    }
    return normalized;
  } catch (err) {
    console.warn('[Cart API] Server-side update fallback to storefront:', err.message);

    // 2. Direct storefront proxy fallback using official Zoho Commerce Storefront endpoint
    const headers = getStorefrontHeaders();
    headers['X-Cart-Type'] = cartType;
    if (cartId) headers['X-Cart-Id'] = String(cartId);

    const response = await fetch(`${STOREFRONT_API_BASE}/cart`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify({ product_variant_id: cleanVariantId, quantity: qty }),
    });

    const data = await safeJsonParse(response, 'Zoho Storefront Update');
    if (!response.ok || (data.status_code && data.status_code !== '0' && data.status_code !== 0)) {
      const errText = data.error?.message || data.developer_message || `Zoho Cart Update returned HTTP ${response.status}`;
      throw new Error(errText, { cause: err });
    }

    return normalizeZohoCartResponse(data);
  }
}

/**
 * Permanently remove Line Item from Zoho Commerce Cart
 */
export async function removeCartItemApi(variantId, cartId = null, cartType = 'guest') {
  const cleanVariantId = String(variantId || '').trim();
  if (!cleanVariantId) {
    throw new Error('Missing variant ID for removeCartItemApi');
  }

  // 1. Try server-side Cart endpoint
  try {
    const response = await fetch(`/api/zoho-cart/item/${encodeURIComponent(cleanVariantId)}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'X-Cart-Type': cartType,
        ...(cartId ? { 'X-Cart-Id': String(cartId) } : {}),
      },
      credentials: 'include',
    });

    const data = await safeJsonParse(response, 'Zoho Cart Remove');
    if (!response.ok || (data.status_code && data.status_code !== '0' && data.status_code !== 0)) {
      const errText = data.error?.message || data.developer_message || `Cart remove request failed with status ${response.status}`;
      throw new Error(errText);
    }

    const normalized = normalizeZohoCartResponse(data);
    if (normalized && !normalized.id) {
      normalized.id = response.headers.get('x-cart-id') || (cartId ? String(cartId) : null);
    }
    return normalized;
  } catch (err) {
    console.warn('[Cart API] Server-side remove fallback to storefront:', err.message);

    // 2. Direct storefront proxy fallback using official Zoho Commerce Storefront endpoint
    const headers = getStorefrontHeaders();
    headers['X-Cart-Type'] = cartType;
    if (cartId) headers['X-Cart-Id'] = String(cartId);

    const delUrl = `${STOREFRONT_API_BASE}/cart?product_variant_id=${encodeURIComponent(cleanVariantId)}`;
    const response = await fetch(delUrl, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    const data = await safeJsonParse(response, 'Zoho Storefront Remove');
    if (!response.ok || (data.status_code && data.status_code !== '0' && data.status_code !== 0)) {
      const errText = data.error?.message || data.developer_message || `Zoho Cart Delete returned HTTP ${response.status}`;
      throw new Error(errText, { cause: err });
    }

    // Verify remaining cart contents using Get Cart API
    return await getCartApi(cartId, cartType);
  }
}

/**
 * Clear the entire cart session
 */
export async function clearCartApi(cartId = null, cartType = 'guest') {
  try {
    await fetch('/api/zoho-cart/clear', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cart-Type': cartType,
        ...(cartId ? { 'X-Cart-Id': String(cartId) } : {}),
      },
      credentials: 'include',
    });
  } catch {
    // ignore
  }
}

// ==============================================================================
// CHECKOUT API INTEGRATION (Headless Payment Processing)
// ==============================================================================

/**
 * Fetch live checkout edit page details (Subtotal, Shipping options, Payment methods, Address info)
 * Deduplicates in-flight requests and ensures checkout details are retrieved for the active cart.
 */
export async function getCheckoutDetailsApi(cartId = '', cartType = 'guest') {
  const reqKey = `${cartType}:${cartId || 'active'}`;
  if (inFlightCheckoutPromises.has(reqKey)) {
    return inFlightCheckoutPromises.get(reqKey);
  }

  const promise = (async () => {
    const params = new URLSearchParams();
    if (cartId) params.set('cart_id', cartId);
    if (cartType) params.set('cart_type', cartType);
    const qs = params.toString();
    const url = qs ? `/api/zoho-checkout?${qs}` : '/api/zoho-checkout';

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(cartId ? { 'X-Cart-Id': String(cartId) } : {}),
        'X-Cart-Type': String(cartType),
      },
      credentials: 'include',
    });

    const data = await safeJsonParse(response, 'Zoho Checkout Details');

    if (!response.ok) {
      throw new Error(data.message || data.error?.message || `Failed to load checkout details from Zoho Commerce (HTTP ${response.status})`);
    }

    return data;
  })();

  inFlightCheckoutPromises.set(reqKey, promise);
  promise.finally(() => {
    inFlightCheckoutPromises.delete(reqKey);
  });

  return promise;
}

/**
 * Save Customer Details & Shipping/Billing Address via Zoho Commerce Checkout API
 */
export async function saveCheckoutAddressApi(cartId = '', { customer, shippingAddress, billingAddress, lines = [] }, cartType = 'guest') {
  const payload = {
    customer: {
      first_name: customer.firstName || customer.first_name,
      last_name: customer.lastName || customer.last_name,
      email: customer.email,
      mobile: customer.phone || customer.mobile,
      shipping_address: {
        first_name: shippingAddress.firstName || shippingAddress.first_name || customer.firstName || '',
        last_name: shippingAddress.lastName || shippingAddress.last_name || customer.lastName || '',
        attention: shippingAddress.attention || `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
        address: shippingAddress.address,
        city: shippingAddress.city,
        state: shippingAddress.state,
        country: shippingAddress.country || 'IN',
        zip: shippingAddress.zip || shippingAddress.pincode,
        phone: shippingAddress.phone || customer.phone || customer.mobile || '',
      },
      billing_address: {
        first_name: billingAddress.firstName || billingAddress.first_name || customer.firstName || '',
        last_name: billingAddress.lastName || billingAddress.last_name || customer.lastName || '',
        attention: billingAddress.attention || `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
        address: billingAddress.address,
        city: billingAddress.city,
        state: billingAddress.state,
        country: billingAddress.country || 'IN',
        zip: billingAddress.zip || billingAddress.pincode,
        phone: billingAddress.phone || customer.phone || customer.mobile || '',
      },
    },
  };

  const response = await fetch('/api/zoho-checkout/address', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(cartId ? { 'X-Cart-Id': String(cartId) } : {}),
      'X-Cart-Type': String(cartType),
    },
    credentials: 'include',
    body: JSON.stringify({
      cart_id: cartId || '',
      cart_type: cartType,
      lines: Array.isArray(lines) ? lines : [],
      payload,
    }),
  });

  const data = await safeJsonParse(response, 'Zoho Checkout Address');
  if (!response.ok || (data.code !== 0 && data.code !== undefined && data.status_code !== '0')) {
    throw new Error(data.message || data.error?.message || 'Failed to update address in Zoho Commerce');
  }

  return data;
}

/**
 * Select Shipping Method in Zoho Commerce Checkout
 */
export async function selectShippingMethodApi(cartId = '', shippingChargeId, cartType = 'guest') {
  if (!shippingChargeId) {
    throw new Error('Missing shipping_charge_id');
  }

  const response = await fetch('/api/zoho-checkout/shipping-method', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(cartId ? { 'X-Cart-Id': String(cartId) } : {}),
      'X-Cart-Type': String(cartType),
    },
    credentials: 'include',
    body: JSON.stringify({
      cart_id: cartId || '',
      cart_type: cartType,
      shipping_charge_id: shippingChargeId,
    }),
  });

  const data = await safeJsonParse(response, 'Zoho Checkout Shipping');
  if (!response.ok || (data.code !== 0 && data.code !== undefined && data.status_code !== '0')) {
    throw new Error(data.message || data.error?.message || 'Failed to select shipping method in Zoho Commerce');
  }

  return data;
}

/**
 * Process Payment via Zoho Commerce Checkout API
 * 
 * Supports both:
 * 1. Online Payment (Card / UPI / NetBanking through certified Zoho Payments Gateway)
 * 2. Cash on Delivery / Offline Payment
 */
export async function processPaymentApi(cartId = '', { paymentMethod = 'card', orderNotes = '', isOffline = false }, cartType = 'guest') {
  const response = await fetch('/api/zoho-checkout/pay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cartId ? { 'X-Cart-Id': String(cartId) } : {}),
      'X-Cart-Type': String(cartType),
    },
    credentials: 'include',
    body: JSON.stringify({
      cart_id: cartId || '',
      cart_type: cartType,
      payment_method: paymentMethod,
      order_notes: orderNotes,
      is_offline: isOffline,
    }),
  });

  const data = await safeJsonParse(response, 'Zoho Checkout Payment');
  if (!response.ok || (data.code !== 0 && data.code !== undefined && data.code !== '0')) {
    throw new Error(data.message || data.error?.message || 'Payment processing failed in Zoho Commerce');
  }

  return data;
}
