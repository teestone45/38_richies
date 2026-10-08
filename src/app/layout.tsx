import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import SiteHeader from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "38 RICHES | Built Different",
  description: "Premium heavyweight streetwear. Made to move different.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="announcement">Complimentary Ghana shipping on orders over GH₵100</div>
        <SiteHeader />
        {children}
        <Link className="order-track-float" href="/track" aria-label="Track your order">
          <span className="order-track-float__icon" aria-hidden="true">↗</span>
          <span className="order-track-float__label"><small>ORDER STATUS</small><strong>Track order</strong></span>
        </Link>
      </body>
    </html>
  );
}
