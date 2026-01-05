/**
 * Wave Module - Electromagnetic wave propagation with redshift
 *
 * Models a continuous sinusoidal electromagnetic wave traveling from source to observer.
 * The wave experiences:
 * 1. Doppler shift at emission (based on source velocity)
 * 2. Cosmological stretching during propagation (based on scale factor change)
 */

import {
    dopplerFactor,
    cosmologicalRedshift,
    wavelengthToRGB,
    CONSTANTS,
    SimulationMode
} from './physics.js';

/**
 * Represents a single wave crest (peak) traveling through space
 */
export class WaveCrest {
    /**
     * @param {Object} params
     * @param {number} params.x - Initial x position
     * @param {number} params.y - Initial y position
     * @param {number} params.z - Initial z position
     * @param {number} params.wavelengthEmit - Wavelength at emission (nm)
     * @param {number} params.emissionTime - Time of emission
     * @param {number} params.scaleFactorEmit - Scale factor at emission
     * @param {THREE.Vector3} params.direction - Propagation direction (normalized)
     */
    constructor({
        x, y, z,
        wavelengthEmit,
        emissionTime,
        scaleFactorEmit,
        direction
    }) {
        this.position = { x, y, z };
        this.wavelengthEmit = wavelengthEmit;
        this.wavelengthCurrent = wavelengthEmit;
        this.emissionTime = emissionTime;
        this.scaleFactorEmit = scaleFactorEmit;
        this.scaleFactorPrev = scaleFactorEmit;
        this.direction = direction; // Normalized direction to observer

        this.active = true;
        this.distanceTraveled = 0;
    }

    /**
     * Update crest position and wavelength
     * @param {number} dt - Time step
     * @param {number} waveSpeed - Speed of wave propagation (simulation units)
     * @param {number} scaleFactor - Current scale factor
     * @param {string} mode - Simulation mode
     * @param {Object} observerPos - Observer position {x, y, z}
     */
    update(dt, waveSpeed, scaleFactor, mode, observerPos) {
        if (!this.active) return;

        // Move toward observer
        const dx = observerPos.x - this.position.x;
        const dy = observerPos.y - this.position.y;
        const dz = observerPos.z - this.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance > 0.1) {
            // Normalize and move
            const step = waveSpeed * dt;
            this.position.x += (dx / distance) * step;
            this.position.y += (dy / distance) * step;
            this.position.z += (dz / distance) * step;
            this.distanceTraveled += step;
        }

        // Apply cosmological stretching (in-flight)
        if (mode === SimulationMode.COSMOLOGICAL || mode === SimulationMode.MIXED) {
            if (this.scaleFactorPrev > 0) {
                const stretch = scaleFactor / this.scaleFactorPrev;
                this.wavelengthCurrent *= stretch;
            }
            this.scaleFactorPrev = scaleFactor;
        }

        // Check if reached observer
        const newDist = Math.sqrt(
            Math.pow(this.position.x - observerPos.x, 2) +
            Math.pow(this.position.y - observerPos.y, 2) +
            Math.pow(this.position.z - observerPos.z, 2)
        );

        if (newDist < 1) {
            this.active = false;
        }
    }

    /**
     * Get current RGB color based on wavelength
     * @returns {{r: number, g: number, b: number}}
     */
    getColor() {
        return wavelengthToRGB(this.wavelengthCurrent);
    }

    /**
     * Get current redshift
     * @returns {number}
     */
    getRedshift() {
        return (this.wavelengthCurrent / this.wavelengthEmit) - 1;
    }
}

/**
 * Continuous wave train emitted from a source
 */
export class WaveTrain {
    /**
     * @param {Object} params
     * @param {Object} params.source - Source object with position and velocity
     * @param {Object} params.universe - Universe state manager
     * @param {number} params.wavelengthRest - Rest wavelength in nm
     * @param {string} params.mode - Simulation mode
     */
    constructor({ source, universe, wavelengthRest, mode }) {
        this.source = source;
        this.universe = universe;
        this.wavelengthRest = wavelengthRest;
        this.mode = mode;

        this.crests = [];
        this.isEmitting = false;
        this.emissionStartTime = 0;
        this.emissionDuration = 30; // seconds

        // Emission timing
        this.crestInterval = 0.08; // Time between crests
        this.lastCrestTime = 0;

        // Track observed wavelengths (for graph)
        this.observations = [];
        this.maxObservations = 500;
    }

