import React, { useLayoutEffect, useRef } from 'react';

type AProps = {
  onChange: (delta: number) => void;
};

export default function DraggableDivider({ onChange }: AProps) {
  const divRef = useRef(null as HTMLDivElement | null);
  const dragging = useRef(false);

  useLayoutEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !divRef.current) return;
      const rect = divRef.current.getBoundingClientRect();
      onChange(e.clientX - (rect.left + rect.right) / 2);
    };
    const onMouseUp = () => (dragging.current = false);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  });

  return (
    <div className="draggable-divider" onMouseDown={() => (dragging.current = true)} ref={divRef} />
  );
}
