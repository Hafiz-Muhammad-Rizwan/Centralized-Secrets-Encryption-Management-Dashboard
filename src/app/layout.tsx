import type { Metadata } from "next";
import "./globals.css";
import DemoNotice from "@/components/DemoNotice";

export const metadata: Metadata = {
  title: "vaultline. | Centralized Secrets & Encryption Management",
  description:
    "Public UI demonstration with sample data. Not a real secrets manager.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" >
      <body><DemoNotice />{children}</body>
    </html>
  );
}
