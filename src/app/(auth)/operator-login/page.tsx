"use client";

import { useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin",
  DRIVER: "/driver",
  OPERATOR: "/operator",
};

export default function OperatorLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState<{ name?: string; email?: string; role?: string } | null>(null);

  // Show who is already signed in on this device, if anyone.
  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((s) => setCurrent(s?.user ?? null))
      .catch(() => {});
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    // Determine where to redirect based on session role
    const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
    const session = await sessionRes.json();

    window.location.href = ROLE_HOME[session?.user?.role as string] ?? "/operator";
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Operator / Admin Login</h1>
      <p className="mb-6 text-sm text-gray-500">Sign in to your dashboard</p>

      {current && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <p>
            Signed in as <span className="font-semibold">{current.name ?? current.email}</span>
            {current.role && <span className="text-blue-500"> ({current.role.toLowerCase()})</span>}
          </p>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => { window.location.href = ROLE_HOME[current.role ?? ""] ?? "/"; }}
              className="text-xs font-medium text-blue-700 underline"
            >
              Continue as {current.name ?? "this user"}
            </button>
            <button
              type="button"
              onClick={async () => { await signOut({ redirect: false }); setCurrent(null); }}
              className="text-xs font-medium text-red-600 underline"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="operator@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" loading={loading} className="w-full">
          Sign In
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Passenger?{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          Login with OTP
        </Link>
      </p>

      <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
        <p className="font-semibold">Demo credentials:</p>
        <p>Admin: admin@demo.com / Admin1234!</p>
        <p>Operator: operator@demo.com / Demo1234!</p>
        <p>Driver: driver@demo.com / Demo1234!</p>
      </div>
    </div>
  );
}
