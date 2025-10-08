import React, { Component, RefObject } from 'react';
import * as THREE from 'three';
import * as ModelTool from '@tools/modeltool';
import * as Util from '@tools/util';
import * as PrefMan from '@tools/prefman';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import skinmodel from '@/skinmodel.json';
import { Features } from '@components/special/modelfeatures';
import { UndoCallback } from '@components/special/skinmanager';
import PaperDollSettings from '@components/special/paperdoll/paperdollsettings';

export const ANIMATIONS = ['Walk', 'Crouch Walk'] as const;

type PoseEntry = {
  position?: THREE.Vector3Tuple;
  rotation?: THREE.EulerTuple;
};

type AProps = {
  skin: string;
  slim: boolean;
  updateSlim: (slim: boolean) => void;
  modelFeatures: Features;
  addEdit: (name: string, undoCallback: UndoCallback) => void;
  manager: PrefMan.Manager;
};

export type AState = {
  anim: boolean;
  animSpeed: number;
  animation: (typeof ANIMATIONS)[number];
  explode: boolean;
  shade: boolean;
  lightAngle: number;
  lightFocus: number;
  ambientLightColor: string;
  ambientLightIntensity: number;
  directionalLightColor: string;
  directionalLightIntensity: number;
  pose: boolean;
  poseSettings: {
    mode: 'Simple' | 'Controlled';
    type: 'Rotation' | 'Movement';
    space: 'Local' | 'Global';
  };
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
  savedPoses: string[];
};

const defaultLighting = {
  lightAngle: Math.PI / 4,
  lightFocus: Math.SQRT2,
  ambientLightColor: '#ffffff',
  ambientLightIntensity: 1,
  directionalLightColor: '#ffffff',
  directionalLightIntensity: 2.5
};

class PaperDoll extends Component<AProps, AState> {
  canvasRef: RefObject<HTMLCanvasElement | null> = React.createRef();
  clock = new THREE.Clock();
  time = 0;
  idleTime = 0;
  activeKeys: Record<string, true> = {};
  mousePos = new THREE.Vector2(1, 1);
  oldMousePos?: THREE.Vector2;
  canDeselect = false;
  doll = new ModelTool.Model('doll', skinmodel as ModelTool.ModelDefinition);
  materials = this.doll.materials;
  pivots = this.doll.pivots;

  rightItem = new THREE.Group();
  leftItem = new THREE.Group();

  handles = new THREE.Object3D();
  handle?: THREE.Mesh;
  hoveredHandle?: THREE.Mesh;
  oldHandlePos?: THREE.Vector3;
  selectedStartMatrix?: THREE.Matrix4;
  selectedStartWorldPos?: THREE.Vector3;
  hoveredObject?: THREE.Object3D;
  selectedObject?: THREE.Object3D;
  posePivot?: THREE.Vector2Like;
  queuedPoseEdit?: THREE.Vector3;

