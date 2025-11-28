import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const contactSubmissions = pgTable("contact_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  service: text("service").notNull(),
  referral: text("referral"),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContactSubmissionSchema = createInsertSchema(contactSubmissions).omit({
  id: true,
  createdAt: true,
});

export type InsertContactSubmission = z.infer<typeof insertContactSubmissionSchema>;
export type ContactSubmission = typeof contactSubmissions.$inferSelect;

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  sender: text("sender").notNull().default("visitor"),
  isEscalated: text("is_escalated").notNull().default("false"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
}).extend({
  sender: z.string().default("visitor"),
  isEscalated: z.string().default("false"),
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export const newsletterSubscriptions = pgTable("newsletter_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNewsletterSubscriptionSchema = createInsertSchema(newsletterSubscriptions).omit({
  id: true,
  createdAt: true,
});

export type InsertNewsletterSubscription = z.infer<typeof insertNewsletterSubscriptionSchema>;
export type NewsletterSubscription = typeof newsletterSubscriptions.$inferSelect;

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitorEmail: text("visitor_email").notNull(),
  visitorName: text("visitor_name").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // e.g. "application/pdf", "image/png"
  filePath: text("file_path").notNull(),
  aiAnalysis: text("ai_analysis"),
  adminReview: text("admin_review"),
  status: text("status").notNull().default("pending"), // pending, reviewed, archived
  pdfPath: text("pdf_path"), // path to generated summary PDF for resending to visitor
  visitorTimezone: text("visitor_timezone"), // e.g. "America/New_York"
  visitorDateForFilename: text("visitor_date_for_filename"), // e.g. "11-27-2025" in visitor's local timezone
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  aiAnalysis: true,
  adminReview: true,
  status: true,
  pdfPath: true,
}).extend({
  visitorDateForFilename: z.string().optional(),
  visitorTimezone: z.string().optional(),
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
