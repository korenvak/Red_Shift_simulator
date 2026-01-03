/**
 * Controls Module - UI interaction handling
 * VERSION 2.0 - Added Transverse Doppler, Presets, Spectrum, Comparison
 *
 * Manages:
 * - Slider inputs (including motion angle for transverse Doppler)
 * - Button actions
 * - Mode selection
 * - Preset configurations
 * - Status updates
 * - Effect comparison visualization
 */

import { SimulationMode, wavelengthToRGB, wavelengthToHex, CONSTANTS } from '../core/physics.js';
import { PRESETS, getPreset } from './presets.js';
import { SpectrumDisplay } from './spectrum.js';

console.log('Controls.js v2.2 loaded - All features enabled');

export class UIController {
    constructor() {
        this.callbacks = {};
        this.elements = {};
        this.currentPreset = null;

        this.bindElements();
        this.bindEvents();
        this.updateColorPreviews(CONSTANTS.WAVELENGTH_HALPHA, CONSTANTS.WAVELENGTH_HALPHA);

        // Initialize spectrum display
        this.spectrumDisplay = new SpectrumDisplay('spectrum-display');
    }

    bindElements() {
        // Mode buttons
        this.elements.btnCosmological = document.getElementById('btn-cosmological');
        this.elements.btnDoppler = document.getElementById('btn-doppler');
        this.elements.btnMixed = document.getElementById('btn-mixed');

        // Sliders
        this.elements.hubbleSlider = document.getElementById('hubble-slider');
        this.elements.hubbleValue = document.getElementById('hubble-value');

        this.elements.velocitySlider = document.getElementById('velocity-slider');
        this.elements.velocityValue = document.getElementById('velocity-value');

        this.elements.angleSlider = document.getElementById('angle-slider');
        this.elements.angleValue = document.getElementById('angle-value');

        this.elements.distanceSlider = document.getElementById('distance-slider');
        this.elements.distanceValue = document.getElementById('distance-value');

        this.elements.wavelengthSlider = document.getElementById('wavelength-slider');
        this.elements.wavelengthValue = document.getElementById('wavelength-value');

        // Action buttons
        this.elements.btnStart = document.getElementById('btn-start');
        this.elements.btnPause = document.getElementById('btn-pause');
        this.elements.btnReset = document.getElementById('btn-reset');

        // Status displays
        this.elements.statusScale = document.getElementById('status-scale');
        this.elements.statusWavelength = document.getElementById('status-wavelength');
        this.elements.statusDistance = document.getElementById('status-distance');
        this.elements.statusRedshift = document.getElementById('status-redshift');
        this.elements.statusZDoppler = document.getElementById('status-z-doppler');
        this.elements.statusZTransverse = document.getElementById('status-z-transverse');
        this.elements.statusZCosmo = document.getElementById('status-z-cosmo');
        this.elements.statusGamma = document.getElementById('status-gamma');
        this.elements.statusTimeDilation = document.getElementById('status-time-dilation');
        this.elements.statusTime = document.getElementById('status-time');

        // Preset elements
        this.elements.presetButtons = document.querySelectorAll('.preset-btn');
        this.elements.presetSelect = document.getElementById('preset-select');

        // Comparison panel elements
        this.elements.comparisonPanel = document.getElementById('comparison-panel');
        this.elements.barDoppler = document.getElementById('bar-doppler');
        this.elements.barCosmo = document.getElementById('bar-cosmo');
        this.elements.compDopplerValue = document.getElementById('comp-doppler-value');
        this.elements.compCosmoValue = document.getElementById('comp-cosmo-value');

        // Color previews
        this.elements.previewEmitted = document.getElementById('preview-emitted');
        this.elements.previewObserved = document.getElementById('preview-observed');

        // Info overlay
        this.elements.infoOverlay = document.getElementById('info-overlay');
    }

