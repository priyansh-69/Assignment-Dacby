# Full-Stack Assignment

**Time Limit:** 48 Hours

**Submission Format:** GitHub Repository with full commit history

---

## Objective

Build a mini full-stack application that demonstrates your ability to work with backend APIs, React dashboard, database design, and scheduled background tasks using any cloud scheduler or cron-based scheduler.

---

## Assignment Overview

### 1. Order Management Backend

Build APIs to create and manage orders.

**Order fields:**

- Order ID
- Customer name
- Phone number
- Product name
- Amount
- Payment status
- Order status
- Created time
- Updated time

The API should support filtering orders by status.

---

### 2. Scheduler Task

Create a scheduled task that automatically updates order statuses.

**Scheduler logic:**

- Fetch all orders with status
- If an order is older than 10 minutes, update it to the next status
- Maintain status history
- Save scheduler execution logs
- Protect this API using a secret key in headers

The scheduler should run every 5 minutes using any cloud scheduler or cron service. Examples:

- Google Cloud Scheduler
- AWS EventBridge Scheduler
- Render Cron Job
- Railway Cron Job
- GitHub Actions Cron
- Vercel Cron Job
- Local cron job for testing

---

### 3. React Dashboard

Build a simple React dashboard to display orders by status.

**Features to implement:**

- Status dropdown filter
- Orders table
- Show order ID, customer name, phone, product name, amount, status, payment status, and created time
- Loading state
- Empty state
- Error handling
- Auto-refresh button

---

### 4. Order Status Flow

Orders should follow this status flow:

`PLACED` → `PROCESSING` → `READY_TO_SHIP`

**Required:**

- If order status is `PLACED` for more than 10 minutes, move it to `PROCESSING`

**Bonus:**

- If order status is `PROCESSING` for more than 20 minutes, move it to `READY_TO_SHIP`

---

### 5. System Design

The candidate should design the database structure independently.

In the README or Loom video, explain:

- Which database you used and why
- Collections/tables created
- How order status history is stored
- How scheduler logs are stored
- How duplicate orders are prevented
- How race conditions are handled
- How the system can scale
- Which scheduler service you used and why

Do not directly copy a fixed schema. We want to evaluate your system design approach.

---

## Technical Guidelines

**Use:**

- Node.js
- Express.js
- React.js
- MongoDB / Firebase Firestore
- Any cloud scheduler or local cron for testing

Follow a clean folder structure.

Use `.env` for all secrets and environment variables.

**Avoid:**

- Hardcoded secrets
- Unused code
- Commented-out code
- Single-file backend structure

---

## Submission Requirements

Your GitHub repository must include:

- Complete frontend and backend source code
- Proper commit history with multiple meaningful commits
- README.md with:
  - Setup instructions
  - Environment variables list
  - Steps to run locally
  - Scheduler setup instructions
- Postman collection or API documentation

**Note:** Repositories with a single commit will be automatically rejected.

---

## Bonus

Optional but recommended:

- Deploy backend and frontend
- Add scheduler logs dashboard
- Add pagination in orders list
- Add search by order ID or customer name

---

## Evaluation Criteria

- Code quality and folder structure
- API design and functionality
- Scheduler implementation
- Scheduler security
- React dashboard usability
- Database and system design
- Error handling
- Problem-solving approach explained in Loom video