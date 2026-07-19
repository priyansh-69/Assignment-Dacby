# DACBY-Orders — An Order Management System

A full-stack Order Management Application with backend APIs, a React dashboard, automated scheduler for order status transitions, and detailed execution logging.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express.js + Mongoose (TypeScript) |
| Frontend | React.js + Vite (TypeScript) + Vanilla CSS |
| Database | MongoDB Atlas |
| Scheduler | `node-cron` (local) / Cloud scheduler via secured HTTP endpoint |

---

## Project Structure

```
├── backend/
│   └── src/
│       ├── app.ts                  # Express server + cron scheduler boot
│       ├── config/
│       │   ├── db.ts               # MongoDB connection
│       │   └── env.ts              # Environment variable loader
│       ├── controllers/
│       │   ├── order.controller.ts
│       │   └── scheduler.controller.ts
│       ├── middlewares/
│       │   ├── auth.ts             # x-scheduler-key validation
│       │   └── errorHandler.ts
│       ├── models/
│       │   ├── Order.ts
│       │   ├── OrderStatusHistory.ts
│       │   └── SchedulerLog.ts
│       ├── routes/
│       │   └── api.routes.ts
│       ├── services/
│       │   ├── order.service.ts
│       │   └── scheduler.service.ts
│       └── scripts/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Dashboard.tsx
│       │   ├── OrderTable.tsx
│       │   ├── OrderDetailModal.tsx
│       │   ├── CreateOrderModal.tsx
│       │   ├── SchedulerLogs.tsx
│       │   └── StatusBadge.tsx
│       ├── styles/
│       └── utils/
├── .env
├── API.md
├── PostmanCollection.json
└── README.md
```

---

## Setup Instructions

### Prerequisites

- Node.js (v18+)
- npm
- MongoDB Atlas account or local MongoDB instance

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Assignment-Dacby
```

### 2. Create the Environment File

Create a `.env` file in the project root:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/dbname?retryWrites=true&w=majority
SCHEDULER_SECRET_KEY=your_secret_key
SCHEDULER_CRON_INTERVAL=*/5 * * * *
ORDER_PLACED_TIMEOUT_MS=600000
ORDER_PROCESSING_TIMEOUT_MS=1200000
```

### 3. Run the Backend

```bash
cd backend
npm install
npm run dev
```

Server starts on `http://localhost:5001`.

### 4. Run the Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Dashboard launches at `http://localhost:5173`.

---

## Environment Variables

| Variable | Type | Description | Default |
|---|---|---|---|
| `PORT` | Number | Express server port | `5001` |
| `MONGODB_URI` | String | MongoDB connection string | `mongodb://localhost:27017/order_management` |
| `SCHEDULER_SECRET_KEY` | String | Secret key to protect the scheduler endpoint | — |
| `SCHEDULER_CRON_INTERVAL` | String | Cron expression for scheduler frequency | `*/5 * * * *` (every 5 minutes) |
| `NODE_ENV` | String | `development` or `production` | `development` |
| `ORDER_PLACED_TIMEOUT_MS` | Number | Time (ms) before `PLACED` → `PROCESSING` | `600000` (10 minutes) |
| `ORDER_PROCESSING_TIMEOUT_MS` | Number | Time (ms) before `PROCESSING` → `READY_TO_SHIP` | `1200000` (20 minutes) |
| `VITE_API_BASE_URL` | String | Backend API base URL (frontend `.env`) | `http://localhost:5001/api/v1` |

---

## Scheduler Setup

### How It Works

The scheduler automatically transitions order statuses:

- `PLACED` for more than **10 minutes** → `PROCESSING`
- `PROCESSING` for more than **20 minutes** → `READY_TO_SHIP` *(bonus)*

It runs every **5 minutes**, fetches eligible orders, updates them atomically, records status history, and saves execution logs.

The scheduler endpoint is protected using a secret key header:

```
x-scheduler-key: <SCHEDULER_SECRET_KEY>
```

### Local Development

The backend boots a `node-cron` scheduler automatically on startup. It fires at the interval defined in `SCHEDULER_CRON_INTERVAL`. No additional setup is needed.

### Production Deployment

Configure any cloud cron scheduler to call the secured HTTP endpoint:

1. **URL:** `POST https://<your-domain>/api/v1/scheduler/run`
2. **Schedule:** Every 5 minutes
3. **Header:** `x-scheduler-key: <your_secret_key>`

Supported schedulers: Google Cloud Scheduler, AWS EventBridge, Render Cron Job, Railway Cron Job, GitHub Actions Cron, Vercel Cron Job.

---

## System Design

### 1. Which database and why

**MongoDB** — selected because:

- **Flexible document schema:** Order data structures can evolve without migrations. Fields like metadata, shipping parameters, and billing structures map naturally to BSON documents.
- **JSON compatibility:** Native alignment with the Node.js/Express/React ecosystem eliminates serialization overhead.
- **Indexing:** Compound indexes on `{ orderStatus, updatedAt }` enable fast candidate queries for the scheduler. Individual indexes on `orderId`, `customerName`, `paymentStatus`, and `idempotencyKey` support filtering, search, and deduplication.

