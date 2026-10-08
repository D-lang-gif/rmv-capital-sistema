import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-fg shadow-none transition-[box-shadow,border-color] duration-150 placeholder:text-fg-subtle",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "font-mono",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
