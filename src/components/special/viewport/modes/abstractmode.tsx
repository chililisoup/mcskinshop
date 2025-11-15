import React, { Component } from 'react';
import PaperDoll from '../paperdoll';
import EditManager from '@tools/editman';

export type Props = {
  instance: PaperDoll;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default abstract class AbstractMode<State = {}> extends Component<Props, State> {
  name: string;

  constructor(props: Props, name: string) {
    super(props);

    this.name = name;

    const stateString = props.instance.cachedModeStates[this.name];
    if (stateString) {
      const state = JSON.parse(stateString) as State;
      this.state = state;
    }
  }

  componentDidMount() {
    this.props.instance.setState({ mode: this });
  }

  componentWillUnmount() {
    const state = JSON.stringify(this.state);
    this.props.instance.cachedModeStates[this.name] = state;
  }

  updateSetting = <KKey extends keyof State>(
    setting: KKey,
    value: State[KKey],
    saveEdit?: boolean
  ) => {
    const from = this.state[setting];

    this.setState({ [setting]: value } as Pick<State, KKey>);

    if (saveEdit)
      EditManager.addEdit('change ' + setting.toString(), () =>
        this.settingEdit(setting, from, value)
      );
  };

  settingEdit = <KKey extends keyof State>(setting: KKey, from: State[KKey], to: State[KKey]) => {
    this.updateSetting(setting, from);

    return Promise.resolve(() => this.settingEdit(setting, to, from));
  };

  onKeyDown?: (e: KeyboardEvent) => void;

  renderFrame?: (delta: number) => void;

  abstract renderRibbon: () => React.JSX.Element;

  renderToolbar?: () => React.JSX.Element;

  render() {
    return (
      <div className="viewport-mode-ui">
        <span className="top left">
          <div>
            <label htmlFor="editorMode">Editor Mode</label>
            <button id="editorMode" onClick={this.props.instance.nextMode}>
              {this.name}
            </button>
          </div>
          {this.renderRibbon()}
        </span>
        {this.renderToolbar && <div className="top left">{this.renderToolbar()}</div>}
      </div>
    );
  }
}
