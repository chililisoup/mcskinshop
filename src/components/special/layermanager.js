import React, { Component } from "react";
import * as ImgMod from "../../tools/imgmod";
import LayerEditor from "./layereditor";
import ColorPicker from "../basic/colorpicker";
import DraggableWindow from "../basic/draggablewindow";

class LayerPreview extends Component {
    constructor(props) {
        super(props);

        this.state = {
            src: null,
            alt: ""
        }
    }

    componentDidMount() {
        this.updatePreview();
    }

    componentDidUpdate(prevProps) {
        if (prevProps !== this.props) this.updatePreview();
    }

    updatePreview = () => {
        this.props.asset.render().then(() => 
            this.setState({src: this.props.asset.src, alt: this.props.asset.name})
        );
    }

    render() {
        return (
            <img src={this.state.src} alt={this.state.alt} title={this.state.alt} />
        );
    }
}

class Layer extends Component {
    constructor(props) {
        super(props);

        this.state = {
            opacity: 100,
            hue: 0,
            saturation: 100,
            brightness: 100,
            contrast: 100,
            invert: 0,
            sepia: 0
        };
        this.asset = props.asset;
    }

    changeColor = (colorIndex, color) => {
        this.asset.colors[colorIndex] = color;
        this.asset.color().then(() => this.updateLayer());
    }

    toggleActive = () => {
        this.asset.active = !this.asset.active;
        this.updateLayer();
    }

    changeBlendMode = blend => {
        this.asset.propagateBlendMode(blend);
        this.updateLayer();
    }

    updateFilter = filter => {
        this.setState(filter);

        filter =
            "opacity(" + this.state.opacity + "%) " +
            "hue-rotate(" + this.state.hue + "deg) " +
            "saturate(" + this.state.saturation + "%) " +
            "brightness(" + this.state.brightness + "%) " +
            "contrast(" + this.state.contrast + "%) " +
            "invert(" + this.state.invert + "%) " +
            "sepia(" + this.state.sepia + "%)";

        this.asset.propagateFilter(filter);
        this.updateLayer();
    }

    updateLayer = () => this.props.updateLayer(this.props.index, this.asset);

