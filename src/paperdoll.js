import React, { Component } from "react";
import * as THREE from 'three';
import * as ImgMod from './imgmod';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import steve from "./assets/steve.png";
import alex from "./assets/alex.png";
import matcap from "./assets/matcap.png";
import skinmodel from "./skinmodel.json";

class PaperDollSettings extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            slim: props.slim || false,
            anim: props.anim == null ? true : props.anim,
            animSpeed: props.animSpeed == null ? 0.5 : props.animSpeed,
            explode: props.explode || false,
            shade: props.shade == null ? true : props.shade
        }
    }

    componentDidUpdate = prevProps => {
        if (this.props.slim !== prevProps.slim) this.setState({slim: this.props.slim});
    }

    updateSlim = bool => {
        this.setState({slim: bool});
        this.props.setSlim(bool);
    }

    updateAnim = bool => {
        this.setState({anim: bool});
        this.props.setAnim(bool);
    }

    updateAnimSpeed = speed => {
        this.setState({animSpeed: speed});
        this.props.setAnimSpeed(speed);
    }

    updateExplode = bool => {
        this.setState({explode: bool});
        this.props.setExplode(bool);
    }

    updateShade = bool => {
        this.setState({shade: bool});
        this.props.setShade(bool);
    }

    render() {
        return (
            <div>
                <span>
                    <div>
                        <label htmlFor="slimToggle">Slim</label>
                        <input type="checkbox" id="slimToggle" checked={this.props.slim} onChange={e => this.updateSlim(e.target.checked)}/>
                        <label htmlFor="animToggle">Animate</label>
                        <input type="checkbox" id="animToggle" checked={this.state.anim} onChange={e => this.updateAnim(e.target.checked)}/>
                        <input type="range" min={0} max={2} step={0.01} value={this.state.animSpeed} onChange={e => this.updateAnimSpeed(e.target.value)}/>
                        <label htmlFor="explodeToggle">Explode</label>
                        <input type="checkbox" id="explodeToggle" checked={this.state.explode} onChange={e => this.updateExplode(e.target.checked)}/>
                    </div>
                    <div>
                        <label htmlFor="shadeToggle">Shade</label>
                        <input type="checkbox" id="shadeToggle" checked={this.state.shade} onChange={e => this.updateShade(e.target.checked)}/>
                    </div>
                    <button onClick={this.props.saveRender}>Save Render</button>
                </span>
            </div>
        );
    }
}

class PaperDoll extends Component {
    constructor(props) {
        super(props);

        this.state = {
            anim: true,
            animSpeed: 0.5,
            explode: false,
            shade: true
        }

        this.canvasRef = React.createRef();
        this.clock = new THREE.Clock();
    }

