import pygame
import numpy as np
import math
from typing import List, Optional, Tuple
from collections import deque
from enum import Enum

# CARTOON PHYSICS CONSTANTS
H_ALPHA_REST = 656.0  # nm (H-alpha emission line)
C_REAL = 299792.458  # km/s (real speed of light)

# Display constants
SCREEN_WIDTH = 1400
SCREEN_HEIGHT = 900
FPS = 60

# Sci-Fi Dark Theme Colors
BG_DARK = (15, 15, 25)
BG_PANEL = (25, 25, 40)
BG_CONTROL = (35, 35, 50)
NEON_CYAN = (0, 255, 255)
NEON_MAGENTA = (255, 0, 255)
NEON_GREEN = (0, 255, 100)
NEON_ORANGE = (255, 128, 0)
NEON_BLUE = (64, 156, 255)
NEON_YELLOW = (255, 255, 0)
NEON_PINK = (255, 100, 180)
TEXT_PRIMARY = (220, 220, 240)
TEXT_SECONDARY = (150, 150, 180)
GRID_COLOR = (40, 40, 60)
GRID_BRIGHT = (80, 80, 120)
WHITE = (255, 255, 255)
BUTTON_GREEN = (0, 180, 100)
BUTTON_RED = (220, 50, 50)
BUTTON_BLUE = (50, 120, 220)
BUTTON_PURPLE = (150, 50, 200)


class SimulationMode(Enum):
    """Simulation physics modes."""
    COSMOLOGICAL = 1  # Only expansion, no peculiar velocity
    DOPPLER = 2  # Only Doppler, no expansion
    MIXED = 3  # Both effects combined


def wavelength_to_rgb(wavelength_nm):
    """Convert wavelength in nanometers to RGB color."""
    if wavelength_nm < 380:
        wavelength_nm = 380
    elif wavelength_nm > 750:
        wavelength_nm = 750

    if wavelength_nm < 450:
        hue = 240 + (450 - wavelength_nm) / (450 - 380) * 30
    elif wavelength_nm < 495:
        hue = 180 + (495 - wavelength_nm) / (495 - 450) * 60
    elif wavelength_nm < 570:
        hue = 60 + (570 - wavelength_nm) / (570 - 495) * 120
    elif wavelength_nm < 590:
        hue = 30 + (590 - wavelength_nm) / (590 - 570) * 30
    else:
        hue = (750 - wavelength_nm) / (750 - 590) * 30

    hue = max(0, min(360, hue))

    h = hue / 60.0
    c = 1.0
    x = c * (1 - abs(h % 2 - 1))

    if h < 1:
        r, g, b = c, x, 0
    elif h < 2:
        r, g, b = x, c, 0
    elif h < 3:
        r, g, b = 0, c, x
    elif h < 4:
        r, g, b = 0, x, c
    elif h < 5:
        r, g, b = x, 0, c
    else:
        r, g, b = c, 0, x

    return (int(r * 255), int(g * 255), int(b * 255))


def lerp(start, end, t):
    """Linear interpolation."""
    return start + (end - start) * t


def gaussian(x, mu, sigma, amplitude=1.0):
    """Calculate Gaussian function."""
    return amplitude * np.exp(-0.5 * ((x - mu) / sigma) ** 2)


class Slider:
    """Interactive slider widget."""

    def __init__(self, x, y, width, height, min_val, max_val, initial_val, label):
        self.rect = pygame.Rect(x, y, width, height)
        self.min_val = min_val
        self.max_val = max_val
        self.value = initial_val
        self.label = label
        self.dragging = False
        self.handle_radius = 12

    def handle_event(self, event):
        """Handle mouse events."""
        if event.type == pygame.MOUSEBUTTONDOWN:
            mouse_pos = event.pos
            handle_x = self.rect.x + (self.value - self.min_val) / (self.max_val - self.min_val) * self.rect.width
            handle_y = self.rect.centery
            dist = math.sqrt((mouse_pos[0] - handle_x) ** 2 + (mouse_pos[1] - handle_y) ** 2)
            if dist <= self.handle_radius:
                self.dragging = True

        elif event.type == pygame.MOUSEBUTTONUP:
            self.dragging = False

        elif event.type == pygame.MOUSEMOTION:
            if self.dragging:
                mouse_x = event.pos[0]
                t = (mouse_x - self.rect.x) / self.rect.width
                t = max(0, min(1, t))
                self.value = self.min_val + t * (self.max_val - self.min_val)

    def draw(self, screen, font):
        """Draw the slider."""
        pygame.draw.rect(screen, BG_CONTROL, self.rect, border_radius=4)
        pygame.draw.rect(screen, NEON_CYAN, self.rect, 2, border_radius=4)

        fill_width = (self.value - self.min_val) / (self.max_val - self.min_val) * self.rect.width
        fill_rect = pygame.Rect(self.rect.x, self.rect.y, fill_width, self.rect.height)
        pygame.draw.rect(screen, (0, 100, 120), fill_rect, border_radius=4)

        handle_x = self.rect.x + fill_width
        handle_y = self.rect.centery
        pygame.draw.circle(screen, NEON_CYAN, (int(handle_x), handle_y), self.handle_radius)
        pygame.draw.circle(screen, WHITE, (int(handle_x), handle_y), self.handle_radius - 3)

        label_text = font.render(self.label, True, TEXT_PRIMARY)
        screen.blit(label_text, (self.rect.x, self.rect.y - 25))

        value_text = font.render(f"{self.value:.0f}", True, TEXT_SECONDARY)
        screen.blit(value_text, (self.rect.x, self.rect.y + self.rect.height + 5))

    def get_value(self):
        return self.value


