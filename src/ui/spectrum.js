/**
 * Spectrum Module - Emission/Absorption Spectrum Visualization
 * VERSION 1.0
 *
 * Shows spectral lines shifting with redshift in real-time.
 * Displays rest spectrum vs observed spectrum side by side.
 *
 * Common spectral lines:
 * - H-alpha: 656.28 nm (red)
 * - H-beta: 486.13 nm (cyan)
 * - H-gamma: 434.05 nm (violet)
 * - H-delta: 410.17 nm (violet)
 * - OIII: 500.7 nm (green)
 * - NaD: 589.0 nm (yellow)
 */

console.log('Spectrum.js loading...');

import { wavelengthToHex, CONSTANTS } from '../core/physics.js';

console.log('Spectrum.js: imports complete');

// Common astronomical spectral lines (wavelength in nm)
export const SPECTRAL_LINES = {
    H_ALPHA: { wavelength: 656.28, name: 'H-α', series: 'Balmer' },
    H_BETA: { wavelength: 486.13, name: 'H-β', series: 'Balmer' },
    H_GAMMA: { wavelength: 434.05, name: 'H-γ', series: 'Balmer' },
    H_DELTA: { wavelength: 410.17, name: 'H-δ', series: 'Balmer' },
    O_III_1: { wavelength: 495.9, name: '[OIII]', series: 'Forbidden' },
    O_III_2: { wavelength: 500.7, name: '[OIII]', series: 'Forbidden' },
    NA_D1: { wavelength: 589.0, name: 'Na D₁', series: 'Sodium' },
    NA_D2: { wavelength: 589.6, name: 'Na D₂', series: 'Sodium' },
    CA_K: { wavelength: 393.4, name: 'Ca K', series: 'Calcium' },
    CA_H: { wavelength: 396.8, name: 'Ca H', series: 'Calcium' },
    MG_B: { wavelength: 518.4, name: 'Mg b', series: 'Magnesium' },
};

// Standard set for display (subset of most recognizable lines)
const DISPLAY_LINES = [
    SPECTRAL_LINES.CA_K,
    SPECTRAL_LINES.H_DELTA,
    SPECTRAL_LINES.H_GAMMA,
    SPECTRAL_LINES.H_BETA,
    SPECTRAL_LINES.O_III_2,
    SPECTRAL_LINES.MG_B,
    SPECTRAL_LINES.NA_D1,
    SPECTRAL_LINES.H_ALPHA,
];

