import { type User, type InsertUser, type ContactSubmission, type InsertContactSubmission, type ChatMessage, type InsertChatMessage, type NewsletterSubscription, type InsertNewsletterSubscription } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission>;
  getAllContactSubmissions(): Promise<ContactSubmission[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getAllChatMessages(): Promise<ChatMessage[]>;
  createNewsletterSubscription(email: InsertNewsletterSubscription): Promise<NewsletterSubscription>;
  getAllNewsletterSubscriptions(): Promise<NewsletterSubscription[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private contactSubmissions: Map<string, ContactSubmission>;
  private chatMessages: Map<string, ChatMessage>;
  private newsletterSubscriptions: Map<string, NewsletterSubscription>;

  constructor() {
    this.users = new Map();
    this.contactSubmissions = new Map();
    this.chatMessages = new Map();
    this.newsletterSubscriptions = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const chatMessage: ChatMessage = {
      ...message,
      id,
      createdAt: new Date(),
    };
    this.chatMessages.set(id, chatMessage);
    return chatMessage;
  }

  async getAllChatMessages(): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async createNewsletterSubscription(insertSubscription: InsertNewsletterSubscription): Promise<NewsletterSubscription> {
    const id = randomUUID();
    const subscription: NewsletterSubscription = {
      ...insertSubscription,
      id,
      createdAt: new Date(),
    };
    this.newsletterSubscriptions.set(id, subscription);
    return subscription;
  }

  async getAllNewsletterSubscriptions(): Promise<NewsletterSubscription[]> {
    return Array.from(this.newsletterSubscriptions.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }
}

export const storage = new MemStorage();
