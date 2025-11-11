import React, { useEffect, useRef } from 'react';

type AProps = {
  onChange: (delta: number) => void;
};

export default function DraggableDivider({ onChange }: AProps) {
  const dragging = useRef(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => dragging.current && onChange(e.movementX);
    const onMouseUp = () => (dragging.current = false);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  });

  return <div className="draggable-divider" onMouseDown={() => (dragging.current = true)} />;
}
