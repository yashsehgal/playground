import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Playground",
  description: "Component playground",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-white font-sans text-ink">{children}</body>
    </html>
  );
}
