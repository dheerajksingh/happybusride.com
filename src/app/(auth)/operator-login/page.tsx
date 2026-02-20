"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function OperatorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();

    if (session?.user?.role === "ADMIN") {
      router.push("/admin");
    } else if (session?.user?.role === "DRIVER") {
      router.push("/driver");
    } else {
      router.push("/operator");
    }
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Operator / Admin Login</h1>
      <p className="mb-6 text-sm text-gray-500">Sign in to your dashboard</p>

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
