export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest extends Request {
  user?: User;
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
  userId: string;
  type: 'sph' | 'contract' | 'invoice';
  title: string;
  content: string;
  data: any;
  status: 'draft' | 'generated' | 'signed' | 'sent';
  filePath?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: AIMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MCPToolRequest {
  tool: string;
  parameters: any;
}

export interface MCPToolResponse {
  success: boolean;
  data?: any;
  error?: string;
}
