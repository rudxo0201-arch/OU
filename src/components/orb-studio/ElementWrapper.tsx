'use client';

import { memo, forwardRef } from 'react';
import { WidgetCard } from '@/components/widgets/WidgetCard';
import type { StudioElement } from './types';
import styles from './ElementWrapper.module.css';

interface Props {
  element: StudioElement;
  selected: boolean;
  interacting: boolean;
  editMode: boolean;
  onPointerDown: (e: React.PointerEvent, elementId: string) => void;
}

export const ElementWrapper = memo(
  forwardRef<HTMLDivElement, Props>(function ElementWrapper(
    { element, selected, interacting, editMode, onPointerDown },
    ref,
  ) {
    return (
      <div
        ref={ref}
        data-element-id={element.id}
        className={[
          styles.wrapper,
          selected ? styles.selected : '',
          interacting ? styles.interacting : '',
        ].join(' ')}
        style={{
          transform: `translate(${element.x}px, ${element.y}px)`,
          width: element.width,
          height: element.height,
          zIndex: element.zIndex,
        }}
        onPointerDown={(e) => onPointerDown(e, element.id)}
      >
        <div className={styles.content}>
          <WidgetCard
            widgetId={element.id}
            type={element.type}
            editMode={editMode}
          />
        </div>
      </div>
    );
  }),
);
