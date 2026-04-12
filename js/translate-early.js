// Runs early in <head> to prevent "flash of English" when a translation is active.
// If a googtrans cookie is set, the page is hidden immediately and translate.js
// will reveal it once the translation has been applied.
(function () {
  try {
    var m = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([^;]+)/);
    if (m && m[1]) {
      document.documentElement.style.opacity = '0';
      // Absolute failsafe: always reveal after 4 s even if translation fails
      setTimeout(function () {
        document.documentElement.style.opacity = '';
      }, 4000);
    }
  } catch (e) {}
})();
