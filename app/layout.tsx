import type { Metadata } from "next";
import "@fontsource-variable/instrument-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "NovaAI: AI dispatcher for HVAC and plumbing shops",
  description:
    "Jessica, NovaAI's AI dispatcher, answers the calls you miss 24/7, books the job, handles emergencies safely and texts you the details. Try her free for 14 days.",
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
