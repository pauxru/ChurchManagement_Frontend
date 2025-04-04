// app/layout.tsx
import { Geist, Geist_Mono } from "next/font/google";
import './globals.css';
import AppWrapper from '../../contexts/AppWrapper'; 
import {TokenProvider } from '../../contexts/TokenContext';
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Church Management",
  description: "Church Management to manage all the aspects of a mainstream church",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <TokenProvider>
      <AppWrapper>
        <Suspense fallback={<div>Loading church details...</div>}>{children}</Suspense>
      </AppWrapper> 
      </TokenProvider>
      </body>
    </html>
  );
}