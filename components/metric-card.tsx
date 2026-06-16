import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
};

export function MetricCard({ label, value, detail, icon: Icon }: MetricCardProps) {
  return (
    <div className="rounded border border-kp-line bg-white p-2 shadow-panel sm:p-4">
      <div className="flex flex-col items-center justify-center gap-1 text-center sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:text-left">
        <div className="min-w-0">
          <p className="text-[10px] font-bold leading-tight text-stone-600 sm:text-sm sm:font-semibold">{label}</p>
          <p className="mt-1 text-2xl font-bold leading-none text-kp-ink sm:mt-2 sm:text-3xl">{value}</p>
        </div>
        <div className="hidden h-10 w-10 items-center justify-center rounded bg-kp-green text-white sm:flex">
          <Icon aria-hidden className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 hidden text-sm text-stone-600 sm:block">{detail}</p>
    </div>
  );
}
