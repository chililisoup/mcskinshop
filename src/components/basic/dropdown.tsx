import React, { useState } from 'react';

type AProps = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export default function Dropdown(props: AProps) {
  const [open, setOpen] = useState(props.defaultOpen ?? false);

  return (
    <div className="dropdown container inner-container">
      <span onClick={() => setOpen(!open)} className="dropdown-bar">
        <p>{props.title}</p>
        <span>
          <button className="material-symbols-outlined">
            {open ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
          </button>
        </span>
      </span>
      {open && (
        <div>
          <hr />
          {props.children}
          <hr />
        </div>
      )}
    </div>
  );
}
