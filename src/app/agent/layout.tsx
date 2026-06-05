"use client";

import { usePathname } from "next/navigation";
import { AgentSidebar } from "@/components/layout/AgentSidebar";

const AUTH_PATHS = ["/agent/login", "/agent/register"];

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (AUTH_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AgentSidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
