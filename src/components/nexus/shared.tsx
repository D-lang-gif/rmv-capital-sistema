import { useState, type ReactNode } from "react";
import { Check, Copy, ExternalLink, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MEMPOOL_EXPLORER } from "@/lib/nexus/config";
import { formatBtcSmart, truncateMiddle } from "@/lib/nexus/format";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copiar",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copiado al portapapeles");
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onCopy}
      aria-label={label}
      className="shrink-0"
    >
      {copied ? <Check className="text-success" /> : <Copy />}
    </Button>
  );
}

export function AddressLine({
  address,
  className,
}: {
  address: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-1", className)}>
      <code className="min-w-0 truncate font-mono text-xs text-fg">
        {truncateMiddle(address, 12, 10)}
      </code>
      <CopyButton value={address} />
      <a
        href={`${MEMPOOL_EXPLORER}/address/${address}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex size-9 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg"
        aria-label="Abrir en mempool.space"
      >
        <ExternalLink className="size-4" />
      </a>
    </div>
  );
}

export function BtcFigure({
  sats,
  className,
}: {
  sats: number;
  className?: string;
}) {
  const { btc, sub } = formatBtcSmart(sats);
  return (
    <div className={cn("min-w-0", className)}>
      <div className="font-mono text-lg font-medium tabular tracking-tight text-fg">
        {btc}
      </div>
      <div className="font-mono text-xs text-fg-subtle tabular">{sub}</div>
    </div>
  );
}

export function Panel({
  title,
  hint,
  action,
  children,
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "glass rounded-xl",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-medium tracking-tight">{title}</h2>
          {hint ? <p className="mt-0.5 text-sm text-fg-muted">{hint}</p> : null}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function QrButton({
  address,
  name,
}: {
  address: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <QrCode />
        QR
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription>Dirección de observación on-chain</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="rounded-lg bg-fg p-3">
              <QRCodeSVG
                value={address}
                size={196}
                bgColor="#e7e4dc"
                fgColor="#07090e"
                level="M"
              />
            </div>
            <p className="max-w-full break-all text-center font-mono text-xs text-fg-muted">
              {address}
            </p>
            <CopyButton value={address} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "accent" | "bitcoin" | "muted";
}) {
  const valueClass =
    tone === "bitcoin"
      ? "text-bitcoin"
      : tone === "accent"
        ? "text-accent"
        : "text-fg";
  return (
    <div className="min-w-0 rounded-lg bg-surface-2 px-3 py-2">
      <div className="text-[10px] font-medium tracking-[0.16em] text-fg-subtle uppercase">
        {label}
      </div>
      <div className={cn("mt-0.5 truncate font-mono text-sm tabular", valueClass)}>
        {value}
      </div>
    </div>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">
      {children}
    </p>
  );
}
