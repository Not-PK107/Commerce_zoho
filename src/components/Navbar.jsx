/**
 * Navbar Component
 * Navigation header displaying brand logo, navigation links, search, and shopping cart counter.
 */
export default function Navbar({ cartCount = 0, onNavigate, activePage = 'home' }) {
  return (
    <header className="navbar">
      <div className="container navbar-container">
        <a href="#home" onClick={(e) => { e.preventDefault(); onNavigate?.('home'); }} className="navbar-logo">
          STOREFRONT
        </a>
        <nav className="navbar-nav">
          <button 
            type="button" 
            className={`nav-link ${activePage === 'home' ? 'active' : ''}`}
            onClick={() => onNavigate?.('home')}
          >
            Catalog
          </button>
        </nav>
        <div className="navbar-actions">
          <button 
            type="button" 
            className="cart-button"
            onClick={() => onNavigate?.('cart')}
            aria-label="Shopping Cart"
          >
            <span className="cart-icon">🛒</span>
            <span className="cart-badge">{cartCount}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
