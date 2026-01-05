/**
 * Main Application Entry Point
 * VERSION 6.0 - Educational Features + Time Controls
 *
 * Integrates all modules into a cohesive redshift simulation
 * Features:
 * - 4 Famous astronomical presets with unique visuals
 * - Full relativistic Doppler effect with angle (transverse Doppler)
 * - Emission/Absorption spectrum visualization
 * - Doppler vs Cosmological comparison visualization
 * - Educational formula overlay showing active equations
 * - Time machine controls (rewind/fast-forward)
 * - Screenshot export functionality
 */

console.log('Main.js v7.0 loading - Binary Star realistic orbital physics + eclipses');

import * as THREE from 'three';

// Core modules
import { Universe } from './core/universe.js';
import { Source, WaveTrain } from './core/wave.js';
import {
    SimulationMode,
    CONSTANTS,
    dopplerRedshift,
    cosmologicalRedshift,
    totalRedshift,
    observedWavelength,
    lorentzFactor,
    timeDilation,
    gravitationalRedshift,
    relativisticDopplerWithAngle,
    transverseDopplerRedshift
} from './core/physics.js';

// Visual modules
import { SceneManager } from './visual/scene.js';
import { SpacetimeGrid, GroundPlane } from './visual/grid.js';
import { Starfield } from './visual/starfield.js';
import { ObserverObject, SourceObject, LineOfSight, GhostGalaxy, createSourceObject } from './visual/objects.js';
import { SineWaveRenderer } from './visual/wave-renderer.js';
import { DistanceScale } from './visual/distance-scale.js';

// Recording module
import { GifRecorder } from './recording/gif-recorder.js';

// UI modules
import { UIController } from './ui/controls.js';
import { WavelengthChart } from './ui/charts.js';
import { SourceType } from './ui/presets.js';

/**
 * Main simulation application
 */
class RedshiftSimulation {
    constructor() {
        // Get canvas container
        this.container = document.getElementById('canvas-container');

        if (!this.container) {
            console.error('Canvas container not found');
            return;
        }

        // Initialize components
        this.initCore();
        this.initVisuals();
        this.initUI();

        // Bind animation loop
        this.animate = this.animate.bind(this);

        // Start
        this.animate();

        console.log('Redshift Simulation initialized');
    }

    initCore() {
        // Universe state
        this.universe = new Universe();

        // Source object
        this.source = new Source({
            distance: 100,
            universe: this.universe
        });

        // Wave train (created on emission start)
        this.waveTrain = null;

        // Rest wavelength
        this.restWavelength = CONSTANTS.WAVELENGTH_HALPHA;

        // Store current velocity (from slider callback) - NOT from slider default
        this.currentVelocity = 0;

        // Motion angle for transverse Doppler (0° = moving away, 90° = transverse, 180° = approaching)
        this.motionAngle = 0; // degrees

        // Simulation state
        this.isRunning = false;
        this.isPaused = false;

        // Time tracking
        this.lastUpdateTime = 0;
        this.chartUpdateInterval = 0.1; // Update chart every 0.1s
        this.lastChartUpdate = 0;

        // Time speed multiplier (1.0 = normal, < 1 = slower, > 1 = faster)
        this.timeSpeed = 1.0;
        this.minTimeSpeed = 0.1;
        this.maxTimeSpeed = 5.0;

        // Binary star mode flag
        this.isBinaryMode = false;
    }

    initVisuals() {
        // Scene manager
        this.sceneManager = new SceneManager(this.container);
        const scene = this.sceneManager.getScene();

        // Background starfield
        this.starfield = new Starfield(scene);

        // Ground plane
        this.groundPlane = new GroundPlane(scene);

        // Spacetime grid
        this.grid = new SpacetimeGrid(scene);

        // Observer (at origin)
        this.observerVisual = new ObserverObject(scene);

        // Source - starts as galaxy, can be changed via presets
        this.currentSourceType = SourceType.GALAXY;
        this.sourceVisual = new SourceObject(scene);

        // Line of sight
        this.lineOfSight = new LineOfSight(scene);

        // Wave renderer
        this.waveRenderer = new SineWaveRenderer(scene);

        // Distance scale
        this.distanceScale = new DistanceScale(scene);

        // Ghost galaxy (shows Hubble flow position for Mixed mode)
        this.ghostGalaxy = new GhostGalaxy(scene);

        // Initial positions
        this.updateVisualPositions();
    }

