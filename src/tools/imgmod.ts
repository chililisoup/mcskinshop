import * as Util from './util';

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
] as const;

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
] as const;

export const EMPTY_IMAGE_SOURCE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NgAAIAAAUAAR4f7BQAAAAASUVORK5CYII=';

export const LAYER_TYPES = ['normal', 'erase', 'flatten', 'blowup', 'null'] as const;
export type LayerType = (typeof LAYER_TYPES)[number];
export const checkLayerType = (maybeType: string): LayerType | undefined => {
  if (LAYER_TYPES.find(type => type === maybeType)) return maybeType as LayerType;
};

export const LAYER_FORMS = ['full-squish', 'slim-stretch'] as const;
export type LayerForm = (typeof LAYER_FORMS)[number];

export type Hsla = [hue: number, saturation: number, lightness: number, alpha: number];
export type RelativeColor = { from: number; offset: Hsla };

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
  return [to[0] - from[0], to[1] / from[1], to[2] / from[2], to[3] / from[3]] as Hsla;
};

export const applyHslaOffset = (from: Hsla, offset: Hsla) => {
  return [
    from[0] + offset[0],
    from[1] * offset[1],
    from[2] * offset[2],
    from[3] * offset[3]
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
  id?: string;

  constructor(blend?: GlobalCompositeOperation, filter?: string) {
    this.blend = blend ?? 'source-over';
    this.filter = filter ?? '';
  }

  abstract render: () => Promise<void> | undefined;

  abstract propagateBlendMode: (blend?: GlobalCompositeOperation) => string;

  abstract propagateFilter: (filter?: string) => string;

  abstract copy: () => AbstractLayer;

  abstract cleanup: () => void;
}

export class Img extends AbstractLayer {
  type;
  layerForm?: LayerForm;
  // rawSrc contains uncolored image data,
  // so going to 0% opacity and back doesnt break anything
  rawSrc = EMPTY_IMAGE_SOURCE;
  size = [64, 64];
  dynamic = false;
  fileHandle?: FileSystemFileHandle;
  observer?: FileSystemObserver;
  internalUpdateCallback?: () => void;

  constructor(type?: LayerType, blend?: GlobalCompositeOperation, filter?: string) {
    super(blend, filter);

    this.type = type ?? 'normal';
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
    const copy = new Img(this.type, this.blend, this.filter);
    copy.src = this.src;
    copy.rawSrc = this.rawSrc;
    copy.image = this.image;
    copy.name = this.name;
    copy.layerForm = this.layerForm;

    return copy;
  };

  color = async (color: string) => {
    if (!this.image) return Promise.reject(new Error('No image to color'));

    const layerType = checkLayerType(color);
    if (layerType) {
      this.type = layerType;
      return;
    }

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
  };

  mask = async (peak: number, length: number) => {
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

  form = async () => {
    if (!this.image) return Promise.reject(new Error('No image to form'));

    const canvas = document.createElement('canvas');
    canvas.width = this.size[0];
    canvas.height = this.size[1];
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(this.image, 0, 0);

    const reverse = this.layerForm === 'full-squish';

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
      }
    }

    return await createImageBitmap(canvas);
  };

  getImageData = () => {
    if (!this.image) return;

    const canvas = document.createElement('canvas');
    canvas.width = this.size[0];
    canvas.height = this.size[1];
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(this.image, 0, 0);
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
  sublayers;
  colors;
  advanced?: boolean[];

  constructor(
    sublayers?: AbstractLayer[],
    colors?: string | (string | RelativeColor)[],
    blend?: GlobalCompositeOperation,
    filter?: string
  ) {
    super(blend, filter);

    this.sublayers = sublayers ?? [];
    this.colors = colors ?? '#FFFFFF';
  }

  assertAdvancedArray = () => {
    this.advanced ??= new Array(this.sublayers.length).fill(false);
  };

  assertColorArray = () => {
    if (typeof this.colors === 'string')
      this.colors = new Array(this.sublayers.length).fill(this.colors);
  };

  getTrueColor = (color: RelativeColor) => {
    const from = this.colors[color.from];
    if (typeof from !== 'string') return '#FFFFFF';

    return hslaToString(applyHslaOffset(colorAsHsla(from), color.offset));
  };

  color: (colors?: string | (string | RelativeColor)[]) => Promise<unknown> = colors => {
    this.colors = colors ?? this.colors;
    this.assertColorArray();

    if (this.colors.length !== this.sublayers.length)
      return Promise.reject(new Error('Color count does not match sublayer count'));

    return Promise.all(
      this.sublayers.map((layer, i) =>
        layer instanceof Img || layer instanceof Layer
          ? layer.color(
              typeof this.colors[i] === 'string'
                ? this.colors[i]
                : this.getTrueColor(this.colors[i])
            )
          : Promise.reject(new Error('Incompatible layer type'))
      )
    );
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

    await Promise.all(
      this.sublayers.map(async sublayer => {
        if (!sublayer) return;
        if (!sublayer.active) return;

        ctx.filter =
          'opacity(100%) hue-rotate(0) saturate(100%) brightness(100%) contrast(100%) invert(0) sepia(0)';
        ctx.globalCompositeOperation = 'source-over';
        if (sublayer instanceof Layer) {
          await sublayer.render(ctx);
          return;
        }
        if (!(sublayer instanceof Img)) return;
        if (!sublayer.image) return;

        if (sublayer.type === 'flatten' || sublayer.type === 'blowup') {
          // copy pixels to new location
          sublayer.flattenWithRespect(ctx, sublayer.type === 'blowup');

          // erase pixels from old location
          ctx.globalCompositeOperation = 'destination-out';
          ctx.drawImage(sublayer.image, 0, 0);
          return;
        }

        ctx.filter = sublayer.filter;
        if (sublayer.type === 'erase') ctx.globalCompositeOperation = 'destination-out';
        else ctx.globalCompositeOperation = sublayer.blend;

        const image = sublayer.layerForm ? await sublayer.form() : sublayer.image;
        ctx.drawImage(image, 0, 0);
      })
    );

    if (dom)
      return createImageBitmap(ctx.canvas).then(result => {
        this.src = ctx.canvas.toDataURL();
        this.image = result;
      });
  };

  copy = () => {
    const copy = new Layer(
      [],
      typeof this.colors === 'string' ? this.colors : [...this.colors],
      this.blend,
      this.filter
    );
    copy.advanced = this.advanced ? [...this.advanced] : undefined;
    copy.name = this.name;

    this.sublayers.forEach(layer => copy.sublayers.push(layer.copy()));

    return copy;
  };

  cleanup = () => {
    this.sublayers.forEach(sublayer => {
      if (!sublayer) return;
      sublayer.cleanup();
    });
  };
}
