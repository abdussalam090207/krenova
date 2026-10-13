import React, { forwardRef } from "react";
import { AlertCircle } from "lucide-react";

interface BaseProps {
  id: string;
  label: string;
  error?: string;
}

interface InputFieldProps extends BaseProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> {
  as?: "input";
  maxLengthCount?: never;
  currentLength?: never;
}

interface TextareaFieldProps extends BaseProps, Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  as: "textarea";
  maxLengthCount?: number;
  currentLength?: number;
}

export type FormFieldProps = InputFieldProps | TextareaFieldProps;

export const FormField = forwardRef<HTMLInputElement | HTMLTextAreaElement, FormFieldProps>(
  function FormField(props, ref) {
    const {
      id,
      label,
      error,
      as = "input",
      className = "",
      maxLengthCount,
      currentLength,
      ...rest
    } = props;
    const errorId = `${id}-error`;

    const baseControlClasses =
      "w-full rounded-xl bg-[--input-bg] border text-[--text] placeholder:text-[--text-3] text-[16px] transition-[border-color,box-shadow,background-color] duration-150 focus:outline-none focus:ring-2 focus:ring-[--aqua] focus:ring-offset-2 focus:ring-offset-[--bg-ink]";

    const stateClasses = error
      ? "border-[#FF6B6B] focus:border-[#FF6B6B] focus:ring-[#FF6B6B]"
      : "border-[--glass-border] hover:border-[--text-3] focus:border-[--aqua]";

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={id}
            className="block text-[14px] md:text-[15px] font-medium text-[--text]"
          >
            {label}
          </label>

          {as === "textarea" && typeof maxLengthCount === "number" && (
            <span
              aria-live="off"
              className={`text-xs tabular-nums transition-colors duration-150 ${
                (currentLength ?? 0) >= 900 ? "text-[--text] font-medium" : "text-[--text-3]"
              }`}
            >
              {currentLength ?? 0}/{maxLengthCount}
            </span>
          )}
        </div>

        {as === "textarea" ? (
          <textarea
            {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={id}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className={`min-h-[140px] px-4 py-3 resize-y ${baseControlClasses} ${stateClasses} ${className}`}
          />
        ) : (
          <input
            {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
            ref={ref as React.Ref<HTMLInputElement>}
            id={id}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className={`h-12 px-4 ${baseControlClasses} ${stateClasses} ${className}`}
          />
        )}

        {error && (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-xs text-[#FF6B6B] pt-0.5"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);
