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

      // Color scheme matching website design
      const PRIMARY_BLUE = "#2c5aa0"; // HSL 217 91% 45% converted to hex
      const LIGHT_BG = "#f8f9fc";
      const TEXT_DARK = "#1a1f35";
      const TEXT_LIGHT = "#6b7280";
      const ACCENT_GRAY = "#e5e7eb";
      const CARD_BG = "#ffffff";

      const PAGE_WIDTH = 612;
      const PAGE_HEIGHT = 792;
      const MARGIN = 40;
      const FOOTER_HEIGHT = 50;
      const MAX_CONTENT_Y = PAGE_HEIGHT - FOOTER_HEIGHT - MARGIN;

      // ===== ELEGANT HEADER SECTION =====
      doc.rect(0, 0, PAGE_WIDTH, 120).fill(LIGHT_BG);
      doc.rect(0, 0, PAGE_WIDTH, 4).fill(PRIMARY_BLUE);
      
      doc.fontSize(28).font("Helvetica-Bold").fillColor(PRIMARY_BLUE);
      doc.text("CREDIT ANALYSIS REPORT", MARGIN, 20);
      
      doc.fontSize(10).font("Helvetica").fillColor(TEXT_LIGHT);
      doc.text("TN Credit Solutions • Professional Financial Analysis", MARGIN, 52);
      
      doc.fontSize(9).font("Helvetica").fillColor(TEXT_DARK);
      doc.text(`Client: ${document.visitorName}`, MARGIN, 70);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, MARGIN, 85);
      
      // Subtle divider
      doc.moveTo(MARGIN, 110).lineTo(PAGE_WIDTH - MARGIN, 110).strokeColor(ACCENT_GRAY).lineWidth(1).stroke();
      
      let yPosition = 130;

      // Parse and intelligently format the analysis
      const analysisText = document.aiAnalysis;
      
      // Extract sections
      const mainFindingsMatch = analysisText.match(/#### Main Findings([\s\S]*?)(?=#### |$)/);
      const keyMetricsMatch = analysisText.match(/#### Key Metrics([\s\S]*?)(?=#### |$)/);
      const areasOfConcernMatch = analysisText.match(/#### Areas of Concern([\s\S]*?)(?=#### |$)/);
      const recommendedStepsMatch = analysisText.match(/#### Recommended Next Steps([\s\S]*?)(?=#### |$)/);

      // Helper function to add section header
      const addSectionHeader = (title: string) => {
        if (yPosition > MAX_CONTENT_Y - 30) {
          doc.addPage();
          yPosition = MARGIN;
        }
        doc.rect(MARGIN, yPosition - 2, PAGE_WIDTH - MARGIN * 2, 3).fill(PRIMARY_BLUE);
        doc.fontSize(13).font("Helvetica-Bold").fillColor(PRIMARY_BLUE);
        doc.text(title, MARGIN, yPosition + 8);
        yPosition += 32;
      };

      // Helper function to add bullet point
      const addBulletPoint = (text: string) => {
        if (yPosition > MAX_CONTENT_Y - 20) {
          doc.addPage();
          yPosition = MARGIN;
        }
        const cleanText = text.replace(/^[\s•▪\-*]+/, "").trim();
        if (!cleanText) return;
        
        doc.fontSize(9).fillColor(PRIMARY_BLUE);
        doc.text("•", MARGIN + 5, yPosition, { width: 15 });
        
        doc.fontSize(9.5).fillColor(TEXT_DARK).font("Helvetica");
        const wrappedHeight = doc.heightOfString(cleanText, { width: PAGE_WIDTH - MARGIN * 2 - 25 });
        doc.text(cleanText, MARGIN + 25, yPosition, { width: PAGE_WIDTH - MARGIN * 2 - 25 });
        yPosition += wrappedHeight + 8;
      };

      // Helper function to add metric row
      const addMetricRow = (label: string, value: string) => {
        if (yPosition > MAX_CONTENT_Y - 20) {
          doc.addPage();
          yPosition = MARGIN;
        }
        doc.fontSize(9).font("Helvetica-Bold").fillColor(TEXT_DARK);
        doc.text(label, MARGIN + 15, yPosition);
        
        doc.fontSize(9).font("Helvetica").fillColor(PRIMARY_BLUE);
        doc.text(value, PAGE_WIDTH / 2 + 20, yPosition);
        
        yPosition += 14;
      };

      // ===== MAIN FINDINGS SECTION =====
      if (mainFindingsMatch) {
        addSectionHeader("Main Findings");
        const findingsText = mainFindingsMatch[1];
        const findingsLines = findingsText.split("\n").filter(l => l.trim().length > 0);
        for (const line of findingsLines) {
          if (line.match(/^-\s+/)) {
            addBulletPoint(line);
          }
        }
        yPosition += 6;
      }

      // ===== KEY METRICS SECTION =====
      if (keyMetricsMatch) {
        addSectionHeader("Key Metrics");
        const metricsText = keyMetricsMatch[1];
        const metricsLines = metricsText.split("\n").filter(l => l.trim().length > 0);
        
        for (const line of metricsLines) {
          const cleanLine = line.replace(/^\s*-\s*/, "").replace(/\*\*/g, "").trim();
          if (cleanLine.length === 0) continue;
          
          if (cleanLine.includes(":")) {
            const [label, value] = cleanLine.split(":").map(s => s.trim());
            addMetricRow(label, value);
          } else if (cleanLine.match(/^[A-Z]/)) {
            addBulletPoint(cleanLine);
          }
        }
        yPosition += 6;
      }

      // ===== AREAS OF CONCERN SECTION =====
      if (areasOfConcernMatch) {
        addSectionHeader("Areas of Concern");
        const concernText = areasOfConcernMatch[1];
        const concernLines = concernText.split("\n").filter(l => l.trim().length > 0);
        for (const line of concernLines) {
          if (line.match(/^-\s+/)) {
            addBulletPoint(line);
          }
        }
        yPosition += 6;
      }

      // ===== RECOMMENDED NEXT STEPS SECTION =====
      if (recommendedStepsMatch) {
        addSectionHeader("Recommended Next Steps");
        const stepsText = recommendedStepsMatch[1];
        const stepsLines = stepsText.split("\n").filter(l => l.trim().length > 0);
        for (const line of stepsLines) {
          if (line.match(/^-\s+/) || line.match(/^\*\*/)) {
            addBulletPoint(line);
          }
        }
      }

      // ===== FOOTER SECTION =====
      const footerY = PAGE_HEIGHT - FOOTER_HEIGHT;
      doc.moveTo(MARGIN, footerY).lineTo(PAGE_WIDTH - MARGIN, footerY).strokeColor(ACCENT_GRAY).lineWidth(1).stroke();
      
      doc.fontSize(8).fillColor(TEXT_LIGHT).font("Helvetica");
      doc.text("This analysis is confidential and for personal use only. For professional financial advice, consult a qualified advisor.", 
               MARGIN, footerY + 10, { width: PAGE_WIDTH - MARGIN * 2, align: "center" });
      
      doc.fontSize(7).fillColor(TEXT_LIGHT);
      doc.text("© 2025 TN Credit Solutions", MARGIN, footerY + 30, { align: "center" });

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
