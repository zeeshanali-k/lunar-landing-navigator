/** Consistent top orientation header for each workspace screen. */

import type { ReactNode } from "react";
import { HelpPopover } from "./HelpPopover";
import type { HelpKey } from "./helpContent";

export interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  helpKey: HelpKey;
  actions?: ReactNode;
}

export function ScreenHeader({ eyebrow, title, description, helpKey, actions }: ScreenHeaderProps) {
  return (
    <div className="screen-header">
      <div className="screen-header-main">
        {eyebrow && <div className="screen-eyebrow">{eyebrow}</div>}
        <div className="screen-title-row">
          <h1 className="screen-title">{title}</h1>
          <HelpPopover helpKey={helpKey} align="left" size="md" label="Guide" />
        </div>
        <p className="screen-description">{description}</p>
      </div>
      {actions && <div className="screen-header-actions">{actions}</div>}
    </div>
  );
}
