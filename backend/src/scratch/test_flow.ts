import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { Order } from '../models/Order';
import { OrderStatusHistory } from '../models/OrderStatusHistory';
import { SchedulerLog } from '../models/SchedulerLog';
import { SchedulerService } from '../services/scheduler.service';

const runTest = async () => {
  console.log('--- Starting Programmatic Verification Test ---');

  // 1. Connect to DB
  await connectDB();

  // 2. Clear Database to Start Fresh
  console.log('Clearing existing test data...');
  await Order.deleteMany({});
  await OrderStatusHistory.deleteMany({});
  await SchedulerLog.deleteMany({});

  const now = new Date();

  // Helper to create date relative to now
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000);

  // 3. Insert Mock Orders
  console.log('Inserting mock orders with different ages...');

  // Order A: PLACED 15 minutes ago. Expected status after run: PROCESSING
  const orderA = new Order({
    orderId: 'ORD-TEST-001',
    customerName: 'Jane Doe (Placed 15m ago)',
    phoneNumber: '+1111111111',
    productName: 'Wireless Earbuds',
    amount: 2999.00,
    paymentStatus: 'PAID',
    orderStatus: 'PLACED',
    idempotencyKey: 'idemp-key-test-001',
  });
  // Bypass mongoose default timestamp behavior on save to force historical dates
  orderA.createdAt = minutesAgo(15);
  orderA.updatedAt = minutesAgo(15);
  await orderA.save();

  // Record initial status transition for Jane Doe
  await OrderStatusHistory.create({
    orderId: orderA._id,
    fromStatus: null,
    toStatus: 'PLACED',
    changedBy: 'api',
    changedAt: minutesAgo(15),
  });

  // Order B: PROCESSING 25 minutes ago. Expected status after run: READY_TO_SHIP
  const orderB = new Order({
    orderId: 'ORD-TEST-002',
    customerName: 'Bob Smith (Processing 25m ago)',
    phoneNumber: '+2222222222',
    productName: 'Mechanical Keyboard',
    amount: 5499.00,
    paymentStatus: 'PAID',
    orderStatus: 'PROCESSING',
    idempotencyKey: 'idemp-key-test-002',
  });
  orderB.createdAt = minutesAgo(35);
  orderB.updatedAt = minutesAgo(25);
  await orderB.save();

  // Record history for Bob Smith
  await OrderStatusHistory.create({
    orderId: orderB._id,
    fromStatus: null,
    toStatus: 'PLACED',
    changedBy: 'api',
    changedAt: minutesAgo(35),
  });
  await OrderStatusHistory.create({
    orderId: orderB._id,
    fromStatus: 'PLACED',
    toStatus: 'PROCESSING',
    changedBy: 'system_scheduler',
    changedAt: minutesAgo(25),
  });

  // Order C: PLACED 2 minutes ago. Expected status after run: PLACED (unchanged)
  const orderC = new Order({
    orderId: 'ORD-TEST-003',
    customerName: 'Alice Johnson (Placed 2m ago)',
    phoneNumber: '+3333333333',
    productName: 'Gaming Mouse',
    amount: 1999.00,
    paymentStatus: 'PENDING',
    orderStatus: 'PLACED',
    idempotencyKey: 'idemp-key-test-003',
  });
  orderC.createdAt = minutesAgo(2);
  orderC.updatedAt = minutesAgo(2);
  await orderC.save();

  await OrderStatusHistory.create({
    orderId: orderC._id,
    fromStatus: null,
    toStatus: 'PLACED',
    changedBy: 'api',
    changedAt: minutesAgo(2),
  });

  console.log('Mock orders successfully inserted.');

  // 4. Run the Scheduler Sweep
  console.log('Running the status transitions scheduler sweep...');
  const summary = await SchedulerService.runScheduler();
  console.log('Scheduler execution finished. Summary result:', JSON.stringify(summary, null, 2));

  // 5. Query and Print Final State to verify rules
  console.log('\n--- VERIFYING RESULTS ---');
  const finalOrders = await Order.find().sort({ orderId: 1 });
  
  for (const o of finalOrders) {
    console.log(`\nOrder: ${o.orderId} [${o.customerName}]`);
    console.log(`  Initial status expected transition rules check:`);
    if (o.orderId === 'ORD-TEST-001') {
      console.log(`  Current Status: ${o.orderStatus} (Expected: PROCESSING) -> ${o.orderStatus === 'PROCESSING' ? '✅ PASS' : '❌ FAIL'}`);
    } else if (o.orderId === 'ORD-TEST-002') {
      console.log(`  Current Status: ${o.orderStatus} (Expected: READY_TO_SHIP) -> ${o.orderStatus === 'READY_TO_SHIP' ? '✅ PASS' : '❌ FAIL'}`);
    } else if (o.orderId === 'ORD-TEST-003') {
      console.log(`  Current Status: ${o.orderStatus} (Expected: PLACED) -> ${o.orderStatus === 'PLACED' ? '✅ PASS' : '❌ FAIL'}`);
    }
  }

  // 6. Print history logs
  console.log('\nChecking OrderStatusHistory counts...');
  const histories = await OrderStatusHistory.find();
  console.log(`Total state transition history logs written: ${histories.length} (Expected: 5 total - 3 original + 2 transitions)`);

  console.log('\nChecking SchedulerLog count...');
  const logs = await SchedulerLog.find();
  console.log(`Total scheduler run logs written: ${logs.length} (Expected: 1)`);
  if (logs.length > 0) {
    console.log(`Log Status: ${logs[0].status}, Updated Count: ${logs[0].updatedOrders.length}`);
  }

  // Close connection
  await mongoose.disconnect();
  console.log('\n--- Verification Test Finished ---');
  process.exit(0);
};

runTest().catch((err) => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
