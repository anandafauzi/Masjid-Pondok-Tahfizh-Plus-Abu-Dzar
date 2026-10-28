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
    <div className="relative mb-6 overflow-hidden rounded-3xl border border-[#ded5c4] bg-gradient-to-r from-[#fdfbf7] via-[#f7f3ea] to-[#f1eae0] px-6 py-5 text-[#19261f] shadow-lg sm:px-8 sm:py-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#3eb489]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-[#c5a059]/15 blur-3xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {Icon && (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#bde5d2] bg-[#eaf6f0] text-[#2d946e] shadow-sm">
              <Icon className="h-6 w-6" />
            </span>
          )}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#2d946e]">
              {eyebrow}
            </p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight text-[#19261f] sm:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#5a685e] sm:text-sm">
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
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eaf6f0] text-[#2d946e] ring-1 ring-[#bde5d2]">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div>
          <h2 className="text-base font-bold tracking-tight text-[#19261f]">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-[#5a685e]">
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
      className={`rounded-2xl border border-[#e4dcce] bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "ghost";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-[#2d946e] to-[#205e48] text-white shadow-sm shadow-[#0a1711]/25 hover:from-[#35a87e] hover:to-[#266d54] active:scale-[0.98]",
  secondary:
    "border border-[#ded5c4] bg-[#fdfbf7] text-[#2c3b31] hover:border-[#3eb489]/50 hover:bg-[#eef8f3] hover:text-[#1b5b44] active:scale-[0.98]",
  danger:
    "bg-rose-600 text-white shadow-sm hover:bg-rose-500 active:scale-[0.98]",
  success:
    "bg-[#2d946e] text-white shadow-sm hover:bg-[#257659] active:scale-[0.98]",
  ghost:
    "bg-transparent text-[#4e5e54] hover:bg-[#f2ece2] active:scale-[0.98]",
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
  children,
}: {
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#4e5e54]"
    >
      {children}
    </label>
  );
}

const FIELD =
  "w-full rounded-xl border border-[#ded5c4] bg-white px-3.5 py-2.5 text-sm text-[#19261f] transition-all placeholder:text-[#9aa79e] focus:border-[#2d946e] focus:outline-none focus:ring-2 focus:ring-[#2d946e]/20";

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
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#e4dcce] bg-[#faf7f2]/80 px-4 py-3 transition-colors hover:border-[#3eb489]/40 hover:bg-[#eef8f3]/60">
      <span>
        <span className="block text-sm font-semibold text-[#19261f]">
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs text-[#5a685e]">
            {description}
          </span>
        )}
      </span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-[#2d946e]" : "bg-[#dcd4c3]"
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
    slate: "bg-[#f4efe4] text-[#4d5950] border-[#ded7c8]",
    green: "bg-[#eaf6f0] text-[#1e6149] border-[#bde5d2]",
    red: "bg-[#fcf0ee] text-[#93392e] border-[#f2ccc7]",
    blue: "bg-[#edf4f7] text-[#2d5f73] border-[#cbe1ea]",
    amber: "bg-[#faf4e6] text-[#85631e] border-[#ecdcb4]",
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
    <div className="rounded-2xl border border-dashed border-[#ded5c4] bg-[#faf7f2]/70 px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#2d946e] ring-1 ring-[#ded5c4]">
        {Icon ? <Icon className="h-6 w-6" /> : <span className="text-xl">📋</span>}
      </div>
      {title && (
        <p className="text-sm font-bold text-[#19261f]">{title}</p>
      )}
      <p className="mt-1 text-xs text-[#6e7d73]">{message}</p>
    </div>
  );
}

export function LoadingState({ label = "Memuat data..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[#ded5c4] bg-[#faf7f2]/70 px-5 py-8 text-sm text-[#5a685e]">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2d946e] border-r-transparent" />
      {label}
    </div>
  );
}
