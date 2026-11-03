// Spring integrated per frame. Keeps its velocity when the target changes
// mid-flight, which is what makes a lens or an icon feel liquid when touched.
// Ported from melriver.com.
export class Spring {
  value: number
  target: number
  velocity = 0
  constructor(
    initial: number,
    public stiffness = 320,
    public damping = 26,
    public mass = 1,
  ) {
    this.value = initial
    this.target = initial
  }
  set(v: number) {
    this.value = v
    this.target = v
    this.velocity = 0
  }
  step(dt: number) {
    // sub-step for stability on slow frames
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)))
    const h = dt / steps
    for (let i = 0; i < steps; i++) {
      const force = -this.stiffness * (this.value - this.target) - this.damping * this.velocity
      this.velocity += (force / this.mass) * h
      this.value += this.velocity * h
    }
    return this.value
  }
  get settled() {
    return Math.abs(this.value - this.target) < 0.01 && Math.abs(this.velocity) < 0.01
  }
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
// frame-rate independent damping factor
export const damp = (a: number, b: number, lambda: number, dt: number) => lerp(a, b, 1 - Math.exp(-lambda * dt))

// Runs fn(dt) every frame until it returns false. Returns a stop function.
export function loop(fn: (dt: number, t: number) => boolean | void) {
  let raf = 0
  let last = 0
  const tick = (t: number) => {
    const dt = Math.min(0.05, last ? (t - last) / 1000 : 1 / 60)
    last = t
    if (fn(dt, t) === false) {
      raf = 0
      return
    }
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}
