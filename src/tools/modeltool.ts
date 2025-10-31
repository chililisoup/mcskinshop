import * as THREE from 'three';
import * as ImgMod from '@tools/imgmod';
import matcap from '@assets/matcap.png';

export type ModelPart = {
  poseable?: boolean;
  position?: number[];
  rotation?: number[];
  renderType?: 'cutout';
  forceOutline?: boolean;
  shape?: number[];
  uniqueMaterial?: boolean;
  textureSize?: number[];
  uv?: number[];
  uvSize?: number[];
  uvMirrored?: boolean;
  children?: ModelDefinition;
};

export type ModelDefinition = Record<string, ModelPart>;

const textureLoader = new THREE.TextureLoader();
const matcapMap = textureLoader.load(matcap, matcapMap => matcapMap);

export class Model {
  root = new THREE.Object3D();
  materials: {
    shaded: (THREE.MeshLambertMaterial | THREE.MeshMatcapMaterial)[];
    flat: (THREE.MeshLambertMaterial | THREE.MeshMatcapMaterial)[];
  } = {
    shaded: [],
    flat: []
  };
  pivots: Record<string, THREE.Object3D> = {};

  constructor(name: string, definition: ModelDefinition) {
    this.root.name = name;
    for (const [k, v] of Object.entries(definition)) this.root.add(this.eatChild(k, v));
  }

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

      part = new THREE.Mesh(geometry);
      part.userData.defaultShape = new THREE.Vector3().fromArray(child.shape);

