import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import QRCode from 'qrcode';
import { EventEmitter } from 'events';
import { processAIMessage } from '../routes/ai';
import { dbGet } from '../database/init';
import os from 'os';
import fs from 'fs';
import path from 'path';

export interface WhatsAppStatus {
  isConnected: boolean;
  qrCode?: string;
  clientInfo?: any;
  lastActivity?: Date;
}

class WhatsAppRealService extends EventEmitter {
  private client: Client | null = null;
  private status: WhatsAppStatus = { isConnected: false };
  private messageHandlers: Map<string, (message: Message) => void> = new Map();
  private isInitializing = false;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    if (this.client || this.isInitializing) {
      return;
    }

    try {
      this.isInitializing = true;
      console.log('🔄 Initializing WhatsApp Real Service with whatsapp-web.js...');

      const chromePath = this.resolveChromePath();
      if (chromePath) {
        console.log('🧭 Using Chrome at:', chromePath);
      } else {
        console.warn('⚠️ Chrome path not resolved. Set PUPPETEER_EXECUTABLE_PATH if launch fails.');
      }

      // Pre-cleanup stale Chrome singleton locks to avoid process singleton errors
      this.cleanupSingletonLocks('.wwebjs_auth', 'agent-ai-whatsapp');

      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'agent-ai-whatsapp'
        }),
        puppeteer: {
          executablePath: chromePath || process.env.PUPPETEER_EXECUTABLE_PATH,
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ]
        },
        restartOnAuthFail: true,
        takeoverOnConflict: true,
        takeoverTimeoutMs: 5000,
        qrMaxRetries: 5
      });

      this.setupEventHandlers();
      
      console.log('🔄 Starting WhatsApp Web...');
      const initTimeoutMs = parseInt(process.env.WA_INIT_TIMEOUT || '60000');
      const initPromise = this.client.initialize();
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('WA init timeout')), initTimeoutMs));
      await Promise.race([initPromise, timeout]);
      
    } catch (error) {
      console.error('❌ Error initializing WhatsApp Real Service:', error);
      throw error;
    }
    finally {
      this.isInitializing = false;
    }
  }

  private resolveChromePath(): string | undefined {
    // 1) Explicit env var
    if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
      return process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    // 2) Bundled Chromium from full Puppeteer (production-friendly)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const puppeteer = require('puppeteer');
      const p = puppeteer.executablePath?.();
      if (p && fs.existsSync(p)) return p;
    } catch {}
    const platform = os.platform();
    const candidates: string[] = [];
    if (platform === 'darwin') {
      candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
      candidates.push('/Applications/Chromium.app/Contents/MacOS/Chromium');
    } else if (platform === 'linux') {
      candidates.push('/usr/bin/google-chrome');
      candidates.push('/usr/bin/chromium-browser');
      candidates.push('/usr/bin/chromium');
    } else if (platform === 'win32') {
      candidates.push('C:/Program Files/Google/Chrome/Application/chrome.exe');
      candidates.push('C:/Program Files (x86)/Google/Chrome/Application/chrome.exe');
    }
    for (const p of candidates) {
      try { if (fs.existsSync(p)) return p; } catch {}
    }
    return undefined;
  }

  private cleanupSingletonLocks(dataDirRelative: string, clientId: string) {
    try {
      const sessionDir = path.resolve(process.cwd(), dataDirRelative, `session-${clientId}`);
      const candidates = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];
      for (const name of candidates) {
        const p = path.join(sessionDir, name);
        try {
          if (fs.existsSync(p)) {
            fs.rmSync(p, { force: true });
            console.log('🧹 Removed stale', name);
          }
        } catch {}
      }
    } catch {}
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('qr', async (qr) => {
      console.log('📱 QR Code received from WhatsApp Web');
      
      try {
        // Convert WhatsApp QR code to data URL for frontend display
        const qrCodeDataURL = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        this.status.qrCode = qrCodeDataURL;
        this.emit('qr', qrCodeDataURL);
        console.log('✅ QR Code generated and sent to frontend');
      } catch (error) {
        console.error('❌ Error generating QR code:', error);
      }
    });

    this.client.on('ready', () => {
      console.log('✅ WhatsApp Web is ready!');
      this.status.isConnected = true;
      this.status.qrCode = undefined;
      this.status.lastActivity = new Date();
      this.emit('ready');
    });

    this.client.on('loading_screen', (percent, message) => {
      console.log(`⏳ Loading ${percent || 0}% - ${message || ''}`);
    });

    this.client.on('change_state', (state) => {
      console.log('🔁 WA state changed:', state);
    });

    this.client.on('authenticated', () => {
      console.log('✅ WhatsApp Web authenticated');
      this.emit('authenticated');
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ WhatsApp authentication failed:', msg);
      this.status.isConnected = false;
      this.emit('auth_failure', msg);
    });

    this.client.on('disconnected', (reason) => {
      console.log('📴 WhatsApp Web disconnected:', reason);
      this.status.isConnected = false;
      this.emit('disconnected', reason);
    });

    this.client.on('message_create', async (message) => {
      if (message.fromMe) return; // Ignore messages sent by bot
      
      this.status.lastActivity = new Date();
      console.log('📨 New message received:', message.body);
      
      // Handle AI chat integration
      await this.handleIncomingMessage(message);
    });
  }

  private async handleIncomingMessage(message: Message): Promise<void> {
    try {
      const contact = await message.getContact();
      const chat = await message.getChat();
      
      // Gate: only allow approved numbers
      const msisdn = (contact.number || contact.id.user || '').replace(/[^0-9]/g, '');
      if (!msisdn) {
        await message.reply('Nomor WhatsApp tidak dikenali.');
        return;
      }
      const row = await dbGet(`SELECT status FROM whatsapp_allowed_numbers WHERE phone = ?`, [msisdn]);
      if (!row) {
        await message.reply('Nomor Anda belum terdaftar. Kirimkan nomor Anda ke admin untuk didaftarkan.');
        return;
      }
      if (row.status !== 'approved') {
        await message.reply('Nomor Anda belum disetujui oleh admin.');
        return;
      }

      // Accept both prefixed and normal messages
      const messageBody = message.body.trim();
      const isPrefixed = messageBody.toLowerCase().startsWith('/ai ') || messageBody.toLowerCase().startsWith('ai:');
      const query = isPrefixed ? messageBody.replace(/^(\/ai |ai:)/i, '').trim() : messageBody;

      if (!query) {
        await message.reply('Tulis pesan Anda setelah "/ai" atau langsung kirim pertanyaan.');
        return;
      }

      // Send typing indicator and forward to AI core
      await chat.sendStateTyping();
      const userId = await this.resolveUserIdForWhatsApp(msisdn);
      const aiResponse = await this.getAIResponse(query, userId);
      await message.reply(aiResponse);
    } catch (error) {
      console.error('❌ Error handling incoming message:', error);
    }
  }

  async connect(): Promise<void> {
    // Connection is handled by WhatsApp Web client
    // This method is kept for compatibility
    if (!this.client) {
      await this.initialize();
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      this.status.isConnected = false;
      this.status.qrCode = undefined;
      console.log('✅ WhatsApp client disconnected');
    }
  }

  async sendMessage(number: string, message: string): Promise<boolean> {
    if (!this.client || !this.status.isConnected) {
      throw new Error('WhatsApp client not connected');
    }

    try {
      const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
      await this.client.sendMessage(chatId, message);
      console.log(`✅ Message sent to ${number}: ${message}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      return false;
    }
  }

  async getChats(): Promise<any[]> {
    if (!this.client || !this.status.isConnected) {
      return [];
    }

    try {
      const chats = await this.client.getChats();
      return chats.map(chat => ({
        id: chat.id._serialized,
        name: chat.name,
        isGroup: chat.isGroup,
        lastMessage: chat.lastMessage,
        unreadCount: chat.unreadCount
      }));
    } catch (error) {
      console.error('❌ Error getting chats:', error);
      return [];
    }
  }

  getStatus(): WhatsAppStatus {
    return { ...this.status };
  }

  registerMessageHandler(id: string, handler: (message: Message) => void): void {
    this.messageHandlers.set(id, handler);
  }

  unregisterMessageHandler(id: string): void {
    this.messageHandlers.delete(id);
  }

  private async getAIResponse(query: string, userId: string): Promise<string> {
    try {
      const result = await processAIMessage(query, userId);
      return result.content || 'Maaf, tidak ada respons dari AI.';
    } catch (error) {
      console.error('Error getting AI response:', error);
      return 'Maaf, terjadi kesalahan dalam memproses pertanyaan Anda.';
    }
  }

  private async resolveUserIdForWhatsApp(msisdn: string): Promise<string> {
    // Prefer mapped user id from whatsapp_allowed_numbers
    const mapped = await dbGet(`SELECT user_id FROM whatsapp_allowed_numbers WHERE phone=?`, [msisdn]);
    if (mapped?.user_id) return mapped.user_id as string;
    // Fallback to first admin
    const admin = await dbGet(`SELECT id FROM users WHERE role='admin' ORDER BY created_at ASC LIMIT 1`);
    if (admin?.id) return admin.id as string;
    const anyUser = await dbGet(`SELECT id FROM users ORDER BY created_at ASC LIMIT 1`);
    return anyUser?.id || 'admin';
  }
}

export const whatsappRealService = new WhatsAppRealService();
export default whatsappRealService;