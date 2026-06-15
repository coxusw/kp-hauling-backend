import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
};

export function MetricCard({ label, value, detail, icon: Icon }: MetricCardProps) {
  return (
    <div className="rounded border border-kp-line bg-white p-4 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-600">{label}</p>
          <p className="mt-2 text-3xl font-bold text-kp-ink">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded bg-kp-green text-white">
          <Icon aria-hidden className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-sm text-stone-600">{detail}</p>
    </div>
  );
}
