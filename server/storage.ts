import { type User, type InsertUser, type ContactSubmission, type InsertContactSubmission, type ChatMessage, type InsertChatMessage, type NewsletterSubscription, type InsertNewsletterSubscription, type Document, type InsertDocument, users } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";

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

// Initialize database connection
const db = drizzle(process.env.DATABASE_URL || "");

export class DbStorage implements IStorage {
  private contactSubmissions: Map<string, ContactSubmission>;
  private chatMessages: Map<string, ChatMessage>;
  private newsletterSubscriptions: Set<string>;
  private documents: Map<string, Document>;

  constructor() {
    this.contactSubmissions = new Map();
    this.chatMessages = new Map();
    this.newsletterSubscriptions = new Set();
    this.documents = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error("[DbStorage] Error getting user by id:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
      return result[0];
    } catch (error) {
      console.error("[DbStorage] Error getting user by username:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const id = randomUUID();
      const user: User = { ...insertUser, id };
      await db.insert(users).values(user);
      return user;
    } catch (error) {
      console.error("[DbStorage] Error creating user:", error);
      throw error;
    }
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    try {
      await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id));
    } catch (error) {
      console.error("[DbStorage] Error updating user password:", error);
      throw error;
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
    return Array.from(this.chatMessages.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async clearChatMessagesByEmail(email: string): Promise<void> {
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
    return Array.from(this.documents.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getDocumentsByEmail(email: string): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter(doc => doc.visitorEmail === email)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteDocumentsByEmail(email: string): Promise<void> {
    const idsToDelete: string[] = [];
    this.documents.forEach((doc, id) => {
      if (doc.visitorEmail === email) {
        idsToDelete.push(id);
      }
    });
    idsToDelete.forEach(id => this.documents.delete(id));
  }

  async getDocumentById(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async updateDocumentAnalysis(id: string, analysis: string): Promise<void> {
    const doc = this.documents.get(id);
    if (doc) {
      doc.aiAnalysis = analysis;
    }
  }

  async updateDocumentStatus(id: string, status: string): Promise<void> {
    const doc = this.documents.get(id);
    if (doc) {
      doc.status = status;
    }
  }

  async deleteDocumentById(id: string): Promise<void> {
    this.documents.delete(id);
  }

  async updateDocumentPdfPath(id: string, pdfPath: string): Promise<void> {
    const doc = this.documents.get(id);
    if (doc) {
      doc.pdfPath = pdfPath;
    }
  }
}

export const storage = new DbStorage();
