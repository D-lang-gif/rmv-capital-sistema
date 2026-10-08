import { cn } from "@/lib/utils";

export function NexusMark({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("text-accent", className)}
    >
      <rect
        x="8"
        y="8"
        width="16"
        height="16"
        transform="rotate(45 16 16)"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <rect
        x="11.5"
        y="11.5"
        width="9"
        height="9"
        transform="rotate(45 16 16)"
        fill="currentColor"
      />
    </svg>
  );
}
