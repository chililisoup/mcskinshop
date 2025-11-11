import * as Util from '@tools/util';
import Codec, { PairCodec } from '@tools/codec';
import Speaker from '@tools/speaker';

type Offset = {
  width: number;
  height: number;
  from: [x: number, y: number];
  to: [x: number, y: number];
};

const HAT_FLATTENER_OFFSETS = [
  { width: 16, height: 8, from: [40, 0], to: [8, 0] },
  { width: 32, height: 8, from: [32, 8], to: [0, 8] },
  { width: 8, height: 4, from: [4, 32], to: [4, 16] },
  { width: 16, height: 4, from: [20, 32], to: [20, 16] },
  { width: 8, height: 4, from: [44, 32], to: [44, 16] },
  { width: 56, height: 12, from: [0, 36], to: [0, 20] },
  { width: 8, height: 4, from: [4, 48], to: [20, 48] },
  { width: 16, height: 12, from: [0, 52], to: [16, 52] },
  { width: 8, height: 4, from: [52, 48], to: [36, 48] },
  { width: 16, height: 12, from: [48, 52], to: [32, 52] }
] as Readonly<Offset>[];

const SLIM_STRETCH_OFFSETS = [
  // right arm base
  { width: 9, height: 16, from: [45, 16], to: [46, 16] },
  { width: 2, height: 12, from: [52, 20], to: [54, 20] },
  { width: 2, height: 4, from: [48, 16], to: [50, 16] },
  // right arm hat
  { width: 9, height: 16, from: [45, 32], to: [46, 32] },
  { width: 2, height: 12, from: [52, 36], to: [54, 36] },
  { width: 2, height: 4, from: [48, 32], to: [50, 32] },
  // left arm base
  { width: 9, height: 16, from: [37, 48], to: [38, 48] },
  { width: 2, height: 12, from: [44, 52], to: [46, 52] },
  { width: 2, height: 4, from: [40, 48], to: [42, 48] },
  // left arm hat
  { width: 9, height: 16, from: [53, 48], to: [54, 48] },
  { width: 2, height: 12, from: [60, 52], to: [62, 52] },
  { width: 2, height: 4, from: [56, 48], to: [58, 48] }
] as Readonly<Offset>[];

const FULL_SQUISH_OFFSETS = [
  // right arm base
  { height: 16, width: 1, from: [45, 16], to: [45, 16] },
  { height: 4, width: 1, from: [49, 16], to: [48, 16] },
  { height: 12, width: -1, from: [53, 20], to: [52, 20] },
  // right arm hat
  { height: 16, width: 1, from: [45, 32], to: [45, 32] },
  { height: 4, width: 1, from: [49, 32], to: [48, 32] },
  { height: 12, width: -1, from: [53, 36], to: [52, 36] },
  // left arm base
  { height: 16, width: -1, from: [37, 48], to: [37, 48] },
  { height: 4, width: -1, from: [41, 48], to: [40, 48] },
  { height: 12, width: 1, from: [45, 52], to: [44, 52] },
  // left arm hat
  { height: 16, width: -1, from: [53, 48], to: [53, 48] },
  { height: 4, width: -1, from: [57, 48], to: [56, 48] },
  { height: 12, width: 1, from: [61, 52], to: [60, 52] }
] as Readonly<Offset>[];

export const EMPTY_IMAGE_SOURCE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NgAAIAAAUAAR4f7BQAAAAASUVORK5CYII=';

// remove erase type in favor of global composite operation defs in assets
export const LAYER_TYPES = ['normal', 'erase', 'flatten', 'blowup'] as const;
export type LayerType = (typeof LAYER_TYPES)[number];
export const checkLayerType = (maybeType: string): LayerType | undefined => {
  if (LAYER_TYPES.find(type => type === maybeType)) return maybeType as LayerType;
};

export const LAYER_FORMS = [
  'universal',
  'full-squish-inner',
  'full-squish-outer',
  'full-squish-average',
  'slim-stretch',
  'full-only',
  'slim-only'
] as const;
export type LayerForm = (typeof LAYER_FORMS)[number];

export type Hsla = [hue: number, saturation: number, lightness: number, alpha: number];
export type Rgba = [red: number, green: number, blue: number, alpha: number];
export type RelativeColor = { from: number; offset: Hsla };
export type UnloadedRelativeColor = { from: number; to: string };
export type CopyColor = { copy: number };
export type Color = string | RelativeColor | CopyColor | undefined;

// https://gist.github.com/xenozauros/f6e185c8de2a04cdfecf
export const hexToHsla: (hex: string) => Hsla = hex => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.slice(0, 7));

  if (!result) return [0, 0, 0, 0];

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const a = hex.length === 9 ? parseInt(hex.slice(7), 16) / 255 : 1;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max === min)
    h = s = 0; // achromatic
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100), a];
};