    /**
     * Start wave emission
     */
    startEmission() {
        this.isEmitting = true;
        this.emissionStartTime = this.universe.time;
        this.lastCrestTime = this.universe.time;
        this.crests = [];
        this.observations = [];
    }

    /**
     * Stop emission
     */
    stopEmission() {
        this.isEmitting = false;
    }

    /**
     * Reset wave train
     */
    reset() {
        this.isEmitting = false;
        this.crests = [];
        this.observations = [];
    }

    /**
     * Update wave train
     * @param {number} dt - Time step
     * @param {number} waveSpeed - Wave propagation speed
     * @param {Object} observerPos - Observer position
     */
    update(dt, waveSpeed, observerPos) {
        const currentTime = this.universe.time;
        const scaleFactor = this.universe.scaleFactor;

        // Check if emission should continue
        if (this.isEmitting) {
            if (currentTime - this.emissionStartTime > this.emissionDuration) {
                this.isEmitting = false;
            } else if (currentTime - this.lastCrestTime >= this.crestInterval) {
                this.emitCrest(observerPos);
                this.lastCrestTime = currentTime;
            }
        }

        // Update all crests
        for (const crest of this.crests) {
            if (crest.active) {
                const wasActive = crest.active;
                crest.update(dt, waveSpeed, scaleFactor, this.mode, observerPos);

                // Record observation when crest arrives
                if (wasActive && !crest.active) {
                    this.recordObservation(currentTime, crest.wavelengthCurrent, crest.wavelengthEmit);
                }
            }
        }

        // Remove old inactive crests (keep some for visualization)
        this.pruneCrests();
    }

    /**
     * Emit a new wave crest
     * @param {Object} observerPos - Observer position
     */
    emitCrest(observerPos) {
        const sourcePos = this.source.getPosition();
        const scaleFactor = this.universe.scaleFactor;
        const currentTime = this.universe.time;

        // Direction from source to observer
        const dx = observerPos.x - sourcePos.x;
        const dy = observerPos.y - sourcePos.y;
        const dz = observerPos.z - sourcePos.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        let direction = { x: 1, y: 0, z: 0 };
        if (distance > 0) {
            direction = {
                x: dx / distance,
                y: dy / distance,
                z: dz / distance
            };
        }

        // Calculate Doppler shift at emission
        let wavelengthEmit = this.wavelengthRest;

        if (this.mode === SimulationMode.DOPPLER || this.mode === SimulationMode.MIXED) {
            // Get velocity component toward observer (negative = approaching)
            const velocity = this.source.getVelocityToward(observerPos);

            // Doppler factor (velocity is recession velocity, positive = receding)
            const factor = dopplerFactor(-velocity);
            wavelengthEmit = this.wavelengthRest * factor;
        }

        const crest = new WaveCrest({
            x: sourcePos.x,
            y: sourcePos.y,
            z: sourcePos.z,
            wavelengthEmit,
            emissionTime: currentTime,
            scaleFactorEmit: scaleFactor,
            direction
        });

        this.crests.push(crest);
    }

    /**
     * Record an observation when a crest reaches the observer
     */
    recordObservation(time, wavelengthObserved, wavelengthEmit) {
        this.observations.push({
            time,
            wavelengthObserved,
            wavelengthEmit,
            redshift: (wavelengthObserved / this.wavelengthRest) - 1
        });

        // Limit stored observations
        if (this.observations.length > this.maxObservations) {
            this.observations.shift();
        }
    }

    /**
     * Remove old inactive crests
     */
    pruneCrests() {
        // Keep max 300 crests for performance
        while (this.crests.length > 300) {
            this.crests.shift();
        }
    }

    /**
     * Get active crests for rendering
     * @returns {WaveCrest[]}
     */
    getActiveCrests() {
        return this.crests.filter(c => c.active);
    }

    /**
     * Get the most recently observed wavelength
     * @returns {number|null}
     */
    getLastObservedWavelength() {
        if (this.observations.length === 0) return null;
        return this.observations[this.observations.length - 1].wavelengthObserved;
    }

