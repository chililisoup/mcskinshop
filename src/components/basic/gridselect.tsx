import React, { useEffect, useRef, useState } from 'react';
import no from '@assets/no.png';

export type Option =
  | {
      imageSrc: string;
      name?: string;
      hasDeleteButton?: boolean;
    }
  | false;

export type Crop = {
  aspectRatio: number;
  x: number;
  y: number;
  sx: number;
  sy: number;
};

type AProps = {
  targetWidth?: number;
  crop?: Crop;
  options: Readonly<Record<string, Option>>;
  default?: string | false;
  select: (id: string | false) => void;
  delete?: (id: string) => void;
};

export default function GridSelect(props: AProps) {
  const gridRef: React.RefObject<HTMLDivElement | null> = useRef(null);
  const [selected, setSelected] = useState(props.default ?? false);
  const [childWidth, setChildWidth] = useState(1);

  useEffect(() => {
    window.addEventListener('resize', handleWindowResize);
    handleWindowResize();
    return () => window.removeEventListener('resize', handleWindowResize);
  });

  function handleWindowResize() {
    if (!gridRef.current) return;

    const width = gridRef.current.clientWidth;
    const columns = Math.max(1, Math.round(width / (props.targetWidth ?? 100)));

    setChildWidth(Math.floor(width / columns));
  }

  function select(id: string | false) {
    props.select(id);
    setSelected(id);
  }

  const addOption = (
    id: string,
    option: Option,
    divStyle: React.CSSProperties,
    imgStyle?: React.CSSProperties
  ) => (
    <div
      style={divStyle}
      onClick={() => select(id)}
      className={
        (option ? 'true-option' : 'none-option') +
        (selected === id || selected === option ? ' highlighted' : '')
      }
      key={id}
    >
      {option ? (
        <img alt={option.name ?? id} src={option.imageSrc} style={imgStyle} />
      ) : (
        <img alt="None" src={no} />
      )}
      {option && option.hasDeleteButton && (
        <button
          className="delete-button material-symbols-outlined"
          onClickCapture={e => {
            e.preventDefault();
            e.stopPropagation();

            if (selected === id) select(false);
            props.delete?.(id);
          }}
        >
          delete
        </button>
      )}
    </div>
  );

  let divStyle: React.CSSProperties = {
    width: childWidth - 6
  };

  let imgStyle: React.CSSProperties | undefined = undefined;

  if (props.crop) {
    const divWidth = childWidth - 6;
    const divHeight = (divWidth / props.crop.aspectRatio) * (props.crop.sy / props.crop.sx);

    divStyle = {
      width: divWidth,
      height: divHeight
    };

    const imgWidth = divWidth / props.crop.sx;
    const imgHeight = divHeight / props.crop.sy;

    imgStyle = {
      width: imgWidth,
      height: imgHeight,
      marginLeft: -(imgWidth * props.crop.x),
      marginTop: -(imgHeight * props.crop.y)
    };
  }

  return (
    <div className="grid-select" ref={gridRef}>
      {Object.entries(props.options).map(([id, option]) =>
        addOption(id, option, divStyle, imgStyle)
      )}
    </div>
  );
}