// https://stackoverflow.com/a/44134328
export const hslaToHex = (hsla: Hsla) => {
  const h = hsla[0];
  const s = hsla[1];
  const l = hsla[2] / 100;
  const a = hsla[3];
  const amt = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - amt * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0'); // convert to Hex and prefix "0" if needed
  };
  return `#${f(0)}${f(8)}${f(4)}${a < 1 ? Math.round(255 * a).toString(16) : ''}`;
};

export const rgbaToHex = (rgba: Rgba, includeAlpha?: boolean) => {
  return (
    '#' +
    rgba[0].toString(16).padStart(2, '0') +
    rgba[1].toString(16).padStart(2, '0') +
    rgba[2].toString(16).padStart(2, '0') +
    (includeAlpha !== false && rgba[3] !== 255 ? rgba[3].toString(16).padStart(2, '0') : '')
  );
};

export const hslaToString = (hsla: Hsla) => `hsla(${hsla[0]},${hsla[1]}%,${hsla[2]}%,${hsla[3]})`;

export const hslToString = (hsl: Hsla) => `hsl(${hsl[0]},${hsl[1]}%,${hsl[2]}%)`;

export const getHslaOffset = (from: Hsla, to: Hsla) => {
  return [to[0] - from[0], to[1] - from[1], to[2] - from[2], to[3] - from[3]] as Hsla;
};

export const applyHslaOffset = (from: Hsla, offset: Hsla) => {
  return [
    (from[0] + offset[0]) % 360,
    Util.clamp(from[1] + offset[1], 0, 100),
    Util.clamp(from[2] + offset[2], 0, 100),
    Util.clamp(from[3] + offset[3], 0, 1)
  ] as Hsla;
};

export const colorAsRgba = (color: string) => {
  const canvas = new OffscreenCanvas(1, 1);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const rgba = ctx.getImageData(0, 0, 1, 1).data;
  return [rgba[0], rgba[1], rgba[2], rgba[3]] as Rgba;
};

export const colorAsHex = (color: string) => rgbaToHex(colorAsRgba(color));

export const colorAsHsla = (color: string) => hexToHsla(colorAsHex(color));

export const cssVariableColor = (variable: string) => colorAsRgba(Util.getCssVariable(variable));

export const invertRgba = (rgba: Rgba) =>
  [255 - rgba[0], 255 - rgba[1], 255 - rgba[2], rgba[3]] as Rgba;

export type Filter = {
  opacity?: number;
  hue?: number;
  saturation?: number;
  brightness?: number;
  contrast?: number;
  invert?: number;
  sepia?: number;
};

export const DEFAULT_FILTER = {
  opacity: 100,
  hue: 0,
  saturation: 100,
  brightness: 100,
  contrast: 100,
  invert: 0,
  sepia: 0
} as const;

type SerializedAbstractLayer = {
  filterInternal: Filter;
  active: boolean;
  name?: string;
};

export abstract class AbstractLayer {
  static codec<TType extends AbstractLayer, SSerialized>(
    serialize: (instance: TType) => Promise<SSerialized>,
    deserialize: (data: SSerialized) => Promise<TType>
  ): Codec<TType, SSerialized & SerializedAbstractLayer> {
    const serializer: (
      instance: TType
    ) => Promise<SSerialized & SerializedAbstractLayer> = async instance => {
      const base: SerializedAbstractLayer = {
        filterInternal: instance.filterInternal,
        active: instance.active,
        name: instance.name
      };

      return {
        ...(await serialize(instance)),
        ...base
      };
    };

    const deserializer: (
      data: SSerialized & SerializedAbstractLayer
    ) => Promise<TType> = async data => {
      const instance = await deserialize(data);

      instance.filterInternal = data.filterInternal;
      instance.filterStringInternal = instance.makeFilterString();
      instance.active = data.active;
      instance.name = data.name;

      return instance;
    };

    return Codec.of(serializer, deserializer);
  }

  abstract getCodec: () => PairCodec<keyof typeof CODECS, AbstractLayer, SerializedAbstractLayer>;

  private filterInternal: Filter;
  private filterStringInternal: string;
  id: string;
  active = true;
  src = EMPTY_IMAGE_SOURCE;
  image?: ImageBitmap;
  name?: string;
  changed = true;
  parent?: Layer;

  constructor(filter?: Filter) {
    this.filterInternal = filter ?? {};
    this.filterStringInternal = this.makeFilterString();
    this.id = Util.randomKey();
  }

  filter = (filter?: Filter) => {
    if (filter !== undefined) {
      this.filterInternal = filter;
      this.filterStringInternal = this.makeFilterString();
      this.markChanged();
    }
    return this.filterStringInternal;
  };

