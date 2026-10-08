import { Toaster as Sonner } from "sonner";

function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "bg-surface text-fg border border-border shadow-[var(--shadow-border)]",
          title: "text-fg",
          description: "text-fg-muted",
        },
      }}
    />
  );
}

export { Toaster };
