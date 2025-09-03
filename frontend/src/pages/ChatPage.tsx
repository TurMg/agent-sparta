import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Plus, MessageSquare, Bot, User } from 'lucide-react';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { aiAPI } from '@/utils/api';
import { ChatSession, ChatMessage } from '@/types';
import { formatDateTime } from '@/utils/format';
import toast from 'react-hot-toast';

const ChatPage: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load sessions
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await aiAPI.getSessions();
        if (response.data.success) {
          setSessions(response.data.data);
        }
      } catch (error) {
        console.error('Error loading sessions:', error);
        toast.error('Gagal memuat chat sessions');
      }
    };

    loadSessions();
  }, []);

  // Load current session and messages
  useEffect(() => {
    const loadSessionData = async () => {
      if (sessionId) {
        try {
          setIsLoading(true);
          
          // Find current session
          const session = sessions.find(s => s.id === sessionId);
          if (session) {
            setCurrentSession(session);
            
            // Load messages
            const response = await aiAPI.getMessages(sessionId);
            if (response.data.success) {
              setMessages(response.data.data);
            }
          } else {
            // Session not found, redirect to chat home
            navigate('/chat');
          }
        } catch (error) {
          console.error('Error loading session data:', error);
          toast.error('Gagal memuat chat session');
          navigate('/chat');
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    if (sessions.length > 0 || sessionId) {
      loadSessionData();
    } else if (sessions.length === 0 && !sessionId) {
      // No sessions and no sessionId, stop loading
      setIsLoading(false);
    }
  }, [sessionId, sessions, navigate]);

  const createNewSession = async () => {
    try {
      const response = await aiAPI.createSession('New Chat');
      if (response.data.success) {
        const newSession = response.data.data;
        setSessions(prev => [newSession, ...prev]);
        navigate(`/chat/${newSession.id}`);
        toast.success('Chat session baru dibuat');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Gagal membuat chat session baru');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentSession || isSending) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    try {
      const response = await aiAPI.sendMessage(currentSession.id, messageText);
      
      if (response.data.success) {
        const { userMessage, aiMessage } = response.data.data;
        setMessages(prev => [...prev, userMessage, aiMessage]);
        
        // Check if AI generated a document
        if (aiMessage.metadata?.type === 'sph_generated') {
          toast.success('SPH berhasil dibuat! Klik link untuk melihat dokumen.');
        }
      } else {
        toast.error('Gagal mengirim pesan');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Gagal mengirim pesan');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessageContent = (content: string) => {
    // Handle simple link formatting for all messages
    return (
      <div className="prose prose-sm max-w-none">
        {content.split('\n').map((line, i) => {
          // Convert URLs to clickable links
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const parts = line.split(urlRegex);
          
          if (parts.length > 1) {
            return (
              <p key={i}>
                {parts.map((part, j) => {
                  if (urlRegex.test(part)) {
                    return (
                      <a
                        key={j}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline break-all"
                      >
                        {part}
                      </a>
                    );
                  } else {
                    return part;
                  }
                })}
              </p>
            );
          }
          
          return <p key={i}>{line || <br />}</p>;
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)] bg-white">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-gray-200 bg-gray-50`}>
          <div className="p-4">
            <button
              onClick={createNewSession}
              className="w-full flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </button>
          </div>
          
          <div className="px-4 pb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Recent Chats</h3>
            <div className="space-y-2">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => navigate(`/chat/${session.id}`)}
                  className={`w-full text-left p-3 rounded-lg transition-colors duration-200 ${
                    currentSession?.id === session.id
                      ? 'bg-primary-100 text-primary-800 border border-primary-200'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="truncate text-sm font-medium">{session.title}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDateTime(session.updatedAt)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {currentSession ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <MessageSquare className="h-5 w-5" />
                    </button>
                    <div>
                      <h1 className="font-semibold text-gray-900">{currentSession.title}</h1>
                      <p className="text-sm text-gray-500">Chat dengan AI untuk membuat SPH</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="p-4 bg-primary-100 rounded-full mb-4">
                      <Bot className="h-8 w-8 text-primary-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Halo! Saya Agent AI
                    </h2>
                    <p className="text-gray-600 mb-4 max-w-md">
                      Saya siap membantu Anda membuat Surat Penawaran Harga (SPH). 
                      Silakan berikan detail pelanggan dan layanan yang ingin ditawarkan.
                    </p>
                    <div className="text-sm text-gray-500">
                      <p>Contoh: "Buatkan SPH untuk PT ABC dengan layanan internet 10 Mbps"</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-3xl ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                        <div className="flex items-start space-x-3">
                          <div className={`flex-shrink-0 ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                            <div className={`p-2 rounded-full ${
                              message.role === 'user' 
                                ? 'bg-primary-600' 
                                : 'bg-gray-200'
                            }`}>
                              {message.role === 'user' ? (
                                <User className="h-4 w-4 text-white" />
                              ) : (
                                <Bot className="h-4 w-4 text-gray-600" />
                              )}
                            </div>
                          </div>
                          <div className={`${message.role === 'user' ? 'order-1' : 'order-2'}`}>
                            <div className={`p-4 rounded-lg ${
                              message.role === 'user'
                                ? 'bg-primary-600 text-white ml-auto'
                                : 'bg-gray-100 text-gray-900'
                            }`}>
                              {formatMessageContent(message.content)}
                            </div>
                            <p className={`text-xs mt-1 ${
                              message.role === 'user' ? 'text-right text-gray-400' : 'text-gray-500'
                            }`}>
                              {formatDateTime(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ketik pesan Anda di sini..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      rows={1}
                      disabled={isSending}
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isSending}
                    className="p-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {isSending ? (
                      <LoadingSpinner size="sm" className="text-white" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Tekan Enter untuk mengirim, Shift+Enter untuk baris baru
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Pilih Chat Session
                </h2>
                <p className="text-gray-600 mb-4">
                  Pilih chat session yang ada atau buat yang baru
                </p>
                <button
                  onClick={createNewSession}
                  className="btn-primary inline-flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Mulai Chat Baru
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ChatPage;
