import React from 'react';

type AProps = {
  callback?: (file: File, name: string) => void;
  id?: string;
  accept?: string;
  disabled?: boolean;
  children: React.ReactNode;
};

export default function FileInput(props: AProps) {
  const uploadRef: React.RefObject<HTMLInputElement | null> = React.useRef(null);

  return (
    <button id={props.id} disabled={props.disabled} onClick={() => uploadRef.current?.click()}>
      {props.children}
      <input
        type="file"
        className="hidden"
        ref={uploadRef}
        accept={props.accept}
        onChange={e => {
          if (!e.target.files) return;
          props.callback?.(e.target.files[0], e.target.files[0].name.replace(/\.[^/.]+$/, ''));
          e.target.value = '';
        }}
      />
    </button>
  );
}
