import type { Metadata } from "next";
import AuthCard from "@/components/AuthCard";

export const metadata: Metadata = { title: "Log in | NovaAI" };

export default function Page() {
  return <AuthCard mode="login" />;
}
