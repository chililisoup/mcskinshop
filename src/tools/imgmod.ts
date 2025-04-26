import * as Util from './util';

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

export const colorAsHex = (color: string) => {
  if (color.startsWith('#')) return color;

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const rgba = ctx.getImageData(0, 0, 1, 1).data;

  return (
    '#' +
    rgba[0].toString(16).padStart(2, '0') +
    rgba[1].toString(16).padStart(2, '0') +
    rgba[2].toString(16).padStart(2, '0') +
    (rgba[3] !== 255 ? rgba[3].toString(16).padStart(2, '0') : '')
  );
};

export const colorAsHsla = (color: string) => hexToHsla(colorAsHex(color));

export abstract class AbstractLayer {
  blend: GlobalCompositeOperation;
  filter: string;
  active = true;
  src = EMPTY_IMAGE_SOURCE;
  image?: ImageBitmap;
  name?: string;
  id: string;

  constructor(blend?: GlobalCompositeOperation, filter?: string) {
    this.blend = blend ?? 'source-over';
    this.filter = filter ?? '';
    this.id = Util.randomKey();
  }

  abstract render: () => Promise<void> | undefined;

  abstract propagateBlendMode: (blend?: GlobalCompositeOperation) => string;

  abstract propagateFilter: (filter?: string) => string;

  abstract copy: () => AbstractLayer;

  abstract cleanup: () => void;
}

export class Img extends AbstractLayer {
  type;
  form;
  // rawSrc contains uncolored image data,
  // so going to 0% opacity and back doesnt break anything
  rawSrc = EMPTY_IMAGE_SOURCE;
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
    filter?: string
  ) {
    super(blend, filter);

    this.type = type ?? 'normal';
    this.form = form ?? 'universal';
  }

  loadImage = async (image: ImageBitmapSource) => {
    const result = await createImageBitmap(image);

    const canvas = document.createElement('canvas');
    canvas.width = this.size[0];
    canvas.height = this.size[1];
    const ctx = canvas.getContext('2d')!;

    const copyCanvas = document.createElement('canvas');
    copyCanvas.width = this.size[0];
    copyCanvas.height = this.size[1];
    const copyCtx = copyCanvas.getContext('2d')!;
    copyCtx.filter = this.filter;

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

      this.image = await createImageBitmap(canvas);
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

      this.image = await createImageBitmap(canvas);
    } else this.image = result;

    this.rawSrc = canvas.toDataURL();
    copyCtx.drawImage(canvas, 0, 0);
    this.src = copyCanvas.toDataURL();
  };

  render = (url?: string) => {
    url ??= this.rawSrc;
    if (!url) return;
    if (typeof url !== 'string') return Promise.reject(new Error('Nothing to render'));

    return new Promise<void>((resolve, reject) => {
      const image = new Image();

      image.onerror = reject;
      image.onload = () => this.loadImage(image).then(resolve);

      image.crossOrigin = 'anonymous';
      image.src = url;
    });
  };

  copy = () => {
    const copy = new Img(this.type, this.form, this.blend, this.filter);
    copy.src = this.src;
    copy.rawSrc = this.rawSrc;
    copy.image = this.image;
    copy.name = this.name;
    copy.size = [this.size[0], this.size[1]];
    copy.linearOpacity = this.linearOpacity;
    copy.form = this.form;

    return copy;
  };

  color = async (color: string) => {
    if (!this.image) return Promise.reject(new Error('No image to color'));

    const canvas = document.createElement('canvas');
    canvas.width = this.size[0];
    canvas.height = this.size[1];
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(this.image, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.size[0], this.size[1]);

    await createImageBitmap(canvas).then(result => {
      this.src = canvas.toDataURL();
      this.image = result;
    });

    return Promise.resolve();
  };

  convertGrayscaleMask = async () => {
    if (!this.image) return Promise.reject(new Error('No mask to convert'));

    const canvas = document.createElement('canvas');
    canvas.width = this.size[0];
    canvas.height = this.size[1];
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

    await createImageBitmap(canvas).then(result => {
      this.src = canvas.toDataURL();
      this.rawSrc = this.src;
      this.image = result;
    });
  };

  gradientMask = async (peak: number, length: number) => {
    if (!this.image) return Promise.reject(new Error('No image to mask'));

    const canvas = document.createElement('canvas');
    canvas.width = this.size[0];
    canvas.height = this.size[1];
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

    await createImageBitmap(canvas).then(result => {
      this.src = canvas.toDataURL();
      this.rawSrc = this.src;
      this.image = result;
    });
  };

  applyForm = async () => {
    if (!this.image) return Promise.reject(new Error('No image to form'));
    if (this.form === 'universal') return this.image;

    const canvas = document.createElement('canvas');
    canvas.width = this.size[0];
    canvas.height = this.size[1];

    if (this.form === 'full-only' || this.form === 'slim-only') {
      if (
        (this.form === 'full-only' && !Util.getSlim()) ||
        (this.form === 'slim-only' && Util.getSlim())
      ) {
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(this.image, 0, 0);
      }

      return await createImageBitmap(canvas);
    }

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(this.image, 0, 0);

    const reverse = this.form !== 'slim-stretch';

    if (reverse === Util.getSlim()) {
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

        const width = this.form === 'full-squish-average' ? 2 : 1;
        const move = this.form === 'full-squish-inner' ? 1 : -1;

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

    return await createImageBitmap(canvas);
  };

  getImageData = (image?: ImageBitmap) => {
    image = image ?? this.image;
    if (!image) return;

    const canvas = document.createElement('canvas');
    canvas.width = this.size[0];
    canvas.height = this.size[1];
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, this.size[0], this.size[1]);
  };

  propagateBlendMode = (blend?: GlobalCompositeOperation) =>
    (this.blend = blend ?? this.blend ?? 'source-over');
  propagateFilter = (filter?: string) => (this.filter = filter ?? this.filter ?? '');

  detectSlimModel = () => {
    if (!this.image) return false;

    const canvas = document.createElement('canvas');
    canvas.width = this.size[0];
    canvas.height = this.size[1];
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(this.image, 0, 0);
    return !ctx.getImageData(46, 63, 1, 1).data[3];
  };

  flattenWithRespect = (ctx: CanvasRenderingContext2D, reverse?: boolean) => {
    const canvas = document.createElement('canvas');
    canvas.width = this.size[0];
    canvas.height = this.size[1];
    const context = canvas.getContext('2d')!;

    context.drawImage(ctx.canvas, 0, 0);
    context.globalCompositeOperation = 'destination-in';
    if (this.image) context.drawImage(this.image, 0, 0); // apply mask

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
  };

  onDynamicChange: (records: FileSystemChangeRecord[], observer: FileSystemObserver) => void =
    async (records, observer) => {
      let fileHandle: FileSystemFileHandle;

      for (const record of records) {
        if (record.type !== 'modified') break;
        fileHandle = record.root;

        const file = await fileHandle.getFile();

        await this.render(URL.createObjectURL(file));
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
  };
}

