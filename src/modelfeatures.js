import React, { Component } from 'react';
import asset_map from './asset_map.json';
import Dropdown from './dropdown';
import GridSelect from './gridselect';

class ModelFeatures extends Component {
    constructor(props) {
        super(props);

        this.state = {
            cape: false
        }
    }

    changeFeature = (feature, value) => {
        const features = {
            cape: this.state.cape
        };
        features[feature] = value;
        this.setState(features);
        this.props.updateFeatures(features);
    }

    render() {
        return (
            <div className="model-features container">
                <p>Model Features</p>
                <Dropdown title="Capes" children={
                    <span>
                        <label htmlFor="capeSelect">Cape</label>
                        <GridSelect
                            emptyOption
                            targetWidth={100}
                            options={
                                asset_map.capes.map(cape => [
                                    cape.substring(0, cape.lastIndexOf(".")),
                                    "/assets/capes/" + cape
                                ])
                            }
                            select={option => this.changeFeature("cape", option)}
                        />
                    </span>
                } />
            </div>
        );
    }
}

export default ModelFeatures;