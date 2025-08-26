"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Types should mirror backend `UserRead` (id is UUID, plus timestamps)
type User = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: User[]) => {
        if (!cancelled) setUsers(data);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-black">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-16">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Users
            </h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              Roster of players in the Gamblor league.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50/60 dark:bg-slate-800/40">
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Created</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {error && (
                  <tr>
                    <td colSpan={3} className="p-6 text-red-600 dark:text-red-400">
                      {error}
                    </td>
                  </tr>
                )}
                {!users && !error && (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                )}
                {users && users.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-6 text-slate-500 dark:text-slate-400">
                      No users yet.
                    </td>
                  </tr>
                )}
                {users &&
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <Td>{u.name}</Td>
                      <Td className="text-slate-600 dark:text-slate-400">{u.email}</Td>
                      <Td className="text-slate-600 dark:text-slate-400">
                        {new Date(u.created_at).toLocaleString()}
                      </Td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          <p>
            To wire up the API, replace the placeholder in <code>useEffect</code> with
            a <code>fetch("/api/users")</code> or your backend URL.
          </p>
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-6 py-4 text-sm text-slate-900 dark:text-slate-100 ${className}`}>{children}</td>;
}

function SkeletonRow() {
  return (
    <tr>
      <td className="px-6 py-4">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </td>
    </tr>
  );
}
