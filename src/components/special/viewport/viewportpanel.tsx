import React, { Component } from 'react';
import * as PaperDoll from '@components/special/viewport/paperdoll';
import { UndoCallback } from '@components/special/skinmanager';
import Dropdown from '@components/basic/dropdown';
import PropertiesList from '@components/basic/propertieslist';
import FileInput from '@components/basic/fileinput';

type AProps = {
  settings: {
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
  };

  slim: boolean;
  updateSetting: <KKey extends keyof PaperDoll.AState>(
    setting: KKey,
    value: PaperDoll.AState[KKey],
    saveEdit?: boolean
  ) => void;
  updateSlim: (slim: boolean) => void;
  resetCameraPosition: () => void;
  addEdit: (name: string, undoCallback: UndoCallback) => void;
};

type AState = {
  panel: boolean;
};

export default class ViewportPanel extends Component<AProps, AState> {
  constructor(props: AProps) {
    super(props);

    this.state = {
      panel: true
    };
  }

  onKeyDown = (e: KeyboardEvent) => {
    if (e.key.toUpperCase() === 'N') this.setState({ panel: !this.state.panel });
  };

  setBackgroundImage = (file: File) => {
    // const name = file.name;
    // const image = new ImgMod.Img();
    // image.size = ASSET_TYPE_RESOLUTIONS[FEATURE_LIST_ASSET_TYPES[feature[0]]];

    // await image.loadUrl(URL.createObjectURL(file));
    // const blobSrc = await image.getImageBlobSrc();
    // if (!blobSrc) return;

    // const save = this.loadCustomFeatures();
    // const updated = save[feature[0]] ?? [];
    // updated.push([name, blobSrc, true]);
    // save[feature[0]] = updated;

    this.props.updateSetting('backgroundImage', URL.createObjectURL(file));
    this.props.updateSetting('background', true);
  };

  togglePart = (part: keyof PaperDoll.AState['partToggles'], hat: boolean, value: boolean) => {
    const toggles = JSON.parse(
      JSON.stringify(this.props.settings.partToggles)
    ) as PaperDoll.AState['partToggles'];
    toggles[part][hat ? 'hat' : 'base'] = value;
    this.props.updateSetting('partToggles', toggles);
  };

  togglePartSet = (partSet: 'base' | 'hat' | 'all') => {
    let on = 0;

    if (partSet === 'all')
      for (const part in this.props.settings.partToggles) {
        if (this.props.settings.partToggles[part as keyof PaperDoll.AState['partToggles']].base)
          on++;
        if (this.props.settings.partToggles[part as keyof PaperDoll.AState['partToggles']].hat)
          on++;
      }
    else
      for (const part in this.props.settings.partToggles)
        if (this.props.settings.partToggles[part as keyof PaperDoll.AState['partToggles']][partSet])
          on++;

    const toggle = on <= (partSet === 'all' ? 6 : 3);
    const toggles = JSON.parse(
      JSON.stringify(this.props.settings.partToggles)
    ) as PaperDoll.AState['partToggles'];

    if (partSet === 'all')
      for (const part in this.props.settings.partToggles)
        toggles[part as keyof PaperDoll.AState['partToggles']] = { base: toggle, hat: toggle };
    else
      for (const part in this.props.settings.partToggles)
        toggles[part as keyof PaperDoll.AState['partToggles']][partSet] = toggle;

    this.props.updateSetting('partToggles', toggles);
  };

