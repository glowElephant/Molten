import { useState, useRef, useCallback, useEffect } from 'react';

// Module-level drag state shared across all instances
let activeDrag: {
  type: string;
  index: number;
  element: HTMLElement;
  startY: number;
  clone: HTMLElement | null;
} | null = null;

type DropTarget = { index: number; position: 'above' | 'below' } | null;
let _dropTarget: DropTarget = null;
function getDropTarget(): DropTarget { return _dropTarget; }
function setDropTarget(v: DropTarget) { _dropTarget = v; }

const listeners = new Set<() => void>();
function notifyAll() { listeners.forEach((fn) => fn()); }

interface UseDragReorderOptions {
  type: string;
  index: number;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function useDragReorder({ type, index, onReorder }: UseDragReorderOptions) {
  const [, forceUpdate] = useState(0);
  const elementRef = useRef<HTMLDivElement>(null);
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  useEffect(() => {
    const update = () => forceUpdate((n) => n + 1);
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, [data-no-drag]')) return;

    const el = elementRef.current;
    if (!el) return;

    const startY = e.clientY;
    let dragging = false;

    const onMouseMove = (ev: MouseEvent) => {
      const dy = Math.abs(ev.clientY - startY);

      if (!dragging && dy > 5) {
        dragging = true;
        const rect = el.getBoundingClientRect();
        const clone = el.cloneNode(true) as HTMLElement;
        clone.style.cssText = `
          position: fixed;
          left: ${rect.left}px;
          top: ${rect.top}px;
          width: ${rect.width}px;
          height: ${rect.height}px;
          opacity: 0.8;
          pointer-events: none;
          z-index: 9999;
          transition: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          border-radius: 6px;
        `;
        document.body.appendChild(clone);
        activeDrag = { type, index, element: el, startY, clone };
        notifyAll();
      }

      if (dragging && activeDrag?.clone) {
        const dy2 = ev.clientY - startY;
        const rect = el.getBoundingClientRect();
        activeDrag.clone.style.top = `${rect.top + dy2}px`;

        const allItems = document.querySelectorAll(`[data-drag-type="${type}"]`);
        const foundTarget = findDropTarget(allItems, ev.clientY, index);

        const prev = getDropTarget();
        if (foundTarget?.index !== prev?.index || foundTarget?.position !== prev?.position) {
          setDropTarget(foundTarget);
          notifyAll();
        }
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';

      const dt = getDropTarget();
      if (dragging && activeDrag && dt) {
        const fromIndex = activeDrag.index;
        let toIndex = dt.index;

        if (dt.position === 'below' && fromIndex > toIndex) {
          toIndex = toIndex + 1;
        } else if (dt.position === 'above' && fromIndex < toIndex) {
          toIndex = toIndex - 1;
        }

        if (fromIndex !== toIndex) {
          onReorderRef.current(fromIndex, toIndex);
        }
      }

      if (activeDrag?.clone) {
        activeDrag.clone.remove();
      }
      activeDrag = null;
      setDropTarget(null);
      dragging = false;
      notifyAll();
    };

    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [type, index]);

  const isDragging = activeDrag?.type === type && activeDrag?.index === index;
  const dt = getDropTarget();
  const isDropTarget = activeDrag?.type === type && dt !== null && dt.index === index;
  const currentDropPosition = isDropTarget && dt !== null ? dt.position : null;

  return {
    ref: elementRef,
    isDragging,
    dropPosition: currentDropPosition,
    dragProps: {
      onMouseDown: handleMouseDown,
      'data-drag-type': type,
      'data-drag-index': index,
    },
  };
}

function findDropTarget(items: NodeListOf<Element>, clientY: number, selfIndex: number): DropTarget {
  for (let i = 0; i < items.length; i++) {
    const itemEl = items[i] as HTMLElement;
    const itemIdx = parseInt(itemEl.dataset.dragIndex || '-1');
    if (itemIdx === selfIndex) continue;

    const rect = itemEl.getBoundingClientRect();
    if (clientY >= rect.top && clientY <= rect.bottom) {
      const midY = rect.top + rect.height / 2;
      return { index: itemIdx, position: clientY < midY ? 'above' : 'below' };
    }
  }
  return null;
}
