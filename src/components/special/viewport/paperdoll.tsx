import React, { Component } from 'react';
import * as THREE from 'three';
import * as ImgMod from '@tools/imgmod';
import * as Util from '@tools/util';
import * as ModelTool from '@tools/modeltool';
import * as Handles from '@components/special/viewport/handles';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import skinmodel from '@/skinmodel.json';
import { SAVE_RENDER } from '@components/svgs';
import AnimateMode from '@components/special/viewport/modes/animatemode';
import PoseMode from '@components/special/viewport/modes/posemode';
import ViewportPanel, { ViewportPanelHandle } from '@components/special/viewport/viewportpanel';
import AbstractMode from './modes/abstractmode';
import { PreferenceManager } from '@tools/prefman';
import ExportRender from './exportRender';
import SkinManager from '@tools/skinman';
import EditManager from '@tools/editman';
import ModelFeatureManager, { FeatureKey, FeatureType } from '@tools/modelfeatureman';
import SessionManager from '@tools/sessionman';
import PaintMode from './modes/paintmode';

export type PoseEntry = {
  rotation?: THREE.EulerTuple;
  position?: THREE.Vector3Tuple;
  scaleOffset?: THREE.Vector3Tuple;
};

export const defaultViewportOptions = {
  shade: true,
  lightAngle: Math.PI / 4,
  lightFocus: Math.SQRT2,
  ambientLightColor: '#ffffff',
  ambientLightIntensity: 1,
  directionalLightColor: '#ffffff',
  directionalLightIntensity: 2.5,
  fov: 70,
  usePerspectiveCam: true,
  grid: true
};

export type ViewportOptions = typeof defaultViewportOptions;

export type AState = ViewportOptions & {
  mode?: AbstractMode;
  modeElement: React.JSX.Element;
  partToggles: {
    head: {
      base: boolean;
      hat: boolean;
    };
    torso: {
      base: boolean;
      hat: boolean;
    };
    leftArm: {
      base: boolean;
      hat: boolean;
    };
    rightArm: {
      base: boolean;
      hat: boolean;
    };
    leftLeg: {
      base: boolean;
      hat: boolean;
    };
    rightLeg: {
      base: boolean;
      hat: boolean;
    };
  };
  background?: boolean;
  backgroundImage?: string;
  exportingRender: boolean;
};

export default class PaperDoll extends Component<object, AState> {
  canvasRef: React.RefObject<HTMLCanvasElement | null> = React.createRef();
  panelRef: React.RefObject<ViewportPanelHandle | null> = React.createRef();
  clock = new THREE.Clock();
  doll = new ModelTool.Model('doll', skinmodel as ModelTool.ModelDefinition);
  activeKeys: Record<string, true> = {};

  modeProps = {
    instance: this,
    canvasRef: this.canvasRef
  };

  modes = {
    animate: <AnimateMode {...this.modeProps} />,
    pose: <PoseMode {...this.modeProps} />,
    paint: <PaintMode {...this.modeProps} />
  };
  cachedModeStates: Record<string, string> = {};

  raycaster = new THREE.Raycaster();
  scene = new THREE.Scene();
  requestID = 0;
  ambientLight = new THREE.AmbientLight(0xffffff, 1);
  directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
  grid = new THREE.GridHelper(16, 16);
  gridArrow = new THREE.Mesh();
  handles = new THREE.Object3D();

  selectedObject?: THREE.Object3D;

  renderer?: THREE.WebGLRenderer;

  perspCam?: THREE.PerspectiveCamera;
  orthoCam?: THREE.OrthographicCamera;
  activeCam?: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  controls?: OrbitControls;

  composer?: EffectComposer;
  renderPass?: RenderPass;
  hoveredOutlinePass?: OutlinePass;
  selectedOutlinePass?: OutlinePass;
  SMAAPass?: SMAAPass;

  savedViewOptions = { ...defaultViewportOptions, ...SessionManager.get().viewportOptions };
  cachedModelFeatures = ModelFeatureManager.getUsedFeatures();

