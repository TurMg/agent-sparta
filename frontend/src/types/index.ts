export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface SPHData {
  customerName: string;
  sphDate: string;
  services: ServiceItem[];
  notes?: string;
  attachments?: string[];
}

export interface ServiceItem {
  serviceName: string;
  connectionCount: number;
  psbFee: number;
  monthlyFeeNormal: number;
  monthlyFeeDiscount: number;
  discountPercentage?: number;
}

export interface Document {
  id: string;
  type: 'sph' | 'contract' | 'invoice';
  title: string;
  status: 'draft' | 'generated' | 'signed' | 'sent';
  filePath?: string;
  createdAt: string;
  updatedAt: string;
  content?: string; 
  data?: any;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: any;
  timestamp: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string[];
  warnings?: string[];
}

export interface SignatureResponse {
  success: boolean;
  signatureUrl: string;
  base64Data: string;
  name: string;
  title: string;
}