    componentDidMount() {
        this.sceneSetup();
        this.modelSetup();
        this.updateSlim();
        this.updateExplode();
        this.updateShade();
        this.textureSetup();
        this.startAnimationLoop();
        window.addEventListener('resize', this.handleWindowResize);

        const img = new ImgMod.Img();
        img.render(this.props.skin).then(() => this.setState({slim: img.detectSlimModel()}));
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.handleWindowResize);
        window.cancelAnimationFrame(this.requestID);
        this.controls.dispose();
    }

    componentDidUpdate() {   
        this.updateSlim();
        this.updateExplode();
        this.updateShade();
        this.textureSetup();
    }

    sceneSetup = () => {
        const width = this.canvasRef.current.clientWidth;
        const height = this.canvasRef.current.clientHeight;

        this.scene = new THREE.Scene();

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvasRef.current,
            alpha: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio * 2);
        this.renderer.setSize(width, height);
        this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

        this.camera = new THREE.PerspectiveCamera(80, width / height, 0.1, 1000);
        this.camera.position.set(0, 18, 40);
        this.scene.add(this.camera);

        this.controls = new OrbitControls(this.camera, this.canvasRef.current);
        this.controls.target.set(0, 18, 0);
        this.controls.update();

        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
        directionalLight.position.set(1, 0, 1);
        this.camera.add(directionalLight);

        this.textureLoader = new THREE.TextureLoader();
        const matcapMap = this.textureLoader.load(matcap, matcapMap => matcapMap);
        this.shadedBaseMat = new THREE.MeshLambertMaterial({
            flatShading: true
        });
        this.shadedHatMat = new THREE.MeshLambertMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            flatShading: true,
            depthWrite: false
        });
        this.flatBaseMat = new THREE.MeshMatcapMaterial({
            flatShading: true,
            matcap: matcapMap
        });
        this.flatHatMat = new THREE.MeshMatcapMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            flatShading: true,
            depthWrite: false,
            matcap: matcapMap
        });
    };

    textureSetup = () => {
        const skin = this.props.skin == null ? (this.props.slim ? alex : steve) : this.props.skin;
        this.textureLoader.load(skin, texture => {
            texture.magFilter = THREE.NearestFilter;

            this.shadedBaseMat.map = texture;
            this.shadedBaseMat.needsUpdate = true;

            this.flatBaseMat.map = texture;
            this.flatBaseMat.needsUpdate = true;

            this.shadedHatMat.map = texture;
            this.shadedHatMat.needsUpdate = true;

            this.flatHatMat.map = texture;
            this.flatHatMat.needsUpdate = true;
        });
    }

    updateShade = () => 
        this.dollOrigin.children.forEach(pivot => pivot.children.forEach(part =>
            part.material = this[(
                this.state.shade ? "shaded" : "flat") + (part.hat ? "HatMat" : "BaseMat")]));

    modelPartSetup = (size, key, hat) => {
        let geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
        let uvAttribute = geometry.getAttribute("uv");

        skinmodel.parts[key][hat ? "hatUV" : "baseUV"]
        .forEach((v, i) => uvAttribute.setXY(i, v[0] / 64, v[1] / 64));

        return geometry;
    }

    modelSetup = () => {
        this.dollOrigin = new THREE.Object3D();
        this.scene.add(this.dollOrigin);

        for (const [k, v] of Object.entries(skinmodel.pivots)) {
            let pivot = new THREE.Object3D();
            pivot.position.y = v;
            this[k + "Pivot"] = pivot;
            this.dollOrigin.add(pivot);
        }

        for (const [k, v] of Object.entries(skinmodel.parts)) {
            let base = this.modelPartSetup(v.baseSize, k);
            let hat = this.modelPartSetup(v.hatSize, k, true);
            let pivot = this[v.pivot + "Pivot"];
            
            this[k + "Geometry"] = base
            this[k + "HatGeometry"] = hat

            base = new THREE.Mesh(base);
            hat = new THREE.Mesh(hat);

            base.position.set(v.position[0], v.position[1], 0);
            hat.position.set(v.position[0], v.position[1], 0);

            hat.hat = true;
            if (k.slice(-4) === "Slim") {
                base.slim = true;
                hat.slim = true;
            }

            pivot.add(base, hat);
        }
    };

    updateSlim = () => {
        this.rightArmPivot.children.forEach(e => {
            if (e.slim) e.visible = this.props.slim;
            else e.visible = !this.props.slim;
        });
        this.leftArmPivot.children.forEach(e => {
            if (e.slim) e.visible = this.props.slim;
            else e.visible = !this.props.slim;
        });
    };

    updateExplode = () => {
        let mod = this.state.explode ? 2.5 : 0;

        this.headPivot.position.y = 24 + mod;

        this.leftLegPivot.position.set(1.995 + (mod / 2), 12 - mod, 0);
        this.rightLegPivot.position.set(-1.995 - (mod / 2), 12 - mod, 0);

        this.leftArmPivot.position.x = 5 + mod;
        this.rightArmPivot.position.x = -5 - mod;
    }

    startAnimationLoop = () => {
        this.renderer.render(this.scene, this.camera);
        const delta = this.clock.getDelta();

        if (this.state.anim) {
            this.time = this.time || 0;
            this.time += delta * 8 * this.state.animSpeed;
            this.idleTime = this.idleTime || 0;
            this.idleTime += delta * 8;
            if (this.time > Math.PI * 20) this.time -= Math.PI * 20;
        }

        let rotation = Math.sin(this.time) * this.state.animSpeed;
        this.leftLegPivot.rotation.x = rotation;
        this.rightLegPivot.rotation.x = -rotation;
        this.leftArmPivot.rotation.x = -rotation;
        this.rightArmPivot.rotation.x = rotation;

        this.leftArmPivot.rotation.z = Math.sin(this.idleTime * 0.3) * 0.075 + 0.075;
        this.rightArmPivot.rotation.z = -this.leftArmPivot.rotation.z;

        this.requestID = window.requestAnimationFrame(this.startAnimationLoop);
    };

    handleWindowResize = () => {
        const width = this.canvasRef.current.clientWidth;
        const height = this.canvasRef.current.clientHeight;

        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;

        this.camera.updateProjectionMatrix();
    };

    saveRender = () => {
        const link = document.createElement("a");
        link.href = this.renderer.domElement.toDataURL();
        const name = window.prompt("Download as...", "My Skin Render");
        if (name === null) return;
        link.download = name + ".png";
        link.click();
    }

    setSlim = bool => {
        let state = {slim: bool};
        if (this.props.skin === steve || this.props.skin === alex) state.skin = bool ? alex : steve;
        this.setState(state);
        this.props.updateSlim(bool);
    }
    setAnim = bool => this.setState({anim: bool == null ? true : bool});
    setAnimSpeed = speed => this.setState({animSpeed: speed == null ? 1 : speed});
    setExplode = bool => this.setState({explode: bool || false});
    setShade = bool => this.setState({shade: bool == null ? true : bool});

    render() {
        return (
            <div className="paperdoll container">
                <PaperDollSettings
                    slim={this.props.slim}
                    anim={this.state.anim}
                    animSpeed={this.state.animSpeed}
                    explode={this.state.explode}
                    shade={this.state.shade}

                    setSlim={this.setSlim}
                    setAnim={this.setAnim}
                    setAnimSpeed={this.setAnimSpeed}
                    setExplode={this.setExplode}
                    setShade={this.setShade}
                    saveRender={this.saveRender}
                />
                <canvas className="paperdoll-canvas" ref={this.canvasRef} />
            </div>
        );
    }
}

export default PaperDoll;