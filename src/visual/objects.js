/**
 * Objects Module - 3D representations of source and observer
 * VERSION 3.0 - Multiple source types (Star, Quasar, Galaxy)
 *
 * Creates visually appealing 3D objects for:
 * - Observer (Earth with atmosphere and moon)
 * - Source: Star (Sun-like), Quasar (with jets), Galaxy (spiral)
 * - Velocity arrow
 * - Ghost galaxy for Hubble flow visualization
 */

import * as THREE from 'three';
import { SourceType } from '../ui/presets.js';

// Log that new version is loaded
console.log('Objects.js v3.0 loaded - Star, Quasar, Galaxy sources');

/**
 * Observer visualization - Earth with atmosphere
 */
export class ObserverObject {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.position = new THREE.Vector3(0, 0, 0);
        this.earth = null;
        this.clouds = null;
        this.atmosphere = null;

        this.create();
        this.scene.add(this.group);
    }

    create() {
        // Create Earth
        this.createEarth();

        // Create atmosphere glow
        this.createAtmosphere();

        // Create moon orbiting Earth
        this.createMoon();

        // Label
        this.createLabel('Observer', 0x00ff64);
    }

    createEarth() {
        const earthRadius = 10;
        const earthGeometry = new THREE.SphereGeometry(earthRadius, 64, 64);

        // Create procedural Earth texture
        const earthCanvas = this.createEarthTexture();
        const earthTexture = new THREE.CanvasTexture(earthCanvas);

        const earthMaterial = new THREE.MeshPhongMaterial({
            map: earthTexture,
            bumpScale: 0.5,
            specular: new THREE.Color(0x333333),
            shininess: 25
        });

        this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
        this.group.add(this.earth);

        // Cloud layer
        const cloudGeometry = new THREE.SphereGeometry(earthRadius * 1.02, 64, 64);
        const cloudCanvas = this.createCloudTexture();
        const cloudTexture = new THREE.CanvasTexture(cloudCanvas);

        const cloudMaterial = new THREE.MeshPhongMaterial({
            map: cloudTexture,
            transparent: true,
            opacity: 0.4,
            depthWrite: false
        });

        this.clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
        this.group.add(this.clouds);
    }

    createEarthTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Create gradient ocean
        const oceanGradient = ctx.createLinearGradient(0, 0, 0, 512);
        oceanGradient.addColorStop(0, '#0a2a4a');
        oceanGradient.addColorStop(0.3, '#1a4a7a');
        oceanGradient.addColorStop(0.5, '#1a5a8a');
        oceanGradient.addColorStop(0.7, '#1a4a7a');
        oceanGradient.addColorStop(1, '#0a2a4a');
        ctx.fillStyle = oceanGradient;
        ctx.fillRect(0, 0, 1024, 512);

        // Add ocean texture (waves)
        ctx.globalAlpha = 0.1;
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 512;
            ctx.strokeStyle = '#3a7aba';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(x + 20, y - 5, x + 40, y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Continents with more detail
        const drawContinent = (points, baseColor, highlightColor) => {
            // Base color
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i][0], points[i][1]);
            }
            ctx.closePath();
            ctx.fill();

            // Add terrain texture
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = highlightColor;
            for (let i = 0; i < 30; i++) {
                const px = points[Math.floor(Math.random() * points.length)];
                const ox = (Math.random() - 0.5) * 40;
                const oy = (Math.random() - 0.5) * 40;
                ctx.beginPath();
                ctx.arc(px[0] + ox, px[1] + oy, 3 + Math.random() * 8, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        };

        // North America (more detailed shape)
        drawContinent([
            [140, 50], [200, 40], [240, 60], [250, 100], [220, 140],
            [180, 160], [140, 150], [100, 130], [80, 100], [100, 60]
        ], '#2d6a2d', '#4a8a4a');

        // South America
        drawContinent([
            [200, 200], [230, 180], [260, 200], [270, 260], [250, 320],
            [220, 360], [190, 340], [180, 280], [190, 230]
        ], '#3d7a3d', '#5a9a5a');

        // Europe
        drawContinent([
            [480, 60], [540, 50], [580, 70], [560, 100], [520, 120],
            [480, 110], [460, 80]
        ], '#4a7a3a', '#6a9a5a');

        // Africa
        drawContinent([
            [500, 140], [560, 130], [600, 160], [610, 220], [580, 300],
            [540, 340], [500, 320], [480, 260], [470, 200], [480, 160]
        ], '#5a8a4a', '#7aaa6a');

        // Asia (large landmass)
        drawContinent([
            [580, 40], [700, 30], [820, 50], [880, 80], [900, 140],
            [860, 180], [780, 160], [700, 150], [640, 130], [600, 100], [570, 60]
        ], '#3d7a3d', '#5a9a5a');

        // India
        drawContinent([
            [700, 180], [740, 170], [760, 220], [740, 280], [700, 260], [690, 210]
        ], '#4a8a4a', '#6aaa6a');

        // Australia
        drawContinent([
            [820, 280], [880, 270], [920, 300], [910, 350], [860, 370],
            [810, 350], [800, 310]
        ], '#6a9a5a', '#8aba7a');

        // Antarctica
        ctx.fillStyle = '#e8f0f8';
        ctx.beginPath();
        ctx.moveTo(0, 460);
        ctx.lineTo(1024, 460);
        ctx.lineTo(1024, 512);
        ctx.lineTo(0, 512);
        ctx.closePath();
        ctx.fill();

        // Add ice variation
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 50; i++) {
            ctx.beginPath();
            ctx.ellipse(Math.random() * 1024, 470 + Math.random() * 30, 20 + Math.random() * 30, 10 + Math.random() * 15, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Arctic ice cap
        ctx.fillStyle = '#e8f0f8';
        ctx.beginPath();
        ctx.ellipse(512, 20, 400, 40, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Add city lights hint (subtle)
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#ffff88';
        const cityLocations = [
            [180, 100], [200, 140], [520, 90], [540, 150], [700, 100],
            [750, 140], [860, 320], [560, 180]
        ];
        for (const loc of cityLocations) {
            ctx.beginPath();
            ctx.arc(loc[0], loc[1], 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        return canvas;
    }

    createCloudTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, 1024, 512);

        // Create more realistic cloud patterns
        // Storm systems
        for (let i = 0; i < 8; i++) {
            const x = Math.random() * 1024;
            const y = 100 + Math.random() * 312;
            const radius = 40 + Math.random() * 80;

            // Create spiral cloud pattern
            ctx.save();
            ctx.translate(x, y);
            for (let j = 0; j < 30; j++) {
                const angle = j * 0.4;
                const r = j * 3;
                const cx = r * Math.cos(angle);
                const cy = r * Math.sin(angle);
                ctx.fillStyle = `rgba(255, 255, 255, ${0.4 - j * 0.01})`;
                ctx.beginPath();
                ctx.ellipse(cx, cy, 15 + Math.random() * 10, 8 + Math.random() * 5, angle, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Scattered cloud patches
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 512;
            const rx = 15 + Math.random() * 50;
            const ry = 8 + Math.random() * 25;
            ctx.beginPath();
            ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }

        // Tropical bands
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(0, 200, 1024, 30);
        ctx.fillRect(0, 280, 1024, 30);

        return canvas;
    }

    createAtmosphere() {
        const atmosphereGeometry = new THREE.SphereGeometry(14, 64, 64);
        const atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: {
                glowColor: { value: new THREE.Color(0x00aaff) },
                viewVector: { value: new THREE.Vector3() }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPositionNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 glowColor;
                varying vec3 vNormal;
                varying vec3 vPositionNormal;
                void main() {
                    float intensity = pow(0.7 - dot(vNormal, vPositionNormal), 2.0);
                    gl_FragColor = vec4(glowColor, intensity * 0.6);
                }
            `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        });

        this.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.group.add(this.atmosphere);
    }

    createMoon() {
        const moonGeometry = new THREE.SphereGeometry(2.5, 32, 32);
        const moonMaterial = new THREE.MeshPhongMaterial({
            color: 0xaaaaaa,
            emissive: 0x222222
        });

        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        this.moon.position.set(25, 0, 0);

        // Moon orbit group
        this.moonOrbit = new THREE.Group();
        this.moonOrbit.add(this.moon);
        this.group.add(this.moonOrbit);
    }

    createLabel(text, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        context.font = 'Bold 32px Arial';
        context.fillStyle = '#' + new THREE.Color(color).getHexString();
        context.textAlign = 'center';
        context.fillText(text, 128, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(0, 30, 0);
        sprite.scale.set(40, 10, 1);
        this.group.add(sprite);
    }

    /**
     * Update animation
     * @param {number} time - Current time
     */
    update(time) {
        // Rotate Earth
        if (this.earth) {
            this.earth.rotation.y = time * 0.1;
        }

        // Rotate clouds slightly faster
        if (this.clouds) {
            this.clouds.rotation.y = time * 0.12;
        }

        // Orbit moon
        if (this.moonOrbit) {
            this.moonOrbit.rotation.y = time * 0.3;
        }

        // Pulse atmosphere
        if (this.atmosphere) {
            const pulse = 1 + 0.05 * Math.sin(time * 2);
            this.atmosphere.scale.setScalar(pulse);
        }
    }

    /**
     * Get position
     * @returns {THREE.Vector3}
     */
    getPosition() {
        return this.position.clone();
    }

    dispose() {
        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
        });
        this.scene.remove(this.group);
    }
}

/**
 * Source galaxy visualization - Spiral galaxy with rotating arms and stars
 */
export class SourceObject {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.velocityArrow = null;
        this.spiralArms = null;
        this.stars = null;
        this.core = null;

        this.create();
        this.scene.add(this.group);
    }

    create() {
        // Galaxy core (bright center)
        this.createCore();

        // Spiral arms with stars
        this.createSpiralArms();

        // Star particles in the disk
        this.createStarField();

        // Outer halo glow
        this.createHalo();

        // Create velocity arrow (initially hidden)
        this.createVelocityArrow();

        // Label
        this.createLabel('Source Galaxy', 0x4098ff);
    }

    createCore() {
        // Bright central bulge
        const coreGeometry = new THREE.SphereGeometry(8, 32, 32);
        const coreMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffaa,
            emissive: 0xffaa44,
            emissiveIntensity: 0.8,
            shininess: 100
        });
        this.core = new THREE.Mesh(coreGeometry, coreMaterial);
        this.group.add(this.core);

        // Inner glow
        const innerGlowGeometry = new THREE.SphereGeometry(12, 32, 32);
        const innerGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffcc66,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });
        const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
        this.group.add(innerGlow);
    }

    createSpiralArms() {
        // Create detailed spiral arms with multiple components
        const armCount = 4; // More arms for a grand design spiral
        const pointsPerArm = 800;

        const positions = [];
        const colors = [];
        const sizes = [];

        // Main spiral arms
        for (let arm = 0; arm < armCount; arm++) {
            const armOffset = (arm / armCount) * Math.PI * 2;
            // Alternate arm brightness
            const armBrightness = arm % 2 === 0 ? 1.0 : 0.7;

            for (let i = 0; i < pointsPerArm; i++) {
                const t = i / pointsPerArm;
                const radius = 8 + t * 55; // From core outward
                // Logarithmic spiral for more realistic shape
                const windingFactor = 2.5 + Math.sin(arm) * 0.5;
                const angle = armOffset + Math.log(1 + t * 10) * windingFactor;

                // Add structured noise for natural look
                const armWidth = 6 + t * 4;
                const noise = (Math.random() - 0.5) * armWidth;
                const heightNoise = (Math.random() - 0.5) * 3 * (1 - t);

                const x = (radius + noise) * Math.cos(angle);
                const y = heightNoise;
                const z = (radius + noise) * Math.sin(angle);

                positions.push(x, y, z);

                // Color gradient: bright yellow/white core to blue/purple edges
                // With some H II region pink spots
                const isHIIRegion = Math.random() < 0.05;
                let r, g, b;
                if (isHIIRegion && t > 0.2) {
                    // Pink/red emission nebulae
                    r = 1.0;
                    g = 0.3 + Math.random() * 0.2;
                    b = 0.5 + Math.random() * 0.3;
                } else {
                    // Normal star colors
                    r = (1.0 - t * 0.5) * armBrightness;
                    g = (0.8 - t * 0.3) * armBrightness;
                    b = (0.4 + t * 0.6) * armBrightness;
                }
                colors.push(r, g, b);

                // Larger points near core, with some bright stars
                const isBrightStar = Math.random() < 0.02;
                sizes.push(isBrightStar ? 8 : (2 + (1 - t) * 5));
            }
        }

        // Add inter-arm stars (less dense)
        for (let i = 0; i < 500; i++) {
            const t = Math.random();
            const radius = 10 + t * 50;
            const angle = Math.random() * Math.PI * 2;
            const heightNoise = (Math.random() - 0.5) * 2;

            positions.push(
                radius * Math.cos(angle),
                heightNoise,
                radius * Math.sin(angle)
            );

            colors.push(0.6, 0.6, 0.8);
            sizes.push(1 + Math.random() * 2);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

        // Custom shader for glowing points
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (250.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    // Gaussian-like falloff for softer stars
                    float alpha = exp(-dist * dist * 8.0);
                    gl_FragColor = vec4(vColor, alpha * 0.9);
                }
            `,
            transparent: true,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.spiralArms = new THREE.Points(geometry, material);
        this.group.add(this.spiralArms);

        // Add dust lanes (dark regions between arms)
        this.createDustLanes();
    }

    createDustLanes() {
        // Subtle dark dust lanes between spiral arms
        const dustCount = 200;
        const positions = [];
        const colors = [];
        const sizes = [];

        for (let i = 0; i < dustCount; i++) {
            const t = Math.random();
            const radius = 15 + t * 40;
            const angle = Math.random() * Math.PI * 2;

            positions.push(
                radius * Math.cos(angle),
                (Math.random() - 0.5) * 1,
                radius * Math.sin(angle)
            );

            // Dark reddish-brown for dust
            colors.push(0.15, 0.08, 0.05);
            sizes.push(10 + Math.random() * 15);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 15,
            vertexColors: true,
            transparent: true,
            opacity: 0.3,
            sizeAttenuation: true,
            depthWrite: false
        });

        this.dustLanes = new THREE.Points(geometry, material);
        this.group.add(this.dustLanes);
    }

    createStarField() {
        // Additional random stars in the disk
        const starCount = 1000;
        const positions = [];
        const colors = [];
        const sizes = [];

        for (let i = 0; i < starCount; i++) {
            // Disk distribution
            const r = Math.random() * 50 + 5;
            const theta = Math.random() * Math.PI * 2;
            const height = (Math.random() - 0.5) * 6 * (1 - r / 60);

            positions.push(
                r * Math.cos(theta),
                height,
                r * Math.sin(theta)
            );

            // Star colors (white to blue to yellow)
            const colorChoice = Math.random();
            if (colorChoice < 0.5) {
                colors.push(1, 1, 1); // White
            } else if (colorChoice < 0.8) {
                colors.push(0.7, 0.8, 1); // Blue
            } else {
                colors.push(1, 0.9, 0.6); // Yellow
            }

            sizes.push(1 + Math.random() * 2);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        this.stars = new THREE.Points(geometry, material);
        this.group.add(this.stars);
    }

    createHalo() {
        // Outer halo glow
        const haloGeometry = new THREE.SphereGeometry(60, 32, 32);
        const haloMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0x4060ff) }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPositionNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                varying vec3 vNormal;
                varying vec3 vPositionNormal;
                void main() {
                    float intensity = pow(0.4 - dot(vNormal, vPositionNormal), 2.0);
                    gl_FragColor = vec4(color, intensity * 0.3);
                }
            `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        });

        const halo = new THREE.Mesh(haloGeometry, haloMaterial);
        this.group.add(halo);
    }

    createLabel(text, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        context.font = 'Bold 28px Arial';
        context.fillStyle = '#' + new THREE.Color(color).getHexString();
        context.textAlign = 'center';
        context.fillText(text, 128, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(0, 70, 0);
        sprite.scale.set(60, 15, 1);
        this.group.add(sprite);
    }

    createVelocityArrow() {
        // Arrow shaft
        const shaftGeometry = new THREE.CylinderGeometry(2, 2, 50, 16);
        const shaftMaterial = new THREE.MeshPhongMaterial({
            color: 0xff8000,
            emissive: 0x402000
        });
        const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
        shaft.rotation.z = -Math.PI / 2;
        shaft.position.x = 25;

        // Arrow head
        const headGeometry = new THREE.ConeGeometry(5, 15, 16);
        const headMaterial = new THREE.MeshPhongMaterial({
            color: 0xff8000,
            emissive: 0x402000
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.rotation.z = -Math.PI / 2;
        head.position.x = 55;

        // Group for arrow
        this.velocityArrow = new THREE.Group();
        this.velocityArrow.add(shaft);
        this.velocityArrow.add(head);
        this.velocityArrow.visible = false;
        this.group.add(this.velocityArrow);
    }

    /**
     * Update position based on source model
     * @param {Object} position - {x, y, z}
     */
    setPosition(position) {
        this.group.position.set(position.x, position.y, position.z);
    }

    /**
     * Update velocity arrow
     * @param {number} velocityRadial - Radial velocity (positive = away)
     * @param {Object} observerPos - Observer position
     */
    updateVelocityArrow(velocityRadial, observerPos) {
        if (Math.abs(velocityRadial) < 100) {
            this.velocityArrow.visible = false;
            return;
        }

        this.velocityArrow.visible = true;

        // Direction from source to observer
        const dx = observerPos.x - this.group.position.x;
        const dz = observerPos.z - this.group.position.z;
        const angle = Math.atan2(dz, dx);

        // If receding (positive velocity), arrow points away from observer
        // If approaching (negative velocity), arrow points toward observer
        const arrowAngle = velocityRadial > 0 ? angle + Math.PI : angle;

        this.velocityArrow.rotation.y = -arrowAngle;

        // Scale arrow by velocity magnitude
        const scale = Math.min(2, Math.abs(velocityRadial) / 5000 + 0.5);
        this.velocityArrow.scale.setScalar(scale);

        // Color based on direction: red for receding, green/blue for approaching
        const color = velocityRadial > 0 ? 0xff4000 : 0x00ff80;
        this.velocityArrow.children.forEach(child => {
            if (child.material) {
                child.material.color.setHex(color);
                child.material.emissive.setHex(color >> 2);
            }
        });
    }

    /**
     * Update animation
     * @param {number} time - Current time
     */
    update(time) {
        // Rotate the entire galaxy slowly
        const rotationSpeed = 0.12;

        if (this.spiralArms) {
            this.spiralArms.rotation.y = time * rotationSpeed;
        }

        if (this.stars) {
            this.stars.rotation.y = time * rotationSpeed;
        }

        if (this.dustLanes) {
            this.dustLanes.rotation.y = time * rotationSpeed;
        }

        // Pulse the core with slight color variation
        if (this.core) {
            const pulse = 1 + 0.08 * Math.sin(time * 2.5);
            this.core.scale.setScalar(pulse);

            // Slight color temperature variation
            const temp = 0.9 + 0.1 * Math.sin(time * 1.5);
            this.core.material.emissive.setRGB(temp, temp * 0.7, temp * 0.3);
        }
    }

    /**
     * Get position
     * @returns {THREE.Vector3}
     */
    getPosition() {
        return this.group.position.clone();
    }

    dispose() {
        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
        });
        this.scene.remove(this.group);
    }
}

/**
 * Star visualization - Sun-like star with corona and flares
 */
export class StarObject {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.velocityArrow = null;
        this.core = null;
        this.corona = null;

        this.create();
        this.scene.add(this.group);
    }

    create() {
        // Star core - bright yellow/orange
        const coreGeometry = new THREE.SphereGeometry(20, 64, 64);

        // Procedural sun texture
        const sunCanvas = this.createSunTexture();
        const sunTexture = new THREE.CanvasTexture(sunCanvas);

        const coreMaterial = new THREE.MeshBasicMaterial({
            map: sunTexture,
            color: 0xffdd44
        });
        this.core = new THREE.Mesh(coreGeometry, coreMaterial);
        this.group.add(this.core);

        // Inner glow
        const innerGlowGeometry = new THREE.SphereGeometry(22, 32, 32);
        const innerGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });
        this.innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
        this.group.add(this.innerGlow);

        // Corona (outer glow)
        this.createCorona();

        // Solar flares/prominences
        this.createFlares();

        // Create velocity arrow
        this.createVelocityArrow();

        // Label
        this.createLabel('The Sun', 0xffdd44);
    }

    createSunTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Base orange-yellow gradient
        const gradient = ctx.createRadialGradient(256, 128, 0, 256, 128, 256);
        gradient.addColorStop(0, '#ffffcc');
        gradient.addColorStop(0.3, '#ffdd66');
        gradient.addColorStop(0.6, '#ffaa33');
        gradient.addColorStop(1, '#ff6600');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 256);

        // Add granulation (solar surface texture)
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 500; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 256;
            const r = 2 + Math.random() * 8;
            const brightness = Math.random() > 0.5 ? '#ffeeaa' : '#dd8800';
            ctx.fillStyle = brightness;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Add sunspots
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#993300';
        for (let i = 0; i < 5; i++) {
            const x = 100 + Math.random() * 312;
            const y = 50 + Math.random() * 156;
            const r = 5 + Math.random() * 15;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        return canvas;
    }

    createCorona() {
        const coronaGeometry = new THREE.SphereGeometry(35, 32, 32);
        const coronaMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color: { value: new THREE.Color(0xffaa44) }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPositionNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform float time;
                varying vec3 vNormal;
                varying vec3 vPositionNormal;
                void main() {
                    float intensity = pow(0.6 - dot(vNormal, vPositionNormal), 2.0);
                    float flicker = 0.8 + 0.2 * sin(time * 5.0);
                    gl_FragColor = vec4(color * flicker, intensity * 0.5);
                }
            `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        });

        this.corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
        this.group.add(this.corona);
    }

    createFlares() {
        // Create a few solar flare arcs
        this.flares = [];
        const flareCount = 4;

        for (let i = 0; i < flareCount; i++) {
            const curve = new THREE.QuadraticBezierCurve3(
                new THREE.Vector3(20, 0, 0),
                new THREE.Vector3(30 + Math.random() * 15, 20 + Math.random() * 15, 0),
                new THREE.Vector3(20, 5, 0)
            );

            const points = curve.getPoints(20);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);

            const material = new THREE.LineBasicMaterial({
                color: 0xff6600,
                transparent: true,
                opacity: 0.7,
                blending: THREE.AdditiveBlending
            });

            const flare = new THREE.Line(geometry, material);
            flare.rotation.z = (i / flareCount) * Math.PI * 2;
            flare.rotation.y = Math.random() * Math.PI;
            this.flares.push(flare);
            this.group.add(flare);
        }
    }

    createLabel(text, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        context.font = 'Bold 32px Arial';
        context.fillStyle = '#' + new THREE.Color(color).getHexString();
        context.textAlign = 'center';
        context.fillText(text, 128, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(0, 50, 0);
        sprite.scale.set(50, 12, 1);
        this.group.add(sprite);
    }

    createVelocityArrow() {
        const shaftGeometry = new THREE.CylinderGeometry(2, 2, 50, 16);
        const shaftMaterial = new THREE.MeshPhongMaterial({
            color: 0xff8000,
            emissive: 0x402000
        });
        const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
        shaft.rotation.z = -Math.PI / 2;
        shaft.position.x = 25;

        const headGeometry = new THREE.ConeGeometry(5, 15, 16);
        const headMaterial = new THREE.MeshPhongMaterial({
            color: 0xff8000,
            emissive: 0x402000
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.rotation.z = -Math.PI / 2;
        head.position.x = 55;

        this.velocityArrow = new THREE.Group();
        this.velocityArrow.add(shaft);
        this.velocityArrow.add(head);
        this.velocityArrow.visible = false;
        this.group.add(this.velocityArrow);
    }

    setPosition(position) {
        this.group.position.set(position.x, position.y, position.z);
    }

    updateVelocityArrow(velocityRadial, observerPos) {
        if (Math.abs(velocityRadial) < 100) {
            this.velocityArrow.visible = false;
            return;
        }

        this.velocityArrow.visible = true;

        const dx = observerPos.x - this.group.position.x;
        const dz = observerPos.z - this.group.position.z;
        const angle = Math.atan2(dz, dx);
        const arrowAngle = velocityRadial > 0 ? angle + Math.PI : angle;

        this.velocityArrow.rotation.y = -arrowAngle;

        const scale = Math.min(2, Math.abs(velocityRadial) / 5000 + 0.5);
        this.velocityArrow.scale.setScalar(scale);

        const color = velocityRadial > 0 ? 0xff4000 : 0x00ff80;
        this.velocityArrow.children.forEach(child => {
            if (child.material) {
                child.material.color.setHex(color);
                child.material.emissive.setHex(color >> 2);
            }
        });
    }

    update(time) {
        // Rotate star slowly
        if (this.core) {
            this.core.rotation.y = time * 0.05;
        }

        // Animate corona
        if (this.corona && this.corona.material.uniforms) {
            this.corona.material.uniforms.time.value = time;
        }

        // Pulse inner glow
        if (this.innerGlow) {
            const pulse = 1 + 0.1 * Math.sin(time * 3);
            this.innerGlow.scale.setScalar(pulse);
        }

        // Animate flares
        if (this.flares) {
            this.flares.forEach((flare, i) => {
                flare.rotation.z += 0.001;
                flare.material.opacity = 0.5 + 0.3 * Math.sin(time * 2 + i);
            });
        }
    }

    getPosition() {
        return this.group.position.clone();
    }

    dispose() {
        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
        });
        this.scene.remove(this.group);
    }
}