  state: AState = {
    ...this.savedViewOptions,
    modeElement: this.modes.animate,
    partToggles: {
      head: {
        base: true,
        hat: true
      },
      torso: {
        base: true,
        hat: true
      },
      leftArm: {
        base: true,
        hat: true
      },
      rightArm: {
        base: true,
        hat: true
      },
      leftLeg: {
        base: true,
        hat: true
      },
      rightLeg: {
        base: true,
        hat: true
      }
    },
    exportingRender: false
  };

  componentDidMount() {
    if (!this.canvasRef.current) return;

    this.sceneSetup();
    this.modelSetup();
    this.createHandles();
    this.updateSlim();
    this.updateCape();
    this.updateElytra();
    this.updateHelmet();
    this.updateChestplate();
    this.updateLeggings();
    this.updateBoots();
    this.updateItems();
    this.updateLighting();
    this.propagateShade(this.doll.root);
    this.updateThemedMaterials();
    this.textureSetup();
    this.startAnimationLoop();

    if (!this.state.usePerspectiveCam && this.orthoCam) this.changeCamera(this.orthoCam);

    window.addEventListener('resize', this.handleWindowResize);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    SkinManager.speaker.registerListener(this.updateSkin);
    PreferenceManager.speaker.registerListener(this.updateThemedMaterials);
    ModelFeatureManager.speaker.registerListener(this.updateModelFeatures);
  }

  componentWillUnmount() {
    if (!this.canvasRef.current) return;

    window.removeEventListener('resize', this.handleWindowResize);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    SkinManager.speaker.unregisterListener(this.updateSkin);
    PreferenceManager.speaker.unregisterListener(this.updateThemedMaterials);
    ModelFeatureManager.speaker.unregisterListener(this.updateModelFeatures);

    window.cancelAnimationFrame(this.requestID);
    if (this.controls) this.controls.dispose();
    if (this.renderer) this.renderer.dispose();
  }

  componentDidUpdate(_prevProps: Readonly<object>, prevState: Readonly<AState>) {
    if (
      this.state.usePerspectiveCam !== prevState.usePerspectiveCam &&
      this.perspCam &&
      this.orthoCam
    )
      this.changeCamera(this.state.usePerspectiveCam ? this.perspCam : this.orthoCam);

    if (
      this.state.lightAngle !== prevState.lightAngle ||
      this.state.lightFocus !== prevState.lightFocus ||
      this.state.ambientLightColor !== prevState.ambientLightColor ||
      this.state.ambientLightIntensity !== prevState.ambientLightIntensity ||
      this.state.directionalLightColor !== prevState.directionalLightColor ||
      this.state.directionalLightIntensity !== prevState.directionalLightIntensity
    )
      this.updateLighting();

    if (this.state.mode !== prevState.mode) this.deselect();

    if (this.state.grid !== prevState.grid) this.grid.visible = this.state.grid;

    if (this.state.partToggles !== prevState.partToggles) this.updatePartToggles();

    if (this.state.shade !== prevState.shade) {
      this.propagateShade(this.doll.root);
      this.textureSetup();
    }

    if (this.perspCam) this.perspCam.fov = this.state.fov;

    this.handleWindowResize();
  }

  sceneSetup = () => {
    if (
      !this.canvasRef.current?.parentNode ||
      !(this.canvasRef.current.parentNode instanceof Element)
    )
      return;

    this.scene.clear();

    const width = this.canvasRef.current.parentNode.clientWidth;
    const height = this.canvasRef.current.parentNode.clientHeight;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.current,
      alpha: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    this.perspCam = new THREE.PerspectiveCamera(this.state.fov, width / height, 0.1, 1000);
    this.perspCam.position.set(0, 18, 40);
    this.scene.add(this.perspCam);

    this.orthoCam = new THREE.OrthographicCamera(
      width / -2,
      width / 2,
      height / 2,
      height / -2,
      0.1,
      1000
    );
    this.orthoCam.position.set(0, 18, 40);
    this.scene.add(this.orthoCam);

    this.activeCam = this.perspCam;

    this.controls = new OrbitControls(this.perspCam, this.canvasRef.current);
    this.controls.target.set(0, 18, 0);
    this.controls.update();
    this.controls.saveState();

    this.composer = new EffectComposer(this.renderer);

    this.renderPass = new RenderPass(this.scene, this.perspCam);
    this.composer.addPass(this.renderPass);

    this.hoveredOutlinePass = new OutlinePass(
      new THREE.Vector2(width, height),
      this.scene,
      this.perspCam
    );
    this.hoveredOutlinePass.edgeStrength = 3;
    this.hoveredOutlinePass.edgeThickness = 1;
    this.composer.addPass(this.hoveredOutlinePass);

    this.selectedOutlinePass = new OutlinePass(
      new THREE.Vector2(width, height),
      this.scene,
      this.perspCam
    );
    this.selectedOutlinePass.edgeStrength = 3;
    this.selectedOutlinePass.edgeThickness = 1;
    this.composer.addPass(this.selectedOutlinePass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    this.SMAAPass = new SMAAPass();
    this.composer.addPass(this.SMAAPass);

    this.scene.add(this.ambientLight);
    this.perspCam.add(this.directionalLight);

    const gridMaterial = new THREE.LineBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide
    });
    this.grid.material = gridMaterial;
    this.scene.add(this.grid);

