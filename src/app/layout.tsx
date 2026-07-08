import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ReactQueryProvider from "@/providers/query-client-provider";
import PostHogProvider from "@/components/PostHogProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const metadataBase = (() => {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL || "https://apk-hazel.vercel.app";
  try {
    return new URL(rawUrl);
  } catch {
    return new URL("https://apk-hazel.vercel.app");
  }
})();

export const metadata: Metadata = {
  metadataBase,
  title: "IPL Dhaba - Indian Prime Line | Sixer Flavours!",
  description: "IPL Dhaba (Indian Prime Line) - Where Flavours Hit Like a Six! Enjoy tasty and healthy Veg & Non-Veg curries, biryani, and starters.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IPL Dhaba",
  },
  openGraph: {
    title: "IPL Dhaba - Indian Prime Line",
    description: "Where Flavours Hit Like a Six! Order tasty and healthy Indian food online.",
    images: ["/logo.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="antialiased selection:bg-saffron selection:text-white">
        <PostHogProvider>
          <ReactQueryProvider>
            {children}
          </ReactQueryProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