  makeFilterString = (filter = this.filterInternal) => {
    if (Util.isEmpty(filter)) return 'none';

    const strings = [];

    if (filter.opacity !== undefined) strings.push(`opacity(${filter.opacity}%)`);
    if (filter.saturation !== undefined) strings.push(`saturate(${filter.saturation}%)`);
    if (filter.brightness !== undefined) strings.push(`brightness(${filter.brightness}%)`);
    if (filter.contrast !== undefined) strings.push(`contrast(${filter.contrast}%)`);

    if (filter.hue) strings.push(`hue-rotate(${filter.hue}deg)`);
    if (filter.invert) strings.push(`invert(${filter.invert}%)`);
    if (filter.sepia) strings.push(`sepia(${filter.sepia}%)`);

    return strings.join(' ');
  };

  copyFilter = (): Filter => ({ ...this.filterInternal });

  static defaultFilter = (filter: Filter): Required<Filter> =>
    Object.assign({ ...DEFAULT_FILTER }, filter);

  filterFilter = (filter: Filter) => {
    const filtered = AbstractLayer.defaultFilter(this.filterInternal);

    if (filter.opacity !== undefined) filtered.opacity *= filter.opacity / 100;
    if (filter.hue !== undefined) filtered.hue = (filter.hue + filtered.hue) % 360;
    if (filter.saturation !== undefined) filtered.saturation *= filter.saturation / 100;
    if (filter.brightness !== undefined) filtered.brightness *= filter.brightness / 100;
    if (filter.contrast !== undefined) filtered.contrast *= filter.contrast / 100;
    if (filter.invert !== undefined)
      filtered.invert = Math.abs(100 - (Math.abs(filter.invert + filtered.invert - 100) % 200));
    if (filter.sepia !== undefined) filtered.sepia += filter.sepia;

    return filtered;
  };

  markChanged() {
    this.changed = true;
    if (this.parent) this.parent.markChanged();
  }

  abstract render: () => Promise<CanvasImageSource> | void;

  abstract copy: () => Promise<AbstractLayer>;

  abstract cleanup: () => void;
}

type SerializedImg = {
  blendInternal: GlobalCompositeOperation;
  typeInternal: LayerType;
  formInternal: LayerForm;
  linearOpacity: boolean;
  size: [w: number, h: number];
  rawSrc?: string;
};
export class Img extends AbstractLayer {
  static CODEC: Codec<Img, SerializedImg & SerializedAbstractLayer> = this.codec(
    async img => {
      return {
        blendInternal: img.blendInternal,
        typeInternal: img.typeInternal,
        formInternal: img.formInternal,
        linearOpacity: img.linearOpacity,
        size: img.size,
        rawSrc: await img.getImageBlobSrc(img.rawImage)
      };
    },
    async data => {
      const img = new Img(data.typeInternal, data.formInternal, data.blendInternal);
      img.linearOpacity = data.linearOpacity;
      if (data.rawSrc) await img.loadUrl(URL.createObjectURL(await Util.getBlob(data.rawSrc)));
      return img;
    }
  );

  getCodec = () => PairCodec.of('Img', Img.CODEC);

  private blendInternal: GlobalCompositeOperation;
  private typeInternal;
  private formInternal;
  // rawSrc contains uncolored image data,
  // so going to 0% opacity and back doesnt break anything
  rawImage?: ImageBitmap;
  size: [w: number, h: number] = [64, 64];
  dynamic = false;
  linearOpacity = false;
  fileHandle?: FileSystemFileHandle;
  observer?: FileSystemObserver;
  internalUpdateCallback?: () => void;

  constructor(
    type?: LayerType,
    form?: LayerForm,
    blend?: GlobalCompositeOperation,
    filter?: Filter
  ) {
    super(filter);

    this.blendInternal = blend ?? 'source-over';
    this.typeInternal = type ?? 'normal';
    this.formInternal = form ?? 'universal';
  }

  blend = (blend?: GlobalCompositeOperation) => {
    if (blend !== undefined) {
      this.blendInternal = blend;
      this.markChanged();
    }
    return this.blendInternal;
  };

  type = (type?: LayerType) => {
    if (type !== undefined) {
      this.typeInternal = type;
      this.markChanged();
    }
    return this.typeInternal;
  };

  form = (form?: LayerForm) => {
    if (form !== undefined) {
      this.formInternal = form;
      this.markChanged();
    }
    return this.formInternal;
  };

