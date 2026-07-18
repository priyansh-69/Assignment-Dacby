import { Schema, model, Document, Types } from 'mongoose';

export interface ISchedulerLog extends Document {
  startTime: Date;
  endTime: Date;
  durationMs: number;
  status: 'SUCCESS' | 'FAILED';
  processedCount: number;
  updatedOrders: Array<{
    orderId: Types.ObjectId;
    customOrderId: string;
    fromStatus: string;
    toStatus: string;
  }>;
  errorMessage?: string;
}

const schedulerLogSchema = new Schema<ISchedulerLog>(
  {
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    durationMs: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED'],
      required: true,
      index: true,
    },
    processedCount: {
      type: Number,
      required: true,
      default: 0,
    },
    updatedOrders: [
      {
        orderId: {
          type: Schema.Types.ObjectId,
          ref: 'Order',
          required: true,
        },
        customOrderId: {
          type: String,
          required: true,
        },
        fromStatus: {
          type: String,
          required: true,
        },
        toStatus: {
          type: String,
          required: true,
        },
      },
    ],
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: false,
  }
);

export const SchedulerLog = model<ISchedulerLog>('SchedulerLog', schedulerLogSchema);
