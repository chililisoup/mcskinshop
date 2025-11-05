import React, { useState } from 'react';
import * as Util from '@tools/util';
import DraggableWindow from '@components/basic/draggablewindow';
import PropertiesList from '@components/basic/propertieslist';

type AProps = {
  defaultWidth?: number;
  defaultHeight?: number;
  close: () => void;
  createRender: (width: number, height: number, smaa: boolean) => string;
};

export default function ExportRender(props: AProps) {
  const [width, setWidth] = useState(props.defaultWidth ?? 1920);
  const [height, setHeight] = useState(props.defaultHeight ?? 1080);
  const [smaa, setSmaa] = useState(false);
  const [name, setName] = useState('My Skin Render');

  const render = props.createRender(width, height, smaa);

  return (
    <DraggableWindow
      title="Export Render"
      important={true}
      close={props.close}
      anchor={{ vw: 0.5, vh: 0.2 }}
    >
      <div className="export-render">
        <div>
          <img src={render}  />
        </div>
        <hr className="vr" />
        <div>
          <PropertiesList
            properties={[
              {
                name: 'Width',
                id: 'width',
                type: 'number',
                value: width,
                min: 1,
                enforceStep: true,
                onChange: setWidth
              },
              {
                name: 'Height',
                id: 'height',
                type: 'number',
                value: height,
                min: 1,
                enforceStep: true,
                onChange: setHeight
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
                  props.close();
                }
              }
            ]}
          />
        </div>
      </div>
    </DraggableWindow>
  );
}
