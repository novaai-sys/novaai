import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Rules from "@/components/Rules";
import Languages from "@/components/Languages";
import Steps from "@/components/Steps";
import Pricing from "@/components/Pricing";
import Cta from "@/components/Cta";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Rules />
        <Languages />
        <Steps />
        <Pricing />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
