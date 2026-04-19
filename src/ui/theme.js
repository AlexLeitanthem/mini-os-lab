// src/ui/theme.js

class ThemeUI {
  static prefersReducedMotion() {
    return typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  static bindResetSession(buttonId) {
    if (typeof document === "undefined") {
      return;
    }

    const button = document.getElementById(buttonId);
    if (!button) {
      return;
    }

    button.addEventListener("click", () => {
      try {
        window.localStorage.clear();
      } catch (error) {
        // Ignore storage failures; reload still resets the in-memory session.
      }
      window.location.reload();
    });
  }
}

if (typeof window !== "undefined") {
  window.ThemeUI = ThemeUI;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = ThemeUI;
}

