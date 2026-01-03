/**
 * Grid Module - 3D Spacetime grid visualization
 * VERSION 3.0 - Expanding Curved Grid for Cosmological Visualization
 *
 * Creates a volumetric 3D grid that visually represents:
 * - Expansion of space (grid cells stretch outward)
 * - Curvature visualization (grid bends away from center)
 * - Hubble flow arrows showing expansion direction
 */

import * as THREE from 'three';

console.log('Grid.js v3.2 loaded - Dramatic Curvature, No Color Change');

export class SpacetimeGrid {
    constructor(scene) {
        this.scene = scene;
        this.gridGroup = new THREE.Group();
        this.gridLines = [];
        this.expansionArrows = [];

        // Grid parameters
        this.baseSpacing = 40;
        this.gridSize = 20;
        this.gridLayers = 5;
        this.layerSpacing = 50;

        // Expansion visualization - DRAMATIC curvature for visibility
        // High value to make curvature visible even with small expansion amounts
        this.curvatureStrength = 3.0;  // Very strong for dramatic visual effect
        this.currentScaleFactor = 1.0;

        this.create();
        this.createExpansionMarkers();
        this.scene.add(this.gridGroup);
    }

    create() {
        // Materials with glow effect
        const mainMaterial = new THREE.LineBasicMaterial({
            color: 0x4080ff,
            transparent: true,
            opacity: 0.8
        });

        const secondaryMaterial = new THREE.LineBasicMaterial({
            color: 0x304080,
            transparent: true,
            opacity: 0.5
        });

        const verticalMaterial = new THREE.LineBasicMaterial({
            color: 0x405090,
            transparent: true,
            opacity: 0.35
        });

        this.gridData = [];

        // Create horizontal layers
        for (let layer = 0; layer < this.gridLayers; layer++) {
            const yOffset = layer * this.layerSpacing - (this.gridLayers - 1) * this.layerSpacing / 2;
            const layerOpacity = 1 - Math.abs(layer - (this.gridLayers - 1) / 2) / this.gridLayers * 0.4;

            // X-axis lines
            for (let i = -this.gridSize; i <= this.gridSize; i++) {
                const isMainLine = i === 0;
                const points = [];

                for (let j = -this.gridSize; j <= this.gridSize; j++) {
                    points.push(new THREE.Vector3(
                        i * this.baseSpacing,
                        yOffset,
                        j * this.baseSpacing
                    ));
                }

                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const material = isMainLine ? mainMaterial.clone() : secondaryMaterial.clone();
                material.opacity *= layerOpacity;
                const line = new THREE.Line(geometry, material);
                this.gridGroup.add(line);
                this.gridLines.push(line);

                this.gridData.push({
                    type: 'x',
                    index: i,
                    layer: layer,
                    yOffset: yOffset,
                    line: line,
                    basePoints: points.map(p => p.clone())
                });
            }

            // Z-axis lines
            for (let j = -this.gridSize; j <= this.gridSize; j++) {
                const isMainLine = j === 0;
                const points = [];

                for (let i = -this.gridSize; i <= this.gridSize; i++) {
                    points.push(new THREE.Vector3(
                        i * this.baseSpacing,
                        yOffset,
                        j * this.baseSpacing
                    ));
                }

                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const material = isMainLine ? mainMaterial.clone() : secondaryMaterial.clone();
                material.opacity *= layerOpacity;
                const line = new THREE.Line(geometry, material);
                this.gridGroup.add(line);
                this.gridLines.push(line);

                this.gridData.push({
                    type: 'z',
                    index: j,
                    layer: layer,
                    yOffset: yOffset,
                    line: line,
                    basePoints: points.map(p => p.clone())
                });
            }
        }

        // Vertical pillars
        const pillarSpacing = 5;
        for (let i = -this.gridSize; i <= this.gridSize; i += pillarSpacing) {
            for (let j = -this.gridSize; j <= this.gridSize; j += pillarSpacing) {
                const points = [];
                const x = i * this.baseSpacing;
                const z = j * this.baseSpacing;

                for (let layer = 0; layer < this.gridLayers; layer++) {
                    const y = layer * this.layerSpacing - (this.gridLayers - 1) * this.layerSpacing / 2;
                    points.push(new THREE.Vector3(x, y, z));
                }

                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, verticalMaterial.clone());
                this.gridGroup.add(line);
                this.gridLines.push(line);

                this.gridData.push({
                    type: 'vertical',
                    indexI: i,
                    indexJ: j,
                    line: line,
                    basePoints: points.map(p => p.clone())
                });
            }
        }

