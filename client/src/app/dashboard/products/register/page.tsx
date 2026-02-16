'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import type { MattressModel, PurchaseSource } from '@/types';

export default function RegisterProductPage() {
  const router = useRouter();
  const [models, setModels] = useState<MattressModel[]>([]);
  const [sources, setSources] = useState<PurchaseSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    mattressModelId: '',
    purchaseSourceId: '',
    purchaseDate: '',
    receivedUndamaged: false,
    infoAccurate: false,
  });
  const [files, setFiles] = useState<FileList | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [modRes, srcRes] = await Promise.all([
          api.get('/products/models'),
          api.get('/products/sources'),
        ]);
        setModels(modRes.data.data);
        setSources(srcRes.data.data);
      } catch {
        setError('Failed to load product data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!files || files.length < 2) {
      setError('Please upload at least 2 photos (mattress label + invoice).');
      setSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append('mattressModelId', form.mattressModelId);
    formData.append('purchaseSourceId', form.purchaseSourceId);
    formData.append('purchaseDate', form.purchaseDate);
    formData.append('receivedUndamaged', String(form.receivedUndamaged));
    formData.append('infoAccurate', String(form.infoAccurate));

    for (let i = 0; i < files.length; i++) {
      formData.append('photos', files[i]);
    }

    try {
      const { data } = await api.post('/products/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.success) {
        router.push('/dashboard?registered=true');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Register Your Product</h1>
        <p className="text-gray-600 mb-6">
          Submit your mattress details to activate your warranty.
        </p>

        <form onSubmit={handleSubmit} className="card space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mattress Model</label>
            <select
              value={form.mattressModelId}
              onChange={(e) => setForm({ ...form, mattressModelId: e.target.value })}
              className="input-field"
              required
            >
              <option value="">Select a model...</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.warrantyMonths / 12} year warranty)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Source</label>
            <select
              value={form.purchaseSourceId}
              onChange={(e) => setForm({ ...form, purchaseSourceId: e.target.value })}
              className="input-field"
              required
            >
              <option value="">Select where you purchased...</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
            <input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Photos
            </label>
            <p className="text-xs text-gray-500 mb-2">
              At least 2 required: (1) mattress label/tag, (2) invoice or proof of purchase. Max 5 files, 10MB each.
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
              required
            />
            {files && (
              <p className="mt-2 text-xs text-gray-500">
                {files.length} file(s) selected
              </p>
            )}
          </div>

          <div className="space-y-3 border-t pt-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.receivedUndamaged}
                onChange={(e) => setForm({ ...form, receivedUndamaged: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                required
              />
              <span className="text-sm text-gray-600">
                I confirm that the product was received undamaged.
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.infoAccurate}
                onChange={(e) => setForm({ ...form, infoAccurate: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                required
              />
              <span className="text-sm text-gray-600">
                I confirm that all information provided is accurate and truthful.
              </span>
            </label>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Submitting...' : 'Register Product & Activate Warranty'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
