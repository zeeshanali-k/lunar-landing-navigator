/** Accessible contextual help popover button for sections and primary actions. */

import { useEffect, useId, useRef, useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { HELP_ENTRIES, type HelpEntry, type HelpKey } from "./helpContent";

export interface HelpPopoverProps {
  helpKey?: HelpKey;
  entry?: HelpEntry;
  align?: "left" | "right";
  label?: string;
  size?: "sm" | "md";
}

export function resolveHelpEntry(helpKey?: HelpKey, customEntry?: HelpEntry): HelpEntry {
  if (customEntry) {
    return customEntry;
  }
  if (helpKey) {
    return HELP_ENTRIES[helpKey];
  }
  return {
    title: "Help",
    summary: "Contextual guidance for this control.",
    tips: [],
  };
}

export function HelpPopover({ helpKey, entry, align = "right", label, size = "sm" }: HelpPopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoverId = useId();
  const resolved = resolveHelpEntry(helpKey, entry);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="help-popover-anchor">
      <button
        type="button"
        className={`help-trigger ${size === "md" ? "help-trigger-md" : ""}`}
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={`Help: ${resolved.title}`}
        title={resolved.title}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        <HelpCircle size={size === "md" ? 15 : 13} aria-hidden="true" />
        {label && <span>{label}</span>}
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label={resolved.title}
          className={`help-popover-card ${align === "left" ? "align-left" : "align-right"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="help-popover-header">
            <strong className="help-popover-title">{resolved.title}</strong>
            <button type="button" className="help-popover-close" aria-label="Close help" onClick={() => setOpen(false)}>
              <X size={14} aria-hidden="true" />
            </button>
          </div>
          <p className="help-popover-summary">{resolved.summary}</p>
          {resolved.tips.length > 0 && (
            <ul className="help-popover-tips">
              {resolved.tips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
