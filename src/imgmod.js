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
    })

    propagateBlendMode = (blend) => this.blend = blend || this.blend || "source-over";

    detectSlimModel = () => {
        if (!this.image) return;

        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(this.image, 0, 0);
        return(!ctx.getImageData(46, 63, 1, 1).data[3]);
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
                ctx.globalCompositeOperation = sublayer.blend;
                if (sublayer.type === "erase") {
                    ctx.globalCompositeOperation = "destination-out";
                }
                ctx.drawImage(sublayer.image, 0, 0);
            }
        });
        if (dom) return createImageBitmap(ctx.canvas).then(result => {
            this.src = ctx.canvas.toDataURL();
            this.image = result;
        });
    }
}