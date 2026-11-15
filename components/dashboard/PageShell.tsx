/** Shared frame for dashboard pages: title, one-line summary, content. */
export default function PageShell({
  title,
  summary,
  action,
  children,
}: {
  title: string;
  summary: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8 md:px-10 md:py-12">
      <header className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.9rem,3.4vw,2.75rem)] font-medium leading-none tracking-[-0.03em]">
            {title}
          </h1>
          <p className="mt-3 max-w-[60ch] text-[15px] text-mist">{summary}</p>
        </div>
        {action}
      </header>
      <div
        className="rise mt-10"
        style={{ "--d": "0.12s" } as React.CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}
