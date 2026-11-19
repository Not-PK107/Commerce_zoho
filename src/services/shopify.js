/**
 * Shopify Storefront GraphQL API Service Layer
 * 
 * Provides unified, decoupled API communication for mock.shop and production Shopify stores.
 */

const API_URL = import.meta.env.VITE_SHOPIFY_API_URL || 'https://mock.shop/api';
const STOREFRONT_TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN || 'public';

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

  // Only attach Storefront Access Token if defined and not using public mock
  if (STOREFRONT_TOKEN) {
    headers['X-Shopify-Storefront-Access-Token'] = STOREFRONT_TOKEN;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });

    const json = await response.json();

    if (json.errors) {
      console.error('GraphQL Errors:', json.errors);
      throw new Error(json.errors[0]?.message || 'GraphQL execution error');
    }

    return json.data;
  } catch (error) {
    console.error('Shopify API Request Failed:', error);
    throw error;
  }
}
