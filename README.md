# Redshift Physics Simulation - Interactive GUI Edition

An interactive PyGame simulation that visualizes and distinguishes between **Cosmological Redshift** (expansion of space) and **Doppler Redshift** (peculiar velocity) with a professional, modern interface.

## Installation

Install the required dependencies:

```bash
pip install pygame numpy
```

Or if using the virtual environment:

```bash
venv\Scripts\activate
pip install pygame numpy
```

## Running the Simulation

```bash
python redshift_simulation.py
```

Or with the virtual environment:

```bash
venv\Scripts\python redshift_simulation.py
```

## New Features

### Modern Interactive GUI
- **70/30 Split Layout**: Visualization area (70%) with dedicated control panel (30%)
- **Mouse-Controlled Sliders**: Drag sliders to adjust parameters in real-time
- **Big Visible Buttons**: Click "EMIT PHOTON" and "RESET" buttons
- **Sci-Fi Dark Theme**: Professional dark mode with neon accent colors
- **Real-Time Data Readout**: Live display of redshift calculations

### Enhanced Visualizations
- **Wave Packets**: Photons shown as Gaussian-enveloped sine waves, not simple lines
- **Color Transitions**: Photons visibly change color from blue → green → yellow → red as they redshift
- **Gaussian Spectral Lines**: Bell curves instead of pixel lines for realistic spectroscopy
- **Semi-Transparent Fills**: Professional "scientific instrument" look
- **Faint Grid**: Subtle expanding spacetime grid that doesn't distract
- **Enhanced Galaxy Sprite**: Multi-layer circles with velocity vectors

## Physics Model

### Scale Factor and Expansion
- **Scale Factor a(t)**: Starts at 1.0 and grows based on the Hubble parameter H₀
- **Update**: `a(t) = a(t_prev) + H₀ · dt`

### Galaxy Position
The physical position combines expansion and peculiar motion:
```
X_source(t) = (X_comoving · a(t)) + (v_peculiar · t)
```

### Photon Redshift
Photons experience two types of redshift:

1. **Doppler Redshift** (applied once at emission):
   - `λ_emit = λ_rest · (1 + v_peculiar/c)`
   - Due to the galaxy's motion through space

2. **Cosmological Redshift** (applied continuously):
   - `λ_current = λ_prev · (a(t) / a(t_prev))`
   - Due to the expansion of space itself

### Redshift Calculations
- **z_doppler** = v/c
- **z_cosmo** = a(now)/a(emit) - 1
- **z_total** = (1 + z_cosmo)(1 + z_doppler) - 1

## Display Layout

### Left Side (70%): Visualization

#### Top Half: Universe Expansion
- **Observer**: Neon green target icon on the left (fixed at x=0)
- **Expanding Grid**: Faint vertical lines that spread apart as space expands
- **Galaxy**: Multi-layer blue sprite showing the source position
- **Peculiar Velocity Arrow**: Orange arrow indicating galaxy motion through space
- **Photon Wave Packets**: Traveling Gaussian-enveloped sine waves with dynamic color

#### Bottom Half: Spectral Analysis
- **X-axis**: Wavelength (nm) from 500-900
- **Y-axis**: Intensity
- **Rest Wavelength**: Semi-transparent green Gaussian curve (H-alpha at 656nm)
- **Observed Wavelength**: Solid colored Gaussian curve that shifts in real-time
- **Filled Areas**: Semi-transparent color fills under curves

### Right Side (30%): Control Dashboard

#### Interactive Sliders
1. **Hubble Parameter H₀** (0-200)
   - Controls expansion rate of the universe
   - Drag the cyan handle to adjust

2. **Peculiar Velocity** (-1000 to +1000 km/s)
   - Controls galaxy's motion through space
   - Negative values create blueshift
   - Positive values increase redshift

3. **Initial Distance** (100-800)
   - Sets the starting comoving distance of the galaxy

#### Buttons
- **EMIT PHOTON** (Green): Click to emit a photon from the galaxy
- **RESET** (Red): Click to reset the simulation

