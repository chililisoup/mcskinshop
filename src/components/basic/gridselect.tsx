import React, { useEffect, useRef, useState } from 'react';
import no from '@assets/no.png';

export type Option = [entry: string, imageSrc: string, hasDeleteButton?: boolean] | false;

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
  options: readonly Option[];
  default?: Option;
  select: (option: Option) => void;
  delete?: (option: Option) => void;
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

    setChildWidth(width / columns);
  }

  function select(option: Option) {
    props.select(option);
    setSelected(option);
  }

  function addOption(
    option: Option,
    divStyle: React.CSSProperties,
    imgStyle?: React.CSSProperties
  ) {
    return (
      <div
        style={divStyle}
        onClick={() => select(option)}
        className={
          (option ? 'true-option' : 'none-option') + (selected === option ? ' highlighted' : '')
        }
      >
        {option ? (
          <img alt={option[0]} src={option[1]} style={imgStyle} />
        ) : (
          <img alt="None" src={no} />
        )}
        {option && option[2] && (
          <button
            className="delete-button material-symbols-outlined"
            onClickCapture={e => {
              e.preventDefault();
              e.stopPropagation();

              if (selected === option) select(false);
              props.delete?.(option);
            }}
          >
            delete
          </button>
        )}
      </div>
    );
  }

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
      {props.options.map(option => addOption(option, divStyle, imgStyle))}
    </div>
  );
}
