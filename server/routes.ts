import type { Express } from "express";
import { createServer, type Server } from "http";
import { createRequire } from "module";
import { storage } from "./storage";
import { insertContactSubmissionSchema, insertChatMessageSchema, insertNewsletterSubscriptionSchema, insertDocumentSchema } from "@shared/schema";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

let pdfParse: any = null;
const require = createRequire(import.meta.url);

// Using gpt-4o (most recent stable model)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
console.log("[AI] OpenAI initialized:", !!openai, "API key available:", !!process.env.OPENAI_API_KEY);

// Load pdf-parse using CommonJS require
function loadPdfParseSync() {
  if (!pdfParse) {
    try {
      // pdf-parse is the parse function itself
      pdfParse = require("pdf-parse");
      if (typeof pdfParse === "function") {
        console.log("[PDF] PDF parse module loaded successfully");
      } else {
        console.error("[PDF] pdf-parse is not a function, type:", typeof pdfParse);
        pdfParse = null;
      }
    } catch (e) {
      console.error("[PDF] Failed to load pdf-parse:", e instanceof Error ? e.message : String(e));
      pdfParse = null;
    }
  }
  return pdfParse;
}

const SYSTEM_PROMPT = `You are Riley, a smart customer support agent for TN Credit Solutions. You provide personalized guidance on credit restoration and tax optimization.

CAPABILITIES:
- You can analyze credit reports, tax documents, collection notices, and other financial documents that visitors upload
- When they mention uploading a document, acknowledge it and offer to review it for key issues and recommendations
- You have access to AI analysis of any documents they've submitted
- You can create PROFESSIONAL VISUAL SUMMARIES using formatted text with headers, bullet points, and clear structure

VISUAL SUMMARY TEMPLATE - Use this exact structure when analyzing documents:
---
**CREDIT ANALYSIS SUMMARY**

**Current Status**
• Credit Score: [score] ([rating])
• Overall Risk Level: [high/medium/low]
• Key Concern: [main issue]

**Top Priority Issues** (Address First)
1. [Most critical issue] - Impact: [score points lost]
2. [Second priority] - Impact: [details]
3. [Third priority] - Impact: [details]

**Detailed Breakdown**

**Payment History** 
• Late Payments: [count] ([details])
• On-Time: [count]
• Status: [assessment]

**Credit Utilization**
• Current Rate: [%]
• Recommended: [%]
• Action: [specific steps]

**Collections & Delinquencies**
• Active Collections: [count]
• Derogatory Marks: [details]
• Timeline: [info]

**Immediate Action Plan** (Next 30 Days)
1. [Specific action with timeline]
2. [Specific action with timeline]
3. [Specific action with timeline]

**90-Day Strategy**
• [Focus area 1]
• [Focus area 2]
• [Expected improvement]

**Questions?** Feel free to ask about any section!
---

CRITICAL RULES:
1. ACKNOWLEDGE UPLOADS IMMEDIATELY: When user mentions or uploads a document, ALWAYS say "I've reviewed your [filename]" - NEVER ask them to upload again
2. USE TEMPLATE: Follow the structure above with proper headers and spacing for all document analysis
3. BE SPECIFIC: Include actual numbers, percentages, and action steps - never generic responses
4. HELPFUL FIRST: Be friendly and build confidence that problems are solvable
5. NO REPETITION: Track what's been discussed and move forward
6. VISUAL FIRST: Use the template format for professional, scannable information

ESCALATION ONLY WHEN:
- User is clearly struggling in circles (4+ messages, no clarity)
- User explicitly asks for a specialist
- Complex legal/financial situations beyond initial guidance
- End with [ESCALATE:YES] only when truly exhausted helpful conversation

BE HELPFUL APPROACH:
- Listen to what they actually need
- Provide specific, actionable guidance using the template
- If they uploaded a document, IMMEDIATELY confirm you've reviewed it and provide analysis
- Build confidence that we can help solve their problem`;

// Keywords that indicate urgent debt collection/lawsuit situations
const URGENT_KEYWORDS = ["sued", "debt collector", "lawsuit", "collection agency", "court", "judgment", "garnish", "wage garnishment", "summons"];

