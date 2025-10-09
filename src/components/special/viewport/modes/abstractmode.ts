import PaperDoll from '@components/special/viewport/paperdoll';

export type ModeSetting<TType> = {
  value: TType;
  update?: (value: TType) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ModeSettings = Record<string, ModeSetting<any>>;

export default abstract class AbstractMode {
  instance: PaperDoll;
  name: string;

  constructor(instance: PaperDoll, name: string) {
    this.instance = instance;
    this.name = name;
  }

  abstract init: (canvas: HTMLCanvasElement) => void;

  abstract dispose: (canvas: HTMLCanvasElement) => void;

  abstract renderRibbon: () => React.JSX.Element;
}

export abstract class BaseMode<SSettings extends ModeSettings> extends AbstractMode {
  abstract settings: SSettings;

  private updateSettingInternal = <TType>(setting: ModeSetting<TType>, value: TType) => {
    setting.value = value;
    setting.update?.(value);
    this.instance.setState({ ribbon: this.renderRibbon() });
  };

  updateSetting = <KKey extends keyof SSettings & string, TType>(name: KKey, value: TType) => {
    const setting = this.settings[name] as ModeSetting<TType>;
    this.updateSettingInternal(setting, value);
  };

  updateSettingWithEdit = <KKey extends keyof SSettings & string, TType>(
    name: KKey,
    value: TType
  ) => {
    const setting = this.settings[name] as ModeSetting<TType>;
    const from = setting.value;
    this.updateSettingInternal(setting, value);
    this.instance.props.addEdit('change ' + name, () => this.settingEdit(setting, from, value));
  };

  private settingEdit = <TType>(setting: ModeSetting<TType>, from: TType, to: TType) => {
    this.updateSettingInternal(setting, from);
    return () => this.settingEdit(setting, to, from);
  };
}
