/**
 * Presets Module - Famous Astronomical Objects
 * VERSION 3.0 - 4 iconic objects with normalized visual distances
 *
 * Each preset represents a famous, recognizable astronomical object
 * with unique visual representation.
 *
 * NOTE: Visual distances/velocities are NORMALIZED for the simulation
 * to keep all objects visible and comparable. Real values are in comments.
 */

console.log('Presets.js v3.0 loading - 4 Famous Objects (Normalized)');

import { CONSTANTS } from '../core/physics.js';

/**
 * Source types for different visualizations
 */
export const SourceType = {
    STAR: 'star',           // Sun-like star
    QUASAR: 'quasar',       // Distant quasar with jets
    GALAXY: 'galaxy',       // Spiral galaxy (default)
    CLUSTER: 'cluster',     // Galaxy cluster
    PULSAR: 'pulsar',       // Rotating neutron star with beams
    BINARY: 'binary'        // Binary star system
};

/**
 * Four famous astronomical presets
 * Distances and velocities are NORMALIZED for visual purposes
 */
export const PRESETS = {
    // 1. Our Sun - The closest star, perfect for demonstrating pure Doppler
    SUN: {
        id: 'SUN',
        name: 'The Sun',
        description: 'Our nearest star - pure Doppler effect',
        // Real: 0.000005 Mpc, Visual: 80 Mpc (normalized for scene)
        distance: 80,
        // User can adjust velocity to see Doppler effect
        velocity: 5000,         // Demo velocity for visible effect
        redshift: 0.017,
        hubble: 70,
        wavelength: CONSTANTS.WAVELENGTH_HALPHA,
        mode: 'doppler',
        sourceType: SourceType.STAR,
        color: 0xffdd44,
        size: 1.0,
        glowColor: 0xffaa00
    },

    // 2. Quasar 3C 273 - The first quasar ever discovered
    QUASAR_3C273: {
        id: 'QUASAR_3C273',
        name: 'Quasar 3C 273',
        description: 'First quasar discovered - cosmological redshift (z=0.158)',
        // Real: 749 Mpc, Visual: 200 Mpc (normalized)
        distance: 200,
        velocity: 0,            // Pure cosmological
        redshift: 0.158,
        hubble: 70,
        wavelength: CONSTANTS.WAVELENGTH_HALPHA,
        mode: 'cosmological',
        sourceType: SourceType.QUASAR,
        color: 0x00ffff,
        size: 1.5,
        glowColor: 0x8080ff,
        hasJets: true
    },

    // 3. Andromeda Galaxy - Our nearest large galaxy, approaching us (blueshift!)
    ANDROMEDA: {
        id: 'ANDROMEDA',
        name: 'Andromeda Galaxy (M31)',
        description: 'Nearest large galaxy - approaching us! (blueshift)',
        // Real: 0.78 Mpc, Visual: 120 Mpc (normalized)
        distance: 120,
        // Real: -301 km/s, Visual: -3000 km/s (scaled for visible blueshift)
        velocity: -3000,
        redshift: -0.01,
        hubble: 70,
        wavelength: CONSTANTS.WAVELENGTH_HALPHA,
        mode: 'doppler',
        sourceType: SourceType.GALAXY,
        color: 0x8888ff,
        size: 2.0,
        glowColor: 0x4444aa
    },

    // 4. Coma Cluster - Classic example of Hubble's Law
    COMA_CLUSTER: {
        id: 'COMA_CLUSTER',
        name: 'Coma Galaxy Cluster',
        description: 'Rich cluster - classic Hubble flow example (z=0.023)',
        // Real: 100 Mpc, Visual: 150 Mpc
        distance: 150,
        velocity: 1000,         // Small peculiar velocity
        redshift: 0.023,
        hubble: 70,
        wavelength: CONSTANTS.WAVELENGTH_HALPHA,
        mode: 'mixed',          // Shows both Doppler and cosmological
        sourceType: SourceType.CLUSTER,
        color: 0xffaa44,
        size: 2.5,
        glowColor: 0x886622
    },

    // 5. Crab Pulsar - Rapidly rotating neutron star
    PULSAR: {
        id: 'PULSAR',
        name: 'Crab Pulsar',
        description: 'Rapidly rotating neutron star - periodic Doppler shifts',
        // Real: 2 kpc ≈ 0.006 Mpc, Visual: 100 Mpc (normalized)
        distance: 100,
        velocity: 5000,         // High velocity for visible effect
        redshift: 0.017,
        hubble: 70,
        wavelength: CONSTANTS.WAVELENGTH_HALPHA,
        mode: 'doppler',        // Pure Doppler from pulsar rotation/motion
        sourceType: SourceType.PULSAR,
        color: 0x88aaff,
        size: 1.2,
        glowColor: 0x4466aa
    },

    // 6. Binary Star System - Two stars orbiting common center
    BINARY_STAR: {
        id: 'BINARY_STAR',
        name: 'Binary Star System',
        description: 'Two stars in orbit - oscillating Doppler shift',
        // Visual distance for demonstration
        distance: 90,
        velocity: 8000,         // Orbital velocity for visible effect
        redshift: 0.027,
        hubble: 70,
        wavelength: CONSTANTS.WAVELENGTH_HALPHA,
        mode: 'doppler',        // Doppler from orbital motion
        sourceType: SourceType.BINARY,
        color: 0xffcc66,
        size: 1.5,
        glowColor: 0xaa8833
    }
};

/**
 * Get all presets as array
 */
export function getAllPresets() {
    return Object.values(PRESETS);
}

/**
 * Get preset by ID
 */
export function getPreset(id) {
    return PRESETS[id] || null;
}

/**
 * Get preset display info for UI
 */
export function getPresetDisplayInfo(preset) {
    return {
        id: preset.id,
        name: preset.name,
        nameEn: preset.nameEn,
        description: preset.description,
        sourceType: preset.sourceType,
        isBlueshift: preset.velocity < 0,
        isCosmological: preset.mode === 'cosmological'
    };
}

console.log('Presets.js v3.0 loaded - 6 presets available');
