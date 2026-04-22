import type { ReactNode } from 'react';

type PanelHeaderProps = {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
  align?: 'start' | 'center';
};

export default function PanelHeader({
  title,
  description,
  eyebrow,
  actions,
  align = 'start',
}: PanelHeaderProps) {
  return (
    <div
      className={['panel-header', align === 'center' ? 'panel-header--center' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="panel-header-copy">
        {eyebrow ? <span className="panel-eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>

      {actions ? <div className="panel-header-actions">{actions}</div> : null}
    </div>
  );
}