class Button:
    """Interactive button widget."""

    def __init__(self, x, y, width, height, label, color):
        self.rect = pygame.Rect(x, y, width, height)
        self.label = label
        self.color = color
        self.hover = False
        self.active = False

    def handle_event(self, event):
        """Handle mouse events. Returns True if clicked."""
        if event.type == pygame.MOUSEMOTION:
            self.hover = self.rect.collidepoint(event.pos)

        elif event.type == pygame.MOUSEBUTTONDOWN:
            if self.rect.collidepoint(event.pos):
                return True
        return False

    def draw(self, screen, font):
        """Draw the button."""
        if self.active:
            color = tuple(min(255, c + 60) for c in self.color)
        elif self.hover:
            color = tuple(min(255, c + 30) for c in self.color)
        else:
            color = self.color

        pygame.draw.rect(screen, color, self.rect, border_radius=8)

        border_color = WHITE if self.active else NEON_CYAN
        border_width = 3 if self.active else 2
        pygame.draw.rect(screen, border_color, self.rect, border_width, border_radius=8)

        label_text = font.render(self.label, True, WHITE)
        text_rect = label_text.get_rect(center=self.rect.center)
        screen.blit(label_text, text_rect)


class WavePeak:
    """Individual wave peak in a wave train."""

    def __init__(self, x, y, wavelength_emit, scale_factor_emit, time_emit):
        self.x = x
        self.y = y
        self.wavelength_emit = wavelength_emit
        self.wavelength_current = wavelength_emit
        self.scale_factor_emit = scale_factor_emit
        self.scale_factor_prev = scale_factor_emit
        self.time_emit = time_emit
        self.active = True

    def update(self, dt, scale_factor, c_sim, mode, observer_pos=(0, 0)):
        """Update wave peak position and wavelength."""
        # Move toward observer at observer_pos (default 0, 0)
        obs_x, obs_y = observer_pos
        dx_to_obs = obs_x - self.x
        dy_to_obs = obs_y - self.y
        distance = math.sqrt(dx_to_obs**2 + dy_to_obs**2)

        if distance > 0:
            # Normalize direction vector
            dx = dx_to_obs / distance
            dy = dy_to_obs / distance
            self.x += dx * c_sim * dt
            self.y += dy * c_sim * dt

        # Apply cosmological redshift only in appropriate modes
        if mode in [SimulationMode.COSMOLOGICAL, SimulationMode.MIXED]:
            if self.scale_factor_prev > 0:
                self.wavelength_current *= (scale_factor / self.scale_factor_prev)
            self.scale_factor_prev = scale_factor

        # Check if reached observer
        if math.sqrt((self.x - obs_x)**2 + (self.y - obs_y)**2) < 10:
            self.active = False


class Universe:
    """Manages the expanding universe and scale factor."""

    def __init__(self, H0=70.0):
        self.scale_factor = 1.0
        self.H0 = H0
        self.time = 0.0
        self.H0_sim = H0 / 100.0

    def set_H0(self, H0):
        """Set Hubble parameter."""
        self.H0 = H0
        self.H0_sim = H0 / 100.0

    def update(self, dt, mode, simulation_started):
        """Update scale factor based on mode."""
        # Only update if simulation has started (wave train exists)
        if simulation_started:
            if mode in [SimulationMode.COSMOLOGICAL, SimulationMode.MIXED]:
                self.scale_factor += self.H0_sim * dt
            # In DOPPLER mode, scale_factor stays at 1.0
            self.time += dt

    def get_scale_factor(self):
        return self.scale_factor

    def reset(self):
        """Reset universe to initial state."""
        self.scale_factor = 1.0
        self.time = 0.0


class Source:
    """Galaxy with 2D position and velocity."""

    def __init__(self, comoving_x, comoving_y=0.0):
        self.initial_comoving_x = comoving_x
        self.initial_comoving_y = comoving_y
        self.comoving_x = comoving_x
        self.comoving_y = comoving_y
        self.v_radial = 0.0
        self.v_transverse = 0.0
        self.start_time = 0.0

    def get_physical_position(self, scale_factor, time, mode):
        """Calculate 2D physical position based on mode."""
        # Expansion component
        x_expansion = self.comoving_x * scale_factor
        y_expansion = self.comoving_y * scale_factor

        # Peculiar velocity only in appropriate modes
        if mode in [SimulationMode.DOPPLER, SimulationMode.MIXED]:
            distance = math.sqrt(x_expansion**2 + y_expansion**2)
            if distance > 0:
                radial_x = x_expansion / distance
                radial_y = y_expansion / distance
                transverse_x = -radial_y
                transverse_y = radial_x
            else:
                radial_x, radial_y = 1, 0
                transverse_x, transverse_y = 0, 1

            t = time - self.start_time
            velocity_scale = 0.1
            x_peculiar = (self.v_radial * radial_x + self.v_transverse * transverse_x) * velocity_scale * t
            y_peculiar = (self.v_radial * radial_y + self.v_transverse * transverse_y) * velocity_scale * t

            return x_expansion + x_peculiar, y_expansion + y_peculiar
        else:
            # COSMOLOGICAL mode: no peculiar motion
            return x_expansion, y_expansion

    def get_effective_velocity(self, scale_factor, time, mode):
        """Calculate effective radial velocity for Doppler shift."""
        if mode == SimulationMode.COSMOLOGICAL:
            return 0.0  # No Doppler in cosmological-only mode

        x, y = self.get_physical_position(scale_factor, time, mode)
        distance = math.sqrt(x**2 + y**2)

        if distance > 0:
            toward_x = -x / distance
            toward_y = -y / distance

            radial_x = x / distance
            radial_y = y / distance
            transverse_x = -radial_y
            transverse_y = radial_x

            vx = self.v_radial * radial_x + self.v_transverse * transverse_x
            vy = self.v_radial * radial_y + self.v_transverse * transverse_y

            v_effective = -(vx * toward_x + vy * toward_y)
            return v_effective
        return 0.0

    def set_velocities(self, v_radial, v_transverse):
        """Set radial and transverse velocities."""
        self.v_radial = v_radial
        self.v_transverse = v_transverse

    def set_distance(self, distance):
        """Set initial comoving distance."""
        self.comoving_x = distance
        self.initial_comoving_x = distance


