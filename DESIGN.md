# DESIGN.md — UI/UX Design Specification
**Version:** 1.2 | Target Stack: Next.js 16 + Tailwind CSS

---

## 1. Brand Identity

| Token | Value |
|---|---|
| **App name** | IPL Dhaba |
| **Full name** | Indian Prime Line |
| **Tagline** | Tasty & Healthy |
| **Hero line** | Where Flavours Hit Like a Six! 🏏 |
| **Signature dish** | Banaras Special |
| **Theme** | Cricket + Indian street food/dhaba culture |

---

## 2. Color Palette

Derived from the cricket-meets-dhaba aesthetic (saffron/green/white from the Indian flag, cricket pitch earth tones):

```css
:root {
  /* Primary */
  --color-saffron:     #FF6B00;   /* Primary CTA, badges, accent */
  --color-green:       #1A6B3A;   /* Open status, success, secondary CTA */
  --color-cream:       #FFF8F0;   /* Page background */

  /* Neutrals */
  --color-ink:         #1C1C1C;   /* Headings, body text */
  --color-muted:       #6B6B6B;   /* Subtitles, labels */
  --color-border:      #E8E0D5;   /* Card borders, dividers */
  --color-surface:     #FFFFFF;   /* Card backgrounds */

  /* Status — aligned with order_status DB enum */
  --color-placed:          #6B7280;   /* Placed (neutral grey) */
  --color-confirmed:       #3B82F6;   /* Confirmed (blue) */
  --color-preparing:       #F59E0B;   /* Preparing (amber) */
  --color-out-for-delivery:#8B5CF6;   /* Out for delivery (purple) */
  --color-delivered:       #10B981;   /* Delivered (green) */
  --color-cancelled:       #EF4444;   /* Cancelled (red) */

  /* Overlay */
  --color-hero-overlay: rgba(0, 0, 0, 0.45); /* Over hero image */
}
```

---

## 3. Typography

```css
/* Display: for restaurant name, section headings */
@import url('https://fonts.googleapis.com/css2?family=Yatra+One&display=swap');

/* Body: UI copy, descriptions, prices */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --font-display: 'Yatra One', cursive;   /* Cricket/Devanagari-influenced serif feel */
  --font-body:    'Inter', sans-serif;

  /* Scale */
  --text-hero:    clamp(2rem, 5vw, 3.5rem);   /* "IPL Dhaba" hero title */
  --text-h2:      1.5rem;                      /* Section headings */
  --text-h3:      1.125rem;                    /* Card titles */
  --text-body:    0.9375rem;                   /* Normal copy */
  --text-sm:      0.8125rem;                   /* Labels, badges */
  --text-xs:      0.75rem;                     /* Meta, timestamps */
}
```

---

## 4. Customer App Flow

### 4.1 Page Layout
* Single-page catalog listing under `/`.
* Header contains logo, restaurant open/closed indicator badge, and link to admin dashboard.
* Dynamic query-based filtering via debounced search (`/api/menu?search=`) and category bar.
* Interactive cart FAB drawer sliding up from the bottom (side sheet on desktop).

### 4.2 Cart Checkout & Order Placement
* **Anti-Price Tampering Design**: Cart drawer only lists `menu_item_id` and `quantity`. When placing an order, client-side pricing info is bypassed; the backend computes subtotals, taxes, and totals dynamically.
* **Pricing Constraints**: Minimum subtotal must be Rs. 100 or greater.
* **Post-Checkout Redirection**: On success, the client receives the order ID and a secure `tracking_token`. The router automatically redirects the user to `/orders/[id]?token=[tracking_token]`. This allows anonymous guest tracking.

---

## 5. Admin & Staff Dashboard

Protected routes under `/admin/*` restrict access to authenticated accounts with `role` matching `['delivery', 'manager', 'admin', 'super_admin', 'owner']`.

### 5.1 Status Progressions
Only authorized roles can transition order statuses as defined by the backend state machine transitions:
* `placed` ➔ `confirmed`: Manager, Admin, Super Admin, Owner
* `placed` ➔ `cancelled`: Manager, Admin, Super Admin, Owner, Customer
* `confirmed` ➔ `preparing`: Manager, Admin, Super Admin, Owner
* `confirmed` ➔ `cancelled`: Manager, Admin, Super Admin, Owner
* `preparing` ➔ `out_for_delivery`: Manager, Admin, Super Admin, Owner
* `out_for_delivery` ➔ `delivered`: Delivery, Manager, Admin, Super Admin, Owner

### 5.2 Real-time Status Indicator
Admin dashboard displays a real-time system connection indicator in the upper-right corner:
* `Realtime ●` (Green, pulsing): Active WebSocket connection via Supabase Realtime.
* `Polling 4s ●` (Amber, pulsing): WebSocket connection failed, polling `/api/orders` active.

---

## 6. Component Checklist

### Customer App
- [x] `<HeroSection />` — Tagline, logo, open badge
- [x] `<SearchBar />` — Debounced fuzzy search
- [x] `<CategoryBar />` — Scrollable category pills
- [x] `<MenuCard />` — Food item image, price, veg/non-veg/egg indicator, add/qty stepper
- [x] `<CartDrawer />` — Item summary, client-side address inputs (Table No. removed), places order sending only items metadata
- [x] `<OrderSuccess />` — Success confirmation dialog, links to real-time tracking, notices email receipt dispatch

### Admin Dashboard
- [x] `<AdminLogin />` — Admin credentials prompt
- [x] `<AdminHeader />` — Navigation dashboard backlink, real-time connection status dot
- [x] `<StatCard />` — Metrics summary: Today's Orders, Revenue, Pending, Completed
- [x] `<OrderCard />` — Customer details, addresses, item lists, status change selector with state machine validation

### Real-time Tracking
- [x] `<TrackingMap />` — Coordinates tracking Mapbox overlay. Uses coordinate-derived React `key` to synchronize viewport tracking immediately.

---

## 7. Data Models

### MenuItem
```ts
export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  food_type: 'veg' | 'non_veg' | 'egg';
  is_available: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}
```

### Order
```ts
export interface Order {
  id: string;
  order_number: number;
  customer_id?: string | null;
  customer_name: string;
  phone: string;
  delivery_address: {
    address_line: string;
    city?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
  };
  delivery_instructions?: string | null;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  status: 'placed' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  payment_method: 'cod' | 'online';
  payment_status: 'pending' | 'paid' | 'refunded';
  estimated_delivery_at?: string | null;
  delivered_at?: string | null;
  cancelled_reason?: string | null;
  tracking_token?: string;
  order_items?: OrderItem[];
  created_at?: string;
  updated_at?: string;
}
```