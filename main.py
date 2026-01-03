import pygame
import pygame.gfxdraw
import math
import numpy as np
from typing import Tuple, Optional
from collections import deque
from enum import Enum

# ============================================================
# CONFIG
# ============================================================

WAVELENGTH_REST = 480.0       # nm
VISUAL_C = 12000.0            # "c" for sliders (km/s scale)

SCREEN_WIDTH = 1400
SCREEN_HEIGHT = 900
FPS = 60

# Theme
BG_DARK = (10, 10, 20)
BG_PANEL = (20, 20, 35)
BG_CONTROL = (30, 30, 45)

NEON_CYAN = (0, 255, 255)
NEON_GREEN = (0, 255, 100)
NEON_ORANGE = (255, 128, 0)
NEON_BLUE = (64, 156, 255)
NEON_PURPLE = (150, 50, 200)

TEXT_PRIMARY = (220, 220, 240)
TEXT_SECONDARY = (150, 150, 180)
GRID_COLOR = (35, 35, 55)
WHITE = (255, 255, 255)

BUTTON_GREEN = (0, 180, 100)
BUTTON_RED = (220, 50, 50)
BUTTON_BLUE = (50, 120, 220)
BUTTON_PURPLE = (150, 50, 200)

OBSERVER_RADIUS = 15
GALAXY_RADIUS = 18

# --- Wave visualization (NO amplitude change requested)
WAVE_AMPLITUDE_SCREEN = 18     # px (constant)
WAVE_DRAW_THICKNESS = 3

# Wavelength mapping: nm -> WORLD distance units
# Tune this so that 480nm gives a nice visible spacing along ~500-1200 units
K_LAMBDA_WORLD = 0.075

# How many samples along the ray per frame (quality vs performance)
RAY_SAMPLES = 420

class SimulationMode(Enum):
    COSMOLOGICAL = 1
    DOPPLER = 2
    MIXED = 3

# ============================================================
# UTILS
# ============================================================

def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t

def wavelength_to_rgb(wl: float) -> Tuple[int, int, int]:
    """Maps wavelength (nm) to RGB. Clamps IR to deep red (keeps visible)."""
    if wl < 380:
        return (75, 0, 130)
    if wl > 750:
        factor = max(0.4, 1.0 - (wl - 750) / 800.0)
        return (int(180 * factor), 0, 0)

    if 380 <= wl < 440:
        t = (wl - 380) / 60
        return (int((1 - t) * 100), 0, 255)
    elif 440 <= wl < 490:
        t = (wl - 440) / 50
        return (0, int(t * 255), 255)
    elif 490 <= wl < 510:
        t = (wl - 490) / 20
        return (0, 255, int((1 - t) * 255))
    elif 510 <= wl < 580:
        t = (wl - 510) / 70
        return (int(t * 255), 255, 0)
    elif 580 <= wl < 645:
        t = (wl - 580) / 65
        return (255, int((1 - t) * 255), 0)
    else:
        return (255, 0, 0)

# ============================================================
# UI
# ============================================================

