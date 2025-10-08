import React, { ChangeEvent, Component, RefObject } from 'react';
import save_render from '@assets/save_render.png';
import * as PaperDoll from '@components/special/paperdoll/paperdoll';
import { UndoCallback } from '@components/special/skinmanager';
import Dropdown from '@components/basic/dropdown';
import PropertiesList from '@components/basic/propertieslist';
import Slider from '@components/basic/slider';

type AProps = {
  settings: {
    anim: boolean;
    animSpeed: number;
    animation: PaperDoll.AState['animation'];
    explode: boolean;
    shade: boolean;
    lightAngle: number;
    lightFocus: number;
    ambientLightColor: string;
    ambientLightIntensity: number;
    directionalLightColor: string;
    directionalLightIntensity: number;
    pose: boolean;
    poseSettings: PaperDoll.AState['poseSettings'];
    partToggles: PaperDoll.AState['partToggles'];
    fov: number;
    usePerspectiveCam: boolean;
    grid: boolean;
  };

  slim: boolean;
  updateSetting: <KKey extends keyof PaperDoll.AState>(setting: KKey, value: PaperDoll.AState[KKey]) => void;
  updateSlim: (slim: boolean) => void;
  saveRender: () => void;
  resetCamera: () => void;
  resetLighting: () => void;
  addEdit: (name: string, undoCallback: UndoCallback) => void;
  deselect: () => void;
  resetPose: () => void;
  savedPoses: string[];
  savePose: () => void;
  loadPose: (poseName: string) => void;
  deletePose: (poseName: string) => void;
  downloadPose: (poseName: string) => void;
  uploadPose: (poseName: string, poseJsonString: string) => void;
  capturePose: () => void;
};

type AState = {
  selectedPose?: string;
  panel: boolean;
};

class PaperDollSettings extends Component<AProps, AState> {
  uploadRef: RefObject<HTMLInputElement | null> = React.createRef();

  constructor(props: AProps) {
    super(props);

    this.state = {
      selectedPose: this.props.savedPoses[0],
      panel: true
    };
  }

  componentDidUpdate = () => {
    if (this.state.selectedPose === undefined) return;

    if (this.props.savedPoses.length) {
      if (!this.props.savedPoses.includes(this.state.selectedPose)) {
        this.setState({ selectedPose: this.props.savedPoses[0] });
      }
    } else this.setState({ selectedPose: undefined });
  };