    const arrowGeometry = new THREE.BufferGeometry();
    arrowGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([-1.5, 0, 0, 1.5, 0, 0, 0, 0, 1.5 * Math.sqrt(3)]),
        3
      )
    );
    this.gridArrow.geometry = arrowGeometry;
    this.gridArrow.material = gridMaterial;
    this.gridArrow.position.set(0, 0, 9);
    this.grid.add(this.gridArrow);

    // Debug geometry, can move it to positions to reference code :)
    // this.sphere = new THREE.Mesh(
    //     new THREE.SphereGeometry(1, 32, 16),
    //     new THREE.MeshBasicMaterial({
    //         color: 0xffff00,
    //         depthTest: false,
    //         transparent: true,
    //         opacity: 0.33
    //     })
    // );
    // this.scene.add(this.sphere);
  };

  updateSkin = () => {
    this.updateSlim();
    this.textureSetup();
  };

  updateThemedMaterials = () => {
    const gridColor = ImgMod.cssVariableColor('--viewport-widget');
    this.grid.material.color.set(ImgMod.rgbaToHex(gridColor, false));
    this.grid.material.opacity = gridColor[3] / 255;

    if (this.hoveredOutlinePass) {
      const rgba = ImgMod.cssVariableColor('--viewport-part-hovered-outline');
      const outline = ImgMod.rgbaToHex(rgba, false);
      this.hoveredOutlinePass.visibleEdgeColor.set(outline);
      this.hoveredOutlinePass.hiddenEdgeColor.set(outline === '#000000' ? 0xffffff : outline);
    }

    if (this.selectedOutlinePass) {
      const rgba = ImgMod.cssVariableColor('--viewport-part-selected-outline');
      const outline = ImgMod.rgbaToHex(rgba, false);
      this.selectedOutlinePass.visibleEdgeColor.set(outline);
      this.selectedOutlinePass.hiddenEdgeColor.set(outline === '#000000' ? 0xffffff : outline);
    }
  };

  changeCamera = (camera: THREE.PerspectiveCamera | THREE.OrthographicCamera) => {
    this.activeCam ??= camera;

    camera.position.copy(this.activeCam.position);
    camera.zoom = this.activeCam.zoom * (camera === this.orthoCam ? 10 : 0.1);

    this.activeCam = camera;

    if (this.controls) {
      this.controls.object = camera;
      this.controls.update();
    }

    this.directionalLight.removeFromParent();
    camera.add(this.directionalLight);

    this.composer?.passes.forEach(pass => {
      if ('renderCamera' in pass) pass.renderCamera = camera;
      if ('camera' in pass) pass.camera = camera;
    });
  };

  resetCameraPosition = () => {
    if (!this.controls || !this.perspCam || !this.orthoCam) return;

    if (this.activeCam === this.orthoCam) {
      this.changeCamera(this.perspCam);
      this.controls.reset();
      this.changeCamera(this.orthoCam);
    } else this.controls.reset();
  };

  textureSetup = () => this.doll.setupTexture(SkinManager.get().src, this.state.shade);

  propagateShade = (part: THREE.Object3D) => {
    this.doll.propagateShade(part, this.state.shade);
  };

  updateLighting = () => {
    this.directionalLight.position.set(
      Math.sin(this.state.lightAngle) * this.state.lightFocus,
      0,
      Math.cos(this.state.lightAngle) * this.state.lightFocus
    );

    this.ambientLight.color = new THREE.Color(this.state.ambientLightColor);
    this.ambientLight.intensity = this.state.ambientLightIntensity;
    this.directionalLight.color = new THREE.Color(this.state.directionalLightColor);
    this.directionalLight.intensity = this.state.directionalLightIntensity;
  };

  modelSetup = () => {
    this.scene.add(this.doll.root);

    this.doll.setupChildItem('rightItem');
    this.doll.setupChildItem('leftItem');
  };

  createHandles = () => {
    this.handles.clear();

    this.handles.add(Handles.createRotationHandles());
    this.handles.add(Handles.createPositionHandles());
    this.handles.add(Handles.createScaleHandles());
  };

  updateSlim = () => {
    const pivots = this.doll.pivots;
    const slim = SkinManager.getSlim();

    pivots.rightArm.children[0].visible = !slim;
    pivots.rightArm.children[1].visible = slim;
    pivots.leftArm.children[0].visible = !slim;
    pivots.leftArm.children[1].visible = slim;

    pivots.rightArm.children[slim ? 1 : 0].children[1].add(pivots.rightItem);
    pivots.leftArm.children[slim ? 1 : 0].children[1].add(pivots.leftItem);
  };

  updatePartToggles = () => {
    const pivots = this.doll.pivots;

    for (const pivot in this.state.partToggles) {
      if (!(pivot in pivots)) continue;

      const usedPivot =
        pivot === 'rightArm' || pivot === 'leftArm'
          ? pivots[pivot].getObjectByName(SkinManager.getSlim() ? 'slim' : 'full')
          : pivots[pivot];
      if (!usedPivot) continue;

      const base = usedPivot.getObjectByName('base')?.userData.materialIndex as number | undefined;
      if (base !== undefined) {
        const visible = this.state.partToggles[pivot as keyof AState['partToggles']].base;
        this.doll.materials.shaded[base].visible = visible;
        this.doll.materials.flat[base].visible = visible;
      }
      const hat = usedPivot.getObjectByName('hat')?.userData.materialIndex as number | undefined;
      if (hat !== undefined) {
        const visible = this.state.partToggles[pivot as keyof AState['partToggles']].hat;
        this.doll.materials.shaded[hat].visible = visible;
        this.doll.materials.flat[hat].visible = visible;
      }
    }
  };

  updateModelFeatures = (features: Record<FeatureType, FeatureKey>) => {
    const oldFeatures = this.cachedModelFeatures;
    this.cachedModelFeatures = features;

    if (this.cachedModelFeatures.cape !== oldFeatures.cape) this.updateCape();
    if (this.cachedModelFeatures.elytra !== oldFeatures.elytra) this.updateElytra();
    if (this.cachedModelFeatures.helmet !== oldFeatures.helmet) this.updateHelmet();
    if (this.cachedModelFeatures.chestplate !== oldFeatures.chestplate) this.updateChestplate();
    if (this.cachedModelFeatures.leggings !== oldFeatures.leggings) this.updateLeggings();
    if (this.cachedModelFeatures.boots !== oldFeatures.boots) this.updateBoots();

    if (
      this.cachedModelFeatures.rightItem !== oldFeatures.rightItem ||
      this.cachedModelFeatures.leftItem !== oldFeatures.leftItem
    ) {
      this.updateItems(
        this.cachedModelFeatures.rightItem !== oldFeatures.rightItem,
        this.cachedModelFeatures.leftItem !== oldFeatures.leftItem
      );
    }
  };

  updateFeaturePart = (feature: string | false, part: THREE.Object3D, deselect?: boolean) => {
    if (!feature) {
      part.layers.disable(0);
      if (deselect) this.maybeDeselect(part);
      return;
    }

    this.doll.updatePartTexture(feature, part);
  };

  updateFeature = (
    featureType: FeatureType,
    parts: (THREE.Object3D | undefined)[],
    deselect?: boolean
  ) => {
    const feature = ModelFeatureManager.getUsedFeature(featureType);

    for (const part of Object.values(parts)) {
      if (part) this.updateFeaturePart(feature ? feature.src : false, part, deselect);
    }
  };

  updateCape = () => {
    this.updateFeature('cape', [this.doll.pivots.cape.children[0]], true);
  };

  updateElytra = () => {
    this.updateFeature(
      'elytra',
      [this.doll.pivots.leftElytraWing.children[0], this.doll.pivots.rightElytraWing.children[0]],
      true
    );
  };

  updateHelmet = () => {
    this.updateFeature('helmet', [this.doll.pivots.head.getObjectByName('helmet')]);
  };

  updateChestplate = () => {
    this.updateFeature('chestplate', [
      this.doll.pivots.torso.getObjectByName('chestplate'),
      this.doll.pivots.rightArm.children[0].getObjectByName('chestplate'),
      this.doll.pivots.leftArm.children[0].getObjectByName('chestplate'),
      this.doll.pivots.rightArm.children[1].getObjectByName('chestplate'),
      this.doll.pivots.leftArm.children[1].getObjectByName('chestplate')
    ]);
  };

  updateLeggings = () => {
    this.updateFeature('leggings', [
      this.doll.pivots.torso.getObjectByName('leggings'),
      this.doll.pivots.rightLeg.getObjectByName('leggings'),
      this.doll.pivots.leftLeg.getObjectByName('leggings')
    ]);
  };

  updateBoots = () => {
    this.updateFeature('boots', [
      this.doll.pivots.rightLeg.getObjectByName('boots'),
      this.doll.pivots.leftLeg.getObjectByName('boots')
    ]);
  };

  updateItem: (featureType: FeatureType, item: THREE.Object3D) => void = async (
    featureType,
    item
  ) => {
    if (this.selectedObject === item) this.selectedObject = undefined;
    item.clear();
    const feature = ModelFeatureManager.getUsedFeature(featureType);
    if (!feature) return;

    const model = await ModelTool.buildItemModel(item, feature.src, feature.extra);
    if (!model) return;

    item.add(model);
    this.updateFeature(featureType, item.children);
    this.propagateShade(item);
  };

  updateItems = (right?: boolean, left?: boolean) => {
    if (right ?? true) this.updateItem('rightItem', this.doll.pivots.rightItem);
    if (left ?? true) this.updateItem('leftItem', this.doll.pivots.leftItem);
  };

  buildPoseEntry = (part: THREE.Object3D) => {
    const entry: PoseEntry = {};
    if (!part.rotation.equals(part.userData.defaultRotation as THREE.Euler))
      entry.rotation = part.rotation.toArray();
    if (!part.position.equals(part.userData.defaultPosition as THREE.Vector3Like))
      entry.position = part.position.toArray();
    const scaleOffset = part.userData.scaleOffset as THREE.Vector3 | undefined;
    if (scaleOffset && !scaleOffset.equals(new THREE.Vector3()))
      entry.scaleOffset = scaleOffset.toArray();
    return entry;
  };

  applyPoseEntry = (part: THREE.Object3D, entry?: PoseEntry, additive?: boolean) => {
    entry ??= {};
    if (entry.position) part.position.fromArray(entry.position);
    else if (!additive) part.position.copy(part.userData.defaultPosition as THREE.Vector3Like);
    if (entry.rotation) part.setRotationFromEuler(new THREE.Euler().fromArray(entry.rotation));
    else if (!additive) part.setRotationFromEuler(part.userData.defaultRotation as THREE.Euler);
    if (entry.scaleOffset)
      this.applyScaleOffset(part, new THREE.Vector3().fromArray(entry.scaleOffset));
    else if (!additive) this.applyScaleOffset(part, new THREE.Vector3());
  };

  resetPose = (...filters: THREE.Object3D[]) => {
    for (const pivot of Object.values(this.doll.pivots))
      if (!filters.includes(pivot)) this.applyPoseEntry(pivot);
  };

  savePose = () => {
    for (const pivot of Object.values(this.doll.pivots)) {
      const entry = this.buildPoseEntry(pivot);
      if (!Util.isEmpty(entry)) pivot.userData.savedPoseEntry = entry;
      else delete pivot.userData.savedPoseEntry;
    }
  };

  loadPose = () => {
    for (const pivot of Object.values(this.doll.pivots))
      this.applyPoseEntry(pivot, pivot.userData.savedPoseEntry as PoseEntry | undefined);
  };

  clearSavedPose = () => {
    for (const pivot of Object.values(this.doll.pivots)) delete pivot.userData.savedPoseEntry;
  };

  applyScaleOffset = (part: THREE.Object3D, scaleOffset: THREE.Vector3) => {
    part.userData.scaleOffset = scaleOffset;
    for (const child of this.findScaleableDescendants(part)) {
      const shape = child.userData.defaultShape as THREE.Vector3;
      const shapeChange = shape.clone().add(scaleOffset).divide(shape);
      child.scale.copy(shapeChange);

      const pos = child.userData.defaultPosition as THREE.Vector3;
      const posChange = pos.clone().multiply(shapeChange);
      child.position.copy(posChange);
    }
  };

  getFirstVisibleIntersection = (intersects: THREE.Intersection[]) =>
    intersects.find(({ object }) => {
      const index = object.userData.materialIndex as number | undefined;
      return index === undefined ? false : this.doll.materials.shaded[index].visible;
    });

  findSelectableAncestor: (part: THREE.Object3D) => THREE.Object3D | false = part => {
    if (part.userData.poseable) return part;
    if (part.parent) return this.findSelectableAncestor(part.parent);
    return false;
  };

  findScaleableDescendants = (part: THREE.Object3D) => {
    const children = [];

    if (!children.length) {
      for (const child of part.children) {
        if (child.userData.poseable) continue;
        if (child.userData.defaultShape) children.push(child);
        if (child.name === 'base') continue;
        for (const grandchild of child.children)
          if (grandchild.userData.defaultShape) children.push(grandchild);
      }
    }

    return children;
  };

  deselect = () => {
    this.selectedObject = undefined;

    if (this.hoveredOutlinePass) this.hoveredOutlinePass.selectedObjects = [];
    if (this.selectedOutlinePass) this.selectedOutlinePass.selectedObjects = [];

    this.handles.removeFromParent();
  };

  maybeDeselect = (part: THREE.Object3D) => {
    if (this.selectedObject && this.selectedObject === this.findSelectableAncestor(part))
      this.deselect();
  };

  renderFrame = () => {
    if (!this.composer) return;

    const delta = this.clock.getDelta();
    this.state.mode?.renderFrame?.(this.state.exportingRender ? 0 : delta);
    this.composer.render();
  };

  startAnimationLoop = () => {
    this.renderFrame();

    this.requestID = window.requestAnimationFrame(this.startAnimationLoop);
  };

  changeSize = (width: number, height: number, ratio = 1) => {
    if (this.perspCam) {
      this.perspCam.aspect = width / height;
      this.perspCam.updateProjectionMatrix();
    }

    if (this.orthoCam) {
      this.orthoCam.left = width / -2;
      this.orthoCam.right = width / 2;
      this.orthoCam.top = height / 2;
      this.orthoCam.bottom = height / -2;
      this.orthoCam.updateProjectionMatrix();
    }

    this.renderer?.setSize(width, height);
    this.composer?.setSize(width, height);
    this.renderer?.setPixelRatio(ratio);
    this.composer?.setPixelRatio(ratio);
  };

  handleWindowResize = () => {
    if (
      !this.canvasRef.current?.parentNode ||
      !(this.canvasRef.current.parentNode instanceof Element)
    )
      return;

    const width = this.canvasRef.current.parentNode.clientWidth;
    const height = this.canvasRef.current.parentNode.clientHeight - 32;

    this.changeSize(width, height, window.devicePixelRatio);
  };

  onKeyDown = (e: KeyboardEvent) => {
    if (this.activeKeys[e.key]) return;
    this.activeKeys[e.key] = true;

    if (this.canvasRef.current?.closest('.window')?.classList.contains('active')) {
      if (e.key === 'Tab') {
        this.nextMode();
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      this.state.mode?.onKeyDown?.(e);
      this.panelRef.current?.onKeyDown(e);
    }
  };

  onKeyUp = (e: KeyboardEvent) => {
    delete this.activeKeys[e.key];
  };

  createRender = (width: number, height: number, smaa: boolean) => {
    if (
      !this.canvasRef.current?.parentElement ||
      !this.SMAAPass ||
      !this.hoveredOutlinePass ||
      !this.selectedOutlinePass ||
      !this.renderer ||
      !this.composer
    )
      return ImgMod.EMPTY_IMAGE_SOURCE;

    this.SMAAPass.enabled = smaa;
    this.hoveredOutlinePass.enabled = false;
    this.selectedOutlinePass.enabled = false;
    this.handles.visible = false;
    this.grid.visible = false;
    this.changeSize(width, height, 1);
    this.renderFrame();

    const data = this.renderer.domElement.toDataURL();

    this.SMAAPass.enabled = true;
    this.hoveredOutlinePass.enabled = true;
    this.selectedOutlinePass.enabled = true;
    this.handles.visible = true;
    this.grid.visible = this.state.grid;
    this.handleWindowResize();

    return data;
  };

  nextMode = () => {
    const modes: React.JSX.Element[] = Object.values(this.modes);
    const next = modes.indexOf(this.state.modeElement) + 1;
    this.updateSetting('modeElement', modes[next >= modes.length ? 0 : next], true);
  };

  updateSavedLighting = <KKey extends keyof ViewportOptions>(
    setting: KKey,
    value: ViewportOptions[KKey]
  ) => {
    const from = this.savedViewOptions[setting] as AState[KKey];
    this.savedViewOptions[setting] = value;
    SessionManager.updateCache('viewportOptions', this.savedViewOptions);
    return from;
  };

  updateSetting = <KKey extends keyof AState>(
    setting: KKey,
    value: AState[KKey],
    saveEdit?: boolean
  ) => {
    const from =
      saveEdit && Util.isKeyOfObject(setting, this.savedViewOptions)
        ? (this.updateSavedLighting(
            setting,
            value as ViewportOptions[typeof setting]
          ) as AState[KKey])
        : this.state[setting];

    this.setState({ [setting]: value } as Pick<AState, KKey>);
    if (saveEdit) {
      let name = 'change ' + setting;

      if (setting === 'modeElement')
        for (const [modeName, modeElement] of Object.entries(this.modes))
          if (modeElement === value) {
            name = 'open ' + modeName;
            break;
          }

      EditManager.addEdit(name, () => this.settingEdit(setting, from, value));
    }
  };

  settingEdit = <KKey extends keyof AState>(
    setting: KKey,
    from: AState[KKey],
    to: AState[KKey]
  ) => {
    this.updateSetting(setting, from);

    return Promise.resolve(() => this.settingEdit(setting, to, from));
  };

  render() {
    return (
      <div className="paperdoll stack container">
        <span className="viewport-ui">
          <ViewportPanel
            shade={this.state.shade}
            lightAngle={this.state.lightAngle}
            lightFocus={this.state.lightFocus}
            ambientLightColor={this.state.ambientLightColor}
            ambientLightIntensity={this.state.ambientLightIntensity}
            directionalLightColor={this.state.directionalLightColor}
            directionalLightIntensity={this.state.directionalLightIntensity}
            partToggles={this.state.partToggles}
            fov={this.state.fov}
            usePerspectiveCam={this.state.usePerspectiveCam}
            grid={this.state.grid}
            background={this.state.background}
            updateSetting={this.updateSetting}
            resetCameraPosition={this.resetCameraPosition}
            ref={this.panelRef}
          />
          {this.state.modeElement}
          <div className="bottom left">
            <button title="Save Render" onClick={() => this.setState({ exportingRender: true })}>
              {SAVE_RENDER}
            </button>
          </div>
        </span>
        <div className="paperdoll-canvas-container">
          <canvas
            className="paperdoll-canvas"
            ref={this.canvasRef}
            style={
              this.state.background && this.state.backgroundImage
                ? { background: `center / contain no-repeat url("${this.state.backgroundImage}")` }
                : {}
            }
          />
        </div>
        {this.state.exportingRender && this.canvasRef.current?.parentElement && (
          <ExportRender
            defaultWidth={this.canvasRef.current.parentElement.clientWidth}
            defaultHeight={this.canvasRef.current.parentElement.clientHeight}
            close={() => this.setState({ exportingRender: false })}
            createRender={this.createRender}
          />
        )}
      </div>
    );
  }
}