    initUI() {
        // UI controller
        this.ui = new UIController();

        // Wavelength chart
        this.chart = new WavelengthChart('wavelength-chart');

        // Bind UI events
        this.ui.on('modeChange', (mode) => this.setMode(mode));
        this.ui.on('hubbleChange', (value) => this.universe.setH0(value));
        this.ui.on('velocityChange', (value) => {
            console.log('velocityChange callback: value =', value);
            this.currentVelocity = value; // Store for use in reset/start
            this.source.setVelocities(value);
        });
        this.ui.on('angleChange', (value) => {
            console.log('angleChange callback: value =', value);
            this.motionAngle = value;
        });
        this.ui.on('distanceChange', (value) => {
            this.source.setDistance(value);
            this.updateVisualPositions();
        });
        this.ui.on('wavelengthChange', (value) => this.restWavelength = value);

        this.ui.on('start', () => this.startSimulation());
        this.ui.on('pause', () => this.togglePause());
        this.ui.on('reset', () => this.reset());

        // Handle preset changes - switch source visual
        this.ui.on('presetApplied', (preset) => this.applyPreset(preset));

        // Time control events
        this.ui.on('rewind', () => this.adjustTimeSpeed(-0.5));
        this.ui.on('fastforward', () => this.adjustTimeSpeed(0.5));
        this.ui.on('screenshot', () => this.takeScreenshot());
        
        // GIF Recording setup
        this.initGifRecorder();

        // Initial UI state
        this.setMode(SimulationMode.COSMOLOGICAL);

        // Initialize stored values from current slider positions
        const initialValues = this.ui.getValues();
        this.currentVelocity = initialValues.velocity;
        this.motionAngle = initialValues.angle || 0;
        console.log('Initial velocity from slider:', this.currentVelocity, 'angle:', this.motionAngle);
    }

    setMode(mode) {
        this.universe.setMode(mode);

        // Reset if running
        if (this.isRunning) {
            this.reset();
        }
        
        // Update visual positions
        this.updateVisualPositions();
    }

    /**
     * Apply a preset - switch source visual type
     * @param {Object} preset - Preset data including sourceType
     */
    applyPreset(preset) {
        console.log('Applying preset with source type:', preset.sourceType);

        // Stop any running simulation
        if (this.isRunning) {
            this.reset();
        }

        // Check if we need to change the source visual
        if (preset.sourceType && preset.sourceType !== this.currentSourceType) {
            // Dispose old source visual
            if (this.sourceVisual) {
                this.sourceVisual.dispose();
            }

            // Create new source visual based on type
            const scene = this.sceneManager.scene;
            this.sourceVisual = createSourceObject(scene, preset.sourceType);
            this.currentSourceType = preset.sourceType;

            console.log('Created new source visual:', preset.sourceType);
        }

        // Enable/disable binary mode on chart
        const isBinaryMode = preset.sourceType === SourceType.BINARY;
        this.chart.setBinaryMode(isBinaryMode);
        this.isBinaryMode = isBinaryMode;

        // Update position
        this.updateVisualPositions();
    }

    /**
     * Adjust simulation time speed
     * @param {number} delta - Amount to change speed by
     */
    adjustTimeSpeed(delta) {
        this.timeSpeed = Math.max(this.minTimeSpeed, Math.min(this.maxTimeSpeed, this.timeSpeed + delta));
        console.log('Time speed adjusted to:', this.timeSpeed.toFixed(1) + 'x');
        this.ui.showToast(`Speed: ${this.timeSpeed.toFixed(1)}x`);
    }

    /**
     * Take a screenshot of the simulation
     */
    takeScreenshot() {
        // Render one frame to ensure we have the latest
        this.sceneManager.render();

        // Get the canvas
        const canvas = this.sceneManager.renderer.domElement;

        // Trigger flash effect
        this.ui.triggerScreenshotFlash();

        // Create download link
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `redshift-simulation-${Date.now()}.png`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);

