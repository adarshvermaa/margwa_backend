import { pgTable, uuid, varchar, text, boolean, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';
import { bookings } from './bookings';

// Notifications Table
export const notifications = pgTable('notifications', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    notificationType: varchar('notification_type', { length: 50 }).notNull(),
    data: jsonb('data'),
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
});

// Reviews Table
export const reviews = pgTable('reviews', {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id').notNull().unique().references(() => bookings.id),
    reviewerId: uuid('reviewer_id').notNull().references(() => users.id),
    revieweeId: uuid('reviewee_id').notNull().references(() => users.id),
    rating: integer('rating').notNull(),
    reviewText: text('review_text'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Type exports
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
