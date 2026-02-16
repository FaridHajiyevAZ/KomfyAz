'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import api from '@/lib/api';

interface Registration {
  id: string;
  registrationStatus: string;
  purchaseDate: string;
  createdAt: string;
  user: { id: string; email: string | null; phone: string | null; firstName: string | null; lastName: string | null };
  mattressModel: { name: string };
  purchaseSource: { name: string; type: string };
  warranty: { status: string; startDate: string | null; endDate: string | null } | null;
  _count: { adminNotes: number };
}

function RegistrationsContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || '';
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await api.get(`/admin/registrations?${params}`);
      setRegistrations(data.data || []);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter]);

  const handleAction = async (id: string, status: string, reason?: string) => {
    setActionLoading(true);
    try {
      await api.patch(`/admin/registrations/${id}/status`, { status, reason });
      await load();
      setSelectedId(null);
    } catch {
      // handled
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product Registrations</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="">All Statuses</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="INFO_REQUESTED">Info Requested</option>
        </select>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-200 rounded"></div>)}
        </div>
      ) : registrations.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No registrations found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {registrations.map((r) => (
            <div key={r.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-gray-900">
                    {r.user.firstName} {r.user.lastName} &mdash; {r.mattressModel.name}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {r.user.email || r.user.phone} &middot; {r.purchaseSource.name} &middot; Purchased {new Date(r.purchaseDate).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Submitted {new Date(r.createdAt).toLocaleString()}
                    {r._count.adminNotes > 0 && ` \u00B7 ${r._count.adminNotes} notes`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.registrationStatus} />
                  {r.warranty && <StatusBadge status={r.warranty.status} />}
                </div>
              </div>

              {r.registrationStatus === 'PENDING_REVIEW' && (
                <div className="mt-4 flex gap-2 border-t pt-3">
                  <button
                    onClick={() => handleAction(r.id, 'APPROVED')}
                    disabled={actionLoading}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Reason for rejection:');
                      if (reason) handleAction(r.id, 'REJECTED', reason);
                    }}
                    disabled={actionLoading}
                    className="btn-danger text-xs px-3 py-1.5"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleAction(r.id, 'INFO_REQUESTED', 'Additional information required.')}
                    disabled={actionLoading}
                    className="btn-secondary text-xs px-3 py-1.5"
                  >
                    Request Info
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function AdminRegistrationsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="animate-pulse h-64 bg-gray-200 rounded"></div>}>
        <RegistrationsContent />
      </Suspense>
    </DashboardLayout>
  );
}
