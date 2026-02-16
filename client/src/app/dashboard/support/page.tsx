'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import api from '@/lib/api';
import type { SupportTicket } from '@/types';

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function loadTickets() {
    try {
      const { data } = await api.get('/support/tickets');
      setTickets(data.data || []);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTickets(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/support/tickets', { subject: newSubject, body: newBody });
      setShowNew(false);
      setNewSubject('');
      setNewBody('');
      await loadTickets();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Support</h1>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary text-sm">
          {showNew ? 'Cancel' : 'New Ticket'}
        </button>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className="card mb-6 space-y-4">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="input-field"
              placeholder="Brief description of your issue"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              className="input-field min-h-[120px]"
              placeholder="Describe your issue in detail..."
              required
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Creating...' : 'Create Ticket'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-200 rounded"></div>)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No support tickets yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Link key={t.id} href={`/dashboard/support/${t.id}`} className="card block hover:ring-brand-200 hover:ring-2 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{t.subject}</div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {new Date(t.createdAt).toLocaleDateString()}
                    {t._count && ` \u00B7 ${t._count.messages} messages`}
                  </div>
                </div>
                <StatusBadge status={t.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
