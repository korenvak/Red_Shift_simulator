"""
Redshift Physics Animations - GIF Generator
============================================
Creates 3 high-impact looping animations for physics presentations:
1. Doppler Redshift (moving source)
2. Cosmological Redshift (expanding space)
3. Gravitational Redshift (potential well)

Style: Cinematic space aesthetic with black background and neon accents
Output: 1920x1080 (16:9) looping GIFs

Author: Physics Visualization Engine
"""

import numpy as np
import math
from dataclasses import dataclass
from typing import List, Tuple, Optional
from pathlib import Path
import colorsys

# Image handling
try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("PIL not found. Installing pillow is recommended.")

try:
    import imageio.v3 as iio
    IMAGEIO_AVAILABLE = True
except ImportError:
    try:
        import imageio as iio
        IMAGEIO_AVAILABLE = True
    except ImportError:
        IMAGEIO_AVAILABLE = False
        print("imageio not found. GIF export will be disabled.")

# ============================================================================
# CONFIGURATION - Tweak these parameters!
# ============================================================================

@dataclass
class AnimationConfig:
    """Global animation configuration"""
    # Output settings
    width: int = 1920
    height: int = 1080
    fps: int = 30
    duration: float = 5.0  # seconds per loop
    
    # Visual style
    bg_color: Tuple[int, int, int] = (0, 0, 0)  # Pure black
    glow_intensity: float = 1.2
    star_density: int = 150  # Background stars
    
    # Physics display
    show_labels: bool = True
    show_equations: bool = False
    
    # Wave rendering
    wave_thickness: int = 4
    glow_layers: int = 3
    
    # Output paths
    output_dir: str = "output"


# Default config
CONFIG = AnimationConfig()

# ============================================================================
# COLOR UTILITIES
# ============================================================================

def wavelength_to_rgb(wavelength_nm: float) -> Tuple[int, int, int]:
    """
    Convert wavelength (nm) to RGB with smooth gradient.
    Extended range for redshifted light visualization.
    """
    wl = wavelength_nm
    
    # Clamp to extended visible range
    if wl < 300:
        # Extreme UV - bright cyan/white
        return (150, 200, 255)
    elif wl < 380:
        # UV - violet gradient
        t = (wl - 300) / 80
        return (int(150 - 75*t), int(200 - 200*t), 255)
    elif wl < 440:
        # Violet to blue
        t = (wl - 380) / 60
        r = int(138 * (1 - t))
        g = 0
        b = 255
        return (r, g, b)
    elif wl < 490:
        # Blue to cyan
        t = (wl - 440) / 50
        return (0, int(255 * t), 255)
    elif wl < 510:
        # Cyan to green
        t = (wl - 490) / 20
        return (0, 255, int(255 * (1 - t)))
    elif wl < 580:
        # Green to yellow
        t = (wl - 510) / 70
        return (int(255 * t), 255, 0)
    elif wl < 645:
        # Yellow to orange to red
        t = (wl - 580) / 65
        return (255, int(255 * (1 - t)), 0)
    elif wl < 780:
        # Red
        return (255, 0, 0)
    elif wl < 1200:
        # Near IR - dark red (false color)
        t = (wl - 780) / 420
        factor = max(0.3, 1.0 - t * 0.6)
        return (int(255 * factor), 0, 0)
    else:
        # Far IR - very dark red
        return (100, 0, 0)


def add_glow(color: Tuple[int, int, int], intensity: float = 1.0) -> Tuple[int, int, int]:
    """Add glow effect by brightening color"""
    r, g, b = color
    factor = 1.0 + intensity * 0.3
    return (
        min(255, int(r * factor)),
        min(255, int(g * factor)),
        min(255, int(b * factor))
    )


def create_gradient_color(t: float, start_wl: float, end_wl: float) -> Tuple[int, int, int]:
    """Create smooth color gradient based on wavelength interpolation"""
    wl = start_wl + t * (end_wl - start_wl)
    return wavelength_to_rgb(wl)


# ============================================================================
# PHYSICS CALCULATIONS
# ============================================================================

def doppler_factor(velocity: float, c: float = 299792.458) -> float:
    """
    Relativistic Doppler factor.
    velocity: km/s (positive = receding = redshift)
    Returns: λ_obs / λ_emit
    """
    beta = velocity / c
    beta = max(-0.999, min(0.999, beta))  # Clamp
    return math.sqrt((1 + beta) / (1 - beta))


