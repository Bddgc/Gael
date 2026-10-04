'use strict';
// Small, interruptible idle scenes. Timers are injectable for deterministic tests.
class GaelTricks {
  static durations = { butterfly: 7200, katana: 6200, mask: 5200 };
  constructor({ canRun, show, random = Math.random, later = (fn, delay) => setTimeout(fn, delay), cancel = id => clearTimeout(id) }) {
    Object.assign(this, { canRun, show, random, later, cancel });
    this.timer = null; this.last = null; this.current = null; this.disposed = false;
  }
  schedule(delay = 18000 + this.random() * 20000) {
    this.cancel(this.timer);
    if (this.disposed) return;
    this.timer = this.later(() => this.play(), delay);
  }
  play(requested) {
    if (this.disposed) return false;
    if (requested && !Object.hasOwn(GaelTricks.durations, requested)) return false;
    if (this.current) return false;
    if (!this.canRun()) { this.schedule(); return false; }
    const choices = Object.keys(GaelTricks.durations).filter(name => name !== this.last);
    const name = requested || choices[Math.min(choices.length - 1, Math.floor(this.random() * choices.length))];
    this.cancel(this.timer);
    this.current = this.last = name; this.show(name);
    this.timer = this.later(() => { this.current = null; this.show(null); this.schedule(); }, GaelTricks.durations[name]);
    return true;
  }
  interrupt() {
    this.cancel(this.timer); this.current = null; this.show(null); this.schedule();
  }
  dispose() {
    this.disposed = true; this.cancel(this.timer); this.current = null; this.show(null);
  }
}
if (typeof module !== 'undefined') module.exports = GaelTricks;
else window.GaelTricks = GaelTricks;
