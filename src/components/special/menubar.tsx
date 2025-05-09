import React, { ChangeEvent, Component, RefObject } from 'react';
import PopUp from '../basic/popup';
import * as Util from '../../tools/util';

type AProps = {
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

class MenuBar extends Component<AProps, AState> {
  uploadRef: RefObject<HTMLInputElement | null> = React.createRef();

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

  addLayerFromInput = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({ file: false });

    if (!e.target.files) return;

    this.props.uploadSkin(
      e.target.files[0].name.replace(/\.[^/.]+$/, ''),
      URL.createObjectURL(e.target.files[0])
    );

    e.target.value = '';
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
      [<hr />].concat(this.props.editTab.map(tab => <button onClick={tab[1]}>{tab[0]}</button>));

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
      <div className="MenuBar">
        <button
          style={this.state.file ? { background: 'var(--dark-shadow)' } : {}}
          onMouseDown={() => this.setState({ file: !this.state.file })}
        >
          File
        </button>
        {this.state.file && (
          <PopUp close={() => this.setState({ file: false })}>
            {' '}
            <div>
              <button onClick={() => this.uploadRef.current && this.uploadRef.current.click()}>
                Load from File...
              </button>
              <input
                className="hidden"
                ref={this.uploadRef}
                type="file"
                accept="image/png"
                onChange={this.addLayerFromInput}
              />
              {Util.fileSystemAccess && (
                <button onClick={this.addDynamicLayerFromInput}>
                  Dynamically Load from File...
                </button>
              )}
              <button onClick={this.addLayerFromUsername}>Load from Username...</button>
              <button onClick={this.addLayerFromUrl}>Load from URL...</button>
              <hr />
              <button onClick={this.downloadSkin}>Save As...</button>
            </div>
          </PopUp>
        )}
        <button
          style={this.state.edit ? { background: 'var(--dark-shadow)' } : {}}
          onMouseDown={() => this.setState({ edit: !this.state.edit })}
        >
          Edit
        </button>
        {this.state.edit && (
          <PopUp close={() => this.setState({ edit: false })}>
            {' '}
            <div style={{ marginLeft: '46px' }}>
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
        <button
          style={this.state.view ? { background: 'var(--dark-shadow)' } : {}}
          onMouseDown={() => this.setState({ view: !this.state.view })}
        >
          View
        </button>
        {this.state.view && (
          <PopUp close={() => this.setState({ view: false })}>
            <div style={{ marginLeft: '94px' }}>
              {viewTabChildren}
              <hr />
              <span key="fullscreen">
                <p>{this.state.fullscreen ? '✓' : ''}</p>
                <button onClick={this.toggleFullscreen}>Fullscreen</button>
              </span>
            </div>
          </PopUp>
        )}
        <button
          style={this.state.help ? { background: 'var(--dark-shadow)' } : {}}
          onMouseDown={() => this.setState({ help: !this.state.help })}
        >
          Help
        </button>
        {this.state.help && (
          <PopUp close={() => this.setState({ help: false })}>
            {' '}
            <div style={{ marginLeft: '148px' }}>
              <button>Stop it. Get some help.</button>
            </div>
          </PopUp>
        )}
      </div>
    );
  }
}

export default MenuBar;
