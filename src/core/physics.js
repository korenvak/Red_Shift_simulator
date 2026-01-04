/**
 * Physics Module - Complete Relativistic Redshift Calculations
 * VERSION 3.0 - Full General and Special Relativity with Proper Unit Documentation
 *
 * This module handles ALL types of redshift:
 * 1. Doppler Effect (Special Relativity) - relative motion
 * 2. Cosmological Redshift - expansion of space
 * 3. Gravitational Redshift (General Relativity) - escape from gravity wells
 * 4. Transverse Doppler Effect - time dilation at perpendicular motion
 *
 * ============================================================================
 * KEY FORMULAS
 * ============================================================================
 *
 * DOPPLER (Relativistic):
 *   z_doppler = √((1+β)/(1-β)) - 1   where β = v/c
 *   For radial motion only. Positive z = receding (redshift)
 *
 * TRANSVERSE DOPPLER (Time Dilation):
 *   z_transverse = γ - 1 = 1/√(1-β²) - 1
 *   Pure time dilation when source moves perpendicular to line of sight
 *
 * GENERAL DOPPLER (with angle):
 *   λ_obs/λ_emit = γ(1 + β·cos(θ))
 *   θ = 0: receding, θ = π: approaching, θ = π/2: transverse
 *
 * COSMOLOGICAL:
 *   z_cosmo = a_obs/a_emit - 1
 *   a(t) = scale factor of universe at time t
 *
 * GRAVITATIONAL:
 *   z_grav = 1/√(1 - r_s/r) - 1   where r_s = 2GM/c² (Schwarzschild radius)
 *
 * COMBINED:
 *   (1+z_total) = (1+z_doppler)(1+z_cosmo)(1+z_grav)
 *
 * ============================================================================
 * UNIT CONVENTIONS
 * ============================================================================
 *
 * Distances:
 *   - User-facing: Megaparsecs (Mpc)
 *   - Visualization: Arbitrary units scaled for display
 *
 * Velocities:
 *   - User-facing: km/s (kilometers per second)
 *   - β = v/c is dimensionless
 *
 * Hubble Constant H0:
 *   - User-facing: km/s/Mpc (e.g., H0 ≈ 70 km/s/Mpc)
 *   - Physical SI: ~2.27×10⁻¹⁸ s⁻¹ for H0=70 (far too slow to visualize!)
 *   - Simulation: H0_sim = H0 / 500 (dimensionless per simulation second)
 *
 *   The VISUAL_SCALE_FACTOR = 500 speeds up cosmic expansion by a factor
 *   of ~10¹⁹ so that changes in scale factor are visible on human timescales.
 *   This is purely for educational visualization - real cosmic expansion
 *   takes billions of years.
 *
 * Wavelengths:
 *   - All wavelengths in nanometers (nm)
 *   - Visible spectrum: 380-780 nm
 *   - H-alpha reference line: 656.28 nm
 *
 * Time:
 *   - Simulation time in seconds (for animation)
 *   - Not meant to represent real cosmic time
 *
 * ============================================================================
 */

console.log('Physics.js v3.0 loaded - Full Relativistic Physics with Proper Units');

// ============================================================================
// PHYSICAL CONSTANTS WITH UNITS
// ============================================================================
//
// All constants are documented with their SI units and common alternatives.
// The simulation uses mixed units for practical reasons:
// - Distances in Mpc (astronomical convention)
// - Velocities in km/s (astronomical convention)
// - Wavelengths in nm (optical astronomy convention)
//
export const CONSTANTS = {
    // Speed of light
    c: 299792.458,            // km/s - used for velocity/c calculations
    c_m: 299792458,           // m/s - SI units for GR calculations

    // Gravitational constant
    G: 6.67430e-11,           // m³/(kg·s²) - SI units

    // Hubble constant
    // H0 = 70 km/s/Mpc means a galaxy 1 Mpc away recedes at 70 km/s
    // In SI: H0 = 70 * (1000 m/s) / (3.086e22 m) ≈ 2.27×10⁻¹⁸ s⁻¹
    H0_default: 70.0,         // km/s/Mpc (standard astronomical units)

    // Spectral lines (nanometers)
    WAVELENGTH_HALPHA: 656.28,// H-alpha emission line - red hydrogen line
    WAVELENGTH_MIN: 380,      // Visible spectrum minimum (violet)
    WAVELENGTH_MAX: 750,      // Visible spectrum maximum (red)

    // Masses (kilograms)
    M_SUN: 1.989e30,          // Solar mass
    M_EARTH: 5.972e24,        // Earth mass
    M_GALAXY: 1e12 * 1.989e30,// Typical galaxy mass (~10¹² M_sun)

    // Distance conversions
    PC_TO_M: 3.086e16,        // 1 parsec = 3.086×10¹⁶ meters
    MPC_TO_M: 3.086e22,       // 1 megaparsec = 3.086×10²² meters
    LY_TO_M: 9.461e15,        // 1 light-year = 9.461×10¹⁵ meters
};

