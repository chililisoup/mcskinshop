const hatFlattenerOffsets = [
    {
        width: 16,
        height: 8,
        from: [40, 0],
        to: [8, 0]
    },
    {
        width: 32,
        height: 8,
        from: [32, 8],
        to: [0, 8]
    },
    {
        width: 8,
        height: 4,
        from: [4, 32],
        to: [4, 16]
    },
    {
        width: 16,
        height: 4,
        from: [20, 32],
        to: [20, 16]
    },
    {
        width: 8,
        height: 4,
        from: [44, 32],
        to: [44, 16]
    },
    {
        width: 56,
        height: 12,
        from: [0, 36],
        to: [0, 20]
    },
    {
        width: 8,
        height: 4,
        from: [4, 48],
        to: [20, 48]
    },
    {
        width: 16,
        height: 12,
        from: [0, 52],
        to: [16, 52]
    },
    {
        width: 8,
        height: 4,
        from: [52, 48],
        to: [36, 48]
    },
    {
        width: 16,
        height: 12,
        from: [48, 52],
        to: [32, 52]
    }
];

function coordsToImageDataIndices(x, y) {
    const i = 4 * (y * 64 + x);
    return [i, i + 1, i + 2, i + 3];
}

export class Img {
    constructor(type, blend) {
        this.type = type || "normal";
        this.blend = blend || "source-over";
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

                this.src = canvas.toDataURL();
                this.image = result;

                resolve();
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
        let imageData = ctx.getImageData(0, 0, 64, 64);
        const flatMap = this.getImageData();
        if (!flatMap) return;

        hatFlattenerOffsets.forEach(offset => {
            for (let i = 0; i < offset.height * offset.width; i++) {
                const fromX = i % offset.width + offset.from[0];
                const fromY = Math.floor(i / offset.width) + offset.from[1];
                const fromPixel = coordsToImageDataIndices(fromX, fromY);
                if (!flatMap.data[fromPixel[3]]) continue;

                const toX = fromX - offset.from[0] + offset.to[0];
                const toY = fromY - offset.from[1] + offset.to[1];
                const toPixel = coordsToImageDataIndices(toX, toY);

                const fromAlpha = imageData.data[fromPixel[3]] / 255;

                imageData.data[toPixel[0]] = Math.floor(imageData.data[fromPixel[0]] * fromAlpha + imageData.data[toPixel[0]] * (1 - fromAlpha));
                imageData.data[toPixel[1]] = Math.floor(imageData.data[fromPixel[1]] * fromAlpha + imageData.data[toPixel[1]] * (1 - fromAlpha));
                imageData.data[toPixel[2]] = Math.floor(imageData.data[fromPixel[2]] * fromAlpha + imageData.data[toPixel[2]] * (1 - fromAlpha));
                imageData.data[toPixel[3]] = Math.min(imageData.data[fromPixel[3]] + imageData.data[toPixel[3]], 255);
                
            }
        });
        ctx.putImageData(imageData, 0, 0);
    }
}



export class Layer {
    constructor(sublayers, colors, blend) {
        this.sublayers = sublayers || [];
        this.colors = colors || "#FFFFFF";
        this.blend = blend || "source-over";
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

    propagateBlendMode = (blend) => {
        this.blend = blend || this.blend || "source-over";
        this.sublayers.forEach(sublayer => {
            sublayer.propagateBlendMode(this.blend);
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
            if (sublayer instanceof Layer)
                sublayer.render(ctx);
            else {
                if (sublayer.type === "flatten") {
                    sublayer.flattenWithRespect(ctx);
                    ctx.globalCompositeOperation = "destination-out";
                    ctx.drawImage(sublayer.image, 0, 0);
                } else {

                    ctx.globalCompositeOperation = sublayer.blend;

                    if (sublayer.type === "erase") {
                        ctx.globalCompositeOperation = "destination-out";
                    }
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