        this.createOriginMarker();
    }

    createOriginMarker() {
        // Central observer marker
        const geometry = new THREE.SphereGeometry(6, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.5
        });
        this.originMarker = new THREE.Mesh(geometry, material);
        this.gridGroup.add(this.originMarker);

        // Pulsing rings
        const ringGeometry = new THREE.TorusGeometry(12, 0.8, 8, 64);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x4080ff,
            transparent: true,
            opacity: 0.4
        });

        this.rings = [];
        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(ringGeometry.clone(), ringMaterial.clone());
            ring.rotation.x = Math.PI / 2;
            ring.scale.setScalar(1 + i * 0.3);
            this.gridGroup.add(ring);
            this.rings.push(ring);
        }
    }

    createExpansionMarkers() {
        // Create arrows showing expansion direction (Hubble flow)
        this.expansionArrows = [];
        const arrowColor = 0xff6040;

        const arrowPositions = [
            { x: 200, z: 0 },
            { x: -200, z: 0 },
            { x: 0, z: 200 },
            { x: 0, z: -200 },
            { x: 150, z: 150 },
            { x: -150, z: 150 },
            { x: 150, z: -150 },
            { x: -150, z: -150 },
        ];

        arrowPositions.forEach(pos => {
            const dir = new THREE.Vector3(pos.x, 0, pos.z).normalize();
            const arrow = new THREE.ArrowHelper(
                dir,
                new THREE.Vector3(pos.x, 0, pos.z),
                40,
                arrowColor,
                15,
                8
            );
            arrow.visible = false; // Hidden by default
            this.gridGroup.add(arrow);
            this.expansionArrows.push({
                arrow: arrow,
                basePos: new THREE.Vector3(pos.x, 0, pos.z),
                dir: dir
            });
        });

        // Distance rings showing expansion
        this.distanceRings = [];
        const ringDistances = [100, 200, 300, 400];
        const ringMaterial = new THREE.LineBasicMaterial({
            color: 0x4060a0,
            transparent: true,
            opacity: 0.3
        });

        ringDistances.forEach(radius => {
            const ringGeometry = new THREE.BufferGeometry();
            const points = [];
            const segments = 64;
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                points.push(new THREE.Vector3(
                    Math.cos(angle) * radius,
                    0,
                    Math.sin(angle) * radius
                ));
            }
            ringGeometry.setFromPoints(points);
            const ring = new THREE.Line(ringGeometry, ringMaterial.clone());
            this.gridGroup.add(ring);
            this.distanceRings.push({
                ring: ring,
                baseRadius: radius,
                basePoints: points.map(p => p.clone())
            });
        });
    }

    /**
     * Update grid based on scale factor
     * @param {number} scaleFactor - Current scale factor (1.0 = no expansion)
     * @param {boolean} applyExpansion - Whether to apply expansion effect
     */
    update(scaleFactor, applyExpansion = true) {
        this.currentScaleFactor = scaleFactor;
        const effectiveScale = applyExpansion ? scaleFactor : 1.0;
        const expansionAmount = effectiveScale - 1.0;
        const time = Date.now() * 0.001;

        // Update grid lines with expansion and STRONG curvature
        for (const data of this.gridData) {
            const positions = data.line.geometry.attributes.position;
            const basePoints = data.basePoints;

            for (let i = 0; i < basePoints.length; i++) {
                const base = basePoints[i];
                const distFromOrigin = Math.sqrt(base.x * base.x + base.z * base.z);

                // Scale position outward (expansion)
                let x = base.x * effectiveScale;
                let z = base.z * effectiveScale;
                let y = base.y;

                // Add DRAMATIC curvature - grid curves DOWN at edges (like a bowl/saddle)
                // This visualizes the "stretching" of space more dramatically
                if (applyExpansion && distFromOrigin > 20) {
                    // Quadratic curvature - stronger at edges
                    const normalizedDist = distFromOrigin / (this.gridSize * this.baseSpacing);
                    // Use high multiplier (300) for dramatic visible effect
                    const curveAmount = -this.curvatureStrength * expansionAmount * normalizedDist * normalizedDist * 300;
                    y += curveAmount;
                }

                // Vertical spread during expansion (layers move apart)
                if (data.type !== 'vertical') {
                    y = base.y * (1 + expansionAmount * 0.3);
                }

                positions.setXYZ(i, x, y, z);
            }

            positions.needsUpdate = true;
            data.line.geometry.computeBoundingSphere();

            // NO color change - keep original blue colors
        }

        // Update distance rings with curvature
        for (const ringData of this.distanceRings) {
            const positions = ringData.ring.geometry.attributes.position;
            const basePoints = ringData.basePoints;
            const scaledRadius = ringData.baseRadius * effectiveScale;

            for (let i = 0; i < basePoints.length; i++) {
                const base = basePoints[i];
                const angle = Math.atan2(base.z, base.x);
                const x = Math.cos(angle) * scaledRadius;
                const z = Math.sin(angle) * scaledRadius;

                // Add curvature to rings too (curve down at larger radii)
                const normalizedRadius = scaledRadius / (this.gridSize * this.baseSpacing);
                // Match the main grid curvature strength
                const curveY = applyExpansion ? -this.curvatureStrength * expansionAmount * normalizedRadius * normalizedRadius * 200 : 0;

                positions.setXYZ(i, x, curveY, z);
            }
            positions.needsUpdate = true;

            // NO color change - keep original color
        }

        // Update expansion arrows
        const showArrows = applyExpansion && expansionAmount > 0.005;
        for (const arrowData of this.expansionArrows) {
            arrowData.arrow.visible = showArrows;
            if (showArrows) {
                // Move arrows outward with expansion
                const scaledPos = arrowData.basePos.clone().multiplyScalar(effectiveScale);
                arrowData.arrow.position.copy(scaledPos);

                // Scale arrow length based on expansion rate
                const arrowLength = 30 + expansionAmount * 100;
                arrowData.arrow.setLength(arrowLength, 15 + expansionAmount * 10, 8);

                // Pulse opacity
                const pulse = 0.5 + 0.3 * Math.sin(time * 3);
                arrowData.arrow.line.material.opacity = pulse;
                arrowData.arrow.cone.material.opacity = pulse;
            }
        }

        // Animate origin marker
        if (this.originMarker) {
            const pulse = 1 + 0.15 * Math.sin(time * 2);
            this.originMarker.scale.setScalar(pulse);
        }

        // Animate rings
        if (this.rings) {
            this.rings.forEach((ring, i) => {
                ring.rotation.z = time * 0.5 * (i % 2 === 0 ? 1 : -1);
                const ringPulse = 1 + 0.1 * Math.sin(time * 2 + i);
                ring.scale.setScalar((1 + i * 0.3) * ringPulse);
            });
        }
    }

    setVisible(visible) {
        this.gridGroup.visible = visible;
    }

    setCurvature(strength) {
        this.curvatureStrength = strength;
    }

    dispose() {
        for (const line of this.gridLines) {
            line.geometry.dispose();
            line.material.dispose();
        }
        for (const arrowData of this.expansionArrows) {
            this.gridGroup.remove(arrowData.arrow);
        }
        for (const ringData of this.distanceRings) {
            ringData.ring.geometry.dispose();
            ringData.ring.material.dispose();
        }
        if (this.originMarker) {
            this.originMarker.geometry.dispose();
            this.originMarker.material.dispose();
        }
        this.scene.remove(this.gridGroup);
    }
}

/**
 * Creates an infinite-feeling ground plane with fading edges
 */
export class GroundPlane {
    constructor(scene) {
        this.scene = scene;
        this.create();
    }

    create() {
        const geometry = new THREE.CircleGeometry(2000, 64);
        geometry.rotateX(-Math.PI / 2);

        const material = new THREE.ShaderMaterial({
            uniforms: {
                color1: { value: new THREE.Color(0x101020) },
                color2: { value: new THREE.Color(0x050510) },
                fadeStart: { value: 500.0 },
                fadeEnd: { value: 1800.0 }
            },
            vertexShader: `
                varying vec3 vPosition;
                void main() {
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color1;
                uniform vec3 color2;
                uniform float fadeStart;
                uniform float fadeEnd;
                varying vec3 vPosition;

                void main() {
                    float dist = length(vPosition.xz);
                    float t = clamp((dist - fadeStart) / (fadeEnd - fadeStart), 0.0, 1.0);
                    vec3 color = mix(color1, color2, t);
                    float alpha = 1.0 - t * 0.9;
                    gl_FragColor = vec4(color, alpha * 0.3);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.y = -0.5;
        this.scene.add(this.mesh);
    }

    dispose() {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.scene.remove(this.mesh);
    }
}