class Slider:
    def __init__(self, x, y, width, height, min_val, max_val, initial_val, label):
        self.rect = pygame.Rect(x, y, width, height)
        self.min_val = float(min_val)
        self.max_val = float(max_val)
        self.value = float(initial_val)
        self.label = label
        self.dragging = False

    def handle_event(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN:
            if self.rect.inflate(15, 15).collidepoint(event.pos):
                self.dragging = True
        elif event.type == pygame.MOUSEBUTTONUP:
            self.dragging = False
        elif event.type == pygame.MOUSEMOTION and self.dragging:
            mouse_x = event.pos[0]
            t = (mouse_x - self.rect.x) / self.rect.width
            t = clamp(t, 0.0, 1.0)
            self.value = self.min_val + t * (self.max_val - self.min_val)

    def draw(self, screen, font):
        pygame.draw.rect(screen, BG_CONTROL, self.rect, border_radius=4)
        pygame.draw.rect(screen, NEON_CYAN, self.rect, 2, border_radius=4)

        t = (self.value - self.min_val) / (self.max_val - self.min_val)
        fill_width = int(t * self.rect.width)
        fill_rect = pygame.Rect(self.rect.x, self.rect.y, fill_width, self.rect.height)
        pygame.draw.rect(screen, (0, 100, 120), fill_rect, border_radius=4)

        handle_x = self.rect.x + fill_width
        pygame.draw.circle(screen, NEON_CYAN, (int(handle_x), self.rect.centery), 10)
        pygame.draw.circle(screen, WHITE, (int(handle_x), self.rect.centery), 6)

        label_text = font.render(self.label, True, TEXT_PRIMARY)
        screen.blit(label_text, (self.rect.x, self.rect.y - 25))
        value_text = font.render(f"{self.value:.0f}", True, TEXT_SECONDARY)
        screen.blit(value_text, (self.rect.x, self.rect.y + 25))

    def get_value(self) -> float:
        return float(self.value)

class Button:
    def __init__(self, x, y, width, height, label, color):
        self.rect = pygame.Rect(x, y, width, height)
        self.label = label
        self.color = color
        self.hover = False
        self.active = False

    def handle_event(self, event) -> bool:
        if event.type == pygame.MOUSEMOTION:
            self.hover = self.rect.collidepoint(event.pos)
        elif event.type == pygame.MOUSEBUTTONDOWN:
            if self.rect.collidepoint(event.pos):
                return True
        return False

    def draw(self, screen, font):
        color = self.color
        if self.active:
            color = tuple(min(255, c + 60) for c in self.color)
        elif self.hover:
            color = tuple(min(255, c + 30) for c in self.color)

        pygame.draw.rect(screen, color, self.rect, border_radius=8)
        border_col = WHITE if self.active else NEON_CYAN
        width = 3 if self.active else 1
        pygame.draw.rect(screen, border_col, self.rect, width, border_radius=8)

        text_surf = font.render(self.label, True, WHITE)
        text_rect = text_surf.get_rect(center=self.rect.center)
        screen.blit(text_surf, text_rect)

# ============================================================
# PHYSICS MODEL
# ============================================================

class Universe:
    def __init__(self):
        self.time = 0.0
        self.scale_factor = 1.0
        self.H0 = 70.0
        self.history = deque(maxlen=6000)  # (t, a)
        self.history.append((0.0, 1.0))

    def update(self, dt: float, mode: SimulationMode):
        self.time += dt
        if mode != SimulationMode.DOPPLER:
            k_exp = self.H0 / 2000.0
            self.scale_factor *= (1.0 + k_exp * dt)
        self.history.append((self.time, self.scale_factor))

    def reset(self):
        self.time = 0.0
        self.scale_factor = 1.0
        self.history.clear()
        self.history.append((0.0, 1.0))

    def scale_at(self, t: float) -> float:
        """Linear interpolation in stored (t,a)."""
        if t <= 0.0:
            return 1.0
        if t >= self.history[-1][0]:
            return self.history[-1][1]

        # Find bracket (simple backwards scan: history is dense)
        for i in range(len(self.history) - 2, -1, -1):
            t0, a0 = self.history[i]
            t1, a1 = self.history[i + 1]
            if t0 <= t <= t1:
                if t1 == t0:
                    return a1
                u = (t - t0) / (t1 - t0)
                return a0 + (a1 - a0) * u
        return self.history[0][1]

class Source:
    def __init__(self, initial_dist: float):
        self.initial_dist = float(initial_dist)
        self.comoving_x = float(initial_dist)
        self.comoving_y = 0.0
        self.vr = 0.0
        self.vt = 0.0
        self.start_time = 0.0

    def get_pos(self, a: float, time_now: float, mode: SimulationMode) -> Tuple[float, float]:
        px = self.comoving_x * a
        py = self.comoving_y * a

        if mode == SimulationMode.COSMOLOGICAL:
            return px, py

        dt = time_now - self.start_time
        K_MOVE = 0.05  # km/s -> world units/s

        dist = math.sqrt(px * px + py * py)
        if dist > 0:
            ur_x, ur_y = px / dist, py / dist
            ut_x, ut_y = -ur_y, ur_x
        else:
            ur_x, ur_y = 1.0, 0.0
            ut_x, ut_y = 0.0, 1.0

        disp_r = self.vr * dt * K_MOVE
        disp_t = self.vt * dt * K_MOVE

        final_x = px + ur_x * disp_r + ut_x * disp_t
        final_y = py + ur_y * disp_r + ut_y * disp_t
        return final_x, final_y

    def get_velocity_vector(self, a: float, time_now: float, mode: SimulationMode) -> Tuple[float, float]:
        if mode == SimulationMode.COSMOLOGICAL:
            return 0.0, 0.0

        x, y = self.get_pos(a, time_now, mode)
        dist = math.sqrt(x * x + y * y)
        if dist > 0:
            ur_x, ur_y = x / dist, y / dist
            ut_x, ut_y = -ur_y, ur_x
        else:
            ur_x, ur_y = 1.0, 0.0
            ut_x, ut_y = 0.0, 1.0

        vx = self.vr * ur_x + self.vt * ut_x
        vy = self.vr * ur_y + self.vt * ut_y
        return vx, vy

    def recession_beta(self, universe: Universe, t: float, mode: SimulationMode) -> float:
        """beta(t)=v_rec(t)/c using LOS at time t."""
        a = 1.0 if mode == SimulationMode.DOPPLER else universe.scale_at(t)
        sx, sy = self.get_pos(a, t, mode)
        d = math.sqrt(sx*sx + sy*sy)
        if d <= 1e-9:
            return 0.0
        los_x, los_y = -sx/d, -sy/d  # source->observer direction
        vx, vy = self.get_velocity_vector(a, t, mode)
        v_proj = vx*los_x + vy*los_y        # positive = toward observer
        v_rec = -v_proj                      # positive = receding
        beta = v_rec / VISUAL_C
        return clamp(beta, -0.95, 0.95)

class WaveTrain:
    """Only used to define emission window (start/duration) like a real source 'sending' waves."""
    def __init__(self, source: Source, universe: Universe, mode: SimulationMode):
        self.source = source
        self.universe = universe
        self.mode = mode
        self.duration = 25.0
        self.active = True

    def update(self):
        now = self.universe.time
        if now - self.source.start_time > self.duration:
            self.active = False

# ============================================================
# CAMERA
# ============================================================

class Camera:
    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        self.cx, self.cy = 0.0, 0.0
        self.zoom = 0.85

    def update(self, p1: Tuple[float, float], p2: Tuple[float, float]):
        min_x, max_x = min(p1[0], p2[0]), max(p1[0], p2[0])
        min_y, max_y = min(p1[1], p2[1]), max(p1[1], p2[1])

        pad = 350
        bw = (max_x - min_x) + pad * 2
        bh = (max_y - min_y) + pad * 2

        bw = max(bw, 1200)
        bh = max(bh, 900)

        target_cx = (min_x + max_x) / 2.0
        target_cy = (min_y + max_y) / 2.0
        target_zoom = min(self.w / bw, self.h / bh)

        self.cx = lerp(self.cx, target_cx, 0.05)
        self.cy = lerp(self.cy, target_cy, 0.05)
        self.zoom = lerp(self.zoom, target_zoom, 0.05)

    def project(self, x: float, y: float) -> Tuple[float, float]:
        sx = (x - self.cx) * self.zoom + self.w / 2.0
        sy = (y - self.cy) * self.zoom + self.h / 2.0
        return sx, sy

    def project_parallax(self, x: float, y: float, depth: float) -> Tuple[float, float]:
        sx = (x - self.cx * depth) * self.zoom + self.w / 2.0
        sy = (y - self.cy * depth) * self.zoom + self.h / 2.0
        return sx, sy

# ============================================================
# DISPLAY
# ============================================================

class Display:
    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height

        self.screen = pygame.display.set_mode((width, height))
        pygame.display.set_caption("Redshift Simulation (Sine Wave + Working Graph)")

        try:
            self.font_lg = pygame.font.SysFont("segoeui", 22)
            self.font_md = pygame.font.SysFont("segoeui", 18)
            self.font_sm = pygame.font.SysFont("segoeui", 15)
        except:
            self.font_lg = pygame.font.Font(None, 26)
            self.font_md = pygame.font.Font(None, 22)
            self.font_sm = pygame.font.Font(None, 18)

        self.viz_w = int(width * 0.70)
        self.panel_w = width - self.viz_w

        self.rect_top = pygame.Rect(0, 0, self.viz_w, self.height // 2)
        self.rect_graph = pygame.Rect(0, self.height // 2, self.viz_w, self.height // 2)
        self.rect_panel = pygame.Rect(self.viz_w, 0, self.panel_w, self.height)

        self.camera = Camera(self.viz_w, self.height // 2)

        self.fx_top = pygame.Surface((self.viz_w, self.height // 2), pygame.SRCALPHA)
        self.fx_graph = pygame.Surface((self.viz_w, self.height // 2), pygame.SRCALPHA)

        self.wl_history = deque(maxlen=900)

        rng = np.random.default_rng(2)
        self.stars = []
        for _ in range(900):
            x = float(rng.uniform(-7000, 7000))
            y = float(rng.uniform(-7000, 7000))
            depth = float(rng.uniform(0.15, 1.0))
            bright = float(rng.uniform(0.25, 1.0))
            size = int(rng.integers(1, 3))
            self.stars.append((x, y, depth, bright, size))

    def glow_circle(self, surf, x, y, r, color, glow=10, alpha=120):
        for i in range(glow, 0, -1):
            a = int(alpha * (i / glow) ** 2)
            col = (color[0], color[1], color[2], a)
            pygame.gfxdraw.filled_circle(surf, int(x), int(y), int(r) + i, col)

    def aa_circle(self, surf, x, y, r, color):
        pygame.gfxdraw.filled_circle(surf, int(x), int(y), int(r), (*color, 255))
        pygame.gfxdraw.aacircle(surf, int(x), int(y), int(r), (*color, 255))

    def glow_line(self, surf, p1, p2, color, width=2, glow=8, alpha=80):
        for i in range(glow, 0, -1):
            a = int(alpha * (i / glow) ** 2)
            col = (color[0], color[1], color[2], a)
            pygame.draw.line(surf, col, p1, p2, width + 2 * i)
        pygame.draw.line(surf, (*color, 255), p1, p2, width)

    def draw_stars(self):
        for x, y, depth, bright, size in self.stars:
            sx, sy = self.camera.project_parallax(x, y, depth)
            if 0 <= sx < self.viz_w and 0 <= sy < self.rect_top.height:
                c = int(80 + 175 * bright)
                pygame.gfxdraw.filled_circle(self.screen, int(sx), int(sy), size, (c, c, c, 255))

    def draw_grid(self):
        # simple stable grid
        spacing = 100
        for x in range(0, self.viz_w, spacing):
            pygame.draw.line(self.screen, GRID_COLOR, (x, 0), (x, self.rect_top.height), 1)
            pygame.draw.line(self.screen, GRID_COLOR, (x, self.rect_graph.top), (x, self.height), 1)
        for y in range(0, self.height, spacing):
            pygame.draw.line(self.screen, GRID_COLOR, (0, y), (self.viz_w, y), 1)

    # --------------------------------------------------------
    # 핵: draw sine wave along LOS using retarded time
    # --------------------------------------------------------
    def draw_wave_sine_ray(self,
                           universe: Universe,
                           source: Source,
                           wave_train: Optional[WaveTrain],
                           mode: SimulationMode,
                           wave_speed_world: float):

        if wave_train is None:
            return

        now = universe.time
        t0 = source.start_time
        t1 = t0 + wave_train.duration

        # Current source position for drawing ray
        a_now = 1.0 if mode == SimulationMode.DOPPLER else universe.scale_factor
        sx, sy = source.get_pos(a_now, now, mode)
        d = math.sqrt(sx*sx + sy*sy)
        if d < 1e-6:
            return

        # Ray from observer -> source
        ux, uy = sx/d, sy/d
        # perpendicular direction
        px, py = -uy, ux

        amp_world = WAVE_AMPLITUDE_SCREEN / max(1e-6, self.camera.zoom)

        # We draw from observer (r=0) to source (r=d)
        prev_pt = None
        prev_col = None

        # travel term for moving phase
        ct = wave_speed_world * now

        for i in range(RAY_SAMPLES):
            r = (i / (RAY_SAMPLES - 1)) * d

            # retarded emission time
            t_emit = now - r / max(1e-6, wave_speed_world)

            # Only draw the part that corresponds to actual emission window
            if not (t0 <= t_emit <= t1):
                prev_pt = None
                prev_col = None
                continue

            # Doppler at emission time (depends on velocity, not position!)
            beta = source.recession_beta(universe, t_emit, mode)
            doppler_factor = math.sqrt((1.0 + beta) / (1.0 - beta))
            wl_emit = WAVELENGTH_REST * doppler_factor

            # Cosmological stretch along propagation: a(now)/a(t_emit)
            if mode != SimulationMode.DOPPLER:
                a_emit = universe.scale_at(t_emit)
                stretch = (universe.scale_factor / max(1e-9, a_emit))
            else:
                stretch = 1.0

            wl_here = wl_emit * stretch
            wl_world = max(2.0, K_LAMBDA_WORLD * wl_here)

            # Traveling sine (crests move toward observer)
            phase = 2.0 * math.pi * ((r - ct) / wl_world)
            off = amp_world * math.sin(phase)

            wx = ux * r + px * off
            wy = uy * r + py * off

            sxp, syp = self.camera.project(wx, wy)

            col = wavelength_to_rgb(wl_here)

            if prev_pt is not None:
                self.glow_line(self.fx_top, prev_pt, (sxp, syp), prev_col, width=WAVE_DRAW_THICKNESS, glow=7, alpha=70)
                pygame.draw.aaline(self.screen, prev_col, prev_pt, (sxp, syp))

            prev_pt = (sxp, syp)
            prev_col = col

    def draw_objects(self, universe: Universe, source: Source, mode: SimulationMode):
        ox, oy = self.camera.project(0.0, 0.0)
        self.glow_circle(self.fx_top, ox, oy, OBSERVER_RADIUS, NEON_GREEN, glow=14, alpha=140)
        self.aa_circle(self.screen, ox, oy, OBSERVER_RADIUS, NEON_GREEN)
        self.aa_circle(self.screen, ox, oy, OBSERVER_RADIUS - 4, BG_DARK)
        self.screen.blit(self.font_sm.render("Observer", True, NEON_GREEN), (ox - 28, oy + 20))

        a_now = 1.0 if mode == SimulationMode.DOPPLER else universe.scale_factor
        gx, gy = source.get_pos(a_now, universe.time, mode)
        sx, sy = self.camera.project(gx, gy)
        self.glow_circle(self.fx_top, sx, sy, GALAXY_RADIUS, NEON_BLUE, glow=16, alpha=150)
        self.aa_circle(self.screen, sx, sy, GALAXY_RADIUS, NEON_BLUE)
        self.aa_circle(self.screen, sx, sy, GALAXY_RADIUS - 5, (100, 150, 255))
        self.screen.blit(self.font_sm.render("Galaxy", True, NEON_BLUE), (sx - 20, sy + 20))

        # velocity arrow
        if mode != SimulationMode.COSMOLOGICAL:
            vx, vy = source.get_velocity_vector(a_now, universe.time, mode)
            mag = math.sqrt(vx*vx + vy*vy)
            if mag > 100:
                scale = 60.0 / 5000.0
                end_x = sx + vx * scale
                end_y = sy + vy * scale
                self.glow_line(self.fx_top, (sx, sy), (end_x, end_y), NEON_ORANGE, width=2, glow=8, alpha=90)
                pygame.draw.aaline(self.screen, NEON_ORANGE, (sx, sy), (end_x, end_y))

    # --------------------------------------------------------
    # Graph (bottom) - ALWAYS draws if history exists
    # --------------------------------------------------------
    def draw_graph(self):
        rect = self.rect_graph
        pad = 55
        gw = rect.width - pad * 2
        gh = rect.height - pad * 2
        gx = rect.x + pad
        gy = rect.y + pad

        # frame
        pygame.draw.rect(self.screen, BG_DARK, rect)
        pygame.draw.line(self.screen, TEXT_SECONDARY, (gx, gy + gh), (gx + gw, gy + gh), 2)
        pygame.draw.line(self.screen, TEXT_SECONDARY, (gx, gy), (gx, gy + gh), 2)

        self.screen.blit(self.font_sm.render("Time", True, TEXT_SECONDARY), (gx + gw/2, gy + gh + 10))
        self.screen.blit(self.font_sm.render("Wavelength (nm)", True, TEXT_SECONDARY), (gx - 45, gy - 22))

        # grid
        for k in range(1, 6):
            yk = gy + k * gh / 6
            pygame.draw.line(self.screen, (40, 40, 60), (gx, yk), (gx + gw, yk), 1)
        for k in range(1, 8):
            xk = gx + k * gw / 8
            pygame.draw.line(self.screen, (40, 40, 60), (xk, gy), (xk, gy + gh), 1)

        if len(self.wl_history) < 2:
            # draw rest line anyway
            rest_y = gy + gh/2
            pygame.draw.line(self.screen, NEON_GREEN, (gx, rest_y), (gx + gw, rest_y), 1)
            self.screen.blit(self.font_sm.render("Rest", True, NEON_GREEN), (gx + gw - 50, rest_y - 18))
            return

        times = [d[0] for d in self.wl_history]
        wls   = [d[1] for d in self.wl_history]
        min_t, max_t = min(times), max(times)
        if max_t == min_t:
            max_t += 1.0

        min_wl, max_wl = min(wls), max(wls)
        min_wl = min(min_wl, WAVELENGTH_REST - 80)
        max_wl = max(max_wl, WAVELENGTH_REST + 260)

        pts = []
        for t, wl in self.wl_history:
            px = gx + (t - min_t) / (max_t - min_t) * gw
            py = gy + gh - (wl - min_wl) / (max_wl - min_wl) * gh
            pts.append((px, py))

        for i in range(len(pts) - 1):
            col = wavelength_to_rgb(wls[i])
            self.glow_line(self.fx_graph, pts[i], pts[i + 1], col, width=2, glow=6, alpha=70)
            pygame.draw.aaline(self.screen, col, pts[i], pts[i + 1])

        # rest line
        rest_y = gy + gh - (WAVELENGTH_REST - min_wl) / (max_wl - min_wl) * gh
        if gy <= rest_y <= gy + gh:
            pygame.draw.line(self.screen, NEON_GREEN, (gx, rest_y), (gx + gw, rest_y), 1)
            self.screen.blit(self.font_sm.render(f"Rest ({int(WAVELENGTH_REST)}nm)", True, NEON_GREEN),
                             (gx + gw - 140, rest_y - 20))

        # last point highlight
        lx, ly = pts[-1]
        lcol = wavelength_to_rgb(wls[-1])
        self.glow_circle(self.fx_graph, lx, ly, 5, lcol, glow=10, alpha=160)
        self.aa_circle(self.screen, lx, ly, 4, lcol)

    def draw_controls(self, controls):
        rect = self.rect_panel
        pygame.draw.rect(self.screen, BG_PANEL, rect)
        pygame.draw.line(self.screen, GRID_COLOR, (self.viz_w, 0), (self.viz_w, self.height), 2)

        self.screen.blit(self.font_lg.render("Controls", True, TEXT_PRIMARY), (rect.x + 20, 20))
        self.screen.blit(self.font_md.render("Simulation Mode:", True, TEXT_PRIMARY), (rect.x + 20, 60))

        for btn in controls["mode_buttons"]:
            btn.draw(self.screen, self.font_sm)
        for slider in controls["sliders"]:
            slider.draw(self.screen, self.font_sm)
        for btn in controls["action_buttons"]:
            btn.draw(self.screen, self.font_md)

    def draw_status(self, universe: Universe, source: Source, mode: SimulationMode, wave_train: Optional[WaveTrain]):
        x = self.rect_panel.x + 20
        y = 680
        self.screen.blit(self.font_md.render("Status Monitor", True, TEXT_PRIMARY), (x, y))

        wl_obs = self.wl_history[-1][1] if len(self.wl_history) else WAVELENGTH_REST
        z_tot = wl_obs / WAVELENGTH_REST - 1.0

        a_now = 1.0 if mode == SimulationMode.DOPPLER else universe.scale_factor
        sx, sy = source.get_pos(a_now, universe.time, mode)
        d = math.sqrt(sx*sx + sy*sy)

        beta_now = source.recession_beta(universe, universe.time, mode)
        # closing velocity sign convention: positive closing => negative recession
        v_rec = beta_now * VISUAL_C
        v_close = -v_rec

        rows = [
            (f"Distance: {int(d)} units", TEXT_PRIMARY),
            (f"LOS Vel (closing): {int(v_close)} km/s", NEON_ORANGE),
            (f"Observed WL: {wl_obs:.1f} nm", wavelength_to_rgb(wl_obs)),
            (f"Total Redshift (z): {z_tot:.4f}", NEON_CYAN),
        ]

        off = 35
        for txt, col in rows:
            self.screen.blit(self.font_sm.render(txt, True, col), (x, y + off))
            off += 25

        if wave_train is None:
            self.screen.blit(self.font_sm.render("Emission: OFF", True, TEXT_SECONDARY), (x, y + off + 10))
        else:
            self.screen.blit(self.font_sm.render(f"Emission: {'ON' if wave_train.active else 'ENDED'}", True, TEXT_SECONDARY),
                             (x, y + off + 10))

    def draw(self, universe: Universe, source: Source, wave_train: Optional[WaveTrain],
             controls, paused: bool, mode: SimulationMode, wave_speed: float):

        self.screen.fill(BG_DARK)
        self.fx_top.fill((0, 0, 0, 0))
        self.fx_graph.fill((0, 0, 0, 0))

        # camera update with current positions
        a_now = 1.0 if mode == SimulationMode.DOPPLER else universe.scale_factor
        gx, gy = source.get_pos(a_now, universe.time, mode)
        self.camera.update((0.0, 0.0), (gx, gy))

        # top view
        pygame.draw.rect(self.screen, BG_DARK, self.rect_top)
        self.draw_stars()
        self.draw_grid()

        # sine ray wave
        if wave_train is not None and wave_train.active:
            self.draw_wave_sine_ray(universe, source, wave_train, mode, wave_speed)

        self.draw_objects(universe, source, mode)
        self.screen.blit(self.fx_top, (0, 0), special_flags=pygame.BLEND_ADD)

        # bottom graph
        pygame.draw.line(self.screen, GRID_COLOR, (0, self.rect_graph.top), (self.viz_w, self.rect_graph.top), 2)
        self.draw_graph()
        self.screen.blit(self.fx_graph, (0, self.rect_graph.top), special_flags=pygame.BLEND_ADD)

        # panel
        self.draw_controls(controls)
        if paused:
            self.screen.blit(self.font_lg.render("PAUSED", True, (255, 220, 120)), (20, 20))

        self.draw_status(universe, source, mode, wave_train)
        pygame.display.flip()

# ============================================================
# APP
# ============================================================

class Simulation:
    def __init__(self):
        self.universe = Universe()
        self.source = Source(500.0)
        self.wave_train: Optional[WaveTrain] = None

        self.display = Display(SCREEN_WIDTH, SCREEN_HEIGHT)
        self.clock = pygame.time.Clock()

        self.running = True
        self.paused = False
        self.mode = SimulationMode.COSMOLOGICAL

        self.setup_ui()

        # initialize graph with rest line (so you always see something)
        for i in range(5):
            self.display.wl_history.append((0.0 + i*0.01, WAVELENGTH_REST))

    def setup_ui(self):
        px = self.display.viz_w + 30
        sw = self.display.panel_w - 60
        bw = (sw - 10) // 3

        self.btn_cosmo = Button(px, 90, bw, 40, "Cosmo", BUTTON_PURPLE)
        self.btn_dop = Button(px + bw + 5, 90, bw, 40, "Doppler", BUTTON_PURPLE)
        self.btn_mix = Button(px + 2 * (bw + 5), 90, bw, 40, "Mixed", BUTTON_PURPLE)
        self.btn_cosmo.active = True

        self.sld_h0 = Slider(px, 160, sw, 20, 0, 150, 70, "Hubble (H0)")
        self.sld_vr = Slider(px, 240, sw, 20, -8000, 8000, 0, "Radial Vel (km/s)")
        self.sld_vt = Slider(px, 320, sw, 20, -8000, 8000, 0, "Transverse Vel (km/s)")
        self.sld_dist = Slider(px, 400, sw, 20, 200, 1000, 500, "Initial Dist")

        self.btn_start = Button(px, 480, sw, 50, "START EMISSION", BUTTON_GREEN)
        self.btn_pause = Button(px, 540, sw, 50, "PAUSE", BUTTON_BLUE)
        self.btn_reset = Button(px, 600, sw, 50, "RESET", BUTTON_RED)

        self.controls = {
            "mode_buttons": [self.btn_cosmo, self.btn_dop, self.btn_mix],
            "sliders": [self.sld_h0, self.sld_vr, self.sld_vt, self.sld_dist],
            "action_buttons": [self.btn_start, self.btn_pause, self.btn_reset],
        }

    def set_mode(self, mode: SimulationMode):
        self.mode = mode
        self.btn_cosmo.active = mode == SimulationMode.COSMOLOGICAL
        self.btn_dop.active = mode == SimulationMode.DOPPLER
        self.btn_mix.active = mode == SimulationMode.MIXED
        self.reset_sim()

    def reset_sim(self):
        self.universe.reset()
        self.wave_train = None

        self.source.start_time = 0.0
        self.source.vr = 0.0
        self.source.vt = 0.0
        self.source.comoving_x = self.sld_dist.get_value()
        self.source.comoving_y = 0.0

        self.paused = False
        self.display.wl_history.clear()
        # keep graph alive
        for i in range(5):
            self.display.wl_history.append((0.0 + i*0.01, WAVELENGTH_REST))

    def start_emission(self):
        self.reset_sim()
        self.source.start_time = self.universe.time
        self.wave_train = WaveTrain(self.source, self.universe, self.mode)

    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False

            for s in self.controls["sliders"]:
                s.handle_event(event)

            if self.btn_cosmo.handle_event(event):
                self.set_mode(SimulationMode.COSMOLOGICAL)
            if self.btn_dop.handle_event(event):
                self.set_mode(SimulationMode.DOPPLER)
            if self.btn_mix.handle_event(event):
                self.set_mode(SimulationMode.MIXED)

            if self.btn_start.handle_event(event):
                self.start_emission()
            if self.btn_pause.handle_event(event):
                self.paused = not self.paused
            if self.btn_reset.handle_event(event):
                self.reset_sim()

            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE:
                    self.paused = not self.paused
                if event.key == pygame.K_r:
                    self.reset_sim()

    def update(self, dt: float) -> float:
        if self.paused:
            return self.sld_dist.get_value() / 15.0

        # params
        self.universe.H0 = self.sld_h0.get_value()
        self.source.vr = self.sld_vr.get_value()
        self.source.vt = self.sld_vt.get_value()
        self.source.comoving_x = self.sld_dist.get_value()

        # physics update
        self.universe.update(dt, self.mode)

        # wave speed in WORLD units/s (visual)
        wave_speed = self.sld_dist.get_value() / 15.0

        # emission window update
        if self.wave_train is not None:
            self.wave_train.update()

        # ---- observer measurement for graph (continuous, always updates)
        # Doppler at NOW (what observer sees as shift factor)
        beta_now = self.source.recession_beta(self.universe, self.universe.time, self.mode)
        doppler_factor = math.sqrt((1.0 + beta_now) / (1.0 - beta_now))

        # cosmological factor relative to emission start (if emission started)
        if self.mode != SimulationMode.DOPPLER and self.wave_train is not None:
            a_start = self.universe.scale_at(self.source.start_time)
            cosmo_factor = self.universe.scale_factor / max(1e-9, a_start)
        else:
            cosmo_factor = 1.0

        wl_obs = WAVELENGTH_REST * doppler_factor * cosmo_factor

        # Only accumulate after emission started (so graph reflects what you care about),
        # but still keep it alive even before.
        self.display.wl_history.append((self.universe.time, wl_obs))

        return wave_speed

    def run(self):
        while self.running:
            dt = self.clock.tick(FPS) / 1000.0
            self.handle_events()
            wave_speed = self.update(dt)
            self.display.draw(self.universe, self.source, self.wave_train,
                              self.controls, self.paused, self.mode, wave_speed)
        pygame.quit()

if __name__ == "__main__":
    pygame.init()
    pygame.font.init()
    Simulation().run()