/**
 * Simulation modes
 */
export const SimulationMode = {
    COSMOLOGICAL: 'cosmological',
    DOPPLER: 'doppler',
    MIXED: 'mixed',
    GRAVITATIONAL: 'gravitational'  // New mode for gravitational redshift
};

// =============================================================================
// SPECIAL RELATIVITY - Doppler Effects
// =============================================================================

/**
 * Calculate Lorentz factor γ (gamma)
 * @param {number} velocity - Velocity in km/s
 * @param {number} c - Speed of light in km/s
 * @returns {number} Lorentz factor γ = 1/√(1-β²)
 */
export function lorentzFactor(velocity, c = CONSTANTS.c) {
    const beta = Math.abs(velocity) / c;
    if (beta >= 1) return Infinity;
    return 1 / Math.sqrt(1 - beta * beta);
}

/**
 * Calculate relativistic Doppler factor for radial motion
 * @param {number} velocity - Radial velocity in km/s (positive = receding)
 * @param {number} c - Speed of light in km/s
 * @returns {number} Doppler factor (λ_obs/λ_emit)
 */
export function dopplerFactor(velocity, c = CONSTANTS.c) {
    // β = v/c (positive for recession)
    let beta = velocity / c;

    // Clamp to avoid singularity at v = c
    beta = Math.max(-0.9999, Math.min(0.9999, beta));

    // Relativistic Doppler: sqrt((1+β)/(1-β))
    // For recession (β > 0): factor > 1 (redshift)
    // For approach (β < 0): factor < 1 (blueshift)
    return Math.sqrt((1 + beta) / (1 - beta));
}

/**
 * Calculate Doppler redshift z
 * @param {number} velocity - Radial velocity in km/s
 * @returns {number} Redshift z (positive = redshift, negative = blueshift)
 */
export function dopplerRedshift(velocity) {
    return dopplerFactor(velocity) - 1;
}

/**
 * Full relativistic Doppler effect with angle
 * Includes transverse Doppler effect (pure time dilation at θ = 90°)
 *
 * @param {number} velocity - Source velocity magnitude in km/s
 * @param {number} angle - Angle between velocity vector and line of sight (radians)
 *                        0 = moving directly away, π = moving directly toward
 *                        π/2 = moving perpendicular (transverse)
 * @param {number} c - Speed of light in km/s
 * @returns {number} Doppler factor
 */
export function relativisticDopplerWithAngle(velocity, angle, c = CONSTANTS.c) {
    const beta = Math.min(0.9999, Math.abs(velocity) / c);
    const gamma = 1 / Math.sqrt(1 - beta * beta);

    // Full relativistic Doppler formula:
    // f_obs/f_emit = 1 / (γ(1 + β·cos(θ)))
    // λ_obs/λ_emit = γ(1 + β·cos(θ))

    // At θ = 0 (receding): max redshift
    // At θ = π (approaching): max blueshift
    // At θ = π/2 (transverse): pure time dilation redshift (z = γ - 1)

    const factor = gamma * (1 + beta * Math.cos(angle));
    return factor;
}

/**
 * Calculate transverse Doppler effect (time dilation)
 * This is the redshift observed when source moves perpendicular to line of sight
 *
 * @param {number} velocity - Source velocity in km/s
 * @returns {number} Transverse redshift z = γ - 1
 */
export function transverseDopplerRedshift(velocity) {
    const gamma = lorentzFactor(velocity);
    return gamma - 1;
}

/**
 * Calculate time dilation factor
 * @param {number} velocity - Velocity in km/s
 * @returns {number} Time dilation factor (proper time / coordinate time)
 */
export function timeDilation(velocity) {
    const gamma = lorentzFactor(velocity);
    return 1 / gamma; // Moving clock runs slower by factor 1/γ
}

// =============================================================================
// GENERAL RELATIVITY - Gravitational Effects
// =============================================================================

/**
 * Calculate Schwarzschild radius (event horizon radius)
 * r_s = 2GM/c²
 *
 * @param {number} mass - Mass in kg
 * @returns {number} Schwarzschild radius in meters
 */
