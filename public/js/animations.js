/**
 * ALVORA MAISON — GLOBAL MOTION & ANIMATION CONTROLLER
 * Vanilla JavaScript module for Intersection Observer Scroll Triggers, Staggered Entrance
 * Animations, Magnetic Luxury Button Hover Effects, Subtle Image Zoom/Tilt, and Scroll Progress Line.
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  /**
   * 1. INTERSECTION OBSERVER FOR SCROLL-TRIGGERED ENTRANCE ANIMATIONS
   */
  function initScrollTriggerObserver() {
    const animatedElements = document.querySelectorAll(
      '.reveal, .fade-up, .fade-down, .fade-in, .fade-left, .fade-right, .scale-up, .stagger-container'
    );

    if (!animatedElements.length) return;

    if ('IntersectionObserver' in window) {
      const observerOptions = {
        root: null, // Viewport
        rootMargin: '0px 0px -60px 0px', // Trigger slightly before element reaches view center
        threshold: 0.12
      };

      const animationObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target;

            // Handle Staggered Grid Item Animations
            if (target.classList.contains('stagger-container')) {
              const children = target.querySelectorAll('.stagger-item, .product-card, .category-card');
              children.forEach((child, index) => {
                setTimeout(() => {
                  child.classList.add('is-visible', 'animated');
                }, index * 80); // 80ms delay increment for staggered editorial feel
              });
            }

            target.classList.add('is-visible', 'animated');
            observer.unobserve(target); // Unobserve once animated for performance
          }
        });
      }, observerOptions);

      animatedElements.forEach((el) => animationObserver.observe(el));
    } else {
      // Fallback for older browsers without IntersectionObserver
      animatedElements.forEach((el) => el.classList.add('is-visible', 'animated'));
    }
  }

  /**
   * 2. SCROLL PROGRESS INDICATOR BAR
   * Calculates scroll depth and updates luxury golden top progress line.
   */
  function initScrollProgressBar() {
    let progressBar = document.querySelector('.scroll-progress-bar');

    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.className = 'scroll-progress-bar';
      document.body.appendChild(progressBar);
    }

    const updateScrollProgress = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progressPercent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

      progressBar.style.width = `${progressPercent}%`;
    };

    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    updateScrollProgress();
  }

  /**
   * 3. MAGNETIC BUTTON HOVER EFFECT
   * Adds an organic magnetic attraction cursor tracking for primary luxury buttons.
   */
  function initMagneticButtons() {
    const magneticBtns = document.querySelectorAll('.btn-magnetic, .btn-primary, .btn-gold');

    // Only enable magnetic movement on desktop pointer devices
    if (window.matchMedia('(pointer: coarse)').matches) return;

    magneticBtns.forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
        btn.style.transition = 'transform 0.1s cubic-bezier(0.25, 1, 0.5, 1)';
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate(0px, 0px)';
        btn.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      });
    });
  }

  /**
   * 4. SUBTLE TILT & ZOOM FOR EDITORIAL & PRODUCT CARDS
   */
  function initProductCardHoverEffects() {
    const cards = document.querySelectorAll('.product-card, .editorial-card, .hero-slide');

    if (window.matchMedia('(pointer: coarse)').matches) return;

    cards.forEach((card) => {
      const img = card.querySelector('.product-image, .editorial-img, .hero-img');
      if (!img) return;

      card.addEventListener('mouseenter', () => {
        img.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        img.style.transform = 'scale(1.04)';
      });

      card.addEventListener('mouseleave', () => {
        img.style.transform = 'scale(1)';
      });
    });
  }

  /**
   * 5. SCROLL PARALLAX EFFECT FOR EDITORIAL BANNERS
   */
  function initParallaxBanners() {
    const parallaxBanners = document.querySelectorAll('.parallax-banner, .hero-parallax');

    if (!parallaxBanners.length || window.matchMedia('(pointer: coarse)').matches) return;

    const handleParallax = () => {
      const scrollTop = window.pageYOffset;

      parallaxBanners.forEach((banner) => {
        const rect = banner.getBoundingClientRect();
        // Only compute if banner is visible in viewport
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          const speed = parseFloat(banner.dataset.parallaxSpeed) || 0.15;
          const yPos = (scrollTop - banner.offsetTop) * speed;
          const innerImg = banner.querySelector('img, .parallax-bg');

          if (innerImg) {
            innerImg.style.transform = `translate3d(0, ${yPos}px, 0)`;
          }
        }
      });
    };

    window.addEventListener('scroll', handleParallax, { passive: true });
  }

  // Initialize Motion Modules
  initScrollTriggerObserver();
  initScrollProgressBar();
  initMagneticButtons();
  initProductCardHoverEffects();
  initParallaxBanners();
});