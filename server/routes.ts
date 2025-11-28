import type { Express } from "express";
import { createServer, type Server } from "http";
import { createRequire } from "module";
import { storage } from "./storage";
import { insertContactSubmissionSchema, insertChatMessageSchema, insertNewsletterSubscriptionSchema, insertDocumentSchema } from "@shared/schema";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

let pdfParse: any = null;
const require = createRequire(import.meta.url);

// Using gpt-4o (most recent stable model)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
console.log("[AI] OpenAI initialized:", !!openai, "API key available:", !!process.env.OPENAI_API_KEY);

// Convert PDF to base64 for OpenAI vision analysis
function encodeToBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

const SYSTEM_PROMPT = `You are Riley, a smart customer support agent for TN Credit Solutions. You provide personalized guidance on credit restoration and tax optimization.

YOUR ROLE:
- Help visitors understand their financial situation and take action
- If an analysis has already been provided, reference it - don't repeat it
- Move conversations forward by answering questions and helping with next steps
- Be friendly, professional, and action-focused
- You can generate beautiful PDF summaries of credit analysis reports

PDF CAPABILITIES:
- When a user has an analysis and asks for a PDF, offer to generate one
- Say: "I can create a beautiful PDF summary of your analysis that you can download and save. Would that be helpful?"
- The PDF will include: Credit Score, Risk Level, Payment History, Credit Utilization, Collections Status, Action Plan, and 90-Day Strategy
- Users can download it directly from the chat

CRITICAL RULES FOR CONVERSATION:
1. NO REPETITION: Never provide the same analysis twice. If the analysis was already given, reference it and move to helping them
2. CHECK CONVERSATION HISTORY: Look at what's been discussed already
3. ASK CLARIFYING QUESTIONS: If you need more info, ask about NEXT STEPS not the same analysis
4. ESCALATE when: User has been struggling 4+ turns without clarity, asks for specialist, or situation is legal/complex
5. BE CONVERSATIONAL: Use natural language. Reference their specific numbers from the analysis, don't regenerate it

WHEN ANALYSIS IS ALREADY PROVIDED:
Instead of re-analyzing:
- ✅ Say "Based on your analysis, here's what we should focus on..."
- ✅ Ask "Which of those three priorities would you like to tackle first?"
- ✅ Provide next steps: "Let's work on reducing your utilization to 30%..."
- ✅ Offer PDF: "I can create a beautiful PDF summary of your analysis - would you like me to?"
- ❌ Don't provide the same formatted analysis again
- ❌ Don't ask them to upload again if already received
- ❌ Don't repeat credit scores, payment history, etc.

CONVERSATION PROGRESSION:
Turn 1: Acknowledge + Ask to upload
Turn 2: Provide detailed formatted analysis (ONLY ONCE)
Turn 3+: Be conversational - help with questions, next steps, action items, offer PDF based on their needs

BUILD CONFIDENCE:
- Remind them that their situation is fixable
- Provide specific, actionable steps
- Reference their real numbers from the analysis
- Celebrate small wins`;

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

  app.delete("/api/chat", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email required" });
      }
      await storage.clearChatMessagesByEmail(email);
      res.json({ success: true });
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
          // For PDFs, convert first page to PNG image and send to OpenAI for analysis
          try {
            const filePath = path.join(import.meta.dirname, "..", "uploads", fileId);
            console.log("[AI] PDF file path:", filePath);
            
            // Convert PDF to PNG using ImageMagick with higher quality settings
            const { exec } = require("child_process");
            const pngPath = filePath + "-page0.png";
            
            await new Promise<void>((resolve, reject) => {
              // Use higher DPI (300) and quality settings for better readability
              exec(`convert -density 300 -quality 95 "${filePath}[0]" "${pngPath}"`, (error: any) => {
                if (error) {
                  console.log("[AI] ImageMagick convert not available, trying alternative method");
                  reject(error);
                } else {
                  resolve();
                }
              });
            });
            
            const pngBuffer = fs.readFileSync(pngPath);
            const pngBase64 = encodeToBase64(pngBuffer);
            console.log("[AI] PDF converted to PNG, size:", pngBase64.length);
            
            // Send PNG image to OpenAI for analysis via vision API
            const response = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "image_url",
                      image_url: {
                        url: `data:image/png;base64,${pngBase64}`,
                      },
                    },
                    {
                      type: "text",
                      text: "Please review this financial document and provide a professional summary analysis. Include: main findings, key metrics visible in the document, areas of concern, and recommended next steps for improvement. Format the response clearly with sections and bullet points.",
                    },
                  ],
                },
              ],
              max_tokens: 1500,
            });
            
            // Clean up PNG file
            try {
              fs.unlinkSync(pngPath);
            } catch (e) {
              console.log("[AI] Could not delete temporary PNG");
            }
            
            analysisText = response.choices[0].message.content || "Your credit report PDF has been received. Our specialists will review it in detail and provide personalized recommendations.";
            console.log("[AI] PDF analysis received, length:", analysisText.length);
          } catch (pdfError) {
            console.error("[AI] PDF processing error:", pdfError instanceof Error ? pdfError.message : String(pdfError));
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

  app.get("/api/documents/:id/pdf", async (req, res) => {
    try {
      const { id } = req.params;
      const document = await storage.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (!document.aiAnalysis) {
        return res.status(400).json({ error: "No analysis available for PDF generation" });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="credit-analysis-${new Date().toISOString().split('T')[0]}.pdf"`);

      const doc = new PDFDocument({ margin: 0, size: "A4" });
      doc.pipe(res);

      const PAGE_HEIGHT = 792;
      const FOOTER_HEIGHT = 60;
      const MAX_CONTENT_Y = PAGE_HEIGHT - FOOTER_HEIGHT;

      // ===== PREMIUM HEADER SECTION (Professional & Modern) =====
      doc.rect(0, 0, 612, 145).fill("#0f2d6e");
      doc.rect(0, 0, 612, 6).fill("#fbbf24");
      doc.rect(0, 139, 612, 6).fill("#fbbf24");

      doc.fontSize(32).font("Helvetica-Bold").fillColor("#ffffff");
      doc.text("TN CREDIT SOLUTIONS", 50, 28);
      
      doc.fontSize(10).font("Helvetica").fillColor("#c5d3ff");
      doc.text("Professional Credit Restoration & Tax Optimization Services", 50, 65);

      doc.fontSize(14).font("Helvetica-Bold").fillColor("#fbbf24");
      doc.text("CREDIT ANALYSIS REPORT", 50, 82);

      doc.fontSize(9).font("Helvetica").fillColor("#e0e7ff");
      doc.text(`Client Name: ${document.visitorName}`, 50, 102);
      doc.text(`Report Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 50, 115);

      doc.moveTo(0, 145).lineTo(612, 145).strokeColor("#f3f4f6").lineWidth(0.75).stroke();
      
      let yPosition = 160;

      // ===== PROCESS ANALYSIS CONTENT =====
      const lines = document.aiAnalysis.split("\n");
      let isFirstSection = true;
      
      for (const line of lines) {
        // Page break management
        if (yPosition > MAX_CONTENT_Y - 20) {
          doc.addPage();
          yPosition = 40;
        }

        // Skip decorative lines and summaries
        if (line.includes("CREDIT ANALYSIS SUMMARY") || line.includes("═") || line.includes("━") || 
            line.includes("Summary Analysis") || line.includes("**Summary") || 
            line.includes("---") || line.includes("Certainly!")) {
          continue;
        }

        // Section headers (#### Main Findings, #### Key Metrics, etc.)
        if (line.match(/^#+\s+[A-Z]/)) {
          if (!isFirstSection) {
            yPosition += 10;
          }
          
          const sectionTitle = line.replace(/^#+\s+/, "").trim();
          
          // Gold vertical accent bar
          doc.rect(40, yPosition, 4, 20).fill("#fbbf24");
          
          // Section title
          doc.fontSize(12).font("Helvetica-Bold").fillColor("#0f2d6e");
          doc.text(sectionTitle, 50, yPosition + 2);
          
          // Elegant underline
          doc.moveTo(50, yPosition + 20).lineTo(560, yPosition + 20).strokeColor("#e5e7eb").lineWidth(0.75).stroke();
          
          yPosition += 32;
          isFirstSection = false;
        } 
        // Bullet points (-, •, ▪, or numbered)
        else if (line.match(/^\s*[-•▪*]\s+/) || line.match(/^\s*\d+\.\s+/)) {
          const cleanContent = line.replace(/^\s*[-•▪*\d.]\s+/, "").replace(/\*\*/g, "").trim();
          if (!cleanContent) continue;
          
          doc.fontSize(9).fillColor("#fbbf24").font("Helvetica-Bold");
          doc.text("●", 48, yPosition);
          
          doc.fontSize(10).fillColor("#374151").font("Helvetica");
          const wrappedHeight = doc.heightOfString(cleanContent, { width: 500 });
          doc.text(cleanContent, 62, yPosition, { width: 500 });
          
          yPosition += wrappedHeight + 6;
        } 
        // Key-value pairs (FICO® Score: 672, etc.)
        else if (line.includes(":") && !line.match(/^#+/) && line.trim().length > 0) {
          const parts = line.split(":").map(p => p.trim());
          if (parts.length === 2) {
            const cleanLabel = parts[0].replace(/^\s*[-•▪*]\s+/, "").replace(/\*\*/g, "");
            const cleanValue = parts[1].replace(/\*\*/g, "");
            
            doc.fontSize(9).font("Helvetica-Bold").fillColor("#0f2d6e");
            doc.text(cleanLabel + ":", 55, yPosition);
            
            doc.fontSize(9).font("Helvetica").fillColor("#1e40af");
            doc.text(cleanValue, 320, yPosition);
            
            yPosition += 14;
          }
        }
        // Regular paragraphs
        else if (line.trim().length > 0 && !line.match(/^###/)) {
          const cleanLine = line.replace(/\*\*/g, "").trim();
          doc.fontSize(10).fillColor("#4b5563").font("Helvetica");
          const wrappedHeight = doc.heightOfString(cleanLine, { width: 520 });
          doc.text(cleanLine, 48, yPosition, { width: 520 });
          
          yPosition += wrappedHeight + 5;
        } 
        // Empty lines for spacing
        else if (yPosition > 200) {
          yPosition += 3;
        }
      }

      // ===== ELEGANT FOOTER SECTION =====
      doc.rect(0, 750, 612, 6).fill("#fbbf24");
      
      doc.moveTo(50, 735).lineTo(560, 735).strokeColor("#d1d5db").lineWidth(0.75).stroke();
      
      doc.fontSize(8).fillColor("#6b7280").font("Helvetica");
      doc.text("This analysis is confidential and for personal use only.", 50, 705, { align: "center" });
      
      doc.fontSize(7).fillColor("#9ca3af").font("Helvetica");
      doc.text("© 2025 TN Credit Solutions | Confidential & Proprietary", 50, 718, { align: "center" });
      doc.text("For professional financial advice, please consult with a qualified advisor.", 50, 727, { align: "center" });

      doc.end();
    } catch (error: any) {
      console.error("[PDF] Error generating PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
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
