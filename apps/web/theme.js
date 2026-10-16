// Applies the saved theme before the page paints. No choice saved: light.
(function () {
  try {
    var saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") document.documentElement.dataset.theme = saved;
  } catch (error) {
    /* storage unavailable: stay on the light default */
  }
})();
