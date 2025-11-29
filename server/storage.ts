import { type User, type InsertUser, type ContactSubmission, type InsertContactSubmission, type ChatMessage, type InsertChatMessage, type NewsletterSubscription, type InsertNewsletterSubscription, type Document, type InsertDocument, users, chatMessages, documents } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, or } from "drizzle-orm";
import { ensureTablesExist } from "./migrations";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;
  createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission>;
  getAllContactSubmissions(): Promise<ContactSubmission[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getAllChatMessages(): Promise<ChatMessage[]>;
  clearChatMessagesByEmail(email: string): Promise<void>;
  subscribeNewsletter(subscription: InsertNewsletterSubscription): Promise<NewsletterSubscription | null>;
  getAllNewsletterSubscriptions(): Promise<NewsletterSubscription[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  getAllDocuments(): Promise<Document[]>;
  getDocumentsByEmail(email: string): Promise<Document[]>;
  getDocumentById(id: string): Promise<Document | undefined>;
  updateDocumentAnalysis(id: string, analysis: string): Promise<void>;
  updateDocumentStatus(id: string, status: string): Promise<void>;
  updateDocumentPdfPath(id: string, pdfPath: string): Promise<void>;
  deleteDocumentsByEmail(email: string): Promise<void>;
  deleteDocumentById(id: string): Promise<void>;
}

// Initialize database connection - make it optional
let db: any = null;
let dbInitialized = false;

async function initializeDatabase() {
  if (process.env.DATABASE_URL) {
    try {
      db = drizzle(process.env.DATABASE_URL);
      console.log("[DbStorage] ✅ Database connected successfully");
      
      // Ensure all tables exist - critical for Railway deployments with fresh databases
      try {
        await ensureTablesExist(db);
        console.log("[DbStorage] ✅ Database schema verified - User credentials will PERSIST");
        dbInitialized = true;
      } catch (migrationError) {
        console.error("[DbStorage] ❌ Failed to ensure database tables exist:", migrationError);
        console.error("[DbStorage] ⚠️  CRITICAL: Falling back to in-memory storage");
        db = null;
        dbInitialized = false;
      }
    } catch (error) {
      console.error("[DbStorage] ❌ Failed to initialize database:", error);
      console.error("[DbStorage] ⚠️  CRITICAL: Without database, password changes will be LOST on restart!");
    }
  } else {
    console.error("[DbStorage] ❌ CRITICAL: DATABASE_URL environment variable is not set!");
    console.error("[DbStorage] ⚠️  WARNING: Using in-memory storage only - Admin passwords will RESET on every restart!");
  }
}

// Export a promise that resolves when database is ready
export const dbReadyPromise = initializeDatabase().catch(err => {
  console.error("[DbStorage] Failed to initialize database on startup:", err);
});

export class DbStorage implements IStorage {
  private contactSubmissions: Map<string, ContactSubmission>;
  private chatMessages: Map<string, ChatMessage>;
  private newsletterSubscriptions: Set<string>;
  private documents: Map<string, Document>;
  private inMemoryUsers: Map<string, User>; // Fallback storage for users when database isn't available

  constructor() {
    this.contactSubmissions = new Map();
    this.chatMessages = new Map();
    this.newsletterSubscriptions = new Set();
    this.documents = new Map();
    this.inMemoryUsers = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    // Try database first
    if (dbInitialized && db) {
      try {
        const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
        return result[0];
      } catch (error) {
        console.error("[DbStorage] Error getting user by id:", error);
      }
    }
    // Fall back to in-memory storage
    return this.inMemoryUsers.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Try database first
    if (dbInitialized && db) {
      try {
        const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
        return result[0];
      } catch (error) {
        console.error("[DbStorage] Error getting user by username:", error);
      }
    }
    // Fall back to in-memory storage
    for (const user of this.inMemoryUsers.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    
    // Try database first
    if (dbInitialized && db) {
      try {
        await db.insert(users).values(user);
        console.log("[DbStorage] User created in database:", id);
        return user;
      } catch (error) {
        console.error("[DbStorage] Error creating user in database:", error);
        // Fall through to in-memory storage
      }
    }
    
    // Fall back to in-memory storage
    console.log("[DbStorage] Using in-memory storage for user:", id);
    this.inMemoryUsers.set(id, user);
    return user;
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    // Try database first
    if (dbInitialized && db) {
      try {
        await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id));
        console.log("[DbStorage] Password updated in database for user:", id);
        return;
      } catch (error) {
        console.error("[DbStorage] Error updating user password in database:", error);
        // Fall through to in-memory storage
      }
    }
    
    // Fall back to in-memory storage
    const user = this.inMemoryUsers.get(id);
    if (user) {
      user.password = hashedPassword;
      console.log("[DbStorage] Password updated in memory for user:", id);
    }
  }

  async createContactSubmission(insertSubmission: InsertContactSubmission): Promise<ContactSubmission> {
    const id = randomUUID();
    const submission: ContactSubmission = {
      ...insertSubmission,
      referral: insertSubmission.referral ?? null,
      message: insertSubmission.message ?? null,
      id,
      createdAt: new Date(),
    };
    this.contactSubmissions.set(id, submission);
    return submission;
  }

  async getAllContactSubmissions(): Promise<ContactSubmission[]> {
    return Array.from(this.contactSubmissions.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    if (dbInitialized && db) {
      try {
        const result = await db.insert(chatMessages).values(insertMessage).returning();
        return result[0];
      } catch (error) {
        console.error("[DbStorage] Error creating chat message in database:", error);
      }
    }
    // Fallback to in-memory
    const id = randomUUID();
    const message: ChatMessage = {
      ...insertMessage,
      id,
      createdAt: new Date(),
    };
    this.chatMessages.set(id, message);
    return message;
  }

  async getAllChatMessages(): Promise<ChatMessage[]> {
    if (dbInitialized && db) {
      try {
        const result = await db.select().from(chatMessages);
        return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (error) {
        console.error("[DbStorage] Error fetching chat messages from database:", error);
      }
    }
    // Fallback to in-memory
    return Array.from(this.chatMessages.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async clearChatMessagesByEmail(email: string): Promise<void> {
    if (dbInitialized && db) {
      try {
        await db.delete(chatMessages).where(
          or(eq(chatMessages.email, email), eq(chatMessages.email, "support@tncreditsolutions.com"))
        );
        return;
      } catch (error) {
        console.error("[DbStorage] Error clearing chat messages from database:", error);
      }
    }
    // Fallback to in-memory
    const idsToDelete: string[] = [];
    this.chatMessages.forEach((msg, id) => {
      if (msg.email === email || msg.email === "support@tncreditsolutions.com") {
        idsToDelete.push(id);
      }
    });
    idsToDelete.forEach(id => this.chatMessages.delete(id));
  }

  async subscribeNewsletter(insertSubscription: InsertNewsletterSubscription): Promise<NewsletterSubscription | null> {
    if (this.newsletterSubscriptions.has(insertSubscription.email)) {
      return null;
    }
    const id = randomUUID();
    const subscription: NewsletterSubscription = {
      ...insertSubscription,
      id,
      createdAt: new Date(),
    };
    this.newsletterSubscriptions.add(insertSubscription.email);
    return subscription;
  }

  async getAllNewsletterSubscriptions(): Promise<NewsletterSubscription[]> {
    return Array.from(this.newsletterSubscriptions).map((email) => ({
      id: randomUUID(),
      email,
      createdAt: new Date(),
    }));
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    if (dbInitialized && db) {
      try {
        const result = await db.insert(documents).values({
          ...insertDocument,
          visitorTimezone: insertDocument.visitorTimezone || "UTC",
          visitorDateForFilename: insertDocument.visitorDateForFilename || new Date().toISOString().split('T')[0],
        }).returning();
        return result[0];
      } catch (error) {
        console.error("[DbStorage] Error creating document in database:", error);
      }
    }
    // Fallback to in-memory
    const id = randomUUID();
    const document: Document = {
      visitorEmail: insertDocument.visitorEmail,
      visitorName: insertDocument.visitorName,
      fileName: insertDocument.fileName,
      fileType: insertDocument.fileType,
      filePath: insertDocument.filePath,
      id,
      aiAnalysis: null,
      adminReview: null,
      status: "pending",
      pdfPath: null,
      visitorTimezone: insertDocument.visitorTimezone || "UTC",
      visitorDateForFilename: insertDocument.visitorDateForFilename || new Date().toISOString().split('T')[0],
      createdAt: new Date(),
    };
    this.documents.set(id, document);
    return document;
  }

  async getAllDocuments(): Promise<Document[]> {
    if (dbInitialized && db) {
      try {
        const result = await db.select().from(documents);
        return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (error) {
        console.error("[DbStorage] Error fetching documents from database:", error);
      }
    }
    // Fallback to in-memory
    return Array.from(this.documents.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getDocumentsByEmail(email: string): Promise<Document[]> {
    if (dbInitialized && db) {
      try {
        const result = await db.select().from(documents).where(eq(documents.visitorEmail, email));
        return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (error) {
        console.error("[DbStorage] Error fetching documents by email from database:", error);
      }
    }
    // Fallback to in-memory
    return Array.from(this.documents.values())
      .filter(doc => doc.visitorEmail === email)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteDocumentsByEmail(email: string): Promise<void> {
    if (dbInitialized && db) {
      try {
        await db.delete(documents).where(eq(documents.visitorEmail, email));
        return;
      } catch (error) {
        console.error("[DbStorage] Error deleting documents by email from database:", error);
      }
    }
    // Fallback to in-memory
    const idsToDelete: string[] = [];
    this.documents.forEach((doc, id) => {
      if (doc.visitorEmail === email) {
        idsToDelete.push(id);
      }
    });
    idsToDelete.forEach(id => this.documents.delete(id));
  }

  async getDocumentById(id: string): Promise<Document | undefined> {
    if (dbInitialized && db) {
      try {
        const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
        return result[0];
      } catch (error) {
        console.error("[DbStorage] Error fetching document by id from database:", error);
      }
    }
    // Fallback to in-memory
    return this.documents.get(id);
  }

  async updateDocumentAnalysis(id: string, analysis: string): Promise<void> {
    if (dbInitialized && db) {
      try {
        const result = await db.update(documents).set({ aiAnalysis: analysis }).where(eq(documents.id, id));
        console.log("[DbStorage] Document analysis updated in database. ID:", id, "Analysis length:", analysis.length);
        return;
      } catch (error) {
        console.error("[DbStorage] CRITICAL: Error updating document analysis in database:", error);
        console.error("[DbStorage] Update failed for document", id, "- falling back to in-memory");
      }
    }
    // Fallback to in-memory
    const doc = this.documents.get(id);
    if (doc) {
      doc.aiAnalysis = analysis;
      console.log("[DbStorage] Analysis saved to in-memory storage for document:", id);
    }
  }

  async updateDocumentStatus(id: string, status: string): Promise<void> {
    if (dbInitialized && db) {
      try {
        await db.update(documents).set({ status }).where(eq(documents.id, id));
        return;
      } catch (error) {
        console.error("[DbStorage] Error updating document status in database:", error);
      }
    }
    // Fallback to in-memory
    const doc = this.documents.get(id);
    if (doc) {
      doc.status = status;
    }
  }

  async deleteDocumentById(id: string): Promise<void> {
    if (dbInitialized && db) {
      try {
        await db.delete(documents).where(eq(documents.id, id));
        return;
      } catch (error) {
        console.error("[DbStorage] Error deleting document by id from database:", error);
      }
    }
    // Fallback to in-memory
    this.documents.delete(id);
  }

  async updateDocumentPdfPath(id: string, pdfPath: string): Promise<void> {
    if (dbInitialized && db) {
      try {
        const result = await db.update(documents).set({ pdfPath }).where(eq(documents.id, id));
        console.log("[DbStorage] Document PDF path updated in database. ID:", id, "PDF:", pdfPath);
        return;
      } catch (error) {
        console.error("[DbStorage] CRITICAL: Error updating document pdf path in database:", error);
        console.error("[DbStorage] PDF update failed for document", id, "- falling back to in-memory");
      }
    }
    // Fallback to in-memory
    const doc = this.documents.get(id);
    if (doc) {
      doc.pdfPath = pdfPath;
      console.log("[DbStorage] PDF path saved to in-memory storage for document:", id);
    }
  }
}

export const storage = new DbStorage();
