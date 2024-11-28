import React, { Component } from "react";
import * as THREE from 'three';
import * as ImgMod from './imgmod';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from "three/addons/postprocessing/SMAAPass";
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
            poseSettings: props.settings.poseSettings || {
                mode: "Simple",
                type: "Rotation",
                space: "Global"
            },
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

    settingEdit = (setting, from, to) => {
        const update = {};
        update[setting] = from;
        this.setState(update);
        this.props.updateSetting(setting, from);

        return () => this.settingEdit(setting, to, from);
    }

    updateSettingFinish = (setting, value) => {
        const from = this.state[setting];

        this.updateSetting(setting, value);

        this.props.addEdit(
            "change " + setting,
            () => this.settingEdit(setting, from, value)
        );
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
            anim: false,
            explode: false
        });
        this.props.updateSetting("pose", bool);
    }

    changePoseSetting = setting => {
        let poseSettings = {
            mode: this.state.poseSettings.mode,
            type: this.state.poseSettings.type,
            space: this.state.poseSettings.space
        };

        let newValue;

        switch (setting) {
            case "mode":
                newValue = this.state.poseSettings.mode === "Simple" ? "Controlled" : "Simple";
                break;
            case "type":
                newValue = this.state.poseSettings.type === "Rotation" ? "Position" : "Rotation";
                break;
            case "space":
                newValue = this.state.poseSettings.space === "Global" ? "Local" : "Global";
                break;
            default:
                return;
        }

        poseSettings[setting] = newValue;

        this.setState({ poseSettings: poseSettings });
        this.props.updateSetting("poseSettings", poseSettings);
    }

    render() {
        return (
            <span>
                <div>
                    <label htmlFor="slimToggle">Slim</label>
                    <input type="checkbox" id="slimToggle" checked={this.state.slim} onChange={e => this.updateSettingFinish("slim", e.target.checked)}/>
                    <label htmlFor="animToggle">Animate</label>
                    <input type="checkbox" id="animToggle" checked={this.state.anim} onChange={e => this.toggleAnim(e.target.checked)}/>
                    <input type="range" min={0} max={2} step={0.01} value={this.state.animSpeed} onChange={e => this.updateSetting("animSpeed", e.target.value)}/>
                    <label htmlFor="explodeToggle">Explode</label>
                    <input disabled={this.state.pose} type="checkbox" id="explodeToggle" checked={this.state.explode} onChange={e => this.updateSettingFinish("explode", e.target.checked)}/>
                </div>
                <div>
                    <label htmlFor="shadeToggle">Shade</label>
                    <input type="checkbox" id="shadeToggle" checked={this.state.shade} onChange={e => this.updateSettingFinish("shade", e.target.checked)}/>
                    <label htmlFor="lightFocus">Light Focus</label>
                    <input type="range" id="lightFocus" min={0} max={10} step={0.1} value={Math.sqrt(this.state.lightFocus)} onChange={e => this.updateSetting("lightFocus", e.target.value ** 2)}/>
                </div>
                <div>
                    <label htmlFor="lightAngle">Light Angle</label>
                    <input type="range" id="lightAngle" min={0} max={2 * Math.PI} step={0.1} value={this.state.lightAngle} onChange={e => this.updateSetting("lightAngle", e.target.value)}/>
                    <label htmlFor="fov">FOV ({this.state.fov})</label>
                    <input type="range" id="fov" min={30} max={120} step={1} value={this.state.fov} onChange={e => this.updateSetting("fov", e.target.value)}/>
                </div>
                <span>
                    <div>
                        <label htmlFor="poseToggle">Pose</label>
                        <input type="checkbox" id="poseToggle" checked={this.state.pose} onChange={e => this.togglePose(e.target.checked)}/>
                        <label htmlFor="poseMode">Pose Mode</label>
                        <button id="poseMode" onClick={() => this.changePoseSetting("mode")}>{this.state.poseSettings.mode}</button>
                        <label htmlFor="poseType">Pose Type</label>
                        <button id="poseType" onClick={() => this.changePoseSetting("type")}>{this.state.poseSettings.type}</button>
                        <label htmlFor="poseSpace">Pose Space</label>
                        <button id="poseSpace" onClick={() => this.changePoseSetting("space")}>{this.state.poseSettings.space}</button>
                        <button onClick={this.props.deselect}>Deselect</button>
                    </div>
                </span>
                <div>
                    <button onClick={this.props.resetCamera}>Reset Camera</button>
                    <button onClick={this.props.saveRender}>Save Render</button>
                </div>
            </span>
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
            poseSettings: {
                mode: "Simple",
                type: "Rotation",
                space: "Global"
            },
            fov: 80
        }

        this.canvasRef = React.createRef();
        this.clock = new THREE.Clock();
        this.mousePos = new THREE.Vector2(1, 1);
    }

    componentDidMount() {
        this.sceneSetup();
        this.createHandles();
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

    componentDidUpdate(prevProps, prevState) {
        if (this.state.explode !== prevState.explode) this.updateExplode();

        let updateTextures = false;

        if (this.props.slim !== prevProps.slim) {
            this.updateSlim();
            updateTextures = true;
        }

        if (this.state.shade !== prevState.shade) {
            this.updateShade();
            updateTextures = true;
        }

        if (this.props.skin !== prevProps.skin) {
            updateTextures = true;
        }

        if (updateTextures) this.textureSetup();

        this.camera.fov = this.state.fov;
        this.handleWindowResize();
    }

    sceneSetup = () => {
        const width = this.canvasRef.current.parentNode.clientWidth;
        const height = this.canvasRef.current.parentNode.clientHeight;

        this.raycaster = new THREE.Raycaster();

        this.scene = new THREE.Scene();

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvasRef.current,
            alpha: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
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

        this.hoveredOutlinePass = new OutlinePass(new THREE.Vector2(width, height), this.scene, this.camera);
        this.hoveredOutlinePass.hiddenEdgeColor.set(0xffffff);
        this.hoveredOutlinePass.edgeStrength = 3;
        this.hoveredOutlinePass.edgeThickness = 1;
        this.composer.addPass(this.hoveredOutlinePass);

        this.selectedOutlinePass = new OutlinePass(new THREE.Vector2(width, height), this.scene, this.camera);
        this.selectedOutlinePass.hiddenEdgeColor.set(0xff7e1c);
        this.selectedOutlinePass.edgeStrength = 3;
        this.selectedOutlinePass.edgeThickness = 1;
        this.composer.addPass(this.selectedOutlinePass);

        this.outputPass = new OutputPass();
        this.composer.addPass(this.outputPass);

        this.SMAAPass = new SMAAPass();
        this.composer.addPass(this.SMAAPass);

        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(ambientLight);

        this.directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
        this.camera.add(this.directionalLight);

        this.textureLoader = new THREE.TextureLoader();
        this.matcapMap = this.textureLoader.load(matcap, matcapMap => matcapMap);

        // Debug geometry, can move it to positions to reference code :)
        // this.sphere = new THREE.Mesh(
        //     new THREE.SphereGeometry(1, 32, 16),
        //     new THREE.MeshBasicMaterial({
        //         color: 0xffff00,
        //         depthTest: false,
        //         transparent: true,
        //         opacity: 0.33
        //     })
        // );
        // this.scene.add(this.sphere);
    };

    createRotationHandle = (color, name, normal, rotation) => {
        const handle = new THREE.Mesh(
            new THREE.TorusGeometry(5, 0.3, 8, 32),
            new THREE.MeshBasicMaterial({
                color: color,
                depthTest: false,
                transparent: true,
                opacity: 0.33
            })
        );
        
        handle.name = name;
        handle.normal = new THREE.Vector3().fromArray(normal);
        handle.setRotationFromEuler(new THREE.Euler().setFromVector3(new THREE.Vector3().fromArray(rotation).multiplyScalar(Math.PI / 2)));
        handle.renderOrder = 999;
        handle.noOutline = true;

        return handle;
    }

    createPositionHandle = (color, name, normal, rotation) => {
        const handle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 10, 32),
            new THREE.MeshBasicMaterial({
                color: color,
                depthTest: false,
                transparent: true,
                opacity: 0.33
            })
        );
        
        handle.name = name;
        handle.normal = new THREE.Vector3().fromArray(normal);
        handle.setRotationFromEuler(new THREE.Euler().setFromVector3(new THREE.Vector3().fromArray(rotation).multiplyScalar(Math.PI / 2)));
        handle.renderOrder = 999;
        handle.noOutline = true;

        return handle;
    }

    createHandles = () => {
        this.handles = new THREE.Object3D();
        
        const rotationHandles = new THREE.Object3D();
        rotationHandles.name = "rotationHandles";
        rotationHandles.add(this.createRotationHandle(0xff0000, "x", [1, 0, 0], [0, 1, 0]));
        rotationHandles.add(this.createRotationHandle(0x00ff00, "y", [0, 1, 0], [1, 0, 0]));
        rotationHandles.add(this.createRotationHandle(0x0000ff, "z", [0, 0, 1], [0, 0, 0]));
        this.handles.add(rotationHandles);

        const positionHandles = new THREE.Object3D();
        positionHandles.name = "positionHandles";
        positionHandles.add(this.createPositionHandle(0xff0000, "x", [1, 0, 0], [0, 0, 1]));
        positionHandles.add(this.createPositionHandle(0x00ff00, "y", [0, 1, 0], [0, 0, 0]));
        positionHandles.add(this.createPositionHandle(0x0000ff, "z", [0, 0, 1], [1, 0, 0]));
        this.handles.add(positionHandles);
    }

    textureSetup = () => {
        const skin = this.props.skin == null ? (this.props.slim ? alex : steve) : this.props.skin;
        this.textureLoader.load(skin, texture => {
            texture.magFilter = THREE.NearestFilter;

            this.materials[this.state.shade ? "shaded" : "flat"].forEach(mat => {
                mat.map = texture;
                mat.needsUpdate = true;
            });
        });
    }

    propagateShade = part => {
        if (part.materialIndex !== null) {
            part.material = this.materials[this.state.shade ? "shaded" : "flat"][part.materialIndex];
        }

        part.children.forEach(this.propagateShade);
    }

    updateShade = () => {
        this.directionalLight.position.set(
            Math.sin(this.state.lightAngle) * this.state.lightFocus,
            0,
            Math.cos(this.state.lightAngle) * this.state.lightFocus
        );

        this.propagateShade(this.doll);
    }

    eatChild = (name, child) => {
        let part;

        if (child.shape) {
            const geometry = new THREE.BoxGeometry(child.shape[0], child.shape[1], child.shape[2]);

            if (child.uv) {
                const uvAttribute = geometry.getAttribute("uv");
                child.uv.forEach((v, i) => uvAttribute.setXY(i, v[0] / 64, v[1] / 64));
            }

            let shadedMat, flatMat;

            part = new THREE.Mesh(geometry);
            if (child.renderType === "cutout") {
                part.renderType = "cutout";

                shadedMat = new THREE.MeshLambertMaterial({
                    side: THREE.DoubleSide,
                    transparent: true,
                    flatShading: true,
                    alphaTest: 0.001
                });

                flatMat = new THREE.MeshMatcapMaterial({
                    side: THREE.DoubleSide,
                    transparent: true,
                    flatShading: true,
                    alphaTest: 0.001,
                    matcap: this.matcapMap
                });
            } else {
                shadedMat = new THREE.MeshLambertMaterial({
                    flatShading: true
                });

                flatMat = new THREE.MeshMatcapMaterial({
                    flatShading: true,
                    matcap: this.matcapMap
                });
            }

            part.materialIndex = this.materials.shaded.push(shadedMat) - 1;
            this.materials.flat.push(flatMat);

        } else part = new THREE.Group();

        if (child.children) for (const [k, v] of Object.entries(child.children))
            part.add(this.eatChild(k, v));

        if (child.position) part.position.fromArray(child.position);

        if (child.poseable) {
            part.poseable = true;
            part.defaultPosition = part.position.clone();
            this.pivots[name] = part;
        }

        part.name = name;

        return part;
    }

    modelSetup = () => {
        this.materials = {
            shaded: [],
            flat: []
        };
        this.pivots = {};
        this.doll = new THREE.Object3D();
        this.doll.name = "doll";
        this.scene.add(this.doll);

        for (const [k, v] of Object.entries(skinmodel))
            this.doll.add(this.eatChild(k, v));
    };

    updateSlim = () => {
        this.pivots.rightArm.children[0].visible = !this.props.slim;
        this.pivots.rightArm.children[1].visible = this.props.slim;
        this.pivots.leftArm.children[0].visible = !this.props.slim;
        this.pivots.leftArm.children[1].visible = this.props.slim;
    };

    updateExplode = () => {
        let mod = this.state.explode ? 2.5 : 0;

        this.pivots.head.position.y = skinmodel.head.position[1] + mod;

        this.pivots.leftLeg.position.fromArray(skinmodel.torso.children.leftLeg.position).add(new THREE.Vector3(mod / 2, -mod, 0));
        this.pivots.rightLeg.position.fromArray(skinmodel.torso.children.rightLeg.position).add(new THREE.Vector3(-mod / 2, -mod, 0));

        this.pivots.leftArm.position.x = skinmodel.torso.children.leftArm.position[0] + mod;
        this.pivots.rightArm.position.x = skinmodel.torso.children.rightArm.position[0] - mod;
    }

    resetPose = () => {
        Object.values(this.pivots).forEach(pivot => {
            pivot.position.copy(pivot.defaultPosition);
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

    findPosableAncestor = part => {
        if (part.poseable) return part;
        if (part.parent) return this.findPosableAncestor(part.parent);
        return false;
    }

    filterOutline = part => {
        let children = [];

        if (part.children.length > 0) {
            part.children.forEach(child => {
                children = children.concat(this.filterOutline(child));
            });
        } else if (part.renderType !== "cutout" && !part.poseable && part.visible && !part.noOutline)
            children = [part];

        return children;
    }

    getClipZ = part => {
        return part.getWorldPosition(new THREE.Vector3()).project(this.camera).z;
    }

    clipToWorldSpace = (position, clipZ) => {
        return new THREE.Vector3(
            position.x,
            position.y,
            clipZ
        ).unproject(this.camera);
    }

    poseRotation = () => {
        if (this.state.poseSettings.mode === "Controlled") {
            if (!this.handle) return;

            const localRotation = this.selectedObject.getWorldQuaternion(new THREE.Quaternion());
            const worldPivotPos = this.selectedObject.getWorldPosition(new THREE.Vector3());
            const norm = this.handle.normal.clone().applyQuaternion(localRotation);

            const start = this.clipToWorldSpace(this.mousePos, 0.5);
            const lineDirection = this.clipToWorldSpace(this.mousePos, 0.9).sub(start).normalize();
            start.sub(worldPivotPos);

            const line = new THREE.Line3(
                start,
                start.clone().addScaledVector(lineDirection, 500)
            );

            const plane = new THREE.Plane(norm);

            const intersect = new THREE.Vector3();
            const result = plane.intersectLine(line, intersect);
            if (!result) return;

            if (!this.oldHandlePos) {
                this.oldHandlePos = intersect;
                return;
            }

            const vec1 = this.oldHandlePos.clone().normalize();
            const vec2 = intersect.clone().normalize();

            const matrix = new THREE.Matrix3(
                vec1.x, vec1.y, vec1.z,
                vec2.x, vec2.y, vec2.z,
                norm.x, norm.y, norm.z
            );

            const angle = Math.atan2(
                matrix.determinant(),
                vec1.dot(vec2)
            );

            this.selectedObject.rotateOnAxis(this.handle.normal, angle);

            this.oldHandlePos = intersect;

        } else { // Simple mode
            const axis = this.camera.getWorldDirection(new THREE.Vector3());

            const oldRad = this.oldMousePos.clone().sub(this.posePivot).angle();
            const newRad = this.mousePos.clone().sub(this.posePivot).angle();
            const angle = oldRad - newRad;

            const parentInvQuat = this.selectedObject.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
            const rotQuat = new THREE.Quaternion().setFromAxisAngle(axis, angle);
            const worldQuat = this.selectedObject.getWorldQuaternion(new THREE.Quaternion());

            const finalQuat = parentInvQuat.clone().multiply(new THREE.Quaternion().multiplyQuaternions(rotQuat, worldQuat));

            this.selectedObject.setRotationFromQuaternion(finalQuat);
        }
    }

    posePosition = () => {
        const clipZ = this.getClipZ(this.selectedObject);

        if (this.state.poseSettings.mode === "Controlled") {
            if (!this.handle) return;

            const localRotation = this.selectedObject.getWorldQuaternion(new THREE.Quaternion());
            const worldPivotPos = this.selectedObject.getWorldPosition(new THREE.Vector3());
            const norm = this.handle.normal.clone().applyQuaternion(localRotation);

            const line = new THREE.Line3(
                worldPivotPos,
                worldPivotPos.clone().add(norm)
            );

            const linePos = line.closestPointToPoint(this.clipToWorldSpace(this.mousePos, clipZ), false, new THREE.Vector3());
            const oldLinePos = line.closestPointToPoint(this.clipToWorldSpace(this.oldMousePos, clipZ), false, new THREE.Vector3());

            const movement = linePos.sub(oldLinePos);
            this.selectedObject.position.add(movement);

        } else { // Simple mode
            const movement = this.clipToWorldSpace(this.mousePos, clipZ)
                .sub(this.clipToWorldSpace(this.oldMousePos, clipZ));

            this.selectedObject.position.add(movement);
        }
    }

    pose = () => {
        this.raycaster.setFromCamera(this.mousePos, this.camera);
        this.hoveredHandle = null;
        const isRotationMode = this.state.poseSettings.type === "Rotation";

        if (this.selectedObject) {
            if (this.state.poseSettings.mode === "Controlled") {
                this.selectedObject.add(this.handles);
                this.handles.getObjectByName("rotationHandles").visible = isRotationMode;
                this.handles.getObjectByName("positionHandles").visible = !isRotationMode;

                if (!this.handle) {
                    const handleIntersects = this.raycaster.intersectObject(this.handles, true);
                    this.hoveredHandle = handleIntersects.length > 0 ? handleIntersects[0].object : false;

                    this.handles.children.forEach(handleGroup =>
                        handleGroup.children.forEach(child => {
                            child.material.opacity = 0.33;
                            child.renderOrder = 999;
                        }
                    ));

                    if (this.hoveredHandle) {
                        this.hoveredHandle.material.opacity = 1;
                        this.hoveredHandle.renderOrder = 1000;
                    }
                }
            }

            if (this.oldMousePos) {
                if (this.mousePos.equals(this.oldMousePos)) return;

                if (isRotationMode)
                    this.poseRotation();
                else
                    this.posePosition();

                this.oldMousePos = new THREE.Vector2().copy(this.mousePos);
            }

            this.selectedOutlinePass.selectedObjects = this.filterOutline(this.selectedObject);
        } else {
            this.selectedOutlinePass.selectedObjects = [];
            this.handles.removeFromParent();
        }

        this.hoveredObject = null;
        this.hoveredOutlinePass.selectedObjects = [];

        if (!this.hoveredHandle && !this.handle) {
            const intersects = this.raycaster.intersectObject(this.scene, true);
            const poseable = intersects.length > 0 ? this.findPosableAncestor(intersects[0].object) : false;

            if (poseable) {
                this.hoveredObject = poseable;
                if (poseable !== this.selectedObject)
                    this.hoveredOutlinePass.selectedObjects = this.filterOutline(poseable);
            }
        }
    }

    renderFrame = () => {
        const delta = this.clock.getDelta();

        if (this.state.pose) this.pose();
        else this.animate(delta);

        this.composer.render();
    }

    startAnimationLoop = () => {
        this.renderFrame();

        this.requestID = window.requestAnimationFrame(this.startAnimationLoop);
    };

    poseUndo = (obj, start) => {
        const redoStart = new THREE.Object3D();
        redoStart.setRotationFromEuler(obj.rotation);
        redoStart.position.copy(obj.position);

        const redoProphecy = () => this.poseUndo(obj, redoStart);
        obj.setRotationFromEuler(start.rotation);
        obj.position.copy(start.position);
        
        return redoProphecy;
    }

    addPoseEdit = (prefix, suffix) => {
        const obj = this.selectedObject;

        const start = new THREE.Object3D();
        start.setRotationFromEuler(obj.rotation);
        start.position.copy(obj.position);

        suffix = suffix == null ? "" : " " + suffix;

        this.props.addEdit(
            prefix + " " + obj.name + suffix,
            () => this.poseUndo(obj, start)
        );
    }

    onMouseMove = e => {
        if (!this.state.pose) return;

        const width = this.canvasRef.current.parentNode.clientWidth;
        const height = this.canvasRef.current.parentNode.clientHeight;
        
        this.mousePos.x = (e.offsetX / width) * 2 - 1;
        this.mousePos.y = (e.offsetY / height) * -2 + 1;

        if (this.queuedPoseEdit) {
            this.queuedPoseEdit = null;
            this.addPoseEdit("pose");
        }
    }

    onMouseDown = e => {
        if (!this.state.pose) return;
        if (e.button === 2) return;

        if (this.state.poseSettings.mode === "Controlled") {
            if (this.hoveredObject) {
                this.selectedObject = this.hoveredObject;
                return;
            } else if (!this.hoveredHandle) return;
            this.handle = this.hoveredHandle;
        } else {
            if (!this.hoveredObject) return;
            this.selectedObject = this.hoveredObject;

            const posePivot = this.selectedObject.getWorldPosition(new THREE.Vector3()).project(this.camera);
            this.posePivot = new THREE.Vector2(posePivot.x, posePivot.y);
        }

        this.controls.enabled = false;
        this.oldMousePos = new THREE.Vector2().copy(this.mousePos);

        this.queuedPoseEdit = this.selectedObject.position.clone();
    }

    onMouseUp = () => {
        if (this.state.poseSettings.mode === "Simple") {
            this.selectedObject = null;
        }

        this.controls.enabled = true;
        this.oldMousePos = null;
        this.oldHandlePos = null;
        this.posePivot = null;
        this.queuedPoseEdit = null;
        this.handle = null;
    }

    onContextMenu = e => {
        if (!this.state.pose) return;
        if (!this.hoveredObject) return;

        if (this.state.poseSettings.mode === "Controlled") {
            if (this.selectedObject !== this.hoveredObject) return;
        }

        this.selectedObject = this.hoveredObject;
        this.controls.enabled = false;

        const isRotationMode = this.state.poseSettings.type === "Rotation";
        
        this.addPoseEdit("reset", isRotationMode ? "rotation" : "position");

        const obj = this.selectedObject;
        
        if (isRotationMode) {
            obj.rotation.x = 0;
            obj.rotation.y = 0;
            obj.rotation.z = 0;
        } else {
            obj.position.copy(obj.defaultPosition);
        }

        e.preventDefault();
    }

    deselect = () => {
        this.selectedObject = null;
        this.hoveredOutlinePass.selectedObjects = [];
        this.selectedOutlinePass.selectedObjects = [];
        this.handles.removeFromParent();
    }

    handleWindowResize = () => {
        const width = this.canvasRef.current.parentNode.clientWidth;
        const height = this.canvasRef.current.parentNode.clientHeight;

        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    };

    saveRender = () => {
        const scale = Number(window.prompt("Render Scale (1-4):", 1));
        if (isNaN(scale) || scale < 1 || scale > 4) return;

        const width = this.canvasRef.current.parentNode.clientWidth;
        const height = this.canvasRef.current.parentNode.clientHeight;

        this.SMAAPass.enabled = false;
        this.hoveredOutlinePass.enabled = false;
        this.selectedOutlinePass.enabled = false;
        this.handles.visible = false;
        this.renderer.setSize(width * scale, height * scale);
        this.composer.setSize(width * scale, height * scale);
        this.renderFrame();

        const data = this.renderer.domElement.toDataURL();

        this.SMAAPass.enabled = true;
        this.hoveredOutlinePass.enabled = true;
        this.selectedOutlinePass.enabled = true;
        this.handles.visible = true;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.handleWindowResize();

        const link = document.createElement("a");
        link.href = data
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
                this.hoveredOutlinePass.selectedObjects = [];
                this.selectedOutlinePass.selectedObjects = [];
                this.handles.removeFromParent();
                this.resetPose();
                break;
            case "pose":
                this.setState({
                    pose: value == null ? true : value,
                    anim: false,
                    explode: false
                });
                this.hoveredOutlinePass.selectedObjects = [];
                this.selectedOutlinePass.selectedObjects = [];
                this.handles.removeFromParent();
                this.resetPose();
                break;
            case "poseSettings":
                if (this.state.poseSettings.mode !== value.mode) this.selectedObject = null;

                this.setState({
                    poseSettings: {
                        mode: value.mode == null ? "Simple" : value.mode,
                        type: value.type == null ? "Rotation" : value.type,
                        space: value.space == null ? "Global" : value.space,
                    }
                });
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
                        poseSettings: this.state.poseSettings,
                        fov: this.state.fov
                    }}
                    updateSetting={this.updateSetting}
                    saveRender={this.saveRender}
                    resetCamera={() => this.controls.reset()}
                    addEdit={this.props.addEdit}
                    deselect={this.deselect}
                />
                <div className="paperdoll-canvas-container">
                    <canvas className="paperdoll-canvas" ref={this.canvasRef} />
                </div>
            </div>
        );
    }
}

export default PaperDoll;