    bindEvents() {
        // Mode buttons
        this.elements.btnCosmological.addEventListener('click', () => {
            this.setActiveMode(SimulationMode.COSMOLOGICAL);
            this.emit('modeChange', SimulationMode.COSMOLOGICAL);
        });

        this.elements.btnDoppler.addEventListener('click', () => {
            this.setActiveMode(SimulationMode.DOPPLER);
            this.emit('modeChange', SimulationMode.DOPPLER);
        });

        this.elements.btnMixed.addEventListener('click', () => {
            this.setActiveMode(SimulationMode.MIXED);
            this.emit('modeChange', SimulationMode.MIXED);
        });

        // Sliders
        this.elements.hubbleSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.elements.hubbleValue.textContent = value.toFixed(0);
            this.emit('hubbleChange', value);
        });

        this.elements.velocitySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.elements.velocityValue.textContent = value.toFixed(0);
            this.emit('velocityChange', value);
        });

        // Angle slider for transverse Doppler
        if (this.elements.angleSlider) {
            this.elements.angleSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.elements.angleValue.textContent = value.toFixed(0);
                this.emit('angleChange', value);
            });
        }

        this.elements.distanceSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.elements.distanceValue.textContent = value.toFixed(0);
            this.emit('distanceChange', value);
        });

        this.elements.wavelengthSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.elements.wavelengthValue.textContent = value.toFixed(0);
            this.emit('wavelengthChange', value);
        });

        // Action buttons
        this.elements.btnStart.addEventListener('click', () => {
            this.emit('start');
        });

        this.elements.btnPause.addEventListener('click', () => {
            this.emit('pause');
        });

        this.elements.btnReset.addEventListener('click', () => {
            this.emit('reset');
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ') {
                e.preventDefault();
                this.emit('pause');
            } else if (e.key === 'r' || e.key === 'R') {
                this.emit('reset');
            } else if (e.key === 'h' || e.key === 'H') {
                this.toggleInfo();
            } else if (e.key === '1') {
                this.setActiveMode(SimulationMode.COSMOLOGICAL);
                this.emit('modeChange', SimulationMode.COSMOLOGICAL);
            } else if (e.key === '2') {
                this.setActiveMode(SimulationMode.DOPPLER);
                this.emit('modeChange', SimulationMode.DOPPLER);
            } else if (e.key === '3') {
                this.setActiveMode(SimulationMode.MIXED);
                this.emit('modeChange', SimulationMode.MIXED);
            }
        });

        // Preset buttons
        this.elements.presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const presetId = btn.dataset.preset;
                this.applyPreset(presetId);
            });
        });

        // Preset select dropdown
        if (this.elements.presetSelect) {
            this.elements.presetSelect.addEventListener('change', (e) => {
                const presetId = e.target.value;
                if (presetId) {
                    this.applyPreset(presetId);
                    e.target.value = ''; // Reset dropdown
                }
            });
        }
    }

    /**
     * Apply a preset configuration
     * @param {string} presetId - Preset identifier
     */
    applyPreset(presetId) {
        const preset = getPreset(presetId);
        if (!preset) {
            console.warn('Preset not found:', presetId);
            return;
        }

        console.log('Applying preset:', presetId, preset);
        this.currentPreset = presetId;

        // Update preset button highlighting
        this.elements.presetButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === presetId);
        });

        // Set slider values
        this.setSliderValue('hubble', preset.hubble);
        this.setSliderValue('velocity', preset.velocity);
        this.setSliderValue('distance', Math.min(500, preset.distance)); // Clamp to slider max
        this.setSliderValue('wavelength', preset.wavelength);

        // Emit changes
        this.emit('hubbleChange', preset.hubble);
        this.emit('velocityChange', preset.velocity);
        this.emit('distanceChange', Math.min(500, preset.distance));
        this.emit('wavelengthChange', preset.wavelength);

        // Set mode based on preset recommendation
        if (preset.mode) {
            let mode;
            switch (preset.mode) {
                case 'cosmological':
                    mode = SimulationMode.COSMOLOGICAL;
                    break;
                case 'doppler':
                    mode = SimulationMode.DOPPLER;
                    break;
                case 'mixed':
                    mode = SimulationMode.MIXED;
                    break;
                default:
                    mode = SimulationMode.MIXED;
            }
            this.setActiveMode(mode);
            this.emit('modeChange', mode);
        }

        // Emit preset applied event with full preset data
        this.emit('presetApplied', { id: presetId, ...preset });
    }

    setActiveMode(mode) {
        // Remove active class from all mode buttons
        this.elements.btnCosmological.classList.remove('active');
        this.elements.btnDoppler.classList.remove('active');
        this.elements.btnMixed.classList.remove('active');

        // Add active class to selected mode
        switch (mode) {
            case SimulationMode.COSMOLOGICAL:
                this.elements.btnCosmological.classList.add('active');
                break;
            case SimulationMode.DOPPLER:
                this.elements.btnDoppler.classList.add('active');
                break;
            case SimulationMode.MIXED:
                this.elements.btnMixed.classList.add('active');
                break;
        }
    }

    /**
     * Update status display
     * @param {Object} status
     */
    updateStatus(status) {
        if (status.distance !== undefined) {
            this.elements.statusDistance.textContent = `${status.distance.toFixed(1)} Mpc`;
        }

        if (status.scaleFactor !== undefined) {
            this.elements.statusScale.textContent = status.scaleFactor.toFixed(4);
        }

        if (status.wavelengthObs !== undefined) {
            this.elements.statusWavelength.textContent = `${status.wavelengthObs.toFixed(1)} nm`;

            // Also update color previews
            this.updateColorPreviews(status.wavelengthEmit || CONSTANTS.WAVELENGTH_HALPHA, status.wavelengthObs);
        }

        if (status.redshift !== undefined) {
            this.elements.statusRedshift.textContent = status.redshift.toFixed(5);
        }

        if (status.zDoppler !== undefined) {
            this.elements.statusZDoppler.textContent = status.zDoppler.toFixed(5);
        }

        if (status.zTransverse !== undefined && this.elements.statusZTransverse) {
            this.elements.statusZTransverse.textContent = status.zTransverse.toFixed(5);
        }

        if (status.zCosmo !== undefined) {
            this.elements.statusZCosmo.textContent = status.zCosmo.toFixed(5);
        }

        // Update spectrum display
        if (this.spectrumDisplay && status.zDoppler !== undefined) {
            this.spectrumDisplay.updateSpectrum(
                status.zDoppler || 0,
                status.zCosmo || 0,
                status.redshift || 0
            );
        }

        // Update comparison bars (for MIXED mode visualization)
        if (status.zDoppler !== undefined && status.zCosmo !== undefined) {
            this.updateComparisonBars(status.zDoppler, status.zCosmo);
        }

        if (status.gamma !== undefined && this.elements.statusGamma) {
            this.elements.statusGamma.textContent = status.gamma.toFixed(4);
        }

        if (status.timeDilation !== undefined && this.elements.statusTimeDilation) {
            this.elements.statusTimeDilation.textContent = status.timeDilation.toFixed(4);
        }

        if (status.time !== undefined) {
            this.elements.statusTime.textContent = `${status.time.toFixed(1)} s`;
        }
    }

    /**
     * Update color preview boxes
     * @param {number} wavelengthEmit - Emitted wavelength
     * @param {number} wavelengthObs - Observed wavelength
     */
    updateColorPreviews(wavelengthEmit, wavelengthObs) {
        const emitColor = wavelengthToHex(wavelengthEmit);
        const obsColor = wavelengthToHex(wavelengthObs);

        this.elements.previewEmitted.style.backgroundColor = emitColor;
        this.elements.previewEmitted.style.boxShadow = `0 0 15px ${emitColor}`;

        this.elements.previewObserved.style.backgroundColor = obsColor;
        this.elements.previewObserved.style.boxShadow = `0 0 15px ${obsColor}`;
    }

    /**
     * Toggle info overlay
     */
    toggleInfo() {
        if (this.elements.infoOverlay) {
            this.elements.infoOverlay.classList.toggle('visible');
        }
    }

    /**
     * Update comparison bars for Doppler vs Cosmological contribution
     * @param {number} zDoppler - Doppler redshift
     * @param {number} zCosmo - Cosmological redshift
     */
    updateComparisonBars(zDoppler, zCosmo) {
        if (!this.elements.barDoppler || !this.elements.barCosmo) return;

        // Calculate absolute contributions for visualization
        const absDoppler = Math.abs(zDoppler);
        const absCosmo = Math.abs(zCosmo);
        const total = absDoppler + absCosmo;

        if (total === 0) {
            this.elements.barDoppler.style.width = '0%';
            this.elements.barCosmo.style.width = '0%';
            this.elements.compDopplerValue.textContent = '0%';
            this.elements.compCosmoValue.textContent = '0%';
            return;
        }

        const dopplerPercent = (absDoppler / total) * 100;
        const cosmoPercent = (absCosmo / total) * 100;

        this.elements.barDoppler.style.width = `${dopplerPercent}%`;
        this.elements.barCosmo.style.width = `${cosmoPercent}%`;

        this.elements.compDopplerValue.textContent = `${dopplerPercent.toFixed(0)}%`;
        this.elements.compCosmoValue.textContent = `${cosmoPercent.toFixed(0)}%`;

        // Color the Doppler bar based on direction (red for redshift, blue for blueshift)
        if (zDoppler < 0) {
            this.elements.barDoppler.style.background = 'linear-gradient(90deg, #4060ff 0%, #6080ff 100%)';
        } else {
            this.elements.barDoppler.style.background = 'linear-gradient(90deg, var(--accent-orange) 0%, #ff4040 100%)';
        }
    }

    /**
     * Get current UI values
     * @returns {Object}
     */
    getValues() {
        const angle = this.elements.angleSlider ? parseFloat(this.elements.angleSlider.value) : 0;
        return {
            hubble: parseFloat(this.elements.hubbleSlider.value),
            velocity: parseFloat(this.elements.velocitySlider.value),
            angle: angle,
            distance: parseFloat(this.elements.distanceSlider.value),
            wavelength: parseFloat(this.elements.wavelengthSlider.value)
        };
    }

    /**
     * Set slider value
     * @param {string} slider - Slider name
     * @param {number} value - New value
     */
    setSliderValue(slider, value) {
        switch (slider) {
            case 'hubble':
                this.elements.hubbleSlider.value = value;
                this.elements.hubbleValue.textContent = value.toFixed(0);
                break;
            case 'velocity':
                this.elements.velocitySlider.value = value;
                this.elements.velocityValue.textContent = value.toFixed(0);
                break;
            case 'angle':
                if (this.elements.angleSlider) {
                    this.elements.angleSlider.value = value;
                    this.elements.angleValue.textContent = value.toFixed(0);
                }
                break;
            case 'distance':
                this.elements.distanceSlider.value = value;
                this.elements.distanceValue.textContent = value.toFixed(0);
                break;
            case 'wavelength':
                this.elements.wavelengthSlider.value = value;
                this.elements.wavelengthValue.textContent = value.toFixed(0);
                break;
        }
    }

    /**
     * Update pause button text
     * @param {boolean} isPaused
     */
    updatePauseButton(isPaused) {
        this.elements.btnPause.textContent = isPaused ? 'Resume' : 'Pause';
    }

    /**
     * Register event callback
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    /**
     * Emit event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(cb => cb(data));
        }
    }
}