  loadImage = async (image: ImageBitmapSource, detectResolution = false) => {
    const result = await createImageBitmap(image);
    if (detectResolution) {
      this.size = [result.width, result.height];
    }

    const canvas = new OffscreenCanvas(this.size[0], this.size[1]);
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(result, 0, 0);

    if (result.height === 32 && this.size[1] === 64) {
      ctx.setTransform(-1, 0, 0, 1, 64, 0); // Mirror, move into frame

      ctx.drawImage(result, 44, 16, 4, 4, 24, 48, 4, 4); // Arm top
      ctx.drawImage(result, 48, 16, 4, 4, 20, 48, 4, 4); // Arm bottom
      ctx.drawImage(result, 40, 20, 12, 12, 20, 52, 12, 12); // Arm front/sides
      ctx.drawImage(result, 52, 20, 4, 12, 16, 52, 4, 12); // Arm back

      ctx.drawImage(result, 4, 16, 4, 4, 40, 48, 4, 4); // Leg top
      ctx.drawImage(result, 8, 16, 4, 4, 36, 48, 4, 4); // Leg bottom
      ctx.drawImage(result, 0, 20, 12, 12, 36, 52, 12, 12); // Leg front/sides
      ctx.drawImage(result, 12, 20, 4, 12, 32, 52, 4, 12); // Leg back
    } else if (
      result.width === 16 &&
      this.size[0] === 64 &&
      result.height === 16 &&
      this.size[1] === 64
    ) {
      const pattern = ctx.createPattern(result, 'repeat');
      if (pattern) {
        ctx.clearRect(0, 0, 64, 64);
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, 64, 64);
      }
    }

