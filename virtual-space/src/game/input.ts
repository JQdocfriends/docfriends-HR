export class InputManager {
  private keys = new Set<string>();
  private _enabled = true;

  constructor() {
    if (typeof window === "undefined") return;
    window.addEventListener("keydown", (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        this.keys.add(e.key);
      }
    });
    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.key);
    });
  }

  get enabled() {
    return this._enabled;
  }
  set enabled(v: boolean) {
    this._enabled = v;
    if (!v) this.keys.clear();
  }

  getDirection(): { dx: number; dy: number; direction: "up" | "down" | "left" | "right" } | null {
    if (!this._enabled) return null;

    if (this.keys.has("ArrowUp")) {
      return { dx: 0, dy: -1, direction: "up" };
    }
    if (this.keys.has("ArrowDown")) {
      return { dx: 0, dy: 1, direction: "down" };
    }
    if (this.keys.has("ArrowLeft")) {
      return { dx: -1, dy: 0, direction: "left" };
    }
    if (this.keys.has("ArrowRight")) {
      return { dx: 1, dy: 0, direction: "right" };
    }
    return null;
  }
}
