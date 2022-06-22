import React, { Component } from 'react';
import { createRoot } from 'react-dom/client';
import './main.css';
import PaperDoll from './paperdoll'
import LayerManager from './layermanager';
import * as ImgMod from './imgmod';

import fakedatabase from './fakedatabase.json';

const container = document.getElementById('root');
const root = createRoot(container);



class LayerAdder extends Component {
    constructor(props) {
        super(props);

        this.state = {
            layers: new ImgMod.Layer()
        }
    }

    componentDidMount() {
        this.loadAssets();
    }

    addLayer = (id) => {
        const layer = new ImgMod.Layer();
        layer.name = fakedatabase[id].name;
        layer.colors = fakedatabase[id].colors;
        layer.advanced = fakedatabase[id].advanced;
        layer.id = Math.random().toString(16).slice(2);

        Promise.all(fakedatabase[id].layers.map((src, i) => {
            const image = new ImgMod.Img();
            layer.sublayers.push(image);
            if (fakedatabase[id].colors[i] === "erase") image.type = "erase";
            return image.render(process.env.PUBLIC_URL + fakedatabase[id].loc + src);
        })).then(() => this.props.addLayer(layer));
    }

    loadAssets = () => {
        const layers = new ImgMod.Layer();

        Promise.all(fakedatabase.map(asset => {
            const sublayer = new ImgMod.Layer();
            layers.sublayers.push(sublayer);

            return Promise.all(asset.layers.map(src => {
                const image = new ImgMod.Img();
                sublayer.sublayers.push(image);
                return image.render(process.env.PUBLIC_URL + asset.loc + src);
            })).then(() => sublayer.render());
        })).then(() => this.setState({layers: layers}))
    }

    render() {
        let elem = <div />
        if (this.state.layers.sublayers.length) {
            elem = this.state.layers.sublayers.map((sublayer, i) => {
                return (
                    <div className="container" key={fakedatabase[i].name}>
                        <p>{fakedatabase[i].name}</p>
                        <span>
                            <img src={sublayer.src} alt={fakedatabase[i].name} title={fakedatabase[i].name} />
                            <button onClick={this.addLayer.bind(this, i)}>+</button>
                        </span>
                    </div>
                );
            })
        }

        return (
            <div className="layer-adder">
                {elem}
            </div>
        );
    }
}

class SkinManager extends Component {
    constructor(props) {
        super(props);

        this.state = {
            skin: null,
            slim: false,
        }
        this.layers = new ImgMod.Layer();
    }

    componentDidMount() {
        this.updateSkin();//delete maybe? not needed atm
    }

    updateSkin = (slim) => {
        if (typeof slim === "undefined") slim = this.state.slim || false;
        if (this.layers.sublayers.length)
            this.layers.render().then(() => this.setState({ skin: this.layers.src, slim: slim }));
        else this.setState({ skin: null, slim: slim });
    }

    updateLayers = (newLayers) => {
        this.layers = newLayers;
        this.updateSkin();
    }

    addLayer = (layer) => {
        this.layers.sublayers.push(layer);
        this.updateSkin();
    }

    addLayerFromInput = (e) => {
        const image = new ImgMod.Img();
        image.name = e.target.files[0].name;
        image.id = Math.random().toString(16).slice(2);
        this.layers.sublayers.push(image);
        image.render(URL.createObjectURL(e.target.files[0]))
        .then(() => {
            e.target.value = "";
            this.updateSkin(image.detectSlimModel());
        });
    }

    addLayerFromUsername = () => {
        /* This might be better but CORS makes it annoying

        fetch("https://api.mojang.com/users/profiles/minecraft/" + this.usernameInput)
        .then(response => response.json())
        .then(data => fetch("https://sessionserver.mojang.com/session/minecraft/profile/" + data.id))
        .then(response => response.json())
        .then(data => {
            const skin = new ImgMod.Img();
            this.layers.sublayers.push(skin);
            skin.render(JSON.parse(atob(data.properties[0].value)).textures.SKIN.url).then(() => {
                this.updateSkin();
            });
        });
        */

        const skin = new ImgMod.Img();
        skin.name = this.usernameInput;
        skin.id = Math.random().toString(16).slice(2);
        this.layers.sublayers.push(skin);
        skin.render("https://minotar.net/skin/" + this.usernameInput).then(() => 
            this.updateSkin(skin.detectSlimModel())
        );
    }

    updateUsernameInput = (e) => {
        e.target.value = e.target.value.replace(/[^0-9A-Za-z_]/g, "");
        this.usernameInput = e.target.value;
    }

    downloadSkin = () => {
        const link = document.createElement("a");
        link.href = this.state.skin;
        link.download = window.prompt("Download as...", "My Skin") + ".png";
        link.click();
    }

    render() {
        return ( //Make it so layer manager just sends updated layers instead of layer update commands
            <div className="SkinManager">
                <div className="SkinAdders container">
                    <img src={this.state.skin} alt="Flattened Skin" />
                    <button onClick={this.downloadSkin}>Download</button>
                    <label htmlFor="imageInput">Upload</label>
                    <input type="file" accept="image/png" id="imageInput" onChange={this.addLayerFromInput} />
                    <label htmlFor="usernameInput">Skin Stealer</label>
                    <span>
                        <input placeholder="Username" maxLength={16} id="usernameInput" onChange={this.updateUsernameInput}></input>
                        <button onClick={this.addLayerFromUsername}>+</button>
                    </span>
                </div>
                <LayerManager layers={this.layers} updateLayers={this.updateLayers} />
                <PaperDoll skin={this.state.skin} slim={this.state.slim} updateSkin={this.updateSkin} />
                <LayerAdder addLayer={this.addLayer} />
            </div>
        );
    }
}

root.render(
    <React.StrictMode>
        <SkinManager />
    </React.StrictMode>
);