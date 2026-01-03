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

        this.chart.data.labels = [];
        this.chart.data.datasets.forEach(ds => ds.data = []);

        // Reset colors
        this.chart.data.datasets[0].borderColor = '#00ffff';
        this.chart.data.datasets[0].backgroundColor = 'rgba(0, 255, 255, 0.15)';

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