export class Layer extends AbstractLayer {
  private sublayers;
  private colors: Color[];
  advanced?: boolean[];

  constructor(
    sublayers?: AbstractLayer[],
    colors?: (Color | UnloadedRelativeColor)[],
    blend?: GlobalCompositeOperation,
    filter?: string
  ) {
    super(blend, filter);

    this.sublayers = sublayers ?? [];
    this.colors =
      colors && colors.length === this.sublayers.length
        ? colors.map(color => {
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
  };

  addLayers = (layers: AbstractLayer[], colors?: Color[]) => {
    if (!colors || colors.length !== layers.length)
      colors = new Array(layers.length).fill(undefined);

    this.sublayers.push(...layers);
    this.colors.push(...colors);
  };

  insertLayer = (index: number, layer: AbstractLayer, color?: Color) => {
    this.sublayers.splice(index, 0, layer);
    this.colors.splice(index, 0, color);
  };

  insertLayers = (index: number, layers: AbstractLayer[], colors?: Color[]) => {
    if (!colors || colors.length !== layers.length)
      colors = new Array(layers.length).fill(undefined);

    this.sublayers.splice(index, 0, ...layers);
    this.colors.splice(index, 0, ...colors);
  };

  replaceLayer = (index: number, layers: AbstractLayer | AbstractLayer[]) => {
    if (Array.isArray(layers)) {
      this.sublayers.splice(index, 1, ...layers);
      this.colors.splice(index, 1, ...(new Array(layers.length).fill(undefined) as undefined[]));
    } else {
      this.sublayers.splice(index, 1, layers);
      this.colors.splice(index, 1, undefined);
    }
  };

  moveLayer = (index: number, change: number) => {
    if (index + change < 0) change = this.sublayers.length - 1;
    if (index + change >= this.sublayers.length) change = 0 - (this.sublayers.length - 1);

    const layer = this.sublayers[index];
    this.sublayers.splice(index, 1);
    this.sublayers.splice(index + change, 0, layer);

    const color = this.colors[index];
    this.colors.splice(index, 1);
    this.colors.splice(index + change, 0, color);
  };

  duplicateLayer = (index: number) => {
    const layer = this.sublayers[index].copy();
    this.sublayers.splice(index + 1, 0, layer);
    const color = this.colors[index];
    this.colors.splice(index + 1, 0, color);
    return layer;
  };

  removeLayer = (index: number) => {
    this.sublayers.splice(index, 1);
    this.colors.splice(index, 1);
  };

  flattenLayer = async (index: number) => {
    const baseLayer = this.sublayers[index];

    const flatLayer = new Img();
    flatLayer.name = baseLayer.name;
    flatLayer.id = baseLayer.id;

    await baseLayer.render();
    if (baseLayer instanceof Img) await flatLayer.loadImage(await baseLayer.applyForm());
    else await flatLayer.render(baseLayer.src);

    this.replaceLayer(index, flatLayer);
    baseLayer.cleanup();
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

  separateLayer = (index: number) => {
    const layer = this.sublayers[index];
    if (!(layer instanceof Layer)) return false;

    layer.sublayers.forEach((sublayer, i) => {
      sublayer.name ??= `${layer.name}.${i}`;
      if (sublayer instanceof Img) sublayer.rawSrc = sublayer.src;
    });

    this.replaceLayer(index, layer.sublayers);
    return true;
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

  propagateBlendMode = (blend?: GlobalCompositeOperation) => {
    this.blend = blend ?? this.blend ?? 'source-over';
    this.sublayers.forEach(sublayer => {
      sublayer.propagateBlendMode(this.blend);
    });
    return this.blend;
  };

  propagateFilter = (filter?: string) => {
    this.filter = filter ?? this.filter ?? '';
    this.sublayers.forEach(sublayer => {
      sublayer.propagateFilter(this.filter);
    });
    return this.filter;
  };

  render = async (ctx?: CanvasRenderingContext2D) => {
    const dom = !ctx;

    if (!ctx) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      ctx = canvas.getContext('2d')!;
    }

    let loCtx: CanvasRenderingContext2D | undefined = undefined;
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

      ctx.filter =
        'opacity(100%) hue-rotate(0) saturate(100%) brightness(100%) contrast(100%) invert(0) sepia(0)';
      ctx.globalCompositeOperation = 'source-over';
      if (sublayer instanceof Layer) {
        await sublayer.render(ctx);
        continue;
      }
      if (!(sublayer instanceof Img)) continue;
      if (!sublayer.image) continue;

      if (sublayer.type === 'flatten' || sublayer.type === 'blowup') {
        // copy pixels to new location
        sublayer.flattenWithRespect(ctx, sublayer.type === 'blowup');

        // erase pixels from old location
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(sublayer.image, 0, 0);
        continue;
      }

      ctx.filter = sublayer.filter;
      if (sublayer.type === 'erase') ctx.globalCompositeOperation = 'destination-out';
      else ctx.globalCompositeOperation = sublayer.blend;

      const image = await sublayer.applyForm();

      if (sublayer.linearOpacity) {
        const subImageData = sublayer.getImageData(image);
        if (!subImageData) continue;
        const subData = subImageData.data;

        if (!loCtx) {
          const loCanvas = document.createElement('canvas');
          loCanvas.width = 64;
          loCanvas.height = 64;
          loCtx = loCanvas.getContext('2d')!;

          const color: Color = this.colors[i];
          loIndex = typeof color === 'object' && 'from' in color ? color.from : i;
        }

        const imageData = loCtx.getImageData(0, 0, sublayer.size[0], sublayer.size[1]);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) {
            data[i] = subData[i];
            data[i + 1] = subData[i + 1];
            data[i + 2] = subData[i + 2];
            data[i + 3] = subData[i + 3];
            continue;
          }

          if (subData[i + 3] === 0) continue;

          const mix = data[i + 3] / (data[i + 3] + subData[i + 3]);
          const invMix = 1 - mix;

          data[i] = data[i] * mix + subData[i] * invMix;
          data[i + 1] = data[i + 1] * mix + subData[i + 1] * invMix;
          data[i + 2] = data[i + 2] * mix + subData[i + 2] * invMix;
          data[i + 3] += subData[i + 3];
        }

        loCtx.putImageData(imageData, 0, 0);

        continue;
      }

      ctx.drawImage(image, 0, 0);
    }

    if (loCtx) ctx.drawImage(loCtx.canvas, 0, 0);

    if (dom)
      return createImageBitmap(ctx.canvas).then(result => {
        this.src = ctx.canvas.toDataURL();
        this.image = result;
      });
  };

  copy = () => {
    const copy = new Layer(
      this.sublayers.map(layer => layer.copy()),
      [...this.colors],
      this.blend,
      this.filter
    );
    copy.advanced = this.advanced ? [...this.advanced] : undefined;
    copy.name = this.name;

    return copy;
  };

  cleanup = () => {
    this.sublayers.forEach(sublayer => {
      if (!sublayer) return;
      sublayer.cleanup();
    });
  };
}
