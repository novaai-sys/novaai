import { Suspense } from "react";
import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import StoreGate from "@/components/dashboard/StoreGate";
import { DashboardStore } from "@/components/dashboard/Store";
import { getUser } from "@/lib/supabase/server";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The session is read at request time, so it sits behind Suspense.
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center">
          <p role="status" className="text-[15px] text-mist">
            Loading your dashboard…
          </p>
        </div>
      }
    >
      <SignedIn>{children}</SignedIn>
    </Suspense>
  );
}

/** Renders the dashboard for a signed-in user; everyone else goes to /login. */
async function SignedIn({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <DashboardStore user={{ id: user.id, email: user.email ?? "" }}>
      <div className="min-h-screen">
        <Sidebar />
        <main className="lg:pl-64">
          <StoreGate>{children}</StoreGate>
        </main>
      </div>
    </DashboardStore>
  );
}
