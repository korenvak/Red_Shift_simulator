# Redshift Physics Animations

High-impact GIF animations for physics presentations about cosmological redshift. Designed for undergraduate lectures with a cinematic "space" aesthetic.

## Output Examples

| Animation | Description | Physics |
|-----------|-------------|---------|
| `doppler.gif` | Moving source with wavelength compression/stretching | λ_obs = λ_emit × √((1+β)/(1-β)) |
| `cosmological.gif` | Expanding space stretches wavelength | λ_obs = λ_emit × a(t) |
| `gravitational.gif` | Photon climbing out of potential well | Δλ/λ ≈ GM/(rc²) |

## Quick Start

### Prerequisites

```bash
# Install required packages
pip install pillow imageio numpy
```

### Generate All Animations

```bash
# Navigate to the animations folder
cd gif_animations

# Generate all three animations (default: 1920x1080, 30fps, 5s loop)
python redshift_animations.py

# Output saved to: gif_animations/output/
```

### Command Line Options

```bash
# Custom resolution (for lower file size)
python redshift_animations.py --width 1280 --height 720

# Adjust loop duration
python redshift_animations.py --duration 6.0

# Change frame rate
python redshift_animations.py --fps 24

# Generate only one animation
python redshift_animations.py --animation doppler
python redshift_animations.py --animation cosmological
python redshift_animations.py --animation gravitational

# Also save PNG frame sequences
python redshift_animations.py --save-frames

# Custom output directory
python redshift_animations.py --output my_gifs
```

## Output Files

After running, you'll find in the `output/` directory:

```
output/
├── doppler.gif          # Doppler redshift animation
├── cosmological.gif     # Cosmological redshift animation
├── gravitational.gif    # Gravitational redshift animation
└── *_frames/            # (optional) PNG sequences if --save-frames used
```

## Customizable Parameters

Edit the `AnimationConfig` class in `redshift_animations.py`:

```python
@dataclass
class AnimationConfig:
    # Output settings
    width: int = 1920           # Resolution width
    height: int = 1080          # Resolution height
    fps: int = 30               # Frames per second
    duration: float = 5.0       # Loop duration (seconds)
    
    # Visual style
    bg_color: (0, 0, 0)         # Background (pure black)
    glow_intensity: float = 1.2 # Neon glow effect
    star_density: int = 150     # Background stars count
    
    # Wave rendering
    wave_thickness: int = 4     # Wave line thickness
    glow_layers: int = 3        # Number of glow layers
```

### Animation-Specific Parameters

#### Doppler Animation
```python
self.velocity = 60000      # km/s (source velocity, ~0.2c)
self.wavelength_rest = 500 # nm (starting color - cyan)
```

#### Cosmological Animation
```python
self.wavelength_rest = 480    # nm (starting color - blue)
self.max_scale_factor = 2.0   # Space doubles in size
self.grid_spacing = 100       # Comoving grid spacing
```

#### Gravitational Animation
```python
self.wavelength_rest = 450    # nm (starting color - deep blue)
self.rs_visual = 150          # Visual Schwarzschild radius
```

## Physics Details

### 1. Doppler Redshift

**Formula:** `z = √((1+β)/(1-β)) - 1` where `β = v/c`

Shows wavefronts emitted by a moving source. Forward direction shows compression (blueshift), backward shows stretching (redshift). Uses the full relativistic Doppler formula.

### 2. Cosmological Redshift

**Formula:** `1 + z = a_obs / a_emit`

Demonstrates how space expansion stretches light wavelength. The grid represents comoving coordinates, and a photon travels through while its wavelength grows proportionally to the scale factor a(t).

### 3. Gravitational Redshift

**Formula:** `z = 1/√(1 - rₛ/r) - 1` (Schwarzschild)

Visualizes a photon climbing out of a gravitational potential well U(r) = -GM/r. As the photon gains gravitational potential energy, it loses kinetic energy, causing wavelength increase.

## Style Guide

The animations follow a consistent visual language:

- **Background:** Pure black (#000000)
- **Color mapping:** Wavelength → visible spectrum (380-780nm extended to IR)
- **Glow effects:** Soft neon glow on waves and objects
- **Typography:** Clean, minimal labels in white/gray
- **Watermark:** Small label in bottom-left corner

## Integration with PowerPoint

1. Insert the GIF directly into your slide
2. Set slide background to black
3. The animation will loop automatically during presentation
4. For better quality, use the PNG frame sequence and create a video

## Reducing File Size

If GIFs are too large:

```bash
# Lower resolution
python redshift_animations.py --width 1280 --height 720

# Shorter duration
python redshift_animations.py --duration 3.0

# Lower frame rate
python redshift_animations.py --fps 20

# Use external optimization
gifsicle -O3 --colors 128 output/doppler.gif -o output/doppler_small.gif
```

## Troubleshooting

### "PIL not found"
```bash
pip install pillow
```

### "imageio not found"
```bash
pip install imageio
```

### Fonts not rendering correctly
The script uses Arial by default. If unavailable, it falls back to the default PIL font. For best results, ensure Arial is installed on your system.

### Animation too fast/slow
Adjust `--duration` parameter (default 5 seconds per loop).

## License

Free for educational use.

