import React, { Component } from "react";
import * as THREE from 'three';
import * as ImgMod from './imgmod';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import steve from "./assets/steve.png";
import alex from "./assets/alex.png";
import matcap from "./assets/matcap.png";
import skinmodel from "./skinmodel.json";

class PaperDollSettings extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            slim: props.settings.slim || false,
            anim: props.settings.anim == null ? true : props.settings.anim,
            animSpeed: props.settings.animSpeed == null ? 0.5 : props.settings.animSpeed,
            explode: props.settings.explode || false,
            shade: props.settings.shade == null ? true : props.settings.shade,
            lightAngle: props.settings.lightAngle == null ? Math.PI / 4 : props.settings.lightAngle,
            lightFocus: props.settings.lightFocus == null ? Math.SQRT2 : props.settings.lightFocus,
            pose: props.settings.pose || false,
            fov: props.settings.fov == null ? 80 : props.settings.fov
        }
    }

    componentDidUpdate = prevProps => {
        if (this.props.settings.slim !== prevProps.settings.slim)
            this.setState({slim: this.props.settings.slim});
    }

    updateSetting = (setting, value) => {
        const update = {};
        update[setting] = value;
        this.setState(update);
        this.props.updateSetting(setting, value);
    }

    toggleAnim = bool => {
        this.setState({
            anim: bool,
            pose: false
        });
        this.props.updateSetting("anim", bool);
    }

    togglePose = bool => {
        this.setState({
            pose: bool,
            anim: false
        });
        this.props.updateSetting("pose", bool);
    }

    render() {
        return (
            <div>
                <span>
                    <div>
                        <label htmlFor="slimToggle">Slim</label>
                        <input type="checkbox" id="slimToggle" checked={this.state.slim} onChange={e => this.updateSetting("slim", e.target.checked)}/>
                        <label htmlFor="animToggle">Animate</label>
                        <input type="checkbox" id="animToggle" checked={this.state.anim} onChange={e => this.toggleAnim(e.target.checked)}/>
                        <input type="range" min={0} max={2} step={0.01} value={this.state.animSpeed} onChange={e => this.updateSetting("animSpeed", e.target.value)}/>
                        <label htmlFor="explodeToggle">Explode</label>
                        <input type="checkbox" id="explodeToggle" checked={this.state.explode} onChange={e => this.updateSetting("explode", e.target.checked)}/>
                    </div>
                    <div>
                        <label htmlFor="shadeToggle">Shade</label>
                        <input type="checkbox" id="shadeToggle" checked={this.state.shade} onChange={e => this.updateSetting("shade", e.target.checked)}/>
                        <label htmlFor="lightFocus">Light Focus</label>
                        <input type="range" id="lightFocus" min={0} max={10} step={0.1} value={Math.sqrt(this.state.lightFocus)} onChange={e => this.updateSetting("lightFocus", e.target.value ** 2)}/>
                    </div>
                    <div>
                        <label htmlFor="lightAngle">Light Angle</label>
                        <input type="range" id="lightAngle" min={0} max={2 * Math.PI} step={0.1} value={this.state.lightAngle} onChange={e => this.updateSetting("lightAngle", e.target.value)}/>
                        <label htmlFor="poseToggle">Pose</label>
                        <input type="checkbox" id="poseToggle" checked={this.state.pose} onChange={e => this.togglePose(e.target.checked)}/>
                    </div>
                    <div>
                        <label htmlFor="fov">FOV ({this.state.fov})</label>
                        <input type="range" id="fov" min={30} max={120} step={1} value={this.state.fov} onChange={e => this.updateSetting("fov", e.target.value)}/>
                    </div>
                    <div>
                        <button onClick={this.props.resetCamera}>Reset Camera</button>
                        <button onClick={this.props.saveRender}>Save Render</button>
                    </div>
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
            shade: true,
            lightAngle: Math.PI / 4,
            lightFocus: Math.SQRT2,
            pose: false,
            fov: 80
        }

        this.canvasRef = React.createRef();
        this.clock = new THREE.Clock();
        this.mousePos = new THREE.Vector2(1, 1);
    }

    componentDidMount() {
        this.sceneSetup();
        this.modelSetup();
        this.updateSlim();
        this.updateExplode();
        this.updateShade();
        this.textureSetup();
        this.startAnimationLoop();

        this.canvasRef.current.addEventListener("mousemove", this.onMouseMove);
        this.canvasRef.current.addEventListener("mousedown", this.onMouseDown);
        this.canvasRef.current.addEventListener("mouseup", this.onMouseUp);
        this.canvasRef.current.addEventListener("contextmenu", this.onContextMenu);
        window.addEventListener("resize", this.handleWindowResize);

        const img = new ImgMod.Img();
        img.render(this.props.skin).then(() => this.setState({slim: img.detectSlimModel()}));
    }

    componentWillUnmount() {
        this.canvasRef.current.removeEventListener("mousemove", this.onMouseMove);
        this.canvasRef.current.removeEventListener("mousedown", this.onMouseDown);
        this.canvasRef.current.removeEventListener("mouseup", this.onMouseUp);
        this.canvasRef.current.removeEventListener("contextmenu", this.onContextMenu);
        window.removeEventListener("resize", this.handleWindowResize);
        window.cancelAnimationFrame(this.requestID);
        this.controls.dispose();
    }

    componentDidUpdate() {   
        this.updateSlim();
        this.updateExplode();
        this.updateShade();
        this.textureSetup();

        this.camera.fov = this.state.fov;
        this.camera.updateProjectionMatrix();
    }

    sceneSetup = () => {
        const width = this.canvasRef.current.clientWidth;
        const height = this.canvasRef.current.clientHeight;

        this.raycaster = new THREE.Raycaster();

        this.scene = new THREE.Scene();

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvasRef.current,
            alpha: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio * 2);
        this.renderer.setSize(width, height);
        this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

        this.camera = new THREE.PerspectiveCamera(this.state.fov, width / height, 0.1, 1000);
        this.camera.position.set(0, 18, 40);
        this.scene.add(this.camera);

        this.controls = new OrbitControls(this.camera, this.canvasRef.current);
        this.controls.target.set(0, 18, 0);
        this.controls.update();
        this.controls.saveState();

        this.composer = new EffectComposer(this.renderer);

        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        this.outlinePass = new OutlinePass(new THREE.Vector2(width, height), this.scene, this.camera);
        this.outlinePass.hiddenEdgeColor.set(0xffffff);
        this.outlinePass.edgeStrength = 10;
        this.outlinePass.edgeThickness = 3;
        this.composer.addPass(this.outlinePass);

        this.outputPass = new OutputPass();
        this.composer.addPass(this.outputPass);

        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(ambientLight);

        this.directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
        this.camera.add(this.directionalLight);

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

    updateShade = () => {
        this.directionalLight.position.set(
            Math.sin(this.state.lightAngle) * this.state.lightFocus,
            0,
            Math.cos(this.state.lightAngle) * this.state.lightFocus
        );
        this.dollOrigin.children.forEach(pivot => pivot.children.forEach(part =>
            part.material = this[(
                this.state.shade ? "shaded" : "flat") + (part.hat ? "HatMat" : "BaseMat")]));
    }

    modelPartSetup = (size, key, hat) => {
        const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
        const uvAttribute = geometry.getAttribute("uv");

        skinmodel.parts[key][hat ? "hatUV" : "baseUV"]
        .forEach((v, i) => uvAttribute.setXY(i, v[0] / 64, v[1] / 64));

        return geometry;
    }

    modelSetup = () => {
        this.dollOrigin = new THREE.Object3D();
        this.scene.add(this.dollOrigin);

        this.pivots = {};
        this.geometries = {};
        this.hatGeometries = {};

        for (const [k, v] of Object.entries(skinmodel.pivots)) {
            const pivot = new THREE.Object3D();
            pivot.position.y = v;
            pivot.name = k;
            this.pivots[k] = pivot;
            this.dollOrigin.add(pivot);
        }

        for (const [k, v] of Object.entries(skinmodel.parts)) {
            let base = this.modelPartSetup(v.baseSize, k);
            let hat = this.modelPartSetup(v.hatSize, k, true);
            const pivot = this.pivots[v.pivot];
            
            this.geometries[k] = base;
            this.hatGeometries[k] = hat;

            base = new THREE.Mesh(base);
            hat = new THREE.Mesh(hat);

            base.name = k + "Base";
            hat.name = k + "Hat";

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
        this.pivots.rightArm.children.forEach(e =>
            e.visible = !!e.slim == this.props.slim
        );
        this.pivots.leftArm.children.forEach(e =>
            e.visible = !!e.slim == this.props.slim
        );
    };

    updateExplode = () => {
        let mod = this.state.explode ? 2.5 : 0;

        this.pivots.head.position.y = 24 + mod;

        this.pivots.leftLeg.position.set(1.995 + (mod / 2), 12 - mod, 0);
        this.pivots.rightLeg.position.set(-1.995 - (mod / 2), 12 - mod, 0);

        this.pivots.leftArm.position.x = 5 + mod;
        this.pivots.rightArm.position.x = -5 - mod;
    }

    resetPose = () => {
        Object.values(this.pivots).forEach(pivot => {
            pivot.rotation.x = 0;
            pivot.rotation.y = 0;
            pivot.rotation.z = 0;
        });
    }

    animate = delta => {
        if (this.state.anim) {
            this.time = this.time || 0;
            this.time += delta * 8 * this.state.animSpeed;
            this.idleTime = this.idleTime || 0;
            this.idleTime += delta * 8;
            if (this.time > Math.PI * 20) this.time -= Math.PI * 20;
        }

        let rotation = Math.sin(this.time) * this.state.animSpeed;
        this.pivots.leftLeg.rotation.x = rotation;
        this.pivots.rightLeg.rotation.x = -rotation;
        this.pivots.leftArm.rotation.x = -rotation;
        this.pivots.rightArm.rotation.x = rotation;

        this.pivots.leftArm.rotation.z = Math.sin(this.idleTime * 0.3) * 0.075 + 0.075;
        this.pivots.rightArm.rotation.z = -this.pivots.leftArm.rotation.z;
    }

    pose = () => {
        if (this.oldMousePos && this.selectedObject) {
            if (this.mousePos.equals(this.oldMousePos)) return;

            let axis = new THREE.Vector3();
            this.camera.getWorldDirection(axis);

            const oldRad = new THREE.Vector2().copy(this.oldMousePos).sub(this.posePivot).angle();
            const newRad = new THREE.Vector2().copy(this.mousePos).sub(this.posePivot).angle();
            let angle = oldRad - newRad;

            this.selectedObject.rotateOnWorldAxis(axis, angle)

            this.oldMousePos = new THREE.Vector2().copy(this.mousePos);
            return;
        }

        this.raycaster.setFromCamera(this.mousePos, this.camera);
        const intersects = this.raycaster.intersectObject(this.scene, true);

        if (intersects.length > 0) {
            this.selectedObject = intersects[0].object.parent;
            this.outlinePass.selectedObjects = this.selectedObject.children.filter(child => !child.hat);
        } else {
            this.selectedObject = null;
            this.outlinePass.selectedObjects = [];
        }
    }

    startAnimationLoop = () => {
        const delta = this.clock.getDelta();

        if (this.state.pose) this.pose();
        else this.animate(delta);

        this.requestID = window.requestAnimationFrame(this.startAnimationLoop);
        this.composer.render();
    };

    onMouseMove = e => {
        if (!this.state.pose) return;

        const width = this.canvasRef.current.clientWidth;
        const height = this.canvasRef.current.clientHeight;
        
        this.mousePos.x = (e.offsetX / width) * 2 - 1;
        this.mousePos.y = (e.offsetY / height) * -2 + 1;
    }

    onMouseDown = e => {
        if (!this.state.pose) return;
        if (!this.selectedObject) return;
        if (e.button == 2) return;

        this.controls.enabled = false;

        this.oldMousePos = new THREE.Vector2().copy(this.mousePos);

        const posePivot = new THREE.Vector3().copy(this.selectedObject.position).project(this.camera);
        this.posePivot = new THREE.Vector2(posePivot.x, posePivot.y);
    }

    onMouseUp = () => {
        this.controls.enabled = true;
        this.oldMousePos = null;
        this.posePivot = null;
    }

    onContextMenu = e => {
        if (!this.state.pose) return;
        if (!this.selectedObject) return;

        this.controls.enabled = false;

        this.selectedObject.rotation.x = 0;
        this.selectedObject.rotation.y = 0;
        this.selectedObject.rotation.z = 0;

        e.preventDefault();
    }

    handleWindowResize = () => {
        const width = this.canvasRef.current.clientWidth;
        const height = this.canvasRef.current.clientHeight;

        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);

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

    updateSetting = (setting, value) => {
        switch(setting) {
            case "slim":
                let state = {slim: value};
                if (this.props.skin === steve || this.props.skin === alex) state.skin = value ? alex : steve;
                this.setState(state);
                this.props.updateSlim(value);
                break;
            case "anim":
                this.setState({
                    anim: value == null ? true : value,
                    pose: false
                });
                this.outlinePass.selectedObjects = [];
                this.resetPose();
                break;
            case "pose":
                this.setState({
                    pose: value == null ? true : value,
                    anim: false
                });
                this.outlinePass.selectedObjects = [];
                this.resetPose();
                break;
            default:
                const update = {};
                update[setting] = value;
                this.setState(update);
        }
    }

    render() {
        return (
            <div className="paperdoll container">
                <PaperDollSettings
                    settings={{
                        slim: this.props.slim,
                        anim: this.props.anim,
                        animSpeed: this.props.animSpeed,
                        explode: this.props.explode,
                        shade: this.props.shade,
                        lightAngle: this.state.lightAngle,
                        lightFocus: this.state.lightFocus,
                        pose: this.state.pose,
                        fov: this.state.fov
                    }}
                    updateSetting={this.updateSetting}
                    saveRender={this.saveRender}
                    resetCamera={() => this.controls.reset()}
                />
                <canvas className="paperdoll-canvas" ref={this.canvasRef} />
            </div>
        );
    }
}

export default PaperDoll;