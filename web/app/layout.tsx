import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Stock Volume Alert", description: "Personal stock-volume watchlist" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
