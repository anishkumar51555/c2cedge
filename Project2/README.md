# OrderDesk

OrderDesk is a wholesale ordering portal for retail partners. Browse a sample product catalogue, add products in case-size quantities, place orders, follow order statuses, and review invoice details.

## Features

- Search the catalogue and browse products by category.
- Build a cart using each product's minimum order quantity (MOQ) and available stock.
- Get a 5% discount when the subtotal is at least ₹50,000.
- Place orders with server-side validation and a ₹5,000 minimum subtotal.
- Review order history, delivery estimates, and invoice previews.
- Keep the cart in browser local storage and save submitted orders to a JSON file.

## Run locally

You need Node.js and npm. Open two terminals from the repository root.

In the first terminal, start the backend:

```powershell
cd Project2\backend
npm run dev
```

The backend listens at `http://127.0.0.1:3001`. It has no third-party runtime dependencies.

In the second terminal, install frontend dependencies once and start Vite:

```powershell
cd Project2\frontend
npm install
npm run dev
```

Open the local URL printed by Vite. Its development server forwards `/api` requests to the backend.

Alternatively, start the backend from the frontend directory with `npm run server` or `npm run server:watch`.

## Complete workflow

1. On startup, the frontend requests the product catalogue and order history. If the backend is unavailable, the portal shows a connection error and a retry action.
2. Search or filter the catalogue, then add products to the cart. The cart is saved in this browser, so it remains after a page refresh.
3. Adjust quantities in case-size increments. The interface limits quantities to the listed stock. Each order must have a subtotal of at least ₹5,000; orders of ₹50,000 or more receive a rounded 5% discount.
4. Review the cart and open checkout. Checkout summarizes the items, discount, total, and delivery estimate. No payment is collected.
5. Place the order. The backend validates product IDs, quantities, MOQ multiples, stock, and minimum order value before creating an order number and invoice reference.
6. On success, the portal clears the cart and opens **My orders**. Review order status, filter the history, or open order details.
7. Open **Invoices** to review invoice records. Selecting an invoice opens its details preview; it does not download a separate invoice PDF.

For the detailed user journey, API behavior, business rules, and data flow, see the [OrderDesk Workflow Guide](docs/orderdesk-workflow.pdf).

## API and data

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check that the backend is running. |
| `GET` | `/api/products` | Return the sample product catalogue. |
| `GET` | `/api/orders` | Return saved orders or the sample order history. |
| `POST` | `/api/orders` | Validate and save an order. The JSON body contains `lines`, each with a product `id` and integer `quantity`. |

Orders are written to `backend/data/orders.json`. If this file does not exist, the backend starts with sample orders from `backend/seed.js`. Runtime order data is excluded from Git.

## Build the frontend

From `Project2\frontend`, run:

```powershell
npm run build
```

This creates the production frontend in `frontend/dist`. The included backend is a local API and does not serve the built frontend; use a static web server or hosting platform to serve `dist`.

## Prototype scope

The catalogue, initial order history, store profile, and account details are sample/demo data. This prototype does not implement retailer authentication, payment processing, live shipping updates, stock reservation or decrementing, or production-ready multi-user data handling. Delivery dates are estimates.