/**
 * Quasar visualization - Bright core with relativistic jets
 */
export class QuasarObject {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.velocityArrow = null;
        this.core = null;
        this.jets = [];
        this.accretionDisk = null;

        this.create();
        this.scene.add(this.group);
    }

    create() {
        // Extremely bright core
        this.createCore();

        // Accretion disk
        this.createAccretionDisk();

        // Relativistic jets
        this.createJets();

        // Outer glow
        this.createGlow();

        // Create velocity arrow
        this.createVelocityArrow();

        // Label
        this.createLabel('Quasar 3C 273', 0x00ffff);
    }

    createCore() {
        // Bright point-like core (AGN)
        const coreGeometry = new THREE.SphereGeometry(8, 32, 32);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff
        });
        this.core = new THREE.Mesh(coreGeometry, coreMaterial);
        this.group.add(this.core);

        // Intense inner glow
        const glowGeometry = new THREE.SphereGeometry(12, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x88ffff,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        this.innerGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.group.add(this.innerGlow);
    }

    createAccretionDisk() {
        // Tilted accretion disk around the core
        const diskGeometry = new THREE.RingGeometry(12, 40, 64);

        // Create disk texture
        const diskCanvas = document.createElement('canvas');
        diskCanvas.width = 256;
        diskCanvas.height = 256;
        const ctx = diskCanvas.getContext('2d');

        const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.2, '#aaffff');
        gradient.addColorStop(0.5, '#4488ff');
        gradient.addColorStop(0.8, '#2244aa');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);

        const diskTexture = new THREE.CanvasTexture(diskCanvas);

        const diskMaterial = new THREE.MeshBasicMaterial({
            map: diskTexture,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });

        this.accretionDisk = new THREE.Mesh(diskGeometry, diskMaterial);
        this.accretionDisk.rotation.x = Math.PI / 3; // Tilt the disk
        this.group.add(this.accretionDisk);
    }

    createJets() {
        // Two opposing relativistic jets
        const jetColors = [0x00aaff, 0x8844ff];

        for (let i = 0; i < 2; i++) {
            const jetGroup = new THREE.Group();

            // Jet cone
            const jetGeometry = new THREE.ConeGeometry(8, 80, 16, 1, true);
            const jetMaterial = new THREE.MeshBasicMaterial({
                color: jetColors[i % 2],
                transparent: true,
                opacity: 0.5,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide
            });
            const jet = new THREE.Mesh(jetGeometry, jetMaterial);
            jet.position.y = 50;
            jetGroup.add(jet);

            // Jet particles
            const particleCount = 100;
            const positions = new Float32Array(particleCount * 3);
            const colors = new Float32Array(particleCount * 3);

            for (let j = 0; j < particleCount; j++) {
                const t = j / particleCount;
                const radius = 2 + t * 6;
                const angle = Math.random() * Math.PI * 2;
                positions[j * 3] = Math.cos(angle) * radius;
                positions[j * 3 + 1] = 10 + t * 70;
                positions[j * 3 + 2] = Math.sin(angle) * radius;

                colors[j * 3] = 0.5 + t * 0.5;
                colors[j * 3 + 1] = 0.7 + t * 0.3;
                colors[j * 3 + 2] = 1.0;
            }

            const particleGeometry = new THREE.BufferGeometry();
            particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            const particleMaterial = new THREE.PointsMaterial({
                size: 3,
                vertexColors: true,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            });

            const particles = new THREE.Points(particleGeometry, particleMaterial);
            jetGroup.add(particles);

            // Position: one up, one down
            if (i === 1) {
                jetGroup.rotation.x = Math.PI;
            }

            this.jets.push(jetGroup);
            this.group.add(jetGroup);
        }
    }

    createGlow() {
        const glowGeometry = new THREE.SphereGeometry(50, 32, 32);
        const glowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0x4488ff) }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPositionNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                varying vec3 vNormal;
                varying vec3 vPositionNormal;
                void main() {
                    float intensity = pow(0.5 - dot(vNormal, vPositionNormal), 2.0);
                    gl_FragColor = vec4(color, intensity * 0.3);
                }
            `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        });

        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.group.add(glow);
    }

    createLabel(text, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        context.font = 'Bold 24px Arial';
        context.fillStyle = '#' + new THREE.Color(color).getHexString();
        context.textAlign = 'center';
        context.fillText(text, 128, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(0, 100, 0);
        sprite.scale.set(60, 15, 1);
        this.group.add(sprite);
    }

    createVelocityArrow() {
        const shaftGeometry = new THREE.CylinderGeometry(2, 2, 50, 16);
        const shaftMaterial = new THREE.MeshPhongMaterial({
            color: 0xff8000,
            emissive: 0x402000
        });
        const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
        shaft.rotation.z = -Math.PI / 2;
        shaft.position.x = 25;

        const headGeometry = new THREE.ConeGeometry(5, 15, 16);
        const headMaterial = new THREE.MeshPhongMaterial({
            color: 0xff8000,
            emissive: 0x402000
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.rotation.z = -Math.PI / 2;
        head.position.x = 55;

        this.velocityArrow = new THREE.Group();
        this.velocityArrow.add(shaft);
        this.velocityArrow.add(head);
        this.velocityArrow.visible = false;
        this.group.add(this.velocityArrow);
    }

    setPosition(position) {
        this.group.position.set(position.x, position.y, position.z);
    }

    updateVelocityArrow(velocityRadial, observerPos) {
        // Quasar typically doesn't show velocity arrow (pure cosmological)
        this.velocityArrow.visible = false;
    }

    update(time) {
        // Rotate accretion disk
        if (this.accretionDisk) {
            this.accretionDisk.rotation.z = time * 0.5;
        }

        // Animate jets
        this.jets.forEach((jet, i) => {
            // Pulse jets
            const pulse = 0.8 + 0.2 * Math.sin(time * 3 + i * Math.PI);
            jet.scale.setScalar(pulse);

            // Animate jet particles
            if (jet.children[1]) {
                const positions = jet.children[1].geometry.attributes.position;
                for (let j = 0; j < positions.count; j++) {
                    let y = positions.getY(j);
                    y += 2;
                    if (y > 80) y = 10;
                    positions.setY(j, y);
                }
                positions.needsUpdate = true;
            }
        });

        // Pulse core
        if (this.innerGlow) {
            const pulse = 1 + 0.15 * Math.sin(time * 5);
            this.innerGlow.scale.setScalar(pulse);
        }
    }

    getPosition() {
        return this.group.position.clone();
    }

    dispose() {
        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
        });
        this.scene.remove(this.group);
    }
}

/**
 * Galaxy Cluster visualization - Multiple galaxies grouped together
 */
export class ClusterObject {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.velocityArrow = null;
        this.galaxies = [];

        this.create();
        this.scene.add(this.group);
    }

    create() {
        // Create multiple small galaxies in a cluster
        this.createGalaxies();

        // Hot intracluster gas (X-ray glow)
        this.createGasHalo();

        // Create velocity arrow
        this.createVelocityArrow();

        // Label
        this.createLabel('Coma Cluster', 0xffaa44);
    }

    createGalaxies() {
        const galaxyCount = 12;
        const clusterRadius = 40;

        for (let i = 0; i < galaxyCount; i++) {
            const galaxyGroup = new THREE.Group();

            // Random position in cluster
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = clusterRadius * Math.pow(Math.random(), 0.5);

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta) * 0.5; // Flatten slightly
            const z = r * Math.cos(phi);

            // Galaxy core
            const coreSize = 3 + Math.random() * 4;
            const coreGeometry = new THREE.SphereGeometry(coreSize, 16, 16);
            const coreColor = Math.random() > 0.3 ? 0xffcc88 : 0x8888ff; // Elliptical or spiral
            const coreMaterial = new THREE.MeshBasicMaterial({
                color: coreColor,
                transparent: true,
                opacity: 0.9
            });
            const core = new THREE.Mesh(coreGeometry, coreMaterial);
            galaxyGroup.add(core);

            // Galaxy glow
            const glowGeometry = new THREE.SphereGeometry(coreSize * 1.5, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: coreColor,
                transparent: true,
                opacity: 0.3,
                blending: THREE.AdditiveBlending
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            galaxyGroup.add(glow);

            galaxyGroup.position.set(x, y, z);
            this.galaxies.push(galaxyGroup);
            this.group.add(galaxyGroup);
        }
    }

    createGasHalo() {
        // Hot intracluster medium (ICM) - diffuse X-ray emitting gas
        const gasGeometry = new THREE.SphereGeometry(60, 32, 32);
        const gasMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0xff8844) },
                time: { value: 0 }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPositionNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform float time;
                varying vec3 vNormal;
                varying vec3 vPositionNormal;
                void main() {
                    float intensity = pow(0.5 - dot(vNormal, vPositionNormal), 2.0);
                    float flicker = 0.9 + 0.1 * sin(time * 2.0);
                    gl_FragColor = vec4(color * flicker, intensity * 0.2);
                }
            `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        });

        this.gasHalo = new THREE.Mesh(gasGeometry, gasMaterial);
        this.group.add(this.gasHalo);
    }

    createLabel(text, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        context.font = 'Bold 24px Arial';
        context.fillStyle = '#' + new THREE.Color(color).getHexString();
        context.textAlign = 'center';
        context.fillText(text, 128, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(0, 80, 0);
        sprite.scale.set(60, 15, 1);
        this.group.add(sprite);
    }

    createVelocityArrow() {
        const shaftGeometry = new THREE.CylinderGeometry(2, 2, 50, 16);
        const shaftMaterial = new THREE.MeshPhongMaterial({
            color: 0xff8000,
            emissive: 0x402000
        });
        const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
        shaft.rotation.z = -Math.PI / 2;
        shaft.position.x = 25;

        const headGeometry = new THREE.ConeGeometry(5, 15, 16);
        const headMaterial = new THREE.MeshPhongMaterial({
            color: 0xff8000,
            emissive: 0x402000
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.rotation.z = -Math.PI / 2;
        head.position.x = 55;

        this.velocityArrow = new THREE.Group();
        this.velocityArrow.add(shaft);
        this.velocityArrow.add(head);
        this.velocityArrow.visible = false;
        this.group.add(this.velocityArrow);
    }

    setPosition(position) {
        this.group.position.set(position.x, position.y, position.z);
    }

    updateVelocityArrow(velocityRadial, observerPos) {
        if (Math.abs(velocityRadial) < 100) {
            this.velocityArrow.visible = false;
            return;
        }

        this.velocityArrow.visible = true;

        const dx = observerPos.x - this.group.position.x;
        const dz = observerPos.z - this.group.position.z;
        const angle = Math.atan2(dz, dx);
        const arrowAngle = velocityRadial > 0 ? angle + Math.PI : angle;

        this.velocityArrow.rotation.y = -arrowAngle;

        const scale = Math.min(2, Math.abs(velocityRadial) / 5000 + 0.5);
        this.velocityArrow.scale.setScalar(scale);

        const color = velocityRadial > 0 ? 0xff4000 : 0x00ff80;
        this.velocityArrow.children.forEach(child => {
            if (child.material) {
                child.material.color.setHex(color);
                child.material.emissive.setHex(color >> 2);
            }
        });
    }

    update(time) {
        // Slowly rotate cluster
        this.group.rotation.y = time * 0.02;

        // Animate gas halo
        if (this.gasHalo && this.gasHalo.material.uniforms) {
            this.gasHalo.material.uniforms.time.value = time;
        }

        // Subtle galaxy movements
        this.galaxies.forEach((galaxy, i) => {
            const offset = i * 0.5;
            galaxy.position.y += Math.sin(time * 0.5 + offset) * 0.02;
        });
    }

    getPosition() {
        return this.group.position.clone();
    }

    dispose() {
        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
        });
        this.scene.remove(this.group);
    }
}

