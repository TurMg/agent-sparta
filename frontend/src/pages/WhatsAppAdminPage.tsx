import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { whatsappAPI } from '@/utils/api';
import { CheckCircle, XCircle, RefreshCw, Phone, UserPlus } from 'lucide-react';

interface AllowedNumber {
  id: string;
  phone: string;
  display_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

const WhatsAppAdminPage: React.FC = () => {
  const [numbers, setNumbers] = useState<AllowedNumber[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ phone: '', name: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await whatsappAPI.getNumbers();
      if (res.data.success) setNumbers(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone) return;
    setSubmitting(true);
    try {
      await whatsappAPI.register(form.phone.replace(/[^0-9]/g, ''), form.name || undefined);
      setForm({ phone: '', name: '' });
      await load();
      alert('Registered. Awaiting approval.');
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to register');
    } finally {
      setSubmitting(false);
    }
  };

  const onApprove = async (phone: string) => {
    await whatsappAPI.approve(phone);
    await load();
  };

  const onReject = async (phone: string) => {
    await whatsappAPI.reject(phone);
    await load();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">WhatsApp Access Management</h1>
            <p className="text-gray-600">Register, review, and approve phone numbers that can use AI via WhatsApp.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border rounded-lg p-6 lg:col-span-1">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5" /> Register Phone
              </h2>
              <form onSubmit={onRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone (with country code)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="62812xxxxxxx"
                      className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name (optional)</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="User name"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || !form.phone}
                  className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Register
                </button>
              </form>
            </div>

            <div className="bg-white border rounded-lg p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Registered Numbers</h2>
                <button onClick={load} className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
              <div className="divide-y border rounded-lg">
                {numbers.length === 0 && (
                  <div className="p-6 text-center text-gray-500">No numbers yet</div>
                )}
                {numbers.map((n) => (
                  <div key={n.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{n.phone}</div>
                      <div className="text-sm text-gray-500">{n.display_name || '—'} • {n.status}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {n.status !== 'approved' && (
                        <button onClick={() => onApprove(n.phone)} className="px-3 py-1 bg-green-600 text-white rounded-lg flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                      )}
                      {n.status !== 'rejected' && (
                        <button onClick={() => onReject(n.phone)} className="px-3 py-1 bg-red-600 text-white rounded-lg flex items-center gap-1">
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default WhatsAppAdminPage;