class WaveTrain:
    """Continuous wave train emitter."""

    def __init__(self, source, universe, wavelength_rest, emission_duration, mode):
        self.source = source
        self.wavelength_rest = wavelength_rest
        self.emission_duration = emission_duration
        self.emission_start_time = universe.time
        self.emitting = True
        self.peaks: List[WavePeak] = []
        self.peak_interval = 0.1  # Emit peaks more frequently for denser wave
        self.last_emission_time = universe.time
        self.mode = mode

    def update(self, dt, universe, c_sim, observer_pos=(0, 0)):
        """Update wave train."""
        if self.emitting:
            if universe.time - self.emission_start_time >= self.emission_duration:
                self.emitting = False
            elif universe.time - self.last_emission_time >= self.peak_interval:
                self.emit_peak(universe)
                self.last_emission_time = universe.time

        scale = universe.get_scale_factor()
        for peak in self.peaks:
            if peak.active:
                peak.update(dt, scale, c_sim, self.mode, observer_pos)

    def emit_peak(self, universe):
        """Emit a new wave peak."""
        scale = universe.get_scale_factor()
        x, y = self.source.get_physical_position(scale, universe.time, self.mode)

        # Apply Doppler shift only in appropriate modes
        v_effective = self.source.get_effective_velocity(scale, universe.time, self.mode)

        # Use relativistic Doppler formula for accuracy
        # λ_obs = λ_rest * sqrt((1 + β) / (1 - β)) for motion away
        # where β = v/c (negative for approaching)
        beta = v_effective / C_REAL

        # Clamp beta to avoid singularity
        beta = max(-0.99, min(0.99, beta))

        # Relativistic Doppler
        wavelength_emit = self.wavelength_rest * math.sqrt((1 + beta) / (1 - beta))

        peak = WavePeak(x, y, wavelength_emit, scale, universe.time)
        self.peaks.append(peak)

    def get_first_peak(self):
        """Get the first emitted peak (for tracking)."""
        if self.peaks:
            return self.peaks[0]
        return None

    def is_finished(self):
        """Check if all peaks have reached observer."""
        return not self.emitting and all(not p.active for p in self.peaks)


class Camera:
    """Dynamic auto-scaling camera with smooth interpolation."""

    def __init__(self, view_width, view_height):
        self.view_width = view_width
        self.view_height = view_height

        # Camera state
        self.center_x = 0.0
        self.center_y = 0.0
        self.zoom = 1.0

        # Target state (for lerping)
        self.target_center_x = 0.0
        self.target_center_y = 0.0
        self.target_zoom = 1.0

        # Lerp speeds
        self.pan_speed = 0.08
        self.zoom_speed = 0.05

        # Padding
        self.padding = 100

        # Max world size (prevent infinite zoom out)
        self.max_world_size = 2000

    def update(self, key_objects: List[Tuple[float, float]], priority_objects: List[Tuple[float, float]] = None):
        """
        Update camera based on bounding box of key objects.

        Args:
            key_objects: List of (x, y) world coordinates (all objects)
            priority_objects: List of (x, y) that MUST always be visible (observer + galaxy)
        """
        if not key_objects:
            return

        # Use priority objects (observer + galaxy) for framing if provided
        objects_for_framing = priority_objects if priority_objects else key_objects

        # Calculate bounding box from priority objects only
        xs = [obj[0] for obj in objects_for_framing]
        ys = [obj[1] for obj in objects_for_framing]

        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)

        # Calculate center (midpoint)
        self.target_center_x = (min_x + max_x) / 2
        self.target_center_y = (min_y + max_y) / 2

        # Calculate required dimensions with padding
        width = max_x - min_x + 2 * self.padding
        height = max_y - min_y + 2 * self.padding

        # Clamp to max world size (prevent infinite zoom out in cosmological mode)
        width = min(width, self.max_world_size)
        height = min(height, self.max_world_size)

        # Calculate zoom to fit everything
        if width > 0 and height > 0:
            zoom_x = self.view_width / width
            zoom_y = self.view_height / height
            self.target_zoom = min(zoom_x, zoom_y)
        else:
            self.target_zoom = 1.0

        # Clamp zoom
        self.target_zoom = max(0.05, min(3.0, self.target_zoom))

        # Smooth lerp to targets
        self.center_x = lerp(self.center_x, self.target_center_x, self.pan_speed)
        self.center_y = lerp(self.center_y, self.target_center_y, self.pan_speed)
        self.zoom = lerp(self.zoom, self.target_zoom, self.zoom_speed)

    def apply(self, world_pos: Tuple[float, float], screen_center: Tuple[float, float]) -> Tuple[float, float]:
        """
        Transform world coordinates to screen coordinates.

        Args:
            world_pos: (x, y) in world space
            screen_center: (cx, cy) center of viewport on screen

        Returns:
            (sx, sy) screen coordinates
        """
        world_x, world_y = world_pos
        cx, cy = screen_center

        # Translate to camera center, apply zoom, translate to screen center
        screen_x = (world_x - self.center_x) * self.zoom + cx
        screen_y = (world_y - self.center_y) * self.zoom + cy

        return screen_x, screen_y


