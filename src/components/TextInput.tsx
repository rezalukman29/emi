import React, { memo, type HTMLInputTypeAttribute } from "react";

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
}: Props) => {
  return (
    <div className="form-group">
      <label>
        {label} {isRequired && <span style={{ color: "var(--red)" }}>*</span>}
      </label>
      <input
        type={isNumeric ? "number" : inputType}
        min={isNumeric ? 0 : undefined}
        placeholder={placeholder ?? ""}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          borderColor: errorText?.trim() ? "var(--red)" : undefined,
          background: variant === "secondary" ? "var(--bg)" : undefined,
        }}
      />
      {errorText?.trim() && (
        <span style={{ color: "var(--red)", fontSize: 12 }}>{errorText}</span>
      )}
    </div>
  );
};

export default memo(TextInput);
