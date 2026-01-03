/**
 * Distance Scale Module - Visual ruler between source and observer
 *
 * Shows:
 * - Current distance between source and observer
 * - Tick marks along the path
 * - Distance label
 */

import * as THREE from 'three';

export class DistanceScale {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();

        // Scale line
        this.scaleLine = null;

        // Tick marks
        this.tickMarks = [];
        this.tickLabels = [];

        // Distance label sprite
        this.distanceLabel = null;

        // Styling
        this.color = 0x80a0c0;
        this.tickSpacing = 50; // Units between ticks
        this.maxTicks = 20;

        this.create();
        this.scene.add(this.group);
    }

    create() {
        // Create main scale line
        const lineMaterial = new THREE.LineBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.6
        });

        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));

        this.scaleLine = new THREE.Line(lineGeometry, lineMaterial);
        this.group.add(this.scaleLine);

        // Create tick marks
        const tickGeometry = new THREE.BufferGeometry();
        const tickPositions = new Float32Array(this.maxTicks * 6); // 2 vertices per tick * 3 coords
        tickGeometry.setAttribute('position', new THREE.BufferAttribute(tickPositions, 3));

        const tickMaterial = new THREE.LineBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.5
        });

        this.tickMarks = new THREE.LineSegments(tickGeometry, tickMaterial);
        this.group.add(this.tickMarks);

        // Create distance label
        this.createDistanceLabel();

        // Create scale bar at bottom
        this.createScaleBar();
    }

    createDistanceLabel() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        // Will be updated dynamically
        context.font = 'Bold 28px Arial';
        context.fillStyle = '#80c0ff';
        context.textAlign = 'center';
        context.fillText('0 Mpc', 128, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });

        this.distanceLabel = new THREE.Sprite(spriteMaterial);
        this.distanceLabel.scale.set(50, 12.5, 1);
        this.group.add(this.distanceLabel);

        // Store canvas and context for updates
        this.labelCanvas = canvas;
        this.labelContext = context;
        this.labelTexture = texture;
    }

    createScaleBar() {
        // A fixed scale bar in screen space would require HTML overlay
        // For now, we'll show the scale with tick marks

        // Create a simple reference bar
        const barGeometry = new THREE.BoxGeometry(this.tickSpacing, 2, 2);
        const barMaterial = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.4
        });

        this.scaleBar = new THREE.Mesh(barGeometry, barMaterial);
        this.scaleBar.visible = false; // Hidden by default
        this.group.add(this.scaleBar);
    }

    /**
     * Update the scale visualization
     * @param {THREE.Vector3} observerPos - Observer position
     * @param {THREE.Vector3} sourcePos - Source position
     * @param {number} scaleFactor - Current scale factor
     */
    update(observerPos, sourcePos, scaleFactor = 1.0) {
        // Calculate distance
        const dx = sourcePos.x - observerPos.x;
        const dy = sourcePos.y - observerPos.y;
        const dz = sourcePos.z - observerPos.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Update main scale line
        const linePositions = this.scaleLine.geometry.attributes.position;
        linePositions.setXYZ(0, observerPos.x, observerPos.y - 20, observerPos.z);
        linePositions.setXYZ(1, sourcePos.x, sourcePos.y - 20, sourcePos.z);
        linePositions.needsUpdate = true;

        // Direction vector
        const dirX = distance > 0 ? dx / distance : 1;
        const dirY = distance > 0 ? dy / distance : 0;
        const dirZ = distance > 0 ? dz / distance : 0;

        // Perpendicular for tick marks (in xz plane, so use z for perp)
        const perpX = -dirZ;
        const perpZ = dirX;

        // Update tick marks
        const tickPositions = this.tickMarks.geometry.attributes.position;
        const numTicks = Math.min(this.maxTicks, Math.floor(distance / this.tickSpacing) + 1);

        for (let i = 0; i < this.maxTicks; i++) {
            const idx = i * 6;

            if (i < numTicks) {
                const t = i / (numTicks - 1 || 1);
                const x = observerPos.x + dirX * t * distance;
                const y = observerPos.y - 20;
                const z = observerPos.z + dirZ * t * distance;

                const tickSize = (i === 0 || i === numTicks - 1) ? 8 : 5;

                tickPositions.setXYZ(idx, x + perpX * tickSize, y, z + perpZ * tickSize);
                tickPositions.setXYZ(idx + 3, x - perpX * tickSize, y, z - perpZ * tickSize);
            } else {
                // Hide unused ticks
                tickPositions.setXYZ(idx, 0, -1000, 0);
                tickPositions.setXYZ(idx + 3, 0, -1000, 0);
            }
        }
        tickPositions.needsUpdate = true;

        // Update distance label
        this.updateDistanceLabel(distance, scaleFactor);

        // Position label at midpoint
        const midX = (observerPos.x + sourcePos.x) / 2;
        const midY = observerPos.y - 35;
        const midZ = (observerPos.z + sourcePos.z) / 2;
        this.distanceLabel.position.set(midX, midY, midZ);
    }

    updateDistanceLabel(distance, scaleFactor) {
        // Clear canvas
        this.labelContext.clearRect(0, 0, 256, 64);

        // Format distance
        let displayDistance;
        let unit;

        if (distance < 1) {
            displayDistance = (distance * 1000).toFixed(0);
            unit = 'kpc';
        } else if (distance < 100) {
            displayDistance = distance.toFixed(1);
            unit = 'Mpc';
        } else {
            displayDistance = distance.toFixed(0);
            unit = 'Mpc';
        }

        // Draw text
        this.labelContext.font = 'Bold 24px Arial';
        this.labelContext.fillStyle = '#80c0ff';
        this.labelContext.textAlign = 'center';
        this.labelContext.fillText(`${displayDistance} ${unit}`, 128, 30);

        // Show scale factor if not 1
        if (Math.abs(scaleFactor - 1) > 0.001) {
            this.labelContext.font = '16px Arial';
            this.labelContext.fillStyle = '#ff80ff';
            this.labelContext.fillText(`(a = ${scaleFactor.toFixed(3)})`, 128, 52);
        }

        // Update texture
        this.labelTexture.needsUpdate = true;
    }

    /**
     * Set visibility
     * @param {boolean} visible
     */
    setVisible(visible) {
        this.group.visible = visible;
    }

    /**
     * Dispose resources
     */
    dispose() {
        this.scaleLine.geometry.dispose();
        this.scaleLine.material.dispose();
        this.tickMarks.geometry.dispose();
        this.tickMarks.material.dispose();
        if (this.labelTexture) this.labelTexture.dispose();
        if (this.distanceLabel.material.map) this.distanceLabel.material.map.dispose();
        this.distanceLabel.material.dispose();
        this.scene.remove(this.group);
    }
}
