# OmniResto Frontend

**OmniResto Frontend** is the user web application for the OmniResto Vietnamese Restaurant Chain Management Platform. Built for high performance, ease of use, and visual appeal, it empowers restaurant managers, floor staff, waiters, and kitchen personnel to seamlessly coordinate daily dining room and kitchen operations.

---

## 🌟 Key Application Features

- **Branch Switcher & Multi-Location Context:** Easily toggle between different restaurant branches to view and manage location-specific operations.
- **Interactive Floor Plan & Table Manager:** Real-time visual floor map displaying live table statuses (Available, Occupied, Reserved, Cleaning).
- **Intuitive Point of Sale (POS):** Fast order entry interface tailored for Vietnamese dining, supporting category filters, special preparation notes (e.g., "Không hành", "Nhiều bánh"), and extra toppings.
- **Kitchen Display System (KDS):** Live digital ticket dashboard for kitchen staff to track preparing items and signal order readiness.
- **Billing & Receipt Management:** Integrated payment checkout flow supporting multiple payment methods and invoice preview.
- **Executive Analytics Dashboard:** Visual charts and metrics for daily sales, revenue breakdown by branch, and best-selling dishes.

---

## 🛠 Technology Stack

- **Core Library:** React 19 & TypeScript
- **Build & HMR Tool:** Vite
- **Router:** React Router DOM (v7)
- **HTTP Client:** Axios (with automated JWT interceptors)
- **Data Fetching & Caching:** TanStack Query (React Query)
- **State Management:** Zustand & React Context
- **Design & Styling:** Vanilla CSS with Design Tokens (Vietnamese culinary warm amber palette)

---

## 🚀 Getting Started

### Prerequisites
- **Node.js:** 18.x or higher
- **Package Manager:** npm 9.x+

### Local Setup & Execution

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start local development server
npm run dev

# Run TypeScript type check
npx tsc -b

# Build production bundle
npm run build
```

The application will run locally at `http://localhost:5173`.
