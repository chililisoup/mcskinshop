const hatFlattenerOffsets = [
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
];

export const emptyImageSource =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NgAAIAAAUAAR4f7BQAAAAASUVORK5CYII=';

export type LayerType = 'normal' | 'erase' | 'flatten' | 'null';

export abstract class AbstractLayer {
  blend: GlobalCompositeOperation;
  filter: string;
  active = true;
  src = emptyImageSource;
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
  rawSrc = emptyImageSource;
  size = [64, 64];
  dynamic = false;
  fileHandle?: FileSystemFileHandle;
  observer?: FileSystemObserver;
  internalUpdateCallback?: () => void;

  constructor(type?: LayerType, blend?: GlobalCompositeOperation, filter?: string) {
    super(blend, filter);

    this.type = type ?? 'normal';
  }

  loadImage = async (image: HTMLImageElement) => {
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

    if (image.height === 32 && this.size[1] === 64) {
      ctx.setTransform(-1, 0, 0, 1, 64, 0); // Mirror, move into frame

      ctx.drawImage(result, 44, 16, 4, 4, 24, 48, 4, 4); // Arm top
      ctx.drawImage(result, 48, 16, 4, 4, 20, 48, 4, 4); // Arm bottom
      ctx.drawImage(result, 40, 20, 12, 12, 20, 52, 12, 12); // Arm front/sides
      ctx.drawImage(result, 52, 20, 4, 12, 16, 52, 4, 12); // Arm back

      ctx.drawImage(result, 4, 16, 4, 4, 40, 48, 4, 4); // Leg top
      ctx.drawImage(result, 8, 16, 4, 4, 36, 48, 4, 4); // Leg bottom
      ctx.drawImage(result, 0, 20, 12, 12, 36, 52, 12, 12); // Leg front/sides
      ctx.drawImage(result, 12, 20, 4, 12, 32, 52, 4, 12); // Leg back

      this.rawSrc = canvas.toDataURL();

      const imageResult = await createImageBitmap(canvas);
      this.image = imageResult;
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

    return copy;
  };

  color = async (color: string) => {
    if (!this.image) return Promise.reject(new Error('No image to color'));

    if (color === 'erase' || color === 'null' || color === 'flatten') {
      this.type = color;
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

  flattenWithRespect = (ctx: CanvasRenderingContext2D) => {
    const canvas = document.createElement('canvas');
    canvas.width = this.size[0];
    canvas.height = this.size[1];
    const context = canvas.getContext('2d')!;

    context.drawImage(ctx.canvas, 0, 0);
    context.globalCompositeOperation = 'destination-in';
    if (this.image) context.drawImage(this.image, 0, 0);

    hatFlattenerOffsets.forEach(offset =>
      ctx.drawImage(
        canvas,
        offset.from[0],
        offset.from[1],
        offset.width,
        offset.height,
        offset.to[0],
        offset.to[1],
        offset.width,
        offset.height
      )
    );
  };

  onDynamicChange = async (records: FileSystemChangeRecord[], observer: FileSystemObserver) => {
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
    this.observer = new window.FileSystemObserver(() => this.onDynamicChange);
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
    colors?: string | string[],
    blend?: GlobalCompositeOperation,
    filter?: string
  ) {
    super(blend, filter);

    this.sublayers = sublayers ?? [];
    this.colors = colors ?? '#FFFFFF';
  }

  color: (colors?: string | string[]) => Promise<unknown> = colors => {
    this.colors = colors ?? this.colors;
    if (this.colors instanceof String)
      this.colors = new Array(this.sublayers.length).fill(this.colors);
    if (this.colors.length !== this.sublayers.length)
      return Promise.reject(new Error('Color count does not match sublayer count'));

    return Promise.all(
      this.sublayers.map((layer, i) => {
        return layer instanceof Img || layer instanceof Layer
          ? layer.color(this.colors[i])
          : Promise.reject(new Error('Incompatible layer type'));
      })
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

  render = (ctx?: CanvasRenderingContext2D) => {
    const dom = !ctx;

    if (!ctx) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      ctx = canvas.getContext('2d')!;
    }

    this.sublayers.forEach(sublayer => {
      if (!sublayer) return;
      if (!sublayer.active) return;

      ctx.filter =
        'opacity(100%) hue-rotate(0) saturate(100%) brightness(100%) contrast(100%) invert(0) sepia(0)';
      if (sublayer instanceof Layer) {
        void sublayer.render(ctx);
        return;
      }
      if (!(sublayer instanceof Img)) return;
      if (!sublayer.image) return;

      if (sublayer.type === 'flatten') {
        sublayer.flattenWithRespect(ctx);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(sublayer.image, 0, 0);
        return;
      }

      ctx.globalCompositeOperation = sublayer.blend;
      ctx.filter = sublayer.filter;
      if (sublayer.type === 'erase') ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(sublayer.image, 0, 0);
    });

    if (dom)
      return createImageBitmap(ctx.canvas).then(result => {
        this.src = ctx.canvas.toDataURL();
        this.image = result;
      });
  };

  copy = () => {
    const copy = new Layer([], this.colors, this.blend, this.filter);
    if (this.advanced) copy.advanced = this.advanced;
    if (this.name) copy.name = this.name;

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
