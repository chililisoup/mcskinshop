import React, { useState } from 'react';
import * as Util from '@tools/util';
import DraggableWindow from '@components/basic/draggablewindow';
import PropertiesList from '@components/basic/propertieslist';

type AProps = {
  defaultWidth: number;
  defaultHeight: number;
  close: () => void;
  createRender: (width: number, height: number, smaa: boolean) => string;
};

type StoredSettings = {
  width: number;
  height: number;
  smaa: boolean;
  name: string;
};

export default function ExportRender(props: AProps) {
  const stored = JSON.parse(
    sessionStorage.getItem('render-settings') ?? '{}'
  ) as Partial<StoredSettings>;

  const [width, setWidth] = useState(stored.width ?? props.defaultWidth);
  const [height, setHeight] = useState(stored.height ?? props.defaultHeight);
  const [smaa, setSmaa] = useState(stored.smaa ?? false);
  const [name, setName] = useState(stored.name ?? 'My Skin Render');

  const render = props.createRender(width, height, smaa);

  function storeAndClose() {
    const saveSize = width !== props.defaultWidth || height !== props.defaultHeight;

    sessionStorage.setItem(
      'render-settings',
      JSON.stringify({
        width: saveSize ? width : undefined,
        height: saveSize ? height : undefined,
        smaa: smaa,
        name: name
      })
    );

    props.close();
  }

  return (
    <DraggableWindow
      title="Export Render"
      important={true}
      close={storeAndClose}
      anchor={{ vw: 0.5, vh: 0.2 }}
    >
      <div className="export-render">
        <div>
          <img src={render} />
        </div>
        <hr className="vr" />
        <div>
          <PropertiesList
            properties={[
              {
                name: 'Match Viewport',
                id: '1xViewport',
                type: 'button',
                onClick: () => {
                  setWidth(props.defaultWidth);
                  setHeight(props.defaultHeight);
                },
                siblings: [
                  {
                    name: '2x Viewport',
                    id: '2xViewport',
                    type: 'button',
                    onClick: () => {
                      setWidth(props.defaultWidth * 2);
                      setHeight(props.defaultHeight * 2);
                    }
                  }
                ]
              },
              {
                name: '512x512',
                id: '512x',
                type: 'button',
                onClick: () => {
                  setWidth(512);
                  setHeight(512);
                },
                siblings: [
                  {
                    name: '1024x1024',
                    id: '1024x',
                    type: 'button',
                    onClick: () => {
                      setWidth(1024);
                      setHeight(1024);
                    }
                  },
                  {
                    name: '2048x2048',
                    id: '2048x',
                    type: 'button',
                    onClick: () => {
                      setWidth(2048);
                      setHeight(2048);
                    }
                  }
                ]
              },
              {
                name: 'Width',
                id: 'width',
                type: 'number',
                value: width,
                resetValue: props.defaultWidth,
                min: 1,
                enforceStep: true,
                onChange: setWidth
              },
              {
                name: 'Height',
                id: 'height',
                type: 'number',
                value: height,
                resetValue: props.defaultHeight,
                min: 1,
                enforceStep: true,
                onChange: setHeight
              },
              {
                id: 'smaaDivider',
                type: 'divider'
              },
              {
                name: 'SMAA',
                id: 'smaa',
                type: 'checkbox',
                value: smaa,
                onChange: setSmaa
              },
              {
                id: 'downloadDivider',
                type: 'divider'
              },
              {
                name: 'Name',
                id: 'name',
                type: 'string',
                value: name,
                placeholder: 'My Skin Render',
                onChange: setName
              },
              {
                name: 'Download',
                id: 'download',
                type: 'button',
                onClick: () => {
                  void Util.download(`${name}.png`, render, false);
                  storeAndClose();
                }
              }
            ]}
          />
        </div>
      </div>
    </DraggableWindow>
  );
}
