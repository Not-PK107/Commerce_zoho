/**
 * Zoho Commerce Customer Authentication & Portal Service
 * 
 * Uses official Zoho Commerce Storefront Portal APIs:
 * - GET /portaluser/signupfields (Configuration of enabled registration fields)
 * - GET /portaluser/getCurrentPortalUser (Check active customer portal session)
 * - POST /portaluser/checkSignupUserEmail (Pre-signup email verification)
 * - GET /portaluser/userProfile (Customer profile details)
 * - GET /portaluser/address (Customer address book)
 * - GET /portaluser/orders (Customer order history)
 * - GET /signout (Customer session signout)
 * 
 * Supports both guest session (zcidg) and authenticated member session (zcid).
 */

const STOREFRONT_DOMAIN = import.meta.env?.VITE_ZOHO_STOREFRONT_DOMAIN || 'demo-60096917552.zohoecommerce.in';

/**
 * Safely parses response body as JSON after inspecting raw text
 * Reports HTTP status and Zoho error message when response is non-JSON
 */
async function safeJsonParse(response, context = 'Zoho Auth API') {
  let rawText;
  try {
    rawText = await response.text();
  } catch (err) {
    console.error(`[${context}] Stream read error:`, err.message);
    return { status_code: String(response.status), error: { message: err.message } };
  }

  try {
    return JSON.parse(rawText);
  } catch {
    console.warn(`[${context}] Non-JSON response received (HTTP ${response.status}): ${rawText.trim().slice(0, 200)}`);
    return {
      status_code: String(response.status),
      code: response.status,
      message: `HTTP ${response.status}: ${rawText.trim().slice(0, 150)}`,
      error: { message: rawText.trim().slice(0, 150), code: response.status },
      raw: rawText.trim(),
    };
  }
}

/**
 * Fetch dynamic signup field configuration from Zoho Commerce
 */
export async function fetchSignupFields() {
  try {
    const response = await fetch('/api/zoho-auth/signup-fields', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (response.ok) {
      const data = await safeJsonParse(response, 'Zoho Auth SignupFields');
      return data.payload || null;
    }
  } catch (err) {
    console.warn('[Zoho Auth] Failed to fetch signup fields:', err.message);
  }

  // Fallback to verified actual Zoho Commerce store configuration
  return {
    signup: true,
    name: true,
    phone: true,
    receive_promotional_emails: true,
    confirm_password: true,
  };
}

/**
 * Fetch current authenticated portal user session from Zoho Commerce
 */
export async function fetchCurrentPortalUser() {
  try {
    const response = await fetch('/api/zoho-auth/current-user', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'include',
    });

    if (response.ok) {
      const data = await safeJsonParse(response, 'Zoho Auth CurrentUser');
      if (data.is_logged_in && data.user) {
        return {
          isLoggedIn: true,
          user: data.user,
          logoutUrl: data.logout_url || null,
          profileUrl: data.profile_url || null,
        };
      }
    }
  } catch (err) {
    console.warn('[Zoho Auth] Failed to fetch current portal user:', err.message);
  }

  return { isLoggedIn: false, user: null };
}

/**
 * Validate customer email with Zoho Commerce before registration
 */
export async function checkSignupUserEmail(email) {
  if (!email || !email.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  try {
    const response = await fetch('/api/zoho-auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    const data = await safeJsonParse(response, 'Zoho Auth CheckEmail');
    if (!response.ok || (data.status_code && data.status_code !== '0' && data.status_code !== 0)) {
      const errMsg = data.error?.message || data.developer_message || 'Email verification failed.';
      const isPortalRestriction =
        errMsg.toLowerCase().includes('error occurred') ||
        errMsg.toLowerCase().includes('disabled') ||
        errMsg.toLowerCase().includes('closed') ||
        errMsg.toLowerCase().includes('locked') ||
        errMsg.toLowerCase().includes('unable to process') ||
        errMsg.toLowerCase().includes('portal');
      if (isPortalRestriction) {
        return { available: true };
      }
      return { available: false, error: errMsg };
    }

    return { available: true, data };
  } catch (err) {
    console.warn('[Zoho Auth] checkSignupUserEmail check warning:', err.message);
    return { available: true };
  }
}

/**
 * Log in customer via Zoho Commerce customer portal using email ID
 */
export async function loginCustomer({ email }) {
  if (!email || !email.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  const response = await fetch('/api/zoho-auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
    }),
  });

  const data = await safeJsonParse(response, 'Zoho Auth Login');

  if (!response.ok || (data.code !== 0 && data.status_code !== '0' && data.status_code !== 0 && data.code !== undefined)) {
    const msg = data.message || data.error?.message || data.developer_message || 'Unable to sign in with this email.';
    const err = new Error(msg);
    err.code = data.code || data.status_code;
    throw err;
  }

  return {
    customer: data.customer || data.user,
    memberCartId: data.member_cart_id || data.cart_id || null,
    message: data.message || 'Login successful',
  };
}

