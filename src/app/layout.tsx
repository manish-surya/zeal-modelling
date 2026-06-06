import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zeal Modelling — Build, Train, and Export Real ML Models",
  description:
    "Visual wizard-driven ML platform for researchers and data scientists.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
