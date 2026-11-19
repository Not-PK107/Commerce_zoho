/**
 * Shopify Storefront GraphQL API Service Layer
 * 
 * Provides unified, decoupled API communication for mock.shop and production Shopify stores.
 */

const API_URL = import.meta.env.VITE_SHOPIFY_API_URL || 'https://mock.shop/api';
const STOREFRONT_TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN || 'public';

/**
 * Reusable GraphQL Queries
 */
export const GET_PRODUCTS_QUERY = `
  query GetProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          description
          handle
          availableForSale
          featuredImage {
            url
            altText
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                availableForSale
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const GET_PRODUCT_BY_HANDLE_QUERY = `
  query GetProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      description
      handle
      availableForSale
      featuredImage {
        url
        altText
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      variants(first: 10) {
        edges {
          node {
            id
            title
            availableForSale
            price {
              amount
              currencyCode
            }
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
`;

/**
 * Generic GraphQL request helper
 * @param {string} query GraphQL query or mutation string
 * @param {object} variables Variables payload
 * @returns {Promise<any>} Response data
 */
export async function shopifyFetch({ query, variables = {} }) {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Only attach Storefront Access Token if defined
  if (STOREFRONT_TOKEN) {
    headers['X-Shopify-Storefront-Access-Token'] = STOREFRONT_TOKEN;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();

    if (json.errors && json.errors.length > 0) {
      console.error('GraphQL Errors:', json.errors);
      throw new Error(json.errors[0]?.message || 'GraphQL execution error');
    }

    return json.data;
  } catch (error) {
    console.error('Shopify API Request Failed:', error);
    throw error;
  }
}

/**
 * Normalizes Shopify GraphQL product node
 * Converts connection edges/node pattern into friendly JavaScript arrays
 */
function normalizeProduct(node) {
  if (!node) return null;

  const variants = (node.variants?.edges || []).map((edge) => edge.node);

  return {
    id: node.id,
    title: node.title,
    description: node.description,
    handle: node.handle,
    availableForSale: node.availableForSale,
    featuredImage: node.featuredImage,
    priceRange: node.priceRange,
    variants,
    defaultVariantId: variants[0]?.id || null,
  };
}

/**
 * Fetches products list
 * @param {number} first Number of products to retrieve (default 20)
 * @returns {Promise<Array>} List of normalized products
 */
export async function fetchProducts(first = 20) {
  const data = await shopifyFetch({
    query: GET_PRODUCTS_QUERY,
    variables: { first },
  });

  const edges = data?.products?.edges || [];
  return edges.map((edge) => normalizeProduct(edge.node));
}

/**
 * Fetches single product by handle
 * @param {string} handle Product handle
 * @returns {Promise<Object|null>} Normalized product
 */
export async function fetchProductByHandle(handle) {
  const data = await shopifyFetch({
    query: GET_PRODUCT_BY_HANDLE_QUERY,
    variables: { handle },
  });

  return normalizeProduct(data?.product);
}

/**
 * Searches products by matching title or handle
 * @param {string} query Search text
 * @param {number} first Maximum items to return
 * @returns {Promise<Array>} Filtered products
 */
export async function searchProducts(query = '', first = 20) {
  const allProducts = await fetchProducts(first);
  if (!query || query.trim() === '') return allProducts;

  const lowerQuery = query.toLowerCase().trim();
  return allProducts.filter(
    (product) =>
      product.title.toLowerCase().includes(lowerQuery) ||
      product.handle.toLowerCase().includes(lowerQuery) ||
      (product.description && product.description.toLowerCase().includes(lowerQuery))
  );
}
