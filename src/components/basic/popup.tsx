import React, { useLayoutEffect, useRef } from 'react';

type AProps = {
  close?: () => void;
  children: React.ReactNode;
};

export default function PopUp(props: AProps) {
  const wrapperRef: React.RefObject<HTMLDivElement | null> = useRef(null);
  const first = useRef(false);

  useLayoutEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!first.current) {
        first.current = true;
        return;
      }
      if (
        e.target &&
        e.target instanceof Element &&
        props.close &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {
        props.close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });

  return (
    <div ref={wrapperRef} className="popup">
      {props.children}
    </div>
  );
}