    render() {
        const colors = [];
        if (this.asset?.colors) {
            this.asset.colors.forEach((color, i) => {
                if (color !== "null" && color !== "erase" && (!this.asset.advanced[i] || this.props.advanced)) {
                    colors.push(
                        <ColorPicker key={i + this.asset.id} default={color} update={color => this.changeColor(i, color)} />
                    );
                }
            });
        }

        return (
            <div className="manager-layer container">
                <span className="layerTitle">
                    <input type="checkbox" checked={this.asset.active} onChange={() => this.toggleActive()}/>
                    <p>{this.asset.name}</p>
                    {(this.asset instanceof ImgMod.Img && !this.asset.dynamic) &&
                        <button onClick={() => this.props.selectForEdit(this.props.index)}>Edit</button>
                    }
                    {(this.asset instanceof ImgMod.Img && this.asset.dynamic) &&
                        <button disabled>Edit in external editor</button>
                    }
                </span>
                <span>
                    <LayerPreview asset={this.asset} />
                    <div className="manager-layer-buttons">
                        <button onClick={() => this.props.moveLayer(this.props.index, 1)}>&#9650;</button>
                        <button onClick={() => this.props.moveLayer(this.props.index, -1)}>&#9660;</button>
                    </div>
                    <div className="manager-layer-buttons">
                        <button onClick={() => this.props.duplicateLayer(this.props.index)}>&#128471;</button>
                        <button onClick={() => this.props.removeLayer(this.props.index)}>&#10006;</button>
                    </div>
                    <div className="manager-layer-buttons">
                        <button onClick={() => this.props.flattenLayer(this.props.index)}>&#8676;</button>
                        <button onClick={() => this.props.mergeLayerDown(this.props.index)}>&#10515;</button>
                    </div>
                    <div className="manager-layer-colors">
                        {colors}
                    </div>
                </span>
                {this.props.advanced &&
                    <div className="settingsList">
                        <span>
                            <label htmlFor={"blendSelector" + this.asset.id}>Blend Mode:</label>
                            <select id={"blendSelector" + this.asset.id} value={this.asset.blend} onChange={e => this.changeBlendMode(e.target.value)}>
                                <option value="source-over">Source Over</option>
                                <option value="source-in">Source In</option>
                                <option value="source-out">Source Out</option>
                                <option value="source-atop">Source Atop</option>
                                <option value="destination-over">Destination Over</option>
                                <option value="destination-in">Destination In</option>
                                <option value="destination-out">Destination Out</option>
                                <option value="destination-atop">Destination Atop</option>
                                <option value="lighter">Lighter</option>
                                <option value="copy">Copy</option>
                                <option value="xor">XOR</option>
                                <option value="multiply">Multiply</option>
                                <option value="screen">Screen</option>
                                <option value="overlay">Overlay</option>
                                <option value="darken">Darken</option>
                                <option value="lighten">Lighten</option>
                                <option value="color-dodge">Color Dodge</option>
                                <option value="color-burn">Color Burn</option>
                                <option value="hard-light">Hard Light</option>
                                <option value="soft-light">Soft Light</option>
                                <option value="difference">Difference</option>
                                <option value="exclusion">Exclusion</option>
                                <option value="hue">Hue</option>
                                <option value="saturation">Saturation</option>
                                <option value="color">Color</option>
                                <option value="luminosity">Luminosity</option>
                            </select>
                        </span>
                        <span>
                            <label htmlFor={"opacitySlider" + this.asset.id}>Opacity: {this.state.opacity}%</label>
                            <input
                                type="range"
                                id={"opacitySlider" + this.asset.id}
                                min={0}
                                max={100}
                                value={this.state.opacity}
                                onChange={e => this.updateFilter({opacity: e.target.value})}
                            />
                        </span>
                        <span>
                            <label htmlFor={"hueSlider" + this.asset.id}>Hue: {this.state.hue}°</label>
                            <input
                                type="range"
                                id={"hueSlider" + this.asset.id}
                                min={-180} max={180}
                                value={this.state.hue}
                                onChange={e => this.updateFilter({hue: e.target.value})}
                            />
                        </span>
                        <span>
                            <label htmlFor={"saturationSlider" + this.asset.id}>Saturation: {this.state.saturation}%</label>
                            <input
                                type="range"
                                id={"saturationSlider" + this.asset.id}
                                min={0}
                                max={200}
                                value={this.state.saturation}
                                onChange={e => this.updateFilter({saturation: e.target.value})}
                            />
                        </span>
                        <span>
                            <label htmlFor={"brightnessSlider" + this.asset.id}>Brightness: {this.state.brightness}%</label>
                            <input
                                type="range"
                                id={"brightnessSlider" + this.asset.id}
                                min={0}
                                max={200}
                                value={this.state.brightness}
                                onChange={e => this.updateFilter({brightness: e.target.value})}
                            />
                        </span>
                        <span>
                            <label htmlFor={"contrastSlider" + this.asset.id}>Contrast: {this.state.contrast}%</label>
                            <input
                                type="range"
                                id={"contrastSlider" + this.asset.id}
                                min={0}
                                max={200}
                                value={this.state.contrast}
                                onChange={e => this.updateFilter({contrast: e.target.value})}
                            />
                        </span>
                        <span>
                            <label htmlFor={"invertSlider" + this.asset.id}>Invert: {this.state.invert}%</label>
                            <input
                                type="range"
                                id={"invertSlider" + this.asset.id}
                                min={0}
                                max={100}
                                value={this.state.invert}
                                onChange={e => this.updateFilter({invert: e.target.value})}
                            />
                        </span>
                        <span>
                            <label htmlFor={"sepiaSlider" + this.asset.id}>Sepia: {this.state.sepia}%</label>
                            <input
                                type="range"
                                id={"sepiaSlider" + this.asset.id}
                                min={0}
                                max={100}
                                value={this.state.sepia}
                                onChange={e => this.updateFilter({sepia: e.target.value})}
                            />
                        </span>
                    </div>
                }
            </div>
        );
    }
}

class LayerManager extends Component {
    constructor(props) {
        super(props);

        this.state = {
            advanced: false,
            layers: props.layers,
            selectedLayer: null
        };
        // Should be receiving the sublayers of the layers, it doesn"t need the actual full layers object
        // Also why tf is layers a state and also not a state make it just a state bitch
        this.layers = props.layers;
    }

    setAdvanced = e => {
        this.setState({advanced: e.target.checked});
    }

    updateLayers = () => {
        this.setState({layers: this.layers});
        this.props.updateLayers(this.layers);
    }

    updateLayer = (index, newLayer) => {
        const oldLayer = this.layers.sublayers[index];
        this.layers.sublayers[index] = newLayer;

        if (oldLayer !== newLayer) oldLayer.cleanup();

        this.updateLayers();
    }

    moveLayer = (index, change) => {
        if (index + change < 0) change = this.layers.sublayers.length - 1;
        if (index + change >= this.layers.sublayers.length) change = 0 - (this.layers.sublayers.length - 1);
        const layer = this.layers.sublayers[index]
        this.layers.sublayers.splice(index, 1);
        this.layers.sublayers.splice(index + change, 0, layer);
        this.updateLayers();
    }

