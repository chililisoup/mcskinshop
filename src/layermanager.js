import React, { Component } from 'react';

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

class LayerManager extends Component {
    constructor(props) {
        super(props);

        this.state = {
            advanced: false,
            layers: props.layers
        };

        this.layers = props.layers;
    }

    removeLayer = (id) => {
        let index = this.layerIDs.indexOf(id);
        this.layers.sublayers.splice(index, 1);
        this.layerIDs.splice(index, 1);
        this.updateLayers();
    }

    moveLayer = (id, change) => {
        let index = this.layerIDs.indexOf(id);
        if (index + change < 0 || index + change >= this.layers.length) return;
        let layer = this.layers.sublayers[index]
        this.layers.sublayers.splice(index, 1);
        this.layers.sublayers.splice(index + change, 0, layer);
        this.layerIDs.splice(index, 1);
        this.layerIDs.splice(index + change, 0, id);
        this.updateLayers();
    }

    changeColor = (id, colorIndex, color) => {
        let index = this.layerIDs.indexOf(id);
        this.layers.sublayers[index].colors[colorIndex] = color.target.value;
        this.layers.sublayers[index].color().then(() => this.updateLayers());
    }


    updateLayers = () => {
        this.setState({layers: this.layers});
        this.props.updateLayers(this.layers);
    }

    setAdvanced = (e) => {
        this.setState({advanced: e.target.checked});
    }

    render() {
        this.layerIDs = Array.from(Array(this.layers.sublayers.length).keys());
        let elem = <div />;
        if (this.state.layers.sublayers.length) {
            elem = this.state.layers.sublayers.map((asset, i) => {
                let colors = [];
                if (asset?.colors) {
                    asset.colors.forEach((color, j) => {
                        if (color !== "null" && color !== "erase" && (!asset.advanced[j] || this.state.advanced)) {
                            colors.push(//nextId doesnt work figure this out
                                <input key={j} type="color" defaultValue={color} onChange={this.changeColor.bind(this, this.layerIDs[i], j)} />
                            );
                        }
                    });
                }

                return (
                    <div key={this.layerIDs[i]} className="manager-layer container">
                        <LayerPreview asset={asset} />
                        <div className="manager-layer-manager">
                            <button onClick={this.moveLayer.bind(this, this.layerIDs[i], -1)}>/\</button>
                            <button onClick={this.moveLayer.bind(this, this.layerIDs[i], 1)}>\/</button>
                            <button onClick={this.removeLayer.bind(this, this.layerIDs[i])}>X</button>
                        </div>
                        <div className="manager-layer-colors">
                            {colors}
                        </div>
                    </div>
                );
            });
        }
        return (
            <div>
                <input type="checkbox" onClick={this.setAdvanced.bind(this)}/>
                {elem}
            </div>
        );
    }
}

export default LayerManager