    /**
     * Get current leading crest (for tracking)
     * @returns {WaveCrest|null}
     */
    getLeadingCrest() {
        const active = this.getActiveCrests();
        if (active.length === 0) return null;

        // Return the one closest to observer (most traveled)
        return active.reduce((closest, crest) =>
            crest.distanceTraveled > closest.distanceTraveled ? crest : closest
        );
    }

    /**
     * Get observation history for graphing
     * @returns {Array}
     */
    getObservationHistory() {
        return this.observations;
    }
}

/**
 * Source object (galaxy, star, etc.)
 */
export class Source {
    /**
     * @param {Object} params
     * @param {number} params.distance - Initial distance from observer
     * @param {Object} params.universe - Universe reference
     */
    constructor({ distance, universe }) {
        this.comovingDistance = distance;
        this.initialDistance = distance; // Store initial distance
        this.universe = universe;

        // Peculiar velocities (km/s)
        this.velocityRadial = 0;    // Positive = moving away from observer (causes redshift)
        this.velocityTransverse = 0; // Perpendicular to line of sight
        this.baseVelocity = 0;      // Base radial velocity set by UI

        // TRUE 2D/3D orbital motion parameters
        this.orbitalEnabled = false;
        this.orbitRadius = 0;       // Orbit radius in position units
        this.orbitalPeriod = 8;     // seconds per orbit
        this.orbitalPhase = 0;      // Starting phase (random)
        this.orbitCenter = { x: 0, z: 0 }; // Center of orbit

        // Position offset from peculiar motion (accumulated displacement)
        this.positionOffsetX = 0;
        this.positionOffsetZ = 0;

        // Position in 3D (y is up, x-z is the plane)
        this.angle = 0; // Base angle in x-z plane

        // Start time for velocity calculations
        this.startTime = 0;
    }

    /**
     * Set velocities with 2D orbital motion
     * @param {number} radial - Base radial velocity (km/s, positive = recession = redshift)
     * @param {number} transverse - Transverse velocity (km/s)
     */
    setVelocities(radial, transverse = 0) {
        // Check if velocity changed significantly (to avoid resetting orbital params every frame)
        const velocityChanged = Math.abs(radial - this.baseVelocity) > 10;

        this.baseVelocity = radial;

        // Enable TRUE 2D orbital motion if velocity is non-zero
        if (Math.abs(radial) > 0) {
            // Only set orbital parameters once when velocity first set or significantly changes
            if (!this.orbitalEnabled || velocityChanged) {
                this.orbitalEnabled = true;
                // Large orbit radius for clearly visible circular motion
                this.orbitRadius = 80; // Big circles around the base position
                // Set phase ONCE (not every frame!)
                this.orbitalPhase = Math.random() * Math.PI * 2;
                // Moderate period (5s) for clear visualization
                this.orbitalPeriod = 5;
            }
            // Keep orbit radius consistent
            this.orbitRadius = 80;
        } else {
            this.orbitalEnabled = false;
            this.orbitRadius = 0;
        }

        // Update current radial velocity
        this.updateRadialVelocity();
    }

    /**
     * Update radial velocity based on 2D orbital motion
     * As the source orbits, its radial velocity (toward/away from observer) changes
     *
     * Positive baseVelocity = receding (redshift) with oscillation
     * Negative baseVelocity = approaching (blueshift) with oscillation
     */
    updateRadialVelocity() {
        if (!this.universe) {
            this.velocityRadial = this.baseVelocity;
            return;
        }

        if (this.orbitalEnabled) {
            const time = this.universe.time;
            const omega = (2 * Math.PI) / this.orbitalPeriod;
            const phase = omega * time + this.orbitalPhase;

            // The radial velocity component varies as the source orbits
            // When moving toward observer: negative (blueshift)
            // When moving away: positive (redshift)
            //
            // For positive baseVelocity (receding): oscillates around positive value
            // For negative baseVelocity (approaching): oscillates around negative value
            //
            // Orbital amplitude is proportional to |baseVelocity| - creates oscillation
            // that goes both above and below the base velocity
            const orbitalVelocityAmplitude = Math.abs(this.baseVelocity) * 0.5; // ±50% variation
            this.velocityRadial = this.baseVelocity + orbitalVelocityAmplitude * Math.sin(phase);

            // Transverse velocity (perpendicular component)
            this.velocityTransverse = orbitalVelocityAmplitude * Math.cos(phase);
        } else {
            this.velocityRadial = this.baseVelocity;
            this.velocityTransverse = 0;
        }
    }

