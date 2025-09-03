import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Download, 
  Eye, 
  Trash2, 
  Plus,
  Search,
  MoreVertical
} from 'lucide-react';
import { Menu } from '@headlessui/react';
import Layout from '@/components/Layout';
import LoadingSpinner from '@/components/LoadingSpinner';
import { documentsAPI } from '@/utils/api';
import { Document } from '@/types';
import { formatDateTime } from '@/utils/format';
import toast from 'react-hot-toast';

const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm, statusFilter, typeFilter]);

  const loadDocuments = async () => {
    try {
      const response = await documentsAPI.getAll();
      if (response.data.success) {
        setDocuments(response.data.data);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Gagal memuat dokumen');
    } finally {
      setIsLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.type === typeFilter);
    }

    setFilteredDocuments(filtered);
  };

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) {
      return;
    }

    try {
      const response = await documentsAPI.delete(documentId);
      if (response.data.success) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        toast.success('Dokumen berhasil dihapus');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Gagal menghapus dokumen');
    }
  };

  const updateDocumentStatus = async (documentId: string, newStatus: string) => {
    try {
      const response = await documentsAPI.updateStatus(documentId, newStatus);
      if (response.data.success) {
        setDocuments(prev =>
          prev.map(doc =>
            doc.id === documentId ? { ...doc, status: newStatus as any } : doc
          )
        );
        toast.success('Status dokumen berhasil diupdate');
      }
    } catch (error) {
      console.error('Error updating document status:', error);
      toast.error('Gagal mengupdate status dokumen');
    }
  };

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dokumen</h1>
              <p className="text-gray-600">Kelola semua dokumen SPH Anda</p>
            </div>
            <Link
              to="/chat"
              className="btn-primary inline-flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Buat SPH Baru
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4 lg:space-y-0 lg:flex lg:items-center lg:space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari dokumen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="generated">Generated</option>
            <option value="signed">Signed</option>
            <option value="sent">Sent</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">Semua Tipe</option>
            <option value="sph">SPH</option>
            <option value="contract">Contract</option>
            <option value="invoice">Invoice</option>
          </select>
        </div>

        {/* Documents Grid */}
        {filteredDocuments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((document) => (
              <div key={document.id} className="card hover:shadow-md transition-shadow duration-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <FileText className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(document.status)}`}>
                        {getStatusLabel(document.status)}
                      </span>
                    </div>
                  </div>
                  
                  <Menu as="div" className="relative">
                    <Menu.Button className="p-1 hover:bg-gray-100 rounded">
                      <MoreVertical className="h-4 w-4 text-gray-500" />
                    </Menu.Button>
                    <Menu.Items className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <div className="py-1">
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to={`/documents/${document.id}`}
                              className={`${active ? 'bg-gray-100' : ''} flex items-center px-4 py-2 text-sm text-gray-700`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Lihat
                            </Link>
                          )}
                        </Menu.Item>
                        
                        {document.filePath && (
                          <Menu.Item>
                            {({ active }) => (
                              <a
                                href={document.filePath}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${active ? 'bg-gray-100' : ''} flex items-center px-4 py-2 text-sm text-gray-700`}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </a>
                            )}
                          </Menu.Item>
                        )}
                        
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => updateDocumentStatus(document.id, 'signed')}
                              disabled={document.status === 'signed'}
                              className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700 disabled:opacity-50`}
                            >
                              Mark as Signed
                            </button>
                          )}
                        </Menu.Item>
                        
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => deleteDocument(document.id)}
                              className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-red-600`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Hapus
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Menu>
                </div>
                
                <Link to={`/documents/${document.id}`} className="block">
                  <h3 className="font-semibold text-gray-900 mb-2 hover:text-primary-600 transition-colors duration-200">
                    {document.title}
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Tipe: {document.type.toUpperCase()}</p>
                    <p>Dibuat: {formatDateTime(document.createdAt)}</p>
                    <p>Diupdate: {formatDateTime(document.updatedAt)}</p>
                  </div>
                </Link>
                
                <div className="mt-4 flex items-center space-x-2">
                  <Link
                    to={`/documents/${document.id}`}
                    className="flex-1 btn-secondary text-center text-sm py-2"
                  >
                    <Eye className="h-4 w-4 inline mr-1" />
                    Lihat
                  </Link>
                  
                  {document.filePath && (
                    <a
                      href={document.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary text-sm py-2 px-3"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {documents.length === 0 ? 'Belum ada dokumen' : 'Tidak ada dokumen yang cocok'}
            </h3>
            <p className="text-gray-600 mb-6">
              {documents.length === 0 
                ? 'Mulai dengan membuat SPH pertama Anda'
                : 'Coba ubah filter pencarian Anda'
              }
            </p>
            {documents.length === 0 && (
              <Link
                to="/chat"
                className="btn-primary inline-flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Buat SPH Pertama
              </Link>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DocumentsPage;
