import express from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../database/init';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { generateSPHDocument } from '../mcp/tools/sphGenerator';
import { validateSPHData, sanitizeSPHData } from '../mcp/tools/sphValidator';

const router = express.Router();

// Get chat sessions
router.get('/sessions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const sessions = await dbAll(
      'SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC',
      [req.user!.id]
    );

    res.json({
      success: true,
      data: sessions.map((session: any) => ({
        id: session.id,
        title: session.title,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      }))
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new chat session
router.post('/sessions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const sessionId = uuidv4();
    const title = req.body.title || 'New Chat';

    await dbRun(`
      INSERT INTO chat_sessions (id, user_id, title)
      VALUES (?, ?, ?)
    `, [sessionId, req.user!.id, title]);

    res.json({
      success: true,
      data: {
        id: sessionId,
        title,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get chat messages
router.get('/sessions/:sessionId/messages', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Verify session belongs to user
    const session = await dbGet(
      'SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?',
      [req.params.sessionId, req.user!.id]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const messages = await dbAll(
      'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
      [req.params.sessionId]
    );

    res.json({
      success: true,
      data: messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
        timestamp: msg.created_at
      }))
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send message to AI
router.post('/chat', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({ error: 'Session ID and message are required' });
    }

    // Verify session belongs to user
    const session = await dbGet(
      'SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?',
      [sessionId, req.user!.id]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Save user message
    const userMessageId = uuidv4();
    await dbRun(`
      INSERT INTO chat_messages (id, session_id, role, content)
      VALUES (?, ?, ?, ?)
    `, [userMessageId, sessionId, 'user', message]);

    // Process message and determine if it's SPH related
    const aiResponse = await processAIMessage(message, req.user!.id);

    // Save AI response
    const aiMessageId = uuidv4();
    await dbRun(`
      INSERT INTO chat_messages (id, session_id, role, content, metadata)
      VALUES (?, ?, ?, ?, ?)
    `, [aiMessageId, sessionId, 'assistant', aiResponse.content, JSON.stringify(aiResponse.metadata || {})]);

    // Update session timestamp
    await dbRun(
      'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [sessionId]
    );

    res.json({
      success: true,
      data: {
        userMessage: {
          id: userMessageId,
          role: 'user',
          content: message,
          timestamp: new Date().toISOString()
        },
        aiMessage: {
          id: aiMessageId,
          role: 'assistant',
          content: aiResponse.content,
          metadata: aiResponse.metadata,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process AI message
async function processAIMessage(message: string, userId: string) {
  try {
    // Check if message is SPH related
    const sphKeywords = ['sph', 'surat penawaran harga', 'penawaran', 'generate sph', 'buat sph'];
    const isSPHRelated = sphKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );

    if (isSPHRelated) {
      return await processSPHRequest(message, userId);
    }

    // For non-SPH messages, send to LLM API
    const llmResponse = await sendToLLM(message);
    
    return {
      content: llmResponse,
      metadata: { type: 'general' }
    };
  } catch (error) {
    console.error('Process AI message error:', error);
    return {
      content: 'Maaf, terjadi kesalahan dalam memproses pesan Anda. Silakan coba lagi.',
      metadata: { type: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

// Process SPH-specific requests
async function processSPHRequest(message: string, userId: string) {
  try {
    // Use Telkom AI to intelligently parse SPH request
    const sphParsingPrompt = `
Analisis pesan berikut untuk ekstraksi data SPH (Surat Penawaran Harga). 
Jika ada data yang dapat diekstrak, berikan dalam format JSON. Jika tidak lengkap, berikan panduan untuk melengkapinya.

Pesan: "${message}"

Format JSON yang diharapkan:
{
  "customerName": "nama pelanggan",
  "sphDate": "YYYY-MM-DD",
  "services": [
    {
      "serviceName": "nama layanan",
      "connectionCount": jumlah_sambungan,
      "psbFee": biaya_psb,
      "monthlyFeeNormal": biaya_bulanan_normal,
      "monthlyFeeDiscount": biaya_bulanan_diskon
    }
  ],
  "notes": "catatan tambahan",
  "isComplete": true/false
}

Berikan respons dalam bahasa Indonesia yang profesional.`;

    const aiResponse = await sendToLLM(sphParsingPrompt);
    
    // Try to extract JSON from AI response
    console.log('AI Response:', aiResponse);
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    console.log('JSON Match:', jsonMatch?.[0]);
    
    if (jsonMatch) {
      try {
        const extractedData = JSON.parse(jsonMatch[0]);
        console.log('Extracted Data:', JSON.stringify(extractedData, null, 2));
        
        if (extractedData.isComplete && extractedData.customerName && extractedData.services) {
          console.log('Data is complete, proceeding to generate SPH...');
          // If data is complete, attempt to generate SPH
          const { generateSPHDocument } = require('../mcp/tools/sphGenerator');
          const { validateSPHData } = require('../mcp/tools/sphValidator');
          
          // Validate extracted data
          const validation = validateSPHData(extractedData);
          console.log('Validation result:', validation);
          
          if (validation.isValid) {
            console.log('Validation passed, generating document...');
            // Generate SPH document
            const result = await generateSPHDocument(extractedData);
            console.log('Generation result:', result);
            
            if (result.success) {
              // Use the documentId from the generator result
              const documentId = result.documentId;
              const title = `SPH - ${extractedData.customerName} - ${extractedData.sphDate}`;
              
              console.log('💾 Saving to database with documentId:', documentId);
              
              await dbRun(`
                INSERT INTO documents (id, user_id, type, title, content, data, status, file_path)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                documentId,
                userId,
                'sph',
                title,
                result.html,
                JSON.stringify(extractedData),
                'generated',
                result.pdfPath
              ]);

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
                  type: 'sph_generated_simple',
                  documentId: documentId,
                  documentPath: result.htmlPath,
                  pdfPath: result.pdfPath
                }
              };
            }
          } else {
            return {
              content: `⚠️ **Data SPH tidak lengkap atau tidak valid:**

${validation.errors.join('\n')}

${validation.warnings.length > 0 ? '\n**Peringatan:**\n' + validation.warnings.join('\n') : ''}

Silakan perbaiki data dan coba lagi.`,
              metadata: { type: 'sph_validation_error', errors: validation.errors, warnings: validation.warnings }
            };
          }
        }
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
      }
    }
    
    // If AI couldn't extract complete data, return AI response as guidance
    return {
      content: aiResponse,
      metadata: { type: 'sph_guidance' }
    };
    
  } catch (error) {
    console.error('SPH processing error:', error);
    
    // Fallback to basic instruction
    return {
      content: `Saya siap membantu Anda membuat Surat Penawaran Harga (SPH). 

Untuk membuat SPH, saya memerlukan informasi berikut:
1. **Nama Pelanggan**
2. **Tanggal SPH** 
3. **Detail Layanan**:
   - Nama layanan
   - Jumlah sambungan
   - Biaya PSB (Pasang Sambung Baru)
   - Biaya abodemen bulanan normal
   - Biaya abodemen bulanan dengan diskon
4. **Catatan tambahan** (opsional)

Contoh: "Buatkan SPH untuk PT ABC, tanggal 2024-01-15, layanan Internet 10 Mbps sebanyak 5 sambungan, PSB Rp 500.000, bulanan normal Rp 1.000.000, diskon Rp 800.000"`,
      metadata: { type: 'sph_instruction' }
    };
  }
}

// Send message to LLM API
async function sendToLLM(message: string): Promise<string> {
  try {
    if (!process.env.LLM_API_URL || !process.env.LLM_API_KEY) {
      return 'Maaf, layanan AI sedang tidak tersedia. Silakan coba lagi nanti.';
    }

    const systemInstruction = 'Anda adalah asisten AI yang membantu membuat dokumen SPH (Surat Penawaran Harga) dan memberikan informasi terkait layanan internet. Berikan respons yang profesional dan informatif dalam bahasa Indonesia.';

    const response = await axios.post(process.env.LLM_API_URL, {
      model: 'telkom-ai',
      messages: [
        {
          role: 'system',
          content: systemInstruction
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.LLM_API_KEY
      },
      timeout: 30000
    });

    // Extract response from Telkom AI API
    const aiResponse = response.data?.choices?.[0]?.message?.content || 
                      response.data?.response || 
                      response.data?.message || 
                      'Maaf, tidak ada respons dari AI.';

    return aiResponse;
  } catch (error: any) {
    console.error('LLM API error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      return 'Maaf, API key tidak valid. Silakan hubungi administrator.';
    } else if (error.response?.status === 429) {
      return 'Maaf, terlalu banyak permintaan. Silakan coba lagi dalam beberapa saat.';
    } else if (error.code === 'ECONNABORTED') {
      return 'Maaf, permintaan timeout. Silakan coba lagi.';
    }
    
    return 'Maaf, terjadi kesalahan dalam menghubungi layanan AI. Silakan coba lagi.';
  }
}

export default router;

// Export AI processor for backend integrations (e.g., WhatsApp)
export { processAIMessage };
