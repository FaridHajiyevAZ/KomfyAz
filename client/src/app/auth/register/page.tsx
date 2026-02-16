'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    phone: '',
    password: '',
    firstName: '',
    lastName: '',
    consent: false,
  });
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrors([]);
    setLoading(true);

    const payload: Record<string, any> = {
      password: form.password,
      consent: form.consent,
    };
    if (form.email) payload.email = form.email;
    if (form.phone) payload.phone = form.phone;
    if (form.firstName) payload.firstName = form.firstName;
    if (form.lastName) payload.lastName = form.lastName;

    try {
      const { data } = await api.post('/auth/register', payload);
      if (data.success) {
        const identifier = form.email || form.phone;
        router.push(`/auth/verify?identifier=${encodeURIComponent(identifier)}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed.');
      setErrors(err.response?.data?.details || []);
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (field: string) => errors.find((e) => e.field === field)?.message;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-brand-700">KomfyAz</Link>
          <p className="mt-2 text-gray-600">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
              placeholder="you@example.com"
            />
            {fieldError('email') && <p className="mt-1 text-xs text-red-600">{fieldError('email')}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input-field"
              placeholder="+994501234567"
            />
            {fieldError('phone') && <p className="mt-1 text-xs text-red-600">{fieldError('phone')}</p>}
          </div>

          <p className="text-xs text-gray-500">Provide at least one: email or phone number.</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-field"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Min 8 chars, 1 uppercase, 1 lowercase, 1 number.</p>
            {fieldError('password') && <p className="mt-1 text-xs text-red-600">{fieldError('password')}</p>}
          </div>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => setForm({ ...form, consent: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
              required
            />
            <span className="text-sm text-gray-600">
              I consent to KomfyAz processing my personal data for warranty registration and after-sales support.
            </span>
          </label>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-brand-600 hover:text-brand-700 font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
