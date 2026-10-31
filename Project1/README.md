# Workbench Operations

The project is split into two folders:

- [`frontend/`](./frontend/) — React/Vite dashboard for FactoryPulse, StockPilot, QualityCheck, ServicePro, OrderDesk and WarrantyHub.
- [`backend/`](./backend/) — dependency-free Node API and JSON-file persistence.

## Development

Install frontend dependencies once, then start the backend and frontend in separate terminals. The backend has no external dependencies:

```powershell
cd backend
npm run dev
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The Vite development server proxies API requests to the local backend at `127.0.0.1:3001`.

## Run the built app

```powershell
cd frontend
npm run build
```

Then start the backend:

```powershell
cd backend
npm start
```

Open `http://127.0.0.1:3001`. Backend records are stored in `backend/data/operations.json`; this runtime data is excluded from Git by `backend/.gitignore`.

The backend listens on localhost by default. This is a small hackathon backend without user accounts, authentication or multi-user conflict resolution; do not expose it to an untrusted network.
