// src/utils/dropdown-boundary.js
// Utility: ensures all Bootstrap dropdowns use the window as the boundary to avoid being clipped.
// Import and call this function once after DOM loaded.
export function initDropdownBoundary() {
  // Select all dropdown toggle buttons (Bootstrap convention)
  const dropdownToggles = document.querySelectorAll('[data-bs-toggle="dropdown"]');
  dropdownToggles.forEach(btn => {
    // Set boundary to window if not already set
    if (!btn.dataset.bsBoundary) {
      btn.dataset.bsBoundary = 'window';
    }
  });
}
