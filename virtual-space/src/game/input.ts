const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

export class InputManager {
  private keys = new Set<string>();
  private spacePressed = false;
  private _enabled = true;
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    this.onKeyDown = (e: KeyboardEvent) => {
      if (ARROW_KEYS.has(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        this.keys.add(e.key);
        return;
      }
      if (e.code === "Space") {
        const tag = (document.activeElement?.tagName ?? "").toUpperCase();
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (!this._enabled) return;
        e.preventDefault();
        e.stopPropagation();
        this.spacePressed = true;
      }
    };
    this.onKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.key);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("keydown", this.onKeyDown, { capture: true });
      window.addEventListener("keyup", this.onKeyUp, { capture: true });
    }
  }

  get enabled() {
    return this._enabled;
  }
  set enabled(v: boolean) {
    this._enabled = v;
    if (!v) {
      this.keys.clear();
      this.spacePressed = false;
    }
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

  consumeSpacePress(): boolean {
    if (!this.spacePressed) return false;
    this.spacePressed = false;
    return true;
  }

  destroy() {
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", this.onKeyDown, { capture: true });
      window.removeEventListener("keyup", this.onKeyUp, { capture: true });
    }
    this.keys.clear();
    this.spacePressed = false;
  }
}
