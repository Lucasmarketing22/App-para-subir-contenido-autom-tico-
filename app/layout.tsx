import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { AppProvider } from "@/lib/app-context";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "My Work OS — Global AI Automation Tool",
  description: "Internal AI workspace for Social Media, Local SEO, Paid Media and Sales — any country, language and currency.",
};

export const viewport: Viewport = { themeColor: "#0f0f12", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="font-sans">
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
        <Toaster theme="dark" position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