export function schwarzschildRadius(mass) {
    return (2 * CONSTANTS.G * mass) / (CONSTANTS.c_m * CONSTANTS.c_m);
}

/**
 * Calculate gravitational redshift
 * Light escaping from a gravitational well loses energy
 *
 * z_grav = 1/√(1 - r_s/r) - 1
 *
 * @param {number} mass - Mass of gravitating body in kg
 * @param {number} radius - Distance from center of mass in meters
 * @returns {number} Gravitational redshift z
 */
export function gravitationalRedshift(mass, radius) {
    const rs = schwarzschildRadius(mass);

    // Prevent singularity (r must be > rs for physical solutions)
    if (radius <= rs) {
        return Infinity; // Inside event horizon
    }

    const ratio = rs / radius;
    return 1 / Math.sqrt(1 - ratio) - 1;
}

/**
 * Calculate gravitational redshift for light traveling from r1 to r2
 * in the same gravitational field
 *
 * @param {number} mass - Mass of gravitating body in kg
 * @param {number} r1 - Emission radius in meters
 * @param {number} r2 - Observation radius in meters
 * @returns {number} Gravitational redshift z
 */
export function gravitationalRedshiftBetween(mass, r1, r2) {
    const rs = schwarzschildRadius(mass);

    if (r1 <= rs || r2 <= rs) return Infinity;

    // z = sqrt((1 - rs/r2)/(1 - rs/r1)) - 1
    const factor = Math.sqrt((1 - rs / r2) / (1 - rs / r1));
    return factor - 1;
}

/**
 * Calculate gravitational time dilation
 * Time runs slower in stronger gravitational fields
 *
 * @param {number} mass - Mass in kg
 * @param {number} radius - Distance from center in meters
 * @returns {number} Time dilation factor (proper time / coordinate time)
 */
export function gravitationalTimeDilation(mass, radius) {
    const rs = schwarzschildRadius(mass);
    if (radius <= rs) return 0; // Time stops at event horizon

    return Math.sqrt(1 - rs / radius);
}

/**
 * Calculate escape velocity at given radius
 * v_esc = sqrt(2GM/r)
 *
 * @param {number} mass - Mass in kg
 * @param {number} radius - Distance from center in meters
 * @returns {number} Escape velocity in m/s
 */
export function escapeVelocity(mass, radius) {
    return Math.sqrt(2 * CONSTANTS.G * mass / radius);
}

/**
 * Calculate gravitational potential
 * Φ = -GM/r
 *
 * @param {number} mass - Mass in kg
 * @param {number} radius - Distance from center in meters
 * @returns {number} Gravitational potential in J/kg (m²/s²)
 */
export function gravitationalPotential(mass, radius) {
    return -CONSTANTS.G * mass / radius;
}

// =============================================================================
// COSMOLOGICAL REDSHIFT
// =============================================================================

/**
 * Calculate cosmological redshift from scale factor
 * @param {number} scaleFactorEmit - Scale factor when light was emitted
 * @param {number} scaleFactorObs - Scale factor when light is observed (usually 1)
 * @returns {number} Cosmological redshift z
 */
export function cosmologicalRedshift(scaleFactorEmit, scaleFactorObs = 1.0) {
    if (scaleFactorEmit <= 0) return 0;
    return (scaleFactorObs / scaleFactorEmit) - 1;
}

/**
 * Calculate scale factor from cosmological redshift
 * a_emit = 1/(1+z)
 *
 * @param {number} z - Cosmological redshift
 * @returns {number} Scale factor at emission
 */
export function scaleFactorFromRedshift(z) {
    return 1 / (1 + z);
}

/**
 * Hubble's Law: recession velocity from distance
 * v = H0 * d
 *
 * @param {number} distance - Distance in Mpc
 * @param {number} H0 - Hubble constant in km/s/Mpc
 * @returns {number} Recession velocity in km/s
 */
export function hubbleVelocity(distance, H0 = CONSTANTS.H0_default) {
    return H0 * distance;
}

/**
 * Calculate the cosmological redshift from travel in expanding universe
 *
 * Physics: z = a_obs/a_emit - 1
 *
 * For de Sitter (exponential) expansion: a(t) = a(0)·exp(H·t)
 * Using the same VISUAL_SCALE_FACTOR as universe.js for consistency
 *
 * @param {number} emissionDistance - Comoving distance when emitted (not used, kept for API)
 * @param {number} currentTime - Current time in simulation
 * @param {number} emissionTime - Time when light was emitted
 * @param {number} H0 - Hubble constant in km/s/Mpc
 * @returns {number} Cosmological redshift z
 */
