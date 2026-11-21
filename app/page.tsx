import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Handles from "@/components/Handles";
import Steps from "@/components/Steps";
import Pricing from "@/components/Pricing";
import TrialForm from "@/components/TrialForm";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Handles />
        <Steps />
        <Pricing />
        <TrialForm />
      </main>
      <Footer />
    </>
  );
}
