/**
 * Wave Renderer Module - Continuous sine wave visualization
 *
 * This is the core visualization that shows:
 * - A continuous sinusoidal electromagnetic wave
 * - Color changes based on wavelength (redshift/blueshift)
 * - Wavelength stretching during propagation (cosmological effect)
 * - Proper Doppler shift at emission
 */

import * as THREE from 'three';
import { wavelengthToThreeColor, wavelengthToRGB, CONSTANTS } from '../core/physics.js';

/**
 * Renders a continuous sine wave between source and observer
 */
export class WaveRenderer {
    constructor(scene) {
        this.scene = scene;

        // Wave geometry parameters
        this.waveSegments = 200;     // Number of segments for smooth curve
        this.waveAmplitude = 15;     // Amplitude in world units
        this.baseWavelengthScale = 8; // Visual wavelength scale

        // Wave group
        this.waveGroup = new THREE.Group();
        this.waveMesh = null;
        this.glowMesh = null;

        // Crest markers (for visualizing wave peaks)
        this.crestMarkers = [];

        // Wave state
        this.isActive = false;
        this.wavePhase = 0;

        this.create();
        this.scene.add(this.waveGroup);
    }

    create() {
        // Create wave path geometry
        this.createWavePath();

        // Create crest markers
        this.createCrestMarkers();
    }

