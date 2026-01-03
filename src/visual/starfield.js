/**
 * Starfield Module - Background star visualization
 *
 * Creates an immersive starfield background with parallax effect
 */

import * as THREE from 'three';

export class Starfield {
    constructor(scene) {
        this.scene = scene;
        this.stars = null;
        this.nebulaParticles = null;

        this.create();
    }

    create() {
        this.createStars();
        this.createNebula();
    }

    createStars() {
        const starCount = 5000;
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);

        for (let i = 0; i < starCount; i++) {
            // Distribute stars in a sphere around the scene
            const radius = 1500 + Math.random() * 3000;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);

            // Star colors (slightly varied)
            const colorChoice = Math.random();
            if (colorChoice < 0.7) {
                // White/blue stars
                colors[i * 3] = 0.9 + Math.random() * 0.1;
                colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
                colors[i * 3 + 2] = 1.0;
            } else if (colorChoice < 0.85) {
                // Yellow stars
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
                colors[i * 3 + 2] = 0.7 + Math.random() * 0.2;
            } else {
                // Red stars
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 0.5 + Math.random() * 0.3;
                colors[i * 3 + 2] = 0.4 + Math.random() * 0.2;
            }

            // Star sizes
            sizes[i] = 1 + Math.random() * 3;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // Custom shader for better looking stars
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                varying float vSize;

                void main() {
                    vColor = color;
                    vSize = size;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vSize;

                void main() {
                    // Create circular point with soft edge
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;

                    float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
                    float glow = exp(-dist * 4.0);

                    vec3 finalColor = vColor * (1.0 + glow * 0.5);
                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.stars = new THREE.Points(geometry, material);
        this.scene.add(this.stars);
    }

    createNebula() {
        // Create subtle nebula clouds in the background
        const nebulaCount = 500;
        const positions = new Float32Array(nebulaCount * 3);
        const colors = new Float32Array(nebulaCount * 3);
        const sizes = new Float32Array(nebulaCount);

        // Nebula colors (purple, blue, cyan)
        const nebulaColors = [
            [0.4, 0.1, 0.6],  // Purple
            [0.1, 0.2, 0.5],  // Blue
            [0.1, 0.4, 0.5],  // Cyan
            [0.5, 0.1, 0.3]   // Magenta
        ];

        for (let i = 0; i < nebulaCount; i++) {
            // Position in a band around the scene
            const radius = 2000 + Math.random() * 2000;
            const theta = Math.random() * Math.PI * 2;
            const y = (Math.random() - 0.5) * 1000;

            positions[i * 3] = radius * Math.cos(theta);
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = radius * Math.sin(theta);

            // Random nebula color
            const colorIdx = Math.floor(Math.random() * nebulaColors.length);
            const color = nebulaColors[colorIdx];
            colors[i * 3] = color[0] * (0.8 + Math.random() * 0.4);
            colors[i * 3 + 1] = color[1] * (0.8 + Math.random() * 0.4);
            colors[i * 3 + 2] = color[2] * (0.8 + Math.random() * 0.4);

            sizes[i] = 50 + Math.random() * 150;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;

                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;

                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;

                    // Very soft, cloud-like appearance
                    float alpha = exp(-dist * 3.0) * 0.15;
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.nebulaParticles = new THREE.Points(geometry, material);
        this.scene.add(this.nebulaParticles);
    }

    /**
     * Update starfield (for twinkling effect)
     * @param {number} time - Current time
     */
    update(time) {
        if (this.stars && this.stars.material.uniforms) {
            this.stars.material.uniforms.time.value = time;
        }
        if (this.nebulaParticles && this.nebulaParticles.material.uniforms) {
            this.nebulaParticles.material.uniforms.time.value = time;
        }

        // Slowly rotate the entire starfield for subtle motion
        if (this.stars) {
            this.stars.rotation.y = time * 0.001;
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        if (this.stars) {
            this.stars.geometry.dispose();
            this.stars.material.dispose();
            this.scene.remove(this.stars);
        }
        if (this.nebulaParticles) {
            this.nebulaParticles.geometry.dispose();
            this.nebulaParticles.material.dispose();
            this.scene.remove(this.nebulaParticles);
        }
    }
}
