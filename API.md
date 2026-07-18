# API Documentation - Order Management System

This document outlines the API endpoints provided by the Order Management System backend.

- **Base URL (Local Development):** `http://localhost:5001/api/v1`

---

## Order Endpoints

### 1. Create Order
Creates a new order. Enforces server-side time-bucketed deduplication if no `idempotencyKey` is provided by the client.

* **URL:** `/orders`
* **Method:** `POST`
* **Headers:**
  * `Content-Type: application/json`
* **Body Params:**
  * `customerName` (String, Required): Name of the customer.
  * `phoneNumber` (String, Required): Contact number.
  * `productName` (String, Required): Name of the product.
  * `amount` (Number, Required): Price/Amount (must be positive).
  * `paymentStatus` (String, Optional): `PENDING` (default), `PAID`, or `FAILED`.
  * `idempotencyKey` (String, Optional): Unique client token to prevent double-submissions. If omitted, the server will compute an MD5 hash of customer details bucketed to the current minute to prevent duplicate orders.
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "orderId": "ORD-20260718-491295",
      "customerName": "John Doe",
      "phoneNumber": "+1234567890",
      "productName": "iPhone 15 Pro",
      "amount": 999.99,
      "paymentStatus": "PENDING",
      "orderStatus": "PLACED",
      "idempotencyKey": "a90b4d...",
      "_id": "64b58e...",
      "createdAt": "2026-07-18T08:16:14.000Z",
      "updatedAt": "2026-07-18T08:16:14.000Z"
    }
  }
  ```

### 2. Get Orders (List & Filter)
Retrieves a paginated list of orders, support filtering by status and searching.

* **URL:** `/orders`
* **Method:** `GET`
* **Query Params:**
  * `status` (String, Optional): Filter by status (`ALL` or specific state: `PLACED`, `PROCESSING`, `READY_TO_SHIP`, etc.). Default is `ALL`.
  * `search` (String, Optional): Case-insensitive search on `orderId`, `customerName`, or `productName`.
  * `page` (Number, Optional): Page index (default: `1`).
  * `limit` (Number, Optional): Count per page (default: `10`, max `100`).
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "orders": [ ... ],
    "total": 24,
    "page": 1,
    "pages": 3
  }
  ```

### 3. Get Order Details & History
Fetches a single order's complete details along with its status transition audit trail.

* **URL:** `/orders/:id`
* **Method:** `GET`
* **Path Params:**
  * `id` (String, Required): The MongoDB `_id` OR the readable custom `orderId` (e.g. `ORD-20260718-491295`).
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "_id": "64b58e...",
      "orderId": "ORD-20260718-491295",
      "customerName": "John Doe",
      "phoneNumber": "+1234567890",
      "productName": "iPhone 15 Pro",
      "amount": 999.99,
      "paymentStatus": "PENDING",
      "orderStatus": "PROCESSING",
      "createdAt": "2026-07-18T08:00:00.000Z",
      "updatedAt": "2026-07-18T08:10:00.000Z"
    },
    "history": [
      {
        "orderId": "64b58e...",
        "fromStatus": null,
        "toStatus": "PLACED",
        "changedBy": "api",
        "changedAt": "2026-07-18T08:00:00.000Z"
      },
      {
        "orderId": "64b58e...",
        "fromStatus": "PLACED",
        "toStatus": "PROCESSING",
        "changedBy": "system_scheduler",
        "changedAt": "2026-07-18T08:10:00.000Z"
      }
    ]
  }
  ```

---

## Scheduler Endpoints

### 1. Trigger Scheduler Run
Runs the cron sweep task to find and update state on expired orders.
- Orders in `PLACED` for > 10 minutes transition to `PROCESSING`.
- Orders in `PROCESSING` for > 20 minutes transition to `READY_TO_SHIP`.

* **URL:** `/scheduler/run`
* **Method:** `POST`
* **Headers:**
  * `x-scheduler-key: <SCHEDULER_SECRET_KEY>` OR `Authorization: Bearer <SCHEDULER_SECRET_KEY>`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "summary": {
      "startTime": "2026-07-18T08:16:14.000Z",
      "endTime": "2026-07-18T08:16:14.015Z",
      "durationMs": 15,
      "status": "SUCCESS",
      "processedCount": 3,
      "updatedOrdersCount": 2,
      "updatedOrders": [
        {
          "orderId": "64b58e...",
          "customOrderId": "ORD-20260718-491295",
          "fromStatus": "PLACED",
          "toStatus": "PROCESSING"
        }
      ]
    }
  }
  ```

### 2. Get Scheduler Logs
Retrieves execution history logs for the dashboard.

* **URL:** `/scheduler/logs`
* **Method:** `GET`
* **Query Params:**
  * `limit` (Number, Optional): Number of history logs to fetch. Default is 20.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "64b58f...",
        "startTime": "2026-07-18T08:15:00.000Z",
        "endTime": "2026-07-18T08:15:00.050Z",
        "durationMs": 50,
        "status": "SUCCESS",
        "processedCount": 10,
        "updatedOrders": [ ... ]
      }
    ]
  }
  ```
