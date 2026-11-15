"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Stars from "./Stars";

type Example = {
  author: string;
  place: string;
  rating: number;
  review: string;
  reply: string;
  /** What Nova does with the reply once it is written. */
  outcome: "published" | "approval";
};

const examples: Example[] = [
  {
    author: "Maria L.",
    place: "Atelier Levain",
    rating: 5,
    review:
      "Best pistachio croissant in the neighborhood. The line was long on Saturday but it moved fast, and the staff were lovely.",
    reply:
      "Thank you, Maria! The pistachio croissant is our baker Samir's pride, so this made his morning. We've opened a second till on weekends to keep that line moving. See you soon.",
    outcome: "published",
  },
  {
    author: "Daniel K.",
    place: "Northside Cycles",
    rating: 2,
    review:
      "Dropped my bike off for a brake service and was told two days. It took six, and nobody called to let me know.",
    reply:
      "Daniel, you're right, and I'm sorry. Six days without a call is not the service we want to give. A part arrived late, but we should have told you. Please ask for me next time and I'll look after your bike myself.",
    outcome: "approval",
  },
  {
    author: "Camille R.",
    place: "Le Petit Zinc",
    rating: 4,
    review:
      "Très bonne table, la terrasse est superbe. Un peu d'attente pour les desserts, mais ça valait le coup.",
    reply:
      "Merci Camille ! Ravis que la terrasse vous ait plu. Vous avez raison pour les desserts, nous avons renforcé l'équipe en cuisine le soir. À très bientôt.",
    outcome: "published",
  },
];

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const TYPE_MS = 16;
const START_TYPING_MS = 1300;
const HOLD_MS = 4200;
const FADE_MS = 500;

/**
 * The hero's centrepiece. A customer's review slides in from the left, Nova's
 * reply slides in from the right and types itself out, then the next example
 * takes over. Starts when it scrolls into view. With reduced motion on, the
 * first example is shown complete and nothing moves.
 */
export default function HeroDuet() {
  const root = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
  const started = inView || reduced;
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [leaving, setLeaving] = useState(false);

  const ex = examples[index];
  const done = typed >= ex.reply.length;

  // Start once the cards are actually on screen.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Type the reply for the current example.
  useEffect(() => {
    if (!started || reduced) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const wait = setTimeout(() => {
      interval = setInterval(() => setTyped((n) => n + 1), TYPE_MS);
    }, START_TYPING_MS);
    return () => {
      clearTimeout(wait);
      clearInterval(interval);
    };
  }, [started, reduced, index]);

  // Once typed: hold, fade out, move on.
  useEffect(() => {
    if (!started || reduced || !done) return;
    const hold = setTimeout(() => setLeaving(true), HOLD_MS);
    const next = setTimeout(() => {
      setIndex((i) => (i + 1) % examples.length);
      setTyped(0);
      setLeaving(false);
    }, HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(hold);
      clearTimeout(next);
    };
  }, [started, reduced, done]);

  const shownReply = reduced ? ex.reply : ex.reply.slice(0, typed);
  const finished = reduced || done;

  const chip = !finished
    ? { label: "Nova is writing", tone: "bg-white/5 text-mist", dot: "bg-mist" }
    : ex.outcome === "published"
      ? { label: "Published on Google", tone: "bg-ice/15 text-ice", dot: "bg-ice" }
      : {
          label: "Sent to the owner for approval",
          tone: "bg-star/15 text-star",
          dot: "bg-star",
        };

  return (
    <div ref={root} className="relative mx-auto mt-16 max-w-[1040px] md:mt-24">
      <p className="sr-only">
        Example: {examples[0].author} left a {examples[0].rating} star review
        saying “{examples[0].review}” Nova replied: “{examples[0].reply}”
      </p>

      <div
        aria-hidden="true"
        className={`grid gap-4 transition-opacity md:grid-cols-2 md:gap-6 ${
          started && !leaving ? "opacity-100" : "opacity-0"
        }`}
        style={{ transitionDuration: `${FADE_MS}ms` }}
      >
        <figure
          key={`review-${index}-${started}`}
          className="enter-left min-h-[13.5rem] rounded-card border border-white/10 bg-panel/80 p-6 backdrop-blur-xl md:p-7"
        >
          <figcaption className="mb-4 flex items-center justify-between gap-3">
            <span className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-lilac/20 text-[14px] font-medium text-lilac">
                {ex.author[0]}
              </span>
              <span>
                <span className="block text-[14px] font-medium">{ex.author}</span>
                <span className="block text-[12px] text-mist">
                  reviewed {ex.place}
                </span>
              </span>
            </span>
            <Stars count={ex.rating} />
          </figcaption>
          <blockquote className="text-[15px] leading-relaxed text-fog">
            {ex.review}
          </blockquote>
        </figure>

        <div
          key={`reply-${index}-${started}`}
          className={`enter-right min-h-[13.5rem] rounded-card border bg-panel/80 p-6 backdrop-blur-xl transition-colors duration-500 md:p-7 ${
            finished && ex.outcome === "approval"
              ? "border-star/30"
              : "border-ice/25"
          }`}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-[13px] text-mist">Reply from the owner</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] transition-colors duration-500 ${chip.tone}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${chip.dot}`} />
              {chip.label}
            </span>
          </div>
          <p className="text-[15px] leading-relaxed text-fog">
            {shownReply}
            {!finished && (
              <span className="caret ml-0.5 inline-block h-[1em] w-px translate-y-0.5 bg-ice" />
            )}
          </p>
        </div>
      </div>

      <p className="mt-5 text-center text-[12px] text-ghost">
        Example reviews and replies for fictional businesses.
      </p>
    </div>
  );
}
