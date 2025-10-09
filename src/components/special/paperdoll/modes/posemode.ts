import * as THREE from 'three';
import * as Util from '@tools/util';
import * as Handles from '@components/special/paperdoll/handles';
import AbstractMode from '@components/special/paperdoll/modes/abstractmode';

export type PoseEntry = {
  rotation?: THREE.EulerTuple;
  position?: THREE.Vector3Tuple;
  scale?: THREE.Vector3Tuple;
};

export default class PoseMode extends AbstractMode {
  activeKeys: Record<string, true> = {};
  mousePos = new THREE.Vector2(1, 1);
  oldMousePos?: THREE.Vector2;
  canDeselect = false;

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

  init = (canvas: HTMLCanvasElement) => {
    this.createHandles();
    this.addEvents(canvas);
  };

  dispose = (canvas: HTMLCanvasElement) => {
    this.removeEvents(canvas);
  };

  onSavedPosesUpdated = (savedPoses: string[]) => {
    this.instance.setState({ savedPoses: savedPoses });
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

  createHandles = () => {
    this.handles.clear();

    this.handles.add(Handles.createRotationHandles());
    this.handles.add(Handles.createPositionHandles());
    this.handles.add(Handles.createScaleHandles());
  };

  poseRotation = () => {
    if (!this.oldMousePos || !this.selectedObject?.parent) return;

    if (this.instance.state.poseSettings.control === 'Controlled') {
      if (!this.handle) return;

      const localRotation = this.selectedObject.getWorldQuaternion(new THREE.Quaternion());
      const worldPivotPos = this.selectedObject.getWorldPosition(new THREE.Vector3());
      const norm = (this.handle.userData.normal as THREE.Vector3).clone();
      if (this.instance.state.poseSettings.space === 'Local') norm.applyQuaternion(localRotation);

      const camMult = this.instance.activeCam instanceof THREE.OrthographicCamera ? -1 : 1;
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
        this.instance.state.poseSettings.space === 'Global'
          ? norm.applyQuaternion(localRotation.invert())
          : (this.handle.userData.normal as THREE.Vector3),
        angle
      );

      this.selectedObject.setRotationFromQuaternion(
        new THREE.Quaternion().setFromRotationMatrix(this.selectedStartMatrix).multiply(rotation)
      );
    } else if (this.instance.activeCam && this.posePivot) {
      // Simple mode
      const axis = this.instance.activeCam.getWorldDirection(new THREE.Vector3());

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

    if (this.instance.state.poseSettings.control === 'Controlled') {
      if (!this.handle) return;

      this.selectedStartMatrix ??= this.selectedObject.matrix.clone();
      this.selectedStartWorldPos ??= this.selectedObject.getWorldPosition(new THREE.Vector3());

      const worldQuat = this.selectedObject.getWorldQuaternion(new THREE.Quaternion());
      const norm = (this.handle.userData.normal as THREE.Vector3).clone();
      if (this.instance.state.poseSettings.space === 'Local') norm.applyQuaternion(worldQuat);

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
          if (this.instance.state.poseSettings.space === 'Local') {
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

  poseScale = () => {
    if (!this.oldMousePos || !this.selectedObject?.parent) return;

    const clipZ = this.getClipZ(this.selectedObject);
    const camMult = Math.sign(clipZ);

    if (this.instance.state.poseSettings.control === 'Controlled') {
      if (!this.handle) return;

      this.selectedStartMatrix ??= this.selectedObject.matrix.clone();
      this.selectedStartWorldPos ??= this.selectedObject.getWorldPosition(new THREE.Vector3());

      const worldQuat = this.selectedObject.getWorldQuaternion(new THREE.Quaternion());
      const norm = (this.handle.userData.normal as THREE.Vector3).clone();
      if (this.instance.state.poseSettings.space === 'Local') norm.applyQuaternion(worldQuat);

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
          if (this.instance.state.poseSettings.space === 'Local') {
            change.applyQuaternion(worldQuat.clone().invert());
            change.round();
            change.applyQuaternion(worldQuat);
          } else change.round();
        }
      }
      change.add(this.selectedObject.parent.getWorldPosition(new THREE.Vector3()));
      this.selectedObject.parent.worldToLocal(change);

      for (const part of this.findScaleableDescendants(this.selectedObject)) {
        const shape = part.userData.defaultShape as THREE.Vector3;
        const partChange = shape.clone().add(change).divide(shape);
        part.scale.copy(partChange);
      }
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
    if (
      !this.instance.activeCam ||
      !this.instance.selectedOutlinePass ||
      !this.instance.hoveredOutlinePass
    )
      return;

    this.instance.raycaster.setFromCamera(this.mousePos, this.instance.activeCam);
    this.hoveredHandle = undefined;

    if (this.selectedObject) {
      if (this.instance.state.poseSettings.control === 'Controlled') {
        if (!this.handles) return;

        const rotationHandles = this.handles.getObjectByName('rotationHandles');
        const positionHandles = this.handles.getObjectByName('positionHandles');
        const scaleHandles = this.handles.getObjectByName('scaleHandles');
        if (!rotationHandles || !positionHandles || !scaleHandles) return;

        rotationHandles.visible = false;
        positionHandles.visible = false;
        scaleHandles.visible = false;

        let activeHandles: THREE.Object3D;
        switch (this.instance.state.poseSettings.mode) {
          case 'Rotation':
            activeHandles = rotationHandles;
            break;
          case 'Position':
            activeHandles = positionHandles;
            break;
          case 'Scale':
            activeHandles = scaleHandles;
            break;
        }
        activeHandles.visible = true;

        if (this.instance.state.poseSettings.space === 'Global') {
          this.handles.position.copy(this.selectedObject.getWorldPosition(new THREE.Vector3()));
          this.instance.scene.add(this.handles);
        } else {
          this.handles.position.copy(new THREE.Vector3());
          this.selectedObject.add(this.handles);
        }

        if (!this.handle) {
          const handleIntersects = this.instance.raycaster.intersectObject(activeHandles, true);
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

        switch (this.instance.state.poseSettings.mode) {
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

      this.instance.selectedOutlinePass.selectedObjects = this.filterOutline(this.selectedObject);
    } else {
      this.instance.selectedOutlinePass.selectedObjects = [];
      this.handles.removeFromParent();
    }

    this.hoveredObject = undefined;
    this.instance.hoveredOutlinePass.selectedObjects = [];

    if (
      !this.hoveredHandle &&
      !this.handle &&
      !(this.selectedObject && this.instance.state.poseSettings.control === 'Simple')
    ) {
      const intersects = this.instance.raycaster.intersectObject(this.instance.doll.root, true);
      const poseable =
        intersects.length > 0 ? this.findPosableAncestor(intersects[0].object) : false;

      if (poseable) {
        this.hoveredObject = poseable;
        if (poseable !== this.selectedObject)
          this.instance.hoveredOutlinePass.selectedObjects = this.filterOutline(poseable);
      }
    }
  };

  findPosableAncestor: (part: THREE.Object3D) => THREE.Object3D | false = part => {
    if (part.userData.poseable) return part;
    if (part.parent) return this.findPosableAncestor(part.parent);
    return false;
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
    if (!this.instance.activeCam) return 0;
    return part.getWorldPosition(new THREE.Vector3()).project(this.instance.activeCam).z;
  };

  clipToWorldSpace = (position: THREE.Vector2, clipZ: number) => {
    if (!this.instance.activeCam) return new THREE.Vector3();
    return new THREE.Vector3(position.x, position.y, clipZ).unproject(this.instance.activeCam);
  };

  resetPose = () => {
    for (const pivot of Object.values(this.instance.doll.pivots)) {
      pivot.setRotationFromEuler(pivot.userData.defaultRotation as THREE.Euler);
      pivot.position.copy(pivot.userData.defaultPosition as THREE.Vector3Like);
      // pivot.scale.copy(pivot.userData.defaultScale as THREE.Vector3Like);
    }
  };

  savePose = () => {
    for (const pivot of Object.values(this.instance.doll.pivots)) {
      if (!pivot.rotation.equals(pivot.userData.defaultRotation as THREE.Euler))
        pivot.userData.savedRotation = pivot.rotation.clone();
      if (!pivot.position.equals(pivot.userData.defaultPosition as THREE.Vector3Like))
        pivot.userData.savedPosition = pivot.position.clone();
      // if (!pivot.scale.equals(pivot.userData.defaultScale as THREE.Vector3Like))
      //   pivot.userData.savedScale = pivot.scale.clone();
    }
  };

  loadPose = () => {
    for (const pivot of Object.values(this.instance.doll.pivots)) {
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
    for (const pivot of Object.values(this.instance.doll.pivots)) {
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

    for (const [name, pivot] of Object.entries(this.instance.doll.pivots)) {
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
    this.resetPose();

    for (const [name, transform] of Object.entries(poseJson)) {
      const pivot = this.instance.doll.pivots[name];
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
    if (!this.selectedObject) return;

    const obj = this.selectedObject;

    const start = new THREE.Object3D();
    start.setRotationFromEuler(obj.rotation);
    start.position.copy(obj.position);

    suffix = suffix === undefined ? '' : ' ' + suffix;

    this.instance.props.addEdit(prefix + ' ' + obj.name + suffix, () => this.poseUndo(obj, start));
  };

  onMouseMove = (e: MouseEvent) => {
    if (this.canDeselect) this.canDeselect = false;

    if (
      !this.instance.state.pose ||
      !this.instance.canvasRef.current?.parentNode ||
      !(this.instance.canvasRef.current.parentNode instanceof Element)
    )
      return;

    const width = this.instance.canvasRef.current.parentNode.clientWidth;
    const height = this.instance.canvasRef.current.parentNode.clientHeight;

    this.mousePos.x = (e.offsetX / width) * 2 - 1;
    this.mousePos.y = (e.offsetY / height) * -2 + 1;

    if (this.queuedPoseEdit) {
      this.queuedPoseEdit = undefined;
      this.addPoseEdit('pose');
    }
  };

  onMouseDown = (e: MouseEvent) => {
    if (!this.instance.state.pose) return;
    if (e.button === 2) return;

    if (this.instance.state.poseSettings.control === 'Controlled') {
      if (this.hoveredObject) {
        this.selectedObject = this.hoveredObject;
        return;
      } else if (!this.hoveredHandle) {
        this.canDeselect = true;
        return;
      }
      this.handle = this.hoveredHandle;
    } else {
      if (!this.hoveredObject || !this.instance.activeCam) return;
      this.selectedObject = this.hoveredObject;

      const posePivot = this.selectedObject
        .getWorldPosition(new THREE.Vector3())
        .project(this.instance.activeCam);
      this.posePivot = new THREE.Vector2(posePivot.x, posePivot.y);
    }

    if (this.instance.controls) this.instance.controls.enabled = false;
    this.oldMousePos = new THREE.Vector2().copy(this.mousePos);
    if (this.selectedObject) this.queuedPoseEdit = this.selectedObject.position.clone();
  };

  onMouseUp = () => {
    if (this.canDeselect) this.deselect();
    this.canDeselect = false;

    if (this.instance.state.poseSettings.control === 'Simple') {
      this.selectedObject = undefined;
    }

    if (this.instance.controls) this.instance.controls.enabled = true;
    this.oldMousePos = undefined;
    this.oldHandlePos = undefined;
    this.selectedStartMatrix = undefined;
    this.selectedStartWorldPos = undefined;
    this.posePivot = undefined;
    this.queuedPoseEdit = undefined;
    this.handle = undefined;
  };

  onContextMenu = (e: MouseEvent) => {
    if (!this.instance.state.pose) return;
    if (!this.hoveredObject) return;

    if (this.instance.state.poseSettings.control === 'Controlled') {
      if (this.selectedObject !== this.hoveredObject) return;
    }

    this.selectedObject = this.hoveredObject;
    if (this.instance.controls) this.instance.controls.enabled = false;

    this.addPoseEdit('reset', this.instance.state.poseSettings.mode.toLowerCase());

    const obj = this.selectedObject;

    switch (this.instance.state.poseSettings.mode) {
      case 'Rotation':
        obj.setRotationFromEuler(obj.userData.defaultRotation as THREE.Euler);
        break;
      case 'Position':
        obj.position.copy(obj.userData.defaultPosition as THREE.Vector3Like);
        break;
      case 'Scale':
        obj.scale.copy(obj.userData.defaultScale as THREE.Vector3Like);
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
    if (this.instance.hoveredOutlinePass) this.instance.hoveredOutlinePass.selectedObjects = [];
    if (this.instance.selectedOutlinePass) this.instance.selectedOutlinePass.selectedObjects = [];
    this.handles.removeFromParent();
  };

  maybeDeselect = (part: THREE.Object3D) => {
    if (this.selectedObject && this.selectedObject === this.findPosableAncestor(part))
      this.deselect();
  };
}
