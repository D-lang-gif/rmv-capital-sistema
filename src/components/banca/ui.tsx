import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("glass rounded-2xl p-5", className)}>{children}</div>;
}

export function Titulo({ icon, children, sub }: { icon?: ReactNode; children: ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        {icon ? <span className="text-accent [&_svg]:size-5">{icon}</span> : null}
        {children}
      </h2>
      {sub ? <p className="mt-0.5 text-sm text-fg-muted">{sub}</p> : null}
    </div>
  );
}

export function Campo({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium tracking-wide text-fg-muted">
        {label}
      </label>
      {children}
      {hint ? <div className="text-xs text-fg-subtle">{hint}</div> : null}
    </div>
  );
}

export const inputCls =
  "h-11 w-full rounded-lg border border-border bg-white/5 px-3 text-sm text-fg placeholder:text-fg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring read-only:opacity-70";

export function BotonShimmer({ children, className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={cn(
        "btn-shimmer flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm disabled:opacity-60 [&_svg]:size-4",
        className,
      )}
    >
      {children}
    </button>
  );
}
