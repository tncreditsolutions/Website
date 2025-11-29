import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { createRequire } from "module";
import { storage, dbReadyPromise } from "./storage";
import { insertContactSubmissionSchema, insertChatMessageSchema, insertNewsletterSubscriptionSchema, insertDocumentSchema } from "@shared/schema";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import bcrypt from "bcrypt";

let pdfParse: any = null;
const require = createRequire(import.meta.url);

// Using gpt-4o (most recent stable model)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
console.log("[AI] OpenAI initialized:", !!openai, "API key available:", !!process.env.OPENAI_API_KEY);

// Convert PDF to base64 for OpenAI vision analysis
function encodeToBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

// Helper function to generate and save PDF to disk
async function generateAndSavePDF(document: any, analysisText?: string): Promise<string | null> {
  try {
    const pdfsDir = path.join(import.meta.dirname, "..", "pdfs");
    if (!fs.existsSync(pdfsDir)) {
      fs.mkdirSync(pdfsDir, { recursive: true });
    }

    // Use the date sent from frontend (already in correct visitor timezone)
    const dateStr = (document as any).visitorDateForFilename || new Date().toISOString().split('T')[0].replace(/-/g, '-');
    console.log("[PDF Save] Using visitor date:", dateStr);
    
    const pdfFileName = `${document.id}-${dateStr}.pdf`;
    const pdfFilePath = path.join(pdfsDir, pdfFileName);
    console.log("[PDF Save] Saving to:", pdfFileName);

    // Create PDF document
    const doc = new PDFDocument({ margin: 0, size: "A4" });
    const writeStream = fs.createWriteStream(pdfFilePath);
    doc.pipe(writeStream);

    // Header
    doc.rect(0, 0, 612, 145).fill("#0f2d6e");
    doc.rect(0, 0, 612, 6).fill("#fbbf24");
    doc.rect(0, 139, 612, 6).fill("#fbbf24");
    doc.fontSize(32).font("Helvetica-Bold").fillColor("#ffffff");
    doc.text("TN CREDIT SOLUTIONS", 50, 28);
    doc.fontSize(10).font("Helvetica").fillColor("#c5d3ff");
    doc.text("Professional Credit Restoration & Tax Optimization Services", 50, 65);
    // Format date for title display
    const dateForTitle = (document as any).visitorDateForFilename || new Date().toISOString().split('T')[0];
    console.log("[PDF Save] Document fields - visitorDateForFilename:", (document as any).visitorDateForFilename, "dateForTitle:", dateForTitle);
    
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#fbbf24");
    doc.text(`CREDIT ANALYSIS REPORT - ${dateForTitle}`, 50, 82);
    doc.fontSize(9).font("Helvetica").fillColor("#e0e7ff");
    doc.text(`Client Name: ${document.visitorName}`, 50, 102);
    
    doc.text(`Report Date: ${dateForTitle}`, 50, 115);
    doc.moveTo(0, 145).lineTo(612, 145).strokeColor("#f3f4f6").lineWidth(0.75).stroke();

    // Content
    const PAGE_HEIGHT = 792;
    const FOOTER_HEIGHT = 60;
    const MAX_CONTENT_Y = PAGE_HEIGHT - FOOTER_HEIGHT;
    let yPosition = 160;
    
    // Use passed analysis text, fall back to document.aiAnalysis, or use empty
    const finalAnalysis = analysisText || document.aiAnalysis || "";
    console.log("[PDF Save] Document ID:", document.id, "Analysis source:", analysisText ? "parameter" : "document.aiAnalysis", "length:", finalAnalysis.length);
    if (!finalAnalysis) {
      console.error("[PDF Save] No AI analysis found for document:", document.id);
      doc.end();
      return new Promise((resolve) => {
        writeStream.on('finish', () => {
          console.log("[PDF Save] Empty PDF saved (no analysis):", pdfFileName);
          resolve(pdfFileName);
        });
      });
    }
    
    const lines = finalAnalysis.split("\n");
    let isFirstSection = true;

    for (const line of lines) {
      if (yPosition > MAX_CONTENT_Y - 20) {
        doc.addPage();
        yPosition = 40;
      }
      if (line.includes("CREDIT ANALYSIS SUMMARY") || line.includes("═") || line.includes("━") || line.includes("Summary Analysis") || line.includes("**Summary") || line.includes("---") || line.includes("Certainly!")) {
        continue;
      }
      if (line.match(/^#+\s+[A-Z]/)) {
        if (!isFirstSection) yPosition += 10;
        const sectionTitle = line.replace(/^#+\s+/, "").trim();
        doc.rect(40, yPosition, 4, 20).fill("#fbbf24");
        doc.fontSize(12).font("Helvetica-Bold").fillColor("#0f2d6e");
        doc.text(sectionTitle, 50, yPosition + 2);
        doc.moveTo(50, yPosition + 20).lineTo(560, yPosition + 20).strokeColor("#e5e7eb").lineWidth(0.75).stroke();
        yPosition += 32;
        isFirstSection = false;
      } else if (line.match(/^\s*[-•▪*]\s+/) || line.match(/^\s*\d+\.\s+/)) {
        const cleanContent = line.replace(/^\s*[-•▪*\d.]\s+/, "").replace(/\*\*/g, "").trim();
        if (!cleanContent) continue;
        doc.fontSize(9).fillColor("#fbbf24").font("Helvetica-Bold");
        doc.text("●", 48, yPosition);
        doc.fontSize(10).fillColor("#374151").font("Helvetica");
        const wrappedHeight = doc.heightOfString(cleanContent, { width: 500 });
        doc.text(cleanContent, 62, yPosition, { width: 500 });
        yPosition += wrappedHeight + 6;
      } else if (line.includes(":") && !line.match(/^#+/) && line.trim().length > 0) {
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
      } else if (line.trim().length > 0 && !line.match(/^###/)) {
        const cleanLine = line.replace(/\*\*/g, "").trim();
        doc.fontSize(10).fillColor("#4b5563").font("Helvetica");
        const wrappedHeight = doc.heightOfString(cleanLine, { width: 520 });
        doc.text(cleanLine, 48, yPosition, { width: 520 });
        yPosition += wrappedHeight + 5;
      } else if (yPosition > 200) {
        yPosition += 3;
      }
    }

    // Footer
    doc.rect(0, 750, 612, 6).fill("#fbbf24");
    doc.moveTo(50, 735).lineTo(560, 735).strokeColor("#d1d5db").lineWidth(0.75).stroke();
    doc.fontSize(8).fillColor("#6b7280").font("Helvetica");
    doc.text("This analysis is confidential and for personal use only.", 50, 705, { align: "center" });
    doc.fontSize(7).fillColor("#9ca3af").font("Helvetica");
    doc.text("© 2025 TN Credit Solutions | Confidential & Proprietary", 50, 718, { align: "center" });
    doc.text("For professional financial advice, please consult with a qualified advisor.", 50, 727, { align: "center" });

    doc.end();

    return new Promise((resolve) => {
      writeStream.on('finish', () => {
        console.log("[PDF Save] Successfully saved:", pdfFileName);
        resolve(pdfFileName);
      });
      writeStream.on('error', (err) => {
        console.error("[PDF Save] Write stream error:", err);
        resolve(null);
      });
    });
  } catch (error) {
    console.error("[PDF Save] Error:", error);
    return null;
  }
}

// Helper function to clean AI analysis text
function cleanAnalysisText(rawText: string): string {
  // Remove code blocks
  let cleaned = rawText.replace(/^(```.*?\n|```)/gm, "");
  
  // Remove common conversational openers and fallback messages
  const conversationalPatterns = [
    /^I(?:'m| am|'ll)\s+unable\s+to\s+view.*?(?:\n|$)/i,
    /^I\s+can\s+(?:guide|help|provide).*?(?:\n|$)/i,
    /^(?:Certainly|Of course|Sure|Here's|Let me|Based on|Thank you).*?(?:\n|$)/i,
    /^(?:Here is|This is)\s+(?:a|the).*?(?:guide|approach|analysis).*?(?:\n|$)/i,
  ];
  
  conversationalPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, "");
  });
  
  // Split into lines and filter
  const lines = cleaned.split("\n");
  const filteredLines = lines.filter(line => {
    const lower = line.toLowerCase().trim();
    
    // Skip empty lines
    if (!lower) return false;
    
    // Skip lines with conversational content
    if (lower.startsWith("i ") || lower.startsWith("i'm") || lower.startsWith("i'll")) return false;
    if (lower.includes("unable to view") || lower.includes("unable to") || lower.includes("i can guide")) return false;
    if (lower.includes("would be happy") || lower.includes("can help you") || lower.includes("can provide")) return false;
    if (lower.includes("here's the") || lower.includes("here's a") || lower.includes("certainly")) return false;
    if (lower.includes("apologize") || lower.includes("sorry")) return false;
    
    return true;
  });
  
  // Join and clean up extra whitespace
  const result = filteredLines.join("\n").trim();
  
  // If result is empty or still conversational, return empty string to trigger fallback
  if (!result || result.length < 50) {
    return "";
  }
  
  return result;
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

// Auth middleware to check if user is authenticated
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if ((req.session as any)?.userId) {
    next();
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
}

// Initialize default admin user on startup - only runs ONCE
let adminInitialized = false;
async function initializeDefaultAdmin() {
  if (adminInitialized) {
    console.log("[Auth] Admin initialization already completed this session");
    return;
  }
  try {
    const existingAdmin = await storage.getUserByUsername("admin");
    if (existingAdmin) {
      console.log("[Auth] ✅ Admin user already exists in database. ID:", existingAdmin.id);
      adminInitialized = true;
      return;
    }
    console.log("[Auth] Creating default admin user...");
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const newAdmin = await storage.createUser({ username: "admin", password: hashedPassword });
    console.log("[Auth] ✅ Default admin user created. ID:", newAdmin.id, "Username: admin, Password: admin123");
    adminInitialized = true;
  } catch (error) {
    console.error("[Auth] ❌ CRITICAL: Could not initialize default admin user:", error);
    console.error("[Auth] This is likely a database connection issue. Check DATABASE_URL environment variable.");
    // Don't crash the app - just warn and continue. The database can be set up later.
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // CRITICAL: Wait for database to be fully initialized before proceeding
  await dbReadyPromise;
  
  // Initialize default admin user
  await initializeDefaultAdmin();

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log("[Auth] Login attempt");
      const { username, password } = req.body;
      console.log("[Auth] Received username:", username);
      
      if (!username || !password) {
        console.log("[Auth] Missing credentials");
        return res.status(400).json({ error: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      console.log("[Auth] User lookup result:", user ? "Found" : "Not found");
      
      if (!user) {
        console.log("[Auth] User not found");
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log("[Auth] Password check:", isValidPassword ? "Valid" : "Invalid");
      
      if (!isValidPassword) {
        console.log("[Auth] Invalid password");
        return res.status(401).json({ error: "Invalid credentials" });
      }

      (req.session as any).userId = user.id;
      console.log("[Auth] Session set, userId:", user.id);
      console.log("[Auth] Login successful");
      res.json({ success: true, user: { id: user.id, username: user.username } });
    } catch (error: any) {
      console.error("[Auth] Login error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  // Diagnostic endpoint - check configuration
  app.get("/api/diagnostic", async (req, res) => {
    try {
      const diagnostic = {
        databaseUrlSet: !!process.env.DATABASE_URL,
        sessionSecretSet: !!process.env.SESSION_SECRET,
        nodeEnv: process.env.NODE_ENV,
        openaiKeySet: !!process.env.OPENAI_API_KEY,
        adminUserExists: false,
        dbConnectionWorks: false,
        errors: [] as string[]
      };

      // Check database connection
      try {
        const adminUser = await storage.getUserByUsername("admin");
        diagnostic.adminUserExists = !!adminUser;
        diagnostic.dbConnectionWorks = true;
      } catch (error: any) {
        diagnostic.errors.push(`Database connection error: ${error.message}`);
      }

      res.json(diagnostic);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Check auth status endpoint
  app.get("/api/auth/check", (req, res) => {
    if ((req.session as any)?.userId) {
      res.json({ authenticated: true });
    } else {
      res.status(401).json({ authenticated: false });
    }
  });

  // Setup endpoint - creates admin user if it doesn't exist
  app.post("/api/auth/setup", async (req, res) => {
    try {
      console.log("[Setup] Starting admin user setup...");
      
      const existingAdmin = await storage.getUserByUsername("admin");
      if (existingAdmin) {
        console.log("[Setup] Admin user already exists");
        return res.json({ success: true, message: "Admin user already exists" });
      }
      
      console.log("[Setup] Creating default admin user...");
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const newAdmin = await storage.createUser({
        username: "admin",
        password: hashedPassword,
      });
      
      console.log("[Setup] Admin user created successfully:", newAdmin.id);
      res.json({ 
        success: true, 
        message: "Admin user created successfully",
        username: "admin",
        password: "admin123"
      });
    } catch (error: any) {
      console.error("[Setup] Error creating admin user:", error);
      const errorMsg = error?.message || "Failed to create admin user";
      res.status(500).json({ error: errorMsg, details: String(error) });
    }
  });

  // Password reset endpoint - for account recovery
  app.post("/api/auth/reset-admin-password", async (req, res) => {
    try {
      console.log("[Reset] Password reset requested");
      
      const admin = await storage.getUserByUsername("admin");
      if (!admin) {
        return res.status(404).json({ error: "Admin user not found" });
      }
      
      const tempPassword = "admin123";
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      await storage.updateUserPassword(admin.id, hashedPassword);
      
      console.log("[Reset] Admin password reset successfully");
      res.json({ 
        success: true, 
        message: "Admin password reset successfully",
        tempPassword: tempPassword,
        instruction: "Please log in with the temporary password and change it immediately"
      });
    } catch (error: any) {
      console.error("[Reset] Error resetting password:", error);
      res.status(500).json({ error: error.message || "Failed to reset password" });
    }
  });

  // Change password endpoint
  app.post("/api/auth/change-password", authMiddleware, async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: "Old password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      }

      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const isValidPassword = await bcrypt.compare(oldPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Incorrect current password" });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(userId, hashedNewPassword);
      
      res.json({ success: true, message: "Password changed successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

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
              
              // Check if user has uploaded documents
              const userDocuments = await storage.getDocumentsByEmail(message.email);
              const hasUploadedDocuments = userDocuments.length > 0;
              console.log("[AI] User has uploaded documents:", hasUploadedDocuments, "Count:", userDocuments.length);
              
              // Get conversation history for context - ONLY current session (after last greeting)
              const allMessages = await storage.getAllChatMessages();
              const visitorMessages = allMessages
                .filter(msg => msg.email === message.email)
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
              
              // Find the most recent greeting message (new session start)
              let lastGreetingIndex = -1;
              for (let i = visitorMessages.length - 1; i >= 0; i--) {
                const msg = visitorMessages[i];
                if (msg.sender === "ai" && msg.message && msg.message.includes("Hi") && msg.message.includes("How can I help you today")) {
                  lastGreetingIndex = i;
                  break;
                }
              }
              
              // Only include messages from the current session (after the last greeting)
              const currentSessionMessages = lastGreetingIndex >= 0 
                ? visitorMessages.slice(lastGreetingIndex)
                : visitorMessages;
              
              const conversationHistory = currentSessionMessages
                .map(msg => ({
                  role: msg.sender === "visitor" ? "user" as const : "assistant" as const,
                  content: msg.message
                }));
              
              console.log("[AI] Current session only - total messages:", visitorMessages.length, "current session:", currentSessionMessages.length);
              
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
                console.log("[AI] Using standard prompt, visitor turns:", visitorTurns, "session message count:", currentSessionMessages.length);
                // For fresh sessions (greeting + first message only), use simplified prompt without "previous analysis" references
                let systemPromptWithContext: string;
                
                // Check if this is the first exchange: greeting + first user message = 2 current session messages total
                if (currentSessionMessages.length <= 1) {
                  // Fresh conversation - only greeting or just started
                  console.log("[AI] Fresh session - using simple greeting prompt");
                  systemPromptWithContext = `You are Riley, a smart customer support agent for TN Credit Solutions. You provide personalized guidance on credit restoration and tax optimization.

YOUR ROLE:
- Help visitors understand their financial situation and take action
- Be friendly, professional, and action-focused
- Ask clarifying questions to understand their situation
- Offer to analyze credit reports if they have them
- Be conversational and empathetic

FIRST INTERACTION:
This is the start of the conversation. Ask open-ended questions to understand their credit concerns and what brought them to TN Credit Solutions today.`;
                } else {
                  // Ongoing conversation - use full system prompt with context
                  systemPromptWithContext = SYSTEM_PROMPT;
                  
                  // Only mention uploaded documents if they were uploaded IN THIS SESSION (check current conversation)
                  const documentMentionedInSession = currentSessionMessages.some(msg => 
                    msg.message && (
                      msg.message.toLowerCase().includes("analysis") || 
                      msg.message.toLowerCase().includes("pdf") ||
                      msg.message.toLowerCase().includes("report") ||
                      msg.message.toLowerCase().includes("downloaded")
                    )
                  );
                  if (documentMentionedInSession) {
                    systemPromptWithContext += `\n\nIMPORTANT: This visitor has already uploaded a document for analysis. DO NOT ask them to upload again or request their report. Focus on helping them with their questions, next steps, or offer a PDF summary of their analysis.`;
                  }
                  if (uniqueTopics.length > 0) {
                    systemPromptWithContext += `\n\nPreviously discussed: ${uniqueTopics.join(", ")}. Do NOT ask about these again. Move to new topics or escalate.`;
                  }
                  if (visitorTurns >= 3) {
                    systemPromptWithContext += `\n\nThis is turn ${visitorTurns + 1}. If visitor is still giving vague answers or going in circles, escalate to specialist now.`;
                  }
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
      await storage.deleteDocumentsByEmail(email);
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

      const { visitorEmail, visitorName, fileName, fileType, fileContent, visitorTimezone, visitorDateForFilename } = req.body;
      
      console.log("[Document Upload] visitorDateForFilename:", visitorDateForFilename, "visitorTimezone:", visitorTimezone);
      
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
        visitorTimezone: visitorTimezone || "UTC",
        visitorDateForFilename: visitorDateForFilename || new Date().toISOString().split('T')[0],
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
                    text: "IMPORTANT: Provide ONLY the professional financial analysis of this image. Do NOT include any conversational preamble, acknowledgments, or agent responses. Format ONLY with: sections marked with #### headers, bullet points starting with -, and key-value pairs with colons. Start immediately with the analysis content.",
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
            max_tokens: 1500,
          });
          let rawAnalysis = response.choices[0].message.content || "No analysis available";
          
          // Clean analysis text: remove conversational preambles
          rawAnalysis = cleanAnalysisText(rawAnalysis);
          analysisText = rawAnalysis || "No analysis available";
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
                      text: "IMPORTANT: Provide ONLY the professional financial analysis of this document. Do NOT include any conversational preamble, acknowledgments, or agent responses. Format ONLY with: sections marked with #### headers, bullet points starting with -, and key-value pairs with colons. Start immediately with the analysis content.",
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
            
            let rawAnalysis = response.choices[0].message.content || "Your credit report PDF has been received. Our specialists will review it in detail and provide personalized recommendations.";
            
            // Clean analysis text: remove conversational preambles and agent-like responses
            rawAnalysis = cleanAnalysisText(rawAnalysis);
            analysisText = rawAnalysis || "Your credit report PDF has been received. Our specialists will review it in detail and provide personalized recommendations.";
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
      console.log("[Document Upload] Saving analysis, length:", analysisText.length, "text preview:", analysisText.substring(0, 100));
      await storage.updateDocumentAnalysis(document.id, analysisText);
      console.log("[Document Upload] ✅ Analysis saved successfully");
      
      // Fetch the updated document from storage to ensure aiAnalysis is included
      const updatedDoc = await storage.getDocumentById(document.id);
      
      if (!updatedDoc) {
        console.error("[Document Upload] ❌ Failed to retrieve updated document after saving analysis");
        return res.status(500).json({ error: "Failed to retrieve updated document" });
      }
      
      console.log("[Document Upload] ✅ Updated doc aiAnalysis length:", updatedDoc.aiAnalysis?.length || 0, "preview:", updatedDoc.aiAnalysis?.substring(0, 100) || "NO ANALYSIS");
      console.log("[Document Upload] About to generate PDF - analysisText length:", analysisText.length, "analysisText preview:", analysisText.substring(0, 150));
      
      // Generate and save PDF for admin resending - pass analysisText directly to ensure it's included
      const pdfFileName = await generateAndSavePDF(updatedDoc, analysisText);
      console.log("[Document Upload] PDF generation complete - file:", pdfFileName);
      if (pdfFileName) {
        await storage.updateDocumentPdfPath(updatedDoc.id, pdfFileName);
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
        pdfPath: pdfFileName,
        visitorDateForFilename: (updatedDoc as any).visitorDateForFilename,
        visitorTimezone: (updatedDoc as any).visitorTimezone,
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

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const document = await storage.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Delete the physical file if it exists
      const filePath = path.join(import.meta.dirname, "..", "uploads", document.filePath);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.log("[Documents] Could not delete file:", filePath);
        }
      }

      // Delete from database
      await storage.deleteDocumentById(id);
      res.json({ success: true, message: "Document deleted permanently" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // View saved PDF in browser
  app.get("/api/documents/:id/pdf-view", async (req, res) => {
    try {
      const { id } = req.params;
      const document = await storage.getDocumentById(id);
      if (!document || !document.pdfPath) {
        return res.status(404).json({ error: "No saved PDF available" });
      }

      const pdfFilePath = path.join(import.meta.dirname, "..", "pdfs", document.pdfPath);
      if (!fs.existsSync(pdfFilePath)) {
        return res.status(404).json({ error: "PDF file not found" });
      }

      // Use the date sent from frontend (already in correct visitor timezone)
      const dateOnly = (document as any).visitorDateForFilename || new Date().toISOString().split('T')[0];

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename=credit-analysis-${dateOnly}.pdf`);
      res.sendFile(pdfFilePath);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Download saved PDF
  app.get("/api/documents/:id/pdf-download", async (req, res) => {
    try {
      const { id } = req.params;
      const document = await storage.getDocumentById(id);
      if (!document || !document.pdfPath) {
        return res.status(404).json({ error: "No saved PDF available" });
      }

      const pdfFilePath = path.join(import.meta.dirname, "..", "pdfs", document.pdfPath);
      if (!fs.existsSync(pdfFilePath)) {
        return res.status(404).json({ error: "PDF file not found" });
      }

      // Extract date from pdfPath filename (format: id-MM-DD-YYYY.pdf)
      let dateOnlyStr = new Date().toISOString().split('T')[0];
      const dateMatch = document.pdfPath.match(/(\d{2}-\d{2}-\d{4})/);
      if (dateMatch) {
        dateOnlyStr = dateMatch[1];
      }

      res.download(pdfFilePath, `credit-analysis-${dateOnlyStr}.pdf`);
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

      // Extract date from pdfPath filename (format: id-MM-DD-YYYY.pdf)
      let dateOnlyStr = new Date().toISOString().split('T')[0];
      if (document.pdfPath) {
        const dateMatch = document.pdfPath.match(/(\d{2}-\d{2}-\d{4})/);
        if (dateMatch) {
          dateOnlyStr = dateMatch[1];
        }
      }
      console.log("[PDF Endpoint] Using dateOnlyStr from pdfPath:", dateOnlyStr, "pdfPath:", document.pdfPath);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''credit-analysis-${encodeURIComponent(dateOnlyStr)}.pdf`);
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      console.log("[PDF Endpoint] Setting Content-Disposition with dateOnlyStr:", dateOnlyStr, "final header: attachment; filename*=UTF-8''credit-analysis-" + encodeURIComponent(dateOnlyStr) + ".pdf");

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

      // Convert MM-DD-YYYY to "Month DD, YYYY" format
      const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
      const [month, day, year] = dateOnlyStr.split('-');
      const monthIndex = parseInt(month) - 1;
      const formattedDate = `${monthNames[monthIndex]} ${parseInt(day)}, ${year}`;

      doc.fontSize(9).font("Helvetica").fillColor("#e0e7ff");
      doc.text(`Client Name: ${document.visitorName}`, 50, 102);
      
      doc.text(`Report Date: ${formattedDate}`, 50, 115);

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
