import React, { useState, useEffect } from 'react';
import { MessageSquare, Smartphone, Users, Send, Wifi, WifiOff, QrCode, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import Layout from '@/components/Layout';

interface WhatsAppStatus {
  isConnected: boolean;
  qrCode?: string;
  clientInfo?: any;
  lastActivity?: string;
}

interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage: any;
  unreadCount: number;
}

const WhatsAppPage: React.FC = () => {
  const [status, setStatus] = useState<WhatsAppStatus>({ isConnected: false });
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [sendMessageForm, setSendMessageForm] = useState({ number: '', message: '' });
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    fetchStatus();
    // Ensure SSE is started so QR can stream automatically
    startEventListener();
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/whatsapp/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch status');
      
      const data = await response.json();
      setStatus(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    }
  };

  const connectWhatsApp = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to connect');
      
      // Start listening for events
      startEventListener();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  const disconnectWhatsApp = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to disconnect');
      
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
      
      setStatus({ isConnected: false });
      setChats([]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  const startEventListener = () => {
    if (eventSource) {
      eventSource.close();
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('No authentication token found');
      return;
    }

    const es = new EventSource(`/api/whatsapp/events?authorization=${token}`);
    
    es.onmessage = (event) => {
      console.log('WhatsApp event:', event);
    };

    es.addEventListener('qr', (event) => {
      const data = JSON.parse(event.data);
      setStatus(prev => ({ ...prev, qrCode: data.qrCode }));
    });

    es.addEventListener('ready', () => {
      setStatus(prev => ({ ...prev, isConnected: true, qrCode: undefined }));
      fetchChats();
    });

    es.addEventListener('disconnected', (event) => {
      JSON.parse(event.data); // Parse but don't need to use the data
      setStatus({ isConnected: false });
      setChats([]);
    });

    es.addEventListener('auth_failure', (event) => {
      const data = JSON.parse(event.data);
      setError(`Authentication failed: ${data.message}`);
      setStatus({ isConnected: false });
    });

    es.onerror = (error) => {
      console.error('EventSource error:', error);
      // Don't set error immediately, might be temporary connection issue
      console.log('SSE connection error, will retry...');
    };

    es.onopen = () => {
      console.log('SSE connection opened');
      setError(null); // Clear any previous errors
    };

    setEventSource(es);
  };

  const fetchChats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/whatsapp/chats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch chats');
      
      const data = await response.json();
      setChats(data.data);
    } catch (err) {
      console.error('Error fetching chats:', err);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendMessageForm.number || !sendMessageForm.message) return;
    
    setSendingMessage(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sendMessageForm)
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      
      setSendMessageForm({ number: '', message: '' });
      alert('Message sent successfully!');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">WhatsApp Integration</h1>
          </div>
          <p className="text-gray-600">
            Hubungkan AI dengan WhatsApp untuk memberikan layanan chat otomatis kepada pengguna.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connection Status */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Connection Status
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {status.isConnected ? (
                  <>
                    <Wifi className="w-5 h-5 text-green-600" />
                    <span className="text-green-700 font-medium">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-5 h-5 text-red-600" />
                    <span className="text-red-700 font-medium">Disconnected</span>
                  </>
                )}
              </div>

              {status.lastActivity && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Last activity: {new Date(status.lastActivity).toLocaleString()}</span>
                </div>
              )}

              <div className="flex gap-3">
                {!status.isConnected ? (
                  <div className="text-sm text-gray-600">
                    QR code tersedia di bawah untuk koneksi WhatsApp
                  </div>
                ) : (
                  <button
                    onClick={disconnectWhatsApp}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <WifiOff className="w-4 h-4" />
                    )}
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {/* QR Code */}
            {status.qrCode && !status.isConnected && (
              <div className="mt-6 p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <QrCode className="w-5 h-5 text-blue-600" />
                  <h3 className="font-medium text-gray-900">Scan QR Code</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Scan this QR code with your WhatsApp mobile app to connect.
                </p>
                <div className="bg-white p-4 rounded border text-center">
                  <img 
                    src={status.qrCode}
                    alt="WhatsApp QR Code"
                    className="mx-auto max-w-xs"
                  />
                </div>
                <div className="mt-3">
                  <button
                    onClick={connectWhatsApp}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Simulate Connection
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Send Message */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Send className="w-5 h-5" />
              Send Message
            </h2>

            <form onSubmit={sendMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={sendMessageForm.number}
                  onChange={(e) => setSendMessageForm(prev => ({ ...prev, number: e.target.value }))}
                  placeholder="e.g., 6281234567890"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={!status.isConnected}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter phone number with country code (without +)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={sendMessageForm.message}
                  onChange={(e) => setSendMessageForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Type your message here..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={!status.isConnected}
                />
              </div>

              <button
                type="submit"
                disabled={!status.isConnected || sendingMessage || !sendMessageForm.number || !sendMessageForm.message}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingMessage ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Message
              </button>
            </form>
          </div>

          {/* Chats List */}
          <div className="bg-white rounded-lg shadow-sm border p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Active Chats ({chats.length})
            </h2>

            {chats.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {status.isConnected ? 'No active chats found' : 'Connect WhatsApp to view chats'}
              </div>
            ) : (
              <div className="space-y-3">
                {chats.map((chat) => (
                  <div key={chat.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          {chat.isGroup ? (
                            <Users className="w-5 h-5 text-green-600" />
                          ) : (
                            <MessageSquare className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{chat.name || 'Unknown'}</h3>
                          <p className="text-sm text-gray-500">
                            {chat.isGroup ? 'Group Chat' : 'Direct Message'}
                          </p>
                        </div>
                      </div>
                      {chat.unreadCount > 0 && (
                        <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Instructions */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">
              🤖 How to Use AI via WhatsApp
            </h2>
            <div className="space-y-2 text-blue-800">
              <p>• Send messages starting with <code className="bg-blue-100 px-2 py-1 rounded">/ai</code> to trigger AI responses</p>
              <p>• Example: <code className="bg-blue-100 px-2 py-1 rounded">/ai What is artificial intelligence?</code></p>
              <p>• Or use <code className="bg-blue-100 px-2 py-1 rounded">AI:</code> prefix: <code className="bg-blue-100 px-2 py-1 rounded">AI: Help me with my homework</code></p>
              <p>• The AI will automatically respond to users who send messages with these triggers</p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </Layout>
  );
};

export default WhatsAppPage;
