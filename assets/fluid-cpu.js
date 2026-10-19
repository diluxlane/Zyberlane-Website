/* Canvas2D compatibility renderer. A velocity / pressure / dye grid, not particles.
 * Uses the same Stable Fluids method as the GPU path, with bounded CPU work.
 */
(() => {
  'use strict';
  class CPUFluid {
    constructor(canvas, { color = [237, 3, 6], background = 3 } = {}) {
      this.canvas = canvas;
      this.color = color;
      this.background = background;
      this.context = canvas.getContext('2d', { alpha: false });
      this.surface = document.createElement('canvas');
      this.surfaceContext = this.surface.getContext('2d', { alpha: false });
      if (!this.context || !this.surfaceContext) throw new Error('Canvas2D rendering is unavailable.');
    }

    resize(width, height, iterations, preserve = false) {
      const previous = preserve && this.dye
        ? { width: this.width, height: this.height, u: this.u, v: this.v, dye: this.dye, pressure: this.pressure } : null;
      this.width = width; this.height = height; this.iterations = iterations;
      const length = width * height;
      for (const name of ['u', 'v', 'nextU', 'nextV', 'dye', 'nextDye', 'curl', 'divergence', 'pressure', 'nextPressure']) {
        this[name] = new Float32Array(length);
      }
      // Match the GPU texture copy: resample live fields, leaving scratch grids
      // empty. Initial allocation and an explicit reset still start at zero.
      if (previous) {
        for (let j = 0; j < height; j++) {
          const y = Math.max(0, Math.min(previous.height - 1, (j + 0.5) * previous.height / height - 0.5));
          const y0 = Math.floor(y), y1 = Math.min(y0 + 1, previous.height - 1), sy = y - y0;
          for (let i = 0; i < width; i++) {
            const x = Math.max(0, Math.min(previous.width - 1, (i + 0.5) * previous.width / width - 0.5));
            const x0 = Math.floor(x), x1 = Math.min(x0 + 1, previous.width - 1), sx = x - x0;
            for (const name of ['u', 'v', 'dye', 'pressure']) {
              const field = previous[name];
              this[name][j * width + i] =
                (field[y0 * previous.width + x0] * (1 - sx) + field[y0 * previous.width + x1] * sx) * (1 - sy)
                + (field[y1 * previous.width + x0] * (1 - sx) + field[y1 * previous.width + x1] * sx) * sy;
            }
          }
        }
      }
      this.surface.width = width; this.surface.height = height;
      this.image = this.surfaceContext.createImageData(width, height);
    }

    clear() {
      for (const name of ['u', 'v', 'nextU', 'nextV', 'dye', 'nextDye', 'curl', 'divergence', 'pressure', 'nextPressure']) this[name].fill(0);
    }

    splat(x, y, dx, dy, strength, radius) {
      const w = this.width, h = this.height;
      const cx = Math.max(0, Math.min(w - 1, x * w - 0.5));
      const cy = Math.max(0, Math.min(h - 1, y * h - 0.5));
      const variance = Math.max(1.2, radius * h * h);
      const reach = Math.ceil(Math.sqrt(variance) * 2.8);
      const scale = h / 144;
      dx = Math.max(-250, Math.min(250, dx)) * scale;
      dy = Math.max(-250, Math.min(250, dy)) * scale;
      for (let j = Math.max(0, Math.floor(cy - reach)); j <= Math.min(h - 1, Math.ceil(cy + reach)); j++) {
        for (let i = Math.max(0, Math.floor(cx - reach)); i <= Math.min(w - 1, Math.ceil(cx + reach)); i++) {
          const weight = Math.exp(-((i - cx) ** 2 + (j - cy) ** 2) / variance);
          const k = j * w + i;
          this.u[k] += dx * weight; this.v[k] += dy * weight;
          this.dye[k] = Math.min(12, this.dye[k] + strength * weight);
        }
      }
    }

    advect(source, destination, dt, decay) {
      const w = this.width, h = this.height, u = this.u, v = this.v;
      const damping = Math.exp(-decay * dt);
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const k = j * w + i;
          const x = Math.max(0, Math.min(w - 1.001, i - dt * u[k]));
          const y = Math.max(0, Math.min(h - 1.001, j - dt * v[k]));
          const x0 = x | 0, y0 = y | 0, sx = x - x0, sy = y - y0;
          const a = y0 * w + x0, b = a + w;
          destination[k] = ((source[a] * (1 - sx) + source[a + 1] * sx) * (1 - sy)
            + (source[b] * (1 - sx) + source[b + 1] * sx) * sy) * damping;
        }
      }
    }

    step(dt) {
      const w = this.width, h = this.height;
      this.advect(this.u, this.nextU, dt, 0.32);
      this.advect(this.v, this.nextV, dt, 0.32);
      [this.u, this.nextU] = [this.nextU, this.u];
      [this.v, this.nextV] = [this.nextV, this.v];
      const u = this.u, v = this.v, curl = this.curl, divergence = this.divergence;

      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const k = j * w + i, l = i ? k - 1 : k, r = i < w - 1 ? k + 1 : k;
          const b = j ? k - w : k, t = j < h - 1 ? k + w : k;
          curl[k] = 0.5 * (v[r] - v[l] - u[t] + u[b]);
        }
      }
      for (let j = 1; j < h - 1; j++) {
        for (let i = 1; i < w - 1; i++) {
          const k = j * w + i;
          const fx = 0.5 * (Math.abs(curl[k + w]) - Math.abs(curl[k - w]));
          const fy = 0.5 * (Math.abs(curl[k + 1]) - Math.abs(curl[k - 1]));
          const force = 28 * curl[k] * dt / (Math.hypot(fx, fy) + 0.0001);
          u[k] = Math.max(-350, Math.min(350, u[k] + fx * force));
          v[k] = Math.max(-350, Math.min(350, v[k] - fy * force));
        }
      }
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const k = j * w + i;
          const l = i ? u[k - 1] : -u[k], r = i < w - 1 ? u[k + 1] : -u[k];
          const b = j ? v[k - w] : -v[k], t = j < h - 1 ? v[k + w] : -v[k];
          divergence[k] = 0.5 * (r - l + t - b);
          this.pressure[k] *= 0.8;
        }
      }
      for (let pass = 0; pass < this.iterations; pass++) {
        const p = this.pressure, next = this.nextPressure;
        for (let j = 0; j < h; j++) {
          for (let i = 0; i < w; i++) {
            const k = j * w + i;
            const l = i ? k - 1 : k, r = i < w - 1 ? k + 1 : k;
            const b = j ? k - w : k, t = j < h - 1 ? k + w : k;
            next[k] = (p[l] + p[r] + p[b] + p[t] - divergence[k]) * 0.25;
          }
        }
        [this.pressure, this.nextPressure] = [next, p];
      }
      const p = this.pressure;
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const k = j * w + i;
          u[k] = i === 0 || i === w - 1 ? 0 : u[k] - 0.5 * (p[k + 1] - p[k - 1]);
          v[k] = j === 0 || j === h - 1 ? 0 : v[k] - 0.5 * (p[k + w] - p[k - w]);
        }
      }
      this.advect(this.dye, this.nextDye, dt, 0.42);
      [this.dye, this.nextDye] = [this.nextDye, this.dye];
    }

    render() {
      const w = this.width, h = this.height, data = this.image.data, dye = this.dye;
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const k = j * w + i;
          const dx = (dye[i < w - 1 ? k + 1 : k] - dye[i ? k - 1 : k]) * 2;
          const dy = (dye[j < h - 1 ? k + w : k] - dye[j ? k - w : k]) * 2;
          const light = 0.74 + 0.26 * Math.max(0, (-0.4 * dx + 0.65 * dy + 0.65) / (Math.hypot(dx, dy, 0.65) * 1.258));
          const ink = (1 - Math.exp(-Math.max(0, dye[k]) * 1.25)) * light;
          const pixel = ((h - 1 - j) * w + i) * 4;
          data[pixel] = this.background + ink * this.color[0];
          data[pixel + 1] = this.background + ink * this.color[1];
          data[pixel + 2] = this.background + ink * this.color[2];
          data[pixel + 3] = 255;
        }
      }
      this.surfaceContext.putImageData(this.image, 0, 0);
      this.context.imageSmoothingEnabled = true;
      this.context.imageSmoothingQuality = 'high';
      this.context.drawImage(this.surface, 0, 0, this.canvas.width, this.canvas.height);
    }
  }
  window.ZyberlaneCPUFluid = CPUFluid;
})();
