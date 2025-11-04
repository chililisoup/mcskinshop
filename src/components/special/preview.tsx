import React, { useState } from 'react';
import * as ImgMod from '@tools/imgmod';
import DraggableWindow from '@components/basic/draggablewindow';

type AProps = {
  close: () => void;
  skin?: string;
};

export default function Preview({ close, skin }: AProps) {
  const [size, setSize] = useState(4);

  return (
    <DraggableWindow title="Preview" anchor={{ vw: 1, vh: 1 }} close={close}>
      <div className="Preview">
        <span className="stretch">
          <button onClick={() => setSize(Math.max(size - 1, 1))}>-</button>
          <button onClick={() => setSize(Math.min(size + 1, 16))}>+</button>
        </span>
        <img
          src={skin ?? ImgMod.EMPTY_IMAGE_SOURCE}
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
