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
    document.addEventListener('mousedown', checkFocus);
  }

  useEffect(() => {
    const currentWindow = windowRef.current;
    if (currentWindow) currentWindow.addEventListener('mousedown', startFocus);

    document.addEventListener('mousedown', checkFocus);

    return () => {
      if (currentWindow) currentWindow.removeEventListener('mousedown', startFocus);

      document.removeEventListener('mousedown', checkFocus);
    };
  });

  return (
    <div ref={windowRef} className={'window' + (active ? ' active' : '')} style={props.style}>
      {props.children}
    </div>
  );
}
