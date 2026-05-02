/**
 * /admin/billing — Stripe catalog sync + stripe_products table.
 */

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { syncStripeCatalog } from "@/features/billing/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/billing")({
  component: AdminBillingTab,
});

function AdminBillingTab() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<Array<{ tier: string; price_id: string; amount: number }> | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncStripeCatalog();
      setResult(res.synced);
      toast.success(`Catálogo sincronizado (${res.synced.length} planos).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao sincronizar.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <Eyebrow tone="mauve">Stripe · catálogo</Eyebrow>
            <h3 className="mt-2 font-display text-2xl text-foreground">Sincronizar planos</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Lê os <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem]">price_id</code> declarados
              em <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem]">STRIPE_PRICE_BASIC</code> e{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem]">STRIPE_PRICE_PRACTICE</code>,
              busca preço/produto na Stripe e atualiza a tabela{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem]">stripe_products</code>.
              Idempotente — pode rodar quantas vezes precisar.
            </p>
          </div>
          <button type="button" onClick={handleSync} disabled={syncing}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} aria-hidden />
            {syncing ? "Sincronizando…" : "Sincronizar agora"}
          </button>
        </div>

        {result && result.length > 0 && (
          <ul className="mt-5 space-y-1.5 text-sm">
            {result.map((r) => (
              <li key={r.price_id} className="flex items-center gap-3 text-muted-foreground">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden />
                <span className="font-medium text-foreground capitalize">{r.tier}</span>
                <span>·</span>
                <span>${(r.amount / 100).toFixed(2)}</span>
                <span>·</span>
                <code className="font-mono text-xs">{r.price_id}</code>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
