import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchSignupFields,
  fetchCurrentPortalUser,
  loginCustomer,
  signupCustomer,
  logoutCustomer,
  fetchUserProfile,
} from '../services/zohoAuth';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

const AUTH_STORAGE_KEY = 'zoho_portal_customer_v1';

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Do not keep sensitive info
        delete parsed.password;
        return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [signupFields, setSignupFields] = useState(null);
  const hasCheckedSessionRef = useRef(false);

  // Synchronize customer session with localStorage
  useEffect(() => {
    try {
      if (customer) {
        const safeCustomer = { ...customer };
        delete safeCustomer.password;
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(safeCustomer));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to persist customer session to localStorage', e);
    }
  }, [customer]);

  // Check live session with Zoho Commerce Storefront Portal on initial mount
  useEffect(() => {
    let isMounted = true;
    if (hasCheckedSessionRef.current) return;
    hasCheckedSessionRef.current = true;

    async function checkPortalSession() {
      setIsLoading(true);
      try {
        // 1. Fetch signup field configurations from Zoho
        const fields = await fetchSignupFields();
        if (isMounted && fields) {
          setSignupFields(fields);
        }

        // 2. Check active portal user session
        const portalSession = await fetchCurrentPortalUser();
        if (isMounted) {
          if (portalSession.isLoggedIn && portalSession.user) {
            setCustomer((prev) => ({
              ...prev,
              ...(typeof portalSession.user === 'object' ? portalSession.user : { name: portalSession.user }),
              isLoggedIn: true,
            }));
          } else if (!portalSession.isLoggedIn) {
            // Verify if stored session is still valid
            try {
              const storedRaw = localStorage.getItem(AUTH_STORAGE_KEY);
              if (storedRaw) {
                const profile = await fetchUserProfile();
                if (isMounted && profile && (profile.email || profile.first_name || profile.name)) {
                  setCustomer((prev) => ({
                    ...prev,
                    ...profile,
                  }));
                }
              }
            } catch {
              // ignore
            }
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Session verification warning:', err.message);
      } finally {
        setIsLoading(false);
      }
    }

    checkPortalSession();

    return () => {
      isMounted = false;
    };
  }, []); // Run once on mount

  /**
   * Log in customer using email ID
   */
  const login = useCallback(async (email) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await loginCustomer({ email });
      const custData = res.customer || { email, name: email.split('@')[0] };
      delete custData.password;
      setCustomer(custData);
      return { success: true, customer: custData, memberCartId: res.memberCartId };
    } catch (err) {
      console.error('[AuthContext] Login error:', err.message);
      setAuthError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Register new customer
   */
  const signup = useCallback(async (formData) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await signupCustomer(formData);
      const custData = res.customer || {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        name: `${formData.firstName} ${formData.lastName || ''}`.trim(),
        phone: formData.phone,
      };
      delete custData.password;
      setCustomer(custData);
      return { success: true, customer: custData, memberCartId: res.memberCartId };
    } catch (err) {
      console.error('[AuthContext] Signup error:', err.message);
      setAuthError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Log out customer
   */
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutCustomer();
    } catch (err) {
      console.warn('[AuthContext] Logout warning:', err.message);
    } finally {
      setCustomer(null);
      setAuthError(null);
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh customer profile from Zoho Commerce
   */
  const refreshCustomer = useCallback(async () => {
    if (!customer) return;
    try {
      const profile = await fetchUserProfile();
      if (profile) {
        setCustomer((prev) => ({
          ...prev,
          ...profile,
        }));
      }
    } catch (err) {
      console.warn('[AuthContext] Refresh customer warning:', err.message);
    }
  }, [customer]);

  const value = {
    customer,
    isAuthenticated: Boolean(customer),
    isLoading,
    authError,
    signupFields,
    login,
    signup,
    logout,
    refreshCustomer,
    clearAuthError: () => setAuthError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
