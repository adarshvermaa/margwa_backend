import { pgTable, uuid, varchar, text, boolean, timestamp, decimal, pgEnum, date } from 'drizzle-orm/pg-core';
import { users } from './users';
import { bookings } from './bookings';
import { driverProfiles } from './drivers';

// Enums
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'card', 'upi', 'wallet']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'completed', 'failed', 'refunded']);
export const withdrawalStatusEnum = pgEnum('withdrawal_status', ['pending', 'withdrawn']);

// Payments Table
export const payments = pgTable('payments', {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id').notNull().references(() => bookings.id),
    payerId: uuid('payer_id').notNull().references(() => users.id),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    paymentStatus: paymentStatusEnum('payment_status').notNull().default('pending'),
    transactionId: varchar('transaction_id', { length: 100 }).unique(),
    gatewayResponse: text('gateway_response'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    refundedAt: timestamp('refunded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Earnings Table
export const earnings = pgTable('earnings', {
    id: uuid('id').primaryKey().defaultRandom(),
    driverId: uuid('driver_id').notNull().references(() => driverProfiles.id),
    bookingId: uuid('booking_id').notNull().references(() => bookings.id),
    grossAmount: decimal('gross_amount', { precision: 10, scale: 2 }).notNull(),
    platformCommission: decimal('platform_commission', { precision: 10, scale: 2 }).notNull(),
    netAmount: decimal('net_amount', { precision: 10, scale: 2 }).notNull(),
    paymentDate: date('payment_date').notNull(),
    withdrawalStatus: withdrawalStatusEnum('withdrawal_status').notNull().default('pending'),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Type exports
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Earning = typeof earnings.$inferSelect;
export type NewEarning = typeof earnings.$inferInsert;