/**
 * Factory function to create the appropriate source based on type
 */
export function createSourceObject(scene, sourceType) {
    switch (sourceType) {
        case SourceType.STAR:
            return new StarObject(scene);
        case SourceType.QUASAR:
            return new QuasarObject(scene);
        case SourceType.CLUSTER:
            return new ClusterObject(scene);
        case SourceType.GALAXY:
        default:
            return new SourceObject(scene);
    }
}

/**
 * Ghost galaxy visualization - shows Hubble flow position
 * (Where the source would be without peculiar velocity)
 */
export class GhostGalaxy {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.visible = false;

        this.create();
        this.scene.add(this.group);
    }

    create() {
        // Transparent ghost representation
        const coreGeometry = new THREE.SphereGeometry(10, 24, 24);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            transparent: true,
            opacity: 0.25,
            wireframe: true
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        this.group.add(core);

        // Outer ring to highlight the ghost
        const ringGeometry = new THREE.TorusGeometry(20, 1, 8, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            transparent: true,
            opacity: 0.4
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        this.group.add(ring);

        // Label
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        context.font = 'Bold 20px Arial';
        context.fillStyle = '#ff80ff';
        context.textAlign = 'center';
        context.fillText('Hubble Flow Position', 128, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.7
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(0, 40, 0);
        sprite.scale.set(50, 12, 1);
        this.group.add(sprite);

        // Connecting line (dashed) to show peculiar velocity difference
        const lineMaterial = new THREE.LineDashedMaterial({
            color: 0xff80ff,
            dashSize: 5,
            gapSize: 3,
            transparent: true,
            opacity: 0.5
        });
        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
        this.connectingLine = new THREE.Line(lineGeometry, lineMaterial);
        this.scene.add(this.connectingLine);

        this.group.visible = false;
        this.connectingLine.visible = false;
    }

    /**
     * Update ghost galaxy position
     * @param {Object} hubblePosition - Position due to Hubble flow only
     * @param {Object} actualPosition - Actual source position
     * @param {boolean} show - Whether to show the ghost
     */
    update(hubblePosition, actualPosition, show) {
        this.group.visible = show;
        this.connectingLine.visible = show;

        if (!show) return;

        this.group.position.set(hubblePosition.x, hubblePosition.y, hubblePosition.z);

        // Update connecting line
        const positions = this.connectingLine.geometry.attributes.position;
        positions.setXYZ(0, hubblePosition.x, hubblePosition.y + 5, hubblePosition.z);
        positions.setXYZ(1, actualPosition.x, actualPosition.y + 5, actualPosition.z);
        positions.needsUpdate = true;
        this.connectingLine.computeLineDistances();
    }

    dispose() {
        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
        });
        this.connectingLine.geometry.dispose();
        this.connectingLine.material.dispose();
        this.scene.remove(this.group);
        this.scene.remove(this.connectingLine);
    }
}

/**
 * Line of sight visualization (connecting source and observer)
 */
export class LineOfSight {
    constructor(scene) {
        this.scene = scene;
        this.line = null;

        this.create();
    }

    create() {
        const material = new THREE.LineDashedMaterial({
            color: 0x404080,
            dashSize: 10,
            gapSize: 10,
            transparent: true,
            opacity: 0.5
        });

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));

        this.line = new THREE.Line(geometry, material);
        this.line.computeLineDistances();
        this.scene.add(this.line);
    }

    /**
     * Update line endpoints
     * @param {THREE.Vector3} start - Start position
     * @param {THREE.Vector3} end - End position
     */
    update(start, end) {
        const positions = this.line.geometry.attributes.position;
        positions.setXYZ(0, start.x, start.y + 5, start.z);
        positions.setXYZ(1, end.x, end.y + 5, end.z);
        positions.needsUpdate = true;
        this.line.computeLineDistances();
    }

    dispose() {
        this.line.geometry.dispose();
        this.line.material.dispose();
        this.scene.remove(this.line);
    }
}
