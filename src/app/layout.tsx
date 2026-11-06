import type { Metadata } from "next";
import "./globals.css";
import DemoNotice from "@/components/DemoNotice";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "vaultline. | Centralized Secrets & Encryption Management",
  description:
    "Authenticated workspace with sample vault data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" >
      <body><DemoNotice />{children}</body>
    </html>
  );
}
