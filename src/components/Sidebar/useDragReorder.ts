import { useState, useRef, useCallback } from 'react';

// Module-level state shared between drag source and drop target
let dragState: { type: string; index: number } | null = null;

interface UseDragReorderOptions {
  type: string;   // e.g. 'sidebar-group' or 'sidebar-session'
  index: number;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function useDragReorder({ type, index, onReorder }: UseDragReorderOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    dragState = { type, index };
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(`application/x-molten-${type}`, String(index));
    // Make the ghost slightly transparent
    if (elementRef.current) {
      e.dataTransfer.setDragImage(elementRef.current, 0, 0);
    }
  }, [type, index]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!dragState || dragState.type !== type || dragState.index === index) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Calculate drop position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDropPosition(e.clientY < midY ? 'above' : 'below');
  }, [type, index]);

  const handleDragLeave = useCallback(() => {
    setDropPosition(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropPosition(null);

    if (!dragState || dragState.type !== type || dragState.index === index) {
      return;
    }

    const fromIndex = dragState.index;
    let toIndex = index;

    // If dropping below and source is above target, adjust index
    if (dropPosition === 'below' && fromIndex < index) {
      toIndex = index;
    } else if (dropPosition === 'above' && fromIndex > index) {
      toIndex = index;
    } else if (dropPosition === 'below') {
      toIndex = index + 1 > fromIndex ? index : index + 1;
    }

    // Clamp
    if (fromIndex !== toIndex) {
      onReorder(fromIndex, toIndex);
    }
  }, [type, index, onReorder, dropPosition]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDropPosition(null);
    dragState = null;
  }, []);

  return {
    ref: elementRef,
    isDragging,
    dropPosition,
    dragProps: {
      draggable: true,
      onDragStart: handleDragStart,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
      onDragEnd: handleDragEnd,
    },
  };
}
