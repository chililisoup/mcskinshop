import React, { Component } from 'react';
import * as PaperDoll from '@components/special/viewport/paperdoll';
import { UndoCallback } from '@components/special/skinmanager';
import Dropdown from '@components/basic/dropdown';
import PropertiesList from '@components/basic/propertieslist';

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
  };

  slim: boolean;
  updateSetting: <KKey extends keyof PaperDoll.AState>(
    setting: KKey,
    value: PaperDoll.AState[KKey]
  ) => void;
  updateSlim: (slim: boolean) => void;
  resetCameraPosition: () => void;
  resetLighting: () => void;
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

  updateSetting = <KKey extends keyof PaperDoll.AState>(
    setting: KKey,
    value: PaperDoll.AState[KKey]
  ) => {
    this.props.updateSetting(setting, value);
  };

  settingEdit = <KKey extends keyof PaperDoll.AState>(
    setting: KKey,
    from: PaperDoll.AState[KKey],
    to: PaperDoll.AState[KKey]
  ) => {
    this.props.updateSetting(setting, from);

    return () => this.settingEdit(setting, to, from);
  };

  updateSettingFinish = (
    setting: keyof AProps['settings'],
    value: PaperDoll.AState[keyof AProps['settings']]
  ) => {
    const from = this.props.settings[setting];

    this.updateSetting(setting, value);

    this.props.addEdit('change ' + setting, () => this.settingEdit(setting, from, value));
  };

  resetLighting = () => {
    this.props.resetLighting();
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
    return (
      <div className="top right panel">
        <button onClick={() => this.setState({ panel: !this.state.panel })}>
          {this.state.panel ? '>' : '<'}
        </button>
        {this.state.panel && (
          <div className="panel-content">
            <span>
              <label htmlFor="slimToggle">Slim</label>
              <input
                type="checkbox"
                id="slimToggle"
                checked={this.props.slim}
                onChange={e => this.props.updateSlim(e.target.checked)}
              />
              <label htmlFor="gridToggle">Grid</label>
              <input
                type="checkbox"
                id="gridToggle"
                checked={this.props.settings.grid}
                onChange={e => this.updateSetting('grid', e.target.checked)}
              />
            </span>
            <Dropdown title="Camera">
              <PropertiesList
                buttonFallback={id => {
                  if (id === 'cameraType')
                    this.updateSettingFinish(
                      'usePerspectiveCam',
                      !this.props.settings.usePerspectiveCam
                    );
                  else if (id === 'resetCameraPosition') this.props.resetCameraPosition();
                }}
                numberCallback={(id, value) => {
                  if (id === 'fov') this.updateSetting('fov', value);
                }}
                properties={[
                  {
                    name: 'Camera Type',
                    id: 'cameraType',
                    type: 'button',
                    label: this.props.settings.usePerspectiveCam ? 'Perspective' : 'Orthographic'
                  },
                  {
                    name: 'FOV',
                    id: 'fov',
                    type: 'range',
                    value: this.props.settings.fov,
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
            </Dropdown>
            <Dropdown title="Lighting">
              <PropertiesList
                booleanCallback={(id, value) => {
                  if (id === 'shade') this.updateSettingFinish('shade', value);
                }}
                numberCallback={(id, value) => {
                  if (id === 'lightFocus') this.updateSetting('lightFocus', (value / 10) ** 2);
                  else if (id === 'lightAngle') this.updateSetting('lightAngle', value);
                  else if (id === 'ambientLightIntensity')
                    this.updateSetting('ambientLightIntensity', value);
                  else if (id === 'directionalLightIntensity')
                    this.updateSetting('directionalLightIntensity', value);
                }}
                buttonFallback={id => {
                  if (id === 'resetLighting') this.resetLighting();
                }}
                stringCallback={(id, value) => {
                  if (id === 'ambientLightColor') this.updateSetting('ambientLightColor', value);
                  else if (id === 'directionalLightColor')
                    this.updateSetting('directionalLightColor', value);
                }}
                properties={[
                  {
                    name: 'Shade',
                    id: 'shade',
                    type: 'checkbox',
                    value: this.props.settings.shade
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
                        controlled: true,
                        disabled: !this.props.settings.shade
                      },
                      {
                        name: 'Intensity',
                        id: 'directionalLightIntensity',
                        type: 'range',
                        value: this.props.settings.directionalLightIntensity,
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
                        controlled: true,
                        disabled: !this.props.settings.shade
                      },
                      {
                        name: 'Intensity',
                        id: 'ambientLightIntensity',
                        type: 'range',
                        value: this.props.settings.ambientLightIntensity,
                        min: 0,
                        max: 5,
                        step: 0.1,
                        disabled: !this.props.settings.shade
                      }
                    ]
                  },
                  {
                    name: 'Reset Lighting',
                    id: 'resetLighting',
                    type: 'button'
                  }
                ]}
              />
            </Dropdown>
            <Dropdown title="Model Visibility">
              <table className="model-toggles">
                <tbody>
                  <tr>
                    <td />
                    <td colSpan={2}>
                      <div className="stack" style={{ width: '56px', height: '56px' }}>
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
                        style={{ width: '32px', height: '72px', marginRight: '-8px' }}
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
                      <div className="stack" style={{ width: '56px', height: '72px' }}>
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
                        style={{ width: '32px', height: '72px', marginLeft: '-8px' }}
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
                      <div className="stack" style={{ width: '32px', height: '72px' }}>
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
                      <div className="stack" style={{ width: '32px', height: '72px' }}>
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
          </div>
        )}
      </div>
    );
  }
}
