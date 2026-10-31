# OrderDesk

A retailer ordering portal built with React and Vite. Retail partners can browse a wholesale catalogue, build case-quantity orders, track fulfillment, and review or print invoices.

Catalogue quantities follow each product's minimum case size. Orders of ₹50,000 or more receive a 5% discount.

## Run locally

```powershell
cd backend
npm install
npm run dev
```

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite. The Vite dev server proxies `/api` requests to the backend at `127.0.0.1:3001`. The backend exposes `GET /api/health`, `GET /api/products`, `GET /api/orders`, and `POST /api/orders`. Submitted orders are validated and saved to `backend/data/orders.json`; the catalogue and initial order history are sample data.

To create a production frontend build, run `npm run build` in the `frontend` folder. This prototype does not include retailer authentication, payment processing, or production-ready multi-user inventory reservation.
