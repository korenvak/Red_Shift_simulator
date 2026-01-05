/**
 * Scene Module - Three.js scene setup and management
 *
 * Handles:
 * - Scene creation and configuration
 * - Camera setup with orbit controls
 * - Lighting
 * - Rendering loop
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneManager {
    constructor(container) {
        this.container = container;
        this.width = container.clientWidth;
        this.height = container.clientHeight;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        this.clock = new THREE.Clock();

        this.init();
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050510);

        // Create camera - pulled back for better overview
        this.camera = new THREE.PerspectiveCamera(
            55,  // Slightly narrower FOV for less distortion
            this.width / this.height,
            0.1,
            15000
        );
        // Start further back to see entire scene
        this.camera.position.set(0, 300, 600);
        this.camera.lookAt(100, 0, 0);

        // Create renderer
        // preserveDrawingBuffer is needed for screenshot/GIF recording
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Orbit controls - allow zooming out further
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 150;   // Don't let camera get too close
        this.controls.maxDistance = 3000;  // Allow zooming out much further
        this.controls.maxPolarAngle = Math.PI * 0.85;
        // Target the middle of the scene (between observer and source)
        this.controls.target.set(150, 0, 0);

        // Lighting
        this.setupLighting();

        // Handle window resize
        window.addEventListener('resize', () => this.onResize());
    }

    setupLighting() {
        // Ambient light for overall illumination
        const ambient = new THREE.AmbientLight(0x202040, 0.5);
        this.scene.add(ambient);

        // Hemisphere light for sky/ground effect
        const hemi = new THREE.HemisphereLight(0x4080ff, 0x200020, 0.4);
        hemi.position.set(0, 200, 0);
        this.scene.add(hemi);

        // Point lights for dramatic effect
        const light1 = new THREE.PointLight(0x00ffff, 1, 500);
        light1.position.set(0, 50, 0);
        this.scene.add(light1);

        const light2 = new THREE.PointLight(0xff00ff, 0.5, 400);
        light2.position.set(200, 30, 100);
        this.scene.add(light2);
    }

    onResize() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;

        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(this.width, this.height);
    }

    /**
     * Update camera to frame specific objects
     * @param {THREE.Vector3} observerPos - Observer position
     * @param {THREE.Vector3} sourcePos - Source position
     */
    updateCameraFrame(observerPos, sourcePos) {
        // Calculate midpoint
        const midX = (observerPos.x + sourcePos.x) / 2;
        const midZ = (observerPos.z + sourcePos.z) / 2;

        // Calculate required distance
        const dx = sourcePos.x - observerPos.x;
        const dz = sourcePos.z - observerPos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // Smoothly update controls target
        const targetPos = new THREE.Vector3(midX, 0, midZ);
        this.controls.target.lerp(targetPos, 0.02);

        // Optionally adjust camera distance
        // const desiredDist = Math.max(200, distance * 1.5);
        // This can be done, but orbit controls handle it better interactively
    }

    /**
     * Add object to scene
     * @param {THREE.Object3D} object
     */
    add(object) {
        this.scene.add(object);
    }

    /**
     * Remove object from scene
     * @param {THREE.Object3D} object
     */
    remove(object) {
        this.scene.remove(object);
    }

    /**
     * Get delta time since last frame
     * @returns {number}
     */
    getDelta() {
        return this.clock.getDelta();
    }

    /**
     * Render the scene
     */
    render() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.renderer.dispose();
        this.controls.dispose();
    }

    /**
     * Get the Three.js scene
     * @returns {THREE.Scene}
     */
    getScene() {
        return this.scene;
    }

    /**
     * Get the camera
     * @returns {THREE.PerspectiveCamera}
     */
    getCamera() {
        return this.camera;
    }
}
