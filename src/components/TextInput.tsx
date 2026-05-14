import React, { memo } from "react";

type Props = {
  value: string;
  isRequired?: boolean;
  placeholder?: string;
  label: string;
  onChange: (val: string) => void;
  errorText?: string;
};

const TextInput = ({ value, isRequired, onChange, placeholder, errorText, label }: Props) => {
  return (
    <div className="form-group">
      <label>
        {label} {isRequired && <span style={{ color: "var(--red)" }}>*</span>}
      </label>
      <input
        type="text"
        placeholder={placeholder ?? ""}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
            borderColor: errorText?.trim() ? "var(--red)" : undefined
        }}
      />
      {errorText?.trim() && <span style={{ color: "var(--red)", fontSize: 12 }}>{errorText}</span>}
    </div>
  );
};

export default memo(TextInput)