  raycaster = new THREE.Raycaster();
  scene: THREE.Scene;
  requestID = 0;
  ambientLight = new THREE.AmbientLight(0xffffff, 1);
  directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
  grid = new THREE.GridHelper(16, 16);

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
      anim: this.props.manager.get().animatePlayerOnStart,
      animSpeed: 0.5,
      animation: 'Walk',
      explode: false,
      shade: true,
      lightAngle: defaultLighting.lightAngle,
      lightFocus: defaultLighting.lightFocus,
      ambientLightColor: defaultLighting.ambientLightColor,
      ambientLightIntensity: defaultLighting.ambientLightIntensity,
      directionalLightColor: defaultLighting.directionalLightColor,
      directionalLightIntensity: defaultLighting.directionalLightIntensity,
      pose: false,
      poseSettings: {
        mode: 'Simple',
        type: 'Rotation',
        space: 'Local'
      },
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
      grid: true,
      savedPoses: this.getSavedPoses()
    };

    this.scene = new THREE.Scene();
  }

  componentDidMount() {
    if (!this.canvasRef.current) return;

    this.sceneSetup();
    this.createHandles();
    this.modelSetup();
    this.updateSlim();
    this.updateCape();
    this.updateElytra();
    this.updateHelmet();
    this.updateChestplate();
    this.updateLeggings();
    this.updateBoots();
    this.updateItems();
    this.updateExplode();
    this.updateLighting();
    this.propagateShade(this.doll.root);
    this.textureSetup();
    this.startAnimationLoop();

    this.canvasRef.current.addEventListener('mousemove', this.onMouseMove);
    this.canvasRef.current.addEventListener('mousedown', this.onMouseDown);
    this.canvasRef.current.addEventListener('mouseup', this.onMouseUp);
    this.canvasRef.current.addEventListener('contextmenu', this.onContextMenu);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.handleWindowResize);
  }

  componentWillUnmount() {
    if (!this.canvasRef.current) return;

    this.canvasRef.current.removeEventListener('mousemove', this.onMouseMove);
    this.canvasRef.current.removeEventListener('mousedown', this.onMouseDown);
    this.canvasRef.current.removeEventListener('mouseup', this.onMouseUp);
    this.canvasRef.current.removeEventListener('contextmenu', this.onContextMenu);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.handleWindowResize);
    window.cancelAnimationFrame(this.requestID);
    if (this.controls) this.controls.dispose();
    if (this.renderer) this.renderer.dispose();
  }

  componentDidUpdate(prevProps: Readonly<AProps>, prevState: Readonly<AState>) {
    if (this.state.explode !== prevState.explode) this.updateExplode();

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

    if (this.state.grid !== prevState.grid) {
      this.grid.visible = this.state.grid;
    }

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

  resetCamera = () => {
    if (!this.controls || !this.perspCam || !this.orthoCam) return;

    if (this.activeCam === this.orthoCam) {
      this.changeCamera(this.perspCam);
      this.controls.reset();
      this.changeCamera(this.orthoCam);
    } else this.controls.reset();
  };

  createRotationHandle = (
    color: THREE.ColorRepresentation,
    name: string,
    normal: number[],
    rotation: number[]
  ) => {
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(5, 0.2, 8, 32),
      new THREE.MeshBasicMaterial({
        color: color,
        depthTest: false,
        transparent: true,
        opacity: 0.5
      })
    );

    handle.name = name;
    handle.userData.normal = new THREE.Vector3().fromArray(normal);
    handle.setRotationFromEuler(
      new THREE.Euler().setFromVector3(
        new THREE.Vector3().fromArray(rotation).multiplyScalar(Math.PI / 2)
      )
    );
    handle.renderOrder = 999;
    handle.userData.noOutline = true;

    const handlePadding = new THREE.Mesh(
      new THREE.TorusGeometry(5, 1, 8, 16),
      new THREE.MeshBasicMaterial({ visible: false })
    );

    handlePadding.name = 'handlePadding';
    handle.add(handlePadding);

    return handle;
  };

  createPositionAxisHandle = (
    color: THREE.ColorRepresentation,
    name: string,
    normal: number[],
    rotation: number[]
  ) => {
    const handleCylinder = new THREE.CylinderGeometry(0.2, 0.2, 5, 32);
    handleCylinder.translate(0, 2.5, 0);
    const handleArrow = new THREE.CylinderGeometry(0, 0.6, 2, 32);
    handleArrow.translate(0, 6, 0);

    const handle = new THREE.Mesh(
      BufferGeometryUtils.mergeGeometries([handleCylinder, handleArrow]),
      new THREE.MeshBasicMaterial({
        color: color,
        depthTest: false,
        transparent: true,
        opacity: 0.5
      })
    );

    handle.name = name;
    handle.userData.normal = new THREE.Vector3().fromArray(normal);
    handle.setRotationFromEuler(
      new THREE.Euler().setFromVector3(
        new THREE.Vector3().fromArray(rotation).multiplyScalar(Math.PI / 2)
      )
    );
    handle.renderOrder = 999;
    handle.userData.noOutline = true;

    const handlePadding = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 0.2, 7, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );

    handlePadding.name = 'handlePadding';
    handlePadding.position.set(0, 4, 0);
    handle.add(handlePadding);

    return handle;
  };

  createPositionPlaneHandle = (
    color: THREE.ColorRepresentation,
    name: string,
    normal: number[],
    rotation: number[]
  ) => {
    const handle = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({
        color: color,
        depthTest: false,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
      })
    );

    const euler = new THREE.Euler().setFromVector3(
      new THREE.Vector3().fromArray(rotation).multiplyScalar(Math.PI / 2)
    );

    handle.name = name;
    handle.userData.normal = new THREE.Vector3().fromArray(normal);
    handle.setRotationFromEuler(euler);
    handle.position.set(-2, 2, 0);
    handle.position.applyEuler(euler);
    handle.renderOrder = 999;
    handle.userData.noOutline = true;

    return handle;
  };

  createHandles = () => {
    this.handles.clear();

    const rotationHandles = new THREE.Object3D();
    rotationHandles.name = 'rotationHandles';
    rotationHandles.add(this.createRotationHandle(0xff0000, 'x', [1, 0, 0], [0, 1, 0]));
    rotationHandles.add(this.createRotationHandle(0x00ff00, 'y', [0, 1, 0], [1, 0, 0]));
    rotationHandles.add(this.createRotationHandle(0x0000ff, 'z', [0, 0, 1], [0, 0, 0]));
    this.handles.add(rotationHandles);

    const positionHandles = new THREE.Object3D();
    positionHandles.name = 'positionHandles';

    const positionAxisHandles = new THREE.Object3D();
    positionAxisHandles.name = 'positionAxisHandles';
    positionAxisHandles.add(this.createPositionAxisHandle(0xff0000, 'x', [1, 0, 0], [0, 0, -1]));
    positionAxisHandles.add(this.createPositionAxisHandle(0x00ff00, 'y', [0, 1, 0], [0, 0, 0]));
    positionAxisHandles.add(this.createPositionAxisHandle(0x0000ff, 'z', [0, 0, 1], [1, 0, 0]));
    positionHandles.add(positionAxisHandles);

    const positionPlaneHandles = new THREE.Object3D();
    positionPlaneHandles.name = 'positionPlaneHandles';
    positionPlaneHandles.add(this.createPositionPlaneHandle(0xff0000, 'x', [1, 0, 0], [0, 1, 0]));
    positionPlaneHandles.add(this.createPositionPlaneHandle(0x00ff00, 'y', [0, 1, 0], [1, 0, -1]));
    positionPlaneHandles.add(this.createPositionPlaneHandle(0x0000ff, 'z', [0, 0, 1], [0, 0, -1]));
    positionHandles.add(positionPlaneHandles);

    this.handles.add(positionHandles);
  };

  textureSetup = () => this.doll.setupTexture(this.props.skin, this.state.shade);

  propagateShade = (part: THREE.Object3D) => {
    if (part instanceof THREE.Mesh) {
      part.material =
        this.materials[this.state.shade ? 'shaded' : 'flat'][part.userData.materialIndex as number];
    }

    part.children.forEach(this.propagateShade);
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

    this.pivots.rightItem = this.doll.setupChildItem(this.rightItem);
    this.pivots.leftItem = this.doll.setupChildItem(this.leftItem);
  };

  updateSlim = () => {
    this.pivots.rightArm.children[0].visible = !this.props.slim;
    this.pivots.rightArm.children[1].visible = this.props.slim;
    this.pivots.leftArm.children[0].visible = !this.props.slim;
    this.pivots.leftArm.children[1].visible = this.props.slim;

    this.pivots.rightArm.children[this.props.slim ? 1 : 0].children[2].add(this.rightItem);
    this.pivots.leftArm.children[this.props.slim ? 1 : 0].children[2].add(this.leftItem);
  };

  updatePartToggles = () => {
    for (const pivot in this.state.partToggles) {
      if (!(pivot in this.pivots)) continue;

      const usedPivot =
        pivot === 'rightArm' || pivot === 'leftArm'
          ? this.pivots[pivot].getObjectByName(this.props.slim ? 'slim' : 'full')
          : this.pivots[pivot];
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
      if (deselect && this.selectedObject && this.selectedObject === this.findPosableAncestor(part))
        this.deselect();
      return;
    }

    ModelTool.textureLoader.load(feature, texture => {
      texture.magFilter = THREE.NearestFilter;

      const mats = [
        this.materials.shaded[part.userData.materialIndex as number],
        this.materials.flat[part.userData.materialIndex as number]
      ];

      mats.forEach(mat => {
        mat.map = texture;
        mat.needsUpdate = true;
      });

      part.layers.enable(0);
    });
  };

  updateFeature = (name: keyof Features, parts: THREE.Object3D[], deselect?: boolean) => {
    const feature = this.props.modelFeatures[name];

    for (const part of Object.values(parts)) {
      this.updateFeaturePart(feature.value, part, deselect);
    }
  };

  updateCape = () => {
    this.updateFeature('cape', [this.pivots.cape.children[0]], true);
  };

  updateElytra = () => {
    this.updateFeature(
      'elytra',
      [this.pivots.leftElytraWing.children[0], this.pivots.rightElytraWing.children[0]],
      true
    );
  };

  updateHelmet = () => {
    this.updateFeature('helmet', [this.pivots.head.children[2]]);
  };

  updateChestplate = () => {
    this.updateFeature('chestplate', [
      this.pivots.torso.children[2],
      this.pivots.rightArm.children[2],
      this.pivots.leftArm.children[2]
    ]);
  };

  updateLeggings = () => {
    this.updateFeature('leggings', [
      this.pivots.torso.children[3],
      this.pivots.rightLeg.children[2],
      this.pivots.leftLeg.children[2]
    ]);
  };

  updateBoots = () => {
    this.updateFeature('boots', [
      this.pivots.rightLeg.children[3],
      this.pivots.leftLeg.children[3]
    ]);
  };

  updateItem = (name: keyof Features, item: THREE.Group) => {
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
    if (right ?? true) this.updateItem('rightItem', this.rightItem);
    if (left ?? true) this.updateItem('leftItem', this.leftItem);
  };

  updateExplode = () => {
    const mod = this.state.explode ? 2.5 : 0;

    this.pivots.head.position.y = skinmodel.head.position[1] + mod;

    this.pivots.leftLeg.position
      .fromArray(skinmodel.torso.children.leftLeg.position)
      .add(new THREE.Vector3(mod / 2, -mod, 0));
    this.pivots.rightLeg.position
      .fromArray(skinmodel.torso.children.rightLeg.position)
      .add(new THREE.Vector3(-mod / 2, -mod, 0));

    this.pivots.leftArm.position.x = skinmodel.torso.children.leftArm.position[0] + mod;
    this.pivots.rightArm.position.x = skinmodel.torso.children.rightArm.position[0] - mod;

    this.pivots.cape.position.z = skinmodel.torso.children.cape.position[2] - mod * 5;
    this.pivots.leftElytraWing.position.z =
      skinmodel.torso.children.leftElytraWing.position[2] - mod * 5;
    this.pivots.rightElytraWing.position.z =
      skinmodel.torso.children.rightElytraWing.position[2] - mod * 5;
  };

  resetPose = () => {
    for (const pivot of Object.values(this.pivots)) {
      pivot.position.copy(pivot.userData.defaultPosition as THREE.Vector3Like);
      pivot.setRotationFromEuler(new THREE.Euler());
    }
  };

  savePose = () => {
    for (const pivot of Object.values(this.pivots)) {
      if (!pivot.position.equals(pivot.userData.defaultPosition as THREE.Vector3Like))
        pivot.userData.savedPosition = pivot.position.clone();
      if (!pivot.rotation.equals(new THREE.Euler()))
        pivot.userData.savedRotation = pivot.rotation.clone();
    }
  };

  loadPose = () => {
    for (const pivot of Object.values(this.pivots)) {
      if (!pivot.userData.savedPosition)
        pivot.position.copy(pivot.userData.defaultPosition as THREE.Vector3Like);
      else pivot.position.copy(pivot.userData.savedPosition as THREE.Vector3Like);

      if (!pivot.userData.savedRotation) pivot.setRotationFromEuler(new THREE.Euler());
      else pivot.setRotationFromEuler(pivot.userData.savedRotation as THREE.Euler);
    }
  };

  clearSavedPose = () => {
    for (const pivot of Object.values(this.pivots)) {
      delete pivot.userData.savedPosition;
      delete pivot.userData.savedRotation;
    }
  };

  getSavedPoses = () => {
    return JSON.parse(localStorage.getItem('poses') ?? '[]') as string[];
  };

  getSavedPose = (poseName: string) => {
    return JSON.parse(localStorage.getItem('pose-' + poseName) ?? '{}') as Record<
      string,
      { rotation?: THREE.EulerTuple; position?: THREE.Vector3Tuple }
    >;
  };

  getPoseJson = () => {
    const poseJson: Record<string, PoseEntry> = {};

    for (const [name, pivot] of Object.entries(this.pivots)) {
      const entry: PoseEntry = {};
      if (!pivot.position.equals(pivot.userData.defaultPosition as THREE.Vector3Like))
        entry.position = pivot.position.toArray();
      if (!pivot.rotation.equals(new THREE.Euler())) entry.rotation = pivot.rotation.toArray();

      if (Object.keys(entry).length > 0) poseJson[name] = entry;
    }

    return poseJson;
  };

  loadPoseJson = (poseJson: Record<string, PoseEntry> = {}) => {
    this.resetPose();

    for (const [name, transform] of Object.entries(poseJson)) {
      const pivot = this.pivots[name];
      if (!pivot) continue;

      if (transform.position) pivot.position.fromArray(transform.position);
      if (transform.rotation)
        pivot.setRotationFromEuler(new THREE.Euler().fromArray(transform.rotation));
    }
  };

  savePoseJson = () => {
    const poseName = window.prompt('Save pose as...');
    if (poseName === null) return;

    const savedPoses = this.getSavedPoses();

    let overwrite = false;
    if (savedPoses.includes(poseName)) {
      overwrite = window.confirm(`Overwrite existing pose '${poseName}'?`);
      if (!overwrite) return;
    }

    const poseJson = this.getPoseJson();
    if (Object.keys(poseJson).length === 0) {
      window.alert('Unable to save! Empty pose');
      return;
    }

    localStorage.setItem('pose-' + poseName, JSON.stringify(poseJson));

    if (!overwrite) {
      savedPoses.push(poseName);
      localStorage.setItem('poses', JSON.stringify(savedPoses));
      this.setState({ savedPoses: savedPoses });
    }
  };

  loadPoseName = (poseName: string) => {
    const poseJson = this.getSavedPose(poseName);
    if (!poseJson) {
      window.alert(`Unable to load! Pose '${poseName}' not found`);
      return;
    }

    if (Object.keys(poseJson).length === 0) {
      window.alert('Unable to load! Pose is empty! You should probably delete it :/');
      return;
    }

    this.loadPoseJson(poseJson);
  };

  deletePoseName = (poseName: string) => {
    localStorage.removeItem('pose-' + poseName);

    const savedPoses = this.getSavedPoses();
    if (!savedPoses) return;

    const index = savedPoses.indexOf(poseName);
    if (index < 0) return;

    savedPoses.splice(index, 1);
    localStorage.setItem('poses', JSON.stringify(savedPoses));
    this.setState({ savedPoses: savedPoses });
  };

  downloadPoseJson: (poseName: string) => void = async poseName => {
    await Util.download(
      poseName + '.json',
      'data:text/plain;charset=utf-8,' +
        encodeURIComponent(localStorage.getItem('pose-' + poseName) ?? '{}')
    );
  };

  uploadPoseJson = (poseName: string, poseJsonString: string) => {
    const savedPoses = this.getSavedPoses();

    let usedName = poseName;
    if (savedPoses.includes(poseName)) {
      let i = 1;
      do usedName = `${poseName}(${i++})`;
      while (savedPoses.includes(usedName));
    }

    savedPoses.push(usedName);
    localStorage.setItem('poses', JSON.stringify(savedPoses));
    localStorage.setItem('pose-' + usedName, poseJsonString);
    this.setState({ savedPoses: savedPoses });
  };

  capturePose = () => {
    this.setState({
      pose: true,
      explode: false
    });
  };

  animate = (delta: number) => {
    if (this.state.anim) {
      this.time += delta * 8 * this.state.animSpeed;
      this.idleTime += delta * 8;
      if (this.time > Math.PI * 20) this.time -= Math.PI * 20;
    }

    this.pivots.head.position.copy(this.pivots.head.userData.defaultPosition as THREE.Vector3Like);
    this.pivots.torso.position.copy(
      this.pivots.torso.userData.defaultPosition as THREE.Vector3Like
    );
    this.pivots.leftArm.position.copy(
      this.pivots.leftArm.userData.defaultPosition as THREE.Vector3Like
    );
    this.pivots.rightArm.position.copy(
      this.pivots.rightArm.userData.defaultPosition as THREE.Vector3Like
    );
    this.pivots.leftLeg.position.copy(
      this.pivots.leftLeg.userData.defaultPosition as THREE.Vector3Like
    );
    this.pivots.rightLeg.position.copy(
      this.pivots.rightLeg.userData.defaultPosition as THREE.Vector3Like
    );
    this.pivots.leftElytraWing.position.copy(
      this.pivots.leftElytraWing.userData.defaultPosition as THREE.Vector3Like
    );
    this.pivots.rightElytraWing.position.copy(
      this.pivots.rightElytraWing.userData.defaultPosition as THREE.Vector3Like
    );

    this.updateExplode();

    const rotation = Math.sin(this.time) * this.state.animSpeed;

    this.pivots.leftLeg.rotation.x = rotation;
    this.pivots.rightLeg.rotation.x = -rotation;
    this.pivots.leftArm.rotation.x = -rotation;
    this.pivots.rightArm.rotation.x = rotation;

    this.pivots.leftArm.rotation.z = Math.sin(this.idleTime * 0.3) * 0.075 + 0.075;
    this.pivots.rightArm.rotation.z = -this.pivots.leftArm.rotation.z;

    this.pivots.cape.rotation.x =
      Math.sin(this.idleTime * 0.1) * 0.05 + 0.75 * this.state.animSpeed + 0.1;

    const oldWingRotation = this.pivots.leftElytraWing.rotation.clone();
    let newWingRotation = new THREE.Euler(Math.PI / 12, Math.PI / 36, Math.PI / 12);

    switch (this.state.animation) {
      case 'Walk':
        this.pivots.torso.rotation.x = 0;

        break;
      case 'Crouch Walk':
        this.pivots.head.position.y -= 4.0;
        this.pivots.torso.position.y -= 3.0;

        this.pivots.torso.rotation.x = 0.5;

        this.pivots.leftArm.rotation.x -= 0.1;
        this.pivots.rightArm.rotation.x -= 0.1;

        this.pivots.leftArm.position.y += 0.2;
        this.pivots.rightArm.position.y += 0.2;

        this.pivots.leftArm.position.z += 1.0;
        this.pivots.rightArm.position.z += 1.0;

        this.pivots.leftLeg.rotation.x -= 0.5;
        this.pivots.rightLeg.rotation.x -= 0.5;

        this.pivots.leftLeg.position.y += 2;
        this.pivots.rightLeg.position.y += 2;

        this.pivots.leftLeg.position.z += 0.8;
        this.pivots.rightLeg.position.z += 0.8;

        this.pivots.leftElytraWing.position.y -= 3.0;

        this.pivots.rightElytraWing.position.y -= 3.0;

        newWingRotation = new THREE.Euler((Math.PI * 2) / 9, Math.PI / 36, Math.PI / 4);

        break;
    }

    const wingDelta = Math.min(delta * 6, 1);
    const wingRotation = new THREE.Euler(
      newWingRotation.x * wingDelta + oldWingRotation.x * (1 - wingDelta),
      newWingRotation.y * wingDelta + oldWingRotation.y * (1 - wingDelta),
      newWingRotation.z * wingDelta + oldWingRotation.z * (1 - wingDelta)
    );

    this.pivots.leftElytraWing.setRotationFromEuler(wingRotation);
    this.pivots.rightElytraWing.setRotationFromEuler(
      new THREE.Euler(wingRotation.x, -wingRotation.y, -wingRotation.z)
    );
  };

  findPosableAncestor: (part: THREE.Object3D) => THREE.Object3D | false = part => {
    if (part.userData.poseable) return part;
    if (part.parent) return this.findPosableAncestor(part.parent);
    return false;
  };

  filterOutline = (part: THREE.Object3D) => {
    let children: THREE.Object3D[] = [];

    if (part.children.length > 0) {
      part.children.forEach(child => children.push(...this.filterOutline(child)));
    } else if (
      (part.userData.renderType !== 'cutout' || part.userData.forceOutline) &&
      !part.userData.poseable &&
      part.visible &&
      !part.userData.noOutline
    )
      children = [part];

    return children;
  };

  getClipZ = (part: THREE.Object3D) => {
    if (!this.activeCam) return 0;
    return part.getWorldPosition(new THREE.Vector3()).project(this.activeCam).z;
  };

  clipToWorldSpace = (position: THREE.Vector2, clipZ: number) => {
    if (!this.activeCam) return new THREE.Vector3();
    return new THREE.Vector3(position.x, position.y, clipZ).unproject(this.activeCam);
  };

  poseRotation = () => {
    if (!this.oldMousePos || !this.selectedObject?.parent) return;

    if (this.state.poseSettings.mode === 'Controlled') {
      if (!this.handle) return;

      const localRotation = this.selectedObject.getWorldQuaternion(new THREE.Quaternion());
      const worldPivotPos = this.selectedObject.getWorldPosition(new THREE.Vector3());
      const norm = (this.handle.userData.normal as THREE.Vector3).clone();
      if (this.state.poseSettings.space === 'Local') norm.applyQuaternion(localRotation);

      const camMult = this.activeCam instanceof THREE.OrthographicCamera ? -1 : 1;
      const start = this.clipToWorldSpace(this.mousePos, 0.5 * camMult);
      const lineDirection = this.clipToWorldSpace(this.mousePos, 0.9 * camMult)
        .sub(start)
        .normalize();
      start.sub(worldPivotPos);

      const line = new THREE.Line3(start, start.clone().addScaledVector(lineDirection, 500));

      const plane = new THREE.Plane(norm);

      const intersect = plane.intersectLine(line, new THREE.Vector3());
      if (!intersect) return;

      if (!this.oldHandlePos || !this.selectedStartMatrix) {
        this.oldHandlePos = intersect;
        this.selectedStartMatrix = this.selectedObject.matrix.clone();
        return;
      }

      const vec1 = this.oldHandlePos.clone().normalize();
      const vec2 = intersect.clone().normalize();

      const matrix = new THREE.Matrix3(
        vec1.x,
        vec1.y,
        vec1.z,
        vec2.x,
        vec2.y,
        vec2.z,
        norm.x,
        norm.y,
        norm.z
      );

      let angle = Math.atan2(matrix.determinant(), vec1.dot(vec2));

      if (this.activeKeys.Control) {
        const step = Math.PI / 16;
        angle = Math.round(angle / step) * step;
      }

      const rotation = new THREE.Quaternion().setFromAxisAngle(
        this.state.poseSettings.space === 'Global'
          ? norm.applyQuaternion(localRotation.invert())
          : (this.handle.userData.normal as THREE.Vector3),
        angle
      );

      this.selectedObject.setRotationFromQuaternion(
        new THREE.Quaternion().setFromRotationMatrix(this.selectedStartMatrix).multiply(rotation)
      );
    } else if (this.activeCam && this.posePivot) {
      // Simple mode
      const axis = this.activeCam.getWorldDirection(new THREE.Vector3());

      const oldRad = this.oldMousePos.clone().sub(this.posePivot).angle();
      const newRad = this.mousePos.clone().sub(this.posePivot).angle();
      const angle = oldRad - newRad;

      const quat = this.selectedObject.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
      const rotQuat = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      const worldQuat = this.selectedObject.getWorldQuaternion(new THREE.Quaternion());

      quat.multiply(new THREE.Quaternion().multiplyQuaternions(rotQuat, worldQuat));

      this.selectedObject.setRotationFromQuaternion(quat);
    }
  };

  posePosition = () => {
    if (!this.oldMousePos || !this.selectedObject?.parent) return;

    const clipZ = this.getClipZ(this.selectedObject);
    const camMult = Math.sign(clipZ);

    if (this.state.poseSettings.mode === 'Controlled') {
      if (!this.handle) return;

      this.selectedStartMatrix ??= this.selectedObject.matrix.clone();
      this.selectedStartWorldPos ??= this.selectedObject.getWorldPosition(new THREE.Vector3());

      const worldQuat = this.selectedObject.getWorldQuaternion(new THREE.Quaternion());
      const norm = (this.handle.userData.normal as THREE.Vector3).clone();
      if (this.state.poseSettings.space === 'Local') norm.applyQuaternion(worldQuat);

      let movement;

      if (this.handle.parent?.name === 'positionAxisHandles') {
        const start = this.clipToWorldSpace(this.mousePos, 0.5 * camMult);
        const lineDirection = this.clipToWorldSpace(this.mousePos, 0.9 * camMult)
          .sub(start)
          .normalize();
        start.sub(this.selectedStartWorldPos);

        const line = new THREE.Line3(start, start.clone().addScaledVector(lineDirection, 500));

        const plane = new THREE.Plane();
        plane.setFromCoplanarPoints(
          new THREE.Vector3(),
          this.clipToWorldSpace(this.mousePos, clipZ).sub(this.selectedStartWorldPos),
          norm
        );

        const intersect = plane.intersectLine(line, new THREE.Vector3());
        if (!intersect) return;

        const axis = new THREE.Line3(new THREE.Vector3(), norm);
        axis.closestPointToPoint(intersect, false, intersect);

        if (!this.oldHandlePos) {
          this.oldHandlePos = intersect;
          return;
        }

        movement = intersect.sub(this.oldHandlePos);

        if (this.activeKeys.Control) {
          const length = movement.length();
          movement.normalize().multiplyScalar(Math.round(length));
        }
      } else {
        const start = this.clipToWorldSpace(this.mousePos, 0.5 * camMult);
        const lineDirection = this.clipToWorldSpace(this.mousePos, 0.9 * camMult)
          .sub(start)
          .normalize();
        start.sub(this.selectedStartWorldPos);

        const line = new THREE.Line3(start, start.clone().addScaledVector(lineDirection, 500));

        const plane = new THREE.Plane(norm);

        const intersect = plane.intersectLine(line, new THREE.Vector3());
        if (!intersect) return;

        if (!this.oldHandlePos) {
          this.oldHandlePos = intersect;
          return;
        }

        movement = intersect.sub(this.oldHandlePos);

        if (this.activeKeys.Control) {
          if (this.state.poseSettings.space === 'Local') {
            movement.applyQuaternion(worldQuat.clone().invert());
            movement.round();
            movement.applyQuaternion(worldQuat);
          } else movement.round();
        }
      }
      movement.add(this.selectedObject.parent.getWorldPosition(new THREE.Vector3()));
      this.selectedObject.parent.worldToLocal(movement);

      this.selectedObject.position.copy(
        new THREE.Vector3().setFromMatrixPosition(this.selectedStartMatrix).add(movement)
      );
    } else {
      // Simple mode
      const movement = this.clipToWorldSpace(this.mousePos, clipZ);
      movement.sub(this.clipToWorldSpace(this.oldMousePos, clipZ));
      movement.add(this.selectedObject.parent.getWorldPosition(new THREE.Vector3()));
      this.selectedObject.parent.worldToLocal(movement);

      this.selectedObject.position.add(movement);
    }
  };

  pose = () => {
    if (!this.activeCam || !this.selectedOutlinePass || !this.hoveredOutlinePass) return;

    this.raycaster.setFromCamera(this.mousePos, this.activeCam);
    this.hoveredHandle = undefined;
    const isRotationMode = this.state.poseSettings.type === 'Rotation';

    if (this.selectedObject) {
      if (this.state.poseSettings.mode === 'Controlled') {
        if (!this.handles) return;

        const rotationHandles = this.handles.getObjectByName('rotationHandles');
        if (rotationHandles) rotationHandles.visible = isRotationMode;
        const positionHandles = this.handles.getObjectByName('positionHandles');
        if (positionHandles) positionHandles.visible = !isRotationMode;

        const activeHandles = isRotationMode ? rotationHandles : positionHandles;
        if (!activeHandles) return;

        if (this.state.poseSettings.space === 'Global') {
          this.handles.position.copy(this.selectedObject.getWorldPosition(new THREE.Vector3()));
          this.scene.add(this.handles);
        } else {
          this.handles.position.copy(new THREE.Vector3());
          this.selectedObject.add(this.handles);
        }

        if (!this.handle) {
          const handleIntersects = this.raycaster.intersectObject(activeHandles, true);
          const hoveredHandle =
            handleIntersects.length > 0
              ? handleIntersects[0].object.name === 'handlePadding'
                ? handleIntersects[0].object.parent
                : handleIntersects[0].object
              : undefined;
          this.hoveredHandle = hoveredHandle instanceof THREE.Mesh ? hoveredHandle : undefined;

          if (positionHandles && rotationHandles) {
            positionHandles.children.concat([rotationHandles]).forEach(handleGroup =>
              handleGroup.children.forEach(child => {
                if (child instanceof THREE.Mesh) (child.material as THREE.Material).opacity = 0.5;
                child.renderOrder = 999;
              })
            );
          }

          if (this.hoveredHandle) {
            if ('opacity' in this.hoveredHandle.material) this.hoveredHandle.material.opacity = 1;
            this.hoveredHandle.renderOrder = 1000;
          }
        }
      }

      if (this.oldMousePos) {
        if (this.mousePos.equals(this.oldMousePos)) return;

        if (isRotationMode) this.poseRotation();
        else this.posePosition();

        this.oldMousePos = new THREE.Vector2().copy(this.mousePos);
      }

      this.selectedOutlinePass.selectedObjects = this.filterOutline(this.selectedObject);
    } else {
      this.selectedOutlinePass.selectedObjects = [];
      this.handles.removeFromParent();
    }

    this.hoveredObject = undefined;
    this.hoveredOutlinePass.selectedObjects = [];

    if (
      !this.hoveredHandle &&
      !this.handle &&
      !(this.selectedObject && this.state.poseSettings.mode === 'Simple')
    ) {
      const intersects = this.raycaster.intersectObject(this.doll.root, true);
      const poseable =
        intersects.length > 0 ? this.findPosableAncestor(intersects[0].object) : false;

      if (poseable) {
        this.hoveredObject = poseable;
        if (poseable !== this.selectedObject)
          this.hoveredOutlinePass.selectedObjects = this.filterOutline(poseable);
      }
    }
  };

  renderFrame = () => {
    if (!this.composer) return;

    const delta = this.clock.getDelta();

    if (this.state.pose) this.pose();
    else this.animate(delta);

    this.composer.render();
  };

  startAnimationLoop = () => {
    this.renderFrame();

    this.requestID = window.requestAnimationFrame(this.startAnimationLoop);
  };

  poseUndo = (obj: THREE.Object3D, start: THREE.Object3D) => {
    const redoStart = new THREE.Object3D();
    redoStart.setRotationFromEuler(obj.rotation);
    redoStart.position.copy(obj.position);

    const redoProphecy = () => this.poseUndo(obj, redoStart);
    obj.setRotationFromEuler(start.rotation);
    obj.position.copy(start.position);

    return redoProphecy;
  };

  addPoseEdit = (prefix: string, suffix?: string) => {
    if (!this.selectedObject) return;

    const obj = this.selectedObject;

    const start = new THREE.Object3D();
    start.setRotationFromEuler(obj.rotation);
    start.position.copy(obj.position);

    suffix = suffix === undefined ? '' : ' ' + suffix;

    this.props.addEdit(prefix + ' ' + obj.name + suffix, () => this.poseUndo(obj, start));
  };

  onMouseMove = (e: MouseEvent) => {
    if (this.canDeselect) this.canDeselect = false;

    if (
      !this.state.pose ||
      !this.canvasRef.current?.parentNode ||
      !(this.canvasRef.current.parentNode instanceof Element)
    )
      return;

    const width = this.canvasRef.current.parentNode.clientWidth;
    const height = this.canvasRef.current.parentNode.clientHeight;

    this.mousePos.x = (e.offsetX / width) * 2 - 1;
    this.mousePos.y = (e.offsetY / height) * -2 + 1;

    if (this.queuedPoseEdit) {
      this.queuedPoseEdit = undefined;
      this.addPoseEdit('pose');
    }
  };

  onMouseDown = (e: MouseEvent) => {
    if (!this.state.pose) return;
    if (e.button === 2) return;

    if (this.state.poseSettings.mode === 'Controlled') {
      if (this.hoveredObject) {
        this.selectedObject = this.hoveredObject;
        return;
      } else if (!this.hoveredHandle) {
        this.canDeselect = true;
        return;
      }
      this.handle = this.hoveredHandle;
    } else {
      if (!this.hoveredObject || !this.activeCam) return;
      this.selectedObject = this.hoveredObject;

      const posePivot = this.selectedObject
        .getWorldPosition(new THREE.Vector3())
        .project(this.activeCam);
      this.posePivot = new THREE.Vector2(posePivot.x, posePivot.y);
    }

    if (this.controls) this.controls.enabled = false;
    this.oldMousePos = new THREE.Vector2().copy(this.mousePos);
    if (this.selectedObject) this.queuedPoseEdit = this.selectedObject.position.clone();
  };

  onMouseUp = () => {
    if (this.canDeselect) this.deselect();
    this.canDeselect = false;

    if (this.state.poseSettings.mode === 'Simple') {
      this.selectedObject = undefined;
    }

    if (this.controls) this.controls.enabled = true;
    this.oldMousePos = undefined;
    this.oldHandlePos = undefined;
    this.selectedStartMatrix = undefined;
    this.selectedStartWorldPos = undefined;
    this.posePivot = undefined;
    this.queuedPoseEdit = undefined;
    this.handle = undefined;
  };

  onContextMenu = (e: MouseEvent) => {
    if (!this.state.pose) return;
    if (!this.hoveredObject) return;

    if (this.state.poseSettings.mode === 'Controlled') {
      if (this.selectedObject !== this.hoveredObject) return;
    }

    this.selectedObject = this.hoveredObject;
    if (this.controls) this.controls.enabled = false;

    const isRotationMode = this.state.poseSettings.type === 'Rotation';

    this.addPoseEdit('reset', isRotationMode ? 'rotation' : 'position');

    const obj = this.selectedObject;

    if (isRotationMode) {
      obj.rotation.x = 0;
      obj.rotation.y = 0;
      obj.rotation.z = 0;
    } else {
      obj.position.copy(obj.userData.defaultPosition as THREE.Vector3Like);
    }

    e.preventDefault();
  };

  onKeyDown = (e: KeyboardEvent) => {
    this.activeKeys[e.key] = true;
  };

  onKeyUp = (e: KeyboardEvent) => {
    delete this.activeKeys[e.key];
  };

  deselect = () => {
    this.selectedObject = undefined;
    if (this.hoveredOutlinePass) this.hoveredOutlinePass.selectedObjects = [];
    if (this.selectedOutlinePass) this.selectedOutlinePass.selectedObjects = [];
    this.handles.removeFromParent();
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

  updateSetting = <KKey extends keyof AState>(setting: KKey, value: AState[KKey]) => {
    switch (setting) {
      case 'anim':
        this.setState({
          anim: !!value
        });
        if (this.hoveredOutlinePass) this.hoveredOutlinePass.selectedObjects = [];
        if (this.selectedOutlinePass) this.selectedOutlinePass.selectedObjects = [];
        this.handles.removeFromParent();
        this.resetPose();
        this.updateExplode();
        break;
      case 'pose':
        this.setState({
          pose: !!value,
          explode: false
        });
        if (this.hoveredOutlinePass) this.hoveredOutlinePass.selectedObjects = [];
        if (this.selectedOutlinePass) this.selectedOutlinePass.selectedObjects = [];
        this.handles.removeFromParent();
        if (!value) {
          this.savePose();
          this.resetPose();
        } else {
          this.loadPose();
          this.clearSavedPose();
        }
        break;
      case 'poseSettings': {
        const settings = value as AState['poseSettings'];
        if (this.state.poseSettings.mode !== settings.mode) this.selectedObject = undefined;

        this.setState({
          poseSettings: {
            mode: settings.mode ?? 'Simple',
            type: settings.type ?? 'Rotation',
            space: settings.space ?? 'Global'
          }
        });
        break;
      }
      default:
        this.setState({ [setting]: value } as Pick<AState, KKey>);
    }
  };

  render() {
    return (
      <div className="paperdoll stack container">
        <PaperDollSettings
          settings={{
            anim: this.state.anim,
            animSpeed: this.state.animSpeed,
            animation: this.state.animation,
            explode: this.state.explode,
            shade: this.state.shade,
            lightAngle: this.state.lightAngle,
            lightFocus: this.state.lightFocus,
            ambientLightColor: this.state.ambientLightColor,
            ambientLightIntensity: this.state.ambientLightIntensity,
            directionalLightColor: this.state.directionalLightColor,
            directionalLightIntensity: this.state.directionalLightIntensity,
            pose: this.state.pose,
            poseSettings: this.state.poseSettings,
            partToggles: this.state.partToggles,
            fov: this.state.fov,
            usePerspectiveCam: this.state.usePerspectiveCam,
            grid: this.state.grid
          }}
          slim={this.props.slim}
          updateSetting={this.updateSetting}
          updateSlim={this.props.updateSlim}
          saveRender={this.saveRender}
          resetCamera={this.resetCamera}
          resetLighting={() => this.setState(defaultLighting)}
          addEdit={this.props.addEdit}
          deselect={this.deselect}
          resetPose={() => {
            this.resetPose();
            if (this.state.explode) this.updateExplode();
          }}
          savedPoses={this.state.savedPoses}
          savePose={this.savePoseJson}
          loadPose={this.loadPoseName}
          deletePose={this.deletePoseName}
          downloadPose={this.downloadPoseJson}
          uploadPose={this.uploadPoseJson}
          capturePose={this.capturePose}
        />
        <div className="paperdoll-canvas-container">
          <canvas className="paperdoll-canvas" ref={this.canvasRef} />
        </div>
      </div>
    );
  }
}

export default PaperDoll;
