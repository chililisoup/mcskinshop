import React, { useState } from 'react';
import DraggableWindow from '@components/basic/draggablewindow';
import { useSkin } from '@tools/skinman';

type AProps = {
  close: () => void;
};

export default function Preview({ close }: AProps) {
  const [size, setSize] = useState(4);
  const skin = useSkin();

  return (
    <DraggableWindow title="Preview" anchor={{ vw: 1, vh: 1 }} close={close}>
      <div className="preview">
        <span className="stretch">
          <button onClick={() => setSize(Math.max(size - 1, 1))}>-</button>
          <button onClick={() => setSize(Math.min(size + 1, 16))}>+</button>
        </span>
        <img
          src={skin.src}
          alt="Flattened Skin"
          style={{
            width: size * 64 + 'px',
            height: size * 64 + 'px',
            backgroundSize: size * 16 + 'px'
          }}
        />
      </div>
    </DraggableWindow>
  );
}
