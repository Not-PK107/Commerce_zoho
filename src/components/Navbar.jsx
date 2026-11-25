import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

/**
 * Navbar Component
 * Navigation header displaying brand logo, navigation links,
 * customer authentication status / account trigger, and shopping cart drawer trigger with real-time counter.
 */
export default function Navbar({
  cartCount = 0,
  activePage = 'home',
  onNavigate,
  onOpenCartDrawer,
}) {
  const { customer, isAuthenticated, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (page) => {
    onNavigate?.(page);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    handleNavClick('home');
  };

  const displayName = customer?.firstName || (customer?.name ? customer.name.split(' ')[0] : 'My Account');

  return (
    <header className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container navbar-container">
        {/* Brand Logo */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('home');
          }}
          className="navbar-logo"
        >
          <span className="logo-accent">PK</span> STOREFRONT
        </a>

        {/* Desktop Navigation */}
        <nav className="navbar-nav desktop-nav">
          <button
            type="button"
            className={`nav-link ${activePage === 'home' ? 'active' : ''}`}
            onClick={() => handleNavClick('home')}
          >
            Home
          </button>
          <button
            type="button"
            className="nav-link"
            onClick={() => {
              handleNavClick('home');
              setTimeout(() => {
                const el = document.getElementById('catalog-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
          >
            Shop Catalog
          </button>
        </nav>

        {/* Right Actions */}
        <div className="navbar-actions">
          {/* Customer Auth Actions */}
          {isAuthenticated && (
            <div className="auth-nav-group desktop-only">
              <div className="user-profile-badge">
                <button
                  type="button"
                  className={`nav-account-btn ${activePage === 'account' ? 'active' : ''}`}
                  onClick={() => handleNavClick('account')}
                  title="View Account"
                >
                  <span className="account-avatar">👤</span>
                  <span className="account-name">{displayName}</span>
                </button>
                <button
                  type="button"
                  className="nav-logout-btn"
                  onClick={handleLogout}
                  title="Sign Out"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* Cart Drawer Trigger */}
          <button
            type="button"
            className="cart-button"
            onClick={onOpenCartDrawer}
            aria-label={`Shopping bag with ${cartCount} items`}
          >
            <span className="cart-icon">🛒</span>
            <span className="cart-label">Bag</span>
            <span className={`cart-badge ${cartCount > 0 ? 'has-items' : ''}`}>
              {cartCount}
            </span>
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-nav-panel">
          <button
            type="button"
            className={`mobile-nav-link ${activePage === 'home' ? 'active' : ''}`}
            onClick={() => handleNavClick('home')}
          >
            Home
          </button>
          <button
            type="button"
            className="mobile-nav-link"
            onClick={() => {
              handleNavClick('home');
              setTimeout(() => {
                const el = document.getElementById('catalog-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
          >
            Shop Catalog
          </button>
          <button
            type="button"
            className="mobile-nav-link"
            onClick={() => {
              handleNavClick('cart');
            }}
          >
            Shopping Bag ({cartCount})
          </button>

          {isAuthenticated && (
            <>
              <div className="mobile-auth-divider" />
              <button
                type="button"
                className={`mobile-nav-link ${activePage === 'account' ? 'active' : ''}`}
                onClick={() => handleNavClick('account')}
              >
                👤 My Account ({displayName})
              </button>
              <button
                type="button"
                className="mobile-nav-link mobile-logout-btn"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
