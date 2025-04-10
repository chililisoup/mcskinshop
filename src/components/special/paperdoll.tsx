import React, { ChangeEvent, Component, RefObject } from 'react';
import * as THREE from 'three';
import * as Util from '../../tools/util';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import steve from '@assets/steve.png';
import alex from '@assets/alex.png';
import matcap from '@assets/matcap.png';
import skinmodel from '../../skinmodel.json';
import save_render from '@assets/save_render.png';
import { Features } from './modelfeatures';
import { UndoCallback } from './skinmanager';
import Dropdown from '../basic/dropdown';

type ModelPart = {
  poseable?: boolean;
  position: number[];
  rotation?: number[];
  renderType?: 'cutout';
  shape?: number[];
  uniqueMaterial?: boolean;
  textureSize?: number[];
  uv?: number[];
  uvSize?: number[];
  uvMirrored?: boolean;
  children?: Record<string, ModelPart>;
};

type PoseEntry = {
  position?: THREE.Vector3Tuple;
  rotation?: THREE.EulerTuple;
};

type AProps = {
  skin?: string;
  slim: boolean;
  updateSlim: (slim: boolean) => void;
  modelFeatures: Features;
  addEdit: (name: string, undoCallback: UndoCallback) => void;
};

type AState = {
  anim: boolean;
  animSpeed: number;
  explode: boolean;
  shade: boolean;
  lightAngle: number;
  lightFocus: number;
  pose: boolean;
  poseSettings: {
    mode: 'Simple' | 'Controlled';
    type: 'Rotation' | 'Movement';
    space: 'Local' | 'Global';
  };
  fov: number;
  usePerspectiveCam: boolean;
  savedPoses: string[];
};

// This whole shared settings thing is cursed, wack, and most definitely wildly incorrect
type SharedSettings = AState & {
  slim: boolean;
};

const defaultLighting = {
  lightAngle: Math.PI / 4,
  lightFocus: Math.SQRT2
};

class PaperDoll extends Component<AProps, AState> {
  canvasRef: RefObject<HTMLCanvasElement | null> = React.createRef();
  clock = new THREE.Clock();
  time = 0;
  idleTime = 0;
  mousePos = new THREE.Vector2(1, 1);
  oldMousePos?: THREE.Vector2;
  doll = new THREE.Object3D();
  materials: {
    shaded: (THREE.MeshLambertMaterial | THREE.MeshMatcapMaterial)[];
    flat: (THREE.MeshLambertMaterial | THREE.MeshMatcapMaterial)[];
  } = {
    shaded: [],
    flat: []
  };
  pivots: Record<string, THREE.Object3D> = {};

  handles = new THREE.Object3D();
  handle?: THREE.Mesh;
  hoveredHandle?: THREE.Mesh;
  oldHandlePos?: THREE.Vector3;
  hoveredObject?: THREE.Object3D;
  selectedObject?: THREE.Object3D;
  posePivot?: THREE.Vector2Like;
  queuedPoseEdit?: THREE.Vector3;