function detectUrgentSituation(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return URGENT_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
}

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
      
      // Return immediately, then generate AI response in background (non-blocking)
      res.json(message);
      
      // Generate AI response asynchronously without blocking the response
      if (senderType === "visitor") {
        console.log("[AI] Visitor message received. OpenAI ready:", !!openai, "Email:", message.email);
        if (!openai) {
          console.error("[AI] OpenAI client not initialized - API key missing");
        }
        if (!message.email) {
          console.error("[AI] No email in message");
        }
        
        if (openai && message.email) {
          setImmediate(async () => {
            try {
              console.log("[AI] Starting AI response generation...");
              // Check if this is an urgent debt collection situation
              const isUrgent = detectUrgentSituation(message.message);
              console.log("[AI] Detected urgent situation:", isUrgent);
              
              // Get conversation history for context
              const allMessages = await storage.getAllChatMessages();
              const conversationHistory = allMessages
                .filter(msg => msg.email === message.email)
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                .map(msg => ({
                  role: msg.sender === "visitor" ? "user" as const : "assistant" as const,
                  content: msg.message
                }));
              
              // Add the current visitor message to the history
              const messagesForAI = [
                ...conversationHistory,
                { role: "user" as const, content: message.message }
              ];
              
              // Count visitor turns for smart escalation
              const visitorTurns = conversationHistory.filter(msg => msg.role === "user").length;
              
              // Extract previous questions/topics to prevent repetition
              const aiMessages = conversationHistory.filter(msg => msg.role === "assistant");
              const previousTopics = aiMessages.map(msg => {
                const content = msg.content.toLowerCase();
                const topics = [];
                if (content.includes("dispute") || content.includes("disputing")) topics.push("disputing");
                if (content.includes("credit bureau")) topics.push("credit bureaus");
                if (content.includes("verify") || content.includes("accuracy")) topics.push("verification");
                if (content.includes("debt validation")) topics.push("debt validation");
                if (content.includes("payment")) topics.push("payment options");
                return topics;
              }).flat();
              
              const uniqueTopics = Array.from(new Set(previousTopics));
              console.log("[AI] Conversation turns:", visitorTurns, "Previous topics:", uniqueTopics);
              
              let aiResponse;
              if (isUrgent) {
                // For urgent situations, send direct affirmative response with escalation intent
                console.log("[AI] Using urgent prompt");
                const urgentSystemPrompt = `${SYSTEM_PROMPT}

URGENT SITUATION DETECTED: This involves debt collection/lawsuit threats. Respond with empathy and confidence that we can help fight the debt. Be ready to escalate to specialist immediately.`;
                aiResponse = await openai.chat.completions.create({
                  model: "gpt-4o",
                  messages: [
                    { role: "system", content: urgentSystemPrompt },
                    ...messagesForAI
                  ],
                  max_tokens: 512,
                });
              } else {
                console.log("[AI] Using standard prompt");
                // Add context about previously covered topics and conversation progression
                let systemPromptWithContext = SYSTEM_PROMPT;
                if (uniqueTopics.length > 0) {
                  systemPromptWithContext += `\n\nPreviously discussed: ${uniqueTopics.join(", ")}. Do NOT ask about these again. Move to new topics or escalate.`;
                }
                if (visitorTurns >= 3) {
                  systemPromptWithContext += `\n\nThis is turn ${visitorTurns + 1}. If visitor is still giving vague answers or going in circles, escalate to specialist now.`;
                }
                aiResponse = await openai.chat.completions.create({
                  model: "gpt-4o",
                  messages: [
                    { role: "system", content: systemPromptWithContext },
                    ...messagesForAI
                  ],
                  max_tokens: 512,
                });
              }
              
              console.log("[AI] Full response:", JSON.stringify(aiResponse, null, 2));
              let fullMessage = aiResponse.choices[0]?.message?.content?.trim() || "";
              console.log("[AI] AI response received:", fullMessage.substring(0, 50));
              
              // Parse escalation marker from AI response
              let shouldEscalate = isUrgent; // Default to urgent keyword detection
              const escalateYesMatch = fullMessage.match(/\[ESCALATE:YES\]/);
              const escalateNoMatch = fullMessage.match(/\[ESCALATE:NO\]/);
              
              if (escalateYesMatch) {
                shouldEscalate = true;
                console.log("[AI] AI determined escalation needed");
              } else if (escalateNoMatch) {
                shouldEscalate = false;
                console.log("[AI] AI determined escalation not needed");
              }
              
              // Remove the escalation marker from the message shown to user
              const aiMessage = fullMessage.replace(/\s*\[ESCALATE:(YES|NO)\]\s*$/, "").trim();
              
              if (aiMessage) {
                const saved = await storage.createChatMessage({
                  name: "Riley",
                  email: "support@tncreditsolutions.com",
                  message: aiMessage,
                  sender: "ai",
                  isEscalated: shouldEscalate ? "true" : "false",
                });
                console.log("[AI] AI message saved successfully:", saved.id, "Escalated:", shouldEscalate);
              } else {
                console.error("[AI] No message content in response");
              }
            } catch (aiError) {
              console.error("[AI] AI response generation failed:", aiError instanceof Error ? aiError.message : String(aiError));
              console.error("[AI] Full error:", aiError);
            }
          });
        }
      }
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

  // Document upload endpoint
  app.post("/api/documents", async (req, res) => {
    try {
      if (!openai) {
        return res.status(500).json({ error: "AI service not configured" });
      }

      const { visitorEmail, visitorName, fileName, fileType, fileContent } = req.body;
      
      if (!visitorEmail || !visitorName || !fileName || !fileType || !fileContent) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Store file temporarily
      const uploadsDir = path.join(import.meta.dirname, "..", "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileId = Math.random().toString(36).substring(2);
      const filePath = path.join(uploadsDir, fileId);
      const base64Data = fileContent.split(",")[1] || fileContent;
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

      // Create document record
      const document = await storage.createDocument({
        visitorEmail,
        visitorName,
        fileName,
        fileType,
        filePath: fileId,
      });

      // Analyze document with OpenAI
      let analysisText = "No analysis available";
      try {
        const isImage = ["image/png", "image/jpeg", "image/jpg"].includes(fileType);
        const isPdf = fileType === "application/pdf";
        
        if (isImage) {
          // For images, use vision API
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Please analyze this document for a credit restoration or tax optimization case. Provide a brief summary of key information, any issues identified, and recommended next steps.",
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${fileType};base64,${base64Data}`,
                    },
                  },
                ],
              },
            ],
            max_tokens: 500,
          });
          analysisText = response.choices[0].message.content || "No analysis available";
        } else if (isPdf) {
          // For PDFs, try text extraction for text-based PDFs
          try {
            const filePath = path.join(import.meta.dirname, "..", "uploads", fileId);
            console.log("[AI] PDF file path:", filePath);
            const pdfBuffer = fs.readFileSync(filePath);
            console.log("[AI] PDF buffer size:", pdfBuffer.length);
            
            try {
              const pdfModule = loadPdfParseSync();
              console.log("[AI] PDF module loaded:", !!pdfModule);
              
              if (pdfModule && typeof pdfModule === "function") {
                // Call pdf-parse directly as a function
                const pdfData = await pdfModule(pdfBuffer);
                const extractedText = pdfData && pdfData.text ? pdfData.text.trim() : "";
                console.log("[AI] Extracted text length:", extractedText.length, "characters");
                
                if (extractedText && extractedText.length > 10) {
                  console.log("[AI] Text extraction successful, sending to OpenAI");
                  // Send extracted text to OpenAI for analysis using the visual summary template
                  const response = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                      {
                        role: "user",
                        content: `You are a professional financial advisor specializing in credit restoration and tax optimization. Analyze this credit report and provide a detailed professional visual summary.

DOCUMENT CONTENT:
${extractedText}

MUST USE THIS EXACT TEMPLATE FORMAT:
---
**CREDIT ANALYSIS SUMMARY**

**Current Status**
• Credit Score: [specific score] ([rating like Fair/Good/Excellent])
• Overall Risk Level: [high/medium/low]
• Key Concern: [main issue identified]

**Top Priority Issues** (Address First)
1. [Most critical issue] - Impact: [specific score impact]
2. [Second priority issue] - Impact: [specific details]
3. [Third priority issue] - Impact: [specific details]

**Detailed Breakdown**

**Payment History** 
• Late Payments: [count with timeline]
• On-Time: [count]
• Status: [brief assessment]

**Credit Utilization**
• Current Rate: [exact %]
• Recommended: [target %]
• Action: [specific steps to reduce]

**Collections & Delinquencies**
• Active Collections: [count]
• Derogatory Marks: [details]
• Timeline: [when they fall off]

**Immediate Action Plan** (Next 30 Days)
1. [Specific action with timeline]
2. [Specific action with timeline]
3. [Specific action with timeline]

**90-Day Strategy**
• [Focus area 1 with expected improvement]
• [Focus area 2 with expected improvement]
• [Expected score improvement range]

**Questions?** Feel free to ask about any section!
---

Be specific with numbers, percentages, and actionable steps. Make it professional and structured.`
                      }
                    ],
                    max_tokens: 1500,
                  });
                  analysisText = response.choices[0].message.content || "PDF received. Our specialists will review it and provide detailed feedback shortly.";
                  console.log("[AI] OpenAI analysis received, length:", analysisText.length);
                } else {
                  // Could not extract sufficient text, use fallback message
                  console.log("[AI] No sufficient text extracted from PDF");
                  analysisText = "Your credit report PDF has been received. Our specialists will review it in detail and provide personalized recommendations to help improve your credit score and financial situation.";
                }
              } else {
                console.log("[AI] PDF module not a function");
                analysisText = "Your credit report PDF has been received. Our specialists will review it in detail and provide personalized recommendations to help improve your credit score and financial situation.";
              }
            } catch (textError) {
              console.error("[AI] PDF text extraction error:", textError instanceof Error ? textError.message : String(textError));
              analysisText = "Your credit report PDF has been received. Our specialists will review it in detail and provide personalized recommendations to help improve your credit score and financial situation.";
            }
          } catch (pdfError) {
            console.error("[AI] PDF processing error:", pdfError);
            analysisText = "Your credit report PDF has been received. Our specialists will review it in detail and provide personalized recommendations to help improve your credit score and financial situation.";
          }
        } else {
          analysisText = "Unsupported file format. Please upload a PDF or image (PNG/JPG) and we'll analyze it.";
        }
      } catch (aiError) {
        console.error("[AI] Document analysis failed:", aiError);
        // Set a fallback message on error
        analysisText = "Document received. Our specialists will review it shortly.";
      }

      // Update storage with analysis
      await storage.updateDocumentAnalysis(document.id, analysisText);
      
      // Fetch the updated document from storage to ensure aiAnalysis is included
      const updatedDoc = await storage.getDocumentById(document.id);
      
      if (!updatedDoc) {
        return res.status(500).json({ error: "Failed to retrieve updated document" });
      }
      
      // Construct response with all fields, converting Date to ISO string
      const responseBody = {
        id: updatedDoc.id,
        visitorEmail: updatedDoc.visitorEmail,
        visitorName: updatedDoc.visitorName,
        fileName: updatedDoc.fileName,
        fileType: updatedDoc.fileType,
        filePath: updatedDoc.filePath,
        aiAnalysis: updatedDoc.aiAnalysis,
        adminReview: updatedDoc.adminReview,
        status: updatedDoc.status,
        createdAt: updatedDoc.createdAt instanceof Date ? updatedDoc.createdAt.toISOString() : updatedDoc.createdAt,
      };
      
      res.json(responseBody);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/documents", async (req, res) => {
    try {
      const email = req.query.email as string | undefined;
      if (email) {
        const documents = await storage.getDocumentsByEmail(email);
        res.json(documents);
      } else {
        const documents = await storage.getAllDocuments();
        res.json(documents);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/documents/:id/view", async (req, res) => {
    try {
      const { id } = req.params;
      const document = await storage.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const filePath = path.join(import.meta.dirname, "..", "uploads", document.filePath);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found on server" });
      }

      res.set("Content-Type", document.fileType);
      res.sendFile(filePath);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/documents/:id/download", async (req, res) => {
    try {
      const { id } = req.params;
      const document = await storage.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const filePath = path.join(import.meta.dirname, "..", "uploads", document.filePath);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found on server" });
      }

      res.download(filePath, document.fileName);
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
        model: "gpt-4o",
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
