import * as React from "react";
import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "text-xs font-medium tracking-[0.14em] text-fg-muted uppercase",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
