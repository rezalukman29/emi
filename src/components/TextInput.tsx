import React, {
  memo,
  type CSSProperties,
  type FocusEventHandler,
  type HTMLInputTypeAttribute,
  type ReactNode,
} from "react";

type Props = {
  value: string;
  isRequired?: boolean;
  placeholder?: string;
  label: string;
  onChange: (val: string) => void;
  errorText?: string;
  isNumeric?: boolean;
  inputType?: HTMLInputTypeAttribute;
  variant?: "primary" | "secondary";
  containerStyle?: CSSProperties;
  labelStyle?: CSSProperties;
  inputStyle?: CSSProperties;
  inputWrapperStyle?: CSSProperties;
  leftAdornment?: ReactNode;
  rightAdornment?: ReactNode;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  autoComplete?: string;
};

const TextInput = ({
  value,
  isRequired,
  onChange,
  placeholder,
  errorText,
  label,
  isNumeric,
  inputType = "text",
  variant = "primary",
  containerStyle,
  labelStyle,
  inputStyle,
  inputWrapperStyle,
  leftAdornment,
  rightAdornment,
  onFocus,
  onBlur,
  autoComplete,
}: Props) => {
  const input = (
    <input
      type={isNumeric ? "number" : inputType}
      min={isNumeric ? 0 : undefined}
      placeholder={placeholder ?? ""}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      autoComplete={autoComplete}
      aria-invalid={Boolean(errorText?.trim())}
      style={{
        ...inputStyle,
        borderColor: errorText?.trim() ? "var(--red)" : inputStyle?.borderColor,
        background:
          variant === "secondary"
            ? "var(--bg)"
            : inputStyle?.background,
      }}
    />
  );

  return (
    <div className="form-group" style={containerStyle}>
      <label style={labelStyle}>
        {label} {isRequired && <span style={{ color: "var(--red)" }}>*</span>}
      </label>
      {leftAdornment || rightAdornment ? (
        <div style={inputWrapperStyle}>
          {leftAdornment}
          {input}
          {rightAdornment}
        </div>
      ) : input}
      {errorText?.trim() && (
        <span style={{ color: "var(--red)", fontSize: 12 }}>{errorText}</span>
      )}
    </div>
  );
};

export default memo(TextInput);
