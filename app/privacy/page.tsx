import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy | NovaAI" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy">
      <p>
        NovaAI is an early version. It stores your account email, your
        business settings and the reviews and replies you add. Review text is
        sent to OpenAI to write a reply. NovaAI does not connect to Google
        yet.
      </p>
      <p>
        The full privacy policy will be published here before NovaAI connects
        to real Google Business Profile accounts.
      </p>
    </LegalPage>
  );
}
