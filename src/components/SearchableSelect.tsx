import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";

import { IconChevronDown, IconSearch } from "./icons";

export interface SearchableSelectOption {
  value: string | number;
  label: string;
  meta?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  value: string | number | null | undefined;
  onChange: (value: string | number) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  inline?: boolean;
  style?: CSSProperties;
}

interface MenuPosition {
  left: number;
  width?: number;
  minWidth?: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found",
  disabled = false,
  inline = false,
  style,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => String(option.value) === String(value ?? ""));

  useEffect(() => {
    if (!open) return undefined;

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const availableBelow = Math.min(320, window.innerHeight - rect.bottom - 12);
      const openUp = availableBelow < 160 && rect.top > window.innerHeight - rect.bottom;
      const menuWidth = inline ? Math.max(rect.width, 240) : rect.width;
      const left = inline
        ? Math.min(rect.left, Math.max(12, window.innerWidth - menuWidth - 12))
        : rect.left;

      setPosition({
        left,
        width: inline ? undefined : rect.width,
        minWidth: inline ? menuWidth : undefined,
        maxHeight: openUp
          ? Math.min(320, rect.top - 12)
          : Math.max(120, availableBelow),
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      });
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [inline, open]);

  useEffect(() => {
    if (!open) return undefined;

    function handleMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
    : options;

  function pickOption(option: SearchableSelectOption) {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
  }

  function handleOptionMouseDown(event: ReactMouseEvent, option: SearchableSelectOption) {
    event.preventDefault();
    pickOption(option);
  }

  return (
    <div className={`ss-wrap${inline ? " ss-inline" : ""}`} style={style}>
      <button
        type="button"
        ref={triggerRef}
        disabled={disabled}
        className={`ss-trigger${open ? " open" : ""}${!selected ? " placeholder" : ""}`}
        onClick={() => !disabled && setOpen((current) => !current)}
      >
        <span className="ss-trigger-label">{selected?.label ?? placeholder}</span>
        <IconChevronDown />
      </button>

      {open && position && createPortal(
        <div
          ref={menuRef}
          className="ss-menu"
          style={{
            left: position.left,
            width: position.width,
            minWidth: position.minWidth,
            top: position.top,
            bottom: position.bottom,
          }}
        >
          <div className="ss-search">
            <IconSearch />
            <input
              autoFocus
              type="text"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="ss-list" style={{ maxHeight: position.maxHeight }}>
            {!filteredOptions.length ? (
              <div className="ss-empty">{emptyText}</div>
            ) : filteredOptions.map((option) => (
              <div
                key={String(option.value)}
                className={`ss-item${String(option.value) === String(value ?? "") ? " selected" : ""}${option.disabled ? " disabled" : ""}`}
                onMouseDown={(event) => handleOptionMouseDown(event, option)}
              >
                <span className="ss-item-label">{option.label}</span>
                {option.meta && <span className="ss-item-meta">{option.meta}</span>}
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