    /**
     * Set comoving distance
     * @param {number} distance
     */
    setDistance(distance) {
        this.comovingDistance = distance;
    }

    /**
     * Get current 3D position (VISUAL position - always based on slider)
     * Physics calculations use separate methods for redshift computation
     * @returns {{x: number, y: number, z: number}}
     */
    getPosition() {
        // Update velocity first (for orbital motion)
        this.updateRadialVelocity();

        // VISUAL position always uses slider distance directly
        // This keeps the visual representation consistent across all modes
        let baseDistance = this.comovingDistance;

        let posX, posZ;

        // Add orbital motion for visual effect (applies in all modes when velocity is set)
        // The source orbits AROUND the observer in a circle
        if (this.orbitalEnabled) {
            const time = this.universe.time;
            const omega = (2 * Math.PI) / this.orbitalPeriod;
            const phase = omega * time + this.orbitalPhase;

            // TRUE 2D circular orbital motion AROUND THE OBSERVER
            // The source moves in a circle with the observer at the center
            // Distance from observer stays constant (= baseDistance from slider)
            posX = baseDistance * Math.cos(phase);
            posZ = baseDistance * Math.sin(phase);
        } else {
            // No orbital motion - static position along X axis
            posX = baseDistance * Math.cos(this.angle);
            posZ = baseDistance * Math.sin(this.angle);
        }

        // Ensure minimum distance (don't pass through observer)
        const distance = Math.sqrt(posX * posX + posZ * posZ);
        if (distance < 15) {
            const scale = 15 / distance;
            posX *= scale;
            posZ *= scale;
        }

        return { x: posX, y: 0, z: posZ };
    }

    /**
     * Get velocity component toward a point (usually observer)
     * Positive = moving toward, negative = moving away
     * @param {Object} targetPos - Target position {x, y, z}
     * @returns {number} Velocity toward target in km/s
     */
    getVelocityToward(targetPos) {
        const pos = this.getPosition();

        // Direction from source to target
        const dx = targetPos.x - pos.x;
        const dy = targetPos.y - pos.y;
        const dz = targetPos.z - pos.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance === 0) return 0;

        // Unit vector toward target
        const ux = dx / distance;
        const uy = dy / distance;
        const uz = dz / distance;

        // Velocity vector (radial is along the line to observer, transverse perpendicular)
        // Radial velocity: negative means moving away (recession)
        const vx = -this.velocityRadial * ux;
        const vy = 0;
        const vz = -this.velocityRadial * uz;

        // Project velocity onto direction to target
        // Positive result = approaching, negative = receding
        return -(vx * ux + vy * uy + vz * uz);
    }

    /**
     * Reset source state
     * @param {number} initialDistance - Optional initial distance to reset to
     */
    reset(initialDistance = null) {
        this.velocityRadial = 0;
        this.velocityTransverse = 0;
        this.baseVelocity = 0;
        this.orbitalEnabled = false;
        this.orbitRadius = 0;
        this.positionOffsetX = 0;
        this.positionOffsetZ = 0;
        this.startTime = 0;
        this.angle = 0;
        if (initialDistance !== null) {
            this.comovingDistance = initialDistance;
            this.initialDistance = initialDistance;
        }
    }

    /**
     * Get position with Hubble flow only (no peculiar velocity)
     * Used for ghost galaxy visualization
     * Now uses fixed visual distance for consistency
     * @returns {{x: number, y: number, z: number}}
     */
    getHubbleFlowPosition() {
        // Use slider distance for visual consistency
        let physicalDistance = Math.max(10, this.comovingDistance);

        return {
            x: physicalDistance * Math.cos(this.angle),
            y: 0,
            z: physicalDistance * Math.sin(this.angle)
        };
    }

    /**
     * Get state for display
     */
    getState() {
        return {
            comovingDistance: this.comovingDistance,
            physicalPosition: this.getPosition(),
            hubbleFlowPosition: this.getHubbleFlowPosition(),
            velocityRadial: this.velocityRadial,
            velocityTransverse: this.velocityTransverse
        };
    }
}
