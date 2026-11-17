// Mouse and keyboard, in canvas coordinates. The mouse steers the chalice;
// arrow keys (or A/D) do the same for keyboards. Click starts and restarts.
//
// Two key sets: `keys` is what is held down right now (for movement);
// `pressed` is an edge-triggered queue — a key lands there on keydown and
// stays until the game consumes it, so even a very quick tap (or a scripted
// key press) is never lost between frames.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.mouseX = 640;
    this.mouseY = 600;
    this.mouseInside = false;
    this.clicked = false;
    this.keys = new Set();
    this.pressed = new Set();
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - r.left) / r.width) * canvas.width;
      this.mouseY = ((e.clientY - r.top) / r.height) * canvas.height;
      this.mouseInside = true;
    });
    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.clicked = true;
      const r = canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - r.left) / r.width) * canvas.width;
      this.mouseY = ((e.clientY - r.top) / r.height) * canvas.height;
    });
    window.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.key)) e.preventDefault();
      const k = e.key.toLowerCase();
      this.keys.add(k);
      this.pressed.add(k);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
  }

  consumeClick() {
    const c = this.clicked;
    this.clicked = false;
    return c;
  }

  consumeKey(key) {
    const k = key.toLowerCase();
    if (this.pressed.has(k)) {
      this.pressed.delete(k);
      return true;
    }
    return false;
  }

  moveDirection() {
    let d = 0;
    if (this.keys.has('arrowleft') || this.keys.has('a')) d -= 1;
    if (this.keys.has('arrowright') || this.keys.has('d')) d += 1;
    return d;
  }
}
