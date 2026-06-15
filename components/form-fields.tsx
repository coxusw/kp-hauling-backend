import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  children: React.ReactNode;
};

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

const baseInput =
  "mt-1 min-h-10 w-full rounded border border-kp-line bg-white px-3 text-sm text-kp-ink outline-none transition focus:border-kp-green focus:ring-2 focus:ring-kp-lime/30";

export function Field({ label, ...props }: FieldProps) {
  return (
    <label className="block text-sm font-semibold text-stone-700">
      {label}
      <input {...props} className={baseInput} />
    </label>
  );
}

export function SelectField({ label, children, ...props }: SelectFieldProps) {
  return (
    <label className="block text-sm font-semibold text-stone-700">
      {label}
      <select {...props} className={baseInput}>
        {children}
      </select>
    </label>
  );
}

export function TextAreaField({ label, ...props }: TextAreaFieldProps) {
  return (
    <label className="block text-sm font-semibold text-stone-700">
      {label}
      <textarea
        {...props}
        className="mt-1 min-h-24 w-full rounded border border-kp-line bg-white px-3 py-2 text-sm text-kp-ink outline-none transition focus:border-kp-green focus:ring-2 focus:ring-kp-lime/30"
      />
    </label>
  );
}
