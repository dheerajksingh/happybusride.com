import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { APP_NAME } from "@/constants/config";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Book intercity and intracity bus tickets online",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
