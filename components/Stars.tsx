export default function Stars({
  count,
  size = 14,
}: {
  count: number;
  size?: number;
}) {
  return (
    <span
      role="img"
      aria-label={`${count} out of 5 stars`}
      className="inline-flex gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width={size}
          height={size}
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={n <= count ? "text-star" : "text-white/15"}
        >
          <path
            fill="currentColor"
            d="m10 1.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8L10 1.5Z"
          />
        </svg>
      ))}
    </span>
  );
}
