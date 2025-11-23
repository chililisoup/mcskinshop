export type Boundary = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

const buildFaceBoundary = (
  xOffset: number,
  yOffset: number,
  x: number,
  y: number,
  w: number,
  h: number
): Boundary => ({
  x1: xOffset + x,
  y1: yOffset + y,
  x2: xOffset + x + w,
  y2: yOffset + y + h
});

const buildFaceBoundaries = (
  x: number,
  y: number,
  width: number,
  height: number,
  depth: number
) => [
  buildFaceBoundary(x, y, depth + width, depth, depth, height), // RIGHT
  buildFaceBoundary(x, y, 0, depth, depth, height), // LEFT
  buildFaceBoundary(x, y, depth, 0, width, depth), // TOP
  buildFaceBoundary(x, y, depth + width, 0, width, depth), // BOTTOM
  buildFaceBoundary(x, y, depth, depth, width, height), // FRONT
  buildFaceBoundary(x, y, depth + width + depth, depth, width, height) // BACK
];

const UNIVERSAL_PART_BOUNDARIES = {
  head: buildFaceBoundaries(0, 0, 8, 8, 8),
  headHat: buildFaceBoundaries(32, 0, 8, 8, 8),
  torso: buildFaceBoundaries(16, 16, 8, 12, 4),
  torsoHat: buildFaceBoundaries(16, 32, 8, 12, 4),
  leftLeg: buildFaceBoundaries(16, 48, 4, 12, 4),
  leftLegHat: buildFaceBoundaries(0, 48, 4, 12, 4),
  rightLeg: buildFaceBoundaries(0, 16, 4, 12, 4),
  rightLegHat: buildFaceBoundaries(0, 32, 4, 12, 4)
};
const UNIVERSAL_FACE_BOUNDARIES = Object.values(UNIVERSAL_PART_BOUNDARIES).flatMap(
  boundaries => boundaries
);

const FULL_PART_BOUNDARIES = {
  leftArm: buildFaceBoundaries(32, 48, 4, 12, 4),
  leftArmHat: buildFaceBoundaries(48, 48, 4, 12, 4),
  rightArm: buildFaceBoundaries(40, 16, 4, 12, 4),
  rightArmHat: buildFaceBoundaries(40, 32, 4, 12, 4)
};
const FULL_FACE_BOUNDARIES = Object.values(FULL_PART_BOUNDARIES).flatMap(boundaries => boundaries);

const SLIM_PART_BOUNDARIES = {
  leftArm: buildFaceBoundaries(32, 48, 3, 12, 4),
  leftArmHat: buildFaceBoundaries(48, 48, 3, 12, 4),
  rightArm: buildFaceBoundaries(40, 16, 3, 12, 4),
  rightArmHat: buildFaceBoundaries(40, 32, 3, 12, 4)
};
const SLIM_FACE_BOUNDARIES = Object.values(SLIM_PART_BOUNDARIES).flatMap(boundaries => boundaries);

export const checkBoundary = (x: number, y: number, boundary: Boundary) =>
  x >= boundary.x1 && x < boundary.x2 && y >= boundary.y1 && y < boundary.y2;

export const checkBoundarySet = (x: number, y: number, boundaries: Boundary[]) =>
  !!boundaries.find(boundary => checkBoundary(x, y, boundary));

export const getBoundaries = (x: number, y: number, slim: boolean, faceOnly: boolean) => {
  if (x < 0 || x >= 64 || y < 0 || y >= 64) return;

  if (faceOnly) {
    for (const boundary of UNIVERSAL_FACE_BOUNDARIES)
      if (checkBoundary(x, y, boundary)) return [boundary];

    for (const boundary of slim ? SLIM_FACE_BOUNDARIES : FULL_FACE_BOUNDARIES)
      if (checkBoundary(x, y, boundary)) return [boundary];
  } else {
    for (const boundaries of Object.values(UNIVERSAL_PART_BOUNDARIES))
      if (checkBoundarySet(x, y, boundaries)) return boundaries;

    for (const boundaries of Object.values(slim ? SLIM_PART_BOUNDARIES : FULL_PART_BOUNDARIES))
      if (checkBoundarySet(x, y, boundaries)) return boundaries;
  }
};