      let shadedMat, flatMat;
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
          matcap: matcapMap
        });
      } else {
        shadedMat = new THREE.MeshLambertMaterial({
          flatShading: true
        });

        flatMat = new THREE.MeshMatcapMaterial({
          flatShading: true,
          matcap: matcapMap
        });
      }

      if (child.forceOutline) part.userData.forceOutline = true;

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

    let rotation = new THREE.Euler();
    if (child.rotation) {
      rotation = new THREE.Euler().fromArray(
        child.rotation.map(degrees => (degrees * Math.PI) / 180) as THREE.EulerTuple
      );
      part.setRotationFromEuler(rotation);
    }

    if (child.poseable) {
      part.userData.poseable = true;
      part.userData.defaultRotation = rotation;
      part.userData.defaultPosition = part.position.clone();
      this.pivots[name] = part;
    }

    part.name = name;

    return part;
  };

  setupChildItem = (name: string) => {
    const item = new THREE.Group();
    item.userData.poseable = true;
    item.userData.defaultRotation = new THREE.Euler();
    item.userData.defaultPosition = new THREE.Vector3();

    const shadedMat = new THREE.MeshLambertMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      flatShading: true,
      alphaTest: 0.001
    });
    shadedMat.userData.uniqueMaterial = true;

    const flatMat = new THREE.MeshMatcapMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      flatShading: true,
      alphaTest: 0.001,
      matcap: matcapMap
    });
    flatMat.userData.uniqueMaterial = true;

    item.userData.materialIndex = this.materials.shaded.push(shadedMat) - 1;
    this.materials.flat.push(flatMat);
    this.pivots[name] = item;
  };

  propagateShade = (part: THREE.Object3D, shade: boolean) => {
    if (part instanceof THREE.Mesh) {
      part.material =
        this.materials[shade ? 'shaded' : 'flat'][part.userData.materialIndex as number];
    }

    part.children.forEach(part => this.propagateShade(part, shade));
  };

  setupTexture = (url: string, shade: boolean) => {
    textureLoader.load(url, texture => {
      texture.magFilter = THREE.NearestFilter;

      this.materials[shade ? 'shaded' : 'flat'].forEach(mat => {
        if (mat.userData.uniqueMaterial) return;
        mat.map = texture;
        mat.needsUpdate = true;
      });
    });
  };

  updatePartTexture = (url: string, part: THREE.Object3D) => {
    textureLoader.load(url, texture => {
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

  createCuboidUVQuad = (x: number, y: number, w: number, h: number, mirrored: boolean) => {
    const mod = (mirrored ? 1 : 0) * w;
    const xErr = (w > 0 ? 1 : -1) * 0.01;
    const yErr = (h > 0 ? 1 : -1) * 0.01;

    // prettier-ignore
    return [
      [x + xErr + mod,     y + yErr],
      [x - xErr - mod + w, y + yErr],
      [x + xErr + mod,     y - yErr + h],
      [x - xErr - mod + w, y - yErr + h]
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
}

// prettier-ignore
export const buildItemModel = async (item: THREE.Object3D, url: string, extra?: string) => {
  const image = new ImgMod.Img();
  image.size = [16, 16];
  await image.loadUrl(url);
  if (!image.image)
    return Promise.reject(new Error('Item texture image does not exist! How did this happen?'));

  const canvas = new OffscreenCanvas(image.size[0], image.size[1]);
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(image.image, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const isClear = (index: number) => {
    index *= 4;
    return index < 0 || index >= data.length || data[index + 3] === 0;
  };

  const vertices: number[] = [];
  const indices: number[] = [];
  const uv: number[] = [];

  let iter = 0;
  for (let i = 0; i < data.length; i += 4) {
    const index = Math.floor(i / 4);
    const x = (index % 16) - 8;
    const y = Math.ceil(index / -16) + 8;

    if (data[i + 3] === 0) continue;

    vertices.push(
      x,     y,     -0.5, // 0
      x + 1, y,     -0.5, // 1
      x + 1, y - 1, -0.5, // 2
      x,     y - 1, -0.5, // 3

      x,     y,     0.5,  // 4
      x + 1, y,     0.5,  // 5
      x + 1, y - 1, 0.5,  // 6
      x,     y - 1, 0.5   // 7
    );

    const ind = iter * 8;
    indices.push(
      // LEFT
      ind + 0, ind + 1, ind + 2,
      ind + 2, ind + 3, ind + 0,
      // RIGHT
      ind + 4, ind + 6, ind + 5,
      ind + 6, ind + 4, ind + 7,
    );

    if (index % 16 === 15 || isClear(index + 1)) indices.push(
      // FRONT
      ind + 1, ind + 5, ind + 6,
      ind + 6, ind + 2, ind + 1
    );

    if (index % 16 === 0 || isClear(index - 1)) indices.push(
      // BACK
      ind + 0, ind + 7, ind + 4,
      ind + 7, ind + 0, ind + 3,
    );

    if (isClear(index - 16)) indices.push(
      // UP
      ind + 0, ind + 4, ind + 5,
      ind + 5, ind + 1, ind + 0
    );

    if (isClear(index + 16)) indices.push(
      // DOWN
      ind + 3, ind + 6, ind + 7,
      ind + 6, ind + 3, ind + 2
    );

    const ux = (x + 8) / 16 + 0.005;
    const uy = (y + 8) / 16 - 0.005;
    const s = 1 / 16 - 0.01;
    const pixel = [ux, uy, ux + s, uy, ux + s, uy - s, ux, uy - s];
    uv.push(...pixel, ...pixel);

    iter++;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));

  const part = new THREE.Mesh(geometry);

  if (extra === 'handheld') {
    part.setRotationFromEuler(new THREE.Euler(0, -Math.PI / 2, (55 * Math.PI) / 180));
    part.scale.set(0.85, 0.85, 0.85);
    part.position.set(0, 4, 0.5);
  } else {
    part.scale.set(0.55, 0.55, 0.55);
    part.position.set(0, 3, 1);
  }

  part.userData.defaultShape = new THREE.Vector3(16, 16, 1);
  part.userData.materialIndex = item.userData.materialIndex as number;
  part.userData.renderType = 'cutout';
  part.userData.forceOutline = true;

  return part;
};