    duplicateLayer = index => {
        const copy = this.layers.sublayers[index].copy();
        copy.id = Math.random().toString(16).slice(2);
        this.layers.sublayers.splice(index + 1, 0, copy);
        this.updateLayers();
    }

    removeLayer = index => {
        this.layers.sublayers.splice(index, 1);
        this.updateLayers();
    }

    flattenLayer = index => {
        const flatLayer = new ImgMod.Img();
        flatLayer.name = this.layers.sublayers[index].name;
        flatLayer.id = Math.random().toString(16).slice(2);

        return this.layers.sublayers[index].render()
        .then(() => flatLayer.render(this.layers.sublayers[index].src)
        .then(() => this.updateLayer(index, flatLayer)));
    }

    mergeLayerDown = index => {
        if (index === 0 || this.layers.sublayers.length < 2) return;
        
        const topLayer = this.layers.sublayers[index];
        const bottomLayer = this.layers.sublayers[index - 1];
        const mergedLayer = new ImgMod.Layer();

        mergedLayer.name = topLayer.name + " + " + bottomLayer.name;
        mergedLayer.id = Math.random().toString(16).slice(2);
        mergedLayer.colors = [];
        mergedLayer.advanced = [];

        if (bottomLayer instanceof ImgMod.Layer) {
            mergedLayer.sublayers = bottomLayer.sublayers;
            mergedLayer.colors = mergedLayer.colors.concat(bottomLayer.colors);
            mergedLayer.advanced = bottomLayer.advanced;
        } else {
            mergedLayer.sublayers.push(bottomLayer);
            mergedLayer.colors.push("null");
            mergedLayer.advanced.push(true);
        }
        
        if (topLayer instanceof ImgMod.Layer) {
            mergedLayer.sublayers = mergedLayer.sublayers.concat(topLayer.sublayers);
            mergedLayer.colors = mergedLayer.colors.concat(topLayer.colors);
            mergedLayer.advanced = mergedLayer.advanced.concat(topLayer.advanced);
        } else {
            mergedLayer.sublayers.push(topLayer);
            mergedLayer.colors.push("null");
            mergedLayer.advanced.push(true);
        }

        this.layers.sublayers.splice(index, 1);
        this.layers.sublayers[index - 1] = mergedLayer;
        this.updateLayers();
    }

    selectForEdit = index => {
        this.setState({ selectedLayer: this.layers.sublayers[index].id });
    }

    addLayer = () => {
        const layer = new ImgMod.Img();
        layer.name = "New Layer";
        layer.id = Math.random().toString(16).slice(2);

        layer.render().then(() => {
            this.layers.sublayers.push(layer);
            this.updateLayers();
        });
    }

    render() {
        let elem = <div />;
        if (this.state.layers.sublayers.length) {
            elem = this.state.layers.sublayers.map((asset, i) => 
                <Layer
                    key={asset.id}
                    asset={asset}
                    index={i}
                    updateLayer={this.updateLayer}
                    moveLayer={this.moveLayer}
                    duplicateLayer={this.duplicateLayer}
                    removeLayer={this.removeLayer}
                    flattenLayer={this.flattenLayer}
                    mergeLayerDown={this.mergeLayerDown}
                    selectForEdit={this.selectForEdit}
                    advanced={this.state.advanced}
                />
            );
        }

        let selectedLayer = null;
        let selectedLayerIndex = null;
        for (let i = 0; i < this.layers.sublayers.length; i++) {
            if (this.layers.sublayers[i].id === this.state.selectedLayer) {
                selectedLayer = this.layers.sublayers[i];
                selectedLayerIndex = i;
                break;
            }
        }

        return (
            <div>
                <div className="LayerManager">
                    <div className="container layer-manager">
                        {elem}
                    </div>
                    <span>
                        <label htmlFor="advancedToggle">Advanced mode</label>
                        <input type="checkbox" id="advancedToggle" onClick={this.setAdvanced.bind(this)}/>
                        <button onClick={this.addLayer}>New Layer</button>
                    </span>
                </div>
                {selectedLayer && <DraggableWindow title={selectedLayer.name} pos={{x: 350, y: 0}} close={() => this.setState({ selectedLayer: null})} children={
                    <LayerEditor layer={selectedLayer} updateLayer={layer => this.updateLayer(selectedLayerIndex, layer)} slim={this.props.slim} />
                } />}
            </div>
        );
    }
}

export default LayerManager