#### Redshift Data Panel
Real-time display showing:
- **z_doppler**: Doppler component with velocity
- **z_cosmo**: Cosmological component with scale factors
- **z_total**: Combined total redshift

## How to Use

### Getting Started
1. Launch the simulation
2. Adjust the **Hubble Parameter** slider to control expansion speed
3. Adjust the **Peculiar Velocity** slider to give the galaxy motion
4. Click **EMIT PHOTON** to send a photon toward the observer
5. Watch the photon's color change as it travels through expanding space

### Experiments to Try

#### Experiment 1: Pure Cosmological Redshift
1. Set **Peculiar Velocity** to 0
2. Set **Hubble Parameter** to ~100
3. Click **EMIT PHOTON**
4. **Observe**: Photon continuously redshifts (color changes) during travel
5. **Data Panel**: z_doppler ≈ 0, all redshift is cosmological

#### Experiment 2: Pure Doppler Redshift
1. Click **RESET**
2. Set **Hubble Parameter** to ~10 (minimal expansion)
3. Set **Peculiar Velocity** to ~500 km/s
4. Click **EMIT PHOTON** immediately
5. **Observe**: Photon emitted already shifted, minimal additional change
6. **Data Panel**: z_cosmo is small, most redshift is Doppler

#### Experiment 3: Combined Effects
1. Click **RESET**
2. Set **Hubble Parameter** to ~100
3. Set **Peculiar Velocity** to ~300 km/s
4. Set **Initial Distance** to ~600
5. Click **EMIT PHOTON**
6. **Observe**: Initial Doppler shift + continuous cosmological stretching
7. **Data Panel**: Both z_doppler and z_cosmo contribute significantly

#### Experiment 4: Blueshift
1. Click **RESET**
2. Set **Hubble Parameter** to ~20
3. Set **Peculiar Velocity** to **-500** km/s (negative!)
4. Click **EMIT PHOTON**
5. **Observe**: Photon starts blue-shifted, but expansion fights it
6. **Spectral Graph**: Observed line starts LEFT of rest line, then moves right

## Visual Design

### Color Scheme
- **Background**: Dark space theme (near-black)
- **Panel**: Dark gray with subtle borders
- **Neon Accents**:
  - Cyan: UI elements, scale factor data
  - Green: Observer, rest wavelength
  - Blue: Galaxy
  - Orange: Peculiar velocity
  - Magenta: Cosmological redshift
- **Text**: Light gray/white for readability

### Typography
- Uses system font (Segoe UI on Windows) with fallback
- Large headings (24pt) for sections
- Medium (20pt) for data
- Small (16pt) for labels

## Technical Details

- **Frame Rate**: 60 FPS
- **Resolution**: 1400x900 pixels
- **Speed of Light**: 299,792.458 km/s
- **H-alpha Rest Wavelength**: 656 nm
- **Visible Spectrum Range**: 380-750 nm (for color mapping)

## Code Structure

### GUI Widgets
- **Slider**: Interactive draggable slider with handle
- **Button**: Clickable button with hover effect

### Physics Classes
- **Universe**: Manages scale factor and cosmic time
- **Source**: Galaxy with comoving position and peculiar velocity
- **Photon**: Wave packet with Doppler and cosmological redshift

### Display System
- **Display**: Renders visualization and GUI
  - Spacetime view with wave packets
  - Spectral graph with Gaussian curves
  - Control panel with interactive widgets
  - Real-time data readout

## Educational Value

This simulation demonstrates:

1. **Cosmological Redshift**: Space itself stretching, continuously affecting photons
2. **Doppler Redshift**: Motion through space, applied at emission
3. **Combined Effects**: How both types add up in real observations
4. **Visual Intuition**: Color changes make redshift tangible
5. **Quantitative Data**: Precise measurements shown in real-time

Perfect for:
- Astronomy classes
- Physics demonstrations
- Self-study of cosmology
- Understanding observational astronomy

# Red_Shift_simulator