class Display:
    """Handles all visualization."""

    def __init__(self, width, height):
        pygame.init()
        self.width = width
        self.height = height
        self.screen = pygame.display.set_mode((width, height))
        pygame.display.set_caption("Redshift Simulation - NASA Style Wave Rendering")

        try:
            self.font_large = pygame.font.SysFont('segoeui', 24)
            self.font_medium = pygame.font.SysFont('segoeui', 20)
            self.font_small = pygame.font.SysFont('segoeui', 16)
        except:
            self.font_large = pygame.font.Font(None, 28)
            self.font_medium = pygame.font.Font(None, 24)
            self.font_small = pygame.font.Font(None, 20)

        # Layout
        self.viz_width = int(width * 0.70)
        self.panel_width = width - self.viz_width

        self.spacetime_rect = pygame.Rect(0, 0, self.viz_width, height // 2)
        self.graph_rect = pygame.Rect(0, height // 2, self.viz_width, height // 2)
        self.panel_rect = pygame.Rect(self.viz_width, 0, self.panel_width, height)

        # Camera
        self.camera = Camera(self.viz_width - 100, self.spacetime_rect.height - 100)

        # Wavelength history
        self.wavelength_history = deque(maxlen=1000)

        # Camera bounds (prevent infinite zoom out)
        self.camera.max_world_size = 3000

    def draw(self, universe, source, wave_train, controls, paused, c_sim, mode):
        """Main draw function."""
        self.screen.fill(BG_DARK)

        # Collect objects for camera
        # Priority objects (MUST be visible): observer and galaxy
        priority_objects = [(0, 0)]  # Observer
        x, y = source.get_physical_position(universe.get_scale_factor(), universe.time, mode)
        priority_objects.append((x, y))  # Galaxy

        # All objects (for awareness)
        key_objects = priority_objects.copy()
        if wave_train:
            for peak in wave_train.peaks:
                if peak.active:
                    key_objects.append((peak.x, peak.y))

        # Camera frames based on priority objects only (observer + galaxy)
        self.camera.update(key_objects, priority_objects)

        # Draw views
        self.draw_spacetime_view(universe, source, wave_train, paused, c_sim, mode)
        self.draw_wavelength_graph(universe, wave_train)
        self.draw_control_panel(universe, source, wave_train, controls, paused, mode)

        pygame.display.flip()

    def draw_spacetime_view(self, universe, source, wave_train, paused, c_sim, mode):
        """Draw 2D spacetime view with continuous sine waves."""
        rect = self.spacetime_rect
        pygame.draw.rect(self.screen, BG_DARK, rect)

        # Mode indicator
        mode_name = {
            SimulationMode.COSMOLOGICAL: "COSMOLOGICAL ONLY",
            SimulationMode.DOPPLER: "DOPPLER ONLY",
            SimulationMode.MIXED: "MIXED MODE"
        }[mode]

        mode_color = {
            SimulationMode.COSMOLOGICAL: NEON_MAGENTA,
            SimulationMode.DOPPLER: NEON_ORANGE,
            SimulationMode.MIXED: NEON_CYAN
        }[mode]

        title = self.font_large.render(f"Wave Propagation - {mode_name}", True, TEXT_PRIMARY)
        self.screen.blit(title, (rect.x + 15, rect.y + 10))

        if paused:
            pause_text = self.font_large.render("PAUSED", True, NEON_YELLOW)
            self.screen.blit(pause_text, (rect.x + rect.width - 150, rect.y + 10))

        center_x = rect.centerx
        center_y = rect.centery

        # Draw grid
        self.draw_2d_grid(rect, center_x, center_y, universe.get_scale_factor(), mode)

        # Draw observer
        obs_screen = self.camera.apply((0, 0), (center_x, center_y))
        self.draw_observer(obs_screen, rect)

        # Draw galaxy
        scale = universe.get_scale_factor()
        gx, gy = source.get_physical_position(scale, universe.time, mode)
        g_screen = self.camera.apply((gx, gy), (center_x, center_y))
        self.draw_galaxy(g_screen, source, gx, gy, rect, center_x, center_y, mode)

        # Draw continuous sine waves (NASA style)
        if wave_train:
            self.draw_continuous_wave(wave_train, rect, center_x, center_y)

        # Info
        info_y = rect.top + 45
        scale_text = self.font_medium.render(f"Scale: a(t) = {scale:.3f}", True, mode_color)
        self.screen.blit(scale_text, (rect.x + 15, info_y))

        zoom_text = self.font_small.render(f"Zoom: {self.camera.zoom:.2f}x", True, TEXT_SECONDARY)
        self.screen.blit(zoom_text, (rect.x + 15, info_y + 25))

        time_text = self.font_small.render(f"Time: {universe.time:.1f}s", True, TEXT_SECONDARY)
        self.screen.blit(time_text, (rect.x + 15, info_y + 45))

    def draw_observer(self, screen_pos, rect):
        """Draw observer icon."""
        sx, sy = screen_pos
        if rect.left < sx < rect.right and rect.top < sy < rect.bottom:
            pygame.draw.circle(self.screen, NEON_GREEN, (int(sx), int(sy)), 15)
            pygame.draw.circle(self.screen, BG_DARK, (int(sx), int(sy)), 10)
            pygame.draw.circle(self.screen, NEON_GREEN, (int(sx), int(sy)), 6)
            label = self.font_small.render("Observer", True, NEON_GREEN)
            self.screen.blit(label, (int(sx) - 30, int(sy) + 20))

    def draw_galaxy(self, screen_pos, source, world_x, world_y, rect, center_x, center_y, mode):
        """Draw galaxy with velocity vector."""
        sx, sy = screen_pos
        if rect.left < sx < rect.right and rect.top < sy < rect.bottom:
            pygame.draw.circle(self.screen, NEON_BLUE, (int(sx), int(sy)), 18)
            pygame.draw.circle(self.screen, (100, 150, 255), (int(sx), int(sy)), 12)
            pygame.draw.circle(self.screen, WHITE, (int(sx), int(sy)), 6)

            # Velocity vector (only in modes where it matters)
            if mode in [SimulationMode.DOPPLER, SimulationMode.MIXED]:
                if abs(source.v_radial) > 0.1 or abs(source.v_transverse) > 0.1:
                    distance = math.sqrt(world_x**2 + world_y**2)
                    if distance > 0:
                        radial_x = world_x / distance
                        radial_y = world_y / distance
                        transverse_x = -radial_y
                        transverse_y = radial_x
                    else:
                        radial_x, radial_y = 1, 0
                        transverse_x, transverse_y = 0, 1

                    vx = source.v_radial * radial_x + source.v_transverse * transverse_x
                    vy = source.v_radial * radial_y + source.v_transverse * transverse_y
                    v_mag = math.sqrt(vx**2 + vy**2)

                    if v_mag > 0:
                        arrow_length = 60
                        arrow_end_x = world_x + (vx / v_mag) * arrow_length / self.camera.zoom
                        arrow_end_y = world_y + (vy / v_mag) * arrow_length / self.camera.zoom
                        end_screen = self.camera.apply((arrow_end_x, arrow_end_y), (center_x, center_y))

                        pygame.draw.line(self.screen, NEON_ORANGE,
                                       (int(sx), int(sy)), (int(end_screen[0]), int(end_screen[1])), 4)

                        angle = math.atan2(end_screen[1] - sy, end_screen[0] - sx)
                        arrow_size = 10
                        p1 = end_screen
                        p2 = (end_screen[0] - arrow_size * math.cos(angle - math.pi/6),
                              end_screen[1] - arrow_size * math.sin(angle - math.pi/6))
                        p3 = (end_screen[0] - arrow_size * math.cos(angle + math.pi/6),
                              end_screen[1] - arrow_size * math.sin(angle + math.pi/6))
                        pygame.draw.polygon(self.screen, NEON_ORANGE, [p1, p2, p3])

            label = self.font_small.render("Galaxy", True, NEON_BLUE)
            self.screen.blit(label, (int(sx) - 25, int(sy) + 25))

    def draw_continuous_wave(self, wave_train, rect, center_x, center_y):
        """
        Draw continuous sine wave interpolating between peaks (NASA style).
        Color gradient based on local wavelength.
        """
        active_peaks = [p for p in wave_train.peaks if p.active]

        if len(active_peaks) < 2:
            # Draw individual peaks as points if < 2
            for peak in active_peaks:
                screen_pos = self.camera.apply((peak.x, peak.y), (center_x, center_y))
                if rect.left < screen_pos[0] < rect.right and rect.top < screen_pos[1] < rect.bottom:
                    color = wavelength_to_rgb(peak.wavelength_current)
                    pygame.draw.circle(self.screen, color, (int(screen_pos[0]), int(screen_pos[1])), 8)
            return

        # Draw continuous sine wave between peaks
        for i in range(len(active_peaks) - 1):
            peak_a = active_peaks[i]
            peak_b = active_peaks[i + 1]

            # Calculate physical distance between peaks (spatial wavelength)
            spatial_dist = math.sqrt((peak_b.x - peak_a.x)**2 + (peak_b.y - peak_a.y)**2)

            # Average wavelength for this segment (in nm)
            avg_wavelength = (peak_a.wavelength_current + peak_b.wavelength_current) / 2

            # Number of oscillations based on physical wavelength
            # More redshift = longer wavelength = fewer oscillations in same distance
            # Base oscillations on the ratio: distance / wavelength
            # Normalize so rest wavelength (656nm) gives ~3 cycles
            base_cycles = 3.0
            wavelength_ratio = H_ALPHA_REST / avg_wavelength
            num_oscillations = base_cycles * wavelength_ratio

            # Clamp for visibility
            num_oscillations = max(1.5, min(6.0, num_oscillations))

            num_segments = 60  # More segments for smooth curves
            points = []
            colors = []

            for j in range(num_segments + 1):
                t = j / num_segments

                # Interpolate wavelength for dynamic color
                wavelength = peak_a.wavelength_current + t * (peak_b.wavelength_current - peak_a.wavelength_current)
                color = wavelength_to_rgb(wavelength)
                colors.append(color)

                # Linear interpolation of position
                world_x = peak_a.x + t * (peak_b.x - peak_a.x)
                world_y = peak_a.y + t * (peak_b.y - peak_a.y)

                # Add sine wave oscillation perpendicular to direction
                dx = peak_b.x - peak_a.x
                dy = peak_b.y - peak_a.y
                length = math.sqrt(dx**2 + dy**2)

                if length > 0:
                    # Perpendicular vector
                    perp_x = -dy / length
                    perp_y = dx / length

                    # Sine oscillation based on wavelength
                    amplitude = 30  # Larger amplitude for visibility
                    oscillation = amplitude * math.sin(num_oscillations * 2 * math.pi * t)

                    world_x += perp_x * oscillation
                    world_y += perp_y * oscillation

                # Transform to screen
                screen_pos = self.camera.apply((world_x, world_y), (center_x, center_y))
                points.append((int(screen_pos[0]), int(screen_pos[1])))

            # Draw the wave segment - use lines() for better performance
            if len(points) > 1:
                # Filter points that are on-screen
                visible_points = []
                visible_colors = []
                for j, point in enumerate(points):
                    if (rect.left - 50 < point[0] < rect.right + 50 and
                        rect.top - 50 < point[1] < rect.bottom + 50):
                        visible_points.append(point)
                        visible_colors.append(colors[j])

                if len(visible_points) > 1:
                    # For gradient effect, we still need individual segments
                    # But we can batch by grouping similar colors
                    for j in range(1, len(visible_points)):
                        color = visible_colors[j]
                        glow_color = tuple(c // 3 for c in color)

                        # Glow layer
                        pygame.draw.line(self.screen, glow_color,
                                       visible_points[j-1], visible_points[j], 8)
                        # Main line
                        pygame.draw.line(self.screen, color,
                                       visible_points[j-1], visible_points[j], 4)

    def draw_2d_grid(self, rect, center_x, center_y, scale_factor, mode):
        """Draw 2D grid with adaptive sub-grid for cosmological expansion."""
        base_spacing = 100
        num_lines = 20

        # Calculate effective spacing on screen
        test_point = self.camera.apply((base_spacing * scale_factor, 0), (center_x, center_y))
        origin_point = self.camera.apply((0, 0), (center_x, center_y))
        screen_spacing = abs(test_point[0] - origin_point[0])

        # If grid is too sparse (lines more than 150px apart), add sub-grid
        use_subgrid = screen_spacing > 150
        subgrid_divisions = 2 if use_subgrid else 1

        for division in range(subgrid_divisions):
            if division == 0:
                # Main grid
                grid_spacing = base_spacing
                grid_color_normal = GRID_COLOR
                grid_color_axis = GRID_BRIGHT
            else:
                # Sub-grid (faded)
                grid_spacing = base_spacing * 0.5
                grid_color_normal = (25, 25, 40)  # Very faded
                grid_color_axis = GRID_COLOR

            for i in range(-num_lines * 2, num_lines * 2 + 1):
                # Skip if this is a main grid line when drawing subgrid
                if division == 1 and i % 2 == 0:
                    continue

                # Vertical lines
                x_world = i * grid_spacing * scale_factor
                top = self.camera.apply((x_world, -num_lines * base_spacing * scale_factor), (center_x, center_y))
                bottom = self.camera.apply((x_world, num_lines * base_spacing * scale_factor), (center_x, center_y))

                if rect.left - 50 < top[0] < rect.right + 50:
                    color = grid_color_axis if i == 0 else grid_color_normal
                    pygame.draw.line(self.screen, color,
                                   (top[0], max(rect.top, min(rect.bottom, top[1]))),
                                   (bottom[0], max(rect.top, min(rect.bottom, bottom[1]))), 1)

                # Horizontal lines
                y_world = i * grid_spacing * scale_factor
                left = self.camera.apply((-num_lines * base_spacing * scale_factor, y_world), (center_x, center_y))
                right = self.camera.apply((num_lines * base_spacing * scale_factor, y_world), (center_x, center_y))

                if rect.top - 50 < left[1] < rect.bottom + 50:
                    color = grid_color_axis if i == 0 else grid_color_normal
                    pygame.draw.line(self.screen, color,
                                   (max(rect.left, min(rect.right, left[0])), left[1]),
                                   (max(rect.left, min(rect.right, right[0])), right[1]), 1)

    def draw_wavelength_graph(self, universe, wave_train):
        """Draw wavelength evolution graph."""
        rect = self.graph_rect

        pygame.draw.rect(self.screen, BG_DARK, rect)
        pygame.draw.line(self.screen, GRID_COLOR, (0, rect.top), (rect.right, rect.top), 2)

        title = self.font_large.render("Wavelength Evolution (First Peak)", True, TEXT_PRIMARY)
        self.screen.blit(title, (rect.x + 15, rect.y + 10))

        margin = 50
        graph_left = margin
        graph_right = rect.right - margin
        graph_top = rect.top + 60
        graph_bottom = rect.bottom - 50
        graph_width = graph_right - graph_left
        graph_height = graph_bottom - graph_top

        pygame.draw.line(self.screen, TEXT_SECONDARY,
                        (graph_left, graph_bottom), (graph_right, graph_bottom), 2)
        pygame.draw.line(self.screen, TEXT_SECONDARY,
                        (graph_left, graph_top), (graph_left, graph_bottom), 2)

        xlabel = self.font_small.render("Time (s)", True, TEXT_PRIMARY)
        self.screen.blit(xlabel, (rect.centerx - 30, graph_bottom + 20))

        ylabel = self.font_small.render("Wavelength (nm)", True, TEXT_PRIMARY)
        self.screen.blit(ylabel, (graph_left - 45, graph_top))

        if wave_train:
            first_peak = wave_train.get_first_peak()
            if first_peak and first_peak.active:
                self.wavelength_history.append((universe.time, first_peak.wavelength_current))

        if len(self.wavelength_history) > 1:
            times = [t for t, w in self.wavelength_history]
            wavelengths = [w for t, w in self.wavelength_history]

            min_time = min(times)
            max_time = max(times)
            min_wl = min(wavelengths) - 10
            max_wl = max(wavelengths) + 10

            time_range = max_time - min_time if max_time > min_time else 1
            wl_range = max_wl - min_wl if max_wl > min_wl else 1

            points = []
            for t, w in self.wavelength_history:
                x = graph_left + ((t - min_time) / time_range) * graph_width
                y = graph_bottom - ((w - min_wl) / wl_range) * graph_height
                points.append((x, y))

            if len(points) > 1:
                pygame.draw.lines(self.screen, NEON_CYAN, False, points, 3)

                for i, (x, y) in enumerate(points):
                    color = NEON_YELLOW if i == len(points) - 1 else NEON_CYAN
                    pygame.draw.circle(self.screen, color, (int(x), int(y)), 4)

            if wl_range > 0:
                rest_y = graph_bottom - ((H_ALPHA_REST - min_wl) / wl_range) * graph_height
                pygame.draw.line(self.screen, NEON_GREEN,
                               (graph_left, rest_y), (graph_right, rest_y), 2)
                for x in range(int(graph_left), int(graph_right), 10):
                    pygame.draw.line(self.screen, NEON_GREEN, (x, rest_y), (x + 5, rest_y), 2)

                rest_label = self.font_small.render(f"Rest: {H_ALPHA_REST:.0f}nm", True, NEON_GREEN)
                self.screen.blit(rest_label, (graph_right - 120, int(rest_y) - 20))

            if self.wavelength_history:
                current_wl = self.wavelength_history[-1][1]
                wl_text = self.font_medium.render(f"Current: {current_wl:.2f} nm", True, NEON_YELLOW)
                self.screen.blit(wl_text, (graph_left, graph_top - 30))

    def draw_control_panel(self, universe, source, wave_train, controls, paused, mode):
        """Draw control panel."""
        rect = self.panel_rect

        pygame.draw.rect(self.screen, BG_PANEL, rect)
        pygame.draw.line(self.screen, GRID_COLOR, (rect.left, 0), (rect.left, self.height), 2)

        title = self.font_large.render("Controls", True, TEXT_PRIMARY)
        self.screen.blit(title, (rect.x + 20, 20))

        # Mode buttons
        mode_y = 60
        mode_title = self.font_medium.render("Simulation Mode:", True, TEXT_PRIMARY)
        self.screen.blit(mode_title, (rect.x + 20, mode_y))

        for button in controls['mode_buttons']:
            button.draw(self.screen, self.font_small)

        # Sliders
        for slider in controls['sliders']:
            slider.draw(self.screen, self.font_small)

        # Action buttons
        for button in controls['action_buttons']:
            button.draw(self.screen, self.font_medium)

        # Status (positioned below buttons)
        status_y = 680

        pygame.draw.rect(self.screen, BG_CONTROL,
                        (rect.x + 15, status_y, rect.width - 30, 200), border_radius=8)
        pygame.draw.rect(self.screen, NEON_CYAN,
                        (rect.x + 15, status_y, rect.width - 30, 200), 2, border_radius=8)

        status_title = self.font_medium.render("Status", True, TEXT_PRIMARY)
        self.screen.blit(status_title, (rect.x + 30, status_y + 15))

        y_offset = status_y + 45

        if wave_train:
            v_eff = source.get_effective_velocity(universe.get_scale_factor(), universe.time, mode)
            z_d = v_eff / C_REAL
            first_peak = wave_train.get_first_peak()

            if first_peak:
                z_c = (first_peak.wavelength_current / first_peak.wavelength_emit) - 1
                z_total = (first_peak.wavelength_current / H_ALPHA_REST) - 1

                data = [
                    ("Peaks:", str(len([p for p in wave_train.peaks if p.active])), TEXT_PRIMARY),
                    ("v_eff:", f"{v_eff:.1f} km/s", NEON_ORANGE),
                    ("z_dopp:", f"{z_d:.5f}", NEON_ORANGE),
                    ("z_cosmo:", f"{z_c:.5f}", NEON_MAGENTA),
                    ("z_total:", f"{z_total:.5f}", NEON_CYAN),
                ]

                for label, value, color in data:
                    if label:
                        label_surf = self.font_small.render(label, True, color)
                        self.screen.blit(label_surf, (rect.x + 30, y_offset))

                        if value:
                            value_surf = self.font_small.render(value, True, color)
                            self.screen.blit(value_surf, (rect.x + rect.width - 140, y_offset))

                    y_offset += 22
        else:
            hint = self.font_small.render("Press START", True, TEXT_SECONDARY)
            self.screen.blit(hint, (rect.x + 60, y_offset + 40))


class Simulation:
    """Main simulation controller."""

    def __init__(self):
        self.universe = Universe(H0=70.0)
        self.source = Source(comoving_x=600, comoving_y=0)
        self.wave_train: Optional[WaveTrain] = None
        self.display = Display(SCREEN_WIDTH, SCREEN_HEIGHT)
        self.clock = pygame.time.Clock()
        self.running = True
        self.paused = False
        self.mode = SimulationMode.MIXED

        initial_distance = 600
        self.c_sim = initial_distance / 20.0

        # Controls
        panel_x = int(SCREEN_WIDTH * 0.70) + 30
        slider_width = int(SCREEN_WIDTH * 0.30) - 60
        button_width = (slider_width - 10) // 3

        # Mode buttons
        self.cosmo_button = Button(panel_x, 90, button_width, 35, "Cosmo", BUTTON_PURPLE)
        self.doppler_button = Button(panel_x + button_width + 5, 90, button_width, 35, "Doppler", BUTTON_PURPLE)
        self.mixed_button = Button(panel_x + 2 * (button_width + 5), 90, button_width, 35, "Mixed", BUTTON_PURPLE)
        self.mixed_button.active = True

        # Sliders
        self.h0_slider = Slider(panel_x, 160, slider_width, 20, 0, 200, 70, "Hubble Parameter H₀")
        self.v_radial_slider = Slider(panel_x, 240, slider_width, 20, -1000, 1000, 0, "Radial Velocity (km/s)")
        self.v_transverse_slider = Slider(panel_x, 320, slider_width, 20, -1000, 1000, 0, "Transverse Velocity (km/s)")
        self.distance_slider = Slider(panel_x, 400, slider_width, 20, 400, 1200, 600, "Initial Distance")

        # Action buttons
        self.start_button = Button(panel_x, 480, slider_width, 50, "START EMISSION", BUTTON_GREEN)
        self.pause_button = Button(panel_x, 545, slider_width, 50, "PAUSE/RESUME", BUTTON_BLUE)
        self.reset_button = Button(panel_x, 610, slider_width, 50, "RESET", BUTTON_RED)

        self.controls = {
            'mode_buttons': [self.cosmo_button, self.doppler_button, self.mixed_button],
            'sliders': [self.h0_slider, self.v_radial_slider, self.v_transverse_slider, self.distance_slider],
            'action_buttons': [self.start_button, self.pause_button, self.reset_button]
        }

    def set_mode(self, new_mode):
        """Change simulation mode."""
        self.mode = new_mode

        # Update button states
        self.cosmo_button.active = (new_mode == SimulationMode.COSMOLOGICAL)
        self.doppler_button.active = (new_mode == SimulationMode.DOPPLER)
        self.mixed_button.active = (new_mode == SimulationMode.MIXED)

        # Reset wave train if active
        if self.wave_train:
            self.wave_train = None
            self.display.wavelength_history.clear()

    def start_emission(self):
        """Start wave train emission."""
        if not self.wave_train or self.wave_train.is_finished():
            self.wave_train = WaveTrain(self.source, self.universe, H_ALPHA_REST, 3.0, self.mode)

    def handle_events(self):
        """Handle input."""
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False

            elif event.type == pygame.KEYDOWN:
                # Mode shortcuts
                if event.key == pygame.K_1:
                    self.set_mode(SimulationMode.COSMOLOGICAL)
                elif event.key == pygame.K_2:
                    self.set_mode(SimulationMode.DOPPLER)
                elif event.key == pygame.K_3:
                    self.set_mode(SimulationMode.MIXED)

            # Handle sliders
            for slider in self.controls['sliders']:
                slider.handle_event(event)

            # Mode buttons
            if self.cosmo_button.handle_event(event):
                self.set_mode(SimulationMode.COSMOLOGICAL)
            if self.doppler_button.handle_event(event):
                self.set_mode(SimulationMode.DOPPLER)
            if self.mixed_button.handle_event(event):
                self.set_mode(SimulationMode.MIXED)

            # Action buttons
            if self.start_button.handle_event(event):
                self.start_emission()
            if self.pause_button.handle_event(event):
                self.paused = not self.paused
            if self.reset_button.handle_event(event):
                self.reset()

        # Update parameters
        self.universe.set_H0(self.h0_slider.get_value())
        self.source.set_velocities(self.v_radial_slider.get_value(),
                                   self.v_transverse_slider.get_value())
        self.source.set_distance(self.distance_slider.get_value())
        self.c_sim = self.distance_slider.get_value() / 20.0

    def reset(self):
        """Reset simulation."""
        self.universe.reset()
        self.source.start_time = 0.0
        self.wave_train = None
        self.paused = False
        self.display.wavelength_history.clear()

    def update(self, dt):
        """Update simulation."""
        if self.paused:
            return

        # Only update universe if simulation has started
        simulation_started = self.wave_train is not None
        self.universe.update(dt, self.mode, simulation_started)

        if self.wave_train:
            # Observer is always at (0, 0)
            self.wave_train.update(dt, self.universe, self.c_sim, observer_pos=(0, 0))

            first_peak = self.wave_train.get_first_peak()
            if first_peak and not first_peak.active and not self.paused:
                self.paused = True

    def run(self):
        """Main loop."""
        while self.running:
            dt = self.clock.tick(FPS) / 1000.0

            self.handle_events()
            self.update(dt)
            self.display.draw(self.universe, self.source, self.wave_train,
                             self.controls, self.paused, self.c_sim, self.mode)

        pygame.quit()


def main():
    """Entry point."""
    sim = Simulation()
    sim.run()


if __name__ == "__main__":
    main()
