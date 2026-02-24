/**
 * Reusable inline-editable text component for diagram nodes.
 *
 * - Double-click switches to a controlled <input>.
 * - Enter / blur commits; Escape cancels.
 * - stopPropagation on mousedown prevents React Flow drag from intercepting.
 */
import { useState, useRef, useEffect } from "react";

interface InlineEditableTextProps {
  value: string | number;
  onCommit: (value: string) => void;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  numeric?: boolean;
  disabled?: boolean;
}

export function InlineEditableText({
  value,
  onCommit,
  style,
  inputStyle,
  numeric = false,
  disabled = false,
}: InlineEditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep draft in sync when value prop changes externally
  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  // Focus input when editing starts
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const handleCommit = () => {
    const trimmed = draft.trim();
    if (trimmed !== String(value)) {
      onCommit(trimmed);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(String(value));
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        type={numeric ? "number" : "text"}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={(e) => {
          e.stopPropagation(); // Prevent React Flow key handling
          if (e.key === "Enter") handleCommit();
          if (e.key === "Escape") handleCancel();
        }}
        onMouseDown={(e) => e.stopPropagation()} // Prevent drag
        onClick={(e) => e.stopPropagation()}
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          color: "var(--text-primary)",
          background: "var(--bg-surface)",
          border: "1px solid var(--accent-primary)",
          borderRadius: 3,
          padding: "1px 4px",
          outline: "none",
          width: "100%",
          ...inputStyle,
        }}
      />
    );
  }

  return (
    <span
      onDoubleClick={(e) => {
        if (disabled) return;
        e.stopPropagation();
        setDraft(String(value));
        setEditing(true);
      }}
      title={disabled ? undefined : "Double-click to edit"}
      style={{
        cursor: disabled ? "default" : "text",
        ...style,
      }}
    >
      {value}
    </span>
  );
}
