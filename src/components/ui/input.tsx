import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        // 16 px no celular (abaixo disso o Safari do iOS dá zoom no foco) e
        // 14 px no desktop; erro marcado com `aria-invalid` (tarefa 61).
        'flex h-11 w-full rounded border border-input bg-card px-3.5 py-2 text-base text-foreground transition-colors duration-(--duracao-rapida) placeholder:text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground hover:border-foreground/40 focus-visible:border-primary focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/20 md:text-sm',
        className
      )}
      {...props}
    />
  )
);

Input.displayName = 'Input';

export { Input };
