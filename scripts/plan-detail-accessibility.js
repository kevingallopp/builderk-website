(function () {
  var lightbox = document.getElementById('lightbox');
  var lightboxImage = document.getElementById('lightboxImg');
  var planImage = document.getElementById('planImage');
  if (!lightbox || !lightboxImage || !planImage) return;

  var closeButton = lightbox.querySelector('.close');
  var lastFocusedElement = null;

  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-hidden', 'true');
  lightbox.setAttribute('aria-label', 'Expanded floor plan');
  lightboxImage.alt = lightboxImage.alt || 'Expanded floor plan drawing';

  planImage.setAttribute('role', 'button');
  planImage.setAttribute('tabindex', '0');
  planImage.setAttribute('aria-haspopup', 'dialog');
  planImage.setAttribute('aria-controls', lightbox.id);
  planImage.setAttribute('aria-label', 'Open an expanded view of this floor plan');

  if (closeButton) closeButton.setAttribute('aria-label', 'Close expanded floor plan');

  var originalOpenLightbox = window.openLightbox;
  var originalCloseLightbox = window.closeLightbox;

  window.openLightbox = function (src) {
    lastFocusedElement = document.activeElement;
    if (typeof originalOpenLightbox === 'function') originalOpenLightbox(src);
    lightbox.setAttribute('aria-hidden', 'false');
    if (closeButton) closeButton.focus();
  };

  window.closeLightbox = function () {
    if (!lightbox.classList.contains('open')) return;
    if (typeof originalCloseLightbox === 'function') originalCloseLightbox();
    lightbox.setAttribute('aria-hidden', 'true');
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  };

  planImage.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    var image = planImage.querySelector('img');
    if (image) window.openLightbox(image.src);
  });
})();
