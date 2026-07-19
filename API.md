# API Documentation

**Base URL:** `http://localhost:5001/api/v1`

---

## Order Endpoints

### 1. Create Order

- **URL:** `POST /orders`
- **Headers:** `Content-Type: application/json`
- **Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `customerName` | String | Yes | Customer name |
| `phoneNumber` | String | Yes | Phone number |
| `productName` | String | Yes | Product name |
| `amount` | Number | Yes | Order amount (positive) |
| `paymentStatus` | String | No | `PENDING` (default), `PAID`, or `FAILED` |
| `idempotencyKey` | String | No | Unique client token to prevent duplicate submissions |

- **Response (201):**

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
    "createdAt": "2026-07-18T08:16:14.000Z",
    "updatedAt": "2026-07-18T08:16:14.000Z"
  }
}
```

- **Error (400):**

```json
{
  "success": false,
  "error": "Customer name is required and must be a valid string."
}
```

---

### 2. Get Orders (List & Filter)

- **URL:** `GET /orders`
- **Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `status` | String | No | Filter by status: `ALL`, `PLACED`, `PROCESSING`, `READY_TO_SHIP` |
| `search` | String | No | Search by order ID, customer name, or product name |
| `page` | Number | No | Page number (default: `1`) |
| `limit` | Number | No | Records per page (default: `10`, max: `100`) |

- **Response (200):**

```json
{
  "success": true,
  "orders": [
    {
      "orderId": "ORD-20260718-491295",
      "customerName": "John Doe",
      "phoneNumber": "+1234567890",
      "productName": "iPhone 15 Pro",
      "amount": 999.99,
      "paymentStatus": "PENDING",
      "orderStatus": "PLACED",
      "createdAt": "2026-07-18T08:16:14.000Z",
      "updatedAt": "2026-07-18T08:16:14.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pages": 1
}
```

---

### 3. Get Order Details & History

- **URL:** `GET /orders/:id`
- **Path Parameters:**
  - `id` — MongoDB `_id` or custom `orderId` (e.g., `ORD-20260718-491295`)

- **Response (200):**

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
    "orderStatus": "PROCESSING",
    "createdAt": "2026-07-18T08:00:00.000Z",
    "updatedAt": "2026-07-18T08:10:00.000Z"
  },
  "history": [
    {
      "fromStatus": null,
      "toStatus": "PLACED",
      "changedBy": "api",
      "changedAt": "2026-07-18T08:00:00.000Z"
    },
    {
      "fromStatus": "PLACED",
      "toStatus": "PROCESSING",
      "changedBy": "system_scheduler",
      "changedAt": "2026-07-18T08:10:05.000Z"
    }
  ]
}
```

- **Error (404):**

```json
{
  "success": false,
  "error": "Order not found."
}
```

---

## Scheduler Endpoints

### 1. Trigger Scheduler Run

Runs the status transition task. Protected by secret key.

- Orders in `PLACED` for > 10 minutes → `PROCESSING`
- Orders in `PROCESSING` for > 20 minutes → `READY_TO_SHIP`

- **URL:** `POST /scheduler/run`
- **Headers:** `x-scheduler-key: <SCHEDULER_SECRET_KEY>`
- **Response (200):**

```json
{
  "success": true,
  "summary": {
    "startTime": "2026-07-18T08:15:00.000Z",
    "endTime": "2026-07-18T08:15:00.042Z",
    "durationMs": 42,
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

- **Error (401):**

```json
{
  "success": false,
  "error": "Unauthorized. Invalid or missing scheduler secret key."
}
```

---

### 2. Get Scheduler Logs

- **URL:** `GET /scheduler/logs`
- **Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `limit` | Number | No | Number of logs to fetch (default: `20`) |

- **Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "startTime": "2026-07-18T08:15:00.000Z",
      "endTime": "2026-07-18T08:15:00.042Z",
      "durationMs": 42,
      "status": "SUCCESS",
      "processedCount": 3,
      "updatedOrders": [
        {
          "orderId": "64b58e...",
          "customOrderId": "ORD-20260718-491295",
          "fromStatus": "PLACED",
          "toStatus": "PROCESSING"
        }
      ]
    }
  ]
}
```