/**
 * Register new customer with Zoho Commerce using email ID and profile info (no password required)
 */
export async function signupCustomer({
  firstName,
  lastName = '',
  email,
  phone = '',
  receivePromotionalEmails = false,
}) {
  if (!email || !email.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!firstName || !firstName.trim()) {
    throw new Error('Please enter your first name.');
  }

  const payload = {
    first_name: firstName.trim(),
    last_name: (lastName || '').trim(),
    name: `${firstName.trim()} ${(lastName || '').trim()}`.trim(),
    email: email.trim().toLowerCase(),
    phone: (phone || '').trim(),
    receive_promotional_emails: Boolean(receivePromotionalEmails),
  };

  const response = await fetch('/api/zoho-auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await safeJsonParse(response, 'Zoho Auth Signup');

  if (!response.ok || (data.code !== 0 && data.status_code !== '0' && data.status_code !== 0 && data.code !== undefined)) {
    const msg = data.message || data.error?.message || data.developer_message || 'Registration could not be completed.';
    const err = new Error(msg);
    err.code = data.code || data.status_code;
    throw err;
  }

  return {
    customer: data.customer || data.user,
    memberCartId: data.member_cart_id || data.cart_id || null,
    message: data.message || 'Account created successfully',
  };
}

/**
 * Log out customer and invalidate session cookies
 */
export async function logoutCustomer() {
  try {
    const response = await fetch('/api/zoho-auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    return response.ok;
  } catch (err) {
    console.warn('[Zoho Auth] Logout API warning:', err.message);
    return true;
  }
}

/**
 * Fetch customer profile details
 */
export async function fetchUserProfile() {
  try {
    const response = await fetch('/api/zoho-auth/profile', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'include',
    });
    if (response.ok) {
      const data = await safeJsonParse(response, 'Zoho Auth UserProfile');
      return data.user_profile || data.profile || data;
    }
  } catch (err) {
    console.warn('[Zoho Auth] Failed to fetch user profile:', err.message);
  }
  return null;
}

/**
 * Fetch customer address book
 */
export async function fetchUserAddressBook() {
  try {
    const response = await fetch('/api/zoho-auth/address', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'include',
    });
    if (response.ok) {
      const data = await safeJsonParse(response, 'Zoho Auth AddressBook');
      return data.addresses || data.address_book || [];
    }
  } catch (err) {
    console.warn('[Zoho Auth] Failed to fetch address book:', err.message);
  }
  return [];
}

/**
 * Fetch customer order history
 */
export async function fetchUserOrders(filterMonths = 3) {
  try {
    const response = await fetch(`/api/zoho-auth/orders?filterDate=${filterMonths}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'include',
    });
    if (response.ok) {
      const data = await safeJsonParse(response, 'Zoho Auth Orders');
      return data.orders || data.salesorders || [];
    }
  } catch (err) {
    console.warn('[Zoho Auth] Failed to fetch customer orders:', err.message);
  }
  return [];
}

/**
 * Returns the native Zoho Commerce Storefront Sign-in and Sign-up URLs
 */
export function getStorefrontAuthUrls() {
  return {
    signInUrl: `https://${STOREFRONT_DOMAIN}/signin`,
    signUpUrl: `https://${STOREFRONT_DOMAIN}/signup`,
    accountUrl: `https://${STOREFRONT_DOMAIN}/account/profile`,
    ordersUrl: `https://${STOREFRONT_DOMAIN}/portaluser/orders`,
  };
}
