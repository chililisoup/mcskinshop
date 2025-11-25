// TODO
// Safer handling of image bitmaps (theres bugs that are hard to reproduce caused by trying to open a closed image)
// Layer management undo/redo
// make undo/redo in closed windows maybe open them back up?
// Fix the lag spikes
// Show popup if detected model differs from skin API response model
// layer editor background customization
// Save window sizes and positions
// color palette size adjustment, creating from layer colors
// saved color palettes, color palette groups?
// different color picker styles
// oklab support where it makes sense
// random official skin instead of steve/alex?
// indexed color layers (probably will have to be simulated)
// line tool or hold ctrl to draw straight lines
// select tool, move tool, magic wand
// HD bedrock skin support
// Enchantment glint
// Armor trims
// load arbitrary sized images as them skins that have a picture as the front of the skin
// minecraft json model parser for hats, items
// full session export (.zip or insane .json or somethin)
// Migrate from localstorage to the database one
// 3D skin editor
// grid on hovered face for 3d skin editor
// .ase support (import/export)
// correct math for orthographic-perspective switching
// break up imgmod
// make a nice window manager
// add missing features to layer manager to be able to remove asset creator
// fix up model features ui a bit
// redo asset library ui
// figure out a standard for how assets are constructed, then make a bunch of assets

import React, { useEffect, useState } from 'react';
import * as Util from '@tools/util';
import PaperDoll from '@components/special/viewport/paperdoll';
import LayerManager from '@components/special/layermanager';
import AssetLibrary from '@components/special/assetlibrary';
import AssetCreator from '@components/special/assetcreator';
import MenuBar from '@components/special/menubar';
import ColorPalette from '@components/special/colorpalette';
import Preview from '@components/special/preview';
import ModelFeatures from '@components/special/modelfeatures';
import Preferences from '@components/special/preferences';
import DraggableWindow from '@components/basic/draggablewindow';
import LayerEditor from '@components/special/layereditor';
import AppWindow from '@components/basic/appwindow';
import { PreferenceManager, usePrefs } from '@tools/prefman';
import DraggableDivider from '@components/basic/draggabledivider';
import SessionManager from '@tools/sessionman';
import { OrderableWindow } from '@tools/prefconsts';

export type OpenWindows = {
  layerManager: boolean;
  layerEditor: boolean;
  viewport: boolean;
  colorPalette: boolean;
  preview: boolean;
  assetCreator: boolean;
  assetLibrary: boolean;
  modelFeatures: boolean;
};

type WindowWidths = {
  layerManagerWidth: number;
  layerEditorWidth: number;
  assetLibraryWidth: number;
  modelFeaturesWidth: number;
};

type AState = {
  preferences: boolean;
} & OpenWindows &
  WindowWidths;

function defaultState(): AState {
  const prefs = PreferenceManager.get();
  const openWindows = SessionManager.get().openWindows;

  return {
    layerManager: openWindows.layerManager ?? prefs.showLayerManagerOnStart,
    layerManagerWidth: 325,
    layerEditor: openWindows.layerEditor ?? prefs.showLayerEditorOnStart,
    layerEditorWidth: Math.max(325, window.innerWidth / 3),
    viewport: openWindows.viewport ?? prefs.showViewportOnStart,
    colorPalette: openWindows.colorPalette ?? prefs.showColorPaletteOnStart,
    preview: openWindows.preview ?? prefs.showPreviewOnStart,
    assetCreator: openWindows.assetCreator ?? prefs.showAssetCreatorOnStart,
    assetLibrary: openWindows.assetLibrary ?? prefs.showAssetLibraryOnStart,
    assetLibraryWidth: 325,
    modelFeatures: openWindows.modelFeatures ?? prefs.showModelFeaturesOnStart,
    modelFeaturesWidth: 325,
    preferences: false
  };
}

