import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Wood ERP - Yog'och savdo tizimi",
  description: "Rossiya-O'zbekiston yog'och savdo ERP tizimi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body className={`${geistSans.variable} font-sans antialiased bg-slate-50`}>
        {children}
      </body>
    </html>
  );
}
