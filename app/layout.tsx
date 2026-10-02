import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Playground",
  description: "Component playground",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-page font-sans text-ink dark:bg-page-dark dark:text-ink-dark">
        {children}
      </body>
    </html>
  );
}