    this.src = URL.createObjectURL(await canvas.convertToBlob());
    this.rawImage = canvas.transferToImageBitmap();
    this.image = await createImageBitmap(this.rawImage);
    this.markChanged();
  };

  loadUrl = (url: string, detectResolution = false) =>
    new Promise<void>((resolve, reject) => {
      const image = new Image();

      image.onerror = reject;
      image.onload = () => this.loadImage(image, detectResolution).then(resolve);

      image.crossOrigin = 'anonymous';
      image.src = url;
    });

  render = (
    slim = false,
    ctx?: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    loCtx?: OffscreenCanvasRenderingContext2D,
    parentFilter?: Filter
  ) => {
    this.changed = false;
    if (!this.image) return;

    if (!ctx) {
      const canvas = new OffscreenCanvas(64, 64);
      ctx = canvas.getContext('2d')!;
    }

    const type = this.type();
    if (type === 'flatten' || type === 'blowup') {
      this.flatten(ctx, this.image, type === 'blowup');
      return;
    }

    const filter = parentFilter
      ? this.makeFilterString(this.filterFilter(parentFilter))
      : this.filter();

    ctx.filter = filter;
    if (type === 'erase') ctx.globalCompositeOperation = 'destination-out';
    else ctx.globalCompositeOperation = this.blend();

    const image = this.applyForm(slim);
    if (!image) return;

    if (this.linearOpacity && loCtx) {
      const imageData = this.getImageData(image);
      if (!imageData) return;
      const data = imageData.data;

      const loImageData = loCtx.getImageData(0, 0, this.size[0], this.size[1]);
      const loData = loImageData.data;
      for (let i = 0; i < loData.length; i += 4) {
        if (loData[i + 3] === 0) {
          loData[i] = data[i];
          loData[i + 1] = data[i + 1];
          loData[i + 2] = data[i + 2];
          loData[i + 3] = data[i + 3];
          continue;
        }

        if (data[i + 3] === 0) continue;

        const mix = loData[i + 3] / (loData[i + 3] + data[i + 3]);
        const invMix = 1 - mix;

        loData[i] = loData[i] * mix + data[i] * invMix;
        loData[i + 1] = loData[i + 1] * mix + data[i + 1] * invMix;
        loData[i + 2] = loData[i + 2] * mix + data[i + 2] * invMix;
        loData[i + 3] += data[i + 3];
      }

      loCtx.putImageData(loImageData, 0, 0);

      return;
    }

    ctx.drawImage(image, 0, 0);
  };

  copy = async () => {
    const copy = new Img(this.type(), this.form(), this.blend(), this.copyFilter());
    copy.src = this.src;
    copy.rawImage = this.rawImage ? await createImageBitmap(this.rawImage) : undefined;
    copy.image = this.image ? await createImageBitmap(this.image) : undefined;
    copy.name = this.name;
    copy.size = [this.size[0], this.size[1]];
    copy.linearOpacity = this.linearOpacity;
    copy.form = this.form;

    return copy;
  };

  color = async (color: string) => {
    if (!this.rawImage) return;

    const canvas = new OffscreenCanvas(this.size[0], this.size[1]);
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(this.rawImage, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.size[0], this.size[1]);

    this.src = URL.createObjectURL(await canvas.convertToBlob());
    this.image = canvas.transferToImageBitmap();

    this.markChanged();
  };

  convertGrayscaleMask = async () => {
    if (!this.image) return Promise.reject(new Error('No mask to convert'));

    const canvas = new OffscreenCanvas(this.size[0], this.size[1]);
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(this.image, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i + 3] = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
    }

    ctx.putImageData(imageData, 0, 0);

    this.src = URL.createObjectURL(await canvas.convertToBlob());
    this.rawImage = canvas.transferToImageBitmap();
    this.image = await createImageBitmap(this.rawImage);
    this.markChanged();
  };

  gradientMask = async (peak: number, length: number) => {
    if (!this.image) return Promise.reject(new Error('No image to mask'));

    const canvas = new OffscreenCanvas(this.size[0], this.size[1]);
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(this.image, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = 1 - (data[i] + data[i + 1] + data[i + 2]) / 765; // 255 * 3
      const amt = Math.max(1 - Math.abs(avg - peak) * length, 0);
      data[i + 3] *= amt;
    }

    ctx.putImageData(imageData, 0, 0);

    this.src = URL.createObjectURL(await canvas.convertToBlob());
    this.rawImage = canvas.transferToImageBitmap();
    this.image = await createImageBitmap(this.rawImage);
    this.markChanged();
  };

  flatten = (
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    mask: CanvasImageSource,
    reverse?: boolean
  ) => {
    const canvas = new OffscreenCanvas(ctx.canvas.width, ctx.canvas.height);
    const context = canvas.getContext('2d')!;

    context.drawImage(ctx.canvas, 0, 0);
    context.globalCompositeOperation = 'destination-in';
    context.drawImage(mask, 0, 0); // apply mask

    if (reverse) ctx.globalCompositeOperation = 'destination-over';
    const from = reverse ? 'to' : 'from';
    const to = reverse ? 'from' : 'to';

    HAT_FLATTENER_OFFSETS.forEach(offset =>
      ctx.drawImage(
        canvas, // draw pixels from masked canvas
        offset[from][0],
        offset[from][1],
        offset.width,
        offset.height,
        offset[to][0],
        offset[to][1],
        offset.width,
        offset.height
      )
    );

    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(mask, 0, 0);
  };

  applyForm = (slim: boolean) => {
    if (!this.image) return;

    const form = this.form();
    if (form === 'universal') return this.image;

    const canvas = new OffscreenCanvas(this.size[0], this.size[1]);
    const ctx = canvas.getContext('2d')!;

    if (form === 'full-only' || form === 'slim-only') {
      if ((form === 'full-only' && !slim) || (form === 'slim-only' && slim)) {
        ctx.drawImage(this.image, 0, 0);
        return canvas.transferToImageBitmap();
      }

      return canvas.transferToImageBitmap();
    }

    ctx.drawImage(this.image, 0, 0);

    const reverse = form !== 'slim-stretch';

    if (reverse === slim) {
      const from = reverse ? 'to' : 'from';
      const to = reverse ? 'from' : 'to';

      SLIM_STRETCH_OFFSETS.forEach(offset => {
        ctx.clearRect(offset[to][0], offset[to][1], offset.width, offset.height);
        ctx.drawImage(
          this.image!,
          offset[from][0],
          offset[from][1],
          offset.width,
          offset.height,
          offset[to][0],
          offset[to][1],
          offset.width,
          offset.height
        );
      });

      if (reverse) {
        ctx.clearRect(50, 16, 2, 4);
        ctx.clearRect(54, 20, 2, 12);
        ctx.clearRect(50, 32, 2, 4);
        ctx.clearRect(54, 36, 2, 12);
        ctx.clearRect(42, 48, 2, 4);
        ctx.clearRect(46, 52, 2, 12);
        ctx.clearRect(58, 48, 2, 4);
        ctx.clearRect(62, 52, 2, 12);

        const width = form === 'full-squish-average' ? 2 : 1;
        const move = form === 'full-squish-inner' ? 1 : -1;

        FULL_SQUISH_OFFSETS.forEach(offset => {
          ctx.clearRect(offset.to[0], offset.to[1], 1, offset.height);
          ctx.drawImage(
            this.image!,
            offset.from[0] + (move * offset.width + 1) * 0.5 * (2 - width),
            offset.from[1],
            width,
            offset.height,
            offset.to[0],
            offset.to[1],
            1,
            offset.height
          );
        });
      }
    }

    return canvas.transferToImageBitmap();
  };

  getImageData = (image?: ImageBitmap) => {
    image = image ?? this.image;
    if (!image) return;

    const canvas = new OffscreenCanvas(this.size[0], this.size[1]);
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, this.size[0], this.size[1]);
  };

  getImageBlobSrc = async (image?: ImageBitmap) => {
    image = image ?? this.image;
    if (!image) return;

    const canvas = new OffscreenCanvas(this.size[0], this.size[1]);
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(image, 0, 0);
    const blob = await canvas.convertToBlob();

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = reject;
      reader.onloadend = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('Invalid result from blob'));
      };
      reader.readAsDataURL(blob);
    });
  };

  detectSlimModel = () => {
    if (!this.image) return false;

    const canvas = new OffscreenCanvas(this.size[0], this.size[1]);
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(this.image, 0, 0);
    return !ctx.getImageData(46, 63, 1, 1).data[3];
  };

  onDynamicChange: (records: FileSystemChangeRecord[], observer: FileSystemObserver) => void =
    async (records, observer) => {
      let fileHandle: FileSystemFileHandle;

      for (const record of records) {
        if (record.type !== 'modified') break;
        fileHandle = record.root;

        const file = await fileHandle.getFile();

        await this.loadUrl(URL.createObjectURL(file));
        if (this.internalUpdateCallback) this.internalUpdateCallback();

        return;
      }

      this.dynamic = false;
      this.fileHandle = undefined;
      observer.disconnect();
    };

  observeDynamic: (fileHandle: FileSystemFileHandle) => void = async fileHandle => {
    this.dynamic = true;
    this.observer = new window.FileSystemObserver(this.onDynamicChange);
    await this.observer.observe(fileHandle);
  };

  cleanup = () => {
    if (this.observer) {
      this.fileHandle = undefined;
      this.observer.disconnect();
    }
    // if (this.image) this.image.close();
    // if (this.rawImage) this.rawImage.close();
  };
}

