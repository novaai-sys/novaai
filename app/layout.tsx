import type { Metadata } from "next";
import "@fontsource-variable/instrument-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "NovaAI: every Google review answered",
  description:
    "NovaAI watches your Google Business Profile and replies to reviews in your tone and in the customer's language. Happy reviews go out on their own; unhappy ones wait for your approval.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen overflow-x-hidden">{children}</body>
    </html>
  );
}
