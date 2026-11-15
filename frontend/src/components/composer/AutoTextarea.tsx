"use client";

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  /** Enter (without Shift) calls this instead of inserting a newline. */
  onEnter?: () => void;
  /** Backspace in an empty field. */
  onBackspaceEmpty?: () => void;
  autoFocus?: boolean;
  onBlur?: () => void;
  id?: string;
  readOnly?: boolean;
}

/** A borderless textarea that grows with its content — reads like text, edits like a field. */
const AutoTextarea = forwardRef<HTMLTextAreaElement, Props>(function AutoTextarea(
  { value, onChange, placeholder, className = "", onEnter, onBackspaceEmpty, autoFocus, onBlur, id, readOnly },
  ref,
) {
  const el = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => el.current as HTMLTextAreaElement);

  useLayoutEffect(() => {
    const t = el.current;
    if (!t) return;
    t.style.height = "0px";
    t.style.height = `${t.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={el}
      id={id}
      readOnly={readOnly}
      rows={1}
      value={value}
      autoFocus={autoFocus}
      placeholder={placeholder}
      className={`cmp-autotext ${className}`}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey && onEnter) {
          e.preventDefault();
          onEnter();
        } else if (e.key === "Backspace" && !value && onBackspaceEmpty) {
          e.preventDefault();
          onBackspaceEmpty();
        }
      }}
    />
  );
});

export default AutoTextarea;
