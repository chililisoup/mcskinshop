import React, { Component, RefObject } from 'react';
import * as THREE from 'three';
import * as PrefMan from '@tools/prefman';
import * as ModelTool from '@tools/modeltool';
import * as Handles from '@components/special/viewport/handles';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import skinmodel from '@/skinmodel.json';
import save_render from '@assets/save_render.png';
import { Features } from '@components/special/modelfeatures';
import { UndoCallback } from '@components/special/skinmanager';
import AnimateMode from '@components/special/viewport/modes/animatemode';
import PoseMode from '@components/special/viewport/modes/posemode';
import ViewportPanel from '@components/special/viewport/viewportpanel';
import AbstractMode from './modes/abstractmode';

type AProps = {
  skin: string;
  slim: boolean;
  updateSlim: (slim: boolean) => void;
  modelFeatures: Features;
  addEdit: (name: string, undoCallback: UndoCallback) => void;
  manager: PrefMan.Manager;
};

export type AState = {
  shade: boolean;
  lightAngle: number;
  lightFocus: number;
  ambientLightColor: string;
  ambientLightIntensity: number;
  directionalLightColor: string;
  directionalLightIntensity: number;
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
  fov: number;
  usePerspectiveCam: boolean;
  grid: boolean;
};

const defaultLighting = {
  lightAngle: Math.PI / 4,
  lightFocus: Math.SQRT2,
  ambientLightColor: '#ffffff',
  ambientLightIntensity: 1,
  directionalLightColor: '#ffffff',
  directionalLightIntensity: 2.5
};

export default class PaperDoll extends Component<AProps, AState> {
  canvasRef: RefObject<HTMLCanvasElement | null> = React.createRef();
  clock = new THREE.Clock();
  doll = new ModelTool.Model('doll', skinmodel as ModelTool.ModelDefinition);

  modeProps = {
    instance: this,
    canvasRef: this.canvasRef,
    manager: this.props.manager,
    addEdit: this.props.addEdit
  };

  modes = {
    animate: <AnimateMode {...this.modeProps} />,
    pose: <PoseMode {...this.modeProps} />
  };
  cachedModeStates: Record<string, string> = {};

  raycaster = new THREE.Raycaster();
  scene: THREE.Scene;
  requestID = 0;
  ambientLight = new THREE.AmbientLight(0xffffff, 1);
  directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
  grid = new THREE.GridHelper(16, 16);
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

  constructor(props: AProps) {
    super(props);

    this.state = {
      shade: true,
      lightAngle: defaultLighting.lightAngle,
      lightFocus: defaultLighting.lightFocus,
      ambientLightColor: defaultLighting.ambientLightColor,
      ambientLightIntensity: defaultLighting.ambientLightIntensity,
      directionalLightColor: defaultLighting.directionalLightColor,
      directionalLightIntensity: defaultLighting.directionalLightIntensity,
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
      fov: 80,
      usePerspectiveCam: true,
      grid: true
    };

    this.scene = new THREE.Scene();
  }

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
    this.textureSetup();
    this.startAnimationLoop();