### 2. Collections created

| Collection | Purpose |
|---|---|
| `orders` | Stores order details — orderId, customerName, phoneNumber, productName, amount, paymentStatus, orderStatus, idempotencyKey, timestamps |
| `orderstatushistories` | Audit trail of every status transition — fromStatus, toStatus, changedBy, changedAt |
| `schedulerlogs` | Execution log per scheduler run — startTime, endTime, durationMs, status, processedCount, updatedOrders, errorMessage |

### 3. How order status history is stored

Status history is **normalized into a separate collection** (`OrderStatusHistory`) to keep the `orders` collection lightweight. Every time an order's status changes — whether by the scheduler or the API — a new document is inserted:

```typescript
{
  orderId: ObjectId,       // Reference to the order
  fromStatus: "PLACED",    // Previous status (null for initial creation)
  toStatus: "PROCESSING",  // New status
  changedBy: "system_scheduler" | "api",
  changedAt: Date
}
```

This allows querying the complete audit trail for any order without bloating the order document itself.

### 4. How scheduler logs are stored

Every scheduler execution (every cron tick) creates a `SchedulerLog` document:

```typescript
{
  startTime: Date,
  endTime: Date,
  durationMs: Number,        // Execution time
  status: "SUCCESS" | "FAILED",
  processedCount: Number,    // How many candidate orders were found
  updatedOrders: [           // Which orders were actually transitioned
    {
      orderId: ObjectId,
      customOrderId: "ORD-20260719-123456",
      fromStatus: "PLACED",
      toStatus: "PROCESSING"
    }
  ],
  errorMessage: String       // Populated only on failure
}
```

Both successful and failed runs are logged. If the database write itself fails, the error is caught and logged to console as a fallback.

### 5. How duplicate orders are prevented

Dual-layer deduplication:

1. **Client-generated idempotency key:** The frontend generates a unique token when the Create Order modal opens. This token is sent with the order payload. The `idempotencyKey` field has a **unique index** in MongoDB — if the same token is submitted again (e.g., double-click), the second insert is rejected and the existing order is returned.

2. **Server-side sliding-window hash:** If the client does not provide an idempotency key, the server computes a fallback:
   ```
   MD5(customerName + phoneNumber + productName + amount + Math.floor(Date.now() / 60000))
   ```
   This creates a 1-minute time-bucketed hash. Any identical order submitted within the same minute hashes to the same value and is rejected by the unique index.

### 6. How race conditions are handled

If multiple scheduler instances or overlapping cron ticks try to update the same order simultaneously, we prevent conflicts using MongoDB's **atomic `findOneAndUpdate`** with a status precondition:

```typescript
const updatedOrder = await Order.findOneAndUpdate(
  { _id: order._id, orderStatus: currentStatus }, // Only update if status hasn't changed
  { $set: { orderStatus: nextStatus } },
  { new: true }
);
```

If another process already transitioned the order, the query condition `orderStatus: currentStatus` no longer matches, `findOneAndUpdate` returns `null`, and the transition is safely skipped. No locks are needed — the atomicity guarantee comes from MongoDB's single-document write semantics.

### 7. How the system can scale

- **Database indexing:** Compound index `{ orderStatus: 1, updatedAt: 1 }` ensures the scheduler's candidate query scans only relevant documents, even with millions of orders.
- **Horizontal server scaling:** The Express API is stateless — multiple instances can run behind a load balancer (e.g., AWS ALB, Nginx).
- **Task queue:** For high volume, replace in-process scheduler sweeps with a distributed job queue like **BullMQ** backed by Redis. Workers consume transition jobs safely with Redis-based distributed locks.
- **Scheduler isolation:** The current `node-cron` is process-local. If horizontally scaled to N instances, each fires its own tick independently. The atomic `findOneAndUpdate` prevents double-updates, but N-1 ticks per interval are redundant. At scale, the scheduler should run as a **single dedicated worker** or use an **external cloud scheduler** hitting `/api/v1/scheduler/run` with a distributed lock (e.g., Redlock) for exactly-once execution.
- **Cursor-based pagination:** Replace offset-based `skip().limit()` with cursor-based pagination using `createdAt` or `_id` to avoid degrading performance on large datasets.

### 8. Which scheduler service and why

**`node-cron`** — chosen because it requires zero external infrastructure for local development. The scheduler boots alongside the Express server with no additional setup, making it ideal for development and testing.

For production, the architecture supports swapping to any cloud scheduler (**Google Cloud Scheduler**, **Render Cron Jobs**, **Vercel Cron**, etc.) without code changes — they simply call the secured `POST /api/v1/scheduler/run` endpoint with the `x-scheduler-key` header. This cleanly separates the scheduling trigger from the application logic.

---

## Bonus Features Implemented

- ✅ Scheduler logs dashboard — view execution history with duration, processed count, and updated order details
- ✅ Pagination in orders list
- ✅ Search by Order ID or Customer Name
- ✅ `PROCESSING` → `READY_TO_SHIP` transition after 20 minutes
