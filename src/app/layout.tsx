import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import DemoNotice from "@/components/DemoNotice";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "vaultline. | Centralized Secrets & Encryption Management",
  description:
    "Authenticated workspace with sample vault data.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="/password_strength_helper.js" defer></script>
      </head>
      <body><DemoNotice />{children}</body>
    </html>
  );
}
