import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  getCheckoutDetailsApi,
  saveCheckoutAddressApi,
  selectShippingMethodApi,
  processPaymentApi,
} from '../services/zohoCommerce';

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

const INDIAN_STATES = [
  { code: 'KA', name: 'Karnataka' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'DL', name: 'Delhi' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'TS', name: 'Telangana' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'WB', name: 'West Bengal' },
  { code: 'KL', name: 'Kerala' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'PB', name: 'Punjab' },
  { code: 'HR', name: 'Haryana' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'BR', name: 'Bihar' },
  { code: 'OD', name: 'Odisha' },
  { code: 'AS', name: 'Assam' },
  { code: 'GA', name: 'Goa' },
  { code: 'CH', name: 'Chandigarh' },
];

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const NAME_REGEX = /^[a-zA-Z\s.'-]+$/;
const PIN_CODE_REGEX = /^[1-9][0-9]{5}$/;

function validateField(name, value, isSameBilling = true) {
  const val = typeof value === 'string' ? value.trim() : '';

  switch (name) {
    case 'firstName':
      if (!val) return 'First name is required.';
      if (val.length < 2) return 'First name must be at least 2 characters.';
      if (val.length > 50) return 'First name cannot exceed 50 characters.';
      if (!NAME_REGEX.test(val)) return 'First name can only contain letters, spaces, and hyphens.';
      return '';

    case 'lastName':
      if (!val) return 'Last name is required.';
      if (val.length < 1) return 'Last name is required.';
      if (val.length > 50) return 'Last name cannot exceed 50 characters.';
      if (!NAME_REGEX.test(val)) return 'Last name can only contain letters, spaces, and hyphens.';
      return '';

    case 'email':
      if (!val) return 'Email address is required.';
      if (val.length > 100) return 'Email address cannot exceed 100 characters.';
      if (!EMAIL_REGEX.test(val)) return 'Please enter a valid email address (e.g. name@example.com).';
      return '';

    case 'phone': {
      if (!val) return 'Phone number is required.';
      let digits = val.replace(/\D/g, '');
      if (digits.length === 12 && digits.startsWith('91')) {
        digits = digits.slice(2);
      } else if (digits.length === 11 && digits.startsWith('0')) {
        digits = digits.slice(1);
      }
      if (digits.length !== 10) {
        return 'Phone number must be a 10-digit mobile number.';
      }
      if (!/^[6-9]/.test(digits)) {
        return 'Please enter a valid Indian mobile number starting with 6, 7, 8, or 9.';
      }
      return '';
    }

    case 'address':
      if (!val) return 'Street address is required.';
      if (val.length < 5) return 'Please enter a complete street address (minimum 5 characters).';
      if (val.length > 250) return 'Street address cannot exceed 250 characters.';
      return '';

    case 'city':
      if (!val) return 'City is required.';
      if (val.length < 2) return 'City must be at least 2 characters.';
      if (val.length > 50) return 'City cannot exceed 50 characters.';
      if (!NAME_REGEX.test(val)) return 'City can only contain letters, spaces, and hyphens.';
      return '';

    case 'state':
      if (!val) return 'Please select your state.';
      if (!INDIAN_STATES.some((s) => s.code === val)) return 'Please select a valid Indian state.';
      return '';

    case 'zip':
      if (!val) return 'PIN code is required.';
      if (!PIN_CODE_REGEX.test(val)) return 'Please enter a valid 6-digit Indian PIN code (e.g. 560001).';
      return '';

    case 'billingFirstName':
      if (isSameBilling) return '';
      if (!val) return 'Billing first name is required.';
      if (val.length < 2) return 'Billing first name must be at least 2 characters.';
      if (val.length > 50) return 'Billing first name cannot exceed 50 characters.';
      if (!NAME_REGEX.test(val)) return 'Billing first name can only contain letters, spaces, and hyphens.';
      return '';

    case 'billingLastName':
      if (isSameBilling) return '';
      if (!val) return 'Billing last name is required.';
      if (val.length < 1) return 'Billing last name is required.';
      if (val.length > 50) return 'Billing last name cannot exceed 50 characters.';
      if (!NAME_REGEX.test(val)) return 'Billing last name can only contain letters, spaces, and hyphens.';
      return '';

    case 'billingAddress':
      if (isSameBilling) return '';
      if (!val) return 'Billing address is required.';
      if (val.length < 5) return 'Please enter a complete billing address (minimum 5 characters).';
      if (val.length > 250) return 'Billing address cannot exceed 250 characters.';
      return '';

    case 'billingCity':
      if (isSameBilling) return '';
      if (!val) return 'Billing city is required.';
      if (val.length < 2) return 'Billing city must be at least 2 characters.';
      if (val.length > 50) return 'Billing city cannot exceed 50 characters.';
      if (!NAME_REGEX.test(val)) return 'Billing city can only contain letters, spaces, and hyphens.';
      return '';

    case 'billingState':
      if (isSameBilling) return '';
      if (!val) return 'Please select your billing state.';
      if (!INDIAN_STATES.some((s) => s.code === val)) return 'Please select a valid billing state.';
      return '';

    case 'billingZip':
      if (isSameBilling) return '';
      if (!val) return 'Billing PIN code is required.';
      if (!PIN_CODE_REGEX.test(val)) return 'Please enter a valid 6-digit billing PIN code (e.g. 560001).';
      return '';

    default:
      return '';
  }
}

function validateAllFields(formData, isSameBilling) {
  const fields = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zip'];
  if (!isSameBilling) {
    fields.push('billingFirstName', 'billingLastName', 'billingAddress', 'billingCity', 'billingState', 'billingZip');
  }

  const errors = {};
  for (const f of fields) {
    const err = validateField(f, formData[f], isSameBilling);
    if (err) {
      errors[f] = err;
    }
  }
  return errors;
}

export default function Checkout({
  cart,
  onBackToCart,
  onReturnHome,
  onPaymentComplete,
  onOrderSuccess,
}) {
  const { customer, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState(1); // 1: Address, 2: Shipping, 3: Payment, 4: Confirmation
  const [, setIsInitializing] = useState(false);
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);
  const [isSubmittingShipping, setIsSubmittingShipping] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Live checkout state from Zoho Commerce Checkout API
  const [checkoutData, setCheckoutData] = useState(null);
  const [shippingMethods, setShippingMethods] = useState([]);
  const [selectedShippingChargeId, setSelectedShippingChargeId] = useState('');
  const [, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');
  const [orderNotes, setOrderNotes] = useState('');

  // Contact & Address Form State
  const [sameBilling, setSameBilling] = useState(true);
  const [formData, setFormData] = useState({
    firstName: customer?.firstName || customer?.first_name || (customer?.name ? customer.name.split(' ')[0] : ''),
    lastName: customer?.lastName || customer?.last_name || (customer?.name && customer.name.includes(' ') ? customer.name.split(' ').slice(1).join(' ') : ''),
    email: customer?.email || '',
    phone: customer?.phone || customer?.mobile || '',
    address: '',
    city: '',
    state: 'KA',
    zip: '',
    country: 'IN',
    // Billing address fields
    billingFirstName: '',
    billingLastName: '',
    billingAddress: '',
    billingCity: '',
    billingState: 'KA',
    billingZip: '',
  });

  // Completed Order State for Confirmation Screen
  const [completedOrder, setCompletedOrder] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activePaymentUrl, setActivePaymentUrl] = useState('');

  const fetchedCheckoutCartIdRef = useRef(null);
  const isLoadingCheckoutRef = useRef(false);

  const cartId = cart?.id || '';
  const cartType = isAuthenticated ? 'member' : 'guest';
  const lines = cart?.lines || [];
  const hasItems = lines.length > 0;
  const subtotal = checkoutData?.checkout?.sub_total ?? cart?.subtotal ?? 0;
  const total = checkoutData?.checkout?.total ?? (subtotal + (selectedShippingChargeId ? 200 : 0));
  const currency = cart?.currency || 'INR';

  // Fetch initial checkout details from Zoho Commerce Checkout API on mount
  useEffect(() => {
    let isMounted = true;
    if (!hasItems) return;

    const effectiveCartId = (cartId && cartId !== 'zoho-cart-active') ? cartId : '';
    const loadKey = `${cartType}:${effectiveCartId || 'active'}`;

    // Prevent duplicate fetch in Strict Mode or if this exact cartId has already been loaded
    if (fetchedCheckoutCartIdRef.current === loadKey || isLoadingCheckoutRef.current) {
      return;
    }

    async function loadCheckout() {
      isLoadingCheckoutRef.current = true;
      try {
        setIsInitializing(true);
        const data = await getCheckoutDetailsApi(effectiveCartId, cartType);
        if (isMounted && data?.checkout) {
          fetchedCheckoutCartIdRef.current = loadKey;
          setCheckoutData(data);

          // Populate existing customer details if available
          const cust = data.checkout.customer || {};
          const shipAddr = data.checkout.shipping_address || {};
          if (cust.first_name || shipAddr.address) {
            setFormData((prev) => ({
              ...prev,
              firstName: cust.first_name || prev.firstName,
              lastName: cust.last_name || prev.lastName,
              email: cust.email || prev.email,
              phone: cust.mobile || shipAddr.phone || prev.phone,
              address: shipAddr.address || prev.address,
              city: shipAddr.city || prev.city,
              state: shipAddr.state_code || shipAddr.state || prev.state,
              zip: shipAddr.zip || prev.zip,
            }));
          }

          // Populate shipping charges if already calculated
          const sMethods = data.checkout.shipping_charge_details || [];
          if (sMethods.length > 0) {
            setShippingMethods(sMethods);
            setSelectedShippingChargeId(data.checkout.shipping_charge_id || sMethods[0].shipping_charge_id);
          }

          // Populate payment methods
          const pMethods = data.checkout.payment_methods || [];
          if (pMethods.length > 0) {
            setPaymentMethods(pMethods);
            setSelectedPaymentMethod(pMethods[0].name || 'card');
          }
        }
      } catch (err) {
        console.warn('[Checkout] Failed to fetch initial details from Zoho:', err.message);
      } finally {
        isLoadingCheckoutRef.current = false;
        setIsInitializing(false);
      }
    }

    loadCheckout();
    return () => {
      isMounted = false;
    };
  }, [cartId, cartType, hasItems]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Revalidate if field already has an active error so it clears as soon as corrected
    if (fieldErrors[name]) {
      const err = validateField(name, value, sameBilling);
      setFieldErrors((prev) => {
        const next = { ...prev };
        if (!err) {
          delete next[name];
        } else {
          next[name] = err;
        }
        return next;
      });
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const err = validateField(name, value, sameBilling);
    if (err) {
      setFieldErrors((prev) => ({ ...prev, [name]: err }));
    }
  };

  const handleToggleSameBilling = (checked) => {
    setSameBilling(checked);
    if (checked) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.billingFirstName;
        delete next.billingLastName;
        delete next.billingAddress;
        delete next.billingCity;
        delete next.billingState;
        delete next.billingZip;
        return next;
      });
    }
  };

  /**
   * STEP 1: Submit Customer & Address to Zoho Commerce Checkout API
   */
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    // Comprehensive validation for all required fields
    const validationErrors = validateAllFields(formData, sameBilling);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      const firstKey = Object.keys(validationErrors)[0];
      setErrorMessage(`Please check the required fields: ${validationErrors[firstKey]}`);
      const el = document.getElementById(firstKey);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
      return;
    }

    setIsSubmittingAddress(true);
    try {
      // Normalize mobile to standard 10 digits prefixed with +91-
      let cleanDigits = formData.phone.replace(/\D/g, '');
      if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
        cleanDigits = cleanDigits.slice(2);
      } else if (cleanDigits.length === 11 && cleanDigits.startsWith('0')) {
        cleanDigits = cleanDigits.slice(1);
      }
      const formattedPhone = `+91-${cleanDigits}`;

      const shippingAddr = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        attention: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state,
        country: 'IN',
        zip: formData.zip.trim(),
        phone: formattedPhone,
      };

      const billingAddr = sameBilling
        ? shippingAddr
        : {
            firstName: formData.billingFirstName.trim(),
            lastName: formData.billingLastName.trim(),
            attention: `${formData.billingFirstName.trim()} ${formData.billingLastName.trim()}`.trim(),
            address: formData.billingAddress.trim(),
            city: formData.billingCity.trim(),
            state: formData.billingState,
            country: 'IN',
            zip: formData.billingZip.trim(),
            phone: formattedPhone,
          };

      const customer = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formattedPhone,
      };

      const effectiveCartId = checkoutData?.checkout?.checkout_id || checkoutData?.checkout?.cart_id || cartId || '';
      console.log('[Checkout] Calling saveCheckoutAddressApi via Zoho Checkout API with cartId:', effectiveCartId);
      const response = await saveCheckoutAddressApi(effectiveCartId, {
        customer,
        shippingAddress: shippingAddr,
        billingAddress: billingAddr,
        lines,
      }, cartType);

      console.log('[Checkout] Address saved successfully in Zoho Commerce:', response);
      setCheckoutData(response);

      // Extract real available shipping methods returned by Zoho Commerce
      const availableShipping = response.checkout?.shipping_charge_details || [];
      setShippingMethods(availableShipping);
      if (availableShipping.length > 0) {
        setSelectedShippingChargeId(availableShipping[0].shipping_charge_id);
      }

      // Move to Step 2 (Shipping Selection)
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('[Checkout Error]:', err.message);
      setErrorMessage(err.message || 'Unable to update address in Zoho Commerce. Please check your entries.');
    } finally {
      setIsSubmittingAddress(false);
    }
  };

  /**
   * STEP 2: Select Shipping Method via Zoho Commerce Checkout API
   */
  const handleSelectShipping = async () => {
    setErrorMessage(null);
    if (!selectedShippingChargeId && shippingMethods.length > 0) {
      setErrorMessage('Please choose a delivery method to proceed.');
      return;
    }

    setIsSubmittingShipping(true);
    try {
      const effectiveCartId = checkoutData?.checkout?.checkout_id || checkoutData?.checkout?.cart_id || cartId || '';
      if (selectedShippingChargeId) {
        console.log(`[Checkout] Selecting shipping charge ${selectedShippingChargeId} via Zoho Checkout API...`);
        const response = await selectShippingMethodApi(effectiveCartId, selectedShippingChargeId, cartType);
        setCheckoutData(response);

        // Update payment methods list
        const pMethods = response.checkout?.payment_methods || [];
        if (pMethods.length > 0) {
          setPaymentMethods(pMethods);
          setSelectedPaymentMethod(pMethods[0].name || 'card');
        }
      }

      // Move to Step 3 (Payment & Review)
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('[Checkout Error]:', err.message);
      setErrorMessage(err.message || 'Failed to select shipping method.');
    } finally {
      setIsSubmittingShipping(false);
    }
  };

  /**
   * STEP 3: Process Payment via Zoho Commerce Checkout API
   */
  const handleProcessPayment = async () => {
    setErrorMessage(null);
    setIsSubmittingPayment(true);

    try {
      const isOffline = selectedPaymentMethod === 'cash_on_delivery' || selectedPaymentMethod === 'offline_payment';
      const effectiveCartId = checkoutData?.checkout?.checkout_id || checkoutData?.checkout?.cart_id || cartId || '';

      console.log(`[Checkout] Processing payment via Zoho Checkout API (method: ${selectedPaymentMethod})...`);
      const paymentResponse = await processPaymentApi(effectiveCartId, {
        paymentMethod: selectedPaymentMethod,
        orderNotes,
        isOffline,
      }, cartType);

      console.log('[Checkout] Payment API response:', paymentResponse);

      if (isOffline) {
        const completed = {
          orderReference: paymentResponse.checkout_id || cartId,
          total: checkoutData?.checkout?.total || total,
          currency,
          paymentMethod: 'Cash on Delivery',
          customerName: `${formData.firstName} ${formData.lastName}`.trim(),
          shippingAddress: `${formData.address}, ${formData.city}, ${formData.state} - ${formData.zip}`,
          date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          lines,
        };
        onOrderSuccess?.();
        if (onPaymentComplete) {
          onPaymentComplete({ status: 'success', order: completed });
          return;
        }
        setCompletedOrder(completed);
        setCurrentStep(4);
      } else {
        // Online payment (Card, UPI, NetBanking via certified Zoho Payments Gateway)
        const gatewayUrl = paymentResponse.payment_url || paymentResponse.new_payment_url;
        if (gatewayUrl) {
          setActivePaymentUrl(gatewayUrl);
          setShowPaymentModal(true);
        } else {
          // Direct completion fallback
          const completed = {
            orderReference: paymentResponse.checkout_id || cartId,
            total: paymentResponse.total || total,
            currency,
            paymentMethod: 'Zoho Payments (Online)',
            customerName: `${formData.firstName} ${formData.lastName}`.trim(),
            shippingAddress: `${formData.address}, ${formData.city}, ${formData.state} - ${formData.zip}`,
            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            lines,
          };
          onOrderSuccess?.();
          if (onPaymentComplete) {
            onPaymentComplete({ status: 'success', order: completed });
            return;
          }
          setCompletedOrder(completed);
          setCurrentStep(4);
        }
      }
    } catch (err) {
      console.error('[Payment Processing Error]:', err.message);
      setErrorMessage(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  /**
   * Finalize order upon payment confirmation in modal
   */
  const handlePaymentCompletedInModal = () => {
    setShowPaymentModal(false);
    const completed = {
      orderReference: cartId,
      total: checkoutData?.checkout?.total || total,
      currency,
      paymentMethod: 'Verified Card / UPI via Zoho Payments',
      customerName: `${formData.firstName} ${formData.lastName}`.trim(),
      shippingAddress: `${formData.address}, ${formData.city}, ${formData.state} - ${formData.zip}`,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      lines,
    };
    onOrderSuccess?.();
    if (onPaymentComplete) {
      onPaymentComplete({ status: 'success', order: completed });
      return;
    }
    setCompletedOrder(completed);
    setCurrentStep(4);
  };

  /**
   * Handle payment failure or user cancellation in modal
   */
  const handlePaymentFailedInModal = () => {
    setShowPaymentModal(false);
    if (onPaymentComplete) {
      onPaymentComplete({
        status: 'failure',
        error: 'Payment was cancelled or could not be completed by the payment gateway.',
        order: {
          orderReference: cartId,
          total: checkoutData?.checkout?.total || total,
          currency,
          paymentMethod: 'Verified Card / UPI via Zoho Payments',
          customerName: `${formData.firstName} ${formData.lastName}`.trim(),
          lines,
        },
      });
      return;
    }
    setErrorMessage('Payment was cancelled or could not be completed.');
  };

  // Empty cart view
  if (!hasItems && currentStep !== 4) {
    return (
      <div className="container page checkout-page">
        <div className="checkout-empty-card">
          <div className="empty-icon">🛍️</div>
          <h2>Your bag is currently empty</h2>
          <p>Please add products to your bag before proceeding to checkout.</p>
          <button type="button" className="btn btn-primary" onClick={onBackToCart}>
            &larr; Return to Catalog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-wizard-wrapper">
      {/* Top Header Bar */}
      <div className="checkout-header-bar">
        <div className="container checkout-header-container">
          <div className="checkout-nav-left">
            {currentStep < 4 && (
              <button
                type="button"
                className="checkout-back-link"
                onClick={() => {
                  if (currentStep > 1) setCurrentStep((prev) => prev - 1);
                  else onBackToCart?.();
                }}
              >
                &larr; {currentStep === 1 ? 'Back to Bag' : 'Previous Step'}
              </button>
            )}
            <span className="checkout-badge">
              🔒 256-Bit SSL Encrypted Checkout
            </span>
          </div>

          <div className="checkout-summary-mini">
            <span className="checkout-subtotal-label">Subtotal:</span>
            <span className="checkout-subtotal-val">{formatPrice(total, currency)}</span>
          </div>
        </div>
      </div>

      <div className="container checkout-wizard-container">
        {/* Step Indicator Progress Bar */}
        <div className="checkout-steps-nav">
          <div className={`checkout-step-node ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            <span className="step-num">{currentStep > 1 ? '✓' : '1'}</span>
            <span className="step-label">Address</span>
          </div>
          <div className="step-divider" />
          <div className={`checkout-step-node ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            <span className="step-num">{currentStep > 2 ? '✓' : '2'}</span>
            <span className="step-label">Delivery</span>
          </div>
          <div className="step-divider" />
          <div className={`checkout-step-node ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
            <span className="step-num">{currentStep > 3 ? '✓' : '3'}</span>
            <span className="step-label">Payment</span>
          </div>
          <div className="step-divider" />
          <div className={`checkout-step-node ${currentStep === 4 ? 'active completed' : ''}`}>
            <span className="step-num">4</span>
            <span className="step-label">Receipt</span>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="checkout-alert-error" role="alert">
            <div className="error-main-info">
              <span className="error-icon">⚠️</span>
              <span>{errorMessage}</span>
            </div>
            {onPaymentComplete && (
              <button
                type="button"
                className="btn-error-fail-page"
                onClick={() => onPaymentComplete({
                  status: 'failure',
                  error: errorMessage,
                  order: {
                    orderReference: cartId,
                    total,
                    currency,
                    paymentMethod: selectedPaymentMethod === 'card' ? 'Online Card / UPI' : 'Cash on Delivery',
                    customerName: `${formData.firstName} ${formData.lastName}`.trim(),
                    lines,
                  },
                })}
              >
                View Failure Page &rarr;
              </button>
            )}
          </div>
        )}

        {/* Main Two-Column Layout */}
        <div className="checkout-content-grid">
          {/* Left Column: Current Wizard Step */}
          <div className="checkout-main-col">
            {/* ================================================================= */}
            {/* STEP 1: Customer Contact & Address Form                          */}
            {/* ================================================================= */}
            {currentStep === 1 && (
              <div className="checkout-card">
                <div className="card-header-styled">
                  <h3>1. Contact &amp; Delivery Address</h3>
                  <p className="card-subtitle">
                    Please provide your contact and delivery address for order dispatch.
                  </p>
                </div>

                <form onSubmit={handleSaveAddress} className="checkout-form" noValidate>
                  {/* Account Status / Fast Sign-in prompt */}
                  {isAuthenticated && customer && (
                    <div className="checkout-auth-banner logged-in">
                      <span className="banner-icon">👤</span>
                      <div className="banner-text">
                        <strong>Logged in as {customer.email || customer.name}</strong>
                        <span>Your order will be linked to your customer account.</span>
                      </div>
                    </div>
                  )}

                  <h4 className="section-title">Customer Information</h4>
                  <div className="form-row-two">
                    <div className="form-group">
                      <label htmlFor="firstName">
                        First Name <span className="required-star">*</span>
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        aria-required="true"
                        aria-invalid={Boolean(fieldErrors.firstName)}
                        aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
                        className={fieldErrors.firstName ? 'input-error' : ''}
                        value={formData.firstName}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="John"
                        maxLength="50"
                      />
                      {fieldErrors.firstName && (
                        <span id="firstName-error" className="field-error-text" role="alert">
                          <span className="field-error-icon">⚠️</span> {fieldErrors.firstName}
                        </span>
                      )}
                    </div>
                    <div className="form-group">
                      <label htmlFor="lastName">
                        Last Name <span className="required-star">*</span>
                      </label>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        required
                        aria-required="true"
                        aria-invalid={Boolean(fieldErrors.lastName)}
                        aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
                        className={fieldErrors.lastName ? 'input-error' : ''}
                        value={formData.lastName}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="Doe"
                        maxLength="50"
                      />
                      {fieldErrors.lastName && (
                        <span id="lastName-error" className="field-error-text" role="alert">
                          <span className="field-error-icon">⚠️</span> {fieldErrors.lastName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="form-row-two">
                    <div className="form-group">
                      <label htmlFor="email">
                        Email Address <span className="required-star">*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        aria-required="true"
                        aria-invalid={Boolean(fieldErrors.email)}
                        aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                        className={fieldErrors.email ? 'input-error' : ''}
                        value={formData.email}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="john.doe@example.com"
                        maxLength="100"
                      />
                      {fieldErrors.email && (
                        <span id="email-error" className="field-error-text" role="alert">
                          <span className="field-error-icon">⚠️</span> {fieldErrors.email}
                        </span>
                      )}
                    </div>
                    <div className="form-group">
                      <label htmlFor="phone">
                        Phone / Mobile (India +91) <span className="required-star">*</span>
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        aria-required="true"
                        aria-invalid={Boolean(fieldErrors.phone)}
                        aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
                        className={fieldErrors.phone ? 'input-error' : ''}
                        value={formData.phone}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="9876543210"
                        maxLength="15"
                      />
                      {fieldErrors.phone && (
                        <span id="phone-error" className="field-error-text" role="alert">
                          <span className="field-error-icon">⚠️</span> {fieldErrors.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 className="section-title">Shipping Address</h4>
                  <div className="form-group">
                    <label htmlFor="address">
                      Street Address <span className="required-star">*</span>
                    </label>
                    <input
                      id="address"
                      name="address"
                      type="text"
                      required
                      aria-required="true"
                      aria-invalid={Boolean(fieldErrors.address)}
                      aria-describedby={fieldErrors.address ? 'address-error' : undefined}
                      className={fieldErrors.address ? 'input-error' : ''}
                      value={formData.address}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      placeholder="Flat, House no., Building, Street address"
                      maxLength="250"
                    />
                    {fieldErrors.address && (
                      <span id="address-error" className="field-error-text" role="alert">
                        <span className="field-error-icon">⚠️</span> {fieldErrors.address}
                      </span>
                    )}
                  </div>

                  <div className="form-row-three">
                    <div className="form-group">
                      <label htmlFor="city">
                        City <span className="required-star">*</span>
                      </label>
                      <input
                        id="city"
                        name="city"
                        type="text"
                        required
                        aria-required="true"
                        aria-invalid={Boolean(fieldErrors.city)}
                        aria-describedby={fieldErrors.city ? 'city-error' : undefined}
                        className={fieldErrors.city ? 'input-error' : ''}
                        value={formData.city}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="Bengaluru"
                        maxLength="50"
                      />
                      {fieldErrors.city && (
                        <span id="city-error" className="field-error-text" role="alert">
                          <span className="field-error-icon">⚠️</span> {fieldErrors.city}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="state">
                        State <span className="required-star">*</span>
                      </label>
                      <select
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        required
                        aria-required="true"
                        aria-invalid={Boolean(fieldErrors.state)}
                        aria-describedby={fieldErrors.state ? 'state-error' : undefined}
                        className={fieldErrors.state ? 'input-error' : ''}
                      >
                        {INDIAN_STATES.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                      {fieldErrors.state && (
                        <span id="state-error" className="field-error-text" role="alert">
                          <span className="field-error-icon">⚠️</span> {fieldErrors.state}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="zip">
                        PIN Code <span className="required-star">*</span>
                      </label>
                      <input
                        id="zip"
                        name="zip"
                        type="text"
                        required
                        aria-required="true"
                        aria-invalid={Boolean(fieldErrors.zip)}
                        aria-describedby={fieldErrors.zip ? 'zip-error' : undefined}
                        className={fieldErrors.zip ? 'input-error' : ''}
                        value={formData.zip}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="560001"
                        maxLength="6"
                      />
                      {fieldErrors.zip && (
                        <span id="zip-error" className="field-error-text" role="alert">
                          <span className="field-error-icon">⚠️</span> {fieldErrors.zip}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={sameBilling}
                        onChange={(e) => handleToggleSameBilling(e.target.checked)}
                      />
                      <span>Billing address is same as delivery address</span>
                    </label>
                  </div>

                  {!sameBilling && (
                    <div className="billing-address-block">
                      <h4 className="section-title">Billing Address</h4>
                      <div className="form-row-two">
                        <div className="form-group">
                          <label htmlFor="billingFirstName">
                            First Name <span className="required-star">*</span>
                          </label>
                          <input
                            id="billingFirstName"
                            name="billingFirstName"
                            type="text"
                            required
                            aria-required="true"
                            aria-invalid={Boolean(fieldErrors.billingFirstName)}
                            aria-describedby={fieldErrors.billingFirstName ? 'billingFirstName-error' : undefined}
                            className={fieldErrors.billingFirstName ? 'input-error' : ''}
                            value={formData.billingFirstName}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            placeholder="John"
                            maxLength="50"
                          />
                          {fieldErrors.billingFirstName && (
                            <span id="billingFirstName-error" className="field-error-text" role="alert">
                              <span className="field-error-icon">⚠️</span> {fieldErrors.billingFirstName}
                            </span>
                          )}
                        </div>
                        <div className="form-group">
                          <label htmlFor="billingLastName">
                            Last Name <span className="required-star">*</span>
                          </label>
                          <input
                            id="billingLastName"
                            name="billingLastName"
                            type="text"
                            required
                            aria-required="true"
                            aria-invalid={Boolean(fieldErrors.billingLastName)}
                            aria-describedby={fieldErrors.billingLastName ? 'billingLastName-error' : undefined}
                            className={fieldErrors.billingLastName ? 'input-error' : ''}
                            value={formData.billingLastName}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            placeholder="Doe"
                            maxLength="50"
                          />
                          {fieldErrors.billingLastName && (
                            <span id="billingLastName-error" className="field-error-text" role="alert">
                              <span className="field-error-icon">⚠️</span> {fieldErrors.billingLastName}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="billingAddress">
                          Billing Address <span className="required-star">*</span>
                        </label>
                        <input
                          id="billingAddress"
                          name="billingAddress"
                          type="text"
                          required
                          aria-required="true"
                          aria-invalid={Boolean(fieldErrors.billingAddress)}
                          aria-describedby={fieldErrors.billingAddress ? 'billingAddress-error' : undefined}
                          className={fieldErrors.billingAddress ? 'input-error' : ''}
                          value={formData.billingAddress}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          placeholder="Flat, House no., Building, Street address"
                          maxLength="250"
                        />
                        {fieldErrors.billingAddress && (
                          <span id="billingAddress-error" className="field-error-text" role="alert">
                            <span className="field-error-icon">⚠️</span> {fieldErrors.billingAddress}
                          </span>
                        )}
                      </div>

                      <div className="form-row-three">
                        <div className="form-group">
                          <label htmlFor="billingCity">
                            City <span className="required-star">*</span>
                          </label>
                          <input
                            id="billingCity"
                            name="billingCity"
                            type="text"
                            required
                            aria-required="true"
                            aria-invalid={Boolean(fieldErrors.billingCity)}
                            aria-describedby={fieldErrors.billingCity ? 'billingCity-error' : undefined}
                            className={fieldErrors.billingCity ? 'input-error' : ''}
                            value={formData.billingCity}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            placeholder="Bengaluru"
                            maxLength="50"
                          />
                          {fieldErrors.billingCity && (
                            <span id="billingCity-error" className="field-error-text" role="alert">
                              <span className="field-error-icon">⚠️</span> {fieldErrors.billingCity}
                            </span>
                          )}
                        </div>
                        <div className="form-group">
                          <label htmlFor="billingState">
                            State <span className="required-star">*</span>
                          </label>
                          <select
                            id="billingState"
                            name="billingState"
                            value={formData.billingState}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            required
                            aria-required="true"
                            aria-invalid={Boolean(fieldErrors.billingState)}
                            aria-describedby={fieldErrors.billingState ? 'billingState-error' : undefined}
                            className={fieldErrors.billingState ? 'input-error' : ''}
                          >
                            {INDIAN_STATES.map((s) => (
                              <option key={s.code} value={s.code}>
                                {s.name} ({s.code})
                              </option>
                            ))}
                          </select>
                          {fieldErrors.billingState && (
                            <span id="billingState-error" className="field-error-text" role="alert">
                              <span className="field-error-icon">⚠️</span> {fieldErrors.billingState}
                            </span>
                          )}
                        </div>
                        <div className="form-group">
                          <label htmlFor="billingZip">
                            PIN Code <span className="required-star">*</span>
                          </label>
                          <input
                            id="billingZip"
                            name="billingZip"
                            type="text"
                            required
                            aria-required="true"
                            aria-invalid={Boolean(fieldErrors.billingZip)}
                            aria-describedby={fieldErrors.billingZip ? 'billingZip-error' : undefined}
                            className={fieldErrors.billingZip ? 'input-error' : ''}
                            value={formData.billingZip}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            placeholder="560001"
                            maxLength="6"
                          />
                          {fieldErrors.billingZip && (
                            <span id="billingZip-error" className="field-error-text" role="alert">
                              <span className="field-error-icon">⚠️</span> {fieldErrors.billingZip}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="form-actions">
                    <button
                      type="submit"
                      className="btn btn-primary btn-large btn-full"
                      disabled={isSubmittingAddress}
                    >
                      {isSubmittingAddress ? (
                        <span className="btn-loading-wrap">
                          <span className="btn-spinner" /> Validating with Zoho Commerce...
                        </span>
                      ) : (
                        'Continue to Delivery Options →'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ================================================================= */}
            {/* STEP 2: Delivery & Shipping Method Selection                     */}
            {/* ================================================================= */}
            {currentStep === 2 && (
              <div className="checkout-card">
                <div className="card-header-styled">
                  <h3>2. Select Delivery Method</h3>
                  <p className="card-subtitle">
                    Shipping rates calculated by Zoho Commerce based on your destination ({formData.city}, {formData.state}).
                  </p>
                </div>

                <div className="shipping-methods-container">
                  {shippingMethods.length === 0 ? (
                    <div className="shipping-option-card selected">
                      <div className="shipping-option-left">
                        <input
                          type="radio"
                          id="free-ship"
                          name="shippingOption"
                          checked
                          readOnly
                        />
                        <label htmlFor="free-ship" className="shipping-info">
                          <span className="shipping-title">Free Express Delivery</span>
                          <span className="shipping-desc">Dispatched within 24-48 hours with full tracking</span>
                        </label>
                      </div>
                      <span className="shipping-cost free">FREE</span>
                    </div>
                  ) : (
                    shippingMethods.map((method) => {
                      const isSelected = selectedShippingChargeId === method.shipping_charge_id;
                      const chargeAmt = method.shipping_charge || 0;

                      return (
                        <div
                          key={method.shipping_charge_id}
                          className={`shipping-option-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedShippingChargeId(method.shipping_charge_id)}
                        >
                          <div className="shipping-option-left">
                            <input
                              type="radio"
                              id={method.shipping_charge_id}
                              name="shippingOption"
                              checked={isSelected}
                              onChange={() => setSelectedShippingChargeId(method.shipping_charge_id)}
                            />
                            <label htmlFor={method.shipping_charge_id} className="shipping-info">
                              <span className="shipping-title">{method.name || 'Standard Shipping'}</span>
                              <span className="shipping-desc">
                                {method.delivery_title || '3-5 business days delivery'}
                              </span>
                            </label>
                          </div>
                          <span className="shipping-cost">
                            {chargeAmt === 0 ? (
                              <span className="free">FREE</span>
                            ) : (
                              formatPrice(chargeAmt, currency)
                            )}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="step-address-summary">
                  <div className="summary-col">
                    <span className="summary-label">Delivering to:</span>
                    <p className="summary-text">
                      <strong>{formData.firstName} {formData.lastName}</strong><br />
                      {formData.address}, {formData.city}, {formData.state} - {formData.zip}<br />
                      Phone: {formData.phone}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => setCurrentStep(1)}
                  >
                    Edit Address
                  </button>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-large btn-full"
                    onClick={handleSelectShipping}
                    disabled={isSubmittingShipping}
                  >
                    {isSubmittingShipping ? (
                      <span className="btn-loading-wrap">
                        <span className="btn-spinner" /> Updating in Zoho Commerce...
                      </span>
                    ) : (
                      'Continue to Payment & Review →'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* STEP 3: Payment & Order Review                                   */}
            {/* ================================================================= */}
            {currentStep === 3 && (
              <div className="checkout-card">
                <div className="card-header-styled">
                  <h3>3. Payment &amp; Final Review</h3>
                  <p className="card-subtitle">
                    Select your preferred payment method to complete your purchase securely.
                  </p>
                </div>

                {/* Payment Methods */}
                <div className="payment-methods-block">
                  <h4 className="section-title">Select Payment Mode</h4>

                  <div className="payment-options-grid">
                    {/* Option 1: Card / Online Gateway via Zoho Payments */}
                    <div
                      className={`payment-option-card ${selectedPaymentMethod === 'card' ? 'selected' : ''}`}
                      onClick={() => setSelectedPaymentMethod('card')}
                    >
                      <div className="payment-card-header">
                        <input
                          type="radio"
                          id="pm-card"
                          name="paymentMethod"
                          checked={selectedPaymentMethod === 'card'}
                          onChange={() => setSelectedPaymentMethod('card')}
                        />
                        <label htmlFor="pm-card" className="payment-title">
                          Credit / Debit Card, UPI &amp; Net Banking
                        </label>
                      </div>
                      <p className="payment-desc">
                        PCI-DSS certified secure gateway. Supports Visa, MasterCard, RuPay, UPI &amp; NetBanking.
                      </p>
                      <div className="payment-badges">
                        <span className="badge-tag">💳 Cards</span>
                        <span className="badge-tag">⚡ UPI</span>
                        <span className="badge-tag">🏛️ NetBanking</span>
                      </div>
                    </div>

                    {/* Option 2: Cash on Delivery / Offline Option */}
                    <div
                      className={`payment-option-card ${selectedPaymentMethod === 'cash_on_delivery' ? 'selected' : ''}`}
                      onClick={() => setSelectedPaymentMethod('cash_on_delivery')}
                    >
                      <div className="payment-card-header">
                        <input
                          type="radio"
                          id="pm-cod"
                          name="paymentMethod"
                          checked={selectedPaymentMethod === 'cash_on_delivery'}
                          onChange={() => setSelectedPaymentMethod('cash_on_delivery')}
                        />
                        <label htmlFor="pm-cod" className="payment-title">
                          Cash on Delivery / Offline Payment
                        </label>
                      </div>
                      <p className="payment-desc">
                        Pay with cash or card upon package arrival at your doorstep. Verified contact required.
                      </p>
                      <div className="payment-badges">
                        <span className="badge-tag">💵 Pay on Delivery</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Notes */}
                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label htmlFor="orderNotes">Delivery Instructions or Notes (Optional)</label>
                  <input
                    id="orderNotes"
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="E.g. Leave package with security guard or call upon arrival"
                  />
                </div>

                {/* Final Order Review Notice */}
                <div className="checkout-security-notice">
                  <span className="shield-icon">🔒</span>
                  <div>
                    <strong>100% Encrypted &amp; Secure Checkout</strong>
                    <p>Your payment information is encrypted and transmitted securely using 256-bit SSL.</p>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-large btn-full pay-now-btn"
                    onClick={handleProcessPayment}
                    disabled={isSubmittingPayment}
                  >
                    {isSubmittingPayment ? (
                      <span className="btn-loading-wrap">
                        <span className="btn-spinner" /> Processing Payment...
                      </span>
                    ) : selectedPaymentMethod === 'card' ? (
                      `Pay ${formatPrice(total, currency)} & Complete Order →`
                    ) : (
                      `Place Cash on Delivery Order (${formatPrice(total, currency)}) →`
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* STEP 4: Order Confirmation & Receipt                             */}
            {/* ================================================================= */}
            {currentStep === 4 && completedOrder && (
              <div className="checkout-card order-confirmed-card">
                <div className="order-success-header">
                  <div className="success-checkmark">✓</div>
                  <h2>Order Placed Successfully!</h2>
                  <p className="success-tagline">
                    Your order has been confirmed and is being prepared for shipment.
                  </p>
                </div>

                <div className="receipt-box">
                  <div className="receipt-header-row">
                    <div>
                      <span className="receipt-meta-label">Order Reference</span>
                      <span className="receipt-meta-val code-font">{completedOrder.orderReference}</span>
                    </div>
                    <div>
                      <span className="receipt-meta-label">Date</span>
                      <span className="receipt-meta-val">{completedOrder.date}</span>
                    </div>
                    <div>
                      <span className="receipt-meta-label">Payment Mode</span>
                      <span className="receipt-meta-val">{completedOrder.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="receipt-divider" />

                  <div className="receipt-items-list">
                    <h4>Purchased Items</h4>
                    {completedOrder.lines.map((item) => (
                      <div key={item.id || item.variantId} className="receipt-item-row">
                        <div className="receipt-item-title">
                          <strong>{item.title}</strong>
                          <span className="receipt-item-qty">Qty: {item.quantity}</span>
                        </div>
                        <span className="receipt-item-price">
                          {formatPrice(parseFloat(item.price) * item.quantity, currency)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="receipt-divider" />

                  <div className="receipt-total-row">
                    <span>Total Amount Paid</span>
                    <span className="receipt-total-val">{formatPrice(completedOrder.total, currency)}</span>
                  </div>

                  <div className="receipt-shipping-details">
                    <h4>Delivery Address</h4>
                    <p>
                      <strong>{completedOrder.customerName}</strong><br />
                      {completedOrder.shippingAddress}
                    </p>
                  </div>
                </div>

                <div className="confirmation-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-large"
                    onClick={onReturnHome || onBackToCart}
                  >
                    Return to Home Page
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary Card (Steps 1 to 3) */}
          {currentStep < 4 && (
            <aside className="checkout-side-col">
              <div className="checkout-card order-summary-sidebar">
                <div className="sidebar-header">
                  <h4>Order Summary</h4>
                  <span className="sidebar-item-count">({lines.length} {lines.length === 1 ? 'item' : 'items'})</span>
                </div>

                {/* Items List */}
                <div className="sidebar-items-list">
                  {lines.map((item) => (
                    <div key={item.id || item.variantId} className="sidebar-item">
                      <div className="sidebar-item-thumb">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            onError={(e) => {
                              if (item.image && !e.target.src.includes('/api/zoho-image')) {
                                e.target.src = `/api/zoho-image?url=${encodeURIComponent(item.image)}`;
                              }
                            }}
                          />
                        ) : (
                          <div className="thumb-placeholder">📱</div>
                        )}
                        <span className="sidebar-item-qty-badge">{item.quantity}</span>
                      </div>

                      <div className="sidebar-item-info">
                        <span className="sidebar-item-title">{item.title}</span>
                        <span className="sidebar-item-rate">
                          {formatPrice(parseFloat(item.price || 0), currency)} each
                        </span>
                      </div>

                      <span className="sidebar-item-price">
                        {formatPrice(parseFloat(item.price || 0) * item.quantity, currency)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="summary-divider" />

                {/* Calculation Rows */}
                <div className="summary-breakdown">
                  <div className="breakdown-row">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal, currency)}</span>
                  </div>
                  <div className="breakdown-row">
                    <span>Shipping</span>
                    <span>
                      {selectedShippingChargeId ? (
                        formatPrice(200, currency)
                      ) : (
                        <span className="free-text">Calculated next</span>
                      )}
                    </span>
                  </div>
                  <div className="breakdown-row">
                    <span>Estimated Tax</span>
                    <span className="tax-included">Included</span>
                  </div>

                  <div className="summary-divider" />

                  <div className="breakdown-row total-row">
                    <span>Grand Total</span>
                    <span className="total-price-tag">{formatPrice(total, currency)}</span>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Online Payment Modal (for Zoho Secure Pay processing) */}
      {showPaymentModal && activePaymentUrl && (
        <div className="payment-modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="payment-modal-header">
              <div className="header-titles">
                <h4>Secure Payment Gateway</h4>
                <p>Complete your payment securely</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowPaymentModal(false)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <div className="payment-modal-frame-wrap">
              <iframe
                src={activePaymentUrl}
                title="Secure Payment"
                className="payment-modal-iframe"
              />
            </div>

            {/*<div className="payment-modal-footer">*/}
            {/*  <p className="modal-help-text">*/}
            {/*    Once payment is confirmed by your bank / UPI, click below to finalize your order.*/}
            {/*  </p>*/}
            {/*  <div className="modal-footer-btns">*/}
            {/*    <button*/}
            {/*      type="button"*/}
            {/*      className="btn btn-secondary btn-modal-fail"*/}
            {/*      onClick={handlePaymentFailedInModal}*/}
            {/*    >*/}
            {/*      ✕ Payment Failed / Cancel*/}
            {/*    </button>*/}
            {/*    <button*/}
            {/*      type="button"*/}
            {/*      className="btn btn-primary"*/}
            {/*      onClick={handlePaymentCompletedInModal}*/}
            {/*    >*/}
            {/*      ✓ I Have Completed Payment*/}
            {/*    </button>*/}
            {/*  </div>*/}
            {/*</div>*/}
          </div>
        </div>
      )}
    </div>
  );
}