export function cosmologicalRedshiftFromTravel(emissionDistance, currentTime, emissionTime, H0) {
    // Same visual scaling as universe.js
    const VISUAL_SCALE_FACTOR = 500;
    const H0_sim = H0 / VISUAL_SCALE_FACTOR;

    // Exponential scale factor evolution: a(t) = a(0) * exp(H0_sim * t)
    // Assuming a(0) = 1 at t = 0
    const aEmit = Math.exp(H0_sim * emissionTime);
    const aNow = Math.exp(H0_sim * currentTime);

    if (aEmit <= 0) return 0;

    // z = a_obs/a_emit - 1 = exp(H0_sim * (t_now - t_emit)) - 1
    return (aNow / aEmit) - 1;
}

// =============================================================================
// COMBINED REDSHIFT
// =============================================================================

/**
 * Calculate total redshift combining ALL effects
 * (1 + z_total) = (1 + z_doppler) * (1 + z_cosmo) * (1 + z_grav)
 *
 * @param {number} zDoppler - Doppler redshift
 * @param {number} zCosmo - Cosmological redshift
 * @param {number} zGrav - Gravitational redshift (optional)
 * @returns {number} Total redshift
 */
export function totalRedshift(zDoppler, zCosmo, zGrav = 0) {
    return (1 + zDoppler) * (1 + zCosmo) * (1 + zGrav) - 1;
}

/**
 * Calculate observed wavelength from emitted wavelength and redshift
 * @param {number} wavelengthEmit - Emitted wavelength in nm
 * @param {number} z - Total redshift
 * @returns {number} Observed wavelength in nm
 */
export function observedWavelength(wavelengthEmit, z) {
    return wavelengthEmit * (1 + z);
}

/**
 * Calculate observed frequency from emitted frequency and redshift
 * @param {number} frequencyEmit - Emitted frequency in Hz
 * @param {number} z - Total redshift
 * @returns {number} Observed frequency in Hz
 */
export function observedFrequency(frequencyEmit, z) {
    return frequencyEmit / (1 + z);
}

// =============================================================================
// VISUALIZATION HELPERS
// =============================================================================

/**
 * Convert wavelength in nm to RGB color
 * Extended with "false colors" for wavelengths beyond visible range
 *
 * @param {number} wavelength - Wavelength in nanometers
 * @returns {{r: number, g: number, b: number}} RGB values (0-255)
 */
export function wavelengthToRGB(wavelength) {
    let r, g, b;

    // Extended range with false colors for educational visualization
    if (wavelength < 300) {
        // Extreme UV / Gamma - bright white-blue (false color)
        const intensity = Math.max(0.5, 1 - (300 - wavelength) / 200);
        return { r: Math.round(200 * intensity), g: Math.round(200 * intensity), b: 255 };
    } else if (wavelength < 380) {
        // UV - gradient from white-blue to violet
        const t = (wavelength - 300) / 80;
        return {
            r: Math.round(200 - 125 * t),
            g: Math.round(200 - 200 * t),
            b: 255
        };
    } else if (wavelength > 1200) {
        // Extreme IR - dark brown/black (false color for very high redshift)
        const factor = Math.max(0.15, 1 - (wavelength - 1200) / 800);
        return {
            r: Math.round(100 * factor),
            g: Math.round(20 * factor),
            b: Math.round(10 * factor)
        };
    } else if (wavelength > 780) {
        // Near IR - gradient from red to dark red to brown
        const t = Math.min(1, (wavelength - 780) / 420);
        return {
            r: Math.round(255 * (1 - t * 0.6)),
            g: Math.round(50 * (1 - t)),
            b: Math.round(20 * (1 - t))
        };
    }

    // Visible spectrum approximation (380-780nm)
    if (wavelength >= 380 && wavelength < 440) {
        r = -(wavelength - 440) / (440 - 380);
        g = 0;
        b = 1;
    } else if (wavelength >= 440 && wavelength < 490) {
        r = 0;
        g = (wavelength - 440) / (490 - 440);
        b = 1;
    } else if (wavelength >= 490 && wavelength < 510) {
        r = 0;
        g = 1;
        b = -(wavelength - 510) / (510 - 490);
    } else if (wavelength >= 510 && wavelength < 580) {
        r = (wavelength - 510) / (580 - 510);
        g = 1;
        b = 0;
    } else if (wavelength >= 580 && wavelength < 645) {
        r = 1;
        g = -(wavelength - 645) / (645 - 580);
        b = 0;
    } else {
        r = 1;
        g = 0;
        b = 0;
    }

    // Intensity adjustment at edges of visible spectrum
    let factor = 1.0;
    if (wavelength >= 380 && wavelength < 420) {
        factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
    } else if (wavelength >= 700 && wavelength <= 780) {
        factor = 0.3 + 0.7 * (780 - wavelength) / (780 - 700);
    }

    return {
        r: Math.round(255 * Math.pow(r * factor, 0.8)),
        g: Math.round(255 * Math.pow(g * factor, 0.8)),
        b: Math.round(255 * Math.pow(b * factor, 0.8))
    };
}

