/**
 * Card · panel tipo expediente
 * --------------------------------------------------------------
 * Fondo papel claro, borde fino crema, sombra sutil. Composable
 * con CardHeader / CardSection / CardFooter para layouts notariales.
 */
import { ReactNode, HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  bleed?: boolean;
  as?: keyof React.JSX.IntrinsicElements;
};

export function Card({ children, bleed = false, className = '', ...rest }: CardProps) {
  const cls = [
    'paper-card rounded-[2px]',
    bleed ? '' : 'p-6 sm:p-8',
    className,
  ].join(' ');

  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({
  eyebrow,
  title,
  description,
  right,
  className = '',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <div className="smallcaps mb-2 text-[#A47148]">{eyebrow}</div>}
        <h2 className="font-serif text-[#0B1F3A] text-3xl sm:text-[34px] leading-[1.1] tracking-[-0.01em] font-medium">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-[14px] text-[#3F3F3F] max-w-xl leading-relaxed">{description}</p>
        )}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}

export function CardSection({
  children,
  className = '',
  divided = false,
}: {
  children: ReactNode;
  className?: string;
  divided?: boolean;
}) {
  return (
    <div className={`${divided ? 'pt-6 mt-6 border-t border-[#E5DFD3]' : ''} ${className}`}>
      {children}
    </div>
  );
}

export default Card;
