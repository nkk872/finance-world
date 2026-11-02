import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance World — Your World. Your Markets. Your Money.",
  description: "Global markets, business, economy and finance news with clear context and trusted sources.",
  keywords: ["finance news", "global markets", "business news", "economy", "investing"],
  openGraph: { title: "Finance World", description: "Your World. Your Markets. Your Money.", type: "website" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<Script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8542781739109040" crossOrigin="anonymous" strategy="afterInteractive" /></body></html>;
}