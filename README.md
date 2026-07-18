# LogiFlow - Order Management System with Scheduler & Dashboard

LogiFlow is a mini full-stack Order Management Application that showcases order status lifecycles, automated background processing, duplicate prevention, and detailed execution logging.

---

## Technical Stack
- **Backend:** Node.js + Express.js + Mongoose (TypeScript)
- **Frontend:** React + Vite (TypeScript) + Vanilla CSS (Premium Glassmorphism Design System)
- **Database:** MongoDB Atlas
- **Scheduler:** `node-cron` (local simulation) and secured HTTP trigger endpoint `/api/v1/scheduler/run` (production cloud schedulers)

---

## Features
- **Orders Table:** Displays custom Order ID, Customer Name, Phone, Product Name, Amount (in INR), Payment Status, Order Status, and Date.
- **Filters & Search:** Quick-filter by order status, typeahead text search on Customer/Order ID/Product, and pagination.
- **Detailed Audit Trail:** Double-clicking or selecting any order opens a detail modal rendering a vertical timeline of all historic state changes (e.g. `PLACED` -> `PROCESSING` -> `READY_TO_SHIP`).
- **Auto-Refresh Toggle:** Enabling Auto-Refresh polls the backend silently every 10 seconds for real-time status updates.
- **Scheduler Control Widget:** Set the scheduler security key, manually trigger a cron sweep on demand, and view execution logs showing duration (ms), count checked, and details of updated orders.
- **Deduplication:** Prevents double submissions through client-generated keys and sliding-window server-side hashes.

---

## Local Setup & Run Instructions

### 1. Database Configuration
The application reads environment variables from the `.env` file at the root workspace directory. Ensure it exists with a valid MongoDB connection string:
```bash
# Root Workspace /.env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/dbname?retryWrites=true&w=majority
```

### 2. Run the Backend Server
```bash
cd backend
npm install
npm run dev
```
*The server will boot by default on port `5001`.*

### 3. Run the Frontend Dashboard
Open a new terminal session and execute:
```bash
cd frontend
npm install
npm run dev
```
*The frontend will launch at `http://localhost:5173`.*

---

## Environment Variables List

### Backend Environment Variables (`backend/.env` or root `.env`)
- `PORT`: (Number) Port for Express server (default: `5001`).
- `MONGODB_URI`: (String) MongoDB connection string.
- `SCHEDULER_SECRET_KEY`: (String) Auth secret to restrict cron sweeps (default: `super_secret_scheduler_key_12345`).
- `SCHEDULER_CRON_INTERVAL`: (String) Cron expression for automated ticks (default: `*/5 * * * *` - every 5 minutes).
- `NODE_ENV`: (String) `development` or `production`.

### Frontend Environment Variables (`frontend/.env`)
- `VITE_API_BASE_URL`: (String) Path to backend API endpoint (default: `http://localhost:5001/api/v1`).

---

## Scheduler Setup Instructions

### Local Execution
The backend automatically spins up a local background scheduler running `node-cron`. It fires ticks at the interval defined in `SCHEDULER_CRON_INTERVAL`. 
To run a test with quick intervals, you can set `SCHEDULER_CRON_INTERVAL=* * * * *` (every minute) or change status age criteria in database tests.

### Production Execution
For deployment, you should configure a cloud cron scheduler (such as **Google Cloud Scheduler**, **Render Cron Jobs**, or **Vercel Cron**):
1. Create a `POST` job targeting `https://<your-backend-domain>/api/v1/scheduler/run`.
2. Configure the schedule to trigger every 5 minutes (or desired interval).
3. Include the secret authorization header for security:
   - Header Key: `x-scheduler-key`
   - Header Value: `<your-configured-scheduler-secret-key>`
   *(Or standard `Authorization: Bearer <key>`)*

---

## System Design Answers

### 1. Database Choice
We selected **MongoDB** as our database because:
- **Flexible Document Schema:** Order processing lifecycles often require dynamic parameters (e.g. metadata for items, shipping parameters, billing structures) that map naturally to BSON documents.
- **JSON Compatibility:** Aligns perfectly with the JavaScript/Node/React ecosystem, reducing serialization overhead.
- **Indexing Support:** Native B-tree index implementations allow us to achieve high-performance status lookups and order queries.

