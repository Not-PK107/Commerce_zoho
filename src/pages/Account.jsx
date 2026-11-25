import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { fetchUserOrders, fetchUserAddressBook } from '../services/zohoAuth';

function formatPrice(amount, currency = 'INR') {
  if (typeof amount !== 'number' && !amount) return '';
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${currency} ${num.toLocaleString()}`;
  }
}

/**
 * Customer Account / Profile Page
 * Displays customer profile, active member cart, order history, and logout trigger.
 */
export default function Account({
  cart,
  onNavigate,
  onProceedToCheckout,
  onLogoutSuccess,
}) {
  const { customer, logout, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'cart', 'orders', 'address'
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Load orders and addresses on mount
  useEffect(() => {
    let isMounted = true;
    async function loadAccountData() {
      if (!customer) return;
      setLoadingDetails(true);
      try {
        const [ordersList, addressList] = await Promise.all([
          fetchUserOrders(6),
          fetchUserAddressBook(),
        ]);
        if (isMounted) {
          setOrders(Array.isArray(ordersList) ? ordersList : []);
          setAddresses(Array.isArray(addressList) ? addressList : []);
        }
      } catch (err) {
        console.warn('[Account] Error loading orders/addresses:', err.message);
      } finally {
        if (isMounted) setLoadingDetails(false);
      }
    }

    loadAccountData();
    return () => {
      isMounted = false;
    };
  }, [customer]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      onLogoutSuccess?.();
    } finally {
      setLoggingOut(false);
    }
  };

  if (!customer && !authLoading) {
    return (
      <div className="container page account-page">
        <div className="account-empty-state">
          <div className="empty-icon">🔒</div>
          <h2>Session Expired or Not Signed In</h2>
          <p>Please browse our catalog to shop products.</p>
          <div className="empty-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onNavigate?.('home')}
            >
              Return to Catalog
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayName = customer?.name || `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || customer?.email?.split('@')[0] || 'Customer';
  const customerEmail = customer?.email || 'Registered Customer';
  const customerPhone = customer?.phone || customer?.mobile || 'Not specified';
  const lines = cart?.lines || [];

  return (
    <div className="container page account-page">
      {/* Header Profile Banner */}
      <div className="account-banner">
        <div className="account-profile-main">
          <div className="account-avatar">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="account-profile-text">
            <div className="account-badge">
              <span className="live-dot" /> Verified Member
            </div>
            <h1 className="account-name">{displayName}</h1>
            <p className="account-email-row">
              <span className="account-email">{customerEmail}</span>
              {customerPhone !== 'Not specified' && (
                <span className="account-phone">&bull; {customerPhone}</span>
              )}
            </p>
          </div>
        </div>

        <div className="account-header-actions">
          <button
            type="button"
            className="btn btn-secondary account-logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? 'Signing out...' : 'Sign Out ↪'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="account-tabs">
        <button
          type="button"
          className={`account-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile Details
        </button>
        <button
          type="button"
          className={`account-tab ${activeTab === 'cart' ? 'active' : ''}`}
          onClick={() => setActiveTab('cart')}
        >
          Active Bag ({lines.reduce((s, it) => s + it.quantity, 0)})
        </button>
        <button
          type="button"
          className={`account-tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          My Orders {orders.length > 0 && `(${orders.length})`}
        </button>
        <button
          type="button"
          className={`account-tab ${activeTab === 'address' ? 'active' : ''}`}
          onClick={() => setActiveTab('address')}
        >
          Address Book
        </button>
      </div>

      {/* Tab 1: Profile Details */}
      {activeTab === 'profile' && (
        <div className="account-card">
          <div className="card-header-row">
            <div>
              <h3>Customer Account Information</h3>
              <p className="card-subhead">
                Manage your profile details and preferences.
              </p>
            </div>
            <span className="status-pill active">Active Member</span>
          </div>

          <div className="profile-details-grid">
            <div className="detail-item">
              <span className="detail-label">Full Name</span>
              <span className="detail-value">{displayName}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email Address</span>
              <span className="detail-value">{customerEmail}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Mobile Phone</span>
              <span className="detail-value">{customerPhone}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Membership Tier</span>
              <span className="detail-value">Priority Member</span>
            </div>
          </div>

          <div className="profile-actions-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onNavigate?.('home')}
            >
              Explore Flagship Catalog &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Active Member Cart */}
      {activeTab === 'cart' && (
        <div className="account-card">
          <div className="card-header-row">
            <div>
              <h3>Member Shopping Bag</h3>
              <p className="card-subhead">
                Products currently associated with your authenticated member cart.
              </p>
            </div>
            <span className="status-pill info">
              {lines.length} {lines.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {lines.length === 0 ? (
            <div className="account-empty-cart">
              <div className="empty-cart-emoji">🛍️</div>
              <h4>Your member bag is empty</h4>
              <p>Explore our catalog to add flagship electronics to your customer session.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onNavigate?.('home')}
              >
                Browse Catalog &rarr;
              </button>
            </div>
          ) : (
            <div>
              <div className="account-cart-items-list">
                {lines.map((item) => (
                  <div key={item.id || item.lineItemId} className="account-cart-item-row">
                    <div className="account-item-thumb">
                      {item.image ? (
                        <img src={item.image} alt={item.title} />
                      ) : (
                        <div className="item-placeholder">No Image</div>
                      )}
                    </div>
                    <div className="account-item-info">
                      <h4>{item.title}</h4>
                      <p className="item-qty">Quantity: <strong>{item.quantity}</strong></p>
                    </div>
                    <div className="account-item-total">
                      {formatPrice(parseFloat(item.price || 0) * item.quantity, item.currency)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="account-cart-footer">
                <div className="account-cart-subtotal-row">
                  <span>Bag Subtotal:</span>
                  <span className="account-cart-total-amount">
                    {formatPrice(cart?.subtotal || 0, cart?.currency || 'INR')}
                  </span>
                </div>
                <div className="account-cart-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onProceedToCheckout}
                  >
                    Proceed to Checkout →
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => onNavigate?.('cart')}
                  >
                    View Full Cart Page
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Order History */}
      {activeTab === 'orders' && (
        <div className="account-card">
          <div className="card-header-row">
            <div>
              <h3>My Orders</h3>
              <p className="card-subhead">
                Track status and order confirmation details.
              </p>
            </div>
          </div>

          {loadingDetails && (
            <div className="account-loading-box">
              <span className="btn-spinner" /> Loading order history...
            </div>
          )}

          {!loadingDetails && orders.length === 0 && (
            <div className="account-empty-orders">
              <div className="empty-orders-emoji">📦</div>
              <h4>No orders recorded yet</h4>
              <p>When you complete a checkout, your sales order reference will appear here.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onNavigate?.('home')}
              >
                Start Shopping &rarr;
              </button>
            </div>
          )}

          {!loadingDetails && orders.length > 0 && (
            <div className="orders-list">
              {orders.map((ord, idx) => (
                <div key={ord.order_id || ord.salesorder_id || idx} className="order-item-card">
                  <div className="order-item-header">
                    <div>
                      <span className="order-number">
                        {ord.salesorder_number || ord.order_number || `ORDER-${idx + 1}`}
                      </span>
                      <span className="order-date">
                        {ord.date || ord.created_time || 'Recent order'}
                      </span>
                    </div>
                    <span className={`status-pill ${ord.status === 'confirmed' || ord.status === 'paid' ? 'success' : 'active'}`}>
                      {ord.status_formatted || ord.status || 'Confirmed'}
                    </span>
                  </div>
                  <div className="order-item-body">
                    <div className="order-details-col">
                      <p>Payment: <strong>{ord.payment_gateway || ord.payment_method || 'Online Payment'}</strong></p>
                      <p>Total: <strong>{formatPrice(ord.total, ord.currency_code || 'INR')}</strong></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Address Book */}
      {activeTab === 'address' && (
        <div className="account-card">
          <div className="card-header-row">
            <div>
              <h3>Saved Address Book</h3>
              <p className="card-subhead">
                Addresses used for instant checkout auto-completion.
              </p>
            </div>
          </div>

          {loadingDetails && (
            <div className="account-loading-box">
              <span className="btn-spinner" /> Loading addresses from Zoho Commerce...
            </div>
          )}

          {!loadingDetails && addresses.length === 0 && (
            <div className="account-empty-orders">
              <div className="empty-orders-emoji">📍</div>
              <h4>No saved addresses found</h4>
              <p>Your address will be automatically saved during your next checkout.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onNavigate?.('home')}
              >
                Explore Catalog &rarr;
              </button>
            </div>
          )}

          {!loadingDetails && addresses.length > 0 && (
            <div className="addresses-grid">
              {addresses.map((addr, idx) => (
                <div key={addr.address_id || idx} className="address-card">
                  <div className="address-card-header">
                    <strong>{addr.attention || addr.first_name || 'Shipping Address'}</strong>
                    {addr.is_default && <span className="status-pill active">Default</span>}
                  </div>
                  <p className="address-line">{addr.address}</p>
                  <p className="address-line">{addr.city}, {addr.state_code || addr.state} {addr.zip}</p>
                  <p className="address-line">{addr.country || 'India'}</p>
                  {addr.phone && <p className="address-phone">Phone: {addr.phone}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
