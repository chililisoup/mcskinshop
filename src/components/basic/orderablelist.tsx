import React, { useId, useRef, useState } from 'react';

type Option = { id: string; name: string };

type AProps = {
  callback: (options: Option[]) => void;
  options: readonly Option[];
  disabled?: boolean;
};

export default function OrderableList(props: AProps) {
  const listId = useId();
  const listRef = useRef(null as HTMLDivElement | null);
  const [insertingIndex, setInsertingIndex] = useState(null as number | null);
  const [draggingIndex, setDraggingIndex] = useState(null as number | null);

  function clear() {
    setInsertingIndex(null);
    setDraggingIndex(null);
  }

  function parseData(data: string) {
    const splitData = data.split('-');
    return {
      listId: splitData[0],
      index: Number(splitData[1])
    };
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer.types.includes('application/mcss-orderable-list-item')) return;

    const data = parseData(e.dataTransfer.getData('application/mcss-orderable-list-item'));
    if (data.listId !== listId) return;
    e.dataTransfer.dropEffect = 'move';

    e.stopPropagation();
    e.preventDefault();

    if (!listRef.current) return;

    listRef.current.classList.add('dragover');

    const children = listRef.current.children;
    if (!children || children.length < 1) return clear();

    let closestDist: undefined | number = undefined;
    let index = 0;

    const checkDist = (y: number, i: number) => {
      const dist = Math.abs(e.clientY - y);
      if (closestDist === undefined || dist < closestDist) {
        closestDist = dist;
        index = i;
      }
    };

    let indexOffset = 0;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.tagName === 'HR') {
        indexOffset++;
        continue;
      }

      const rect = child.getBoundingClientRect();
      checkDist(rect.top, i - indexOffset);
      checkDist(rect.bottom, i + 1 - indexOffset);
    }

    if (index !== insertingIndex) setInsertingIndex(index);
    if (data.index !== draggingIndex) setDraggingIndex(data.index);
  }

  const onDragLeave = () => listRef.current?.classList.remove('dragover');

  function onDragEnd() {
    onDragLeave();
    clear();
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    if (insertingIndex === null) return onDragLeave();
    onDragEnd();

    if (!e.dataTransfer.types.includes('application/mcss-orderable-list-item')) return;

    const data = parseData(e.dataTransfer.getData('application/mcss-orderable-list-item'));
    if (data.listId !== listId) return;

    const fromIndex = data.index;

    const to = insertingIndex > fromIndex ? insertingIndex - 1 : insertingIndex;
    if (fromIndex !== to) moveItem(fromIndex, to - fromIndex);

    e.stopPropagation();
    e.preventDefault();

    clear();
  }

  function moveItem(index: number, change: number) {
    if (index + change < 0) change = props.options.length - 1;
    if (index + change >= props.options.length) change = 0 - (props.options.length - 1);

    const item = props.options[index];
    const options = [...props.options];
    options.splice(index, 1);
    options.splice(index + change, 0, item);

    props.callback(options);
  }

  const listItems = props.options.map((option, index) => (
    <OrderableListItem
      key={'item-' + option.id}
      listId={listId}
      index={index}
      option={option}
      dragging={index === draggingIndex}
    />
  ));

  if (insertingIndex !== null) listItems.splice(insertingIndex, 0, <hr key="insert-indicator" />);

  return (
    <div
      className={'orderable-list' + (props.disabled ? ' disabled' : '')}
      onDragEnter={onDragOver}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      ref={listRef}
    >
      {listItems}
    </div>
  );
}

type BProps = {
  listId: string;
  index: number;
  option: Option;
  dragging: boolean;
};

function OrderableListItem(props: BProps) {
  const itemRef = useRef(null as HTMLSpanElement | null);

  function onDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.stopPropagation();

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(
      'application/mcss-orderable-list-item',
      `${props.listId}-${props.index}`
    );
  }

  return (
    <span
      key={`${props.index}_${props.option.id}`}
      draggable
      onDragStart={onDragStart}
      ref={itemRef}
      className={props.dragging ? 'dragging' : undefined}
    >
      <div className="material-symbols-outlined">drag_indicator</div>
      <p>{props.option.name}</p>
    </span>
  );
}
