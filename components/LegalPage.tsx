import Nav from "./Nav";
import Footer from "./Footer";

export default function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <main className="mx-auto min-h-[70vh] max-w-[44rem] px-5 pb-24 pt-36 md:px-8">
        <h1 className="rise text-[clamp(2rem,4.2vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.03em]">
          {title}
        </h1>
        <div
          className="rise mt-8 space-y-5 text-[17px] leading-relaxed text-mist"
          style={{ "--d": "0.12s" } as React.CSSProperties}
        >
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
