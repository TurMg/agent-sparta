import express from 'express';
import { authenticateToken } from '../middleware/auth';
import whatsappRealService from '../services/whatsapp-real';
import { dbAll, dbGet, dbRun } from '../database/init';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get WhatsApp connection status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const status = whatsappRealService.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting WhatsApp status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get WhatsApp status'
    });
  }
});

// Initialize WhatsApp connection
router.post('/connect', authenticateToken, async (req, res) => {
  try {
    await whatsappRealService.connect();
    res.json({
      success: true,
      message: 'WhatsApp connection initiated'
    });
  } catch (error) {
    console.error('Error initializing WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize WhatsApp connection'
    });
  }
});

// Disconnect WhatsApp
router.post('/disconnect', authenticateToken, async (req, res) => {
  try {
    await whatsappRealService.disconnect();
    res.json({
      success: true,
      message: 'WhatsApp disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect WhatsApp'
    });
  }
});

// Send message via WhatsApp
router.post('/send-message', authenticateToken, async (req, res) => {
  try {
    const { number, message } = req.body;

    if (!number || !message) {
      return res.status(400).json({
        success: false,
        message: 'Number and message are required'
      });
    }

    const success = await whatsappRealService.sendMessage(number, message);
    
    if (success) {
      res.json({
        success: true,
        message: 'Message sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send message'
      });
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

// Get WhatsApp chats
router.get('/chats', authenticateToken, async (req, res) => {
  try {
    const chats = await whatsappRealService.getChats();
    res.json({
      success: true,
      data: chats
    });
  } catch (error) {
    console.error('Error getting WhatsApp chats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chats'
    });
  }
});

// WebSocket-like endpoint for real-time updates (using Server-Sent Events)
router.get('/events', async (req, res) => {
  // Simple token validation for SSE
  const token = req.query.authorization as string;
  if (!token) {
    return res.status(401).json({ error: 'Authorization token required' });
  }
  // Ensure the WhatsApp client is initialized so that QR can be emitted
  try {
    await whatsappRealService.connect();
  } catch (e) {
    // Don't break the stream setup; surface the error to the client
    console.error('Failed to initialize WhatsApp client for SSE:', e);
  }

  // For now, we'll skip JWT validation for SSE to avoid complexity
  // In production, you should validate the JWT token here
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send initial status
  const initialStatus = whatsappRealService.getStatus();
  sendEvent('status', initialStatus);

  // Listen for WhatsApp events
  const onQR = (qr: string) => {
    sendEvent('qr', { qrCode: qr });
  };

  const onReady = () => {
    sendEvent('ready', { isConnected: true });
  };

  const onDisconnected = (reason: string) => {
    sendEvent('disconnected', { reason, isConnected: false });
  };

  const onAuthFailure = (msg: string) => {
    sendEvent('auth_failure', { message: msg });
  };

  // Register event listeners
  whatsappRealService.on('qr', onQR);
  whatsappRealService.on('ready', onReady);
  whatsappRealService.on('disconnected', onDisconnected);
  whatsappRealService.on('auth_failure', onAuthFailure);

  // Clean up when client disconnects
  req.on('close', () => {
    whatsappRealService.off('qr', onQR);
    whatsappRealService.off('ready', onReady);
    whatsappRealService.off('disconnected', onDisconnected);
    whatsappRealService.off('auth_failure', onAuthFailure);
  });

  // Keep connection alive
  const keepAlive = setInterval(() => {
    sendEvent('ping', { timestamp: new Date().toISOString() });
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

export default router;

// Admin endpoints to manage allowed numbers
router.get('/numbers', authenticateToken, async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM whatsapp_allowed_numbers ORDER BY updated_at DESC');
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch numbers' });
  }
});

router.post('/numbers/register', async (req, res) => {
  try {
    const { phone, name, userId } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, message: 'Phone is required' });
    const id = uuidv4();
    await dbRun(`INSERT INTO whatsapp_allowed_numbers (id, phone, display_name, user_id, status) VALUES (?,?,?,?, 'pending')`, [id, String(phone).replace(/[^0-9]/g, ''), name || null, userId || null]);
    res.json({ success: true, message: 'Registered. Awaiting approval.' });
  } catch (e: any) {
    if (e && e.code === 'SQLITE_CONSTRAINT' || e?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Phone already registered' });
    }
    res.status(500).json({ success: false, message: 'Failed to register phone' });
  }
});

router.post('/numbers/:phone/approve', authenticateToken, async (req, res) => {
  try {
    await dbRun(`UPDATE whatsapp_allowed_numbers SET status='approved' WHERE phone=?`, [req.params.phone]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to approve' });
  }
});

router.post('/numbers/:phone/reject', authenticateToken, async (req, res) => {
  try {
    await dbRun(`UPDATE whatsapp_allowed_numbers SET status='rejected' WHERE phone=?`, [req.params.phone]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to reject' });
  }
});
