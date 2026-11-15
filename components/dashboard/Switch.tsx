"use client";

export default function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors duration-300 ${
        checked
          ? "border-ice/40 bg-gradient-to-r from-ice/10 via-lilac/25 to-ice/40"
          : "border-white/10 bg-white/5"
      }`}
    >
      <span
        className={`absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full transition-all duration-300 ${
          checked ? "left-[calc(100%-1.75rem)] bg-fog" : "left-1 bg-ghost"
        }`}
      />
    </button>
  );
}