export class SpectrumDisplay {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn('Spectrum container not found:', containerId);
            return;
        }

        this.currentRedshift = 0;
        this.visualAmplification = 5; // For visibility

        this.createDisplay();
        this.updateSpectrum(0, 0, 0);
    }

    createDisplay() {
        // Create the spectrum display structure
        this.container.innerHTML = `
            <div class="spectrum-wrapper">
                <div class="spectrum-row">
                    <div class="spectrum-label">Rest (z=0)</div>
                    <div class="spectrum-bar rest-spectrum">
                        <div class="spectrum-gradient"></div>
                        <div class="spectral-lines rest-lines"></div>
                    </div>
                </div>
                <div class="spectrum-row">
                    <div class="spectrum-label">Observed</div>
                    <div class="spectrum-bar observed-spectrum">
                        <div class="spectrum-gradient"></div>
                        <div class="spectral-lines observed-lines"></div>
                    </div>
                </div>
                <div class="spectrum-scale">
                    <span>380nm</span>
                    <span>UV</span>
                    <span>Violet</span>
                    <span>Blue</span>
                    <span>Green</span>
                    <span>Yellow</span>
                    <span>Red</span>
                    <span>750nm</span>
                    <span>IR</span>
                </div>
                <div class="redshift-indicator">
                    <span class="z-doppler">z<sub>D</sub>=0</span>
                    <span class="z-cosmo">z<sub>C</sub>=0</span>
                    <span class="z-total">z<sub>total</sub>=0</span>
                </div>
            </div>
        `;

        // Cache element references
        this.restLines = this.container.querySelector('.rest-lines');
        this.observedLines = this.container.querySelector('.observed-lines');
        this.zDopplerEl = this.container.querySelector('.z-doppler');
        this.zCosmoEl = this.container.querySelector('.z-cosmo');
        this.zTotalEl = this.container.querySelector('.z-total');

        // Draw rest spectrum lines (static)
        this.drawSpectralLines(this.restLines, 0);
    }

    /**
     * Draw spectral lines on a container
     * @param {HTMLElement} container - Container element
     * @param {number} redshift - Redshift to apply (0 for rest)
     */
    drawSpectralLines(container, redshift) {
        if (!container) return;
        container.innerHTML = '';

        const minWavelength = 350; // Extended range for display
        const maxWavelength = 850; // Extended range for display
        const range = maxWavelength - minWavelength;

        DISPLAY_LINES.forEach(line => {
            // Apply redshift: λ_obs = λ_rest * (1 + z)
            const observedWavelength = line.wavelength * (1 + redshift);

            // Calculate position (percentage)
            const position = ((observedWavelength - minWavelength) / range) * 100;

            // Skip if outside visible range
            if (position < 0 || position > 100) {
                // Create a faded indicator at the edge
                const edgePosition = position < 0 ? 0 : 100;
                const lineEl = document.createElement('div');
                lineEl.className = 'spectral-line out-of-range';
                lineEl.style.left = `${edgePosition}%`;
                lineEl.style.backgroundColor = 'rgba(255,255,255,0.3)';
                lineEl.title = `${line.name}: ${observedWavelength.toFixed(1)}nm (out of visible range)`;
                container.appendChild(lineEl);
                return;
            }

            // Create line element
            const lineEl = document.createElement('div');
            lineEl.className = 'spectral-line';
            lineEl.style.left = `${position}%`;
            lineEl.style.backgroundColor = wavelengthToHex(observedWavelength);
            lineEl.style.boxShadow = `0 0 8px ${wavelengthToHex(observedWavelength)}`;
            lineEl.title = `${line.name}: ${observedWavelength.toFixed(1)}nm`;

            // Add label on hover
            const labelEl = document.createElement('span');
            labelEl.className = 'line-label';
            labelEl.textContent = line.name;
            lineEl.appendChild(labelEl);

            container.appendChild(lineEl);
        });
    }

    /**
     * Update spectrum display with new redshift values
     * @param {number} zDoppler - Doppler redshift
     * @param {number} zCosmo - Cosmological redshift
     * @param {number} zTotal - Total redshift
     */
    updateSpectrum(zDoppler, zCosmo, zTotal) {
        if (!this.container) return;

        this.currentRedshift = zTotal;

        // Apply visual amplification for educational effect
        const zVisual = zTotal * this.visualAmplification;

        // Update observed spectrum lines
        this.drawSpectralLines(this.observedLines, zVisual);

        // Update redshift indicators (with null checks)
        if (this.zDopplerEl) {
            this.zDopplerEl.innerHTML = `z<sub>D</sub>=${zDoppler >= 0 ? '+' : ''}${zDoppler.toFixed(4)}`;
            this.zDopplerEl.style.color = zDoppler > 0 ? '#ff6060' : (zDoppler < 0 ? '#6060ff' : '#ffffff');
        }
        if (this.zCosmoEl) {
            this.zCosmoEl.innerHTML = `z<sub>C</sub>=${zCosmo >= 0 ? '+' : ''}${zCosmo.toFixed(4)}`;
            this.zCosmoEl.style.color = zCosmo > 0 ? '#ff6060' : '#ffffff';
        }
        if (this.zTotalEl) {
            this.zTotalEl.innerHTML = `z<sub>total</sub>=${zTotal >= 0 ? '+' : ''}${zTotal.toFixed(4)}`;
            this.zTotalEl.style.color = zTotal > 0 ? '#ff6060' : (zTotal < 0 ? '#6060ff' : '#ffffff');
        }
    }

    /**
     * Set visual amplification factor
     * @param {number} factor - Amplification factor
     */
    setAmplification(factor) {
        this.visualAmplification = factor;
        this.updateSpectrum(0, 0, this.currentRedshift);
    }

    /**
     * Reset to rest spectrum
     */
    reset() {
        this.updateSpectrum(0, 0, 0);
    }

    dispose() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
