import React, { useRef, useState } from 'react';
import {
  useFloating,
  useInteractions,
  useHover,
  useRole,
  useDismiss,
  offset,
  flip,
  shift,
  arrow,
  FloatingPortal,
} from '@floating-ui/react';
import '@/styles/tooltip.css';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  className = '',
  placement = 'top'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef(null);

  const {
    x,
    y,
    strategy,
    refs,
    context,
    placement: finalPlacement,
    middlewareData: { arrow: { x: arrowX, y: arrowY } = {} }
  } = useFloating({
    placement,
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      offset(8),
      flip(),
      shift(),
      arrow({ element: arrowRef })
    ]
  });

  const hover = useHover(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    dismiss,
    role
  ]);

  return (
    <>
      <div
        ref={refs.setReference}
        {...getReferenceProps()}
        className={`tooltip-trigger ${className}`}
      >
        {children}
      </div>
      <FloatingPortal>
        {isOpen && (
          <div
            ref={refs.setFloating}
            style={{
              position: strategy,
              top: y ?? 0,
              left: x ?? 0,
              width: 'max-content',
              maxWidth: 'min(calc(100vw - 20px), 300px)'
            }}
            {...getFloatingProps()}
            className="tooltip-content"
          >
            <div
              ref={arrowRef}
              style={{
                position: 'absolute',
                left: arrowX != null ? `${arrowX}px` : '',
                top: arrowY != null ? `${arrowY}px` : '',
                [finalPlacement.includes('top') ? 'bottom' : 'top']: '-4px',
                width: '8px',
                height: '8px',
                transform: 'rotate(45deg)',
                zIndex: -1,
              }}
              className="tooltip-arrow"
            />
            {content}
          </div>
        )}
      </FloatingPortal>
    </>
  );
}; 