export default function MCSkinShop() {
  const [state, setFullState] = useState(defaultState());
  const [sessionKey, setSessionKey] = useState(Util.randomKey());
  const prefs = usePrefs('windowOrder');

  const setState = (change: Partial<AState>) => setFullState({ ...state, ...change });

  useEffect(() => {
    const onSessionChange = () => {
      setSessionKey(Util.randomKey());
      setState({ ...defaultState(), ...SessionManager.get().openWindows });
    };

    SessionManager.speaker.registerListener(onSessionChange);
    return () => SessionManager.speaker.unregisterListener(onSessionChange);
  });

  useEffect(() => {
    SessionManager.updateCache('openWindows', {
      layerManager: state.layerManager,
      layerEditor: state.layerEditor,
      viewport: state.viewport,
      colorPalette: state.colorPalette,
      preview: state.preview,
      assetCreator: state.assetCreator,
      assetLibrary: state.assetLibrary,
      modelFeatures: state.modelFeatures
    });
  }, [state]);

  const updateState = <KKey extends keyof AState>(setting: KKey, value: AState[KKey]) =>
    setState({ [setting]: value });

  const updateWidth = <KKey extends keyof WindowWidths>(setting: KKey, delta: number) =>
    updateState(setting, Util.clamp(state[setting] + delta, 200, window.innerWidth * 0.67));

  const windows: Record<
    OrderableWindow & keyof AState,
    [window: false | React.JSX.Element, widthKey?: keyof WindowWidths]
  > = {
    layerManager: [
      state.layerManager && (
        <AppWindow key="layerManager" style={{ flex: `0 0 ${state.layerManagerWidth}px` }}>
          <LayerManager />
        </AppWindow>
      ),
      'layerManagerWidth'
    ],
    layerEditor: [
      state.layerEditor && (
        <AppWindow key="layerEditor" style={{ flex: `0 0 ${state.layerEditorWidth}px` }}>
          <LayerEditor
            colorPalette={state.colorPalette}
            toggleColorPalette={() => updateState('colorPalette', !state.colorPalette)}
          />
        </AppWindow>
      ),
      'layerEditorWidth'
    ],
    viewport: [
      state.viewport && (
        <AppWindow key="viewport" style={{ flex: '100%' }}>
          <PaperDoll />
        </AppWindow>
      )
    ],
    assetLibrary: [
      state.assetLibrary && (
        <AppWindow key="assetLibrary" style={{ flex: `0 0 ${state.assetLibraryWidth}px` }}>
          <AssetLibrary />
        </AppWindow>
      ),
      'assetLibraryWidth'
    ],
    modelFeatures: [
      state.modelFeatures && (
        <AppWindow key="modelFeatures" style={{ flex: `0 0 ${state.modelFeaturesWidth}px` }}>
          <ModelFeatures />
        </AppWindow>
      ),
      'modelFeaturesWidth'
    ]
  };

  const windowElements: React.JSX.Element[] = [];
  const viewportIndex = prefs.windowOrder.indexOf('viewport');
  prefs.windowOrder.forEach((window, index) => {
    const [elem, widthKey] = windows[window];
    if (!elem) return;
    if (index === viewportIndex) windowElements.push(elem);
    if (!widthKey) return;

    const reverse = index > viewportIndex;
    const divider = (
      <DraggableDivider
        key={window + 'Divider'}
        onChange={delta => updateWidth(widthKey, reverse ? -delta : delta)}
      />
    );

    const elements = reverse ? [divider, elem] : [elem, divider];
    windowElements.push(...elements);
  });

  return (
    <div className="appRoot" key={sessionKey}>
      <MenuBar
        editTab={[['Preferences...', () => updateState('preferences', true)]]}
        viewTab={[
          [
            'Layer Manager',
            state.layerManager,
            () => updateState('layerManager', !state.layerManager)
          ],
          ['2D Editor', state.layerEditor, () => updateState('layerEditor', !state.layerEditor)],
          ['3D Viewport', state.viewport, () => updateState('viewport', !state.viewport)],
          [
            'Color Palette',
            state.colorPalette,
            () => updateState('colorPalette', !state.colorPalette)
          ],
          ['Preview', state.preview, () => updateState('preview', !state.preview)],
          [
            'Asset Creator',
            state.assetCreator,
            () => updateState('assetCreator', !state.assetCreator)
          ],
          [
            'Asset Library',
            state.assetLibrary,
            () => updateState('assetLibrary', !state.assetLibrary)
          ],
          [
            'Model Features',
            state.modelFeatures,
            () => updateState('modelFeatures', !state.modelFeatures)
          ]
        ]}
      />
      <div className="SkinManager">
        {windowElements}
        {state.colorPalette && <ColorPalette close={() => updateState('colorPalette', false)} />}
        {state.preview && <Preview close={() => updateState('preview', false)} />}
        {state.assetCreator && <AssetCreator />}
        {state.preferences && (
          <DraggableWindow
            title="Preferences"
            anchor={{ vw: 0.5, vh: 0.5 }}
            close={() => updateState('preferences', false)}
          >
            <Preferences />
          </DraggableWindow>
        )}
      </div>
    </div>
  );
}
