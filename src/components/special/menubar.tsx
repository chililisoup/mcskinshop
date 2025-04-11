import React, { ChangeEvent, Component, RefObject } from 'react';
import PopUp from '../basic/popup';
import * as ImgMod from '../../tools/imgmod';
import * as Util from '../../tools/util';

type AProps = {
  addLayer: (layer: ImgMod.AbstractLayer) => void;
  updateSlim: (slim: boolean) => void;
  updateSkin: () => void;
  downloadSkin: () => void;
  requestUndo: () => void;
  requestRedo: () => void;
  editHints: [undoHint: string, redoHint: string];
  viewTab: [name: string, visible: boolean, toggle: () => void][];
};

type AState = {
  file: boolean;
  edit: boolean;
  view: boolean;
  help: boolean;
};

class MenuBar extends Component<AProps, AState> {
  uploadRef: RefObject<HTMLInputElement | null> = React.createRef();

  constructor(props: AProps) {
    super(props);

    this.state = {
      file: false,
      edit: false,
      view: false,
      help: false
    };
  }

  addLayerFromInput: (e: ChangeEvent<HTMLInputElement>) => void = async e => {
    this.setState({ file: false });

    if (!e.target.files) return;

    const image = new ImgMod.Img();
    image.name = e.target.files[0].name.replace(/\.[^/.]+$/, '');
    image.id = Math.random().toString(16).slice(2);

    await image.render(URL.createObjectURL(e.target.files[0]));

    e.target.value = '';
    this.props.addLayer(image);
    this.props.updateSlim(image.detectSlimModel());
  };

  addDynamicLayerFromInput: () => void = async () => {
    this.setState({ file: false });

    const [fileHandle] = await window.showOpenFilePicker({
      types: [
        {
          description: 'Minecraft skin image files',
          accept: {
            'image/png': ['.png']
          }
        }
      ],
      startIn: 'pictures'
    });

    const file = await fileHandle.getFile();
    const image = new ImgMod.Img();
    image.name = file.name;
    image.id = Math.random().toString(16).slice(2);

    image.internalUpdateCallback = () => this.props.updateSkin();
    image.observeDynamic(fileHandle);

    await image.render(URL.createObjectURL(file));

    this.props.addLayer(image);
    this.props.updateSlim(image.detectSlimModel());
  };

  addLayerFromUsername: () => void = async () => {
    this.setState({ file: false });

    const input = prompt('Enter username:');

    if (!input) return;
    const username = input.replace(/[^0-9A-Za-z_]/g, '');

    const image = new ImgMod.Img();
    image.name = username;
    image.id = Math.random().toString(16).slice(2);

    await image.render('https://minotar.net/skin/' + username);

    this.props.addLayer(image);
    this.props.updateSlim(image.detectSlimModel());
  };

  downloadSkin = () => {
    this.setState({ file: false });
    this.props.downloadSkin();
  };

  render() {
    const viewTabChildren = this.props.viewTab ? (
      this.props.viewTab.map(tab => (
        <span>
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
          style={this.state.file ? { background: 'rgb(66, 54, 99)' } : {}}
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
              <hr />
              <button onClick={this.downloadSkin}>Save As...</button>
            </div>
          </PopUp>
        )}
        <button
          style={this.state.edit ? { background: 'rgb(66, 54, 99)' } : {}}
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
            </div>
          </PopUp>
        )}
        <button
          style={this.state.view ? { background: 'rgb(66, 54, 99)' } : {}}
          onMouseDown={() => this.setState({ view: !this.state.view })}
        >
          View
        </button>
        {this.state.view && (
          <PopUp close={() => this.setState({ view: false })}>
            <div style={{ marginLeft: '94px' }}>{viewTabChildren}</div>
          </PopUp>
        )}
        <button
          style={this.state.help ? { background: 'rgb(66, 54, 99)' } : {}}
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