    window.addEventListener('resize', this.handleWindowResize);
  }

  componentWillUnmount() {
    if (!this.canvasRef.current) return;

    window.removeEventListener('resize', this.handleWindowResize);
    window.cancelAnimationFrame(this.requestID);
    if (this.controls) this.controls.dispose();
    if (this.renderer) this.renderer.dispose();
  }

  componentDidUpdate(prevProps: Readonly<AProps>, prevState: Readonly<AState>) {
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

    let updateTextures = false;

    if (this.props.slim !== prevProps.slim) {
      this.updateSlim();
      if (this.state.partToggles === prevState.partToggles) this.updatePartToggles();
      updateTextures = true;
    }

    if (this.state.partToggles !== prevState.partToggles) this.updatePartToggles();

    if (this.props.modelFeatures.cape !== prevProps.modelFeatures.cape) {
      this.updateCape();
    }

    if (this.props.modelFeatures.elytra !== prevProps.modelFeatures.elytra) {
      this.updateElytra();
    }

    if (this.props.modelFeatures.helmet !== prevProps.modelFeatures.helmet) {
      this.updateHelmet();
    }

    if (this.props.modelFeatures.chestplate !== prevProps.modelFeatures.chestplate) {
      this.updateChestplate();
    }

    if (this.props.modelFeatures.leggings !== prevProps.modelFeatures.leggings) {
      this.updateLeggings();
    }

    if (this.props.modelFeatures.boots !== prevProps.modelFeatures.boots) {
      this.updateBoots();
    }

    if (
      this.props.modelFeatures.rightItem !== prevProps.modelFeatures.rightItem ||
      this.props.modelFeatures.leftItem !== prevProps.modelFeatures.leftItem
    ) {
      this.updateItems(
        this.props.modelFeatures.rightItem !== prevProps.modelFeatures.rightItem,
        this.props.modelFeatures.leftItem !== prevProps.modelFeatures.leftItem
      );
    }

    if (this.state.shade !== prevState.shade) {
      this.propagateShade(this.doll.root);
      updateTextures = true;
    }

    if (this.props.skin !== prevProps.skin) {
      updateTextures = true;
    }

    if (updateTextures) this.textureSetup();

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
    this.hoveredOutlinePass.hiddenEdgeColor.set(0xffffff);
    this.hoveredOutlinePass.edgeStrength = 3;
    this.hoveredOutlinePass.edgeThickness = 1;
    this.composer.addPass(this.hoveredOutlinePass);

    this.selectedOutlinePass = new OutlinePass(
      new THREE.Vector2(width, height),
      this.scene,
      this.perspCam
    );
    this.selectedOutlinePass.hiddenEdgeColor.set(0xff7e1c);
    this.selectedOutlinePass.edgeStrength = 3;
    this.selectedOutlinePass.edgeThickness = 1;
    this.composer.addPass(this.selectedOutlinePass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    this.SMAAPass = new SMAAPass(width, height);
    this.composer.addPass(this.SMAAPass);

    this.scene.add(this.ambientLight);
    this.perspCam.add(this.directionalLight);

    this.grid.material = new THREE.LineBasicMaterial({
      color: 'black',
      transparent: true,
      opacity: 0.75
    });
    this.scene.add(this.grid);

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

  textureSetup = () => this.doll.setupTexture(this.props.skin, this.state.shade);

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

    pivots.rightArm.children[0].visible = !this.props.slim;
    pivots.rightArm.children[1].visible = this.props.slim;
    pivots.leftArm.children[0].visible = !this.props.slim;
    pivots.leftArm.children[1].visible = this.props.slim;

    pivots.rightArm.children[this.props.slim ? 1 : 0].children[2].add(pivots.rightItem);
    pivots.leftArm.children[this.props.slim ? 1 : 0].children[2].add(pivots.leftItem);
  };

  updatePartToggles = () => {
    const pivots = this.doll.pivots;

    for (const pivot in this.state.partToggles) {
      if (!(pivot in pivots)) continue;

      const usedPivot =
        pivot === 'rightArm' || pivot === 'leftArm'
          ? pivots[pivot].getObjectByName(this.props.slim ? 'slim' : 'full')
          : pivots[pivot];
      if (!usedPivot) continue;

      const base = usedPivot.getObjectByName('base');
      if (base) base.visible = this.state.partToggles[pivot as keyof AState['partToggles']].base;
      const hat = usedPivot.getObjectByName('hat');
      if (hat) hat.visible = this.state.partToggles[pivot as keyof AState['partToggles']].hat;
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

  updateFeature = (name: keyof Features, parts: THREE.Object3D[], deselect?: boolean) => {
    const feature = this.props.modelFeatures[name];

    for (const part of Object.values(parts)) {
      this.updateFeaturePart(feature.value, part, deselect);
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
    this.updateFeature('helmet', [this.doll.pivots.head.children[2]]);
  };

  updateChestplate = () => {
    this.updateFeature('chestplate', [
      this.doll.pivots.torso.children[2],
      this.doll.pivots.rightArm.children[2],
      this.doll.pivots.leftArm.children[2]
    ]);
  };

  updateLeggings = () => {
    this.updateFeature('leggings', [
      this.doll.pivots.torso.children[3],
      this.doll.pivots.rightLeg.children[2],
      this.doll.pivots.leftLeg.children[2]
    ]);
  };

  updateBoots = () => {
    this.updateFeature('boots', [
      this.doll.pivots.rightLeg.children[3],
      this.doll.pivots.leftLeg.children[3]
    ]);
  };

  updateItem = (name: keyof Features, item: THREE.Object3D) => {
    item.clear();
    const feature = this.props.modelFeatures[name];
    if (!feature.value) return;
    void ModelTool.buildItemModel(item, feature.value, feature.extra).then(model => {
      item.add(model);
      this.updateFeature(name, item.children);
      this.propagateShade(item);
    });
  };

  updateItems = (right?: boolean, left?: boolean) => {
    if (right ?? true) this.updateItem('rightItem', this.doll.pivots.rightItem);
    if (left ?? true) this.updateItem('leftItem', this.doll.pivots.leftItem);
  };

  resetPose = () => {
    for (const pivot of Object.values(this.doll.pivots)) {
      pivot.setRotationFromEuler(pivot.userData.defaultRotation as THREE.Euler);
      pivot.position.copy(pivot.userData.defaultPosition as THREE.Vector3Like);
      // pivot.scale.copy(pivot.userData.defaultScale as THREE.Vector3Like);
    }
  };

  savePose = () => {
    for (const pivot of Object.values(this.doll.pivots)) {
      if (!pivot.rotation.equals(pivot.userData.defaultRotation as THREE.Euler))
        pivot.userData.savedRotation = pivot.rotation.clone();
      if (!pivot.position.equals(pivot.userData.defaultPosition as THREE.Vector3Like))
        pivot.userData.savedPosition = pivot.position.clone();
      // if (!pivot.scale.equals(pivot.userData.defaultScale as THREE.Vector3Like))
      //   pivot.userData.savedScale = pivot.scale.clone();
    }
  };

  loadPose = () => {
    for (const pivot of Object.values(this.doll.pivots)) {
      if (!pivot.userData.savedRotation)
        pivot.setRotationFromEuler(pivot.userData.defaultRotation as THREE.Euler);
      else pivot.setRotationFromEuler(pivot.userData.savedRotation as THREE.Euler);

      if (!pivot.userData.savedPosition)
        pivot.position.copy(pivot.userData.defaultPosition as THREE.Vector3Like);
      else pivot.position.copy(pivot.userData.savedPosition as THREE.Vector3Like);

      // if (!pivot.userData.savedScale)
      //   pivot.scale.copy(pivot.userData.defaultScale as THREE.Vector3Like);
      // else pivot.scale.copy(pivot.userData.savedScale as THREE.Vector3Like);
    }
  };

  clearSavedPose = () => {
    for (const pivot of Object.values(this.doll.pivots)) {
      delete pivot.userData.savedPosition;
      delete pivot.userData.savedRotation;
    }
  };

  findSelectableAncestor: (part: THREE.Object3D) => THREE.Object3D | false = part => {
    if (part.userData.poseable) return part;
    if (part.parent) return this.findSelectableAncestor(part.parent);
    return false;
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
    this.state.mode?.renderFrame?.(delta);
    this.composer.render();
  };

  startAnimationLoop = () => {
    this.renderFrame();

    this.requestID = window.requestAnimationFrame(this.startAnimationLoop);
  };

  handleWindowResize = () => {
    if (
      !this.canvasRef.current?.parentNode ||
      !(this.canvasRef.current.parentNode instanceof Element)
    )
      return;

    const width = this.canvasRef.current.parentNode.clientWidth;
    const height = this.canvasRef.current.parentNode.clientHeight;

    this.renderer?.setSize(width, height);
    this.composer?.setSize(width, height);

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
  };

  saveRender = () => {
    if (
      !this.canvasRef.current?.parentNode ||
      !(this.canvasRef.current.parentNode instanceof Element) ||
      !this.SMAAPass ||
      !this.hoveredOutlinePass ||
      !this.selectedOutlinePass ||
      !this.renderer ||
      !this.composer
    )
      return;

    const scale = Number(window.prompt('Render Scale (1-4):', '1'));
    if (isNaN(scale) || scale < 1 || scale > 4) return;

    const width = this.canvasRef.current.parentNode.clientWidth;
    const height = this.canvasRef.current.parentNode.clientHeight;

    this.SMAAPass.enabled = false;
    this.hoveredOutlinePass.enabled = false;
    this.selectedOutlinePass.enabled = false;
    this.handles.visible = false;
    this.grid.visible = false;
    this.renderer.setSize(width * scale, height * scale);
    this.composer.setSize(width * scale, height * scale);
    this.renderFrame();

    const data = this.renderer.domElement.toDataURL();

    this.SMAAPass.enabled = true;
    this.hoveredOutlinePass.enabled = true;
    this.selectedOutlinePass.enabled = true;
    this.handles.visible = true;
    this.grid.visible = this.state.grid;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.handleWindowResize();

    const link = document.createElement('a');
    link.href = data;
    const name = window.prompt('Download as...', 'My Skin Render');
    if (name === null) return;
    link.download = name + '.png';
    link.click();
  };

  nextMode = () => {
    const modes: React.JSX.Element[] = Object.values(this.modes);
    const next = modes.indexOf(this.state.modeElement) + 1;
    this.updateSetting('modeElement', modes[next >= modes.length ? 0 : next]);
  };

  updateSetting = <KKey extends keyof AState>(
    setting: KKey,
    value: AState[KKey],
    saveEdit?: boolean
  ) => {
    const from = this.state[setting];
    this.setState({ [setting]: value } as Pick<AState, KKey>);
    if (saveEdit)
      this.props.addEdit('change ' + setting, () => this.settingEdit(setting, from, value));
  };

  settingEdit = <KKey extends keyof AState>(
    setting: KKey,
    from: AState[KKey],
    to: AState[KKey]
  ) => {
    this.updateSetting(setting, from);

    return () => this.settingEdit(setting, to, from);
  };

  render() {
    return (
      <div className="paperdoll stack container">
        <span className="viewport-ui">
          <ViewportPanel
            settings={{
              shade: this.state.shade,
              lightAngle: this.state.lightAngle,
              lightFocus: this.state.lightFocus,
              ambientLightColor: this.state.ambientLightColor,
              ambientLightIntensity: this.state.ambientLightIntensity,
              directionalLightColor: this.state.directionalLightColor,
              directionalLightIntensity: this.state.directionalLightIntensity,
              partToggles: this.state.partToggles,
              fov: this.state.fov,
              usePerspectiveCam: this.state.usePerspectiveCam,
              grid: this.state.grid
            }}
            slim={this.props.slim}
            updateSetting={this.updateSetting}
            updateSlim={this.props.updateSlim}
            resetCameraPosition={this.resetCameraPosition}
            resetLighting={() => this.setState(defaultLighting)}
            addEdit={this.props.addEdit}
          />
          {this.state.modeElement}
          <div className="bottom left">
            <button title="Save Render" onClick={this.saveRender}>
              <img alt="Save Render" src={save_render} />
            </button>
          </div>
        </span>
        <div className="paperdoll-canvas-container">
          <canvas className="paperdoll-canvas" ref={this.canvasRef} />
        </div>
      </div>
    );
  }
}