export class ImgPreview extends Img {
  base;

  constructor(base: Img, parent: Layer) {
    super();

    this.base = base;
    this.parent = parent;
  }

  type = () => this.base.type();
  form = () => this.base.form();
  blend = () => this.base.blend();
  filter = () => this.base.filter();
}

type SerializedLayer = {
  sublayers: [key: keyof typeof CODECS, data: SerializedAbstractLayer][];
  colors: Color[];
  advanced?: boolean[];
};
export type FullSerializedLayer = SerializedLayer & SerializedAbstractLayer;
export class Layer extends AbstractLayer {
  static CODEC: Codec<Layer, FullSerializedLayer> = this.codec(
    async layer => {
      return {
        sublayers: await Promise.all(
          layer.sublayers
            .filter(sublayer => !(sublayer instanceof ImgPreview))
            .map(sublayer => sublayer.getCodec().serialize(sublayer))
        ),
        colors: [...layer.colors],
        advanced: layer.advanced ? [...layer.advanced] : undefined
      };
    },
    async data => {
      const layer = new Layer(
        await Promise.all(
          data.sublayers.map(sublayer => CODECS[sublayer[0]].deserialize(sublayer[1]))
        ),
        data.colors
      );
      layer.advanced = data.advanced;
      return layer;
    }
  );

  getCodec = () => PairCodec.of('Layer', Layer.CODEC);

  private sublayers;
  private colors: Color[];
  advanced?: boolean[];

  constructor(
    sublayers?: AbstractLayer[],
    colors?: (Color | UnloadedRelativeColor)[],
    filter?: Filter
  ) {
    super(filter);

    this.sublayers = sublayers ?? [];
    this.sublayers.forEach(layer => {
      layer.parent = this;
    });

    this.colors =
      colors && colors.length === this.sublayers.length
        ? colors.map(color => {
            if (color === null || color === undefined) return undefined;
            if (typeof color !== 'object') return color;
            if (!('to' in color)) return color;

            const from: unknown = colors[color.from];
            if (typeof from !== 'string') return;
            return {
              from: color.from,
              offset: getHslaOffset(colorAsHsla(from), colorAsHsla(color.to))
            };
          })
        : (new Array(this.sublayers.length).fill(undefined) as undefined[]);
  }

  getLayers = () => this.sublayers as readonly AbstractLayer[];

  getLayer = (index: number) => this.sublayers[index];

  addLayer = (layer: AbstractLayer, color?: Color) => {
    this.sublayers.push(layer);
    this.colors.push(color);

    layer.parent = this;

    this.markChanged();
  };

  addLayers = (layers: AbstractLayer[], colors?: Color[]) => {
    if (!colors || colors.length !== layers.length)
      colors = new Array(layers.length).fill(undefined);

    this.sublayers.push(...layers);
    this.colors.push(...colors);

    layers.forEach(layer => {
      layer.parent = this;
    });

    this.markChanged();
  };

  // TODO:
  // Update linked color indices
  insertLayer = (index: number, layer: AbstractLayer, color?: Color) => {
    if (index + 1 < this.sublayers.length && this.sublayers[index + 1] instanceof ImgPreview)
      index++;

    this.sublayers.splice(index, 0, layer);
    this.colors.splice(index, 0, color);

    layer.parent = this;

    this.markChanged();
  };

  // TODO:
  // Same as above
  insertLayers = (index: number, layers: AbstractLayer[], colors?: Color[]) => {
    if (index + 1 < this.sublayers.length && this.sublayers[index + 1] instanceof ImgPreview)
      index++;

    if (!colors || colors.length !== layers.length)
      colors = new Array(layers.length).fill(undefined);

    this.sublayers.splice(index, 0, ...layers);
    this.colors.splice(index, 0, ...colors);

    layers.forEach(layer => {
      layer.parent = this;
    });

    this.markChanged();
  };

