export class Img {
    constructor(type) {
        this.type = type || "normal";
    }

    render = url => new Promise((resolve, reject) => {
        if (!url) resolve();
        if (typeof url !== "string") reject();

        const image = new Image();
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
        image.onerror = reject;
        image.src = url;
    })

    color = color => new Promise((resolve, reject) => {
        if (!this.image) reject();

        if (color === "erase" || color === "null") {
            this.type = color;
            resolve();
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
}



export class Layer {
    constructor(sublayers, colors) {
        this.sublayers = sublayers || [];
        this.colors = colors || "#FFFFFF";
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

    render = ctx => {
        const dom = !ctx
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
                ctx.globalCompositeOperation = "source-over";
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