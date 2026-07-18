import { Schema, model, Document, Types } from 'mongoose';
import { OrderStatus } from './Order';

export interface IOrderStatusHistory extends Document {
  orderId: Types.ObjectId;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedBy: 'system_scheduler' | 'user' | 'api';
  changedAt: Date;
}

const orderStatusHistorySchema = new Schema<IOrderStatusHistory>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    fromStatus: {
      type: String,
      enum: ['PLACED', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED', null],
      default: null,
    },
    toStatus: {
      type: String,
      enum: ['PLACED', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
      required: true,
      index: true,
    },
    changedBy: {
      type: String,
      enum: ['system_scheduler', 'user', 'api'],
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

export const OrderStatusHistory = model<IOrderStatusHistory>(
  'OrderStatusHistory',
  orderStatusHistorySchema
);
