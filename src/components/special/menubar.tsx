import React, { Component } from 'react';
import PopUp from '@components/basic/popup';
import * as Util from '@tools/util';
import icon from '@assets/icon.png';
import FileInput from '@components/basic/fileinput';

type AProps = {
  newSession: () => void;
  uploadSkin: (name: string, url?: string) => void;
  uploadDynamicSkin: () => void;
  downloadSkin: () => void;
  requestUndo: () => void;
  requestRedo: () => void;
  editHints: [undoHint: string, redoHint: string];
  editTab?: [name: string, onClick: () => void][];
  viewTab?: [name: string, visible: boolean, toggle: () => void][];
};

type AState = {
  file: boolean;
  edit: boolean;
  view: boolean;
  help: boolean;
  fullscreen: boolean;
};

export default class MenuBar extends Component<AProps, AState> {
  constructor(props: AProps) {
    super(props);

    this.state = {
      file: false,
      edit: false,
      view: false,
      help: false,
      fullscreen: false
    };
  }

  componentDidMount = () => {
    document.documentElement.addEventListener('fullscreenchange', this.updateFullscreen);
  };

  componentWillUnmount() {
    document.documentElement.removeEventListener('fullscreenchange', this.updateFullscreen);
  }

  addLayerFromInput = (file: File, name: string) => {
    this.setState({ file: false });

    this.props.uploadSkin(name, URL.createObjectURL(file));
  };

  addDynamicLayerFromInput = () => {
    this.setState({ file: false });

    this.props.uploadDynamicSkin();
  };

  addLayerFromUsername = () => {
    this.setState({ file: false });

    const input = prompt('Enter username:');
    if (!input) return;

    this.props.uploadSkin(input.replace(/[^0-9A-Za-z_]/g, ''));
  };

  addLayerFromUrl = () => {
    this.setState({ file: false });

    const input = prompt('Enter skin image URL:');
    if (!input) return;

    this.props.uploadSkin(input.split('/').pop()?.split('.')[0] ?? input, Util.corsProxy(input));
  };

  downloadSkin = () => {
    this.setState({ file: false });
    this.props.downloadSkin();
  };

  updateFullscreen = () => {
    const isFullscreen = !!document.fullscreenElement;
    if (this.state.fullscreen !== isFullscreen) this.setState({ fullscreen: isFullscreen });
  };

  toggleFullscreen: () => void = async () => {
    if (this.state.fullscreen) {
      if (document.fullscreenElement) await document.exitFullscreen();
    } else await document.documentElement.requestFullscreen();

    this.setState({ fullscreen: !this.state.fullscreen });
  };

  render() {
    const editTabChildren =
      this.props.editTab &&
      [<hr key="hr" />].concat(
        this.props.editTab.map(tab => (
          <button onClick={tab[1]} key={tab[0]}>
            {tab[0]}
          </button>
        ))
      );

    const viewTabChildren = this.props.viewTab ? (
      this.props.viewTab.map(tab => (
        <span key={tab[0]}>
          <p>{tab[1] ? '✓' : ''}</p>
          <button onClick={tab[2]}>{tab[0]}</button>
        </span>
      ))
    ) : (
      <button>Look at that view...</button>
    );

    const undoHint = this.props.editHints[0] !== '' ? 'Undo ' + this.props.editHints[0] : false;
    const redoHint = this.props.editHints[1] !== '' ? 'Redo ' + this.props.editHints[1] : false;

    return (
      <div id="MenuBar">
        <img alt="Logo" src={icon} />
        <div>
          <button
            className={this.state.file ? 'active' : ''}
            onMouseDown={() => this.setState({ file: !this.state.file })}
          >
            File
          </button>
          {this.state.file && (
            <PopUp close={() => this.setState({ file: false })}>
              <div>
                <button onClick={this.props.newSession}>New Session</button>
                <hr />
                <FileInput callback={this.addLayerFromInput} accept="image/png">
                  Import File...
                </FileInput>
                {Util.fileSystemAccess && (
                  <button onClick={this.addDynamicLayerFromInput}>
                    Dynamically Import File...
                  </button>
                )}
                <button onClick={this.addLayerFromUsername}>Import from Username...</button>
                <button onClick={this.addLayerFromUrl}>Import from URL...</button>
                <hr />
                <button onClick={this.downloadSkin}>Save As...</button>
              </div>
            </PopUp>
          )}
        </div>
        <div>
          <button
            className={this.state.edit ? 'active' : ''}
            onMouseDown={() => this.setState({ edit: !this.state.edit })}
          >
            Edit
          </button>
          {this.state.edit && (
            <PopUp close={() => this.setState({ edit: false })}>
              <div>
                <button disabled={!undoHint} onClick={this.props.requestUndo}>
                  {undoHint ? undoHint : 'Undo'}
                </button>
                <button disabled={!redoHint} onClick={this.props.requestRedo}>
                  {redoHint ? redoHint : 'Redo'}
                </button>
                {editTabChildren}
              </div>
            </PopUp>
          )}
        </div>
        <div>
          <button
            className={this.state.view ? 'active' : ''}
            onMouseDown={() => this.setState({ view: !this.state.view })}
          >
            View
          </button>
          {this.state.view && (
            <PopUp close={() => this.setState({ view: false })}>
              <div>
                {viewTabChildren}
                <hr />
                <span key="fullscreen">
                  <p>{this.state.fullscreen ? '✓' : ''}</p>
                  <button onClick={this.toggleFullscreen}>Fullscreen</button>
                </span>
              </div>
            </PopUp>
          )}
        </div>
        <div>
          <button
            className={this.state.help ? 'active' : ''}
            onMouseDown={() => this.setState({ help: !this.state.help })}
          >
            Help
          </button>
          {this.state.help && (
            <PopUp close={() => this.setState({ help: false })}>
              <div>
                <button>Stop it. Get some help.</button>
              </div>
            </PopUp>
          )}
        </div>
      </div>
    );
  }
}
