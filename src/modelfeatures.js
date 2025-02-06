import React, { Component } from 'react';
import * as ImgMod from './imgmod';
import asset_map from './asset_map.json';
import Dropdown from './dropdown';
import GridSelect from './gridselect';

class FeatureEntry extends Component {
    render() {
        return (
            <Dropdown title={this.props.title} children={
                <span>
                    <button onClick={this.props.uploadCustom}>Upload custom...</button>
                    <GridSelect
                        emptyOption
                        targetWidth={this.props.targetGridEntryWidth || 100}
                        options={this.props.options}
                        select={this.props.changeFeature}
                    />
                </span>
            } />
        );
    }
}

class ModelFeatures extends Component {
    constructor(props) {
        super(props);

        this.state = {
            cape: false,
            helmet: false,
            chestplate: false,
            leggings: false,
            boots: false,
            availableCapes: this.getFeatureAssets("capes"),
            availableHelmets: this.getFeatureAssets("equipment"), // Helmets, chestplates, and boots share a texture file
            availableChestplates: this.getFeatureAssets("equipment", ["turtle_scute"]),
            availableLeggings: this.getFeatureAssets("leggings"),
            availableBoots: this.getFeatureAssets("equipment", ["turtle_scute"])
        };

        this.uploadRef = React.createRef();
        this.uploadFeature = false;
    }

    getFeatureAssets = (feature, exclusions) => {
        exclusions = exclusions || [];
        return asset_map[feature].map(asset => [
            asset.substring(0, asset.lastIndexOf(".")),
            `/assets/features/${feature}/${asset}`
        ]).filter(asset => !exclusions.includes(asset[0]));
    }

    changeFeature = (feature, value) => {
        const features = {
            cape: this.state.cape,
            helmet: this.state.helmet,
            chestplate: this.state.chestplate,
            leggings: this.state.leggings,
            boots: this.state.boots
        };
        features[feature] = value;
        this.setState(features);
        this.props.updateFeatures(features);
    }

    onCustomUpload = e => {
        const image = new ImgMod.Img();
        image.size = this.uploadFeature[1];
        image.name = e.target.files[0].name;
        image.id = Math.random().toString(16).slice(2);
        
        image.render(URL.createObjectURL(e.target.files[0]))
        .then(() => {
            e.target.value = "";

            const updatedFeatures = this.state[this.uploadFeature[0]];
            updatedFeatures.push([
                image.name,
                image.src
            ]);

            const stateUpdate = {};
            stateUpdate[this.uploadFeature[0]] = updatedFeatures;
            this.setState(stateUpdate);
            
            this.uploadFeature = false;
        });
    }

    // Takes array of 2 items
    // First is name of feature list defined in state
    // Second is array of [width, height] for texture resolution
    uploadCustom = feature => {
        if (this.uploadFeature) return;

        this.uploadFeature = feature;
        this.uploadRef.current.click();
    }

    render() {
        return (
            <div className="model-features container">
                <input className="hidden" ref={this.uploadRef} type="file" accept="image/png" onChange={this.onCustomUpload} />
                <p>Model Features</p>
                <br />
                <FeatureEntry
                    title="Capes"
                    uploadCustom={() => this.uploadCustom(["availableCapes", [64, 32]])}
                    options={this.state.availableCapes}
                    changeFeature={option => this.changeFeature("cape", option)}
                />
                <FeatureEntry
                    title="Helmets"
                    uploadCustom={() => this.uploadCustom(["availableHelmets", [64, 32]])}
                    options={this.state.availableHelmets}
                    changeFeature={option => this.changeFeature("helmet", option)}
                />
                <FeatureEntry
                    title="Chestplates"
                    uploadCustom={() => this.uploadCustom(["availableChestplates", [64, 32]])}
                    options={this.state.availableChestplates}
                    changeFeature={option => this.changeFeature("chestplate", option)}
                />
                <FeatureEntry
                    title="Leggings"
                    uploadCustom={() => this.uploadCustom(["availableLeggings", [64, 32]])}
                    options={this.state.availableLeggings}
                    changeFeature={option => this.changeFeature("leggings", option)}
                />
                <FeatureEntry
                    title="Boots"
                    uploadCustom={() => this.uploadCustom(["availableBoots", [64, 32]])}
                    options={this.state.availableBoots}
                    changeFeature={option => this.changeFeature("boots", option)}
                />
            </div>
        );
    }
}

export default ModelFeatures;