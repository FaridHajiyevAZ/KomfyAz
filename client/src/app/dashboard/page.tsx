'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import api from '@/lib/api';
import type { ProductRegistration, SupportTicket } from '@/types';

export default function DashboardPage() {
  const [products, setProducts] = useState<ProductRegistration[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [prodRes, ticketRes] = await Promise.all([
          api.get('/products/my'),
          api.get('/support/tickets'),
        ]);
        setProducts(prodRes.data.data || []);
        setTickets(ticketRes.data.data || []);
      } catch {
        // handled by interceptor
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </DashboardLayout>
    );
  }

  const activeWarranties = products.filter((p) => p.warranty?.status === 'ACTIVE').length;
  const pendingReview = products.filter((p) => p.registrationStatus === 'PENDING_REVIEW').length;
  const openTickets = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card">
          <div className="text-sm text-gray-600">Registered Products</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{products.length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Active Warranties</div>
          <div className="text-3xl font-bold text-green-600 mt-1">{activeWarranties}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600">Open Support Tickets</div>
          <div className="text-3xl font-bold text-brand-600 mt-1">{openTickets}</div>
        </div>
      </div>

      {pendingReview > 0 && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 mb-6">
          <p className="text-sm text-yellow-800">
            You have <strong>{pendingReview}</strong> product registration(s) pending review.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Your Products</h2>
        <Link href="/dashboard/products/register" className="btn-primary text-sm">
          Register New Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No products registered yet.</p>
          <Link href="/dashboard/products/register" className="btn-primary mt-4 inline-block">
            Register Your First Product
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <Link key={p.id} href={`/dashboard/products/${p.id}`} className="card block hover:ring-brand-200 hover:ring-2 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{p.mattressModel.name}</div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    Purchased {new Date(p.purchaseDate).toLocaleDateString()} from {p.purchaseSource.name}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.registrationStatus} />
                  {p.warranty && <StatusBadge status={p.warranty.status} />}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
