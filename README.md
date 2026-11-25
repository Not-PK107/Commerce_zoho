# Zoho Commerce Headless Storefront (React + Vite)

A modern, high-performance headless e-commerce storefront built with **React 19 + Vite**, completely integrated with **Zoho Commerce** backend commerce operations and native checkout.

---

## 1. Architectural Highlights

- **Frontend**: React 19 + Vite SPA with instant navigation and modern typography.
- **Backend Commerce**: Zoho Commerce (India Data Centre).
- **Checkout & Payments**: Native Zoho Commerce official checkout page (`demo-60096917552.zohoecommerce.in/checkout`).
- **Cart API**: Integrated with live Zoho Storefront Cart API (`POST /storefront/api/v1/cart`).
- **Security**: Zero client-side leakage of OAuth client secrets or private admin tokens.
- **Zero Monolithic Backend Overhead**: Direct browser/proxy communication with Zoho Commerce APIs without intermediary Express, Spring Boot, or Node.js servers.

---

## 2. Organization & Store Details

| Parameter | Value |
|---|---|
| **Data Centre** | India (IN) |
| **Organization ID** | `60096917552` |
| **Store ID** | `60096917646` |
| **Storefront Domain** | `demo-60096917552.zohoecommerce.in` |
| **Storefront API Base** | `https://commerce.zoho.in/storefront/api/v1` |
| **Admin API Base** | `https://commerce.zoho.in/store/api/v1` |
| **Required Header** | `domain-name: demo-60096917552.zohoecommerce.in` |

---

## 3. Product & Variant ID Mapping

In Zoho Commerce, Product ID and Variant ID are distinct entities. Variant IDs are strictly required when dispatching cart mutations.

- **iPhone 16 Pro**:
  - Product ID: `4162352000000034377`
  - Variant ID: `4162352000000034378`
- **Samsung Galaxy S24 Ultra**:
  - Product ID: `4162352000000034350`
  - Variant ID: `4162352000000034351`

---

## 4. Key Features

- **Slide-Out Cart Drawer**: Animated right-docked drawer with live item count, quantity increment/decrement, remove actions, subtotal calculation, and instant checkout link.
- **Product Details Page (PDP)**: Multi-angle thumbnail switcher, formatted currency pricing (INR), stock status pills, Zoho ID badges, and related products recommendations.
- **Dynamic Category & Search Filters**: Instant client-side filtering by category pills (Smartphones, Laptops, Audio, Wearables), real-time search, and price sorting.
- **Native Zoho Checkout Redirect**: Automatically transfers the active cart session to Zoho Commerce's official checkout page for taxes, shipping address, and payment processing.
- **Development Proxy**: Built-in Vite proxy in `vite.config.js` (`/storefront/api` -> `https://commerce.zoho.in`) prevents browser CORS issues and preserves cookie-based sessions.

---

## 5. Development & Build

### Install Dependencies
```bash
npm install
```

### Run Local Development Server
```bash
npm run dev
```
Runs at `http://localhost:3000`.

### Production Build
```bash
npm run build
```

### Run ESLint Verification
```bash
npm run lint
```
# Commerce_zoho
