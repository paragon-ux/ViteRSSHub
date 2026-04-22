import {
  AlertCircle,
  CheckCircle2,
  Inbox,
  Info,
  LoaderCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';

type StateBlockVariant = 'empty' | 'info' | 'loading' | 'success' | 'error';

type StateBlockProps = {
  title: string;
  message: ReactNode;
  variant?: StateBlockVariant;
  action?: ReactNode;
  compact?: boolean;
};

function getVariantIcon(variant: StateBlockVariant) {
  if (variant === 'error') {
    return <AlertCircle size={18} />;
  }

  if (variant === 'success') {
    return <CheckCircle2 size={18} />;
  }

  if (variant === 'loading') {
    return <LoaderCircle size={18} className="spin" />;
  }

  if (variant === 'info') {
    return <Info size={18} />;
  }

  return <Inbox size={18} />;
}

export default function StateBlock({
  title,
  message,
  variant = 'empty',
  action,
  compact = false,
}: StateBlockProps) {
  return (
    <div
      className={[
        'state-block',
        `state-block--${variant}`,
        compact ? 'state-block--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="state-block-icon">{getVariantIcon(variant)}</div>

      <div className="state-block-copy">
        <h3>{title}</h3>
        <div className="state-block-message">{message}</div>
        {action ? <div className="state-block-actions">{action}</div> : null}
      </div>
    </div>
  );
}
