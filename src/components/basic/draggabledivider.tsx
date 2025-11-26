import React, { useLayoutEffect, useRef } from 'react';

type AProps = {
  onChange: (delta: number) => void;
};

export default function DraggableDivider({ onChange }: AProps) {
  const divRef = useRef(null as HTMLDivElement | null);
  const dragging = useRef(false);

  useLayoutEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current || !divRef.current) return;
      const rect = divRef.current.getBoundingClientRect();
      onChange(e.clientX - (rect.left + rect.right) / 2);
    };
    const onPointerUp = () => (dragging.current = false);

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);

    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };
  });

  return (
    <div className="draggable-divider" onPointerDown={() => (dragging.current = true)} ref={divRef} />
  );
}
