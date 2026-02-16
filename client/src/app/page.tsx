import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <header className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
        <div className="text-2xl font-bold text-brand-700">KomfyAz</div>
        <nav className="flex items-center gap-4">
          <Link href="/auth/login" className="btn-secondary">
            Log In
          </Link>
          <Link href="/auth/register" className="btn-primary">
            Register
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          Activate Your Warranty
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
          Register your KomfyAz mattress to activate your warranty and access
          after-sales support. It only takes a few minutes.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link href="/auth/register" className="btn-primary text-base px-6 py-3">
            Register Your Product
          </Link>
          <Link href="/auth/login" className="text-sm font-semibold leading-6 text-gray-900 hover:text-brand-600">
            Already registered? Log in &rarr;
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="card text-left">
            <div className="text-brand-600 font-semibold text-lg mb-2">1. Register</div>
            <p className="text-gray-600 text-sm">
              Create your account with email or phone number and verify your identity.
            </p>
          </div>
          <div className="card text-left">
            <div className="text-brand-600 font-semibold text-lg mb-2">2. Add Product</div>
            <p className="text-gray-600 text-sm">
              Enter your mattress details, upload photos of your label and invoice.
            </p>
          </div>
          <div className="card text-left">
            <div className="text-brand-600 font-semibold text-lg mb-2">3. Warranty Active</div>
            <p className="text-gray-600 text-sm">
              Once verified, your warranty is activated. Access support anytime.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
