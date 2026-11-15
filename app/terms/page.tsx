import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms | NovaAI" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms">
      <p>
        NovaAI is an early version offered free of charge so you can see how it
        works. There are no payments, no subscriptions and no credit card
        details involved.
      </p>
      <p>
        The full terms of service will be published here before the product
        launches.
      </p>
    </LegalPage>
  );
}
