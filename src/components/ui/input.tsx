import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onClick, ...props }, ref) => {
    const handleClick = (event: React.MouseEvent<HTMLInputElement>) => {
      onClick?.(event);

      if (event.defaultPrevented || type !== "date" || props.disabled || props.readOnly) {
        return;
      }

      // Em navegadores compatíveis, abre o calendário ao clicar em qualquer
      // ponto do campo, sem exigir que o usuário acerte o pequeno ícone nativo.
      try {
        event.currentTarget.showPicker?.();
      } catch {
        // O próprio input continua funcionando quando showPicker não existe.
      }
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          type === "date" && "cursor-pointer [color-scheme:dark]",
          className,
        )}
        ref={ref}
        onClick={handleClick}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
