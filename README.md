# Redshift Physics Simulation - 3D Interactive Edition

An interactive Three.js simulation that visualizes and distinguishes between **Cosmological Redshift** (expansion of space), **Doppler Redshift** (peculiar velocity), and **Transverse Doppler Effect** (time dilation) with realistic 3D astronomical objects.

## Features

- **4 Famous Astronomical Presets**: Sun, Quasar 3C 273, Andromeda Galaxy, Coma Cluster
- **Unique 3D Objects**: Star with corona, Quasar with jets, Galaxy spiral, Cluster with gas halo
- **Full Relativistic Physics**: Proper SR and GR formulas
- **Real-time Spectrum Display**: Emission/absorption line visualization
- **Effect Comparison**: Side-by-side Doppler vs Cosmological contribution

## Installation

```bash
# Install dependencies
npm install

# Run local server
npm run dev
```

Or simply open `index.html` in a modern browser (requires ES modules support).

## Physics Implementation

### Relativistic Doppler Effect (Special Relativity)

The simulation uses the **full relativistic Doppler formula**, not the classical approximation:

```
z_doppler = sqrt((1+β)/(1-β)) - 1    where β = v/c
```

For motion at an angle θ to the line of sight (including transverse Doppler):

```
λ_obs/λ_emit = γ(1 + β·cos(θ))    where γ = 1/√(1-β²)
```

At θ = 90° (perpendicular motion), this reduces to the **transverse Doppler effect**:
```
z_transverse = γ - 1 = 1/√(1-β²) - 1
```

This is a purely relativistic effect due to time dilation - even objects moving perpendicular to our line of sight appear redshifted.

### Cosmological Redshift

Light traveling through expanding space gets stretched:

```
z_cosmo = a_obs/a_emit - 1
```

Where:
- `a_obs` = scale factor when light is observed (current value)
- `a_emit` = scale factor when light was emitted (smaller in the past)

### Scale Factor Evolution

The simulation models a **de Sitter universe** (dark energy dominated) with exponential expansion:

```
a(t) = a(0) · exp(H · t)
```

Where H is the Hubble parameter. This is the proper solution to the Friedmann equation for a universe dominated by dark energy (Λ).

### Combined Redshift

When both effects are present:

```
(1 + z_total) = (1 + z_doppler) · (1 + z_cosmo) · (1 + z_grav)
```

This is NOT a simple addition - redshifts multiply!

## Unit Conventions

| Quantity | Units | Notes |
|----------|-------|-------|
| Distance | Mpc | Megaparsecs (1 Mpc ≈ 3.26 million light-years) |
| Velocity | km/s | Kilometers per second |
| H0 | km/s/Mpc | Hubble constant (default: 70) |
| Wavelength | nm | Nanometers (visible: 380-780 nm) |

### Visual Scaling

Real cosmological expansion is far too slow to visualize (H0 ≈ 2×10⁻¹⁸ s⁻¹). The simulation uses a **visual scale factor** of 500 to make expansion perceptible on human timescales. This doesn't affect the physics - it just speeds up the visualization.

## Simulation Modes

### 1. Cosmological Mode
- Space expands (grid stretches)
- Redshift from expansion only
- No peculiar velocity effects
- Best for: Understanding Hubble's Law

### 2. Doppler Mode
- No space expansion
- Redshift/blueshift from motion only
- Shows transverse Doppler effect at angles
- Best for: Understanding relativistic Doppler

### 3. Mixed Mode
- Both expansion and motion
- Ghost galaxy shows "Hubble flow" position
- Comparison bars show relative contributions
- Best for: Real astronomical scenarios

## Famous Object Presets

| Object | Type | Mode | Notes |
|--------|------|------|-------|
| The Sun | Star | Doppler | Nearby - pure motion effects |
| Quasar 3C 273 | Quasar | Cosmological | z ≈ 0.158, pure expansion |
| Andromeda (M31) | Galaxy | Doppler | Blueshifted! Approaching at 300 km/s |
| Coma Cluster | Cluster | Mixed | z ≈ 0.023, recession + internal motion |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Pause/Resume |
| R | Reset simulation |
| H | Toggle help overlay |
| 1 | Cosmological mode |
| 2 | Doppler mode |
| 3 | Mixed mode |

## Code Structure

```
src/
├── core/
│   ├── physics.js    # All physics formulas (SR, GR, cosmology)
│   ├── universe.js   # Scale factor evolution
│   └── wave.js       # Wave train propagation
├── visual/
│   ├── scene.js      # Three.js scene management
│   ├── objects.js    # 3D astronomical objects (Star, Quasar, Galaxy, Cluster)
│   ├── grid.js       # Expanding spacetime grid
│   └── wave-renderer.js  # Sine wave with color shift
└── ui/
    ├── controls.js   # Slider and button handling
    ├── presets.js    # Preset configurations
    ├── spectrum.js   # Emission/absorption spectrum display
    └── charts.js     # Wavelength vs time chart
```

## Key Formulas Reference

### Lorentz Factor
```
γ = 1/√(1 - v²/c²)
```

### Schwarzschild Radius (for gravitational redshift)
```
r_s = 2GM/c²
```

### Gravitational Redshift
```
z_grav = 1/√(1 - r_s/r) - 1
```

### Hubble's Law (low-z approximation)
```
v = H0 · d
z ≈ v/c = H0·d/c
```

## Educational Value

This simulation demonstrates:

1. **Relativistic effects are not intuitive** - The classical z = v/c underestimates redshift at high velocities
2. **Transverse Doppler is real** - Moving objects appear redshifted even when moving perpendicular to our view
3. **Cosmological redshift ≠ Doppler** - Space itself expands, not just motion through space
4. **Effects multiply, not add** - (1+z) factors combine multiplicatively

## License

MIT License

## Contributing

Pull requests welcome! Please ensure physics formulas match the documented equations.
