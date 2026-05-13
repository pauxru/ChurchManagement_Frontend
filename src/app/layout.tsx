// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import './globals.css';
import AppWrapper from '../../contexts/AppWrapper'; // Import the AppWrapper component

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://aipca.co.ke"),
  title: {
    default: "AIPCA · Gatundu Diocese",
    template: "%s · AIPCA Gatundu",
  },
  description: "AIPCA Gatundu Diocese — manage local churches, plans, finances, and announcements across the diocese.",
  openGraph: {
    type: "website",
    siteName: "AIPCA Gatundu Diocese",
    title: "AIPCA · Gatundu Diocese",
    description: "AIPCA Gatundu Diocese — manage local churches, plans, finances, and announcements across the diocese.",
    images: ["/og-image.svg"],
    locale: "en_KE",
  },
  twitter: {
    card: "summary_large_image",
    title: "AIPCA · Gatundu Diocese",
    description: "AIPCA Gatundu Diocese — manage local churches, plans, finances, and announcements across the diocese.",
    images: ["/og-image.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppWrapper>{children}</AppWrapper>
      </body>
    </html>
  );
}