### 2. Collections Created
- **`orders`**: Stores order attributes, payment status, active status, and unique idempotency keys.
- **`order_status_histories`**: Stores auditing records mapping order transitions.
- **`scheduler_logs`**: Stores execution performance logs of the status transition tasks.

### 3. Order Status History Storage
To keep the primary `orders` table light and quick, status history is normalized into a separate `OrderStatusHistory` collection. Every time an order status is modified, a new transition document is written:
```typescript
{
  orderId: Schema.Types.ObjectId,
  fromStatus: String, // e.g. "PLACED"
  toStatus: String,   // e.g. "PROCESSING"
  changedBy: String,  // e.g. "system_scheduler" | "api"
  changedAt: Date
}
```
This is queried only when the user opens the "Audit Detail" modal for a specific order.

### 4. Scheduler Logs Storage
Every execution tick of the background scheduler creates a `SchedulerLog` entry containing:
- Start/End timestamps and overall duration (ms).
- Overall success/fail status.
- Number of candidate records processed.
- Array detailing the orders updated during the sweep (`{ orderId, customOrderId, fromStatus, toStatus }`).
- Error messages (if the sweep fails due to DB loss, etc.).

### 5. Duplicate Prevention (Deduplication)
We implement dual-layer protection to prevent duplicate orders:
1. **Client-Generated Keys:** When the Create Order modal opens, a unique random token (`client-key-...`) is generated. This is submitted with the order. If the user double-clicks the submit button, both payloads have the same key. The database enforces a unique constraint index on `idempotencyKey` and rejects the second insert.
2. **Server-Side Sliding-Window Deduplication:** If the client fails to provide an idempotency key, the server generates a composite fallback key:
   `Hash(customerName + phoneNumber + productName + amount + Math.floor(Date.now() / 60000))`
   This creates a 1-minute sliding window bucket. Any identical order submitted within the same 1-minute window will hash to the same value, causing MongoDB to reject the duplicate insert.

### 6. Race Conditions Handling
If multiple threads or scheduler endpoints trigger simultaneously, overlapping sweeps could try to update the same order. We handle this using MongoDB's atomic `findOneAndUpdate` operation with state assertions:
```typescript
const updatedOrder = await Order.findOneAndUpdate(
  { _id: order._id, orderStatus: currentStatus }, // Ensure status is still the matching state
  { $set: { orderStatus: nextStatus } },
  { new: true }
);
```
If another process has already updated the order, the query will return `null` and skip the transition, ensuring order status transitions are perfectly linear and safe.

### 7. How the System Scales
To scale the system to millions of orders:
- **Database Indexing:** Establish compound index structures e.g. `{ orderStatus: 1, updatedAt: 1 }` to make candidate order queries extremely fast.
- **Horizontal Server Scaling:** Run stateless Express servers behind a load balancer (e.g. AWS ALB or Nginx).
- **Asynchronous Task Queue:** Instead of having Express nodes run database sweeps in-memory (which uses resources and can cause overlap), move transitions to a distributed job queue like **BullMQ** or **Agenda** backed by a Redis store. A worker pool can consume jobs safely using Redis locks.
- **Scheduler Isolation:** The current `node-cron` scheduler is process-local — if the backend is horizontally scaled to N instances, each instance fires its own cron tick independently. The atomic `findOneAndUpdate` guards prevent double-updates, but N-1 runs per tick are wasted DB round-trips producing redundant `SchedulerLog` entries. At scale, the scheduler should run as a **single dedicated worker process** (separate from the API servers) or be replaced entirely by an **external cloud scheduler** (e.g. Google Cloud Scheduler) hitting the protected `/api/v1/scheduler/run` endpoint with a distributed lock (e.g. Redlock) to guarantee exactly-once execution per tick.
- **Cursor-Based Pagination:** For dashboard queries, transition from offset-based pagination (`skip().limit()`) to cursor-based pagination (using the order ID or `createdAt` timestamp) to avoid high memory lookups.
