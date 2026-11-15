"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/admin";

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace(next);
      } else {
        setError("Wrong password.");
        setPassword("");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FEFCF7] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-xl shadow-teal-100 text-3xl mx-auto mb-4">
            ✈️
          </div>
          <h1 className="font-serif font-bold text-teal-800 text-xl">TheTravelGram</h1>
          <p className="text-slate-400 text-sm mt-1">Admin access</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <label className="block text-sm font-medium text-slate-600 mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
            placeholder="Enter admin password"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all mb-4"
          />
          {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-teal-200 text-sm"
          >
            {loading ? "Checking…" : "Enter →"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-300 mt-6">
          thetravelgram.in · Private
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
