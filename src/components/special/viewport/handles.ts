import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

export const createRotationAxisHandle = (
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

export const createAxisHandle = (
  color: THREE.ColorRepresentation,
  name: string,
  normal: number[],
  rotation: number[],
  endType: 'arrow' | 'block'
) => {
  const handleCylinder = new THREE.CylinderGeometry(0.2, 0.2, 5, 32);
  handleCylinder.translate(0, 2.5, 0);

  let handleEnd: THREE.BufferGeometry;
  switch (endType) {
    case 'arrow':
      handleEnd = new THREE.ConeGeometry(0.5, 1.5, 32);
      handleEnd.translate(0, 5.75, 0);
      break;
    case 'block':
      handleEnd = new THREE.BoxGeometry();
      handleEnd.translate(0, 5.5, 0);
      break;
  }

  const handle = new THREE.Mesh(
    BufferGeometryUtils.mergeGeometries([handleCylinder, handleEnd]),
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

export const createPlaneHandle = (
  color: THREE.ColorRepresentation,
  name: string,
  normal: number[],
  rotation: number[]
) => {
  const handle = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.5),
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

export const createCenterHandle = (color: THREE.ColorRepresentation, name: string) => {
  const handle = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.5, 3),
    new THREE.MeshBasicMaterial({
      color: color,
      depthTest: false,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    })
  );

  handle.name = name;
  handle.userData.normal = new THREE.Vector3(0, 0, 0);
  handle.renderOrder = 999;
  handle.userData.noOutline = true;

  return handle;
};

export const createRotationHandles = () => {
  const rotationHandles = new THREE.Object3D();
  rotationHandles.name = 'rotationHandles';

  const rotationAxisHandles = new THREE.Object3D();
  rotationAxisHandles.name = 'rotationAxisHandles';
  rotationAxisHandles.add(createRotationAxisHandle(0xff0000, 'x', [1, 0, 0], [0, 1, 0]));
  rotationAxisHandles.add(createRotationAxisHandle(0x00ff00, 'y', [0, 1, 0], [1, 0, 0]));
  rotationAxisHandles.add(createRotationAxisHandle(0x0000ff, 'z', [0, 0, 1], [0, 0, 0]));
  rotationHandles.add(rotationAxisHandles);

  return rotationHandles;
};

export const createPositionHandles = () => {
  const positionHandles = new THREE.Object3D();
  positionHandles.name = 'positionHandles';

  const positionAxisHandles = new THREE.Object3D();
  positionAxisHandles.name = 'positionAxisHandles';
  positionAxisHandles.add(createAxisHandle(0xff0000, 'x', [1, 0, 0], [0, 0, -1], 'arrow'));
  positionAxisHandles.add(createAxisHandle(0x00ff00, 'y', [0, 1, 0], [0, 0, 0], 'arrow'));
  positionAxisHandles.add(createAxisHandle(0x0000ff, 'z', [0, 0, 1], [1, 0, 0], 'arrow'));
  positionHandles.add(positionAxisHandles);

  const positionPlaneHandles = new THREE.Object3D();
  positionPlaneHandles.name = 'positionPlaneHandles';
  positionPlaneHandles.add(createPlaneHandle(0xff0000, 'x', [1, 0, 0], [0, 1, 0]));
  positionPlaneHandles.add(createPlaneHandle(0x00ff00, 'y', [0, 1, 0], [1, 0, -1]));
  positionPlaneHandles.add(createPlaneHandle(0x0000ff, 'z', [0, 0, 1], [0, 0, -1]));
  positionHandles.add(positionPlaneHandles);

  return positionHandles;
};

export const createScaleHandles = () => {
  const scaleHandles = new THREE.Object3D();
  scaleHandles.name = 'scaleHandles';

  const scaleAxisHandles = new THREE.Object3D();
  scaleAxisHandles.name = 'scaleAxisHandles';
  scaleAxisHandles.add(createAxisHandle(0xff0000, 'x', [1, 0, 0], [0, 0, -1], 'block'));
  scaleAxisHandles.add(createAxisHandle(0x00ff00, 'y', [0, 1, 0], [0, 0, 0], 'block'));
  scaleAxisHandles.add(createAxisHandle(0x0000ff, 'z', [0, 0, 1], [1, 0, 0], 'block'));
  scaleHandles.add(scaleAxisHandles);

  const scalePlaneHandles = new THREE.Object3D();
  scalePlaneHandles.name = 'scalePlaneHandles';
  scalePlaneHandles.add(createPlaneHandle(0xff0000, 'x', [1, 0, 0], [0, 1, 0]));
  scalePlaneHandles.add(createPlaneHandle(0x00ff00, 'y', [0, 1, 0], [1, 0, -1]));
  scalePlaneHandles.add(createPlaneHandle(0x0000ff, 'z', [0, 0, 1], [0, 0, -1]));
  scaleHandles.add(scalePlaneHandles);

  const scaleCenterHandles = new THREE.Object3D();
  scaleCenterHandles.name = 'scaleCenterHandles';
  scaleCenterHandles.add(createCenterHandle(0xffffff, 'root'));
  scaleHandles.add(scaleCenterHandles);

  return scaleHandles;
};