def cosmological_redshift(a_emit: float, a_obs: float = 1.0) -> float:
    """
    Cosmological redshift z = a_obs/a_emit - 1
    """
    if a_emit <= 0:
        return 0
    return (a_obs / a_emit) - 1


def gravitational_redshift(r: float, rs: float) -> float:
    """
    Gravitational redshift factor.
    r: distance from center
    rs: Schwarzschild radius
    Returns: wavelength stretch factor
    """
    if r <= rs:
        return float('inf')
    return 1.0 / math.sqrt(1 - rs / r)


# ============================================================================
# DRAWING PRIMITIVES
# ============================================================================

class SpaceRenderer:
    """Renders space-themed backgrounds and effects"""
    
    def __init__(self, width: int, height: int, seed: int = 42):
        self.width = width
        self.height = height
        self.rng = np.random.default_rng(seed)
        
        # Pre-generate star positions
        self.stars = self._generate_stars(CONFIG.star_density)
    
    def _generate_stars(self, count: int) -> List[Tuple[int, int, int, int]]:
        """Generate star positions and brightnesses"""
        stars = []
        for _ in range(count):
            x = int(self.rng.uniform(0, self.width))
            y = int(self.rng.uniform(0, self.height))
            brightness = int(self.rng.uniform(40, 180))
            size = int(self.rng.choice([1, 1, 1, 2, 2, 3]))
            stars.append((x, y, brightness, size))
        return stars
    
    def draw_stars(self, draw: ImageDraw.Draw, parallax: float = 1.0, offset_x: float = 0):
        """Draw starfield with optional parallax"""
        for x, y, brightness, size in self.stars:
            px = int((x + offset_x * parallax) % self.width)
            color = (brightness, brightness, brightness + 20)
            
            if size == 1:
                draw.point((px, y), fill=color)
            else:
                draw.ellipse([px-size//2, y-size//2, px+size//2, y+size//2], 
                           fill=color)
    
    def draw_glow_circle(self, draw: ImageDraw.Draw, cx: int, cy: int, 
                         radius: int, color: Tuple[int, int, int], 
                         glow_radius: int = 20, alpha_base: int = 100):
        """Draw a glowing circle with soft edges"""
        # Outer glow layers
        for i in range(glow_radius, 0, -2):
            alpha = int(alpha_base * (i / glow_radius) ** 2)
            glow_color = (color[0], color[1], color[2], alpha)
            r = radius + i
            # Note: PIL doesn't support alpha in regular draw
            # We'll simulate with color blending
            blend = alpha / 255
            gc = tuple(int(c * blend) for c in color)
            draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=gc)
        
        # Core
        draw.ellipse([cx-radius, cy-radius, cx+radius, cy+radius], fill=color)
    
    def draw_wave_segment(self, draw: ImageDraw.Draw, 
                          points: List[Tuple[float, float]], 
                          colors: List[Tuple[int, int, int]],
                          thickness: int = 3):
        """Draw a wave with gradient coloring"""
        if len(points) < 2:
            return
        
        # Draw glow layers first
        for glow in range(CONFIG.glow_layers, 0, -1):
            glow_thickness = thickness + glow * 4
            for i in range(len(points) - 1):
                p1 = points[i]
                p2 = points[i + 1]
                color = colors[min(i, len(colors)-1)]
                # Dim glow color
                glow_color = tuple(max(0, c // (glow + 1)) for c in color)
                draw.line([p1, p2], fill=glow_color, width=glow_thickness)
        
        # Draw main wave
        for i in range(len(points) - 1):
            p1 = points[i]
            p2 = points[i + 1]
            color = colors[min(i, len(colors)-1)]
            draw.line([p1, p2], fill=color, width=thickness)


# ============================================================================
# ANIMATION 1: DOPPLER REDSHIFT
# ============================================================================

class DopplerAnimation:
    """
    Doppler Redshift Animation
    Shows wavelength compression/stretching due to source motion.
    """
    
    def __init__(self, config: AnimationConfig = CONFIG):
        self.config = config
        self.renderer = SpaceRenderer(config.width, config.height)
        
        # Animation parameters
        self.velocity = 60000  # km/s (0.2c for visible effect)
        self.wavelength_rest = 500  # nm (cyan-ish)
        self.wave_speed = 400  # pixels per second (visual)
        
        # Positions
        self.source_y = config.height // 2
        self.observer_x = config.width * 0.15
        self.observer_y = config.height // 2
        
    def generate_frame(self, t: float, frame_num: int) -> Image.Image:
        """Generate a single frame at time t"""
        img = Image.new('RGB', (self.config.width, self.config.height), self.config.bg_color)
        draw = ImageDraw.Draw(img)
        
        # Draw starfield
        self.renderer.draw_stars(draw, parallax=0.3, offset_x=t * 20)
        
        # Source position (moving left to right, wrapping)
        loop_duration = self.config.duration
        source_x = (self.config.width * 0.2 + (t / loop_duration) * self.config.width * 0.6) % (self.config.width * 0.8) + self.config.width * 0.1
        
        # Calculate wavelengths based on direction
        # Forward (redshifted) and backward (blueshifted)
        v_forward = self.velocity
        v_backward = -self.velocity
        
        wl_forward = self.wavelength_rest * doppler_factor(v_forward)
        wl_backward = self.wavelength_rest * doppler_factor(v_backward)
        
        # Draw wavefronts (concentric circles from source)
        num_waves = 12
        phase = t * self.wave_speed
        
        for i in range(num_waves):
            # Wave radius expands from emission point
            base_radius = (phase + i * 80) % (self.config.width * 0.8)
            
            if base_radius < 10:
                continue
            
            # Draw elliptical wavefront (compressed forward, stretched backward)
            # The asymmetry shows the Doppler effect
            compression_factor = 0.7  # Forward compression
            stretch_factor = 1.3  # Backward stretch
            
            # Draw segments with color gradient
            segments = 120
            points = []
            colors = []
            
            for j in range(segments + 1):
                angle = (j / segments) * 2 * math.pi
                
                # Asymmetric radius based on direction
                # cos(angle) > 0 means forward direction
                direction_factor = math.cos(angle)
                if direction_factor > 0:
                    # Forward - compressed, blueshift
                    r = base_radius * (1 - direction_factor * 0.25)
                    wl = self.wavelength_rest + direction_factor * (wl_backward - self.wavelength_rest)
                else:
                    # Backward - stretched, redshift
                    r = base_radius * (1 - direction_factor * 0.25)
                    wl = self.wavelength_rest - direction_factor * (wl_forward - self.wavelength_rest)
                
                x = source_x + r * math.cos(angle)
                y = self.source_y + r * math.sin(angle) * 0.5  # Flatten for 2.5D look
                
                points.append((x, y))
                colors.append(wavelength_to_rgb(wl))
            
            # Draw wave
            alpha = max(0.2, 1.0 - base_radius / (self.config.width * 0.8))
            for k in range(len(points) - 1):
                color = colors[k]
                # Fade with distance
                faded_color = tuple(int(c * alpha) for c in color)
                draw.line([points[k], points[k+1]], fill=faded_color, width=2)
        
        # Draw source (bright orb)
        source_color = wavelength_to_rgb(self.wavelength_rest)
        self.renderer.draw_glow_circle(draw, int(source_x), self.source_y, 15, source_color, glow_radius=30)
        
        # Draw velocity arrow
        arrow_length = 60
        arrow_end_x = source_x + arrow_length
        draw.line([(source_x + 20, self.source_y), (arrow_end_x, self.source_y)], 
                 fill=(255, 200, 100), width=3)
        # Arrowhead
        draw.polygon([(arrow_end_x, self.source_y),
                     (arrow_end_x - 10, self.source_y - 6),
                     (arrow_end_x - 10, self.source_y + 6)],
                    fill=(255, 200, 100))
        
        # Draw observer
        obs_color = (0, 255, 150)
        draw.ellipse([self.observer_x - 12, self.observer_y - 12,
                     self.observer_x + 12, self.observer_y + 12],
                    fill=obs_color, outline=(255, 255, 255))
        
        # Labels
        self._draw_labels(draw, source_x, wl_forward, wl_backward)
        
        # Watermark
        self._draw_watermark(draw, "Doppler")
        
        return img
    
    def _draw_labels(self, draw: ImageDraw.Draw, source_x: float, 
                     wl_forward: float, wl_backward: float):
        """Draw informative labels"""
        try:
            font = ImageFont.truetype("arial.ttf", 24)
            font_small = ImageFont.truetype("arial.ttf", 18)
        except:
            font = ImageFont.load_default()
            font_small = font
        
        # Title
        draw.text((self.config.width // 2 - 150, 30), 
                 "Doppler Redshift", fill=(255, 255, 255), font=font)
        
        # Wavelength indicators
        color_blue = wavelength_to_rgb(wl_backward)
        color_red = wavelength_to_rgb(wl_forward)
        
        # Forward (redshifted)
        draw.text((source_x + 80, self.source_y - 60),
                 f"λ = {wl_forward:.0f} nm", fill=color_red, font=font_small)
        draw.text((source_x + 80, self.source_y - 35),
                 "Redshifted →", fill=color_red, font=font_small)
        
        # Backward (blueshifted)
        draw.text((source_x - 180, self.source_y - 60),
                 f"λ = {wl_backward:.0f} nm", fill=color_blue, font=font_small)
        draw.text((source_x - 180, self.source_y - 35),
                 "← Blueshifted", fill=color_blue, font=font_small)
    
    def _draw_watermark(self, draw: ImageDraw.Draw, label: str):
        """Draw small watermark label"""
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except:
            font = ImageFont.load_default()
        
        draw.text((20, self.config.height - 40), label, 
                 fill=(180, 180, 180), font=font)
    
    def generate(self) -> List[Image.Image]:
        """Generate all frames for the animation"""
        frames = []
        total_frames = int(self.config.fps * self.config.duration)
        
        for i in range(total_frames):
            t = i / self.config.fps
            frame = self.generate_frame(t, i)
            frames.append(frame)
            
            if i % 10 == 0:
                print(f"Doppler: Frame {i+1}/{total_frames}")
        
        return frames


# ============================================================================
# ANIMATION 2: COSMOLOGICAL REDSHIFT
# ============================================================================

class CosmologicalAnimation:
    """
    Cosmological Redshift Animation
    Shows wavelength stretching as space expands.
    """
    
    def __init__(self, config: AnimationConfig = CONFIG):
        self.config = config
        self.renderer = SpaceRenderer(config.width, config.height)
        
        # Animation parameters
        self.wavelength_rest = 480  # nm (blue)
        self.max_scale_factor = 2.0  # Space doubles in size
        self.grid_spacing = 100
        
    def generate_frame(self, t: float, frame_num: int) -> Image.Image:
        """Generate a single frame"""
        img = Image.new('RGB', (self.config.width, self.config.height), self.config.bg_color)
        draw = ImageDraw.Draw(img)
        
        # Draw dim starfield
        self.renderer.draw_stars(draw, parallax=0.1)
        
        # Calculate scale factor (breathing animation for seamless loop)
        # Use sine wave for smooth loop: goes from 1.0 -> 2.0 -> 1.0
        loop_progress = t / self.config.duration
        scale_factor = 1.0 + (self.max_scale_factor - 1.0) * (1 - math.cos(loop_progress * 2 * math.pi)) / 2
        
        # Draw expanding grid
        self._draw_expanding_grid(draw, scale_factor)
        
        # Draw traveling photon with stretching wavelength
        self._draw_photon_wave(draw, t, scale_factor)
        
        # Draw scale factor indicator
        self._draw_scale_indicator(draw, scale_factor)
        
        # Watermark
        self._draw_watermark(draw, "Cosmological")
        
        return img
    
    def _draw_expanding_grid(self, draw: ImageDraw.Draw, scale_factor: float):
        """Draw a grid that expands with the scale factor"""
        cx = self.config.width // 2
        cy = self.config.height // 2
        
        grid_color = (40, 40, 80)
        
        # Scaled grid spacing
        spacing = self.grid_spacing * scale_factor
        
        # Draw from center outward
        max_lines = 20
        
        for i in range(-max_lines, max_lines + 1):
            # Vertical lines
            x = cx + i * spacing
            if 0 <= x <= self.config.width:
                # Fade based on distance from center
                dist = abs(i) / max_lines
                alpha = max(0.1, 1.0 - dist)
                line_color = tuple(int(c * alpha) for c in grid_color)
                draw.line([(x, 0), (x, self.config.height)], fill=line_color, width=1)
            
            # Horizontal lines
            y = cy + i * spacing
            if 0 <= y <= self.config.height:
                dist = abs(i) / max_lines
                alpha = max(0.1, 1.0 - dist)
                line_color = tuple(int(c * alpha) for c in grid_color)
                draw.line([(0, y), (self.config.width, y)], fill=line_color, width=1)
        
        # Draw small galaxies on grid intersections
        galaxy_color = (100, 100, 150)
        for i in range(-5, 6):
            for j in range(-3, 4):
                gx = cx + i * spacing
                gy = cy + j * spacing
                if 50 < gx < self.config.width - 50 and 50 < gy < self.config.height - 50:
                    # Small dot for galaxy
                    draw.ellipse([gx-3, gy-3, gx+3, gy+3], fill=galaxy_color)
    
    def _draw_photon_wave(self, draw: ImageDraw.Draw, t: float, scale_factor: float):
        """Draw a photon traveling with stretching wavelength"""
        # Photon travels from left to right
        loop_duration = self.config.duration
        progress = t / loop_duration
        
        # Photon position
        start_x = self.config.width * 0.1
        end_x = self.config.width * 0.9
        photon_x = start_x + progress * (end_x - start_x)
        photon_y = self.config.height * 0.35
        
        # Calculate wavelength based on scale factor
        wl_observed = self.wavelength_rest * scale_factor
        color = wavelength_to_rgb(wl_observed)
        
        # Draw the wave packet
        wave_length = 300  # Visual length of wave packet
        num_points = 100
        amplitude = 30
        
        # Wavelength in pixels (scales with cosmological stretch)
        visual_wavelength = 40 * scale_factor
        
        points = []
        colors = []
        
        for i in range(num_points):
            frac = i / (num_points - 1)
            x = photon_x - wave_length * (1 - frac)
            
            # Sine wave
            phase = (x - photon_x) / visual_wavelength * 2 * math.pi
            y = photon_y + amplitude * math.sin(phase + t * 10)
            
            # Envelope (gaussian-ish)
            envelope = math.exp(-((frac - 0.5) ** 2) * 8)
            y = photon_y + (y - photon_y) * envelope
            
            points.append((x, y))
            colors.append(color)
        
        # Draw wave
        self.renderer.draw_wave_segment(draw, points, colors, thickness=4)
        
        # Draw photon indicator
        self.renderer.draw_glow_circle(draw, int(photon_x), int(photon_y), 8, color, glow_radius=15)
        
        # Wavelength label
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except:
            font = ImageFont.load_default()
        
        draw.text((photon_x - 40, photon_y + 50), 
                 f"λ = {wl_observed:.0f} nm", fill=color, font=font)
    
    def _draw_scale_indicator(self, draw: ImageDraw.Draw, scale_factor: float):
        """Draw scale factor a(t) indicator"""
        try:
            font = ImageFont.truetype("arial.ttf", 24)
            font_large = ImageFont.truetype("arial.ttf", 32)
        except:
            font = ImageFont.load_default()
            font_large = font
        
        # Title
        draw.text((self.config.width // 2 - 200, 30), 
                 "Cosmological Redshift", fill=(255, 255, 255), font=font_large)
        
        # Scale factor display
        box_x = self.config.width - 250
        box_y = 100
        
        draw.rectangle([box_x, box_y, box_x + 200, box_y + 80],
                      outline=(100, 100, 200), width=2)
        
        draw.text((box_x + 20, box_y + 10), "Scale Factor", 
                 fill=(150, 150, 200), font=font)
        draw.text((box_x + 20, box_y + 40), f"a(t) = {scale_factor:.3f}", 
                 fill=(200, 200, 255), font=font_large)
        
        # Equation
        draw.text((50, self.config.height - 80),
                 "λ_obs = λ_emit × a(t)", fill=(150, 150, 200), font=font)
        draw.text((50, self.config.height - 50),
                 "1 + z = a_obs / a_emit", fill=(150, 150, 200), font=font)
    
    def _draw_watermark(self, draw: ImageDraw.Draw, label: str):
        """Draw small watermark label"""
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except:
            font = ImageFont.load_default()
        
        draw.text((20, self.config.height - 40), label, 
                 fill=(180, 180, 180), font=font)
    
    def generate(self) -> List[Image.Image]:
        """Generate all frames"""
        frames = []
        total_frames = int(self.config.fps * self.config.duration)
        
        for i in range(total_frames):
            t = i / self.config.fps
            frame = self.generate_frame(t, i)
            frames.append(frame)
            
            if i % 10 == 0:
                print(f"Cosmological: Frame {i+1}/{total_frames}")
        
        return frames


# ============================================================================
# ANIMATION 3: GRAVITATIONAL REDSHIFT
# ============================================================================

class GravitationalAnimation:
    """
    Gravitational Redshift Animation
    Shows photon losing energy climbing out of a potential well.
    """
    
    def __init__(self, config: AnimationConfig = CONFIG):
        self.config = config
        self.renderer = SpaceRenderer(config.width, config.height)
        
        # Animation parameters
        self.wavelength_rest = 450  # nm (blue)
        self.rs_visual = 150  # Visual Schwarzschild radius
        
    def generate_frame(self, t: float, frame_num: int) -> Image.Image:
        """Generate a single frame"""
        img = Image.new('RGB', (self.config.width, self.config.height), self.config.bg_color)
        draw = ImageDraw.Draw(img)
        
        # Draw starfield
        self.renderer.draw_stars(draw, parallax=0.2)
        
        # Draw potential well
        self._draw_potential_well(draw)
        
        # Draw photon climbing the well
        self._draw_climbing_photon(draw, t)
        
        # Draw labels
        self._draw_labels(draw, t)
        
        # Watermark
        self._draw_watermark(draw, "Gravitational")
        
        return img
    
    def _draw_potential_well(self, draw: ImageDraw.Draw):
        """Draw a 2D representation of gravitational potential U(r)"""
        cx = self.config.width // 2
        base_y = self.config.height * 0.75
        
        # Draw the well curve
        well_width = self.config.width * 0.7
        well_depth = self.config.height * 0.4
        
        points = []
        num_points = 200
        
        for i in range(num_points):
            x = cx - well_width/2 + (i / (num_points - 1)) * well_width
            
            # Distance from center
            r = abs(x - cx) + 50  # Minimum radius
            
            # Potential: U(r) = -GM/r (scaled for visualization)
            # y increases downward for visual "well"
            potential = -well_depth * 100 / r
            y = base_y + potential
            
            # Clamp
            y = max(self.config.height * 0.2, min(base_y, y))
            
            points.append((x, y))
        
        # Draw the well as a gradient-filled polygon
        # First, draw filled region
        well_points = points + [(points[-1][0], base_y), (points[0][0], base_y)]
        
        # Draw gradient lines to simulate depth
        for i in range(0, len(points) - 1, 3):
            x1, y1 = points[i]
            x2, y2 = points[min(i+3, len(points)-1)]
            
            # Color gradient: deeper = more purple/dark
            depth = (base_y - min(y1, y2)) / well_depth
            r = int(50 + 30 * (1 - depth))
            g = int(20)
            b = int(80 + 50 * (1 - depth))
            
            draw.line([(x1, y1), (x2, y2)], fill=(r, g, b), width=3)
        
        # Draw outline
        for i in range(len(points) - 1):
            draw.line([points[i], points[i+1]], fill=(100, 60, 150), width=2)
        
        # Draw the "mass" at center (stylized black hole / star)
        mass_x = cx
        mass_y = base_y - 30
        
        # Glow effect
        for r in range(40, 5, -5):
            alpha = int(50 * r / 40)
            color = (80, 40, 120)
            draw.ellipse([mass_x-r, mass_y-r, mass_x+r, mass_y+r], 
                        outline=color, width=2)
        
        # Core
        draw.ellipse([mass_x-15, mass_y-15, mass_x+15, mass_y+15],
                    fill=(20, 10, 40), outline=(150, 100, 200), width=2)
        
        # Label
        try:
            font = ImageFont.truetype("arial.ttf", 18)
        except:
            font = ImageFont.load_default()
        
        draw.text((mass_x - 10, mass_y + 25), "M", fill=(150, 100, 200), font=font)
    
    def _draw_climbing_photon(self, draw: ImageDraw.Draw, t: float):
        """Draw a photon climbing out of the well with changing wavelength"""
        cx = self.config.width // 2
        base_y = self.config.height * 0.75
        well_depth = self.config.height * 0.4
        
        # Photon path: from near mass to far away
        loop_duration = self.config.duration
        progress = (t / loop_duration) % 1.0
        
        # Smooth loop: photon goes from bottom to top, then resets
        # Using easing for natural motion
        eased_progress = 1 - (1 - progress) ** 2  # Ease out
        
        # Calculate photon position along the well
        # Start near center, move to the right
        r_min = 80
        r_max = self.config.width * 0.35
        r = r_min + eased_progress * (r_max - r_min)
        
        # Position on the well curve
        photon_x = cx + r
        potential = -well_depth * 100 / r
        photon_y = base_y + potential - 20  # Slightly above the curve
        
        # Calculate gravitational redshift
        # Using simplified formula: z = rs/(2r) for weak field
        rs = 60  # Visual Schwarzschild radius
        if r > rs:
            z = rs / (2 * r)
            wavelength = self.wavelength_rest * (1 + z)
        else:
            wavelength = self.wavelength_rest
        
        color = wavelength_to_rgb(wavelength)
        
        # Draw wave packet
        wave_length = 150
        num_points = 60
        amplitude = 15
        
        # Visual wavelength increases as photon climbs
        visual_wl = 25 * (1 + z * 2)  # Exaggerated for visibility
        
        points = []
        colors = []
        
        # Wave travels upward (toward observer at infinity)
        direction_x = 0.8
        direction_y = -0.6
        
        for i in range(num_points):
            frac = i / (num_points - 1)
            
            # Position along wave packet
            offset = wave_length * (frac - 0.5)
            wx = photon_x + direction_x * offset
            wy = photon_y + direction_y * offset
            
            # Perpendicular for oscillation
            perp_x = -direction_y
            perp_y = direction_x
            
            # Sine wave
            phase = offset / visual_wl * 2 * math.pi + t * 15
            osc = amplitude * math.sin(phase)
            
            # Envelope
            envelope = math.exp(-((frac - 0.5) ** 2) * 10)
            osc *= envelope
            
            wx += perp_x * osc
            wy += perp_y * osc
            
            points.append((wx, wy))
            colors.append(color)
        
        # Draw wave
        self.renderer.draw_wave_segment(draw, points, colors, thickness=3)
        
        # Draw photon head
        head_x = photon_x + direction_x * wave_length * 0.4
        head_y = photon_y + direction_y * wave_length * 0.4
        self.renderer.draw_glow_circle(draw, int(head_x), int(head_y), 6, color, glow_radius=12)
        
        # Wavelength label following photon
        try:
            font = ImageFont.truetype("arial.ttf", 18)
        except:
            font = ImageFont.load_default()
        
        draw.text((head_x + 20, head_y - 30),
                 f"λ = {wavelength:.0f} nm", fill=color, font=font)
        draw.text((head_x + 20, head_y - 10),
                 f"z = {z:.4f}", fill=(200, 200, 200), font=font)
    
    def _draw_labels(self, draw: ImageDraw.Draw, t: float):
        """Draw informative labels"""
        try:
            font = ImageFont.truetype("arial.ttf", 24)
            font_large = ImageFont.truetype("arial.ttf", 32)
            font_small = ImageFont.truetype("arial.ttf", 18)
        except:
            font = font_large = font_small = ImageFont.load_default()
        
        # Title
        draw.text((self.config.width // 2 - 200, 30), 
                 "Gravitational Redshift", fill=(255, 255, 255), font=font_large)
        
        # Subtitle
        draw.text((self.config.width // 2 - 250, 70),
                 "Photon loses energy climbing out of potential well",
                 fill=(180, 180, 200), font=font_small)
        
        # U(r) label
        draw.text((100, self.config.height * 0.4),
                 "U(r) = -GM/r", fill=(150, 100, 200), font=font)
        
        # Equation
        draw.text((50, self.config.height - 80),
                 "Δλ/λ ≈ GM/(rc²) = Φ/c²", fill=(150, 150, 200), font=font_small)
        draw.text((50, self.config.height - 50),
                 "z = 1/√(1 - rₛ/r) - 1", fill=(150, 150, 200), font=font_small)
    
    def _draw_watermark(self, draw: ImageDraw.Draw, label: str):
        """Draw small watermark label"""
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except:
            font = ImageFont.load_default()
        
        draw.text((20, self.config.height - 40), label, 
                 fill=(180, 180, 180), font=font)
    
    def generate(self) -> List[Image.Image]:
        """Generate all frames"""
        frames = []
        total_frames = int(self.config.fps * self.config.duration)
        
        for i in range(total_frames):
            t = i / self.config.fps
            frame = self.generate_frame(t, i)
            frames.append(frame)
            
            if i % 10 == 0:
                print(f"Gravitational: Frame {i+1}/{total_frames}")
        
        return frames


# ============================================================================
# EXPORT UTILITIES
# ============================================================================

def save_gif(frames: List[Image.Image], filename: str, fps: int = 30):
    """Save frames as a GIF"""
    if not IMAGEIO_AVAILABLE:
        print(f"Cannot save GIF: imageio not available")
        return False
    
    output_path = Path(CONFIG.output_dir) / filename
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Convert PIL images to numpy arrays
    frame_arrays = [np.array(frame) for frame in frames]
    
    # Calculate frame duration in milliseconds
    duration = 1000 / fps
    
    try:
        iio.imwrite(str(output_path), frame_arrays, 
                   duration=duration, loop=0)
        print(f"[OK] Saved: {output_path}")
        return True
    except Exception as e:
        print(f"Error saving GIF: {e}")
        return False


def save_frames(frames: List[Image.Image], prefix: str):
    """Save individual frames as PNG"""
    output_dir = Path(CONFIG.output_dir) / f"{prefix}_frames"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    for i, frame in enumerate(frames):
        path = output_dir / f"{prefix}_{i:04d}.png"
        frame.save(str(path), "PNG")
    
    print(f"[OK] Saved {len(frames)} frames to: {output_dir}")


# ============================================================================
# MAIN GENERATOR
# ============================================================================

def generate_all_animations(save_png_frames: bool = False):
    """Generate all three animations"""
    
    print("=" * 60)
    print("REDSHIFT PHYSICS ANIMATIONS - GIF GENERATOR")
    print("=" * 60)
    
    if not PIL_AVAILABLE:
        print("ERROR: PIL/Pillow is required. Install with: pip install pillow")
        return
    
    # Ensure output directory exists
    Path(CONFIG.output_dir).mkdir(parents=True, exist_ok=True)
    
    # Animation 1: Doppler
    print("\n[1/3] Generating Doppler Redshift animation...")
    doppler = DopplerAnimation()
    doppler_frames = doppler.generate()
    save_gif(doppler_frames, "doppler.gif", CONFIG.fps)
    if save_png_frames:
        save_frames(doppler_frames, "doppler")
    
    # Animation 2: Cosmological
    print("\n[2/3] Generating Cosmological Redshift animation...")
    cosmo = CosmologicalAnimation()
    cosmo_frames = cosmo.generate()
    save_gif(cosmo_frames, "cosmological.gif", CONFIG.fps)
    if save_png_frames:
        save_frames(cosmo_frames, "cosmological")
    
    # Animation 3: Gravitational
    print("\n[3/3] Generating Gravitational Redshift animation...")
    grav = GravitationalAnimation()
    grav_frames = grav.generate()
    save_gif(grav_frames, "gravitational.gif", CONFIG.fps)
    if save_png_frames:
        save_frames(grav_frames, "gravitational")
    
    print("\n" + "=" * 60)
    print("COMPLETE! Output saved to:", Path(CONFIG.output_dir).absolute())
    print("=" * 60)


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate redshift physics animations")
    parser.add_argument("--width", type=int, default=1920, help="Output width (default: 1920)")
    parser.add_argument("--height", type=int, default=1080, help="Output height (default: 1080)")
    parser.add_argument("--fps", type=int, default=30, help="Frames per second (default: 30)")
    parser.add_argument("--duration", type=float, default=5.0, help="Loop duration in seconds (default: 5.0)")
    parser.add_argument("--output", type=str, default="output", help="Output directory")
    parser.add_argument("--save-frames", action="store_true", help="Also save PNG frames")
    parser.add_argument("--animation", type=str, choices=["all", "doppler", "cosmological", "gravitational"],
                       default="all", help="Which animation to generate")
    
    args = parser.parse_args()
    
    # Update config
    CONFIG.width = args.width
    CONFIG.height = args.height
    CONFIG.fps = args.fps
    CONFIG.duration = args.duration
    CONFIG.output_dir = args.output
    
    if args.animation == "all":
        generate_all_animations(save_png_frames=args.save_frames)
    else:
        print(f"Generating {args.animation} animation...")
        
        if args.animation == "doppler":
            anim = DopplerAnimation()
        elif args.animation == "cosmological":
            anim = CosmologicalAnimation()
        else:
            anim = GravitationalAnimation()
        
        frames = anim.generate()
        save_gif(frames, f"{args.animation}.gif", CONFIG.fps)
        if args.save_frames:
            save_frames(frames, args.animation)

