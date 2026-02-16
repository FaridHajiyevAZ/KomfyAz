'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/hooks/useAuth';
import { clsx } from 'clsx';

const customerNav = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'My Products', href: '/dashboard/products' },
  { name: 'Warranty', href: '/dashboard/warranty' },
  { name: 'Support', href: '/dashboard/support' },
];

const adminNav = [
  { name: 'Overview', href: '/admin' },
  { name: 'Registrations', href: '/admin/registrations' },
  { name: 'Tickets', href: '/admin/tickets' },
  { name: 'Users', href: '/admin/users' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const navItems = isAdmin ? adminNav : customerNav;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href={isAdmin ? '/admin' : '/dashboard'} className="text-xl font-bold text-brand-700">
                KomfyAz
              </Link>
              <nav className="hidden md:flex gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      pathname === item.href
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    )}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user?.firstName || user?.email || 'User'}
              </span>
              {isAdmin && (
                <span className="badge bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20">
                  Admin
                </span>
              )}
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
