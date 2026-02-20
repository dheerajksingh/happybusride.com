import { APP_NAME } from "@/constants/config";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <Link href="/" className="mb-8 flex items-center gap-2 text-2xl font-bold text-blue-600">
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17 5H3a2 2 0 00-2 2v9a1 1 0 001 1h1a2 2 0 004 0h8a2 2 0 004 0h1a1 1 0 001-1V9l-4-4zM3 11V7h10v4H3zm12 1.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-12 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm12-5.5V7l2.55 4H15V7z" />
        </svg>
        {APP_NAME}
      </Link>
      {children}
    </div>
  );
}
