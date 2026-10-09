import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { getSiteUrl } from "@/lib/site-url";
import SiteHeader from "@/components/site-header";
import SupportChat from "@/components/support-chat";
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
  metadataBase: getSiteUrl(),
  title: {
    default: "38 RICHES | Premium Streetwear Clothing Brand in Ghana",
    template: "%s | 38 RICHES Clothing",
  },
  description: "Discover 38 RICHES, a Ghanaian streetwear brand offering oversized T-shirts, hoodies, jeans, and premium urban fashion. Explore our latest collections online.",
  applicationName: "38 RICHES",
  keywords: ["38 RICHES", "38 Richies clothing", "38richiesclothing", "38 richies clothng", "Ghana streetwear", "oversized T-shirts Ghana", "premium urban fashion", "Ghanaian fashion", "Accra clothing brand"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_GH",
    siteName: "38 RICHES Clothing",
    title: "38 RICHES | Premium Streetwear Clothing Brand in Ghana",
    description: "Discover 38 RICHES, a Ghanaian streetwear brand offering oversized T-shirts, hoodies, jeans, and premium urban fashion. Explore our latest collections online.",
    url: "/",
    images: [{ url: "/images/38-richies-embroidered.svg", alt: "38 RICHIES embroidered clothing emblem" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "38 RICHES | Premium Streetwear Clothing Brand in Ghana",
    description: "Discover 38 RICHES, a Ghanaian streetwear brand offering oversized T-shirts, hoodies, jeans, and premium urban fashion. Explore our latest collections online.",
    images: ["/images/38-richies-embroidered.svg"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
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
        <SupportChat />
        <Link className="order-track-float" href="/track" aria-label="Track your order">
          <span className="order-track-float__icon" aria-hidden="true">↗</span>
          <span className="order-track-float__label"><small>ORDER STATUS</small><strong>Track order</strong></span>
        </Link>
      </body>
    </html>
  );
}