  raycaster = new THREE.Raycaster();
  scene: THREE.Scene;
  textureLoader = new THREE.TextureLoader();
  matcapMap = this.textureLoader.load(matcap, matcapMap => matcapMap);
  requestID = 0;
  directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);

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
      anim: true,
      animSpeed: 0.5,
      explode: false,
      shade: true,
      lightAngle: defaultLighting.lightAngle,
      lightFocus: defaultLighting.lightFocus,
      pose: false,
      poseSettings: {
        mode: 'Simple',
        type: 'Rotation',
        space: 'Local'
      },
      fov: 80,
      usePerspectiveCam: true,
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
    this.updateHelmet();
    this.updateChestplate();
    this.updateLeggings();
    this.updateBoots();
    this.updateExplode();
    this.updateLighting();
    this.propagateShade(this.doll);
    this.textureSetup();
    this.startAnimationLoop();

    this.canvasRef.current.addEventListener('mousemove', this.onMouseMove);
    this.canvasRef.current.addEventListener('mousedown', this.onMouseDown);
    this.canvasRef.current.addEventListener('mouseup', this.onMouseUp);
    this.canvasRef.current.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('resize', this.handleWindowResize);
  }

  componentWillUnmount() {
    if (!this.canvasRef.current) return;

    this.canvasRef.current.removeEventListener('mousemove', this.onMouseMove);
    this.canvasRef.current.removeEventListener('mousedown', this.onMouseDown);
    this.canvasRef.current.removeEventListener('mouseup', this.onMouseUp);
    this.canvasRef.current.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('resize', this.handleWindowResize);
    window.cancelAnimationFrame(this.requestID);
    if (this.controls) this.controls.dispose();
    if (this.renderer) this.renderer.dispose();
  }

  componentDidUpdate(prevProps: AProps, prevState: AState) {
    if (this.state.explode !== prevState.explode) this.updateExplode();

    if (
      this.state.usePerspectiveCam !== prevState.usePerspectiveCam &&
      this.perspCam &&
      this.orthoCam
    )
      this.changeCamera(this.state.usePerspectiveCam ? this.perspCam : this.orthoCam);

    if (
      this.state.lightAngle !== prevState.lightAngle ||
      this.state.lightFocus !== prevState.lightFocus
    ) {
      this.updateLighting();
    }

    let updateTextures = false;

    if (this.props.slim !== prevProps.slim) {
      this.updateSlim();
      updateTextures = true;
    }

    if (this.props.modelFeatures.cape !== prevProps.modelFeatures.cape) {
      this.updateCape();
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

    if (this.state.shade !== prevState.shade) {
      this.propagateShade(this.doll);
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

    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    this.scene.add(ambientLight);

    this.perspCam.add(this.directionalLight);

    this.matcapMap = this.textureLoader.load(matcap, matcapMap => matcapMap);

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
      new THREE.TorusGeometry(5, 0.3, 8, 32),
      new THREE.MeshBasicMaterial({
        color: color,
        depthTest: false,
        transparent: true,
        opacity: 0.33
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

    return handle;
  };

  createPositionHandle = (
    color: THREE.ColorRepresentation,
    name: string,
    normal: number[],
    rotation: number[]
  ) => {
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 10, 32),
      new THREE.MeshBasicMaterial({
        color: color,
        depthTest: false,
        transparent: true,
        opacity: 0.33
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

    return handle;
  };

  createHandles = () => {
    const rotationHandles = new THREE.Object3D();
    rotationHandles.name = 'rotationHandles';
    rotationHandles.add(this.createRotationHandle(0xff0000, 'x', [1, 0, 0], [0, 1, 0]));
    rotationHandles.add(this.createRotationHandle(0x00ff00, 'y', [0, 1, 0], [1, 0, 0]));
    rotationHandles.add(this.createRotationHandle(0x0000ff, 'z', [0, 0, 1], [0, 0, 0]));
    this.handles.add(rotationHandles);

    const positionHandles = new THREE.Object3D();
    positionHandles.name = 'positionHandles';
    positionHandles.add(this.createPositionHandle(0xff0000, 'x', [1, 0, 0], [0, 0, 1]));
    positionHandles.add(this.createPositionHandle(0x00ff00, 'y', [0, 1, 0], [0, 0, 0]));
    positionHandles.add(this.createPositionHandle(0x0000ff, 'z', [0, 0, 1], [1, 0, 0]));
    this.handles.add(positionHandles);
  };

  textureSetup = () => {
    const skin = this.props.skin ?? (this.props.slim ? alex : steve);
    this.textureLoader.load(skin, texture => {
      texture.magFilter = THREE.NearestFilter;

      this.materials[this.state.shade ? 'shaded' : 'flat'].forEach(mat => {
        if (mat.userData.uniqueMaterial) return;
        mat.map = texture;
        mat.needsUpdate = true;
      });
    });
  };

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
  };

  createCuboidUVQuad = (x: number, y: number, w: number, h: number, mirrored: boolean) => {
    const mod = (mirrored ? 1 : 0) * w;

    return [
      [x + mod, y],
      [x + w - mod, y],
      [x + mod, y + h],
      [x + w - mod, y + h]
    ];
  };

  createCuboidUVMap = (uv: number[], size: number[], textureHeight: number, mirrored: boolean) => {
    const [width, height, depth] = size;

    const right = this.createCuboidUVQuad(
      // RIGHT
      depth + width,
      depth,
      depth,
      height,
      mirrored
    );

    const left = this.createCuboidUVQuad(
      // LEFT
      0,
      depth,
      depth,
      height,
      mirrored
    );

    const faces = [
      mirrored ? left : right,
      mirrored ? right : left,
      this.createCuboidUVQuad(
        // TOP
        depth,
        0,
        width,
        depth,
        mirrored
      ),
      this.createCuboidUVQuad(
        // BOTTOM
        depth + width,
        depth,
        width,
        -depth,
        mirrored
      ),
      this.createCuboidUVQuad(
        // FRONT
        depth,
        depth,
        width,
        height,
        mirrored
      ),
      this.createCuboidUVQuad(
        // BACK
        depth + width + depth,
        depth,
        width,
        height,
        mirrored
      )
    ];

    const uvMap = [];
    for (const face of Object.values(faces)) {
      for (const vert of Object.values(face)) {
        uvMap.push([vert[0] + uv[0], textureHeight - (vert[1] + uv[1])]);
      }
    }

    return uvMap;
  };

  eatChild = (name: string, child: ModelPart) => {
    let part;

    if (child.shape) {
      const geometry = new THREE.BoxGeometry(child.shape[0], child.shape[1], child.shape[2]);

      if (child.uv) {
        const uvAttribute = geometry.getAttribute('uv');
        const textureSize = child.textureSize ?? [64, 64];

        child.uv.length = 2;

        const uv = this.createCuboidUVMap(
          child.uv,
          child.uvSize ?? child.shape,
          textureSize[1],
          child.uvMirrored ?? false
        );

        uv.forEach((v, i) => uvAttribute.setXY(i, v[0] / textureSize[0], v[1] / textureSize[1]));
      }

      let shadedMat, flatMat;

      part = new THREE.Mesh(geometry);
      if (child.renderType === 'cutout') {
        part.userData.renderType = 'cutout';

        shadedMat = new THREE.MeshLambertMaterial({
          side: THREE.DoubleSide,
          transparent: true,
          flatShading: true,
          alphaTest: 0.001
        });

        flatMat = new THREE.MeshMatcapMaterial({
          side: THREE.DoubleSide,
          transparent: true,
          flatShading: true,
          alphaTest: 0.001,
          matcap: this.matcapMap
        });
      } else {
        shadedMat = new THREE.MeshLambertMaterial({
          flatShading: true
        });

        flatMat = new THREE.MeshMatcapMaterial({
          flatShading: true,
          matcap: this.matcapMap
        });
      }

      part.userData.materialIndex = this.materials.shaded.push(shadedMat) - 1;
      this.materials.flat.push(flatMat);

      if (child.uniqueMaterial) {
        shadedMat.userData.uniqueMaterial = true;
        flatMat.userData.uniqueMaterial = true;
      }
    } else part = new THREE.Group();

    if (child.children)
      for (const [k, v] of Object.entries(child.children)) part.add(this.eatChild(k, v));

    if (child.position) part.position.fromArray(child.position);

    if (child.rotation) {
      const rotation = child.rotation.map(degrees => (degrees * Math.PI) / 180);
      part.setRotationFromEuler(
        new THREE.Euler().fromArray([rotation[0], rotation[1], rotation[2]])
      );
    }

    if (child.poseable) {
      part.userData.poseable = true;
      part.userData.defaultPosition = part.position.clone();
      this.pivots[name] = part;
    }

    part.name = name;

    return part;
  };

  modelSetup = () => {
    this.doll.clear();

    this.materials.shaded = [];
    this.materials.flat = [];
    this.pivots = {};

    this.doll.name = 'doll';
    this.scene.add(this.doll);

    for (const [k, v] of Object.entries(skinmodel)) this.doll.add(this.eatChild(k, v as ModelPart));
  };

  updateSlim = () => {
    this.pivots.rightArm.children[0].visible = !this.props.slim;
    this.pivots.rightArm.children[1].visible = this.props.slim;
    this.pivots.leftArm.children[0].visible = !this.props.slim;
    this.pivots.leftArm.children[1].visible = this.props.slim;
  };

  updateFeaturePart = (feature: string | false, part: THREE.Object3D, deselect?: boolean) => {
    if (!feature) {
      part.layers.disable(0);
      if (deselect && this.selectedObject && this.selectedObject === this.findPosableAncestor(part))
        this.deselect();
      return;
    }

    this.textureLoader.load(feature, texture => {
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
      this.updateFeaturePart(feature, part, deselect);
    }
  };

  updateCape = () => {
    this.updateFeature('cape', [this.pivots.cape.children[0]], true);
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

  savePoseJson = () => {
    const poseName = window.prompt('Save pose as...');
    if (poseName === null) return;

    const savedPoses = this.getSavedPoses();

    let overwrite = false;
    if (savedPoses.includes(poseName)) {
      overwrite = window.confirm(`Overwrite existing pose '${poseName}'?`);
      if (!overwrite) return;
    }

    const poseJson: Record<string, PoseEntry> = {};

    for (const [name, pivot] of Object.entries(this.pivots)) {
      const entry: PoseEntry = {};
      if (!pivot.position.equals(pivot.userData.defaultPosition as THREE.Vector3Like))
        entry.position = pivot.position.toArray();
      if (!pivot.rotation.equals(new THREE.Euler())) entry.rotation = pivot.rotation.toArray();

      if (Object.keys(entry).length > 0) poseJson[name] = entry;
    }

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

  loadPoseJson = (poseName: string) => {
    const poseJson = this.getSavedPose(poseName);
    if (!poseJson) {
      window.alert(`Unable to load! Pose '${poseName}' not found`);
      return;
    }

    if (Object.keys(poseJson).length === 0) {
      window.alert('Unable to load! Pose is empty! You should probably delete it :/');
      return;
    }

    this.resetPose();

    for (const [name, transform] of Object.entries(poseJson) as [string, PoseEntry][]) {
      const pivot = this.pivots[name];
      if (!pivot) continue;

      if (transform.position) pivot.position.fromArray(transform.position);
      if (transform.rotation)
        pivot.setRotationFromEuler(new THREE.Euler().fromArray(transform.rotation));
    }
  };

  deletePoseJson = (poseName: string) => {
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

  animate = (delta: number) => {
    if (this.state.anim) {
      this.time += delta * 8 * this.state.animSpeed;
      this.idleTime += delta * 8;
      if (this.time > Math.PI * 20) this.time -= Math.PI * 20;
    }

    const rotation = Math.sin(this.time) * this.state.animSpeed;
    this.pivots.leftLeg.rotation.x = rotation;
    this.pivots.rightLeg.rotation.x = -rotation;
    this.pivots.leftArm.rotation.x = -rotation;
    this.pivots.rightArm.rotation.x = rotation;

    this.pivots.leftArm.rotation.z = Math.sin(this.idleTime * 0.3) * 0.075 + 0.075;
    this.pivots.rightArm.rotation.z = -this.pivots.leftArm.rotation.z;

    this.pivots.cape.rotation.x =
      Math.sin(this.idleTime * 0.1) * 0.05 + 0.75 * this.state.animSpeed + 0.1;
  };

  findPosableAncestor: (part: THREE.Object3D) => THREE.Object3D | false = part => {
    if (part.userData.poseable) return part;
    if (part.parent) return this.findPosableAncestor(part.parent);
    return false;
  };

  filterOutline = (part: THREE.Object3D) => {
    let children: THREE.Object3D[] = [];

    if (part.children.length > 0) {
      part.children.forEach(child => {
        children = children.concat(this.filterOutline(child));
      });
    } else if (
      part.userData.renderType !== 'cutout' &&
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
    if (this.state.poseSettings.mode === 'Controlled') {
      if (!this.handle || !this.selectedObject) return;

      const localRotation = this.selectedObject.getWorldQuaternion(new THREE.Quaternion());
      const worldPivotPos = this.selectedObject.getWorldPosition(new THREE.Vector3());
      const norm = (this.handle.userData.normal as THREE.Vector3).clone();
      if (this.state.poseSettings.space === 'Local') norm.applyQuaternion(localRotation);

      const start = this.clipToWorldSpace(this.mousePos, 0.5);
      const lineDirection = this.clipToWorldSpace(this.mousePos, 0.9).sub(start).normalize();
      start.sub(worldPivotPos);

      const line = new THREE.Line3(start, start.clone().addScaledVector(lineDirection, 500));

      const plane = new THREE.Plane(norm);

      const intersect = new THREE.Vector3();
      const result = plane.intersectLine(line, intersect);
      if (!result) return;

      if (!this.oldHandlePos) {
        this.oldHandlePos = intersect;
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

      const angle = Math.atan2(matrix.determinant(), vec1.dot(vec2));

      if (this.state.poseSettings.space === 'Global') {
        this.selectedObject.rotateOnAxis(norm.applyQuaternion(localRotation.invert()), angle);
      } else this.selectedObject.rotateOnAxis(this.handle.userData.normal as THREE.Vector3, angle);

      this.oldHandlePos = intersect;
    } else if (
      this.activeCam &&
      this.oldMousePos &&
      this.posePivot &&
      this.selectedObject?.parent
    ) {
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
    if (!this.selectedObject || !this.oldMousePos || !this.selectedObject?.parent) return;

    const clipZ = this.getClipZ(this.selectedObject);

    if (this.state.poseSettings.mode === 'Controlled') {
      if (!this.handle) return;

      const worldPivotPos = this.selectedObject.getWorldPosition(new THREE.Vector3());
      const norm = (this.handle.userData.normal as THREE.Vector3).clone();
      if (this.state.poseSettings.space === 'Local')
        norm.applyQuaternion(this.selectedObject.getWorldQuaternion(new THREE.Quaternion()));

      const line = new THREE.Line3(worldPivotPos, worldPivotPos.clone().add(norm));

      const linePos = line.closestPointToPoint(
        this.clipToWorldSpace(this.mousePos, clipZ),
        false,
        new THREE.Vector3()
      );
      const oldLinePos = line.closestPointToPoint(
        this.clipToWorldSpace(this.oldMousePos, clipZ),
        false,
        new THREE.Vector3()
      );

      const movement = linePos.sub(oldLinePos);
      movement.add(this.selectedObject.parent.getWorldPosition(new THREE.Vector3()));
      this.selectedObject.parent.worldToLocal(movement);

      this.selectedObject.position.add(movement);
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

        if (this.state.poseSettings.space === 'Global') {
          this.handles.position.copy(this.selectedObject.getWorldPosition(new THREE.Vector3()));
          this.scene.add(this.handles);
        } else {
          this.handles.position.copy(new THREE.Vector3());
          this.selectedObject.add(this.handles);
        }

        if (!this.handle) {
          const handleIntersects = this.raycaster.intersectObject(this.handles, true);
          const hoveredHandle =
            handleIntersects.length > 0 ? handleIntersects[0].object : undefined;
          this.hoveredHandle = hoveredHandle instanceof THREE.Mesh ? hoveredHandle : undefined;

          this.handles.children.forEach(handleGroup =>
            handleGroup.children.forEach(child => {
              if (child instanceof THREE.Mesh) (child.material as THREE.Material).opacity = 0.33;
              child.renderOrder = 999;
            })
          );

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
      const intersects = this.raycaster.intersectObject(this.scene, true);
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
      } else if (!this.hoveredHandle) return;
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
    if (this.state.poseSettings.mode === 'Simple') {
      this.selectedObject = undefined;
    }

    if (this.controls) this.controls.enabled = true;
    this.oldMousePos = undefined;
    this.oldHandlePos = undefined;
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
    this.renderer.setSize(width * scale, height * scale);
    this.composer.setSize(width * scale, height * scale);
    this.renderFrame();

    const data = this.renderer.domElement.toDataURL();

    this.SMAAPass.enabled = true;
    this.hoveredOutlinePass.enabled = true;
    this.selectedOutlinePass.enabled = true;
    this.handles.visible = true;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.handleWindowResize();

    const link = document.createElement('a');
    link.href = data;
    const name = window.prompt('Download as...', 'My Skin Render');
    if (name === null) return;
    link.download = name + '.png';
    link.click();
  };

  updateSetting = <KKey extends keyof AState, SKey extends keyof SharedSettings>(
    setting: KKey | SKey,
    value: AState[KKey] | SharedSettings[SKey]
  ) => {
    switch (setting) {
      case 'slim':
        this.props.updateSlim(!!value);
        break;
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
      <div className="paperdoll container">
        <PaperDollSettings
          settings={{
            slim: this.props.slim,
            anim: this.state.anim,
            animSpeed: this.state.animSpeed,
            explode: this.state.explode,
            shade: this.state.shade,
            lightAngle: this.state.lightAngle,
            lightFocus: this.state.lightFocus,
            pose: this.state.pose,
            poseSettings: this.state.poseSettings,
            fov: this.state.fov,
            usePerspectiveCam: this.state.usePerspectiveCam
          }}
          updateSetting={this.updateSetting}
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
          loadPose={this.loadPoseJson}
          deletePose={this.deletePoseJson}
          downloadPose={this.downloadPoseJson}
          uploadPose={this.uploadPoseJson}
        />
        <div className="paperdoll-canvas-container">
          <canvas className="paperdoll-canvas" ref={this.canvasRef} />
        </div>
      </div>
    );
  }
}

type BProps = {
  settings: {
    slim: boolean;
    anim: boolean;
    animSpeed: number;
    explode: boolean;
    shade: boolean;
    lightAngle: number;
    lightFocus: number;
    pose: boolean;
    poseSettings: AState['poseSettings'];
    fov: number;
    usePerspectiveCam: boolean;
  };

  updateSetting: <KKey extends keyof SharedSettings>(
    setting: KKey,
    value: SharedSettings[KKey]
  ) => void;
  saveRender: () => void;
  resetCamera: () => void;
  resetLighting: () => void;
  addEdit: (name: string, undoCallback: UndoCallback) => void;
  deselect: () => void;
  resetPose: () => void;
  savedPoses: string[];
  savePose: () => void;
  loadPose: (poseName: string) => void;
  deletePose: (poseName: string) => void;
  downloadPose: (poseName: string) => void;
  uploadPose: (poseName: string, poseJsonString: string) => void;
};

type BState = BProps['settings'] & {
  selectedPose?: string;
  panel: boolean;
};

class PaperDollSettings extends Component<BProps, BState> {
  uploadRef: RefObject<HTMLInputElement | null> = React.createRef();

  constructor(props: BProps) {
    super(props);

    this.state = {
      slim: props.settings.slim,
      anim: props.settings.anim,
      animSpeed: props.settings.animSpeed,
      explode: props.settings.explode,
      shade: props.settings.shade,
      lightAngle: props.settings.lightAngle,
      lightFocus: props.settings.lightFocus,
      pose: props.settings.pose,
      poseSettings: props.settings.poseSettings,
      fov: props.settings.fov,
      usePerspectiveCam: props.settings.usePerspectiveCam,
      selectedPose: this.props.savedPoses[0],
      panel: true
    };
  }

  componentDidUpdate = (prevProps: BProps) => {
    if (this.props.settings.slim !== prevProps.settings.slim)
      this.setState({ slim: this.props.settings.slim });

    if (this.state.selectedPose === undefined) return;

    if (this.props.savedPoses.length) {
      if (!this.props.savedPoses.includes(this.state.selectedPose)) {
        this.setState({ selectedPose: this.props.savedPoses[0] });
      }
    } else this.setState({ selectedPose: undefined });
  };

  updateSetting = <KKey extends keyof BState>(setting: KKey, value: BState[KKey]) => {
    this.setState({ [setting]: value } as Pick<BState, KKey>);
    this.props.updateSetting(
      setting as keyof SharedSettings,
      value as SharedSettings[keyof SharedSettings]
    );
  };

  settingEdit = <KKey extends keyof BState>(
    setting: KKey,
    from: BState[KKey],
    to: BState[KKey]
  ) => {
    this.setState({ [setting]: from } as Pick<BState, KKey>);
    this.props.updateSetting(
      setting as keyof SharedSettings,
      from as SharedSettings[keyof SharedSettings]
    );

    return () => this.settingEdit(setting, to, from);
  };

  updateSettingFinish = <KKey extends keyof BState>(setting: KKey, value: BState[KKey]) => {
    const from = this.state[setting];

    this.updateSetting(setting, value);

    this.props.addEdit('change ' + setting, () => this.settingEdit(setting, from, value));
  };

  resetLighting = () => {
    this.setState(defaultLighting);
    this.props.resetLighting();
  };

  toggleAnim = (anim: boolean) => {
    this.setState({
      anim: anim
    });
    this.props.updateSetting('anim', anim);
  };

  togglePose = (pose: boolean) => {
    this.setState({
      pose: pose,
      explode: false
    });
    this.props.updateSetting('pose', pose);
  };

  changePoseSetting = <KKey extends keyof AState['poseSettings']>(setting: KKey) => {
    const poseSettings: AState['poseSettings'] = {
      mode: this.state.poseSettings.mode,
      type: this.state.poseSettings.type,
      space: this.state.poseSettings.space
    };

    switch (setting) {
      case 'mode':
        poseSettings[setting] = (
          poseSettings.mode === 'Simple' ? 'Controlled' : 'Simple'
        ) as AState['poseSettings'][KKey];
        break;
      case 'type':
        poseSettings[setting] = (
          poseSettings.type === 'Rotation' ? 'Position' : 'Rotation'
        ) as AState['poseSettings'][KKey];
        break;
      case 'space':
        poseSettings[setting] = (
          poseSettings.space === 'Local' ? 'Global' : 'Local'
        ) as AState['poseSettings'][KKey];
        break;
      default:
        return;
    }

    this.setState({ poseSettings: poseSettings });
    this.props.updateSetting('poseSettings', poseSettings);
  };

  uploadPose = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const name = e.target.files[0].name.replace(/\.[^/.]+$/, '');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') this.props.uploadPose(name, reader.result);
      e.target.value = '';
    };
    reader.readAsText(e.target.files[0]);
  };

  render() {
    return (
      <span className="paperdoll-settings">
        <div className="top right panel">
          <button onClick={() => this.setState({ panel: !this.state.panel })}>
            {this.state.panel ? '>' : '<'}
          </button>
          {this.state.panel && (
            <div className="panel-content">
              <span>
                <label htmlFor="slimToggle">Slim</label>
                <input
                  type="checkbox"
                  id="slimToggle"
                  checked={this.state.slim}
                  onChange={e => this.updateSettingFinish('slim', e.target.checked)}
                />
              </span>
              <Dropdown
                title="Camera"
                children={
                  <div>
                    <span>
                      <label htmlFor="cameraType">Camera Type</label>
                      <button
                        id="cameraType"
                        onClick={() =>
                          this.updateSettingFinish(
                            'usePerspectiveCam',
                            !this.state.usePerspectiveCam
                          )
                        }
                      >
                        {this.state.usePerspectiveCam ? 'Perspective' : 'Orthographic'}
                      </button>
                    </span>
                    <span>
                      <label htmlFor="fov">FOV ({this.state.fov})</label>
                      <input
                        disabled={!this.state.usePerspectiveCam}
                        type="range"
                        id="fov"
                        min={30}
                        max={120}
                        step={1}
                        value={this.state.fov}
                        onChange={e => this.updateSetting('fov', Number(e.target.value))}
                      />
                    </span>
                    <button onClick={this.props.resetCamera}>Reset Camera</button>
                  </div>
                }
              />
              <Dropdown
                title="Lighting"
                children={
                  <div>
                    <span>
                      <label htmlFor="shadeToggle">Shade</label>
                      <input
                        type="checkbox"
                        id="shadeToggle"
                        checked={this.state.shade}
                        onChange={e => this.updateSettingFinish('shade', e.target.checked)}
                      />
                    </span>
                    <span>
                      <label htmlFor="lightFocus">Light Focus</label>
                      <input
                        disabled={!this.state.shade}
                        type="range"
                        id="lightFocus"
                        min={0}
                        max={10}
                        step={0.1}
                        value={Math.sqrt(this.state.lightFocus)}
                        onChange={e =>
                          this.updateSetting('lightFocus', Number(e.target.value) ** 2)
                        }
                      />
                    </span>
                    <span>
                      <label htmlFor="lightAngle">Light Angle</label>
                      <input
                        disabled={!this.state.shade}
                        type="range"
                        id="lightAngle"
                        min={0}
                        max={2 * Math.PI}
                        step={0.1}
                        value={this.state.lightAngle}
                        onChange={e => this.updateSetting('lightAngle', Number(e.target.value))}
                      />
                    </span>
                    <button disabled={!this.state.shade} onClick={this.resetLighting}>
                      Reset Lighting
                    </button>
                  </div>
                }
              />
            </div>
          )}
        </div>
        <span className="top left">
          <div>
            <label htmlFor="editorMode">Editor Mode</label>
            <button id="editorMode" onClick={() => this.togglePose(!this.state.pose)}>
              {this.state.pose ? 'Pose' : 'Animate'}
            </button>
          </div>
          {this.state.pose && (
            <span>
              <span>
                <label htmlFor="poseMode">Pose Mode</label>
                <button id="poseMode" onClick={() => this.changePoseSetting('mode')}>
                  {this.state.poseSettings.mode}
                </button>
              </span>
              <span>
                <label htmlFor="poseType">Pose Type</label>
                <button id="poseType" onClick={() => this.changePoseSetting('type')}>
                  {this.state.poseSettings.type}
                </button>
              </span>
              <span>
                <label htmlFor="poseSpace">Pose Space</label>
                <button id="poseSpace" onClick={() => this.changePoseSetting('space')}>
                  {this.state.poseSettings.space}
                </button>
              </span>
              <button onClick={this.props.deselect}>Deselect</button>
              <button onClick={this.props.resetPose}>Reset Pose</button>
              <select
                value={this.state.selectedPose}
                onChange={e => this.setState({ selectedPose: e.target.value })}
              >
                {this.props.savedPoses.map(poseName => (
                  <option key={poseName}>{poseName}</option>
                ))}
              </select>
              <button
                onClick={() =>
                  this.state.selectedPose && this.props.loadPose(this.state.selectedPose)
                }
              >
                Load Pose
              </button>
              <button
                onClick={() =>
                  this.state.selectedPose && this.props.deletePose(this.state.selectedPose)
                }
              >
                Delete Pose
              </button>
              <button onClick={this.props.savePose}>Save New Pose</button>
              <button
                onClick={() =>
                  this.state.selectedPose && this.props.downloadPose(this.state.selectedPose)
                }
              >
                Download Pose
              </button>
              <button onClick={() => this.uploadRef.current && this.uploadRef.current.click()}>
                Upload Pose
              </button>
              <input
                className="hidden"
                ref={this.uploadRef}
                type="file"
                accept="application/json"
                onChange={this.uploadPose}
              />
            </span>
          )}
          {!this.state.pose && (
            <span>
              <span>
                <label htmlFor="explodeToggle">Explode</label>
                <input
                  type="checkbox"
                  id="explodeToggle"
                  checked={this.state.explode}
                  onChange={e => this.updateSettingFinish('explode', e.target.checked)}
                />
              </span>
              <span>
                <label htmlFor="animToggle">Animate</label>
                <input
                  type="checkbox"
                  id="animToggle"
                  checked={this.state.anim}
                  onChange={e => this.toggleAnim(e.target.checked)}
                />
                <input
                  type="range"
                  id="animSpeed"
                  min={0}
                  max={2}
                  step={0.01}
                  value={this.state.animSpeed}
                  onChange={e => this.updateSetting('animSpeed', Number(e.target.value))}
                />
              </span>
            </span>
          )}
        </span>
        <div className="bottom left">
          <button title="Save Render" onClick={this.props.saveRender}>
            <img alt="Save Render" src={save_render} />
          </button>
        </div>
      </span>
    );
  }
}

export default PaperDoll;
