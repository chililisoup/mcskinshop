import * as ImgMod from '@tools/imgmod';

const buildPartXMirrors = (
  width: number,
  height: number,
  depth: number,
  x1: number,
  y1: number,
  x2 = x1,
  y2 = y1
) => {
  const match = x1 === x2 && y1 === y2;
  const matchWidth = match ? width / 2 : width;
  const mirrors: ImgMod.Offset[] = [
    {
      // Front and Top
      width: matchWidth,
      height: height + depth,
      from: [x1 + depth, y1],
      to: [x2 + depth + width, y2]
    },
    {
      // Bottom
      width: matchWidth,
      height: depth,
      from: [x1 + depth + width, y1],
      to: [x2 + depth + 2 * width, y2]
    },
    {
      // Back
      width: matchWidth,
      height: height,
      from: [x1 + 2 * depth + width, y1 + depth],
      to: [x2 + 2 * (depth + width), y2 + depth]
    },
    {
      // Sides
      width: depth,
      height: height,
      from: [x1, y1 + depth],
      to: [x2 + 2 * depth + width, y2 + depth]
    }
  ];
  if (!match)
    mirrors.push({
      // Other Sides
      width: depth,
      height: height,
      to: [x1 + 2 * depth + width, y1 + depth],
      from: [x2, y2 + depth]
    });
  return mirrors;
};

const buildPartZMirror = (
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number
): ImgMod.Offset => ({
  width: width,
  height: height,
  from: [x + depth, y + depth],
  to: [x + 2 * (depth + width), y + depth]
});

const UNIVERSAL_X_MIRRORS = [
  ...buildPartXMirrors(8, 8, 8, 0, 0), // head
  ...buildPartXMirrors(8, 8, 8, 32, 0), // head hat
  ...buildPartXMirrors(8, 12, 4, 16, 16), // torso
  ...buildPartXMirrors(8, 12, 4, 16, 32), // torso hat
  ...buildPartXMirrors(4, 12, 4, 16, 48, 0, 16), // legs
  ...buildPartXMirrors(4, 12, 4, 0, 48, 0, 32) // leg hats
];

const FULL_X_MIRRORS = [
  ...buildPartXMirrors(4, 12, 4, 32, 48, 40, 16), // arms
  ...buildPartXMirrors(4, 12, 4, 48, 48, 40, 32) // arm hats
];

const SLIM_X_MIRRORS = [
  ...buildPartXMirrors(3, 12, 4, 32, 48, 40, 16), // arms
  ...buildPartXMirrors(3, 12, 4, 48, 48, 40, 32) // arm hats
];

const UNIVERSAL_Z_MIRRORS = [
  buildPartZMirror(8, 8, 8, 0, 0), // head
  buildPartZMirror(8, 8, 8, 32, 0), // head hat
  buildPartZMirror(8, 12, 4, 16, 16), // torso
  buildPartZMirror(8, 12, 4, 16, 32), // torso hat
  buildPartZMirror(4, 12, 4, 16, 48), // left leg
  buildPartZMirror(4, 12, 4, 0, 48), // left leg hat
  buildPartZMirror(4, 12, 4, 0, 16), // right leg
  buildPartZMirror(4, 12, 4, 0, 32) // right leg hat
];

const FULL_Z_MIRRORS = [
  buildPartZMirror(4, 12, 4, 32, 48), // left arm
  buildPartZMirror(4, 12, 4, 48, 48), // left arm hat
  buildPartZMirror(4, 12, 4, 40, 16), // right arm
  buildPartZMirror(4, 12, 4, 40, 32) // right arm hat
];

const SLIM_Z_MIRRORS = [
  buildPartZMirror(3, 12, 4, 32, 48), // left arm
  buildPartZMirror(3, 12, 4, 48, 48), // left arm hat
  buildPartZMirror(3, 12, 4, 40, 16), // right arm
  buildPartZMirror(3, 12, 4, 40, 32) // right arm hat
];

const drawMirror = (
  ctx: OffscreenCanvasRenderingContext2D,
  image: ImageBitmap,
  mirror: ImgMod.Offset
) => {
  ctx.drawImage(
    image,
    mirror.from[0],
    mirror.from[1],
    mirror.width,
    mirror.height,
    64 - mirror.to[0],
    mirror.to[1],
    mirror.width,
    mirror.height
  );
  ctx.drawImage(
    image,
    mirror.to[0],
    mirror.to[1],
    -mirror.width,
    mirror.height,
    64 - mirror.from[0],
    mirror.from[1],
    -mirror.width,
    mirror.height
  );
};

export const mirrorImage = (
  image: ImageBitmap,
  slim: boolean,
  mirrorX: boolean,
  mirrorZ: boolean
) => {
  if (!mirrorX && !mirrorZ) return image;

  const canvas = new OffscreenCanvas(64, 64);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  ctx.setTransform(-1, 0, 0, 1, 64, 0); // Mirror, move into frame

  if (mirrorX) {
    for (const mirror of UNIVERSAL_X_MIRRORS) drawMirror(ctx, image, mirror);
    for (const mirror of slim ? SLIM_X_MIRRORS : FULL_X_MIRRORS) drawMirror(ctx, image, mirror);

    if (mirrorZ) {
      image = canvas.transferToImageBitmap();
      ctx.resetTransform();
      ctx.drawImage(image, 0, 0);
      ctx.setTransform(-1, 0, 0, 1, 64, 0); // Mirror, move into frame, again
    }
  }

  if (mirrorZ) {
    for (const mirror of UNIVERSAL_Z_MIRRORS) drawMirror(ctx, image, mirror);
    for (const mirror of slim ? SLIM_Z_MIRRORS : FULL_Z_MIRRORS) drawMirror(ctx, image, mirror);
  }

  return canvas.transferToImageBitmap();
};
