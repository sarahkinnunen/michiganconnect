// Google Translate init — called by Google's script via ?cb=googleTranslateElementInit
function revealPage() {
  document.documentElement.style.transition = 'opacity 0.25s';
  document.documentElement.style.opacity = '';
}

function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: 'en',
    includedLanguages: 'ar,es,zh-CN',
    autoDisplay: false
  }, 'google_translate_element');

  // If a language cookie is already set from a previous page, apply it now
  var saved = getGoogTransCookie();
  if (saved && saved !== 'en') {
    var tries = 0;
    (function applyOnLoad() {
      var combo = document.querySelector('.goog-te-combo');
      if (combo) {
        combo.value = saved;
        combo.dispatchEvent(new Event('change'));
        // Reveal after Google Translate has had time to apply the translation
        setTimeout(revealPage, 800);
      } else if (tries++ < 30) {
        setTimeout(applyOnLoad, 150);
      } else {
        revealPage(); // Combo never appeared— show page anyway
      }
    })();
  }
}

// Read language from the googtrans cookie
function getGoogTransCookie() {
  var m = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([^;]+)/);
  return m ? m[1] : null;
}

// Write the googtrans cookie so translation persists across pages
function setGoogTransCookie(lang) {
  var val = lang === 'en' ? '' : '/en/' + lang;
  var domains = [location.hostname, '.' + location.hostname];
  domains.forEach(function(d) {
    document.cookie = 'googtrans=' + val + '; path=/; domain=' + d;
  });
  document.cookie = 'googtrans=' + val + '; path=/';
}

// Trigger translation; retries until the Google widget combo is ready
function triggerTranslate(lang) {
  closeTranslateMenu();
  if (lang === 'en') {
    // Clear cookies and reload to restore original English
    var domains = [location.hostname, '.' + location.hostname];
    domains.forEach(function(d) {
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + d;
    });
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    location.reload();
    return;
  }
  setGoogTransCookie(lang);
  var tries = 0;
  (function attempt() {
    var combo = document.querySelector('.goog-te-combo');
    if (combo) {
      combo.value = lang;
      combo.dispatchEvent(new Event('change'));
    } else if (tries++ < 20) {
      setTimeout(attempt, 100);
    }
  })();
}

function toggleTranslateMenu() {
  var menu = document.getElementById('translate-menu');
  if (!menu) return;
  var isOpen = menu.classList.contains('is-open');
  menu.classList.toggle('is-open', !isOpen);
  document.getElementById('translate-btn').setAttribute('aria-expanded', String(!isOpen));
}

function closeTranslateMenu() {
  var menu = document.getElementById('translate-menu');
  if (menu) menu.classList.remove('is-open');
  var btn = document.getElementById('translate-btn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

// Force-remove Google's injected toolbar banner on any DOM change
(function suppressTranslateBanner() {
  function hideBanner() {
    document.body.style.top = '0';
    document.documentElement.style.top = '0';
    var els = document.querySelectorAll('.goog-te-banner-frame, .skiptranslate');
    els.forEach(function(el) { el.style.display = 'none'; });
  }
  hideBanner();
  var observer = new MutationObserver(hideBanner);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
})();

// Close menu when clicking outside
document.addEventListener('click', function(e) {
  var wrapper = document.getElementById('translate-wrapper');
  if (wrapper && !wrapper.contains(e.target)) closeTranslateMenu();
});
