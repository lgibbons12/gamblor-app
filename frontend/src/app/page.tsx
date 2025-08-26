'use client';

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function Home() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-black">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-200/30 via-transparent to-transparent dark:from-emerald-400/10" />

      {/* Header */}
      <header className="relative mx-auto max-w-6xl px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Gamblor</h1>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {user.avatar_url && (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="h-8 w-8 rounded-full"
                    />
                  )}
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {user.name}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-white/60 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm backdrop-blur dark:border-emerald-400/20 dark:bg-emerald-950/30 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Welcome to Gamblor
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl dark:text-white">
              Baseball picks with style
            </h1>
            <p className="max-w-prose text-slate-600 dark:text-slate-300">
              Track your crew’s MLB picks, standings, and bragging rights. Simple, fast, and made for the clubhouse.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/users"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                View Users
              </Link>
              <a
                href="#learn-more"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                Learn more
              </a>
            </div>
          </div>

          <div className="relative mx-auto max-w-md lg:max-w-none">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Today’s Lines</p>
                  <p className="text-xl font-semibold text-slate-900 dark:text-white">Yankees vs. Red Sox</p>
                </div>
                <Image src="/globe.svg" alt="Baseball" width={36} height={36} className="opacity-80 dark:invert" />
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Spread</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">NYY -1.5</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Moneyline</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">BOS +125</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="text-xs uppercase tracking-wide text-slate-500">O/U</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">8.5</p>
                </div>
              </div>
              <div className="mt-6 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 p-4 text-white">
                <p className="text-sm opacity-90">Gamblor Tip</p>
                <p className="text-lg font-semibold">Track your picks and standings with one click.</p>
              </div>
            </div>
          </div>
        </div>

        <section id="learn-more" className="mt-20 grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pick Tracking</p>
            <p className="mt-2 text-slate-800 dark:text-slate-200">Log daily picks and see who’s hot.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Standings</p>
            <p className="mt-2 text-slate-800 dark:text-slate-200">Live leaderboard with streaks and ROI.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Clubhouse</p>
            <p className="mt-2 text-slate-800 dark:text-slate-200">Keep it friendly, keep it competitive.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

