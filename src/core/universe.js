/**
 * Universe Module - Manages the expanding universe model
 *
 * Handles:
 * - Scale factor evolution a(t)
 * - Time progression
 * - Mode-dependent behavior (cosmological vs doppler)
 */

import { SimulationMode, CONSTANTS } from './physics.js';

export class Universe {
    constructor() {
        this.reset();
    }

    reset() {
        this.time = 0;
        this.scaleFactor = 1.0;
        this.H0 = CONSTANTS.H0_default;
        this.mode = SimulationMode.COSMOLOGICAL;
        this.isRunning = false;
        this.isPaused = false;

        // For tracking expansion history
        this.scaleFactorHistory = [{ time: 0, scaleFactor: 1.0 }];
    }

    /**
     * Set simulation mode
     * @param {string} mode - One of SimulationMode values
     */
    setMode(mode) {
        this.mode = mode;
    }

    /**
     * Set Hubble constant
     * @param {number} H0 - Hubble constant in km/s/Mpc
     */
    setH0(H0) {
        this.H0 = H0;
    }

    /**
     * Start the simulation
     */
    start() {
        this.isRunning = true;
        this.isPaused = false;
    }

    /**
     * Pause/unpause the simulation
     */
    togglePause() {
        this.isPaused = !this.isPaused;
    }

    /**
     * Update universe state
     * @param {number} dt - Time step in seconds
     *
     * Physics: Scale factor evolution in de Sitter (dark-energy dominated) universe
     *
     * The Hubble parameter H0 has units of km/s/Mpc ≈ 2.27×10⁻¹⁸ s⁻¹ for H0=70
     * For a de Sitter universe: ȧ/a = H (constant) → a(t) = a(0)·exp(H·t)
     *
     * For visualization, we scale H0 to make expansion visible on human timescales:
     * H0_sim = H0 / VISUAL_SCALE_FACTOR (dimensionless, per simulation second)
     */
    update(dt) {
        if (!this.isRunning || this.isPaused) {
            return;
        }

        this.time += dt;

        // Only update scale factor in cosmological or mixed mode
        if (this.mode === SimulationMode.COSMOLOGICAL || this.mode === SimulationMode.MIXED) {
            // H0 conversion for visualization:
            // Real H0 = 70 km/s/Mpc ≈ 2.27×10⁻¹⁸ s⁻¹ (far too slow to visualize)
            // We use a visual scaling factor to make expansion perceptible
            // H0_sim ≈ H0 / 500 gives ~0.14 per second for H0=70
            const VISUAL_SCALE_FACTOR = 500;
            const H0_sim = this.H0 / VISUAL_SCALE_FACTOR;

            // Proper exponential evolution: a(t) = a(0) * exp(H0_sim * t)
            // Using multiplicative update: a(t+dt) = a(t) * exp(H0_sim * dt)
            // This is exact for constant H (de Sitter universe)
            this.scaleFactor *= Math.exp(H0_sim * dt);

            // Clamp to prevent extreme values (a > 10 is beyond most visualizations)
            this.scaleFactor = Math.min(this.scaleFactor, 10.0);
        } else {
            // Doppler-only mode: space doesn't expand
            this.scaleFactor = 1.0;
        }

        // Record history (for graphs)
        if (this.scaleFactorHistory.length > 1000) {
            this.scaleFactorHistory.shift();
        }
        this.scaleFactorHistory.push({
            time: this.time,
            scaleFactor: this.scaleFactor
        });
    }

    /**
     * Get scale factor at a past time (for in-flight photons)
     * @param {number} t - Past time
     * @returns {number} Scale factor at that time
     *
     * For exponential expansion: a(t) = a(0)·exp(H·t)
     * Given a(now), we can find a(t_past) = a(now) / exp(H·(now - t_past))
     */
    getScaleFactorAtTime(t) {
        if (t >= this.time) return this.scaleFactor;
        if (t <= 0) return 1.0;

        // For cosmological/mixed mode, reconstruct past scale factor
        if (this.mode === SimulationMode.COSMOLOGICAL || this.mode === SimulationMode.MIXED) {
            const VISUAL_SCALE_FACTOR = 500;
            const H0_sim = this.H0 / VISUAL_SCALE_FACTOR;

            // Inverse of exponential growth: a(t_past) = a(now) · exp(-H0_sim · Δt)
            // where Δt = (now - t_past) > 0
            return this.scaleFactor * Math.exp(-H0_sim * (this.time - t));
        }

        return 1.0;
    }

    /**
     * Get the cosmological redshift for light emitted at time t_emit
     * @param {number} tEmit - Emission time
     * @returns {number} Cosmological redshift z
     */
    getCosmologicalRedshift(tEmit) {
        const aEmit = this.getScaleFactorAtTime(tEmit);
        if (aEmit <= 0) return 0;
        return (this.scaleFactor / aEmit) - 1;
    }

    /**
     * Convert comoving distance to physical distance
     * @param {number} comovingDistance - Comoving distance
     * @returns {number} Physical (proper) distance
     */
    comovingToPhysical(comovingDistance) {
        return comovingDistance * this.scaleFactor;
    }

    /**
     * Convert physical distance to comoving distance
     * @param {number} physicalDistance - Physical distance
     * @returns {number} Comoving distance
     */
    physicalToComoving(physicalDistance) {
        if (this.scaleFactor <= 0) return physicalDistance;
        return physicalDistance / this.scaleFactor;
    }

    /**
     * Get state for UI display
     * @returns {Object} Current state
     */
    getState() {
        return {
            time: this.time,
            scaleFactor: this.scaleFactor,
            H0: this.H0,
            mode: this.mode,
            isRunning: this.isRunning,
            isPaused: this.isPaused
        };
    }
}
