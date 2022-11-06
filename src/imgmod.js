const hatFlattenerOffsets = [
    { width: 16, height: 8,  from: [40, 0 ], to: [8,  0 ] },
    { width: 32, height: 8,  from: [32, 8 ], to: [0,  8 ] },
    { width: 8,  height: 4,  from: [4,  32], to: [4,  16] },
    { width: 16, height: 4,  from: [20, 32], to: [20, 16] },
    { width: 8,  height: 4,  from: [44, 32], to: [44, 16] },
    { width: 56, height: 12, from: [0,  36], to: [0,  20] },
    { width: 8,  height: 4,  from: [4,  48], to: [20, 48] },
    { width: 16, height: 12, from: [0,  52], to: [16, 52] },
    { width: 8,  height: 4,  from: [52, 48], to: [36, 48] },
    { width: 16, height: 12, from: [48, 52], to: [32, 52] }
];

export class Img {
    constructor(type, blend, filter) {
        this.type = type || "normal";
        this.blend = blend || "source-over";
        this.filter = filter || "";
    }

    render = url => new Promise((resolve, reject) => {
        if (!url) resolve();
        if (typeof url !== "string") reject();

        const image = new Image();

        image.onerror = reject;
        image.onload = () => {
            createImageBitmap(image).then(result => {
                const canvas = document.createElement("canvas");
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(result, 0, 0);

                if (image.height === 32) {
                    ctx.setTransform(-1, 0, 0, 1, 64, 0); // Mirror, move into frame

                    ctx.drawImage(result, 44, 16, 4,  4,  24, 48, 4,  4 ); // Arm top
                    ctx.drawImage(result, 48, 16, 4,  4,  20, 48, 4,  4 ); // Arm bottom
                    ctx.drawImage(result, 40, 20, 12, 12, 20, 52, 12, 12); // Arm front/sides
                    ctx.drawImage(result, 52, 20, 4,  12, 16, 52, 4,  12); // Arm back

                    ctx.drawImage(result, 4,  16, 4,  4,  40, 48, 4,  4 ); // Leg top
                    ctx.drawImage(result, 8,  16, 4,  4,  36, 48, 4,  4 ); // Leg bottom
                    ctx.drawImage(result, 0,  20, 12, 12, 36, 52, 12, 12); // Leg front/sides
                    ctx.drawImage(result, 12, 20, 4,  12, 32, 52, 4,  12); // Leg back

                    this.src = canvas.toDataURL();
                    createImageBitmap(canvas).then(imageResult => {
                        this.image = imageResult;
                        resolve();
                    });
                } else {
                    this.src = canvas.toDataURL();
                    this.image = result;
                    resolve();
                }
            });
        }
        
        image.crossOrigin = "anonymous";
        image.src = url;
    })

    color = color => new Promise((resolve, reject) => {
        if (!this.image) reject();

        if (color === "erase" || color === "null") {
            this.type = color;
            resolve();
            return
        }

        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(this.image, 0, 0);
        ctx.globalCompositeOperation = "source-in";
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 64, 64);

        createImageBitmap(canvas).then(result => {
            this.src = canvas.toDataURL();
            this.image = result;
            resolve();
        });
    });

    getImageData = () => {
        if (!this.image) return;

        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(this.image, 0, 0);
        return(ctx.getImageData(0, 0, 64, 64));
    }

    propagateBlendMode = blend => this.blend = blend || this.blend || "source-over";
    propagateFilter = filter => this.filter = filter || this.filter || "";

    detectSlimModel = () => {
        if (!this.image) return;

        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(this.image, 0, 0);
        return(!ctx.getImageData(46, 63, 1, 1).data[3]);
    }

    flattenWithRespect = ctx => {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext("2d");

        context.drawImage(ctx.canvas, 0, 0);
        context.globalCompositeOperation = "destination-in";
        context.drawImage(this.image, 0, 0);

        hatFlattenerOffsets.forEach(offset => ctx.drawImage(
            canvas,
            offset.from[0],
            offset.from[1],
            offset.width,
            offset.height,
            offset.to[0],
            offset.to[1],
            offset.width,
            offset.height
        ));
    }
}



export class Layer {
    constructor(sublayers, colors, blend, filter) {
        this.sublayers = sublayers || [];
        this.colors = colors || "#FFFFFF";
        this.blend = blend || "source-over";
        this.filter = filter || "";
    }

    color = colors => new Promise((resolve, reject) => {
        this.colors = colors || this.colors;
        if (this.colors instanceof String)
            this.colors = new Array(this.sublayers.length).fill(this.colors);
        if (this.colors.length !== this.sublayers.length) reject();

        Promise.all(this.sublayers.map((layer, i) =>
            new Promise((resolve, reject) => {
                if (!(layer instanceof Img) && !(layer instanceof Layer)) reject();
                layer.color(this.colors[i]).then(resolve);
            })
        )).then(resolve);
    })

    propagateBlendMode = blend => {
        this.blend = blend || this.blend || "source-over";
        this.sublayers.forEach(sublayer => {
            sublayer.propagateBlendMode(this.blend);
        });
    }

    propagateFilter = filter => {
        this.filter = filter || this.filter || "";
        this.sublayers.forEach(sublayer => {
            sublayer.propagateFilter(this.filter);
        });
    }

    render = ctx => {
        const dom = !ctx;
        if (dom) {
            const canvas = document.createElement("canvas");
            canvas.width = 64;
            canvas.height = 64;
            ctx = canvas.getContext("2d");
        }
        this.sublayers.forEach(sublayer => {
            ctx.filter = "opacity(100%) hue-rotate(0) saturate(100%) brightness(100%) contrast(100%) invert(0) sepia(0)";
            if (sublayer instanceof Layer)
                sublayer.render(ctx);
            else {
                if (sublayer.type === "flatten") {
                    sublayer.flattenWithRespect(ctx);
                    ctx.globalCompositeOperation = "destination-out";
                    ctx.drawImage(sublayer.image, 0, 0);
                } else {
                    ctx.globalCompositeOperation = sublayer.blend;
                    ctx.filter = sublayer.filter;

                    if (sublayer.type === "erase")
                        ctx.globalCompositeOperation = "destination-out";

                    ctx.drawImage(sublayer.image, 0, 0);
                }
            }
        });
        if (dom) return createImageBitmap(ctx.canvas).then(result => {
            this.src = ctx.canvas.toDataURL();
            this.image = result;
        });
    }
}