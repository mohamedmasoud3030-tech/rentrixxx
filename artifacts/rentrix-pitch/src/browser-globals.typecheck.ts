// Type-level regression check: ensure browser globals are available in TS compilation.

const title: string = document.title;
const href: string = window.location.href;
const userAgent: string = navigator.userAgent;

// localStorage/sessionStorage should be typed from DOM lib.
localStorage.setItem('rentrix-typecheck', `${title}:${href}:${userAgent}`);
sessionStorage.removeItem('rentrix-typecheck');

// requestAnimationFrame and fetch should be globally typed.
requestAnimationFrame(() => {
  void fetch(window.location.origin);
});