  replaceLayer = (index: number, layers: AbstractLayer | AbstractLayer[]) => {
    this.sublayers[index].parent = undefined;
    this.sublayers[index].cleanup();

    if (index + 1 < this.sublayers.length && this.sublayers[index + 1] instanceof ImgPreview)
      this.removeLayer(index + 1);

    if (Array.isArray(layers)) {
      this.sublayers.splice(index, 1, ...layers);
      this.colors.splice(index, 1, ...(new Array(layers.length).fill(undefined) as undefined[]));

      layers.forEach(layer => {
        layer.parent = this;
      });
    } else {
      this.sublayers.splice(index, 1, layers);
      this.colors.splice(index, 1, undefined);

      layers.parent = this;
    }

    this.markChanged();
  };

  moveLayer = (index: number, change: number) => {
    if (index + change < 0) change = this.sublayers.length - 1;
    if (index + change >= this.sublayers.length) change = 0 - (this.sublayers.length - 1);

    const previewIndex = this.sublayers.findIndex(layer => layer instanceof ImgPreview);
    const preview: ImgPreview | undefined =
      previewIndex >= 0 ? (this.sublayers[previewIndex] as ImgPreview) : undefined;
    if (preview) this.removeLayer(previewIndex, false);

    const layer = this.sublayers[index];
    this.sublayers.splice(index, 1);
    this.sublayers.splice(index + change, 0, layer);

    const color = this.colors[index];
    this.colors.splice(index, 1);
    this.colors.splice(index + change, 0, color);

    if (preview) {
      const baseIndex = this.sublayers.indexOf(preview.base);
      if (baseIndex >= 0) this.insertLayer(baseIndex + 1, preview);
    } else this.markChanged();
  };

  duplicateLayer = async (index: number) => {
    const layer = await this.sublayers[index].copy();
    this.sublayers.splice(index, 0, layer);
    const color = this.colors[index];
    this.colors.splice(index, 0, color);

    layer.parent = this;
    this.markChanged();

    return layer;
  };

  removeLayer = (index: number, cleanup?: boolean) => {
    this.sublayers[index].parent = undefined;
    if (cleanup ?? true) this.sublayers[index].cleanup();

    this.sublayers.splice(index, 1);
    this.colors.splice(index, 1);

    this.markChanged();
  };

  flattenLayer = async (index: number, slim = false) => {
    const baseLayer = this.sublayers[index];

    const flatLayer = new Img();
    flatLayer.name = baseLayer.name;

    await baseLayer.render();
    if (baseLayer instanceof Img) {
      const image = baseLayer.applyForm(slim);
      if (image) await flatLayer.loadImage(image);
    } else await flatLayer.loadUrl(baseLayer.src);

    this.replaceLayer(index, flatLayer);
  };

  mergeLayers = (topIndex: number, bottomIndex: number) => {
    if (this.sublayers.length < 2) return;

    const topLayer = this.sublayers[topIndex];
    const bottomLayer = this.sublayers[bottomIndex];

    const mergedLayer = new Layer();
    mergedLayer.name = bottomLayer.name + ' + ' + topLayer.name;

    if (bottomLayer instanceof Layer)
      mergedLayer.addLayers(bottomLayer.sublayers, bottomLayer.colors);
    else mergedLayer.addLayer(bottomLayer);

    if (topLayer instanceof Layer) {
      const length = mergedLayer.sublayers.length;
      const topColors = topLayer.colors.map(color => {
        if (typeof color !== 'object') return color;
        const newColor: RelativeColor | CopyColor =
          'from' in color
            ? {
                from: color.from + length,
                offset: [...color.offset]
              }
            : {
                copy: color.copy + length
              };
        return newColor;
      });

      mergedLayer.addLayers(topLayer.sublayers, topColors);
    } else mergedLayer.addLayer(topLayer);

    this.removeLayer(topIndex);
    this.replaceLayer(bottomIndex, mergedLayer);
    return mergedLayer;
  };

  popLayer: (path: string[]) => AbstractLayer | undefined = path => {
    const index = parseInt(path[0]);

    if (Number.isNaN(index) || index < 0 || index >= this.sublayers.length) return;

    const layer = this.sublayers[index];
    if (path.length === 1) {
      this.removeLayer(index, false);
      return layer;
    } else if (layer instanceof Layer) return layer.popLayer(path.slice(1));
  };

  getColors = () => this.colors as readonly Color[];

  setColor = (index: number, color: Color) => {
    this.colors[index] = color;
  };

  assertAdvancedArray = () => {
    this.advanced ??= new Array(this.sublayers.length).fill(false);
  };

