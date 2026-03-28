import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wood ERP",
  description: "Yog'och savdo tizimi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
