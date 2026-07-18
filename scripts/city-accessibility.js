(function () {
  'use strict';

  function initializeCityPageAccessibility() {
    if (window.lucide) window.lucide.createIcons();
    document.querySelectorAll('.faq-q').forEach(function (question, index) {
      var answer = question.nextElementSibling;
      if (!answer || !answer.classList.contains('faq-a')) return;

      var answerId = answer.id || 'city-faq-answer-' + (index + 1);
      answer.id = answerId;
      question.removeAttribute('onclick');
      question.setAttribute('role', 'button');
      question.setAttribute('tabindex', '0');
      question.setAttribute('aria-controls', answerId);
      question.setAttribute('aria-expanded', 'false');

      function toggleQuestion() {
        var item = question.closest('.faq-item');
        var isOpen = item.classList.toggle('open');
        question.setAttribute('aria-expanded', String(isOpen));
      }

      question.addEventListener('click', toggleQuestion);
      question.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleQuestion();
        }
      });
    });

    var menuButton = document.querySelector('.nav-hamburger');
    var menu = document.querySelector('.nav-links');
    if (menuButton && menu) {
      if (!menu.id) menu.id = 'city-primary-navigation';
      menuButton.setAttribute('aria-controls', menu.id);
      function updateMenuState() {
        var isOpen = menu.classList.contains('open') || menu.classList.contains('show');
        menuButton.setAttribute('aria-expanded', String(isOpen));
        menuButton.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
      }
      updateMenuState();
      new MutationObserver(updateMenuState).observe(menu, { attributes: true, attributeFilter: ['class'] });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCityPageAccessibility);
  } else {
    initializeCityPageAccessibility();
  }
})();
