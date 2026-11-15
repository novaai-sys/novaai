export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-medium ${className}`}>
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M10 0c.7 5.6 4.4 9.3 10 10-5.6.7-9.3 4.4-10 10C9.3 14.4 5.6 10.7 0 10 5.6 9.3 9.3 5.6 10 0Z"
          fill="currentColor"
        />
      </svg>
      NovaAI
    </span>
  );
}
