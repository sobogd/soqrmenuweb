"use client";

import { cn } from "@/lib/utils";

interface FormFieldUnderlineProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  autoFocus?: boolean;
  onFocus?: () => void;
  rightSlot?: React.ReactNode;
  multiline?: boolean;
  rows?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}

export function FormFieldUnderline({
  id,
  label,
  value,
  onChange,
  placeholder,
  isLoading,
  autoFocus,
  onFocus,
  rightSlot,
  multiline,
  rows = 3,
  inputMode,
}: FormFieldUnderlineProps) {
  return (
    <div className={cn("group/field space-y-1", isLoading && "animate-pulse pointer-events-none")}>
      <div className="flex items-center justify-between relative">
        <label
          htmlFor={id}
          className={cn("text-xs font-medium text-muted-foreground group-focus-within/field:text-primary transition-colors", isLoading && "invisible")}
        >
          {label}
        </label>
        {isLoading && <span className="absolute inset-y-0 left-0 w-12 bg-muted rounded-sm" />}
        {!isLoading && rightSlot}
      </div>
      <div className="pt-1 pb-2 border-b-[1.5px] border-border group-focus-within/field:border-primary transition-colors relative">
        {multiline ? (
          <textarea
            id={id}
            value={isLoading ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={isLoading ? "" : placeholder}
            rows={rows}
            autoFocus={!isLoading && autoFocus}
            onFocus={!isLoading ? onFocus : undefined}
            disabled={isLoading}
            className="w-full text-sm bg-transparent outline-none resize-none leading-5 p-0 placeholder:text-muted-foreground/30"
          />
        ) : (
          <input
            id={id}
            type="text"
            inputMode={inputMode}
            value={isLoading ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={isLoading ? "" : placeholder}
            autoFocus={!isLoading && autoFocus}
            onFocus={!isLoading ? onFocus : undefined}
            disabled={isLoading}
            className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground/30"
          />
        )}
        {isLoading && <span className="absolute top-[6px] bottom-[6px] left-0 right-[55%] bg-muted rounded-sm" />}
      </div>
    </div>
  );
}
