import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageSquare, 
  FileText, 
  Plus, 
  Clock,
  CheckCircle,
  Smartphone
} from 'lucide-react';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { documentsAPI, aiAPI } from '@/utils/api';
import { Document, ChatSession } from '@/types';
import { formatDateTime } from '@/utils/format';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [allSessions, setAllSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docsResponse, sessionsResponse] = await Promise.all([
          documentsAPI.getAll(),
          aiAPI.getSessions()
        ]);

        if (docsResponse.data.success) {
          setAllDocuments(docsResponse.data.data); // All documents for statistics
        }

        if (sessionsResponse.data.success) {
          setAllSessions(sessionsResponse.data.data); // All sessions for statistics
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate statistics from all data
  const totalDocuments = allDocuments.length;
  const sphDocuments = allDocuments.filter(doc => doc.type === 'sph').length;
  const totalSessions = allSessions.length;
  const pendingReview = allDocuments.filter(doc => doc.status === 'generated').length;

  const stats = [
    {
      name: 'Total Dokumen',
      value: totalDocuments.toString(),
      icon: FileText,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'increase'
    },
    {
      name: 'SPH Dibuat',
      value: sphDocuments.toString(),
      icon: CheckCircle,
      color: 'bg-green-500',
      change: '+8%',
      changeType: 'increase'
    },
    {
      name: 'Chat Sessions',
      value: totalSessions.toString(),
      icon: MessageSquare,
      color: 'bg-purple-500',
      change: '+5%',
      changeType: 'increase'
    },
    {
      name: 'Pending Review',
      value: pendingReview.toString(),
      icon: Clock,
      color: 'bg-orange-500',
      change: '-2%',
      changeType: 'decrease'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'generated': return 'bg-blue-100 text-blue-800';
      case 'signed': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'generated': return 'Generated';
      case 'signed': return 'Signed';
      case 'sent': return 'Sent';
      default: return status;
    }
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
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Selamat datang kembali, {user?.username}!</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.name} className="card">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <div className="flex items-center">
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                    <span className={`ml-2 text-sm font-medium ${
                      stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Quick Actions Card */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to="/chat"
                className="flex items-center p-3 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors duration-200"
              >
                <div className="p-2 bg-primary-600 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-900">Mulai Chat dengan AI</p>
                  <p className="text-sm text-gray-600">Buat SPH atau tanya AI</p>
                </div>
              </Link>
              
              <Link
                to="/documents"
                className="flex items-center p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors duration-200"
              >
                <div className="p-2 bg-green-600 rounded-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-900">Lihat Semua Dokumen</p>
                  <p className="text-sm text-gray-600">Kelola dokumen SPH Anda</p>
                </div>
              </Link>

              <Link
                to="/whatsapp"
                className="flex items-center p-3 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors duration-200"
              >
                <div className="p-2 bg-emerald-600 rounded-lg">
                  <Smartphone className="h-5 w-5 text-white" />
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-900">WhatsApp Integration</p>
                  <p className="text-sm text-gray-600">Hubungkan AI dengan WhatsApp</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Chat Sessions */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Chat Sessions Terbaru</h2>
              <Link
                to="/chat"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Lihat Semua
              </Link>
            </div>
            <div className="space-y-3">
              {allSessions.length > 0 ? (
                allSessions.slice(0, 3).map((session) => (
                  <Link
                    key={session.id}
                    to={`/chat/${session.id}`}
                    className="block p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {session.title}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatDateTime(session.updatedAt)}
                        </p>
                      </div>
                      <MessageSquare className="h-4 w-4 text-gray-400" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-6">
                  <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Belum ada chat session</p>
                  <Link
                    to="/chat"
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Mulai chat pertama
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Documents */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Dokumen Terbaru</h2>
            <Link
              to="/documents"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Lihat Semua
            </Link>
          </div>
          
          {allDocuments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dokumen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allDocuments.slice(0, 5).map((document) => (
                    <tr key={document.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/documents/${document.id}`}
                          className="text-primary-600 hover:text-primary-900 font-medium"
                        >
                          {document.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {document.type.toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(document.status)}`}>
                          {getStatusLabel(document.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(document.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">Belum ada dokumen</p>
              <Link
                to="/chat"
                className="btn-primary inline-flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Buat SPH Pertama
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
