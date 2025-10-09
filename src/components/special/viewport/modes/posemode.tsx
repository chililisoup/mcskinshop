import React from 'react';
import * as THREE from 'three';
import * as Util from '@tools/util';
import SettingsRibbon from '@components/basic/settingsribbon';
import AbstractMode, { Props } from './abstractmode';

export const POSE_MODES = ['Rotation', 'Position', 'Scale'] as const;

export type PoseEntry = {
  rotation?: THREE.EulerTuple;
  position?: THREE.Vector3Tuple;
  scale?: THREE.Vector3Tuple;
};

type AState = {
  control: 'Simple' | 'Controlled';
  mode: (typeof POSE_MODES)[number];
  space: 'Local' | 'Global';
  savedPoses: string[];
  selectedPose?: AState['savedPoses'][number];
};

export default class PoseMode extends AbstractMode<AState> {
  activeKeys: Record<string, true> = {};
  mousePos = new THREE.Vector2(1, 1);
  oldMousePos?: THREE.Vector2;
  canDeselect = false;

  handle?: THREE.Mesh;
  hoveredHandle?: THREE.Mesh;
  oldHandlePos?: THREE.Vector3;
  hoveredObject?: THREE.Object3D;
  selectedStartMatrix?: THREE.Matrix4;
  selectedStartWorldPos?: THREE.Vector3;
  posePivot?: THREE.Vector2Like;
  queuedPoseEdit?: THREE.Vector3;

  constructor(props: Props) {
    super(props, 'Pose');

    const savedPoses = this.getSavedPoses();

    this.state = {
      control: 'Simple',
      mode: 'Rotation',
      space: 'Local',
      savedPoses: savedPoses,
      selectedPose: savedPoses[0]
    };
  }

  componentDidMount() {
    super.componentDidMount();
    if (!this.props.canvasRef.current) return;

    this.props.instance.loadPose();
    this.props.instance.clearSavedPose();
    this.addEvents(this.props.canvasRef.current);
  }

  componentWillUnmount() {
    if (!this.props.canvasRef.current) return;

    this.props.instance.savePose();
    this.props.instance.resetPose();
    this.removeEvents(this.props.canvasRef.current);
  }

  changePoseSetting = <KKey extends keyof AState>(name: KKey) => {
    const value = this.state[name];

    switch (name) {
      case 'control':
        this.props.instance.selectedObject = undefined;
        this.updateSetting('control', value === 'Simple' ? 'Controlled' : 'Simple');
        break;
      case 'mode': {
        const typeIndex = POSE_MODES.indexOf(value as AState['mode']);
        const next = typeIndex + 1 >= POSE_MODES.length ? 0 : typeIndex + 1;
        this.updateSetting('mode', POSE_MODES[next]);
        break;
      }
      case 'space':
        this.updateSetting('space', value === 'Local' ? 'Global' : 'Local');
        break;
    }
  };

  onSavedPosesUpdated = (savedPoses: string[]) => {
    this.updateSetting('savedPoses', savedPoses);
  };

  addEvents = (canvas: HTMLCanvasElement) => {
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('contextmenu', this.onContextMenu);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
  };

  removeEvents = (canvas: HTMLCanvasElement) => {
    canvas.removeEventListener('mousemove', this.onMouseMove);
    canvas.removeEventListener('mousedown', this.onMouseDown);
    canvas.removeEventListener('mouseup', this.onMouseUp);
    canvas.removeEventListener('contextmenu', this.onContextMenu);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
  };

