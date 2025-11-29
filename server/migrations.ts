import { sql } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

export async function ensureTablesExist(db: NeonHttpDatabase) {
  try {
    console.log("[Migration] Checking if database tables exist...");
    
    // Create tables using raw SQL to ensure they exist
    // This is safe - it won't error if tables already exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "username" text NOT NULL UNIQUE,
        "password" text NOT NULL
      );
    `);
    console.log("[Migration] ✅ users table ready");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "contact_submissions" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" text NOT NULL,
        "phone" text NOT NULL,
        "email" text NOT NULL,
        "service" text NOT NULL,
        "referral" text,
        "message" text,
        "created_at" timestamp DEFAULT now()
      );
    `);
    console.log("[Migration] ✅ contact_submissions table ready");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "chat_messages" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" text NOT NULL,
        "email" text NOT NULL,
        "message" text NOT NULL,
        "sender" text NOT NULL DEFAULT 'visitor',
        "is_escalated" text NOT NULL DEFAULT 'false',
        "created_at" timestamp DEFAULT now()
      );
    `);
    console.log("[Migration] ✅ chat_messages table ready");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "newsletter_subscriptions" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" text NOT NULL UNIQUE,
        "created_at" timestamp DEFAULT now()
      );
    `);
    console.log("[Migration] ✅ newsletter_subscriptions table ready");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "documents" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "visitor_email" text NOT NULL,
        "visitor_name" text NOT NULL,
        "file_name" text NOT NULL,
        "file_type" text NOT NULL,
        "file_path" text NOT NULL,
        "ai_analysis" text,
        "admin_review" text,
        "status" text DEFAULT 'pending',
        "pdf_path" text,
        "visitor_timezone" text,
        "visitor_date_for_filename" text,
        "created_at" timestamp DEFAULT now()
      );
    `);
    console.log("[Migration] ✅ documents table ready");

    // Add fileContent column if it doesn't exist (for Railway compatibility)
    try {
      const columnExists = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'file_content'
      `);
      
      if (!columnExists || columnExists.length === 0) {
        console.log("[Migration] Adding file_content column to documents table...");
        await db.execute(sql`
          ALTER TABLE "documents"
          ADD COLUMN IF NOT EXISTS "file_content" text
        `);
        console.log("[Migration] ✅ file_content column added to documents table");
      } else {
        console.log("[Migration] ✅ file_content column already exists");
      }
    } catch (error: any) {
      if (error.message && error.message.includes("already exists")) {
        console.log("[Migration] ✅ file_content column already exists");
      } else {
        console.error("[Migration] Error checking/adding file_content column:", error);
        throw error;
      }
    }

    // Create indices if they don't exist
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_chat_messages_email" ON "chat_messages"("email");
    `);
    console.log("[Migration] ✅ chat_messages email index ready");

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_documents_email" ON "documents"("visitor_email");
    `);
    console.log("[Migration] ✅ documents email index ready");

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_users_username" ON "users"("username");
    `);
    console.log("[Migration] ✅ users username index ready");

    console.log("[Migration] ✅ All database tables and indices created successfully");
    return true;
  } catch (error) {
    console.error("[Migration] ❌ Error ensuring tables exist:", error);
    throw error;
  }
}