  render() {
    const panelItems = [
      <span key="head">
        <span>
          <span>
            <label htmlFor="slimToggle">Slim</label>
            <input
              type="checkbox"
              id="slimToggle"
              checked={this.props.slim}
              onChange={e => this.props.updateSlim(e.target.checked)}
            />
          </span>
          <span>
            <label htmlFor="gridToggle">Grid</label>
            <input
              type="checkbox"
              id="gridToggle"
              checked={this.props.settings.grid}
              onChange={e => this.props.updateSetting('grid', e.target.checked)}
            />
          </span>
        </span>
        <span>
          <span>
            <label htmlFor="backgroundToggle">Background</label>
            <input
              type="checkbox"
              id="backgroundToggle"
              checked={this.props.settings.background}
              onChange={e => this.props.updateSetting('background', e.target.checked)}
              disabled={this.props.settings.background === undefined}
            />
            <FileInput accept="image/png" callback={this.setBackgroundImage}>
              Upload...
            </FileInput>
          </span>
        </span>
      </span>,
      <Dropdown title="Camera" key="camera">
        <PropertiesList
          buttonFallback={id => {
            if (id === 'type')
              this.props.updateSetting(
                'usePerspectiveCam',
                !this.props.settings.usePerspectiveCam,
                true
              );
            else if (id === 'resetCameraPosition') this.props.resetCameraPosition();
          }}
          numberFallback={(id, value, finished) => {
            if (id === 'fov') this.props.updateSetting('fov', value, finished);
          }}
          properties={[
            {
              name: 'Type',
              id: 'type',
              type: 'button',
              label: this.props.settings.usePerspectiveCam ? 'Perspective' : 'Orthographic'
            },
            {
              name: 'FOV',
              id: 'fov',
              type: 'range',
              value: this.props.settings.fov,
              resetValue: PaperDoll.defaultViewOptions.fov,
              min: 30,
              max: 120,
              subtype: 'degrees',
              disabled: !this.props.settings.usePerspectiveCam
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
            if (id === 'shade') this.props.updateSetting('shade', value, true);
          }}
          numberFallback={(id, value, finished) => {
            if (id === 'lightFocus')
              this.props.updateSetting('lightFocus', (value / 10) ** 2, finished);
            else if (id === 'lightAngle') this.props.updateSetting('lightAngle', value, finished);
            else if (id === 'ambientLightIntensity')
              this.props.updateSetting('ambientLightIntensity', value, finished);
            else if (id === 'directionalLightIntensity')
              this.props.updateSetting('directionalLightIntensity', value, finished);
          }}
          stringFallback={(id, value, finished) => {
            if (id === 'ambientLightColor')
              this.props.updateSetting('ambientLightColor', value, finished);
            else if (id === 'directionalLightColor')
              this.props.updateSetting('directionalLightColor', value, finished);
          }}
          properties={[
            {
              name: 'Shade',
              id: 'shade',
              type: 'checkbox',
              value: this.props.settings.shade
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
                  value: Math.sqrt(this.props.settings.lightFocus) * 10,
                  resetValue: Math.sqrt(PaperDoll.defaultViewOptions.lightFocus) * 10,
                  min: 0,
                  max: 100,
                  subtype: 'percent',
                  disabled: !this.props.settings.shade
                },
                {
                  name: 'Angle',
                  id: 'lightAngle',
                  type: 'range',
                  value: this.props.settings.lightAngle,
                  resetValue: PaperDoll.defaultViewOptions.lightAngle,
                  min: 0,
                  max: 2 * Math.PI,
                  step: Math.PI / 180,
                  snap: Math.PI / 18,
                  subtype: 'radiansAsDegrees',
                  disabled: !this.props.settings.shade
                },
                {
                  name: 'Color',
                  id: 'directionalLightColor',
                  type: 'color',
                  value: this.props.settings.directionalLightColor,
                  resetValue: PaperDoll.defaultViewOptions.directionalLightColor,
                  controlled: true,
                  disabled: !this.props.settings.shade
                },
                {
                  name: 'Intensity',
                  id: 'directionalLightIntensity',
                  type: 'range',
                  value: this.props.settings.directionalLightIntensity,
                  resetValue: PaperDoll.defaultViewOptions.directionalLightIntensity,
                  min: 0,
                  max: 5,
                  step: 0.1,
                  disabled: !this.props.settings.shade
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
                  value: this.props.settings.ambientLightColor,
                  resetValue: PaperDoll.defaultViewOptions.ambientLightColor,
                  controlled: true,
                  disabled: !this.props.settings.shade
                },
                {
                  name: 'Intensity',
                  id: 'ambientLightIntensity',
                  type: 'range',
                  value: this.props.settings.ambientLightIntensity,
                  resetValue: PaperDoll.defaultViewOptions.ambientLightIntensity,
                  min: 0,
                  max: 5,
                  step: 0.1,
                  disabled: !this.props.settings.shade
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
                    checked={this.props.settings.partToggles.head.hat}
                    onChange={e => this.togglePart('head', true, e.target.checked)}
                  />
                  <input
                    className="inner"
                    type="checkbox"
                    checked={this.props.settings.partToggles.head.base}
                    onChange={e => this.togglePart('head', false, e.target.checked)}
                  />
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div
                  className="stack"
                  style={{ width: '36px', height: '81px', marginRight: '-9px' }}
                >
                  <input
                    type="checkbox"
                    checked={this.props.settings.partToggles.rightArm.hat}
                    onChange={e => this.togglePart('rightArm', true, e.target.checked)}
                  />
                  <input
                    className="inner"
                    type="checkbox"
                    checked={this.props.settings.partToggles.rightArm.base}
                    onChange={e => this.togglePart('rightArm', false, e.target.checked)}
                  />
                </div>
              </td>
              <td colSpan={2}>
                <div className="stack" style={{ width: '63px', height: '81px' }}>
                  <input
                    type="checkbox"
                    checked={this.props.settings.partToggles.torso.hat}
                    onChange={e => this.togglePart('torso', true, e.target.checked)}
                  />
                  <input
                    className="inner"
                    type="checkbox"
                    checked={this.props.settings.partToggles.torso.base}
                    onChange={e => this.togglePart('torso', false, e.target.checked)}
                  />
                </div>
              </td>
              <td>
                <div
                  className="stack"
                  style={{ width: '36px', height: '81px', marginLeft: '-9px' }}
                >
                  <input
                    type="checkbox"
                    checked={this.props.settings.partToggles.leftArm.hat}
                    onChange={e => this.togglePart('leftArm', true, e.target.checked)}
                  />
                  <input
                    className="inner"
                    type="checkbox"
                    checked={this.props.settings.partToggles.leftArm.base}
                    onChange={e => this.togglePart('leftArm', false, e.target.checked)}
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
                    checked={this.props.settings.partToggles.rightLeg.hat}
                    onChange={e => this.togglePart('rightLeg', true, e.target.checked)}
                  />
                  <input
                    className="inner"
                    type="checkbox"
                    checked={this.props.settings.partToggles.rightLeg.base}
                    onChange={e => this.togglePart('rightLeg', false, e.target.checked)}
                  />
                </div>
              </td>
              <td>
                <div className="stack" style={{ width: '36px', height: '81px' }}>
                  <input
                    type="checkbox"
                    checked={this.props.settings.partToggles.leftLeg.hat}
                    onChange={e => this.togglePart('leftLeg', true, e.target.checked)}
                  />
                  <input
                    className="inner"
                    type="checkbox"
                    checked={this.props.settings.partToggles.leftLeg.base}
                    onChange={e => this.togglePart('leftLeg', false, e.target.checked)}
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <span className="spread">
          <button onClick={() => this.togglePartSet('hat')}>Toggle Hat</button>
          <button onClick={() => this.togglePartSet('base')}>Toggle Base</button>
          <button onClick={() => this.togglePartSet('all')}>Toggle All</button>
        </span>
      </Dropdown>
    ];

    return (
      <div className={'top panel' + (this.state.panel ? ' open' : '')}>
        <button onClick={() => this.setState({ panel: !this.state.panel })}
              className="material-symbols-outlined">
          {this.state.panel ? 'keyboard_arrow_right' : 'keyboard_arrow_left'}
        </button>
        <div className="panel-content">{this.state.panel && panelItems}</div>
      </div>
    );
  }
}
