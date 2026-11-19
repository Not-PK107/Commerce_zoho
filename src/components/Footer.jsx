/**
 * Footer Component
 * Application footer with branding, links, and API connection indicator.
 */
export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <p className="footer-brand">&copy; {new Date().getFullYear()} Headless Storefront. Powered by Shopify Storefront API.</p>
        <p className="footer-meta">Backend Mode: {import.meta.env.VITE_SHOPIFY_API_URL?.includes('mock.shop') ? 'mock.shop (Development)' : 'Shopify Storefront API'}</p>
      </div>
    </footer>
  );
}
