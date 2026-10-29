import type {
  ReactNode,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  title,
  description,
  action,
  icon: Icon,
  eyebrow = "Panel Admin",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  eyebrow?: string;
}) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white px-6 py-5 text-slate-900 shadow-sm sm:px-8 sm:py-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sage-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-sage-600/10 blur-3xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {Icon && (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sage-200 bg-sage-50 text-sage-700 shadow-sm">
              <Icon className="h-6 w-6" />
            </span>
          )}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sage-600">
              {eyebrow}
            </p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 sm:text-sm">
                {description}
              </p>
            )}
          </div>
        </div>
        {action && (
          <div className="flex flex-wrap items-center gap-2">{action}</div>
        )}
      </div>
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  icon: Icon,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-4 flex flex-wrap items-start justify-between gap-3 ${className}`}
    >
      <div className="flex items-start gap-2.5">
        {Icon && (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sage-50 text-sage-700 ring-1 ring-sage-200">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "ghost";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-sage-600 text-white shadow-sm hover:bg-sage-700 active:scale-[0.98]",
  secondary:
    "border border-slate-200 bg-white text-slate-800 hover:border-sage-400 hover:bg-sage-50/50 hover:text-sage-800 active:scale-[0.98]",
  danger:
    "bg-rose-600 text-white shadow-sm hover:bg-rose-500 active:scale-[0.98]",
  success:
    "bg-sage-600 text-white shadow-sm hover:bg-sage-700 active:scale-[0.98]",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 active:scale-[0.98]",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Label({
  htmlFor,
  className = "",
  children,
}: {
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600 ${className}`}
    >
      {children}
    </label>
  );
}

const FIELD =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sage-600 focus:outline-none focus:ring-2 focus:ring-sage-500/20";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${FIELD} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${FIELD} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={`${FIELD} ${props.className ?? ""}`} />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 transition-colors hover:border-sage-300 hover:bg-sage-50/40">
      <span>
        <span className="block text-sm font-semibold text-slate-900">
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs text-slate-500">
            {description}
          </span>
        )}
      </span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-sage-600" : "bg-slate-300"
        }`}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </label>
  );
}

export function Badge({
  children,
  color = "slate",
}: {
  children: ReactNode;
  color?: "slate" | "green" | "red" | "blue" | "amber";
}) {
  const colors = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    green: "bg-sage-50 text-sage-800 border-sage-200",
    red: "bg-rose-50 text-rose-700 border-rose-200",
    blue: "bg-sky-50 text-sky-700 border-sky-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${colors[color]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  message,
  title,
  icon: Icon,
}: {
  message: string;
  title?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-sage-600 ring-1 ring-slate-200">
        {Icon ? <Icon className="h-6 w-6" /> : <span className="text-xl">📋</span>}
      </div>
      {title && (
        <p className="text-sm font-bold text-slate-900">{title}</p>
      )}
      <p className="mt-1 text-xs text-slate-500">{message}</p>
    </div>
  );
}

export function LoadingState({ label = "Memuat data..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-8 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-sage-600 border-r-transparent" />
      {label}
    </div>
  );
}
