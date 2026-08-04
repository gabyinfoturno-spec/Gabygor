'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// ============================================================
// Button
// ============================================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-[#C8A960] text-[#111111] hover:bg-[#D4BA7A] focus:ring-[#C8A960] active:bg-[#A88B3E]',
    secondary:
      'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-400 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
    outline:
      'border-2 border-[#C8A960] text-[#C8A960] hover:bg-[#C8A960] hover:text-[#111111] focus:ring-[#C8A960] dark:border-[#C8A960] dark:text-[#C8A960]',
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800',
    ghost:
      'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 focus:ring-gray-400',
  };

  const sizes = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-sm px-4 py-2.5',
    lg: 'text-base px-6 py-3',
  };

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// ============================================================
// Card
// ============================================================

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

export function Card({ children, className, padding = 'md', ...props }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm',
        paddings[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================================
// Input
// ============================================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({ label, error, helperText, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-gray-900 transition-colors',
          'placeholder:text-gray-400',
          'focus:border-[#C8A960] focus:outline-none focus:ring-2 focus:ring-[#C8A960]/20',
          'dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:placeholder:text-gray-500',
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : 'border-gray-300 dark:border-gray-600',
          className,
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {helperText && !error && <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>}
    </div>
  );
}

// ============================================================
// Textarea
// ============================================================

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          'w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-gray-900 transition-colors resize-y min-h-[100px]',
          'placeholder:text-gray-400',
          'focus:border-[#C8A960] focus:outline-none focus:ring-2 focus:ring-[#C8A960]/20',
          'dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700',
          error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600',
          className,
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

// ============================================================
// Modal
// ============================================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      {/* Content */}
      <div
        className={cn(
          'relative w-full bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800',
          'max-h-[90vh] overflow-y-auto',
          sizes[size],
        )}
      >
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ============================================================
// Badge
// ============================================================

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'gray';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-[#C8A960]/10 text-[#C8A960] dark:bg-[#C8A960]/20',
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Mapea un AppointmentStatus a la variante del Badge */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeProps['variant']> = {
    pending: 'warning',
    confirmed: 'info',
    completed: 'success',
    cancelled: 'danger',
    rescheduled: 'purple',
    no_show: 'gray',
  };

  const labels: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    completed: 'Completado',
    cancelled: 'Cancelado',
    rescheduled: 'Reprogramado',
    no_show: 'No asistió',
  };

  return <Badge variant={map[status] || 'default'}>{labels[status] || status}</Badge>;
}

// ============================================================
// Calendar (simple date picker)
// ============================================================

interface CalendarProps {
  availableDates?: string[];
  selectedDate?: string | null;
  onSelectDate: (date: string) => void;
  month: number;
  year: number;
  onMonthChange: (month: number, year: number) => void;
  blockedDates?: string[];
}

export function Calendar({
  availableDates = [],
  selectedDate,
  onSelectDate,
  month,
  year,
  onMonthChange,
  blockedDates = [],
}: CalendarProps) {
  const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  function prevMonth() {
    if (month === 0) onMonthChange(11, year - 1);
    else onMonthChange(month - 1, year);
  }

  function nextMonth() {
    if (month === 11) onMonthChange(0, year + 1);
    else onMonthChange(month + 1, year);
  }

  function dateStr(day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {MONTH_NAMES[month]} {year}
        </h3>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;

          const ds = dateStr(day);
          const dateObj = new Date(year, month, day);
          const isPast = dateObj < today;
          const isAvailable = availableDates.length === 0 || availableDates.includes(ds);
          const isBlocked = blockedDates.includes(ds);
          const isSelected = selectedDate === ds;
          const isDisabled = isPast || isBlocked || !isAvailable;

          return (
            <button
              key={day}
              onClick={() => !isDisabled && onSelectDate(ds)}
              disabled={isDisabled}
              className={cn(
                'aspect-square flex items-center justify-center text-sm rounded-lg transition-all',
                isSelected
                  ? 'bg-[#C8A960] text-[#111111] font-bold'
                  : isDisabled
                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-900 dark:text-gray-100 hover:bg-[#C8A960]/10 cursor-pointer',
                isBlocked && 'bg-red-50 dark:bg-red-900/10 text-red-300 dark:text-red-800',
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// TimeSlot
// ============================================================

interface TimeSlotProps {
  slots: { slot_start: string; slot_end: string }[];
  selectedSlot?: string | null;
  onSelectSlot: (start: string, end: string) => void;
  loading?: boolean;
}

export function TimeSlot({ slots, selectedSlot, onSelectSlot, loading = false }: TimeSlotProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
        No hay horarios disponibles para esta fecha
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {slots.map((slot) => {
        const timeLabel = slot.slot_start.slice(0, 5);
        const isSelected = selectedSlot === slot.slot_start;

        return (
          <button
            key={slot.slot_start}
            onClick={() => onSelectSlot(slot.slot_start, slot.slot_end)}
            className={cn(
              'px-3 py-2.5 text-sm font-medium rounded-lg border transition-all',
              isSelected
                ? 'border-[#C8A960] bg-[#C8A960] text-[#111111]'
                : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-[#C8A960] hover:bg-[#C8A960]/5',
            )}
          >
            {timeLabel}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// Stepper
// ============================================================

interface StepperProps {
  steps: string[];
  currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="flex items-center w-full">
      {steps.map((step, i) => (
        <React.Fragment key={step}>
          <div className="flex items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                i < currentStep
                  ? 'bg-[#C8A960] text-[#111111]'
                  : i === currentStep
                    ? 'bg-[#C8A960] text-[#111111]'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
              )}
            >
              {i < currentStep ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={cn(
                'ml-2 text-sm hidden sm:inline',
                i <= currentStep
                  ? 'text-gray-900 dark:text-gray-100 font-medium'
                  : 'text-gray-400 dark:text-gray-500',
              )}
            >
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                'flex-1 h-px mx-3',
                i < currentStep ? 'bg-[#C8A960]' : 'bg-gray-200 dark:bg-gray-700',
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ============================================================
// ThemeToggle
// ============================================================

export function ThemeToggle() {
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDark(isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
      title={dark ? 'Modo claro' : 'Modo oscuro'}
    >
      {dark ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

// ============================================================
// Skeleton (loading placeholder)
// ============================================================

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className, lines = 1 }: SkeletonProps) {
  if (lines > 1) {
    return (
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse',
              i === lines - 1 && 'w-3/4',
              className,
            )}
          />
        ))}
      </div>
    );
  }

  return <div className={cn('h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse', className)} />;
}

// ============================================================
// Toast notifications (simple implementation)
// ============================================================

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const ToastContext = React.createContext<{
  toast: (message: string, type?: 'success' | 'error' | 'info') => void;
}>({
  toast: () => {},
});

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  function addToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-slide-up min-w-[280px]',
              t.type === 'success' && 'bg-green-600 text-white',
              t.type === 'error' && 'bg-red-600 text-white',
              t.type === 'info' && 'bg-blue-600 text-white',
            )}
          >
            <span className="flex-1">{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="text-white/80 hover:text-white">
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ============================================================
// Select
// ============================================================

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className, id, ...props }: SelectProps) {
  const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={cn(
          'w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-gray-900 transition-colors',
          'focus:border-[#C8A960] focus:outline-none focus:ring-2 focus:ring-[#C8A960]/20',
          'dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700',
          error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600',
          className,
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

// ============================================================
// Toggle Switch
// ============================================================

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <label className={cn('inline-flex items-center gap-3 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-[#C8A960]' : 'bg-gray-300 dark:bg-gray-600',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
      {label && <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>}
    </label>
  );
}
