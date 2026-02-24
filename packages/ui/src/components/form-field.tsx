import * as React from "react";
import { cn } from "../utils";
import { Label } from "./label";

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  htmlFor?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactNode;
}

function FormField({
  className,
  label,
  htmlFor,
  error,
  helperText,
  required,
  children,
  ...props
}: FormFieldProps) {
  const generatedId = React.useId();
  const fieldId = htmlFor || generatedId;
  const errorId = error ? `${fieldId}-error` : undefined;
  const helperId = helperText ? `${fieldId}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

  return (
    <div
      data-slot="form-field"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    >
      {label && (
        <Label htmlFor={fieldId}>
          {label}
          {required && (
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          )}
        </Label>
      )}
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
            id: fieldId,
            "aria-invalid": error ? true : undefined,
            "aria-describedby": describedBy,
          });
        }
        return child;
      })}
      {error && (
        <p id={errorId} className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="text-xs text-[var(--ld-muted-foreground)]">
          {helperText}
        </p>
      )}
    </div>
  );
}
FormField.displayName = "FormField";

export { FormField };
export default FormField;
