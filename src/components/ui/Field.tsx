/**
 * Field · input notarial
 * --------------------------------------------------------------
 * Etiqueta en small-caps arriba, línea inferior fina debajo del input.
 * Foco resalta en bronce. Componible con Input/Textarea/Select.
 */
import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

type Common = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  rightAdornment?: ReactNode;
};

export function Field({
  label,
  hint,
  error,
  required,
  rightAdornment,
  type = 'text',
  className = '',
  ...rest
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="field">
      <label className="field-label flex items-center gap-1.5">
        {label}
        {required && <span className="text-[#A47148]">·</span>}
      </label>
      <div className="relative flex items-center">
        <input
          type={type}
          className={`field-input w-full ${className}`}
          {...rest}
        />
        {rightAdornment && <div className="absolute right-0 text-[#6B6B6B]">{rightAdornment}</div>}
      </div>
      {error ? (
        <span className="text-[11px] text-[#7E1F1F] mt-0.5">{error}</span>
      ) : hint ? (
        <span className="text-[11px] text-[#6B6B6B] mt-0.5">{hint}</span>
      ) : null}
    </div>
  );
}

export function TextField(props: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { label, hint, error, required, className = '', ...rest } = props;
  return (
    <div className="field">
      <label className="field-label flex items-center gap-1.5">
        {label}
        {required && <span className="text-[#A47148]">·</span>}
      </label>
      <textarea className={`field-input w-full resize-none ${className}`} rows={4} {...rest} />
      {error ? (
        <span className="text-[11px] text-[#7E1F1F] mt-0.5">{error}</span>
      ) : hint ? (
        <span className="text-[11px] text-[#6B6B6B] mt-0.5">{hint}</span>
      ) : null}
    </div>
  );
}

export default Field;