  getTrueColor = (index: number, checked?: number[]) => {
    const color = this.colors[index];
    if (!color) return '#FFFFFF';

    if (typeof color === 'string') return color;

    if ('from' in color || 'copy' in color) {
      const baseIndex = 'from' in color ? color.from : color.copy;

      if (baseIndex === index || checked?.includes(baseIndex)) return '#FFFFFF';
      const base = this.colors[baseIndex];
      if (!base) return '#FFFFFF';

      const trueBase: unknown =
        typeof base === 'string'
          ? base
          : this.getTrueColor(baseIndex, checked ? checked.concat(index) : [index]);

      if (typeof trueBase !== 'string') return '#FFFFFF';

      if ('from' in color)
        return hslaToString(applyHslaOffset(colorAsHsla(trueBase), color.offset));

      return trueBase;
    }

    return '#FFFFFF';
  };

  color = async () => {
    if (this.colors.length !== this.sublayers.length)
      return Promise.reject(new Error('Color count does not match sublayer count'));

    await Promise.all(
      this.sublayers.map(async (layer, i) => {
        if (!(layer instanceof Img || layer instanceof Layer))
          return Promise.reject(new Error('Incompatible layer type'));

        if (layer instanceof Layer) await layer.color();

        if (!this.colors[i]) return;

        await layer.color(
          typeof this.colors[i] === 'string' ? this.colors[i] : this.getTrueColor(i)
        );
      })
    );

    return Promise.resolve();
  };

  private renderInternal = async (
    slim: boolean,
    ctx: OffscreenCanvasRenderingContext2D,
    parentFilter?: Filter
  ) => {
    if (this.changed) await this.render(false, slim);

    const filter = parentFilter ? this.filterFilter(parentFilter) : this.copyFilter();

    let loCtx: OffscreenCanvasRenderingContext2D | undefined = undefined;
    let loIndex: number | undefined = undefined;

    for (let i = 0; i < this.sublayers.length; i++) {
      const sublayer = this.sublayers[i];

      if (loCtx) {
        const color = this.colors[i];
        if (
          !(sublayer instanceof Img && sublayer.linearOpacity) ||
          !(
            loIndex === i ||
            (typeof color === 'object' && 'from' in color && color.from === loIndex)
          )
        ) {
          ctx.drawImage(loCtx.canvas, 0, 0);
          loCtx = undefined;
          loIndex = undefined;
        }
      }

      if (!sublayer) continue;
      if (!sublayer.active) continue;

      if (sublayer instanceof Layer) {
        await sublayer.renderInternal(slim, ctx, filter);
        continue;
      }
      if (!(sublayer instanceof Img)) continue;
      if (!sublayer.image) continue;

      if (sublayer.linearOpacity && !loCtx) {
        const loCanvas = new OffscreenCanvas(64, 64);
        loCtx = loCanvas.getContext('2d')!;
        const color: Color = this.colors[i];
        loIndex = typeof color === 'object' && 'from' in color ? color.from : i;
      }

      sublayer.render(slim, ctx, loCtx, filter);
    }

    if (loCtx) ctx.drawImage(loCtx.canvas, 0, 0);
  };

  render = async (force?: boolean, slim = false) => {
    if (!force && !this.changed && this.image) return this.image;
    this.changed = false;

    const canvas = new OffscreenCanvas(64, 64);
    const ctx = canvas.getContext('2d')!;

    await this.renderInternal(slim, ctx);

    this.src = URL.createObjectURL(await canvas.convertToBlob());
    this.image = canvas.transferToImageBitmap();

    return this.image;
  };

  copy = async () => {
    const copy = new Layer(
      await Promise.all(this.sublayers.map(layer => layer.copy())),
      [...this.colors],
      this.copyFilter()
    );
    copy.src = this.src;
    copy.advanced = this.advanced ? [...this.advanced] : undefined;
    copy.name = this.name;

    return copy;
  };

  cleanup = () => {
    this.sublayers.forEach(sublayer => {
      if (!sublayer) return;
      sublayer.cleanup();
    });
    if (this.image) this.image.close();
  };
}

export class RootLayer extends Layer {
  speaker = new Speaker();

  constructor(
    listener?: () => void,
    sublayers?: AbstractLayer[],
    colors?: (Color | UnloadedRelativeColor)[],
    filter?: Filter
  ) {
    super(sublayers, colors, filter);
    if (listener) this.speaker.registerListener(listener);
  }

  markChanged = () => {
    this.changed = true;
    this.speaker.updateListeners();
  };

  // this feels so wrong lmao
  static of(layer: Partial<RootLayer> & Layer, listener?: () => void) {
    layer.speaker = new Speaker();
    if (listener) layer.speaker.registerListener(listener);

    layer.markChanged = () => {
      layer.changed = true;
      layer.speaker?.updateListeners();
    };
    return layer as RootLayer;
  }
}

type AbstractLayerCodec = Codec<AbstractLayer, SerializedAbstractLayer>;
const CODECS = {
  Layer: Layer.CODEC as AbstractLayerCodec,
  Img: Img.CODEC as AbstractLayerCodec
};
