// Sparks, rings, floating score text and shooting stars. Everything here is
// a plain object in an array — no allocations per frame beyond the spawn.
export class Particles {
  constructor() {
    this.sparks = [];
    this.texts = [];
    this.shooters = [];
    this.shootTimer = 2.5;
  }

  burst(x, y, colour, n, speed = 180) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.85);
      this.sparks.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 40,
        life: 0,
        max: 0.5 + Math.random() * 0.5,
        size: 1.5 + Math.random() * 2.5,
        colour,
      });
    }
  }

  ring(x, y, colour) {
    this.sparks.push({ x, y, vx: 0, vy: 0, life: 0, max: 0.6, size: 4, colour, ring: true });
  }

  // A forge sends a dozen rays outwards along the constellation's own lines.
  rays(x, y, colour, n) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.2;
      this.sparks.push({
        x, y,
        vx: Math.cos(a) * 320,
        vy: Math.sin(a) * 320,
        life: 0,
        max: 0.7,
        size: 3,
        colour,
        ray: true,
      });
    }
  }

  floatText(x, y, text, colour, size = 20) {
    this.texts.push({ x, y, text, colour, size, life: 0, max: 1.1 });
  }

  update(dt, width) {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i];
      p.life += dt;
      if (p.life >= p.max) {
        this.sparks.splice(i, 1);
        continue;
      }
      if (!p.ring && !p.ray) {
        p.vy += 260 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      if (p.ray) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life += dt;
      t.y -= 42 * dt;
      if (t.life >= t.max) this.texts.splice(i, 1);
    }
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = 4 + Math.random() * 6;
      this.shooters.push({
        x: 200 + Math.random() * (width - 400),
        y: 40 + Math.random() * 120,
        vx: 420 + Math.random() * 200,
        vy: 130 + Math.random() * 60,
        life: 0,
        max: 0.9,
      });
    }
    for (let i = this.shooters.length - 1; i >= 0; i--) {
      const s = this.shooters[i];
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.life >= s.max) this.shooters.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.sparks) {
      const k = 1 - p.life / p.max;
      ctx.globalAlpha = k;
      if (p.ring) {
        ctx.strokeStyle = p.colour;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6 + (1 - k) * 90, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.ray) {
        ctx.strokeStyle = p.colour;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.09, p.y - p.vy * 0.09);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.colour;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.4, p.size * k), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (const s of this.shooters) {
      const k = 1 - s.life / s.max;
      const grad = ctx.createLinearGradient(s.x, s.y, s.x - 90, s.y - 28);
      grad.addColorStop(0, `rgba(255, 255, 255, ${0.85 * k})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - 90, s.y - 28);
      ctx.stroke();
    }
    for (const t of this.texts) {
      const k = 1 - t.life / t.max;
      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.font = `bold ${t.size}px "Trebuchet MS", Verdana, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = t.colour;
      ctx.shadowColor = t.colour;
      ctx.shadowBlur = 12;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
}
