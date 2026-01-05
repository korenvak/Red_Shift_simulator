/**
 * Gravitational Well Visualization
 * 
 * Creates a 3D representation of curved spacetime around a massive object.
 * The "rubber sheet" analogy - space curves downward into a potential well.
 * 
 * Features:
 * - 3D funnel mesh representing U(r) = -GM/r
 * - Central massive object (black hole / star)
 * - Photon that climbs out of the well with redshift
 * - Grid lines on the curved surface
 */

import * as THREE from 'three';
import { wavelengthToThreeColor, gravitationalRedshift, CONSTANTS } from '../core/physics.js';

export class GravitationalWell {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();

        // Well parameters
        this.wellRadius = 200;      // Outer radius of the well
        this.wellDepth = 150;       // How deep the well goes
        this.innerRadius = 15;      // Inner radius (event horizon visual)
        this.segments = 64;         // Mesh resolution

        // Photon parameters
        this.photonWavelengthRest = 450;  // nm (blue)
        this.photonPosition = 0;           // 0 = bottom, 1 = top
        this.photonPhase = 0;

        // Create all components
        this.createWellMesh();
        this.createGridLines();
        this.createCentralMass();
        this.createSourceEmitter();  // Source at bottom of well
        this.createObserver();        // Observer at top of well
        this.createPhoton();

