/** Progressive-disclosure collapsible section with optional contextual help. */

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { HelpPopover } from "./HelpPopover";
import { type HelpEntry, type HelpKey } from "./helpContent";

export interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: "neutral" | "ok" | "warn" | "info";
  helpKey?: HelpKey;
  helpEntry?: HelpEntry;
  defaultOpen?: boolean;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  subtitle,
  badge,
  badgeTone = "neutral",
  helpKey,
  helpEntry,
  defaultOpen = false,
  headerRight,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="panel-card collapsible-card">
      <div className="collapsible-header">
        <button type="button" className="collapsible-toggle" aria-expanded={open} onClick={() => setOpen((prev) => !prev)}>
          <span className="collapsible-chevron" aria-hidden="true">
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
          <span className="collapsible-titles">
            <span className="collapsible-title-row">
              <span className="panel-title">{title}</span>
              {badge && <span className={`tone-pill tone-${badgeTone}`}>{badge}</span>}
            </span>
            {subtitle && <span className="collapsible-subtitle">{subtitle}</span>}
          </span>
        </button>

        <div className="collapsible-actions">
          {headerRight}
          {(helpKey || helpEntry) && <HelpPopover helpKey={helpKey} entry={helpEntry} />}
        </div>
      </div>

      {open && <div className="collapsible-body">{children}</div>}
    </section>
  );
}
