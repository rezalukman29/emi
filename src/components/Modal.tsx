import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { IconClose } from './icons';

type ModalSize = 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

interface ModalProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  children?: ReactNode;
  size?: ModalSize;
  className?: string;
  bodyClassName?: string;
  footerClassName?: string;
}

const sizeStyles: Record<ModalSize, CSSProperties | undefined> = {
  md: undefined,
  lg: { width: 680 },
  xl: { width: 760 },
  '2xl': { width: 880 },
  '3xl': { width: 1080 },
  '4xl': { width: 1320 },
};

export default function Modal({
  open,
  title,
  onClose,
  footer,
  children,
  size = 'md',
  className = '',
  bodyClassName = '',
  footerClassName = '',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay open"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`modal ${className}`.trim()} style={sizeStyles[size]}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}><IconClose /></button>
        </div>
        <div className={`modal-body ${bodyClassName}`.trim()}>{children}</div>
        {footer && <div className={`modal-footer ${footerClassName}`.trim()}>{footer}</div>}
      </div>
    </div>
  );
}
