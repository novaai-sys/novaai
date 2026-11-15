import type { Metadata } from "next";
import Board from "@/components/dashboard/Board";

export const metadata: Metadata = { title: "Reviews | NovaAI" };

export default function DashboardPage() {
  return <Board />;
}