            this.ui.showToast('Screenshot saved!');
        }, 'image/png');
    }
    
    /**
     * Initialize GIF recorder
     */
    initGifRecorder() {
        // Get UI elements
        this.recordButton = document.getElementById('btn-record-gif');
        this.recordStatus = document.getElementById('record-status');
        
        if (!this.recordButton) {
            console.warn('Record button not found');
            return;
        }
        
        // Create recorder instance
        this.gifRecorder = new GifRecorder({
            fps: 10,
            quality: 10,
            maxFrames: 300, // Max 30 seconds
            onProgress: (info) => this.onRecordingProgress(info),
            onFinished: (info) => this.onRecordingFinished(info),
            onError: (err) => this.onRecordingError(err)
        });
        
        // Bind click event
        this.recordButton.addEventListener('click', () => this.toggleRecording());
        
        console.log('GIF Recorder initialized');
    }
    
    /**
     * Toggle GIF recording on/off
     */
    toggleRecording() {
        if (!this.gifRecorder) return;
        
        if (this.gifRecorder.getIsRecording()) {
            // Stop recording
            this.gifRecorder.stopRecording();
            this.recordButton.classList.remove('recording');
            this.recordButton.title = 'Record GIF';
        } else {
            // Start recording
            const canvas = this.sceneManager.renderer.domElement;
            this.gifRecorder.startRecording(canvas);
            this.recordButton.classList.add('recording');
            this.recordButton.title = 'Stop Recording';
            
            // Auto-start simulation if not running
            if (!this.isRunning) {
                this.startSimulation();
            }
            
            this.ui.showToast('Recording started! Click again to stop.');
        }
    }
    
    /**
     * Handle recording progress updates
     */
    onRecordingProgress(info) {
        if (this.recordStatus) {
            this.recordStatus.textContent = info.message;
            this.recordStatus.classList.add('active');
        }
    }
    
    /**
     * Handle recording completion
     */
    onRecordingFinished(info) {
        if (this.recordStatus) {
            this.recordStatus.textContent = '';
            this.recordStatus.classList.remove('active');
        }
        this.recordButton.classList.remove('recording');
        this.ui.showToast(`GIF saved! ${info.frameCount} frames, ${info.duration.toFixed(1)}s`);
    }
    
    /**
     * Handle recording errors
     */
    onRecordingError(err) {
        console.error('Recording error:', err);
        if (this.recordStatus) {
            this.recordStatus.textContent = 'Error!';
        }
        this.recordButton.classList.remove('recording');
        this.ui.showToast('Recording failed: ' + err.message);
    }

    startSimulation() {
        // Get UI values first
        const uiValues = this.ui.getValues();

        // Reset first (this will also set velocity from UI)
        this.reset();

        // Start universe
        this.universe.start();
        this.source.startTime = this.universe.time;

        // Create wave train
        this.waveTrain = new WaveTrain({
            source: this.source,
            universe: this.universe,
            wavelengthRest: this.restWavelength,
            mode: this.universe.mode
        });

        this.waveTrain.startEmission();

        // Start wave renderer
        this.waveRenderer.start();

        this.isRunning = true;
        this.isPaused = false;

        console.log('Simulation started - Mode:', this.universe.mode,
                    'Velocity:', this.source.baseVelocity,
                    'orbitalEnabled:', this.source.orbitalEnabled);
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        this.universe.togglePause();
        this.ui.updatePauseButton(this.isPaused);
    }

    reset() {
        // Get current UI values for initial state FIRST
        const uiValues = this.ui.getValues();

        // CRITICAL: Save mode BEFORE reset (reset() changes mode to COSMOLOGICAL!)
        const currentMode = this.universe.mode;

        // Reset universe completely
        this.universe.reset();

        // Restore the saved mode (NOT the mode after reset, which is always COSMOLOGICAL)
        this.universe.setMode(currentMode);

        // Reset source with current UI distance
        this.source.reset(uiValues.distance);

        // IMPORTANT: Use stored velocity (from callback), NOT slider value!
        // The slider value may have been reset to HTML default (0)
        this.source.setVelocities(this.currentVelocity);

        // Reset wavelength from UI
        this.restWavelength = uiValues.wavelength;

        console.log('Reset complete - Mode:', this.universe.mode, '(saved was:', currentMode + ')',
                    'Stored velocity:', this.currentVelocity,
                    'baseVelocity:', this.source.baseVelocity,
                    'orbitalEnabled:', this.source.orbitalEnabled);

        // Clear wave train completely
        if (this.waveTrain) {
            this.waveTrain.reset();
            this.waveTrain = null;
        }

        // Reset wave renderer
        this.waveRenderer.reset();

        // Reset grid to initial state (scale factor = 1, no expansion)
        this.grid.update(1.0, false);

        // Clear chart
        this.chart.clear();

        // Force update source visual position
        const sourcePos = this.source.getPosition();
        this.sourceVisual.setPosition(sourcePos);

        // Reset velocity arrow
        this.sourceVisual.updateVelocityArrow(0, { x: 0, y: 0, z: 0 });

        // Hide ghost galaxy
        this.ghostGalaxy.update({ x: 0, y: 0, z: 0 }, sourcePos, false);

        // Update all visual positions
        this.updateVisualPositions();

        // Reset state flags
        this.isRunning = false;
        this.isPaused = false;
        this.lastChartUpdate = 0;

        // Update UI
        this.ui.updatePauseButton(false);
        this.ui.updateStatus({
            distance: uiValues.distance,
            scaleFactor: 1.0,
            wavelengthEmit: this.restWavelength,
            wavelengthObs: this.restWavelength,
            redshift: 0,
            zDoppler: 0,
            zCosmo: 0,
            time: 0
        });

        // Update color previews to rest wavelength
        this.ui.updateColorPreviews(this.restWavelength, this.restWavelength);

        console.log('Simulation reset complete');
    }

    updateVisualPositions() {
        // Get source position
        const sourcePos = this.source.getPosition();
        this.sourceVisual.setPosition(sourcePos);

        // Update line of sight
        const observerPos = this.observerVisual.getPosition();
        const sourcePosVec = new THREE.Vector3(sourcePos.x, sourcePos.y, sourcePos.z);
        this.lineOfSight.update(observerPos, sourcePosVec);

        // Update distance scale
        this.distanceScale.update(observerPos, sourcePosVec, this.universe.scaleFactor);

        // Update camera framing
        this.sceneManager.updateCameraFrame(observerPos, sourcePosVec);
    }

    update(dt) {
        const currentTime = performance.now() / 1000;

        if (!this.isPaused && this.isRunning) {
            // Apply time speed multiplier
            const scaledDt = dt * this.timeSpeed;

            // Update universe
            this.universe.update(scaledDt);

            // Get UI values for live updates
            // NOTE: Velocity is NOT read here - it's set by slider callback only
            // This prevents the slider's default HTML value from overriding our velocity
            const uiValues = this.ui.getValues();
            this.universe.setH0(uiValues.hubble);
            // Distance can be updated live (doesn't reset like velocity)
            // this.source.setDistance(uiValues.distance); // Commented - causes jumps

            // Update wave train
            const observerPos = { x: 0, y: 0, z: 0 };
            const waveSpeed = uiValues.distance / 5; // Visual wave speed

            if (this.waveTrain) {
                this.waveTrain.update(dt, waveSpeed, observerPos);
            }

            // Update source position (may change with peculiar velocity)
            const sourcePos = this.source.getPosition();
            this.sourceVisual.setPosition(sourcePos);

            // Calculate current distance (needed for various calculations)
            const currentDistance = Math.sqrt(sourcePos.x * sourcePos.x + sourcePos.y * sourcePos.y + sourcePos.z * sourcePos.z);

            // Update velocity arrow
            this.sourceVisual.updateVelocityArrow(
                this.source.velocityRadial,
                observerPos
            );

            // Update grid with scale factor
            const applyExpansion = this.universe.mode !== SimulationMode.DOPPLER;
            this.grid.update(this.universe.scaleFactor, applyExpansion);

            // Update line of sight
            const sourcePosVec = new THREE.Vector3(sourcePos.x, sourcePos.y, sourcePos.z);
            this.lineOfSight.update(new THREE.Vector3(0, 0, 0), sourcePosVec);

            // Update distance scale
            this.distanceScale.update(new THREE.Vector3(0, 0, 0), sourcePosVec, this.universe.scaleFactor);

            // Update ghost galaxy (shows Hubble flow position when peculiar velocity differs from zero)
            // Ghost is shown in MIXED mode to visualize the difference between
            // Hubble expansion (ghost) and actual position (includes peculiar velocity)
            const hubbleFlowPos = this.source.getHubbleFlowPosition();
            const hasPeculiarVelocity = Math.abs(this.source.velocityRadial) > 50;
            const showGhost = this.universe.mode === SimulationMode.MIXED && hasPeculiarVelocity;
            this.ghostGalaxy.update(hubbleFlowPos, sourcePos, showGhost);

            // Ensure velocity is updated for orbital motion before calculating redshifts
            this.source.updateRadialVelocity();

            // Debug: log velocity state every ~2 seconds
            if (Math.floor(this.universe.time) % 2 === 0 && Math.floor(this.universe.time * 10) % 20 === 0) {
                console.log('Update loop - baseVelocity:', this.source.baseVelocity,
                            'velocityRadial:', this.source.velocityRadial,
                            'mode:', this.universe.mode);
            }

            // Calculate DOPPLER redshift with angle consideration
            // The angle slider allows demonstrating transverse Doppler effect
            // θ = 0° means moving directly away (max redshift)
            // θ = 90° means moving perpendicular (pure time dilation - transverse Doppler)
            // θ = 180° means moving directly toward (max blueshift)
            const angleRadians = (this.motionAngle * Math.PI) / 180;
            const velocity = Math.abs(this.source.velocityRadial);

            let zDoppler = 0;
            let zTransverse = 0;
            if (this.universe.mode !== SimulationMode.COSMOLOGICAL && velocity > 0) {
                // Use full relativistic Doppler formula with angle
                const dopplerFactor = relativisticDopplerWithAngle(velocity, angleRadians);
                zDoppler = dopplerFactor - 1;

                // Pure transverse Doppler (for display comparison)
                zTransverse = transverseDopplerRedshift(velocity);
            }

            // Calculate COSMOLOGICAL redshift
            // Physics: z_cosmo = a_obs/a_emit - 1
            //
            // Light from distant objects was emitted when the universe was smaller.
            // The further the object, the longer ago light was emitted, and thus
            // the smaller a_emit was compared to a_obs (now).
            //
            // For visualization: We estimate emission time based on light travel distance
            let zCosmo = 0;
            if (this.universe.mode !== SimulationMode.DOPPLER) {
                // Estimate light travel time based on distance
                // In our visual units, we scale this so that effects are visible
                const visualLightSpeed = 100; // Mpc per simulation second (adjusted for visual effect)
                const lightTravelTime = currentDistance / visualLightSpeed;

                // Emission time: when the light we're seeing now was emitted
                const emissionTime = Math.max(0, this.universe.time - lightTravelTime);

                // Get scale factors at emission and observation (now)
                const aEmit = this.universe.getScaleFactorAtTime(emissionTime);
                const aObs = this.universe.scaleFactor;

                // Proper cosmological redshift formula: z = a_obs/a_emit - 1
                if (aEmit > 0) {
                    zCosmo = (aObs / aEmit) - 1;
                }

                // Ensure non-negative (can happen due to timing edge cases)
                zCosmo = Math.max(0, zCosmo);
            }

            const zTotal = totalRedshift(zDoppler, zCosmo);
            const wavelengthObs = observedWavelength(this.restWavelength, zTotal);

            // Calculate wavelength with Doppler only (for graph separation)
            const wavelengthDopplerOnly = observedWavelength(this.restWavelength, zDoppler);

            // For VISUAL display, amplify the wavelength shift so color change is visible
            // Real physics: 10000 km/s only shifts ~22nm (barely visible)
            // Amplified: 15x makes the color change very dramatic and educational
            const visualAmplification = 15;
            const wavelengthShift = wavelengthObs - this.restWavelength;
            const wavelengthObsVisual = this.restWavelength + wavelengthShift * visualAmplification;

            // Extended range for false-color visualization (100nm UV to 2000nm IR)
            // This allows showing extreme redshift as dark brown/black
            const wavelengthObsVisualClamped = Math.max(100, Math.min(2000, wavelengthObsVisual));

            // Update wave renderer with AMPLIFIED visual wavelength
            this.waveRenderer.update({
                sourcePos: sourcePos,
                observerPos: observerPos,
                wavelengthEmit: this.restWavelength,
                wavelengthObs: wavelengthObsVisualClamped, // Amplified for visual effect
                time: this.universe.time,
                scaleFactor: this.universe.scaleFactor,
                isCosmological: this.universe.mode !== SimulationMode.DOPPLER
            });

            // Calculate relativistic factors for display (velocity already calculated above)
            const gamma = lorentzFactor(velocity);
            const timeDilationFactor = timeDilation(velocity);

            // Update UI status with full relativistic information
            this.ui.updateStatus({
                distance: currentDistance,
                scaleFactor: this.universe.scaleFactor,
                wavelengthEmit: this.restWavelength,
                wavelengthObs: wavelengthObs,
                redshift: zTotal,
                zDoppler: zDoppler,
                zTransverse: zTransverse,
                zCosmo: zCosmo,
                gamma: gamma,
                timeDilation: timeDilationFactor,
                time: this.universe.time
            });

            // Update formula overlay with current values
            const beta = velocity / CONSTANTS.c;
            const aEmit = this.universe.getScaleFactorAtTime(
                Math.max(0, this.universe.time - currentDistance / 100)
            );
            this.ui.updateFormulaOverlay(this.universe.mode, {
                velocity: velocity,
                beta: beta,
                gamma: gamma,
                scaleFactor: this.universe.scaleFactor,
                aEmit: aEmit,
                zTotal: zTotal
            });

            // Update time display
            this.ui.updateTimeDisplay(this.universe.time);

            // Update chart periodically with effect separation
            if (currentTime - this.lastChartUpdate > this.chartUpdateInterval) {
                if (this.isBinaryMode && this.sourceVisual.getOrbitalState) {
                    // Binary star mode - get individual star velocities and calculate their wavelengths
                    const orbitalState = this.sourceVisual.getOrbitalState();

                    // Calculate individual star wavelengths based on their velocities
                    const star1Velocity = orbitalState.star1Velocity || 0;
                    const star2Velocity = orbitalState.star2Velocity || 0;

                    // Calculate Doppler shift for each star
                    const star1Beta = star1Velocity / CONSTANTS.c;
                    const star2Beta = star2Velocity / CONSTANTS.c;

                    // Relativistic Doppler: λ_obs = λ_rest * sqrt((1+β)/(1-β))
                    const star1Factor = Math.sqrt((1 + star1Beta) / (1 - star1Beta));
                    const star2Factor = Math.sqrt((1 + star2Beta) / (1 - star2Beta));

                    const star1Wavelength = this.restWavelength * star1Factor;
                    const star2Wavelength = this.restWavelength * star2Factor;

                    // Get eclipse state
                    const eclipseDepth = orbitalState.eclipseDepth || 0;
                    const star1Eclipsed = orbitalState.star1Eclipsed || false;
                    const star2Eclipsed = orbitalState.star2Eclipsed || false;

                    this.chart.addBinaryDataPoint(
                        this.universe.time,
                        star1Wavelength,
                        star2Wavelength,
                        this.restWavelength,
                        eclipseDepth,
                        star1Eclipsed,
                        star2Eclipsed
                    );
                } else {
                    // Standard mode
                    this.chart.addDataPoint(
                        this.universe.time,
                        wavelengthObs,           // Total observed wavelength
                        wavelengthDopplerOnly,   // Doppler effect only
                        this.restWavelength      // Rest wavelength (constant)
                    );
                }
                this.lastChartUpdate = currentTime;
            }
        }

        // Update visual animations (always run)
        const time = currentTime;
        this.starfield.update(time);
        this.observerVisual.update(time);
        this.sourceVisual.update(time);
    }

    animate() {
        requestAnimationFrame(this.animate);

        const dt = this.sceneManager.getDelta();

        // Limit dt to prevent huge jumps
        const cappedDt = Math.min(dt, 0.1);

        this.update(cappedDt);
        this.sceneManager.render();
    }

    dispose() {
        // Clean up resources
        this.starfield.dispose();
        this.grid.dispose();
        this.groundPlane.dispose();
        this.observerVisual.dispose();
        this.sourceVisual.dispose();
        this.lineOfSight.dispose();
        this.waveRenderer.dispose();
        this.distanceScale.dispose();
        this.ghostGalaxy.dispose();
        this.sceneManager.dispose();
        this.chart.dispose();
        
        // Clean up GIF recorder
        if (this.gifRecorder) {
            this.gifRecorder.dispose();
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.simulation = new RedshiftSimulation();
});
