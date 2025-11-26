import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactSubmissionSchema, insertChatMessageSchema, insertNewsletterSubscriptionSchema } from "@shared/schema";
import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const SYSTEM_PROMPT = `You are a helpful customer support agent for TN Credit Solutions. You assist with questions about:
- Credit restoration and credit repair services
- Tax optimization services
- General inquiries about our services

Keep responses concise (2-3 sentences max). Be professional and friendly. 

IMPORTANT: If and ONLY if the question is complex, requires personal consultation, involves sensitive personal information, or is outside your scope, end your response with "[ESCALATION_NEEDED]" on a new line. Otherwise, do NOT include this marker.

Examples of when to include [ESCALATION_NEEDED]:
- Requests for specific financial advice or personal assessment
- Questions about legal matters or contracts
- Complaints or urgent issues requiring immediate attention
- Requests for pricing or custom service information
- Account-specific inquiries

Do NOT include [ESCALATION_NEEDED] for general informational questions you can answer.`;

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/contact", async (req, res) => {
    try {
      const validatedData = insertContactSubmissionSchema.parse(req.body);
      const submission = await storage.createContactSubmission(validatedData);
      res.json(submission);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/contact", async (req, res) => {
    try {
      const submissions = await storage.getAllContactSubmissions();
      res.json(submissions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { sender, ...data } = req.body;
      const validatedData = insertChatMessageSchema.parse(data);
      const senderType = sender || "visitor";
      const message = await storage.createChatMessage({
        ...validatedData,
        sender: senderType,
      });
      
      // If visitor sent a message and AI is configured, generate AI response
      if (senderType === "visitor" && openai && message.email) {
        try {
          const aiResponse = await openai.chat.completions.create({
            model: "gpt-5",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: message.message }
            ],
            max_completion_tokens: 512,
          });
          
          const aiMessage = aiResponse.choices[0].message.content?.trim() || "";
          if (aiMessage) {
            await storage.createChatMessage({
              name: "TN Credit Solutions Support",
              email: "support@tncreditsolutions.com",
              message: aiMessage,
              sender: "ai",
              isEscalated: "false",
            });
          }
        } catch (aiError) {
          console.error("AI response generation failed:", aiError);
        }
      }
      
      res.json(message);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/chat", async (req, res) => {
    try {
      const messages = await storage.getAllChatMessages();
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/newsletter", async (req, res) => {
    try {
      const validatedData = insertNewsletterSubscriptionSchema.parse(req.body);
      const subscription = await storage.subscribeNewsletter(validatedData);
      if (!subscription) {
        return res.status(400).json({ error: "Email already subscribed" });
      }
      res.json(subscription);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/newsletter", async (req, res) => {
    try {
      const subscriptions = await storage.getAllNewsletterSubscriptions();
      res.json(subscriptions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI chat response endpoint
  app.post("/api/chat/ai-response", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || !openai) {
        return res.status(400).json({ error: "AI service not configured" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message }
        ],
        max_completion_tokens: 512,
      });

      const aiMessage = response.choices[0].message.content || "";
      res.json({ response: aiMessage });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
