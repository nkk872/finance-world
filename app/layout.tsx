import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance World — Your World. Your Markets. Your Money.",
  description: "Global markets, business, economy and finance news with clear context and trusted sources.",
  keywords: ["finance news", "global markets", "business news", "economy", "investing"],
  openGraph: { title: "Finance World", description: "Your World. Your Markets. Your Money.", type: "website" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}