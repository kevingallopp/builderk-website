document.addEventListener('DOMContentLoaded', function () {
  if (window.lucide) window.lucide.createIcons();

  var menuButton = document.querySelector('.mobile-menu');
  var navLinks = document.querySelector('.nav-links');
  if (!menuButton || !navLinks) return;

  if (!navLinks.id) navLinks.id = 'nav-links';
  menuButton.setAttribute('aria-controls', navLinks.id);

  function syncMenuState(isOpen) {
    menuButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    menuButton.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  }

  menuButton.addEventListener('click', function () {
    syncMenuState(navLinks.classList.contains('show'));
  });

  navLinks.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.classList.remove('show');
      syncMenuState(false);
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !navLinks.classList.contains('show')) return;
    navLinks.classList.remove('show');
    syncMenuState(false);
    menuButton.focus();
  });
});
