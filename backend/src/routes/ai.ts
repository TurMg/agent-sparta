import express from "express";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { dbRun, dbGet, dbAll } from "../database/init";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { generateSPHDocument } from "../mcp/tools/sphGenerator";
import { validateSPHData, sanitizeSPHData } from "../mcp/tools/sphValidator";

const router = express.Router();

// Get chat sessions
router.get("/sessions", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const sessions = await dbAll(
      "SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC",
      [req.user!.id]
    );

    res.json({
      success: true,
      data: sessions.map((session: any) => ({
        id: session.id,
        title: session.title,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      })),
    });
  } catch (error) {
    console.error("Get sessions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create new chat session
router.post("/sessions", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const sessionId = uuidv4();
    const title = req.body.title || "New Chat";

    await dbRun(
      `
      INSERT INTO chat_sessions (id, user_id, title)
      VALUES (?, ?, ?)
    `,
      [sessionId, req.user!.id, title]
    );

    res.json({
      success: true,
      data: {
        id: sessionId,
        title,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Create session error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get chat messages
router.get(
  "/sessions/:sessionId/messages",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      // Verify session belongs to user
      const session = await dbGet(
        "SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?",
        [req.params.sessionId, req.user!.id]
      );

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const messages = await dbAll(
        "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC",
        [req.params.sessionId]
      );

      res.json({
        success: true,
        data: messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
          timestamp: msg.created_at,
        })),
      });
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Send message to AI
router.post("/chat", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!message || !sessionId) {
      return res
        .status(400)
        .json({ error: "Session ID and message are required" });
    }

    // Verify session belongs to user
    const session = await dbGet(
      "SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?",
      [sessionId, req.user!.id]
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Save user message
    const userMessageId = uuidv4();
    await dbRun(
      `
      INSERT INTO chat_messages (id, session_id, role, content)
      VALUES (?, ?, ?, ?)
    `,
      [userMessageId, sessionId, "user", message]
    );

    // Process message and determine if it's SPH related
    const aiResponse = await processAIMessage(message, req.user!.id);

    // Save AI response
    const aiMessageId = uuidv4();
    await dbRun(
      `
      INSERT INTO chat_messages (id, session_id, role, content, metadata)
      VALUES (?, ?, ?, ?, ?)
    `,
      [
        aiMessageId,
        sessionId,
        "assistant",
        aiResponse.content,
        JSON.stringify(aiResponse.metadata || {}),
      ]
    );

    // Update session timestamp
    await dbRun(
      "UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [sessionId]
    );

    res.json({
      success: true,
      data: {
        userMessage: {
          id: userMessageId,
          role: "user",
          content: message,
          timestamp: new Date().toISOString(),
        },
        aiMessage: {
          id: aiMessageId,
          role: "assistant",
          content: aiResponse.content,
          metadata: aiResponse.metadata,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Menentukan intent using LLM
async function getIntentFromLLM(message: string): Promise<string> {
  try {
    const definedIntents = [
      {
        intent: "create_sph",
        description:
          "Niat untuk membuat atau menanyakan tentang Surat Penawaran Harga (SPH), quotation, atau penawaran harga.",
        keywords: [
          "buatkan SPH",
          "penawaran harga",
          "quotation",
          "surat penawaran",
        ],
      },
      {
        intent: "general_conversation",
        description:
          "Percakapan umum, sapaan, atau pertanyaan yang tidak terkait dengan pembuatan dokumen.",
        keywords: ["halo", "siapa kamu", "terima kasih", "apa kabar"],
      },
      // Tambahkan intent lain di sini di masa depan
    ];

    const intentPrompt = `
      Anda adalah sebuah AI router yang bertugas untuk mengklasifikasikan niat pengguna.
      Berdasarkan pesan pengguna, tentukan niatnya dari daftar berikut.
      Hanya berikan jawaban dalam format JSON.

      Daftar Niat:
      ${JSON.stringify(definedIntents, null, 2)}

      Pesan Pengguna: "${message}"

      Respon JSON:
      {
        "intent": "nama_intent_yang_paling_sesuai"
      }
    `;

    // Kita bisa menggunakan kembali fungsi sendToLLM yang sudah ada
    const llmResponse = await sendToLLM(intentPrompt);

    // Ekstrak JSON dari respons LLM
    const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedResponse = JSON.parse(jsonMatch[0]);
      // Pastikan intent yang dikembalikan valid
      if (definedIntents.some((i) => i.intent === parsedResponse.intent)) {
        console.log(`✅ Intent terdeteksi: ${parsedResponse.intent}`);
        return parsedResponse.intent;
      }
    }

    // Fallback jika LLM tidak memberikan jawaban yang valid
    console.warn(
      "⚠️ Gagal mendeteksi intent dari LLM, menggunakan fallback general_conversation."
    );
    return "general_conversation";
  } catch (error) {
    console.error("Error in getIntentFromLLM:", error);
    return "general_conversation"; // Fallback jika terjadi error
  }
}

// Process AI message
async function processAIMessage(message: string, userId: string) {
  try {
    // Langkah 1: Dapatkan niat dari LLM Router
    const intent = await getIntentFromLLM(message);

    // Langkah 2: Arahkan ke handler yang sesuai berdasarkan niat
    switch (intent) {
      case "create_sph":
        // Jika niatnya adalah membuat SPH, panggil handler SPH
        return await processSPHRequest(message, userId);

      case "general_conversation":
      default:
        // Untuk semua niat lain, kirim ke LLM umum
        const llmResponse = await sendToLLM(message);
        return {
          content: llmResponse,
          metadata: { type: "general" },
        };
    }
  } catch (error) {
    console.error("Process AI message error:", error);
    return {
      content:
        "Maaf, terjadi kesalahan dalam memproses pesan Anda. Silakan coba lagi.",
      metadata: {
        type: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

// Process SPH-specific requests
async function processSPHRequest(message: string, userId: string) {
  try {
    const today = new Date();
    const formattedToday = today.toISOString().split("T")[0];
    // Use Telkom AI to intelligently parse SPH request
    const sphParsingPrompt = `
PERAN ANDA :
Anda adalah AI ahli ekstraksi data yang sangat teliti. Tugas Anda adalah menganalisis teks dari pengguna dan mengubahnya menjadi format JSON yang terstruktur secara akurat. Jangan pernah membuat data yang tidak ada di dalam teks.

TUGAS ANDA :
Ekstrak informasi untuk pembuatan Surat Penawaran Harga (SPH) dari pesan pengguna di bawah. Hasilkan HANYA sebuah objek JSON yang valid tanpa teks pembuka atau penutup.

FORMAT JSON YANG WAJIB DIIKUTI :
{
  "customerName": "string | null",
  "sphDate": "string (YYYY-MM-DD) | null",
  "services": [
    {
      "serviceName": "string",
      "connectionCount": "integer",
      "psbFee": "integer",
      "monthlyFeeNormal": "integer",
      "monthlyFeeDiscount": "integer"
    }
  ],
  "notes": "string | null",
  "isComplete": "boolean"
}

ATURAN :
1.  **isComplete**: Setel ke 'true' HANYA jika SEMUA field wajib (customerName, sphDate, dan setidaknya satu item di services dengan semua field-nya) terisi. Jika tidak, setel ke 'false'.
2.  **Tanggal**: Jika pengguna tidak menyebutkan tanggal, gunakan tanggal hari ${formattedToday} ini dalam format YYYY-MM-DD.
3.  **Angka**: Semua nilai biaya (psbFee, monthlyFeeNormal, monthlyFeeDiscount) harus berupa integer tanpa format mata uang (misalnya, 500000 bukan "Rp 500.000").
4.  **Data Tidak Lengkap**: Jika ada informasi yang kurang, isi field yang relevan dengan 'null' dan setel 'isComplete' ke 'false'.
5.  **Beberapa Layanan**: Pengguna mungkin menyebutkan beberapa layanan dalam satu pesan. Pastikan semua layanan masuk ke dalam array 'services'.

CONTOH INPUT DAN OUTPUT :

### Contoh Input 1 (Lengkap):
"Tolong buatkan SPH untuk PT Maju Jaya per hari ini. Layanannya internet 100 Mbps 2 koneksi, PSB gratis, bulanan 800rb dari harga normal 1jt. Tambah juga internet 50 Mbps 1 koneksi, psb 250rb, bulanan 500rb dari normal 650rb. Catatan: penawaran berlaku 14 hari."

### Contoh Output JSON 1:
{
  "customerName": "PT Maju Jaya",
  "sphDate": "${new Date().toISOString().split("T")[0]}",
  "services": [
    {
      "serviceName": "Internet 100 Mbps",
      "connectionCount": 2,
      "psbFee": 0,
      "monthlyFeeNormal": 1000000,
      "monthlyFeeDiscount": 800000
    },
    {
      "serviceName": "Internet 50 Mbps",
      "connectionCount": 1,
      "psbFee": 250000,
      "monthlyFeeNormal": 650000,
      "monthlyFeeDiscount": 500000
    }
  ],
  "notes": "Penawaran berlaku 14 hari.",
  "isComplete": true
}

### Contoh Input 2 (Tidak Lengkap):
"Buatkan quotation untuk PT Sinar Abadi dong, layanannya internet 20 Mbps."

### Contoh Output JSON 2:
{
  "customerName": "PT Sinar Abadi",
  "sphDate": "${new Date().toISOString().split("T")[0]}",
  "services": [
    {
      "serviceName": "Internet 20 Mbps",
      "connectionCount": null,
      "psbFee": null,
      "monthlyFeeNormal": null,
      "monthlyFeeDiscount": null
    }
  ],
  "notes": null,
  "isComplete": false
}

PESAN PENGGUNA UNTUK DIANALISIS :"${message}"
`;

    const aiResponse = await sendToLLM(sphParsingPrompt);

    // Try to extract JSON from AI response
    console.log("AI Response:", aiResponse);
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    console.log("JSON Match:", jsonMatch?.[0]);

    if (jsonMatch) {
      try {
        const extractedData = JSON.parse(jsonMatch[0]);
        console.log("Extracted Data:", JSON.stringify(extractedData, null, 2));

        if (
          extractedData.isComplete &&
          extractedData.customerName &&
          extractedData.services
        ) {
          console.log("Data is complete, proceeding to generate SPH...");
          // If data is complete, attempt to generate SPH
          const { generateSPHDocument } = require("../mcp/tools/sphGenerator");
          const { validateSPHData } = require("../mcp/tools/sphValidator");

          // Validate extracted data
          const validation = validateSPHData(extractedData);
          console.log("Validation result:", validation);

          if (validation.isValid) {
            console.log("Validation passed, generating document...");
            // Generate SPH document
            const result = await generateSPHDocument(extractedData);
            console.log("Generation result:", result);

            if (result.success) {
              // Use the documentId from the generator result
              const documentId = result.documentId;
              const title = `SPH - ${extractedData.customerName} - ${extractedData.sphDate}`;

              console.log("💾 Saving to database with documentId:", documentId);

              await dbRun(
                `
                INSERT INTO documents (id, user_id, type, title, content, data, status, file_path)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `,
                [
                  documentId,
                  userId,
                  "sph",
                  title,
                  result.html,
                  JSON.stringify(extractedData),
                  "generated",
                  result.pdfPath,
                ]
              );

              return {
                content: `✅ **SPH berhasil dibuat!**

**Detail SPH:**
- Pelanggan: ${extractedData.customerName}
- Tanggal: ${extractedData.sphDate}
- Jumlah layanan: ${extractedData.services.length}

📄 **Link Dokumen:**
🔍 **Lihat & Edit**: http://localhost:3000/documents/${documentId}
📥 **Download PDF**: http://localhost:3001${result.pdfPath}
🌐 **Preview HTML**: http://localhost:3001${result.htmlPath}

Klik link di atas untuk melihat, mengedit, atau mengunduh dokumen SPH.`,
                metadata: {
                  type: "sph_generated_simple",
                  documentId: documentId,
                  documentPath: result.htmlPath,
                  pdfPath: result.pdfPath,
                },
              };
            }
          } else {
            return {
              content: `⚠️ **Data SPH tidak lengkap atau tidak valid:**

${validation.errors.join("\n")}

${
  validation.warnings.length > 0
    ? "\n**Peringatan:**\n" + validation.warnings.join("\n")
    : ""
}

Silakan perbaiki data dan coba lagi.`,
              metadata: {
                type: "sph_validation_error",
                errors: validation.errors,
                warnings: validation.warnings,
              },
            };
          }
        }else {
          // Jika data TIDAK LENGKAP, buat pesan panduan yang ramah
          console.log("Data is incomplete. Generating guidance message...");
          const missingFields = [];
          if (!extractedData.customerName) missingFields.push("Nama Pelanggan");

          const service = extractedData.services?.[0];
          if (!service) {
            missingFields.push("Detail Layanan");
          } else {
            if (service.connectionCount === null) missingFields.push("Jumlah Sambungan");
            if (service.psbFee === null) missingFields.push("Biaya Pemasangan (PSB)");
            if (service.monthlyFeeNormal === null) missingFields.push("Biaya Bulanan Normal");
            if (service.monthlyFeeDiscount === null) missingFields.push("Biaya Bulanan Diskon");
          }
          
          let guidanceMessage = `Tentu, saya bisa siapkan penawaran untuk **${extractedData.customerName || 'pelanggan Anda'}**. Namun, saya masih memerlukan beberapa detail tambahan:\n\n`;
          guidanceMessage += missingFields.map(field => `- ${field}`).join('\n');

          return {
              content: guidanceMessage,
              metadata: { type: "sph_guidance_needed" }
          };
        }
      } catch (parseError) {
        console.error("JSON parsing error:", parseError);
        return { content: "Maaf, saya kesulitan memahami detail yang Anda berikan. Bisa tolong ulangi dengan format yang lebih jelas?", metadata: { type: "error" } };
      }
    }

    // If AI couldn't extract complete data, return AI response as guidance
    return {
      content: aiResponse,
      metadata: { type: "sph_guidance" },
    };
  } catch (error) {
    console.error("SPH processing error:", error);
    return { content: "Maaf, terjadi kesalahan saat memproses permintaan SPH Anda.", metadata: { type: "error" } };
  }
}

// Send message to LLM API
async function sendToLLM(message: string): Promise<string> {
  try {
    if (!process.env.LLM_API_URL || !process.env.LLM_API_KEY) {
      return "Maaf, layanan AI sedang tidak tersedia. Silakan coba lagi nanti.";
    }

    const systemInstruction =
      "Anda adalah asisten AI yang membantu membuat dokumen SPH (Surat Penawaran Harga) dan memberikan informasi terkait layanan internet. Berikan respons yang profesional dan informatif dalam bahasa Indonesia.";

    const response = await axios.post(
      process.env.LLM_API_URL,
      {
        model: "telkom-ai",
        messages: [
          {
            role: "system",
            content: systemInstruction,
          },
          {
            role: "user",
            content: message,
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.LLM_API_KEY,
        },
        timeout: 30000,
      }
    );

    // Extract response from Telkom AI API
    const aiResponse =
      response.data?.choices?.[0]?.message?.content ||
      response.data?.response ||
      response.data?.message ||
      "Maaf, tidak ada respons dari AI.";

    return aiResponse;
  } catch (error: any) {
    console.error("LLM API error:", error.response?.data || error.message);

    if (error.response?.status === 401) {
      return "Maaf, API key tidak valid. Silakan hubungi administrator.";
    } else if (error.response?.status === 429) {
      return "Maaf, terlalu banyak permintaan. Silakan coba lagi dalam beberapa saat.";
    } else if (error.code === "ECONNABORTED") {
      return "Maaf, permintaan timeout. Silakan coba lagi.";
    }

    return "Maaf, terjadi kesalahan dalam menghubungi layanan AI. Silakan coba lagi.";
  }
}

export default router;
