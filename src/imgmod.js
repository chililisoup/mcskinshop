export class Img {
    constructor(src, type) {
        this.src = src || null;
        this.type = type || "normal";
    }

    load = (src) => new Promise((resolve, reject) => {
        if (!src && !this.src) reject();
        const image = new Image();
        image.onload = () => {
            this.image = image;
            resolve(image);
        };
        image.onerror = reject;
        image.src = src || this.src;
    });

    render = (image) => {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");

        this.src = image || this.src;

        return new Promise(resolve => {
            if (this.image) resolve(this.image);
            else this.load().then(result => resolve(result));
        }).then(result => {
            ctx.drawImage(result, 0, 0);
            this.src = canvas.toDataURL("image/png");
            return this.src;
        });
    }

    color = (color) => {
        if (color === "erase" || color === "null") {
            this.type = color;
            return new Promise(resolve => resolve(this.src));
        }

        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");

        return new Promise(resolve => {
            if (this.image) resolve(this.image);
            else this.load().then(result => resolve(result));
        }).then(result => {
            ctx.drawImage(result, 0, 0);
            ctx.globalCompositeOperation = "source-in";
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 64, 64);

            this.src = canvas.toDataURL("image/png");
            return this.src;
        });
    }
}

export class Layer {
    constructor(sublayers) {
        this.sublayers = sublayers || [];
    }

    color = (colors) => {
        this.colors = colors || this.colors;
        if (!this.colors) return new Promise(resolve => resolve());
        if (this.colors instanceof String) colors = new Array(this.sublayers.length).fill(this.colors);
        if (this.colors.length !== this.sublayers.length)
        throw(new Error("Colors array must be the same length as the images array!"));

        return Promise.all(this.sublayers.map((layer, i) => (
            new Promise((resolve, reject) => {
                if (!(layer instanceof Img) && !(layer instanceof Layer)) reject();
                layer.color(this.colors[i]).then(result => resolve(result));
            }
        ))));
    }

    updateChildren = () => {
        return Promise.all(this.sublayers.map((layer) => (
            new Promise((resolve, reject) => {
                if (layer instanceof Layer) 
                    layer.updateChildren().then(
                    () => layer.render().then(
                    () => resolve(layer)));
                else if (layer instanceof Img)
                    layer.load().then(() => resolve(layer));
                else reject();
            }
        ))));
    }

    load = () => new Promise((resolve, reject) => {
        if (!this.src) reject();
        const image = new Image();
        image.onload = () => {
            this.image = image;
            resolve(image);
        };
        image.onerror = reject;
        image.src = this.src;
    });

    recursiveRender = (sublayer, ctx) => {
        if (sublayer instanceof Layer)
            sublayer.sublayers.forEach(layer => this.recursiveRender(layer, ctx));
        else {
            ctx.globalCompositeOperation = "source-over";
            if (sublayer.type === "erase") {
                ctx.globalCompositeOperation = "destination-out";
            }
            ctx.drawImage(sublayer.image, 0, 0);
        }
    }

    render = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");

        return this.updateChildren().then(() => {
            this.sublayers.forEach(sublayer => this.recursiveRender(sublayer, ctx));
            this.src = canvas.toDataURL("image/png");
            return this.src;
        });
    }
}