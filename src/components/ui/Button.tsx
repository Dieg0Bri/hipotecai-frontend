/**
 * Button · sobrio y tipográfico
 * --------------------------------------------------------------
 * Tres variantes: primary (navy), bronze (acento), ghost (borde fino).
 * Tipografía Inter, mayúsculas con tracking amplio para CTAs formales.
 */
import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'bronze' | 'ghost' | 'link';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  uppercase?: boolean;
};

const SIZE: Record<Size, string> = {
  sm: 'px-4 py-2 text-[12px]',
  md: 'px-6 py-2.5 text-[13px]',
  lg: 'px-8 py-3.5 text-[13px]',
};

const VARIANT: Record<Variant, string> = {
  primary: 'btn-primary',
  bronze:  'btn-bronze',
  ghost:   'btn-ghost',
  link:    'bg-transparent border-0 text-[#0B1F3A] hover:text-[#A47148] underline decoration-[#A47148] decoration-1 underline-offset-4 px-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    leftIcon,
    rightIcon,
    loading = false,
    uppercase = true,
    className = '',
    children,
    disabled,
    ...rest
  },
  ref
) {
  const cls = [
    VARIANT[variant],
    variant !== 'link' ? SIZE[size] : '',
    'inline-flex items-center justify-center gap-2',
    'font-medium',
    uppercase && variant !== 'link' ? 'uppercase tracking-[0.14em]' : '',
    'rounded-[2px] cursor-pointer',
    disabled || loading ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} className={cls} disabled={disabled || loading} {...rest}>
      {loading ? (
        <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon && <span className="inline-flex">{leftIcon}</span>
      )}
      <span>{children}</span>
      {rightIcon && !loading && <span className="inline-flex">{rightIcon}</span>}
    </button>
  );
});

export default Button;
