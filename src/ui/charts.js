/**
 * Charts Module - Graph visualization for wavelength/redshift
 *
 * Uses Chart.js to display:
 * - Wavelength evolution over time with effect separation
 * - Shows: Rest wavelength, Doppler-only, and Total observed
 */

import { wavelengthToRGB, CONSTANTS } from '../core/physics.js';

export class WavelengthChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.chart = null;

        this.maxDataPoints = 200;
        this.data = {
            time: [],
            wavelengthTotal: [],
            wavelengthDopplerOnly: [],
            restWavelength: CONSTANTS.WAVELENGTH_HALPHA
        };

        // Binary star mode
        this.binaryMode = false;
        this.binaryData = {
            star1Wavelength: [],
            star2Wavelength: [],
            combinedWavelength: [],
            eclipseDepth: []
        };

        this.init();
    }

    init() {
        // Create Chart.js instance with 4 datasets for clear separation
        this.chart = new Chart(this.ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Total Observed (λ_obs)',
                        data: [],
                        borderColor: '#00ffff',
                        backgroundColor: 'rgba(0, 255, 255, 0.15)',
                        borderWidth: 3,
                        fill: '+1', // Fill to next dataset
                        tension: 0.3,
                        pointRadius: 0,
                        order: 1
                    },
                    {
                        label: 'Doppler Only (λ_doppler)',
                        data: [],
                        borderColor: '#ff8000',
                        backgroundColor: 'rgba(255, 128, 0, 0.15)',
                        borderWidth: 2,
                        borderDash: [8, 4],
                        fill: '+1', // Fill to rest wavelength
                        tension: 0.3,
                        pointRadius: 0,
                        order: 2
                    },
                    {
                        label: 'Rest Wavelength (λ₀)',
                        data: [],
                        borderColor: '#00ff64',
                        borderWidth: 2,
                        borderDash: [4, 4],
                        fill: false,
                        pointRadius: 0,
                        order: 3
                    },
                    // Binary star datasets (hidden by default)
                    {
                        label: 'Primary Star (λ₁)',
                        data: [],
                        borderColor: '#ffdd44',
                        backgroundColor: 'rgba(255, 221, 68, 0.2)',
                        borderWidth: 2.5,
                        fill: false,
                        tension: 0.3,
                        pointRadius: 0,
                        hidden: true,
                        order: 0
                    },
                    {
                        label: 'Secondary Star (λ₂)',
                        data: [],
                        borderColor: '#aaccff',
                        backgroundColor: 'rgba(170, 204, 255, 0.2)',
                        borderWidth: 2.5,
                        fill: false,
                        tension: 0.3,
                        pointRadius: 0,
                        hidden: true,
                        order: 0
                    },
                    {
                        label: 'Eclipse Depth',
                        data: [],
                        borderColor: '#ff4444',
                        backgroundColor: 'rgba(255, 68, 68, 0.3)',
                        borderWidth: 1,
                        fill: true,
                        tension: 0.1,
                        pointRadius: 0,
                        hidden: true,
                        yAxisID: 'y1',
                        order: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#e0e0f0',
                            font: {
                                size: 11,
                                weight: 'bold'
                            },
                            usePointStyle: true,
                            padding: 12
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 15, 30, 0.95)',
                        titleColor: '#00ffff',
                        bodyColor: '#e0e0f0',
                        borderColor: '#404080',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                const label = context.dataset.label || '';
                                // Show more precision for wavelength
                                return `${label}: ${value.toFixed(3)} nm`;
                            },
                            afterBody: function(context) {
                                if (context.length >= 3) {
                                    const total = context[0].parsed.y;
                                    const doppler = context[1].parsed.y;
                                    const rest = context[2].parsed.y;

                                    // Calculate z values
                                    const zTotal = (total / rest) - 1;
                                    const zDoppler = (doppler / rest) - 1;
                                    // Cosmological is the ratio of total to doppler-only
                                    const zCosmo = doppler > 0 ? ((total / doppler) - 1) : 0;

                                    // Calculate wavelength shifts (Δλ)
                                    const deltaTotal = total - rest;
                                    const deltaDoppler = doppler - rest;
                                    const deltaCosmo = total - doppler;

                                    return [
                                        '',
                                        '─────────────────────',
                                        `Δλ (Total): ${deltaTotal >= 0 ? '+' : ''}${deltaTotal.toFixed(3)} nm`,
                                        `Δλ (Doppler): ${deltaDoppler >= 0 ? '+' : ''}${deltaDoppler.toFixed(3)} nm`,
                                        `Δλ (Cosmo): ${deltaCosmo >= 0 ? '+' : ''}${deltaCosmo.toFixed(3)} nm`,
                                        '',
                                        `z (Total): ${zTotal.toFixed(6)}`,
                                        `z (Doppler): ${zDoppler.toFixed(6)}`,
                                        `z (Cosmo): ${zCosmo.toFixed(6)}`
                                    ];
                                }
                                return [];
                            }
                        }
                    },
                    // Custom annotation for current values
                    annotation: {
                        annotations: {}
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'Time (seconds)',
                            color: '#a0a0c0',
                            font: { size: 12, weight: 'bold' }
                        },
                        ticks: {
                            color: '#8080a0',
                            callback: function(value) {
                                return value.toFixed(1) + 's';
                            }
                        },
                        grid: {
                            color: 'rgba(80, 80, 120, 0.25)'
                        }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Wavelength (nm)',
                            color: '#a0a0c0',
                            font: { size: 12, weight: 'bold' }
                        },
                        ticks: {
                            color: '#8080a0',
                            callback: function(value) {
                                return value.toFixed(0);
                            }
                        },
                        grid: {
                            color: 'rgba(80, 80, 120, 0.25)'
                        }
                    },
                    // Secondary Y-axis for eclipse depth (0-1)
                    y1: {
                        type: 'linear',
                        position: 'right',
                        display: false, // Hidden by default, shown in binary mode
                        min: 0,
                        max: 1,
                        title: {
                            display: true,
                            text: 'Eclipse Depth',
                            color: '#ff4444',
                            font: { size: 10 }
                        },
                        ticks: {
                            color: '#ff6666',
                            callback: function(value) {
                                return (value * 100).toFixed(0) + '%';
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    /**
     * Add data point with effect separation
     * @param {number} time - Current time
     * @param {number} wavelengthTotal - Total observed wavelength
     * @param {number} wavelengthDopplerOnly - Wavelength with only Doppler effect
     * @param {number} restWavelength - Rest wavelength
     */
    addDataPoint(time, wavelengthTotal, wavelengthDopplerOnly, restWavelength) {
        this.data.time.push(time);
        this.data.wavelengthTotal.push(wavelengthTotal);
        this.data.wavelengthDopplerOnly.push(wavelengthDopplerOnly);
        this.data.restWavelength = restWavelength;

        // Update chart data
        this.chart.data.labels.push(time.toFixed(1));
        this.chart.data.datasets[0].data.push({ x: time, y: wavelengthTotal });
        this.chart.data.datasets[1].data.push({ x: time, y: wavelengthDopplerOnly });
        this.chart.data.datasets[2].data.push({ x: time, y: restWavelength });

        // Trim old data
        if (this.data.time.length > this.maxDataPoints) {
            this.data.time.shift();
            this.data.wavelengthTotal.shift();
            this.data.wavelengthDopplerOnly.shift();
            this.chart.data.labels.shift();
            this.chart.data.datasets[0].data.shift();
            this.chart.data.datasets[1].data.shift();
            this.chart.data.datasets[2].data.shift();
        }

        // Update line color based on latest wavelength
        const color = this.getWavelengthColor(wavelengthTotal);
        this.chart.data.datasets[0].borderColor = color;
        this.chart.data.datasets[0].backgroundColor = color.replace(')', ', 0.15)').replace('rgb', 'rgba');

        this.chart.update('none');
    }

    /**
     * Simplified add for backwards compatibility
     */
    addDataPointSimple(time, wavelength, restWavelength) {
        // When no separation data, use same value for total and doppler
        this.addDataPoint(time, wavelength, wavelength, restWavelength);
    }

    /**
     * Enable/disable binary star mode
     * In binary mode, shows individual star wavelengths and eclipse depth
     * @param {boolean} enabled
     */
    setBinaryMode(enabled) {
        this.binaryMode = enabled;

        // Toggle dataset visibility
        // Datasets: 0=Total, 1=Doppler, 2=Rest, 3=Star1, 4=Star2, 5=Eclipse
        this.chart.data.datasets[0].hidden = enabled; // Hide total in binary mode
        this.chart.data.datasets[1].hidden = enabled; // Hide doppler-only
        this.chart.data.datasets[2].hidden = false;   // Always show rest wavelength
        this.chart.data.datasets[3].hidden = !enabled; // Show star 1
        this.chart.data.datasets[4].hidden = !enabled; // Show star 2
        this.chart.data.datasets[5].hidden = !enabled; // Show eclipse depth

        // Toggle secondary Y-axis
        this.chart.options.scales.y1.display = enabled;

        // Update legend labels for binary mode
        if (enabled) {
            this.chart.data.datasets[2].label = 'Rest Wavelength (λ₀)';
        }

        this.chart.update('none');
    }

    /**
     * Add data point for binary star system
     * @param {number} time - Current time
     * @param {number} star1Wavelength - Primary star observed wavelength
     * @param {number} star2Wavelength - Secondary star observed wavelength
     * @param {number} restWavelength - Rest wavelength
     * @param {number} eclipseDepth - Eclipse depth (0-1)
     * @param {boolean} star1Eclipsed - Is star 1 currently eclipsed
     * @param {boolean} star2Eclipsed - Is star 2 currently eclipsed
     */
    addBinaryDataPoint(time, star1Wavelength, star2Wavelength, restWavelength, eclipseDepth = 0, star1Eclipsed = false, star2Eclipsed = false) {
        // Store data
        this.data.time.push(time);
        this.binaryData.star1Wavelength.push(star1Wavelength);
        this.binaryData.star2Wavelength.push(star2Wavelength);
        this.binaryData.eclipseDepth.push(eclipseDepth);

        // Calculate combined wavelength (luminosity-weighted average, accounting for eclipses)
        const lum1 = star1Eclipsed ? (1 - eclipseDepth) : 1;
        const lum2 = star2Eclipsed ? (1 - eclipseDepth) : 1;
        const totalLum = lum1 + lum2;
        const combinedWavelength = totalLum > 0 ?
            (star1Wavelength * lum1 + star2Wavelength * lum2) / totalLum :
            restWavelength;
        this.binaryData.combinedWavelength.push(combinedWavelength);

        // Update chart labels
        this.chart.data.labels.push(time.toFixed(1));

        // Update standard datasets (for compatibility)
        this.chart.data.datasets[0].data.push({ x: time, y: combinedWavelength });
        this.chart.data.datasets[1].data.push({ x: time, y: combinedWavelength });
        this.chart.data.datasets[2].data.push({ x: time, y: restWavelength });

        // Update binary star datasets
        // Apply visual dimming for eclipsed stars
        this.chart.data.datasets[3].data.push({ x: time, y: star1Wavelength });
        this.chart.data.datasets[4].data.push({ x: time, y: star2Wavelength });
        this.chart.data.datasets[5].data.push({ x: time, y: eclipseDepth });

        // Update line styles based on eclipse state
        // Dim the eclipsed star's line
        if (star1Eclipsed && eclipseDepth > 0.3) {
            this.chart.data.datasets[3].borderColor = 'rgba(255, 221, 68, 0.4)';
            this.chart.data.datasets[3].borderDash = [4, 4];
        } else {
            this.chart.data.datasets[3].borderColor = '#ffdd44';
            this.chart.data.datasets[3].borderDash = [];
        }

        if (star2Eclipsed && eclipseDepth > 0.3) {
            this.chart.data.datasets[4].borderColor = 'rgba(170, 204, 255, 0.4)';
            this.chart.data.datasets[4].borderDash = [4, 4];
        } else {
            this.chart.data.datasets[4].borderColor = '#aaccff';
            this.chart.data.datasets[4].borderDash = [];
        }

        // Trim old data
        if (this.data.time.length > this.maxDataPoints) {
            this.data.time.shift();
            this.binaryData.star1Wavelength.shift();
            this.binaryData.star2Wavelength.shift();
            this.binaryData.combinedWavelength.shift();
            this.binaryData.eclipseDepth.shift();

            this.chart.data.labels.shift();
            for (let i = 0; i < 6; i++) {
                this.chart.data.datasets[i].data.shift();
            }
        }

        this.chart.update('none');
    }

    /**
     * Get CSS color from wavelength
     * @param {number} wavelength
     * @returns {string}
     */
    getWavelengthColor(wavelength) {
        const rgb = wavelengthToRGB(wavelength);
        return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    }

    /**
     * Clear chart data
     */
    clear() {
        this.data.time = [];
        this.data.wavelengthTotal = [];
        this.data.wavelengthDopplerOnly = [];

        // Clear binary star data
        this.binaryData.star1Wavelength = [];
        this.binaryData.star2Wavelength = [];
        this.binaryData.combinedWavelength = [];
        this.binaryData.eclipseDepth = [];

        this.chart.data.labels = [];
        this.chart.data.datasets.forEach(ds => ds.data = []);

        // Reset colors
        this.chart.data.datasets[0].borderColor = '#00ffff';
        this.chart.data.datasets[0].backgroundColor = 'rgba(0, 255, 255, 0.15)';

        // Reset binary star line styles
        this.chart.data.datasets[3].borderColor = '#ffdd44';
        this.chart.data.datasets[3].borderDash = [];
        this.chart.data.datasets[4].borderColor = '#aaccff';
        this.chart.data.datasets[4].borderDash = [];

        this.chart.update('none');
    }

    /**
     * Update y-axis range
     * @param {number} min
     * @param {number} max
     */
    setYAxisRange(min, max) {
        this.chart.options.scales.y.min = min;
        this.chart.options.scales.y.max = max;
        this.chart.update('none');
    }

    /**
     * Destroy chart
     */
    dispose() {
        if (this.chart) {
            this.chart.destroy();
        }
    }
}

/**
 * Redshift components chart (optional secondary chart)
 * Shows z values for each component
 */
export class RedshiftChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);

        if (!this.canvas) {
            console.warn('Redshift chart canvas not found');
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.chart = null;
        this.maxDataPoints = 200;

        this.init();
    }

    init() {
        this.chart = new Chart(this.ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'z (Total)',
                        data: [],
                        borderColor: '#00ffff',
                        backgroundColor: 'rgba(0, 255, 255, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 0
                    },
                    {
                        label: 'z (Doppler)',
                        data: [],
                        borderColor: '#ff8000',
                        borderWidth: 2,
                        borderDash: [6, 3],
                        fill: false,
                        tension: 0.3,
                        pointRadius: 0
                    },
                    {
                        label: 'z (Cosmological)',
                        data: [],
                        borderColor: '#ff00ff',
                        borderWidth: 2,
                        borderDash: [6, 3],
                        fill: false,
                        tension: 0.3,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#e0e0f0',
                            font: {
                                size: 11,
                                weight: 'bold'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(6)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'Time (s)',
                            color: '#8080a0'
                        },
                        ticks: {
                            color: '#8080a0'
                        },
                        grid: {
                            color: 'rgba(80, 80, 120, 0.25)'
                        }
                    },
                    y: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'Redshift (z)',
                            color: '#8080a0'
                        },
                        ticks: {
                            color: '#8080a0',
                            callback: function(value) {
                                return value.toFixed(4);
                            }
                        },
                        grid: {
                            color: 'rgba(80, 80, 120, 0.25)'
                        }
                    }
                }
            }
        });
    }

    /**
     * Add data point
     * @param {number} time
     * @param {number} zTotal
     * @param {number} zDoppler
     * @param {number} zCosmo
     */
    addDataPoint(time, zTotal, zDoppler, zCosmo) {
        if (!this.chart) return;

        this.chart.data.labels.push(time.toFixed(1));
        this.chart.data.datasets[0].data.push({ x: time, y: zTotal });
        this.chart.data.datasets[1].data.push({ x: time, y: zDoppler });
        this.chart.data.datasets[2].data.push({ x: time, y: zCosmo });

        // Trim old data
        if (this.chart.data.labels.length > this.maxDataPoints) {
            this.chart.data.labels.shift();
            this.chart.data.datasets.forEach(ds => ds.data.shift());
        }

        this.chart.update('none');
    }

    clear() {
        if (!this.chart) return;

        this.chart.data.labels = [];
        this.chart.data.datasets.forEach(ds => ds.data = []);
        this.chart.update('none');
    }

    dispose() {
        if (this.chart) {
            this.chart.destroy();
        }
    }
}