  poseRotation = () => {
    if (!this.oldMousePos || !this.props.instance.selectedObject?.parent) return;

    if (this.state.control === 'Controlled') {
      if (!this.handle) return;

      const localRotation = this.props.instance.selectedObject.getWorldQuaternion(
        new THREE.Quaternion()
      );
      const worldPivotPos = this.props.instance.selectedObject.getWorldPosition(
        new THREE.Vector3()
      );
      const norm = (this.handle.userData.normal as THREE.Vector3).clone();
      if (this.state.space === 'Local') norm.applyQuaternion(localRotation);

      const camMult = this.props.instance.activeCam instanceof THREE.OrthographicCamera ? -1 : 1;
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
        this.selectedStartMatrix = this.props.instance.selectedObject.matrix.clone();
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
        this.state.space === 'Global'
          ? norm.applyQuaternion(localRotation.invert())
          : (this.handle.userData.normal as THREE.Vector3),
        angle
      );

      this.props.instance.selectedObject.setRotationFromQuaternion(
        new THREE.Quaternion().setFromRotationMatrix(this.selectedStartMatrix).multiply(rotation)
      );
    } else if (this.props.instance.activeCam && this.posePivot) {
      // Simple mode
      const axis = this.props.instance.activeCam.getWorldDirection(new THREE.Vector3());

      const oldRad = this.oldMousePos.clone().sub(this.posePivot).angle();
      const newRad = this.mousePos.clone().sub(this.posePivot).angle();
      const angle = oldRad - newRad;

      const quat = this.props.instance.selectedObject.parent
        .getWorldQuaternion(new THREE.Quaternion())
        .invert();
      const rotQuat = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      const worldQuat = this.props.instance.selectedObject.getWorldQuaternion(
        new THREE.Quaternion()
      );

      quat.multiply(new THREE.Quaternion().multiplyQuaternions(rotQuat, worldQuat));

      this.props.instance.selectedObject.setRotationFromQuaternion(quat);
    }
  };

  posePosition = () => {
    if (!this.oldMousePos || !this.props.instance.selectedObject?.parent) return;

    const clipZ = this.getClipZ(this.props.instance.selectedObject);
    const camMult = Math.sign(clipZ);

    if (this.state.control === 'Controlled') {
      if (!this.handle) return;

      this.selectedStartMatrix ??= this.props.instance.selectedObject.matrix.clone();
      this.selectedStartWorldPos ??= this.props.instance.selectedObject.getWorldPosition(
        new THREE.Vector3()
      );

      const worldQuat = this.props.instance.selectedObject.getWorldQuaternion(
        new THREE.Quaternion()
      );
      const norm = (this.handle.userData.normal as THREE.Vector3).clone();
      if (this.state.space === 'Local') norm.applyQuaternion(worldQuat);

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
          if (this.state.space === 'Local') {
            movement.applyQuaternion(worldQuat.clone().invert());
            movement.round();
            movement.applyQuaternion(worldQuat);
          } else movement.round();
        }
      }
      movement.add(this.props.instance.selectedObject.parent.getWorldPosition(new THREE.Vector3()));
      this.props.instance.selectedObject.parent.worldToLocal(movement);

      this.props.instance.selectedObject.position.copy(
        new THREE.Vector3().setFromMatrixPosition(this.selectedStartMatrix).add(movement)
      );
    } else {
      // Simple mode
      const movement = this.clipToWorldSpace(this.mousePos, clipZ);
      movement.sub(this.clipToWorldSpace(this.oldMousePos, clipZ));
      movement.add(this.props.instance.selectedObject.parent.getWorldPosition(new THREE.Vector3()));
      this.props.instance.selectedObject.parent.worldToLocal(movement);

      this.props.instance.selectedObject.position.add(movement);
    }
  };

  poseScale = () => {
    if (!this.oldMousePos || !this.props.instance.selectedObject?.parent) return;

    const clipZ = this.getClipZ(this.props.instance.selectedObject);
    const camMult = Math.sign(clipZ);

    if (this.state.control === 'Controlled') {
      if (!this.handle) return;

      this.selectedStartMatrix ??= this.props.instance.selectedObject.matrix.clone();
      this.selectedStartWorldPos ??= this.props.instance.selectedObject.getWorldPosition(
        new THREE.Vector3()
      );

      const worldQuat = this.props.instance.selectedObject.getWorldQuaternion(
        new THREE.Quaternion()
      );
      const norm = (this.handle.userData.normal as THREE.Vector3).clone();
      if (this.state.space === 'Local') norm.applyQuaternion(worldQuat);

      let change;

      if (this.handle.parent?.name === 'scaleAxisHandles') {
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

        change = intersect.sub(this.oldHandlePos);

        if (this.activeKeys.Control) {
          const length = change.length();
          change.normalize().multiplyScalar(Math.round(length));
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

        change = intersect.sub(this.oldHandlePos);

        if (this.activeKeys.Control) {
          if (this.state.space === 'Local') {
            change.applyQuaternion(worldQuat.clone().invert());
            change.round();
            change.applyQuaternion(worldQuat);
          } else change.round();
        }
      }
      change.add(this.props.instance.selectedObject.parent.getWorldPosition(new THREE.Vector3()));
      this.props.instance.selectedObject.parent.worldToLocal(change);

      for (const part of this.findScaleableDescendants(this.props.instance.selectedObject)) {
        const shape = part.userData.defaultShape as THREE.Vector3;
        const partChange = shape.clone().add(change).divide(shape);
        part.scale.copy(partChange);
      }
    } else {
      // Simple mode
      const movement = this.clipToWorldSpace(this.mousePos, clipZ);
      movement.sub(this.clipToWorldSpace(this.oldMousePos, clipZ));
      movement.add(this.props.instance.selectedObject.parent.getWorldPosition(new THREE.Vector3()));
      this.props.instance.selectedObject.parent.worldToLocal(movement);

      this.props.instance.selectedObject.position.add(movement);
    }
  };

  renderFrame = () => {
    if (
      !this.props.instance.activeCam ||
      !this.props.instance.selectedOutlinePass ||
      !this.props.instance.hoveredOutlinePass
    )
      return;

    this.props.instance.raycaster.setFromCamera(this.mousePos, this.props.instance.activeCam);
    this.hoveredHandle = undefined;

    if (this.props.instance.selectedObject) {
      if (this.state.control === 'Controlled') {
        if (!this.props.instance.handles) return;

        const rotationHandles = this.props.instance.handles.getObjectByName('rotationHandles');
        const positionHandles = this.props.instance.handles.getObjectByName('positionHandles');
        const scaleHandles = this.props.instance.handles.getObjectByName('scaleHandles');
        if (!rotationHandles || !positionHandles || !scaleHandles) return;

        rotationHandles.visible = false;
        positionHandles.visible = false;
        scaleHandles.visible = false;

        let activeHandles: THREE.Object3D;
        switch (this.state.mode) {
          case 'Rotation':
            activeHandles = rotationHandles;
            break;
          case 'Position':
            activeHandles = positionHandles;
            break;
          case 'Scale':
            activeHandles = scaleHandles;
            break;
          default:
            return;
        }
        activeHandles.visible = true;

        if (this.state.space === 'Global') {
          this.props.instance.handles.position.copy(
            this.props.instance.selectedObject.getWorldPosition(new THREE.Vector3())
          );
          this.props.instance.scene.add(this.props.instance.handles);
        } else {
          this.props.instance.handles.position.copy(new THREE.Vector3());
          this.props.instance.selectedObject.add(this.props.instance.handles);
        }

        if (!this.handle) {
          const handleIntersects = this.props.instance.raycaster.intersectObject(
            activeHandles,
            true
          );
          const hoveredHandle =
            handleIntersects.length > 0
              ? handleIntersects[0].object.name === 'handlePadding'
                ? handleIntersects[0].object.parent
                : handleIntersects[0].object
              : undefined;
          this.hoveredHandle = hoveredHandle instanceof THREE.Mesh ? hoveredHandle : undefined;

          if (rotationHandles && positionHandles && scaleHandles) {
            rotationHandles.children
              .concat(positionHandles.children, scaleHandles.children)
              .forEach(handleGroup =>
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

        switch (this.state.mode) {
          case 'Rotation':
            this.poseRotation();
            break;
          case 'Position':
            this.posePosition();
            break;
          case 'Scale':
            this.poseScale();
            break;
        }

        this.oldMousePos = new THREE.Vector2().copy(this.mousePos);
      }

      this.props.instance.selectedOutlinePass.selectedObjects = this.filterOutline(
        this.props.instance.selectedObject
      );
    } else {
      this.props.instance.selectedOutlinePass.selectedObjects = [];
      this.props.instance.handles.removeFromParent();
    }

    this.hoveredObject = undefined;
    this.props.instance.hoveredOutlinePass.selectedObjects = [];

    if (
      !this.hoveredHandle &&
      !this.handle &&
      !(this.props.instance.selectedObject && this.state.control === 'Simple')
    ) {
      const intersects = this.props.instance.raycaster.intersectObject(
        this.props.instance.doll.root,
        true
      );
      const poseable =
        intersects.length > 0
          ? this.props.instance.findSelectableAncestor(intersects[0].object)
          : false;

      if (poseable) {
        this.hoveredObject = poseable;
        if (poseable !== this.props.instance.selectedObject)
          this.props.instance.hoveredOutlinePass.selectedObjects = this.filterOutline(poseable);
      }
    }
  };

  findScaleableDescendants = (part: THREE.Object3D) => {
    const children = [];

    if (!children.length) {
      for (const child of part.children) {
        if (child.userData.poseable) continue;
        if (child.userData.defaultShape) children.push(child);
        for (const grandchild of child.children)
          if (grandchild.userData.defaultShape) children.push(grandchild);
      }
    }

    return children;
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
    if (!this.props.instance.activeCam) return 0;
    return part.getWorldPosition(new THREE.Vector3()).project(this.props.instance.activeCam).z;
  };

  clipToWorldSpace = (position: THREE.Vector2, clipZ: number) => {
    if (!this.props.instance.activeCam) return new THREE.Vector3();
    return new THREE.Vector3(position.x, position.y, clipZ).unproject(
      this.props.instance.activeCam
    );
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

    for (const [name, pivot] of Object.entries(this.props.instance.doll.pivots)) {
      const entry: PoseEntry = {};
      if (!pivot.rotation.equals(pivot.userData.defaultRotation as THREE.Euler))
        entry.rotation = pivot.rotation.toArray();
      if (!pivot.position.equals(pivot.userData.defaultPosition as THREE.Vector3Like))
        entry.position = pivot.position.toArray();
      if (!pivot.scale.equals(pivot.userData.defaultScale as THREE.Vector3Like))
        entry.scale = pivot.scale.toArray();

      if (Object.keys(entry).length > 0) poseJson[name] = entry;
    }

    return poseJson;
  };

  loadPoseJson = (poseJson: Record<string, PoseEntry> = {}) => {
    this.props.instance.resetPose();

    for (const [name, transform] of Object.entries(poseJson)) {
      const pivot = this.props.instance.doll.pivots[name];
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
      if (this.onSavedPosesUpdated) this.onSavedPosesUpdated(savedPoses);
    }
  };

  loadPoseByName = (poseName: string) => {
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

  deletePoseByName = (poseName: string) => {
    localStorage.removeItem('pose-' + poseName);

    const savedPoses = this.getSavedPoses();
    if (!savedPoses) return;

    const index = savedPoses.indexOf(poseName);
    if (index < 0) return;

    savedPoses.splice(index, 1);
    localStorage.setItem('poses', JSON.stringify(savedPoses));
    if (this.onSavedPosesUpdated) this.onSavedPosesUpdated(savedPoses);
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
    if (this.onSavedPosesUpdated) this.onSavedPosesUpdated(savedPoses);
  };

  uploadPose = (file: File, name: string) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') this.uploadPoseJson(name, reader.result);
    };
    reader.readAsText(file);
  };

  poseUndo = (obj: THREE.Object3D, start: THREE.Object3D) => {
    const redoStart = new THREE.Object3D();
    redoStart.setRotationFromEuler(obj.rotation);
    redoStart.position.copy(obj.position);

    const redoProphecy = () => this.poseUndo(obj, redoStart);
    obj.setRotationFromEuler(start.rotation);
    obj.position.copy(start.position);
    obj.scale.copy(start.scale);

    return redoProphecy;
  };

  addPoseEdit = (prefix: string, suffix?: string) => {
    if (!this.props.instance.selectedObject) return;

    const obj = this.props.instance.selectedObject;

    const start = new THREE.Object3D();
    start.setRotationFromEuler(obj.rotation);
    start.position.copy(obj.position);

    suffix = suffix === undefined ? '' : ' ' + suffix;

    this.props.instance.props.addEdit(prefix + ' ' + obj.name + suffix, () =>
      this.poseUndo(obj, start)
    );
  };

  onMouseMove = (e: MouseEvent) => {
    if (this.canDeselect) this.canDeselect = false;

    if (
      this.props.instance.state.mode !== this ||
      !this.props.canvasRef.current?.parentNode ||
      !(this.props.canvasRef.current.parentNode instanceof Element)
    )
      return;

    const width = this.props.canvasRef.current.parentNode.clientWidth;
    const height = this.props.canvasRef.current.parentNode.clientHeight;

    this.mousePos.x = (e.offsetX / width) * 2 - 1;
    this.mousePos.y = (e.offsetY / height) * -2 + 1;

    if (this.queuedPoseEdit) {
      this.queuedPoseEdit = undefined;
      this.addPoseEdit('pose');
    }
  };

  onMouseDown = (e: MouseEvent) => {
    if (this.props.instance.state.mode !== this) return;
    if (e.button === 2) return;

    if (this.state.control === 'Controlled') {
      if (this.hoveredObject) {
        this.props.instance.selectedObject = this.hoveredObject;
        return;
      } else if (!this.hoveredHandle) {
        this.canDeselect = true;
        return;
      }
      this.handle = this.hoveredHandle;
    } else {
      if (!this.hoveredObject || !this.props.instance.activeCam) return;
      this.props.instance.selectedObject = this.hoveredObject;

      const posePivot = this.props.instance.selectedObject
        .getWorldPosition(new THREE.Vector3())
        .project(this.props.instance.activeCam);
      this.posePivot = new THREE.Vector2(posePivot.x, posePivot.y);
    }

    if (this.props.instance.controls) this.props.instance.controls.enabled = false;
    this.oldMousePos = new THREE.Vector2().copy(this.mousePos);
    if (this.props.instance.selectedObject)
      this.queuedPoseEdit = this.props.instance.selectedObject.position.clone();
  };

  onMouseUp = () => {
    if (this.canDeselect) this.props.instance.deselect();
    this.canDeselect = false;

    if (this.state.control === 'Simple') {
      this.props.instance.selectedObject = undefined;
    }

    if (this.props.instance.controls) this.props.instance.controls.enabled = true;
    this.oldMousePos = undefined;
    this.oldHandlePos = undefined;
    this.selectedStartMatrix = undefined;
    this.selectedStartWorldPos = undefined;
    this.posePivot = undefined;
    this.queuedPoseEdit = undefined;
    this.handle = undefined;
  };

  onContextMenu = (e: MouseEvent) => {
    if (this.props.instance.state.mode !== this) return;
    if (!this.hoveredObject) return;

    if (this.state.control === 'Controlled') {
      if (this.props.instance.selectedObject !== this.hoveredObject) return;
    }

    this.props.instance.selectedObject = this.hoveredObject;
    if (this.props.instance.controls) this.props.instance.controls.enabled = false;

    this.addPoseEdit('reset', this.state.mode.toLowerCase());

    const obj = this.props.instance.selectedObject;

    switch (this.state.mode) {
      case 'Rotation':
        obj.setRotationFromEuler(obj.userData.defaultRotation as THREE.Euler);
        break;
      case 'Position':
        obj.position.copy(obj.userData.defaultPosition as THREE.Vector3Like);
        break;
      case 'Scale':
      // obj.scale.copy(obj.userData.defaultScale as THREE.Vector3Like);
    }

    e.preventDefault();
  };

  onKeyDown = (e: KeyboardEvent) => {
    this.activeKeys[e.key] = true;
  };

  onKeyUp = (e: KeyboardEvent) => {
    delete this.activeKeys[e.key];
  };

  renderRibbon = () => {
    return (
      <SettingsRibbon
        buttonFallback={id => {
          switch (id) {
            case 'control':
            case 'mode':
            case 'space':
              this.changePoseSetting(id);
          }
        }}
        stringFallback={(id, value) => {
          if (id === 'selectedPose') this.setState({ [id]: value });
        }}
        fileFallback={(id, value, name) => {
          if (id === 'uploadPose') this.uploadPose(value, name);
        }}
        properties={[
          {
            name: 'Pose Control',
            label: this.state.control,
            id: 'control',
            type: 'button'
          },
          {
            name: 'Pose Mode',
            label: this.state.mode,
            id: 'mode',
            type: 'button'
          },
          {
            name: 'Pose Space',
            label: this.state.space,
            id: 'space',
            type: 'button'
          },
          {
            name: 'Deselect',
            id: 'deselect',
            type: 'button',
            onClick: this.props.instance.deselect
          },
          {
            name: 'Reset Pose',
            id: 'resetPose',
            type: 'button',
            onClick: this.props.instance.resetPose
          },
          {
            name: 'Selected Pose',
            id: 'selectedPose',
            unlabeled: true,
            type: 'select',
            value: this.state.selectedPose,
            options: this.state.savedPoses
          },
          {
            name: 'Load Pose',
            id: 'loadPose',
            type: 'button',
            onClick: () => this.state.selectedPose && this.loadPoseByName(this.state.selectedPose)
          },
          {
            name: 'Delete Pose',
            id: 'deletePose',
            type: 'button',
            onClick: () => this.state.selectedPose && this.deletePoseByName(this.state.selectedPose)
          },
          {
            name: 'Save New Pose',
            id: 'savePose',
            type: 'button',
            onClick: this.props.instance.savePose
          },
          {
            name: 'Download Pose',
            id: 'downloadPose',
            type: 'button',
            onClick: () => this.state.selectedPose && this.downloadPoseJson(this.state.selectedPose)
          },
          {
            name: 'Upload Pose',
            id: 'uploadPose',
            type: 'file',
            accept: 'application/json'
          }
        ]}
      />
    );
  };
}
