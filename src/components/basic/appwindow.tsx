import React, { useEffect, useRef, useState } from 'react';

type AProps = {
  style?: React.CSSProperties;
  children: React.ReactNode;
};

export default function AppWindow(props: AProps) {
  const windowRef: React.RefObject<HTMLDivElement | null> = useRef(null);
  const [active, setActive] = useState(false);

  function checkFocus(e: MouseEvent) {
    if (!(e.target instanceof Element)) return;
    if (!windowRef.current?.contains(e.target)) setActive(false);
  }

  function startFocus() {
    setActive(true);
    document.addEventListener('pointerdown', checkFocus);
  }

  useEffect(() => {
    const currentWindow = windowRef.current;
    if (currentWindow) currentWindow.addEventListener('pointerdown', startFocus);

    document.addEventListener('pointerdown', checkFocus);

    return () => {
      if (currentWindow) currentWindow.removeEventListener('pointerdown', startFocus);

      document.removeEventListener('pointerdown', checkFocus);
    };
  });

  return (
    <div ref={windowRef} className={'window' + (active ? ' active' : '')} style={props.style}>
      {props.children}
    </div>
  );
}