  updateSetting = <KKey extends keyof PaperDoll.AState>(setting: KKey, value: PaperDoll.AState[KKey]) => {
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

  toggleAnim = (anim: boolean) => {
    this.props.updateSetting('anim', anim);
  };

  togglePose = (pose: boolean) => {
    this.props.updateSetting('pose', pose);
  };

  changePoseSetting = <KKey extends keyof PaperDoll.AState['poseSettings']>(setting: KKey) => {
    const poseSettings: PaperDoll.AState['poseSettings'] = {
      mode: this.props.settings.poseSettings.mode,
      type: this.props.settings.poseSettings.type,
      space: this.props.settings.poseSettings.space
    };

    switch (setting) {
      case 'mode':
        poseSettings[setting] = (
          poseSettings.mode === 'Simple' ? 'Controlled' : 'Simple'
        ) as PaperDoll.AState['poseSettings'][KKey];
        break;
      case 'type':
        poseSettings[setting] = (
          poseSettings.type === 'Rotation' ? 'Position' : 'Rotation'
        ) as PaperDoll.AState['poseSettings'][KKey];
        break;
      case 'space':
        poseSettings[setting] = (
          poseSettings.space === 'Local' ? 'Global' : 'Local'
        ) as PaperDoll.AState['poseSettings'][KKey];
        break;
      default:
        return;
    }

    this.props.updateSetting('poseSettings', poseSettings);
  };

  uploadPose = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const name = e.target.files[0].name.replace(/\.[^/.]+$/, '');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') this.props.uploadPose(name, reader.result);
      e.target.value = '';
    };
    reader.readAsText(e.target.files[0]);
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
        if (this.props.settings.partToggles[part as keyof PaperDoll.AState['partToggles']].base) on++;
        if (this.props.settings.partToggles[part as keyof PaperDoll.AState['partToggles']].hat) on++;
      }
    else
      for (const part in this.props.settings.partToggles)
        if (this.props.settings.partToggles[part as keyof PaperDoll.AState['partToggles']][partSet]) on++;

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
      <span className="paperdoll-settings">
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
                  buttonCallback={id => {
                    if (id === 'cameraType')
                      this.updateSettingFinish(
                        'usePerspectiveCam',
                        !this.props.settings.usePerspectiveCam
                      );
                    else if (id === 'resetCamera') this.props.resetCamera();
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
                      name: 'Reset Camera',
                      id: 'resetCamera',
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
                  buttonCallback={id => {
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
                          step: 0.01,
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
        <span className="top left">
          <div>
            <label htmlFor="editorMode">Editor Mode</label>
            <button id="editorMode" onClick={() => this.togglePose(!this.props.settings.pose)}>
              {this.props.settings.pose ? 'Pose' : 'Animate'}
            </button>
          </div>
          {this.props.settings.pose && (
            <span>
              <span>
                <label htmlFor="poseMode">Pose Mode</label>
                <button id="poseMode" onClick={() => this.changePoseSetting('mode')}>
                  {this.props.settings.poseSettings.mode}
                </button>
              </span>
              <span>
                <label htmlFor="poseType">Pose Type</label>
                <button id="poseType" onClick={() => this.changePoseSetting('type')}>
                  {this.props.settings.poseSettings.type}
                </button>
              </span>
              <span>
                <label htmlFor="poseSpace">Pose Space</label>
                <button id="poseSpace" onClick={() => this.changePoseSetting('space')}>
                  {this.props.settings.poseSettings.space}
                </button>
              </span>
              <button onClick={this.props.deselect}>Deselect</button>
              <button onClick={this.props.resetPose}>Reset Pose</button>
              <select
                value={this.state.selectedPose}
                onChange={e => this.setState({ selectedPose: e.target.value })}
              >
                {this.props.savedPoses.map(poseName => (
                  <option key={poseName}>{poseName}</option>
                ))}
              </select>
              <button
                onClick={() =>
                  this.state.selectedPose && this.props.loadPose(this.state.selectedPose)
                }
              >
                Load Pose
              </button>
              <button
                onClick={() =>
                  this.state.selectedPose && this.props.deletePose(this.state.selectedPose)
                }
              >
                Delete Pose
              </button>
              <button onClick={this.props.savePose}>Save New Pose</button>
              <button
                onClick={() =>
                  this.state.selectedPose && this.props.downloadPose(this.state.selectedPose)
                }
              >
                Download Pose
              </button>
              <button onClick={() => this.uploadRef.current?.click()}>
                Upload Pose
              </button>
              <input
                className="hidden"
                ref={this.uploadRef}
                type="file"
                accept="application/json"
                onChange={this.uploadPose}
              />
            </span>
          )}
          {!this.props.settings.pose && (
            <span>
              <span>
                <label htmlFor="explodeToggle">Explode</label>
                <input
                  type="checkbox"
                  id="explodeToggle"
                  checked={this.props.settings.explode}
                  onChange={e => this.updateSettingFinish('explode', e.target.checked)}
                />
              </span>
              <span>
                <label htmlFor="animToggle">Animate</label>
                <input
                  type="checkbox"
                  id="animToggle"
                  checked={this.props.settings.anim}
                  onChange={e => this.toggleAnim(e.target.checked)}
                />
                <Slider
                  id="animSpeed"
                  min={0}
                  max={2}
                  step={0.01}
                  value={this.props.settings.animSpeed}
                  callback={value => this.updateSetting('animSpeed', value)}
                />
              </span>
              <span>
                <select
                  value={this.props.settings.animation}
                  onChange={e =>
                    this.updateSettingFinish('animation', e.target.value as PaperDoll.AState['animation'])
                  }
                >
                  {PaperDoll.ANIMATIONS.map(animation => (
                    <option key={animation}>{animation}</option>
                  ))}
                </select>
              </span>
              <button onClick={this.props.capturePose}>Capture Pose</button>
            </span>
          )}
        </span>
        <div className="bottom left">
          <button title="Save Render" onClick={this.props.saveRender}>
            <img alt="Save Render" src={save_render} />
          </button>
        </div>
      </span>
    );
  }
}

export default PaperDollSettings;
