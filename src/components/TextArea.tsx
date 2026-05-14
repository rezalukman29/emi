import React, { memo } from "react";

type Props = {
  value: string;
  isRequired?: boolean;
  placeholder?: string;
  label: string;
  onChange: (val: string) => void;
  errorText?: string;
  rows?:number;
};

const TextArea = ({ value, isRequired, onChange, placeholder, errorText, rows, label }: Props) => {
  return (
    <div className="form-group">
      <label>
        {label} {isRequired && <span style={{ color: "var(--red)" }}>*</span>}
      </label>
      <textarea
        placeholder={placeholder ?? ""}
        value={value}
        rows={rows ?? 3}
        onChange={(e) => onChange(e.target.value)}
        style={{
            borderColor: errorText?.trim() ? "var(--red)" : undefined,
            resize: 'vertical'
        }}
      />
      {errorText?.trim() && <span style={{ color: "var(--red)" }}>{errorText}</span>}
    </div>
  );
};

export default memo(TextArea)