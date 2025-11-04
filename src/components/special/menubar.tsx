import React, { useEffect, useState } from 'react';
import PopUp from '@components/basic/popup';
import * as Util from '@tools/util';
import icon from '@assets/icon.png';
import FileInput from '@components/basic/fileinput';

type Tab = 'file' | 'edit' | 'view' | 'help';

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

export default function MenuBar(props: AProps) {
  const [open, setOpen] = useState(null as Tab | null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    document.documentElement.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.documentElement.removeEventListener('fullscreenchange', updateFullscreen);
  });

  function addLayerFromInput(file: File, name: string) {
    setOpen(null);

    props.uploadSkin(name, URL.createObjectURL(file));
  }

  function addDynamicLayerFromInput() {
    setOpen(null);

    props.uploadDynamicSkin();
  }

  function addLayerFromUsername() {
    setOpen(null);

    const input = prompt('Enter username:');
    if (!input) return;

    props.uploadSkin(input.replace(/[^0-9A-Za-z_]/g, ''));
  }

  function addLayerFromUrl() {
    setOpen(null);

    const input = prompt('Enter skin image URL:');
    if (!input) return;

    props.uploadSkin(input.split('/').pop()?.split('.')[0] ?? input, Util.corsProxy(input));
  }

  function downloadSkin() {
    setOpen(null);
    props.downloadSkin();
  }

  function updateFullscreen() {
    const isFullscreen = !!document.fullscreenElement;
    if (fullscreen !== isFullscreen) setFullscreen(isFullscreen);
  }

  async function toggleFullscreen() {
    if (fullscreen) {
      if (document.fullscreenElement) await document.exitFullscreen();
    } else await document.documentElement.requestFullscreen();

    setFullscreen(!fullscreen);
  }

  const tabProps = {
    open: open,
    toggleTab: (tab: Tab) => setOpen(open === tab ? null : tab),
    closeTab: (tab: Tab) => open === tab && setOpen(null)
  };

  const editTabChildren =
    props.editTab &&
    [<hr key="hr" />].concat(
      props.editTab.map(tab => (
        <button onClick={tab[1]} key={tab[0]}>
          {tab[0]}
        </button>
      ))
    );

  const viewTabChildren = props.viewTab ? (
    props.viewTab.map(tab => (
      <span key={tab[0]}>
        <p>{tab[1] ? '✓' : ''}</p>
        <button onClick={tab[2]}>{tab[0]}</button>
      </span>
    ))
  ) : (
    <button>Look at that view...</button>
  );

  const undoHint = props.editHints[0] !== '' ? 'Undo ' + props.editHints[0] : false;
  const redoHint = props.editHints[1] !== '' ? 'Redo ' + props.editHints[1] : false;

  return (
    <div id="MenuBar">
      <img alt="Logo" src={icon} />
      <MenuBarTab tab="file" name="File" {...tabProps}>
        <button onClick={props.newSession}>New Session</button>
        <hr />
        <FileInput callback={addLayerFromInput} accept="image/png">
          Import File...
        </FileInput>
        {Util.fileSystemAccess && (
          <button onClick={addDynamicLayerFromInput}>Dynamically Import File...</button>
        )}
        <button onClick={addLayerFromUsername}>Import from Username...</button>
        <button onClick={addLayerFromUrl}>Import from URL...</button>
        <hr />
        <button onClick={downloadSkin}>Save As...</button>
      </MenuBarTab>
      <MenuBarTab tab="edit" name="Edit" {...tabProps}>
        <button disabled={!undoHint} onClick={props.requestUndo}>
          {undoHint ? undoHint : 'Undo'}
        </button>
        <button disabled={!redoHint} onClick={props.requestRedo}>
          {redoHint ? redoHint : 'Redo'}
        </button>
        {editTabChildren}
      </MenuBarTab>
      <MenuBarTab tab="view" name="View" {...tabProps}>
        {viewTabChildren}
        <hr />
        <span key="fullscreen">
          <p>{fullscreen ? '✓' : ''}</p>
          <button onClick={() => void toggleFullscreen()}>Fullscreen</button>
        </span>
      </MenuBarTab>
      <MenuBarTab tab="help" name="Help" {...tabProps}>
        <button>Stop it. Get some help.</button>
      </MenuBarTab>
    </div>
  );
}

type BProps = {
  tab: Tab;
  name: string;
  open: Tab | null;
  toggleTab: (tab: Tab) => void;
  closeTab: (tab: Tab) => void;
  children: React.ReactNode;
};

const MenuBarTab = ({ tab, name, open, toggleTab, closeTab, children }: BProps) => (
  <div>
    <button className={open === tab ? 'active' : ''} onMouseDown={() => toggleTab(tab)}>
      {name}
    </button>
    {open === tab && (
      <PopUp close={() => closeTab(tab)}>
        <div>{children}</div>
      </PopUp>
    )}
  </div>
);
