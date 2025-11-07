import React, { useEffect, useRef } from 'react';

type AProps = {
  close?: () => void;
  children: React.ReactNode;
};

export default function PopUp(props: AProps) {
  const wrapperRef: React.RefObject<HTMLDivElement | null> = useRef(null);
  const first = useRef(false);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });

  function handleClickOutside(e: MouseEvent) {
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
  }

  return (
    <div ref={wrapperRef} className="popup">
      {props.children}
    </div>
  );
}
