import React, { useImperativeHandle, useState } from 'react';
import * as PaperDoll from '@components/special/viewport/paperdoll';
import Dropdown from '@components/basic/dropdown';
import PropertiesList from '@components/basic/propertieslist';
import FileInput from '@components/basic/fileinput';
import SkinManager, { useSkin } from '@tools/skinman';

type AProps = {
  shade: boolean;
  lightAngle: number;
  lightFocus: number;
  ambientLightColor: string;
  ambientLightIntensity: number;
  directionalLightColor: string;
  directionalLightIntensity: number;
  partToggles: PaperDoll.AState['partToggles'];
  fov: number;
  usePerspectiveCam: boolean;
  grid: boolean;
  background?: boolean;
  updateSetting: <KKey extends keyof PaperDoll.AState>(
    setting: KKey,
    value: PaperDoll.AState[KKey],
    saveEdit?: boolean
  ) => void;
  resetCameraPosition: () => void;
  ref: React.Ref<ViewportPanelHandle>;
};

export type ViewportPanelHandle = {
  onKeyDown: (e: KeyboardEvent) => void;
};

export default function ViewportPanel(props: AProps) {
  const [panel, setPanel] = useState(true);
  const slim = useSkin('slim').slim;

  useImperativeHandle(props.ref, () => ({
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key.toUpperCase() === 'N') setPanel(!panel);
    }
  }));

  function setBackgroundImage(file: File) {
    // const name = file.name;
    // const image = new ImgMod.Img();
    // image.size = ASSET_TYPE_RESOLUTIONS[FEATURE_LIST_ASSET_TYPES[feature[0]]];

    // await image.loadUrl(URL.createObjectURL(file));
    // const blobSrc = await image.getImageBlobSrc();
    // if (!blobSrc) return;

    // const save = loadCustomFeatures();
    // const updated = save[feature[0]] ?? [];
    // updated.push([name, blobSrc, true]);
    // save[feature[0]] = updated;

    props.updateSetting('backgroundImage', URL.createObjectURL(file));
    props.updateSetting('background', true);
  }

  function togglePart(part: keyof PaperDoll.AState['partToggles'], hat: boolean, value: boolean) {
    const toggles = JSON.parse(
      JSON.stringify(props.partToggles)
    ) as PaperDoll.AState['partToggles'];
    toggles[part][hat ? 'hat' : 'base'] = value;
    props.updateSetting('partToggles', toggles);
  }

  function togglePartSet(partSet: 'base' | 'hat' | 'all') {
    let on = 0;

    if (partSet === 'all')
      for (const part in props.partToggles) {
        if (props.partToggles[part as keyof PaperDoll.AState['partToggles']].base) on++;
        if (props.partToggles[part as keyof PaperDoll.AState['partToggles']].hat) on++;
      }
    else
      for (const part in props.partToggles)
        if (props.partToggles[part as keyof PaperDoll.AState['partToggles']][partSet]) on++;

    const toggle = on <= (partSet === 'all' ? 6 : 3);
    const toggles = JSON.parse(
      JSON.stringify(props.partToggles)
    ) as PaperDoll.AState['partToggles'];

    if (partSet === 'all')
      for (const part in props.partToggles)
        toggles[part as keyof PaperDoll.AState['partToggles']] = { base: toggle, hat: toggle };
    else
      for (const part in props.partToggles)
        toggles[part as keyof PaperDoll.AState['partToggles']][partSet] = toggle;

    props.updateSetting('partToggles', toggles);
  }

  const panelItems = [
    <span key="head">
      <span>
        <span>
          <label htmlFor="slimToggle">Slim</label>
          <input
            type="checkbox"
            id="slimToggle"
            checked={slim}
            onChange={e => SkinManager.setSlim(e.target.checked)}
          />
        </span>
        <span>
          <label htmlFor="gridToggle">Grid</label>
          <input
            type="checkbox"
            id="gridToggle"
            checked={props.grid}
            onChange={e => props.updateSetting('grid', e.target.checked)}
          />
        </span>
      </span>
      <span>
        <span>
          <label htmlFor="backgroundToggle">Background</label>
          <input
            type="checkbox"
            id="backgroundToggle"
            checked={props.background}
            onChange={e => props.updateSetting('background', e.target.checked)}
            disabled={props.background === undefined}
          />
          <FileInput accept="image/png" callback={setBackgroundImage}>
            Upload...
          </FileInput>
        </span>
      </span>
    </span>,
    <Dropdown title="Camera" key="camera">
      <PropertiesList
        buttonFallback={id => {
          if (id === 'type')
            props.updateSetting('usePerspectiveCam', !props.usePerspectiveCam, true);
          else if (id === 'resetCameraPosition') props.resetCameraPosition();
        }}
        numberFallback={(id, value, finished) => {
          if (id === 'fov') props.updateSetting('fov', value, finished);
        }}
        properties={[
          {
            name: 'Type',
            id: 'type',
            type: 'button',
            label: props.usePerspectiveCam ? 'Perspective' : 'Orthographic'
          },
          {
            name: 'FOV',
            id: 'fov',
            type: 'range',
            value: props.fov,
            resetValue: PaperDoll.defaultViewportOptions.fov,
            min: 30,
            max: 120,
            subtype: 'degrees',
            disabled: !props.usePerspectiveCam
          },
          {
            name: 'Reset Camera Position',
            id: 'resetCameraPosition',
            type: 'button'
          }
        ]}
      />
    </Dropdown>,
    <Dropdown title="Lighting" key="lighting">
      <PropertiesList
        booleanFallback={(id, value) => {
          if (id === 'shade') props.updateSetting('shade', value, true);
        }}
        numberFallback={(id, value, finished) => {
          if (id === 'lightFocus') props.updateSetting('lightFocus', (value / 10) ** 2, finished);
          else if (id === 'lightAngle') props.updateSetting('lightAngle', value, finished);
          else if (id === 'ambientLightIntensity')
            props.updateSetting('ambientLightIntensity', value, finished);
          else if (id === 'directionalLightIntensity')
            props.updateSetting('directionalLightIntensity', value, finished);
        }}
        stringFallback={(id, value, finished) => {
          if (id === 'ambientLightColor') props.updateSetting('ambientLightColor', value, finished);
          else if (id === 'directionalLightColor')
            props.updateSetting('directionalLightColor', value, finished);
        }}
        properties={[
          {
            name: 'Shade',
            id: 'shade',
            type: 'checkbox',
            value: props.shade
          },
          {
            id: 'shadeDivider',
            type: 'divider'
          },
          {
            name: 'Directional Light',
            id: 'directionalLightSettings',
            type: 'section',
            properties: [
              {
                name: 'Focus',
                id: 'lightFocus',
                type: 'range',
                value: Math.sqrt(props.lightFocus) * 10,
                resetValue: Math.sqrt(PaperDoll.defaultViewportOptions.lightFocus) * 10,
                min: 0,
                max: 100,
                subtype: 'percent',
                disabled: !props.shade
              },
              {
                name: 'Angle',
                id: 'lightAngle',
                type: 'range',
                value: props.lightAngle,
                resetValue: PaperDoll.defaultViewportOptions.lightAngle,
                min: 0,
                max: 2 * Math.PI,
                step: Math.PI / 180,
                snap: Math.PI / 18,
                subtype: 'radiansAsDegrees',
                disabled: !props.shade
              },
              {
                name: 'Color',
                id: 'directionalLightColor',
                type: 'color',
                value: props.directionalLightColor,
                resetValue: PaperDoll.defaultViewportOptions.directionalLightColor,
                controlled: true,
                disabled: !props.shade
              },
              {
                name: 'Intensity',
                id: 'directionalLightIntensity',
                type: 'range',
                value: props.directionalLightIntensity,
                resetValue: PaperDoll.defaultViewportOptions.directionalLightIntensity,
                min: 0,
                max: 5,
                step: 0.1,
                disabled: !props.shade
              }
            ]
          },
          {
            name: 'Ambient Light',
            id: 'ambientLightSettings',
            type: 'section',
            properties: [
              {
                name: 'Color',
                id: 'ambientLightColor',
                type: 'color',
                value: props.ambientLightColor,
                resetValue: PaperDoll.defaultViewportOptions.ambientLightColor,
                controlled: true,
                disabled: !props.shade
              },
              {
                name: 'Intensity',
                id: 'ambientLightIntensity',
                type: 'range',
                value: props.ambientLightIntensity,
                resetValue: PaperDoll.defaultViewportOptions.ambientLightIntensity,
                min: 0,
                max: 5,
                step: 0.1,
                disabled: !props.shade
              }
            ]
          }
        ]}
      />
    </Dropdown>,
    <Dropdown title="Model Visibility" key="model-toggles">
      <table className="model-toggles">
        <tbody>
          <tr>
            <td />
            <td colSpan={2}>
              <div className="stack" style={{ width: '63px', height: '63px' }}>
                <input
                  type="checkbox"
                  checked={props.partToggles.head.hat}
                  onChange={e => togglePart('head', true, e.target.checked)}
                />
                <input
                  className="inner"
                  type="checkbox"
                  checked={props.partToggles.head.base}
                  onChange={e => togglePart('head', false, e.target.checked)}
                />
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <div className="stack" style={{ width: '36px', height: '81px', marginRight: '-9px' }}>
                <input
                  type="checkbox"
                  checked={props.partToggles.rightArm.hat}
                  onChange={e => togglePart('rightArm', true, e.target.checked)}
                />
                <input
                  className="inner"
                  type="checkbox"
                  checked={props.partToggles.rightArm.base}
                  onChange={e => togglePart('rightArm', false, e.target.checked)}
                />
              </div>
            </td>
            <td colSpan={2}>
              <div className="stack" style={{ width: '63px', height: '81px' }}>
                <input
                  type="checkbox"
                  checked={props.partToggles.torso.hat}
                  onChange={e => togglePart('torso', true, e.target.checked)}
                />
                <input
                  className="inner"
                  type="checkbox"
                  checked={props.partToggles.torso.base}
                  onChange={e => togglePart('torso', false, e.target.checked)}
                />
              </div>
            </td>
            <td>
              <div className="stack" style={{ width: '36px', height: '81px', marginLeft: '-9px' }}>
                <input
                  type="checkbox"
                  checked={props.partToggles.leftArm.hat}
                  onChange={e => togglePart('leftArm', true, e.target.checked)}
                />
                <input
                  className="inner"
                  type="checkbox"
                  checked={props.partToggles.leftArm.base}
                  onChange={e => togglePart('leftArm', false, e.target.checked)}
                />
              </div>
            </td>
          </tr>
          <tr>
            <td />
            <td>
              <div className="stack" style={{ width: '36px', height: '81px' }}>
                <input
                  type="checkbox"
                  checked={props.partToggles.rightLeg.hat}
                  onChange={e => togglePart('rightLeg', true, e.target.checked)}
                />
                <input
                  className="inner"
                  type="checkbox"
                  checked={props.partToggles.rightLeg.base}
                  onChange={e => togglePart('rightLeg', false, e.target.checked)}
                />
              </div>
            </td>
            <td>
              <div className="stack" style={{ width: '36px', height: '81px' }}>
                <input
                  type="checkbox"
                  checked={props.partToggles.leftLeg.hat}
                  onChange={e => togglePart('leftLeg', true, e.target.checked)}
                />
                <input
                  className="inner"
                  type="checkbox"
                  checked={props.partToggles.leftLeg.base}
                  onChange={e => togglePart('leftLeg', false, e.target.checked)}
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <span className="spread">
        <button onClick={() => togglePartSet('hat')}>Toggle Hat</button>
        <button onClick={() => togglePartSet('base')}>Toggle Base</button>
        <button onClick={() => togglePartSet('all')}>Toggle All</button>
      </span>
    </Dropdown>
  ];

  return (
    <div className={'top panel' + (panel ? ' open' : '')}>
      <button onClick={() => setPanel(!panel)} className="material-symbols-outlined">
        {panel ? 'keyboard_arrow_right' : 'keyboard_arrow_left'}
      </button>
      <div className="panel-content">{panel && panelItems}</div>
    </div>
  );
}
