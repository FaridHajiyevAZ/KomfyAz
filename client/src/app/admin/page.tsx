'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';

interface Stats {
  totalUsers: number;
  totalRegistrations: number;
  pendingRegistrations: number;
  activeWarranties: number;
  openTickets: number;
  registrationsByMonth: Array<{ month: string; count: number }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/admin/stats');
        setStats(data.data);
      } catch {
        // handled
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !stats) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-gray-200 rounded"></div>)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="card">
          <div className="text-sm text-gray-600">Total Customers</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{stats.totalUsers}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Total Registrations</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{stats.totalRegistrations}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Pending Review</div>
          <div className="text-3xl font-bold text-yellow-600 mt-1">{stats.pendingRegistrations}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Active Warranties</div>
          <div className="text-3xl font-bold text-green-600 mt-1">{stats.activeWarranties}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Open Tickets</div>
          <div className="text-3xl font-bold text-brand-600 mt-1">{stats.openTickets}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link href="/admin/registrations?status=PENDING_REVIEW" className="block p-3 rounded-lg bg-yellow-50 text-yellow-800 hover:bg-yellow-100 text-sm font-medium transition-colors">
              Review {stats.pendingRegistrations} pending registrations
            </Link>
            <Link href="/admin/tickets?status=OPEN" className="block p-3 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 text-sm font-medium transition-colors">
              Handle {stats.openTickets} open support tickets
            </Link>
            <Link href="/admin/users" className="block p-3 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors">
              Browse all customers
            </Link>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Registrations (Last 12 Months)</h2>
          {stats.registrationsByMonth.length === 0 ? (
            <p className="text-sm text-gray-500">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {stats.registrationsByMonth.map((item) => (
                <div key={item.month} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {new Date(item.month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                  </span>
                  <span className="font-medium text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