    createWavePath() {
        // Tube geometry for the wave
        const points = [];
        for (let i = 0; i <= this.waveSegments; i++) {
            points.push(new THREE.Vector3(i, 0, 0));
        }

        const curve = new THREE.CatmullRomCurve3(points);

        const tubeGeometry = new THREE.TubeGeometry(curve, this.waveSegments, 2, 8, false);

        // Shader material for gradient coloring along the wave
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                wavelengthStart: { value: CONSTANTS.WAVELENGTH_HALPHA },
                wavelengthEnd: { value: CONSTANTS.WAVELENGTH_HALPHA },
                sourcePos: { value: new THREE.Vector3(100, 0, 0) },
                observerPos: { value: new THREE.Vector3(0, 0, 0) },
                amplitude: { value: this.waveAmplitude },
                wavePhase: { value: 0 },
                visualWavelength: { value: this.baseWavelengthScale }
            },
            vertexShader: `
                uniform float time;
                uniform float amplitude;
                uniform float wavePhase;
                uniform float visualWavelength;
                uniform vec3 sourcePos;
                uniform vec3 observerPos;

                varying float vProgress;
                varying vec3 vPosition;
                varying vec3 vNormal;

                void main() {
                    vProgress = position.x / ${this.waveSegments.toFixed(1)};
                    vNormal = normal;

                    // Calculate position along the wave path
                    vec3 direction = normalize(observerPos - sourcePos);
                    float totalDist = length(observerPos - sourcePos);
                    vec3 basePos = sourcePos + direction * (vProgress * totalDist);

                    // Perpendicular direction for wave oscillation
                    vec3 up = vec3(0.0, 1.0, 0.0);
                    vec3 perp = normalize(cross(direction, up));

                    // Calculate wave oscillation
                    float wavePos = vProgress * totalDist;

                    // Local wavelength (can vary along the path for cosmological effect)
                    float localWavelength = visualWavelength * (1.0 + vProgress * 0.3);

                    float oscillation = sin(wavePos / localWavelength * 6.28318 - wavePhase);

                    // Apply wave displacement
                    vec3 displaced = basePos + perp * oscillation * amplitude;

                    vPosition = displaced;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
                }
            `,
            fragmentShader: `
                uniform float wavelengthStart;
                uniform float wavelengthEnd;
                uniform float time;

                varying float vProgress;
                varying vec3 vPosition;
                varying vec3 vNormal;

                // Convert wavelength to RGB - VIVID visible spectrum colors
                vec3 wavelengthToRGB(float wl) {
                    vec3 color;
                    float intensity = 1.0;

                    // Clamp to extended visible range for clear colors
                    if (wl < 380.0) {
                        // UV/Blueshift - deep violet/indigo
                        color = vec3(0.4, 0.0, 1.0);  // Deep violet
                        intensity = 0.9;
                    } else if (wl < 440.0) {
                        // Violet to Blue
                        float t = (wl - 380.0) / 60.0;
                        color = vec3(0.5 * (1.0 - t), 0.0, 1.0);  // Violet -> Blue
                    } else if (wl < 490.0) {
                        // Blue to Cyan
                        float t = (wl - 440.0) / 50.0;
                        color = vec3(0.0, t, 1.0);  // Blue -> Cyan
                    } else if (wl < 510.0) {
                        // Cyan to Green
                        float t = (wl - 490.0) / 20.0;
                        color = vec3(0.0, 1.0, 1.0 - t);  // Cyan -> Green
                    } else if (wl < 580.0) {
                        // Green to Yellow
                        float t = (wl - 510.0) / 70.0;
                        color = vec3(t, 1.0, 0.0);  // Green -> Yellow
                    } else if (wl < 645.0) {
                        // Yellow to Orange to Red
                        float t = (wl - 580.0) / 65.0;
                        color = vec3(1.0, 1.0 - t, 0.0);  // Yellow -> Orange -> Red
                    } else if (wl < 780.0) {
                        // Pure Red
                        color = vec3(1.0, 0.0, 0.0);
                    } else if (wl < 1000.0) {
                        // Near IR - Deep Red (false color for redshift)
                        float t = (wl - 780.0) / 220.0;
                        color = vec3(0.9 - t * 0.4, 0.0, 0.0);  // Darker red
                    } else {
                        // Far IR - Very dark red (extreme redshift)
                        color = vec3(0.4, 0.0, 0.0);
                    }

                    return color * intensity;
                }

                void main() {
                    // Interpolate wavelength along the wave
                    // Near source: emitted wavelength
                    // Near observer: observed (redshifted) wavelength
                    float wavelength = mix(wavelengthStart, wavelengthEnd, vProgress);

                    vec3 color = wavelengthToRGB(wavelength);

                    // Add some glow effect
                    float glow = 0.3 + 0.2 * sin(time * 3.0 + vProgress * 10.0);

                    // Fresnel-like edge glow
                    float fresnel = 1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)));
                    fresnel = pow(fresnel, 2.0);

                    vec3 finalColor = color * (1.0 + glow * 0.5 + fresnel * 0.3);

                    gl_FragColor = vec4(finalColor, 0.9);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });

        this.waveMesh = new THREE.Mesh(tubeGeometry, material);
        this.waveMesh.visible = false;
        this.waveGroup.add(this.waveMesh);

        // Create glow layer
        const glowMaterial = material.clone();
        glowMaterial.transparent = true;
        glowMaterial.blending = THREE.AdditiveBlending;
        glowMaterial.depthWrite = false;

        // Slightly larger tube for glow
        const glowGeometry = new THREE.TubeGeometry(curve, this.waveSegments, 5, 8, false);
        this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        this.glowMesh.visible = false;
        this.waveGroup.add(this.glowMesh);
    }

    createCrestMarkers() {
        // Create small spheres to mark wave crests
        const markerGeometry = new THREE.SphereGeometry(3, 16, 16);

        for (let i = 0; i < 30; i++) {
            const material = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                emissive: 0x444444,
                transparent: true,
                opacity: 0.8
            });

            const marker = new THREE.Mesh(markerGeometry, material);
            marker.visible = false;
            this.crestMarkers.push(marker);
            this.waveGroup.add(marker);
        }
    }

    /**
     * Update wave visualization
     * @param {Object} params
     * @param {Object} params.sourcePos - Source position {x, y, z}
     * @param {Object} params.observerPos - Observer position {x, y, z}
     * @param {number} params.wavelengthEmit - Emitted wavelength (nm)
     * @param {number} params.wavelengthObs - Observed wavelength (nm)
     * @param {number} params.time - Current time
     * @param {number} params.scaleFactor - Current scale factor
     * @param {boolean} params.isCosmological - Whether cosmological stretching applies
     */
    update(params) {
        const {
            sourcePos,
            observerPos,
            wavelengthEmit,
            wavelengthObs,
            time,
            scaleFactor,
            isCosmological
        } = params;

        if (!this.isActive) {
            this.waveMesh.visible = false;
            this.glowMesh.visible = false;
            this.crestMarkers.forEach(m => m.visible = false);
            return;
        }

        this.waveMesh.visible = true;
        this.glowMesh.visible = true;

        // Update shader uniforms
        const uniforms = this.waveMesh.material.uniforms;
        uniforms.time.value = time;
        uniforms.sourcePos.value.set(sourcePos.x, sourcePos.y, sourcePos.z);
        uniforms.observerPos.value.set(observerPos.x, observerPos.y, observerPos.z);
        uniforms.wavelengthStart.value = wavelengthEmit;
        uniforms.wavelengthEnd.value = wavelengthObs;
        uniforms.wavePhase.value = time * 5; // Wave propagation

        // Adjust visual wavelength for cosmological effect
        const baseVisualWL = this.baseWavelengthScale;
        uniforms.visualWavelength.value = isCosmological ?
            baseVisualWL * Math.sqrt(scaleFactor) : baseVisualWL;

        // Copy uniforms to glow mesh
        const glowUniforms = this.glowMesh.material.uniforms;
        Object.keys(uniforms).forEach(key => {
            if (glowUniforms[key]) {
                glowUniforms[key].value = uniforms[key].value;
            }
        });

        // Update crest markers
        this.updateCrestMarkers(sourcePos, observerPos, wavelengthEmit, wavelengthObs, time);
    }

    updateCrestMarkers(sourcePos, observerPos, wavelengthEmit, wavelengthObs, time) {
        const dx = observerPos.x - sourcePos.x;
        const dy = observerPos.y - sourcePos.y;
        const dz = observerPos.z - sourcePos.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < 1) return;

        // Direction and perpendicular
        const dirX = dx / distance;
        const dirY = dy / distance;
        const dirZ = dz / distance;

        // Perpendicular (assume y is up)
        const perpX = -dirZ;
        const perpY = 0;
        const perpZ = dirX;

        // Number of visible crests
        const numCrests = Math.min(this.crestMarkers.length, Math.floor(distance / 15));

        // Phase offset for animation
        const phaseOffset = time * 5;

        for (let i = 0; i < this.crestMarkers.length; i++) {
            const marker = this.crestMarkers[i];

            if (i >= numCrests) {
                marker.visible = false;
                continue;
            }

            marker.visible = true;

            // Position along the wave
            const t = (i + 0.5) / numCrests;

            // Wavelength at this position (interpolated)
            const localWL = wavelengthEmit + t * (wavelengthObs - wavelengthEmit);

            // Position with sine wave
            const posAlongWave = t * distance;
            const visualWL = this.baseWavelengthScale * (1 + t * 0.3);
            const phase = posAlongWave / visualWL * Math.PI * 2 - phaseOffset;
            const sineValue = Math.sin(phase);

            const x = sourcePos.x + dirX * posAlongWave + perpX * sineValue * this.waveAmplitude;
            const y = sourcePos.y + dirY * posAlongWave + perpY * sineValue * this.waveAmplitude + 5;
            const z = sourcePos.z + dirZ * posAlongWave + perpZ * sineValue * this.waveAmplitude;

            marker.position.set(x, y, z);

            // Color based on local wavelength
            const color = wavelengthToThreeColor(localWL);
            marker.material.color.setHex(color);
            marker.material.emissive.setHex(color >> 2);

            // Scale based on amplitude (larger at peaks)
            const scale = 0.5 + 0.5 * Math.abs(sineValue);
            marker.scale.setScalar(scale);
        }
    }

    /**
     * Start wave visualization
     */
    start() {
        this.isActive = true;
    }

    /**
     * Stop wave visualization
     */
    stop() {
        this.isActive = false;
    }

    /**
     * Reset wave state
     */
    reset() {
        this.isActive = false;
        this.wavePhase = 0;
    }

    dispose() {
        if (this.waveMesh) {
            this.waveMesh.geometry.dispose();
            this.waveMesh.material.dispose();
        }
        if (this.glowMesh) {
            this.glowMesh.geometry.dispose();
            this.glowMesh.material.dispose();
        }
        this.crestMarkers.forEach(m => {
            m.geometry.dispose();
            m.material.dispose();
        });
        this.scene.remove(this.waveGroup);
    }
}

/**
 * Alternative wave renderer using line-based approach
 * More performant and shows clear sine wave shape
 */
export class SineWaveRenderer {
    constructor(scene) {
        this.scene = scene;

        this.segments = 300;
        this.amplitude = 20;
        this.baseFrequency = 0.3;

        this.waveGroup = new THREE.Group();
        this.waveLine = null;
        this.glowLines = [];

        this.isActive = false;

        this.create();
        this.scene.add(this.waveGroup);
    }

    create() {
        // Main wave line
        const points = new Array(this.segments).fill(null).map(() => new THREE.Vector3());

        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        // Vertex colors for gradient
        const colors = new Float32Array(this.segments * 3);
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.LineBasicMaterial({
            vertexColors: true,
            linewidth: 3
        });

        this.waveLine = new THREE.Line(geometry, material);
        this.waveLine.visible = false;
        this.waveGroup.add(this.waveLine);

        // Glow layers (multiple lines with increasing size and decreasing opacity)
        for (let i = 0; i < 3; i++) {
            const glowGeometry = new THREE.BufferGeometry().setFromPoints(points.map(p => p.clone()));
            glowGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.segments * 3), 3));

            const glowMaterial = new THREE.LineBasicMaterial({
                vertexColors: true,
                transparent: true,
                opacity: 0.3 - i * 0.08,
                blending: THREE.AdditiveBlending
            });

            const glowLine = new THREE.Line(glowGeometry, glowMaterial);
            glowLine.visible = false;
            this.glowLines.push(glowLine);
            this.waveGroup.add(glowLine);
        }
    }

    /**
     * Update wave
     * @param {Object} params - Same as WaveRenderer
     */
    update(params) {
        const {
            sourcePos,
            observerPos,
            wavelengthEmit,
            wavelengthObs,
            time,
            scaleFactor,
            isCosmological
        } = params;

        if (!this.isActive) {
            this.waveLine.visible = false;
            this.glowLines.forEach(l => l.visible = false);
            return;
        }

        this.waveLine.visible = true;
        this.glowLines.forEach(l => l.visible = true);

        // Calculate direction and perpendicular
        const dx = observerPos.x - sourcePos.x;
        const dy = observerPos.y - sourcePos.y;
        const dz = observerPos.z - sourcePos.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < 1) return;

        const dirX = dx / distance;
        const dirY = dy / distance;
        const dirZ = dz / distance;

        // Perpendicular direction (y is up)
        const perpX = 0;
        const perpY = 1;
        const perpZ = 0;

        // Update main wave line
        const positions = this.waveLine.geometry.attributes.position;
        const colors = this.waveLine.geometry.attributes.color;

        // Animation phase
        const phase = time * 8;

        for (let i = 0; i < this.segments; i++) {
            const t = i / (this.segments - 1);

            // Position along the line
            const x = sourcePos.x + dirX * t * distance;
            const y = sourcePos.y + dirY * t * distance;
            const z = sourcePos.z + dirZ * t * distance;

            // Local wavelength (cosmological stretching)
            const localWL = wavelengthEmit + t * (wavelengthObs - wavelengthEmit);

            // Visual frequency (inverse of wavelength)
            // More redshift = lower frequency = fewer oscillations
            const baseFreq = this.baseFrequency;
            const freqFactor = wavelengthEmit / localWL;
            const localFreq = baseFreq * freqFactor;

            // Sine wave oscillation
            const wavePos = t * distance;
            const oscillation = Math.sin(wavePos * localFreq - phase);

            // Apply perpendicular displacement
            const finalX = x + perpX * oscillation * this.amplitude;
            const finalY = y + perpY * oscillation * this.amplitude + 10;
            const finalZ = z + perpZ * oscillation * this.amplitude;

            positions.setXYZ(i, finalX, finalY, finalZ);

            // Color based on local wavelength
            const rgb = wavelengthToRGB(localWL);
            colors.setXYZ(i, rgb.r / 255, rgb.g / 255, rgb.b / 255);
        }

        positions.needsUpdate = true;
        colors.needsUpdate = true;

        // Update glow lines with slight offsets
        this.glowLines.forEach((glowLine, idx) => {
            const glowPositions = glowLine.geometry.attributes.position;
            const glowColors = glowLine.geometry.attributes.color;

            const offset = (idx + 1) * 3;

            for (let i = 0; i < this.segments; i++) {
                const pos = {
                    x: positions.getX(i),
                    y: positions.getY(i) + offset,
                    z: positions.getZ(i)
                };

                glowPositions.setXYZ(i, pos.x, pos.y, pos.z);
                glowColors.setXYZ(i, colors.getX(i), colors.getY(i), colors.getZ(i));
            }

            glowPositions.needsUpdate = true;
            glowColors.needsUpdate = true;
        });
    }

    start() {
        this.isActive = true;
    }

    stop() {
        this.isActive = false;
    }

    reset() {
        this.isActive = false;
    }

    dispose() {
        if (this.waveLine) {
            this.waveLine.geometry.dispose();
            this.waveLine.material.dispose();
        }
        this.glowLines.forEach(line => {
            line.geometry.dispose();
            line.material.dispose();
        });
        this.scene.remove(this.waveGroup);
    }
}
