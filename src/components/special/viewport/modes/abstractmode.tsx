import React, { Component, RefObject } from 'react';
import * as PrefMan from '@tools/prefman';
import PaperDoll from '../paperdoll';
import { UndoCallback } from '@components/special/skinmanager';

export type Props = {
  instance: PaperDoll;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  manager: PrefMan.Manager;
  addEdit: (name: string, undoCallback: UndoCallback) => void;
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default abstract class AbstractMode<State = {}> extends Component<Props, State> {
  name: string;

  constructor(props: Props, name: string) {
    super(props);

    this.name = name;
  }

  componentDidMount() {
    this.props.instance.setState({ mode: this });
  }

  updateSetting = <KKey extends keyof State>(
    setting: KKey,
    value: State[KKey],
    saveEdit?: boolean
  ) => {
    const from = this.state[setting];

    this.setState({ [setting]: value } as Pick<State, KKey>);

    if (saveEdit)
      this.props.addEdit('change ' + setting.toString(), () =>
        this.settingEdit(setting, from, value)
      );
  };

  settingEdit = <KKey extends keyof State>(setting: KKey, from: State[KKey], to: State[KKey]) => {
    this.updateSetting(setting, from);

    return () => this.settingEdit(setting, to, from);
  };

  renderFrame?: (delta: number) => void;

  abstract renderRibbon: () => React.JSX.Element;

  render() {
    return (
      <span className="top left">
        <div>
          <label htmlFor="editorMode">Editor Mode</label>
          <button id="editorMode" onClick={this.props.instance.nextMode}>
            {this.name}
          </button>
        </div>
        {this.renderRibbon()}
      </span>
    );
  }
}