        // Initially hidden
        this.group.visible = false;
        this.scene.add(this.group);
    }
    
    /**
     * Create the curved spacetime mesh (funnel shape)
     */
    createWellMesh() {
        // Create parametric surface: z = -depth * (innerRadius / r)
        // This gives U(r) ∝ -1/r shape
        
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const indices = [];
        
        const rings = 40;
        const sectors = this.segments;
        
        for (let i = 0; i <= rings; i++) {
            // Radius goes from inner to outer
            const t = i / rings;
            const r = this.innerRadius + t * (this.wellRadius - this.innerRadius);
            
            // Depth based on 1/r potential (deeper near center)
            // z = -depth * (innerRadius / r) but clamped for visualization
            const depthFactor = this.innerRadius / r;
            const z = -this.wellDepth * Math.pow(depthFactor, 0.7);  // Softened for better visuals
            
            for (let j = 0; j <= sectors; j++) {
                const theta = (j / sectors) * Math.PI * 2;
                
                const x = r * Math.cos(theta);
                const y = r * Math.sin(theta);
                
                positions.push(x, z, y);  // Note: z is vertical (depth)
                
                // Color gradient: purple at center, blue at edges
                const colorT = Math.pow(t, 0.5);
                colors.push(
                    0.3 + 0.3 * colorT,   // R
                    0.1 + 0.2 * colorT,   // G
                    0.5 + 0.3 * colorT    // B
                );
            }
        }
        
        // Create indices for triangle mesh
        for (let i = 0; i < rings; i++) {
            for (let j = 0; j < sectors; j++) {
                const a = i * (sectors + 1) + j;
                const b = a + 1;
                const c = a + sectors + 1;
                const d = c + 1;
                
                indices.push(a, c, b);
                indices.push(b, c, d);
            }
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        // Material with vertex colors
        const material = new THREE.MeshPhongMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7,
            shininess: 30
        });
        
        this.wellMesh = new THREE.Mesh(geometry, material);
        this.group.add(this.wellMesh);
        
        // Add wireframe overlay for grid effect
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x6644aa,
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });
        
        this.wireframe = new THREE.Mesh(geometry.clone(), wireframeMaterial);
        this.group.add(this.wireframe);
    }
    
    /**
     * Create grid lines on the well surface
     */
    createGridLines() {
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x8866cc,
            transparent: true,
            opacity: 0.5
        });
        
        // Radial lines
        const radialCount = 12;
        for (let i = 0; i < radialCount; i++) {
            const theta = (i / radialCount) * Math.PI * 2;
            const points = [];
            
            for (let j = 0; j <= 30; j++) {
                const t = j / 30;
                const r = this.innerRadius + t * (this.wellRadius - this.innerRadius);
                const depthFactor = this.innerRadius / r;
                const z = -this.wellDepth * Math.pow(depthFactor, 0.7);
                
                const x = r * Math.cos(theta);
                const y = r * Math.sin(theta);
                
                points.push(new THREE.Vector3(x, z, y));
            }
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, lineMaterial);
            this.group.add(line);
        }
        
        // Circular lines (equipotential)
        const circleCount = 8;
        for (let i = 1; i <= circleCount; i++) {
            const t = i / circleCount;
            const r = this.innerRadius + t * (this.wellRadius - this.innerRadius);
            const depthFactor = this.innerRadius / r;
            const z = -this.wellDepth * Math.pow(depthFactor, 0.7);
            
            const points = [];
            for (let j = 0; j <= this.segments; j++) {
                const theta = (j / this.segments) * Math.PI * 2;
                const x = r * Math.cos(theta);
                const y = r * Math.sin(theta);
                points.push(new THREE.Vector3(x, z, y));
            }
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, lineMaterial);
            this.group.add(line);
        }
    }
    
    /**
     * Create the central massive object
     */
    createCentralMass() {
        // Inner glow sphere
        const glowGeometry = new THREE.SphereGeometry(this.innerRadius * 1.5, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x220033,
            transparent: true,
            opacity: 0.8
        });
        this.centralGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.centralGlow.position.y = -this.wellDepth * 0.9;
        this.group.add(this.centralGlow);
        
        // Core (darker center)
        const coreGeometry = new THREE.SphereGeometry(this.innerRadius * 0.8, 32, 32);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0x110011
        });
        this.centralCore = new THREE.Mesh(coreGeometry, coreMaterial);
        this.centralCore.position.y = -this.wellDepth * 0.9;
        this.group.add(this.centralCore);
        
        // Accretion ring (optional visual)
        const ringGeometry = new THREE.RingGeometry(this.innerRadius * 1.2, this.innerRadius * 2, 64);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x9944ff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.4
        });
        this.accretionRing = new THREE.Mesh(ringGeometry, ringMaterial);
        this.accretionRing.rotation.x = Math.PI / 2;
        this.accretionRing.position.y = -this.wellDepth * 0.85;
        this.group.add(this.accretionRing);
        
        // Point light at center
        this.centerLight = new THREE.PointLight(0x6633aa, 1, 200);
        this.centerLight.position.y = -this.wellDepth * 0.8;
        this.group.add(this.centerLight);
        
        // Label "M"
        // (Labels would be added via HTML overlay or sprites)
    }

    /**
     * Create the source star at the bottom of the well (similar to StarObject)
     */
    createSourceEmitter() {
        const sourceGroup = new THREE.Group();

        // Source position - near the bottom of the well
        const sourceR = this.innerRadius * 2.5;
        const sourceDepthFactor = this.innerRadius / sourceR;
        const sourceZ = -this.wellDepth * Math.pow(sourceDepthFactor, 0.7);

        // Star core - yellow/orange like our Sun preset
        const coreGeometry = new THREE.SphereGeometry(12, 32, 32);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xffdd44
        });
        this.sourceEmitter = new THREE.Mesh(coreGeometry, coreMaterial);
        this.sourceEmitter.position.set(0, sourceZ + 15, 0);
        sourceGroup.add(this.sourceEmitter);

        // Inner glow (corona effect)
        const innerGlowGeometry = new THREE.SphereGeometry(14, 32, 32);
        const innerGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.4
        });
        const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
        innerGlow.position.copy(this.sourceEmitter.position);
        sourceGroup.add(innerGlow);

        // Outer corona glow
        const outerGlowGeometry = new THREE.SphereGeometry(18, 32, 32);
        const outerGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.2
        });
        const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
        outerGlow.position.copy(this.sourceEmitter.position);
        sourceGroup.add(outerGlow);

        // Point light from star
        const starLight = new THREE.PointLight(0xffdd44, 1.5, 150);
        starLight.position.copy(this.sourceEmitter.position);
        sourceGroup.add(starLight);

        // Label
        this.createLabel('Source Star', this.sourceEmitter.position.clone().add(new THREE.Vector3(25, 15, 0)));

        this.group.add(sourceGroup);
        this.sourceGroup = sourceGroup;
    }

    /**
     * Create the observer (Earth) OUTSIDE the gravitational well
     */
    createObserver() {
        const observerGroup = new THREE.Group();

        // Observer position - OUTSIDE the well, with distance from edge
        // Place Earth at a distance from the well to show light traveling through space
        const observerX = this.wellRadius + 80;  // 80 units outside the well edge
        const observerZ = 20;  // Slightly above the flat plane

        // Create Earth (similar to ObserverObject)
        const earthRadius = 10;
        const earthGeometry = new THREE.SphereGeometry(earthRadius, 32, 32);

        // Procedural Earth texture
        const earthCanvas = this.createEarthTexture();
        const earthTexture = new THREE.CanvasTexture(earthCanvas);

        const earthMaterial = new THREE.MeshPhongMaterial({
            map: earthTexture,
            specular: new THREE.Color(0x333333),
            shininess: 25
        });

        this.observer = new THREE.Mesh(earthGeometry, earthMaterial);
        this.observer.position.set(observerX, observerZ, 0);
        observerGroup.add(this.observer);

        // Atmosphere glow
        const atmosphereGeometry = new THREE.SphereGeometry(earthRadius * 1.15, 32, 32);
        const atmosphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        atmosphere.position.copy(this.observer.position);
        observerGroup.add(atmosphere);

        // Label
        this.createLabel('Observer (Earth)', this.observer.position.clone().add(new THREE.Vector3(0, 25, 0)));

        this.group.add(observerGroup);
        this.observerGroup = observerGroup;

        // Store observer position for photon path calculation
        this.observerPosition = this.observer.position.clone();
    }

    /**
     * Create procedural Earth texture (same as ObserverObject)
     */
    createEarthTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Ocean base
        ctx.fillStyle = '#1a4d7c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add continents
        ctx.fillStyle = '#2d5a27';

        // North America
        ctx.beginPath();
        ctx.ellipse(60, 35, 25, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // South America
        ctx.beginPath();
        ctx.ellipse(75, 75, 12, 20, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Europe/Africa
        ctx.beginPath();
        ctx.ellipse(135, 50, 15, 30, 0, 0, Math.PI * 2);
        ctx.fill();

        // Asia
        ctx.beginPath();
        ctx.ellipse(190, 35, 30, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // Australia
        ctx.beginPath();
        ctx.ellipse(210, 85, 12, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ice caps
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, 8);
        ctx.fillRect(0, canvas.height - 10, canvas.width, 10);

        return canvas;
    }

    /**
     * Create a text label (using sprite)
     */
    createLabel(text, position) {
        // Create canvas for text texture
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const context = canvas.getContext('2d');

        context.fillStyle = 'rgba(0, 0, 0, 0.6)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.font = 'Bold 28px Arial';
        context.fillStyle = '#ffffff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);

        sprite.position.copy(position);
        sprite.scale.set(40, 10, 1);

        this.group.add(sprite);
        return sprite;
    }

    /**
     * Create the photon that climbs the well
     */
    createPhoton() {
        // Photon head (glowing sphere)
        const photonGeometry = new THREE.SphereGeometry(5, 16, 16);
        const photonMaterial = new THREE.MeshBasicMaterial({
            color: wavelengthToThreeColor(this.photonWavelengthRest)
        });
        this.photon = new THREE.Mesh(photonGeometry, photonMaterial);
        this.group.add(this.photon);
        
        // Photon glow
        const glowGeometry = new THREE.SphereGeometry(8, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: wavelengthToThreeColor(this.photonWavelengthRest),
            transparent: true,
            opacity: 0.3
        });
        this.photonGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.group.add(this.photonGlow);
        
        // Photon trail (wave packet)
        this.photonTrail = this.createPhotonTrail();
        this.group.add(this.photonTrail);
    }
    
    /**
     * Create wave trail behind photon
     */
    createPhotonTrail() {
        const trailGroup = new THREE.Group();
        
        // Create line geometry that will be updated
        const points = [];
        for (let i = 0; i < 50; i++) {
            points.push(new THREE.Vector3(0, 0, 0));
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: wavelengthToThreeColor(this.photonWavelengthRest),
            transparent: true,
            opacity: 0.8
        });
        
        this.trailLine = new THREE.Line(geometry, material);
        trailGroup.add(this.trailLine);
        
        return trailGroup;
    }
    
    /**
     * Update the visualization
     * @param {number} time - Current time
     * @param {number} photonProgress - 0 to 1, position along escape path
     */
    update(time, photonProgress = null) {
        if (!this.group.visible) {
            // Debug: log when skipping update
            if (Math.floor(time) !== this._lastSkipLog) {
                this._lastSkipLog = Math.floor(time);
                console.log('GravitationalWell update skipped - group not visible');
            }
            return;
        }

        // Animate accretion ring
        if (this.accretionRing) {
            this.accretionRing.rotation.z = time * 0.5;
        }
        
        // Pulse central glow
        if (this.centralGlow) {
            const pulse = 1 + 0.1 * Math.sin(time * 2);
            this.centralGlow.scale.setScalar(pulse);
        }
        
        // Update photon position if provided
        if (photonProgress !== null) {
            this.updatePhoton(time, photonProgress);
        }
    }
    
    /**
     * Update photon position and wavelength
     * @param {number} time - Current time
     * @param {number} progress - 0 (source at bottom) to 1 (observer outside well)
     */
    updatePhoton(time, progress) {
        // Clamp progress
        progress = Math.max(0, Math.min(1, progress));
        this.photonPosition = progress;

        // Calculate position along path from source to observer
        // Phase 1 (0-0.7): Climb through the gravitational well
        // Phase 2 (0.7-1): Travel through flat space to observer

        const sourceR = this.innerRadius * 2.5;
        const wellEdge = this.wellRadius;
        const observerX = this.wellRadius + 80;  // Match observer position

        let x, z, r;

        if (progress < 0.7) {
            // Phase 1: Climbing through the well
            const wellProgress = progress / 0.7;  // 0 to 1 within well
            const t = Math.pow(wellProgress, 0.6);

            // Radius increases from source to well edge
            r = sourceR + t * (wellEdge - sourceR);

            // Height follows the gravitational potential surface
            const depthFactor = this.innerRadius / r;
            z = -this.wellDepth * Math.pow(depthFactor, 0.7) + 15;

            x = t * wellEdge;
        } else {
            // Phase 2: Traveling through flat space to observer
            const flatProgress = (progress - 0.7) / 0.3;  // 0 to 1 in flat space

            // Linear path from well edge to observer
            x = wellEdge + flatProgress * (observerX - wellEdge);
            z = 20;  // Flat space, same height as observer
            r = x;  // Use x position as effective radius in flat space
        }

        // Position photon
        this.photon.position.set(x, z, 0);
        this.photonGlow.position.copy(this.photon.position);
        
        // Calculate gravitational redshift
        // Using simplified formula: z = rs / (2r) for weak field
        // Or more accurate: z = 1/sqrt(1 - rs/r) - 1
        const rs = this.innerRadius * 2;  // Visual Schwarzschild radius
        let redshiftZ = 0;
        
        if (r > rs) {
            // Weak field approximation (exaggerated for visibility)
            redshiftZ = (rs / r) * 2;  // Exaggerated
        }
        
        // Calculate observed wavelength
        const wavelengthObs = this.photonWavelengthRest * (1 + redshiftZ);
        
        // Update photon color
        const color = wavelengthToThreeColor(wavelengthObs);
        this.photon.material.color.setHex(color);
        this.photonGlow.material.color.setHex(color);
        
        // Update trail
        this.updateTrail(time, progress, wavelengthObs);
        
        return {
            wavelength: wavelengthObs,
            redshift: redshiftZ,
            position: { x, y: z + 15, z: 0 }
        };
    }
    
    /**
     * Update wave trail - shows wavelength stretching as photon climbs
     */
    updateTrail(time, progress, wavelength) {
        const positions = this.trailLine.geometry.attributes.position;
        const color = wavelengthToThreeColor(wavelength);
        this.trailLine.material.color.setHex(color);

        const sourceR = this.innerRadius * 2.5;
        const wellEdge = this.wellRadius;
        const observerX = this.wellRadius + 80;
        const trailLength = 40;
        const amplitude = 8;

        // Visual wavelength increases with redshift
        const visualWavelength = 15 * (wavelength / this.photonWavelengthRest);

        for (let i = 0; i < positions.count; i++) {
            const segmentFraction = i / (positions.count - 1);

            // Trail extends behind photon
            const trailProgress = Math.max(0, progress - segmentFraction * 0.25);

            let x, z;

            if (trailProgress < 0.7) {
                // Phase 1: In the well
                const wellProgress = trailProgress / 0.7;
                const t = Math.pow(wellProgress, 0.6);

                const r = sourceR + t * (wellEdge - sourceR);
                const depthFactor = this.innerRadius / r;
                z = -this.wellDepth * Math.pow(depthFactor, 0.7) + 15;
                x = t * wellEdge;
            } else {
                // Phase 2: Flat space
                const flatProgress = (trailProgress - 0.7) / 0.3;
                x = wellEdge + flatProgress * (observerX - wellEdge);
                z = 20;
            }

            // Add sine wave oscillation perpendicular to path
            const phase = segmentFraction * trailLength / visualWavelength * Math.PI * 2 - time * 10;
            const envelope = Math.exp(-Math.pow(segmentFraction - 0.5, 2) * 8);
            const oscillation = Math.sin(phase) * amplitude * envelope * (1 - segmentFraction);

            // Oscillation in y-direction (perpendicular to x-axis travel)
            const perpY = oscillation;
            const perpZ = oscillation * 0.3;

            positions.setXYZ(i, x, z + perpZ, perpY);
        }

        positions.needsUpdate = true;
    }
    
    /**
     * Show/hide the gravitational well
     * @param {boolean} visible
     */
    setVisible(visible) {
        this.group.visible = visible;
    }
    
    /**
     * Reset photon to starting position
     */
    resetPhoton() {
        this.photonPosition = 0;
        this.updatePhoton(0, 0);
    }
    
    /**
     * Get current photon state
     */
    getPhotonState() {
        return {
            position: this.photonPosition,
            wavelength: this.photonWavelengthRest * (1 + this.calculateRedshiftAtPosition(this.photonPosition))
        };
    }
    
    /**
     * Calculate redshift at a given progress position
     */
    calculateRedshiftAtPosition(progress) {
        const t = Math.pow(progress, 0.7);
        const r = this.innerRadius * 2 + t * (this.wellRadius * 0.8 - this.innerRadius * 2);
        const rs = this.innerRadius * 2;
        
        if (r > rs) {
            return (rs / r) * 2;  // Exaggerated for visibility
        }
        return 0;
    }
    
    /**
     * Dispose resources
     */
    dispose() {
        this.group.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        this.scene.remove(this.group);
    }
}

