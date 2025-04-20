// app/layout.tsx
import { Geist, Geist_Mono } from "next/font/google";
import './globals.css';
import { Auth0Provider } from "@auth0/nextjs-auth0";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { Container } from "reactstrap";
import { TokenProvider } from "../../contexts/TokenContext";
import AppWrapper from "../../contexts/AppWrapper";
import { Suspense } from "react";


const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "Church Management",
  description: "Church Management to manage all the aspects of a mainstream church",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
   
      <body>
        <Auth0Provider>
          <TokenProvider>

          <main id="app" className="d-flex flex-column h-100" data-testid="layout">
            <NavBar />
            {/* <Container className="flex-grow-1 mt-5">{children}</Container> */}
            <Suspense fallback={<div>Loading church details...</div>}>{children}</Suspense> 
            <Footer />
          </main>

          </TokenProvider>
        </Auth0Provider>
      </body>
    </html>
  );
}