/**
 * Convert wavelength to hex color string
 * @param {number} wavelength - Wavelength in nm
 * @returns {string} Hex color string (e.g., "#ff0000")
 */
export function wavelengthToHex(wavelength) {
    const { r, g, b } = wavelengthToRGB(wavelength);
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert wavelength to Three.js color value
 * @param {number} wavelength - Wavelength in nm
 * @returns {number} Color as integer for Three.js
 */
export function wavelengthToThreeColor(wavelength) {
    const { r, g, b } = wavelengthToRGB(wavelength);
    return (r << 16) | (g << 8) | b;
}

// =============================================================================
// WAVE PHYSICS
// =============================================================================

/**
 * Calculate wave properties at a given point in space
 *
 * @param {number} distance - Distance from source
 * @param {number} time - Current simulation time
 * @param {number} wavelengthRest - Rest wavelength in nm
 * @param {number} frequency - Wave frequency
 * @param {number} localRedshift - Local redshift at this position
 * @returns {{amplitude: number, wavelength: number, phase: number, value: number}}
 */
export function wavePropertiesAtPoint(distance, time, wavelengthRest, frequency, localRedshift) {
    const localWavelength = wavelengthRest * (1 + localRedshift);

    const k = (2 * Math.PI) / (localWavelength / 100);
    const omega = 2 * Math.PI * frequency;
    const phase = k * distance - omega * time;
    const amplitude = 1.0 / Math.max(1, Math.sqrt(distance / 10));

    return {
        amplitude,
        wavelength: localWavelength,
        phase,
        value: amplitude * Math.sin(phase)
    };
}

/**
 * Calculate the light travel time for a given comoving distance
 *
 * @param {number} distance - Comoving distance
 * @param {number} c - Speed of light (in simulation units)
 * @returns {number} Light travel time
 */
export function lightTravelTime(distance, c = 1) {
    return distance / c;
}

// =============================================================================
// RELATIVISTIC KINEMATICS
// =============================================================================

/**
 * Calculate relativistic velocity addition
 * When two velocities are added relativistically
 *
 * @param {number} v1 - First velocity in km/s
 * @param {number} v2 - Second velocity in km/s
 * @param {number} c - Speed of light in km/s
 * @returns {number} Combined velocity in km/s
 */
export function relativisticVelocityAddition(v1, v2, c = CONSTANTS.c) {
    return (v1 + v2) / (1 + (v1 * v2) / (c * c));
}

/**
 * Calculate relativistic momentum
 * p = γmv
 *
 * @param {number} mass - Rest mass
 * @param {number} velocity - Velocity in km/s
 * @returns {number} Relativistic momentum
 */
export function relativisticMomentum(mass, velocity) {
    const gamma = lorentzFactor(velocity);
    return gamma * mass * velocity;
}

/**
 * Calculate relativistic kinetic energy
 * KE = (γ - 1)mc²
 *
 * @param {number} mass - Rest mass in kg
 * @param {number} velocity - Velocity in km/s
 * @returns {number} Kinetic energy in Joules
 */
export function relativisticKineticEnergy(mass, velocity) {
    const gamma = lorentzFactor(velocity);
    const c = CONSTANTS.c_m / 1000; // Convert to km/s for consistency
    return (gamma - 1) * mass * c * c * 1e6; // Convert km²/s² to m²/s²
}

/**
 * Calculate length contraction
 * L = L₀/γ
 *
 * @param {number} properLength - Length in rest frame
 * @param {number} velocity - Relative velocity in km/s
 * @returns {number} Contracted length
 */
export function lengthContraction(properLength, velocity) {
    const gamma = lorentzFactor(velocity);
    return properLength / gamma;
}
