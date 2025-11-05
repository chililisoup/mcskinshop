import React, { useEffect, useRef } from 'react';

type AProps = {
  callback: (value: number, finished: boolean) => void;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  id?: string;
  title?: string;
  placeholder?: string;
  disabled?: boolean;
  enforceStep?: boolean;
};

export default function NumberInput(props: AProps) {
  const inputRef: React.RefObject<HTMLInputElement | null> = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.value = String(props.value);
  }, [props.value]);

  function setFromText() {
    if (!inputRef.current) return;

    let value = Number(inputRef.current.value);

    if (props.enforceStep) {
      const step = props.step ?? 1;
      value += step / 2;
      value -= value % step;
    }

    if (props.min) value = Math.max(value, props.min);
    if (props.max) value = Math.min(value, props.max);

    inputRef.current.value = String(props.value);
    props.callback(value, true);
  }

  return (
    <input
      type="number"
      id={props.id}
      title={props.title}
      placeholder={props.placeholder}
      defaultValue={props.value}
      min={props.min}
      max={props.max}
      step={props.step}
      disabled={props.disabled}
      onBlur={() => setFromText()}
      onKeyDown={e => {
        if (e.key === 'Enter') setFromText();
        e.stopPropagation();
      }}
      onClick={() => setFromText()}
      ref={inputRef}
    />
  );
}
