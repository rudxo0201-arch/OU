declare module 'react-grid-layout' {
  import { CSSProperties, ReactNode, RefObject } from 'react';

  export type ResizeHandleAxis = 's' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne';
  export type CompactType = 'vertical' | 'horizontal' | null;

  export interface Layout {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    maxW?: number;
    minH?: number;
    maxH?: number;
    static?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
    isBounded?: boolean;
    resizeHandles?: ResizeHandleAxis[];
  }

  export interface GridConfig {
    cols?: number;
    rowHeight?: number;
    maxRows?: number;
    margin?: [number, number];
    containerPadding?: [number, number] | null;
  }

  export interface DragConfig {
    enabled?: boolean;
    bounded?: boolean;
    handle?: string;
    cancel?: string;
    threshold?: number;
  }

  export interface ResizeConfig {
    enabled?: boolean;
    handles?: ResizeHandleAxis[];
    handleComponent?: ReactNode;
  }

  export interface Compactor {
    type: CompactType;
    allowOverlap: boolean;
    preventCollision?: boolean;
    compact(layout: Layout[], cols: number): Layout[];
  }

  export interface GridLayoutProps {
    layout?: Layout[];
    width: number;
    gridConfig?: GridConfig;
    dragConfig?: DragConfig;
    resizeConfig?: ResizeConfig;
    dropConfig?: Record<string, unknown>;
    compactor?: Compactor;
    positionStrategy?: unknown;
    constraints?: unknown;
    autoSize?: boolean;
    className?: string;
    style?: CSSProperties;
    innerRef?: RefObject<HTMLDivElement>;
    onLayoutChange?: (layout: Layout[]) => void;
    onDragStart?: (layout: Layout[], ...args: unknown[]) => void;
    onDrag?: (layout: Layout[], ...args: unknown[]) => void;
    onDragStop?: (layout: Layout[], ...args: unknown[]) => void;
    onResizeStart?: (layout: Layout[], ...args: unknown[]) => void;
    onResize?: (layout: Layout[], ...args: unknown[]) => void;
    onResizeStop?: (layout: Layout[], ...args: unknown[]) => void;
    onDrop?: (...args: unknown[]) => void;
    onDropDragOver?: (...args: unknown[]) => void;
    children?: ReactNode;
  }

  export function GridLayout(props: GridLayoutProps): JSX.Element;
  export function getCompactor(type: CompactType, allowOverlap?: boolean, preventCollision?: boolean): Compactor;

  export default GridLayout;
}

declare module 'react-grid-layout/css/styles.css' {
  const content: string;
  export default content;
}
