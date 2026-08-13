/**
 * ALVORA MAISON — NAVBAR & NAVIGATION INTERACTION CONTROLLER
 * Vanilla JavaScript implementation for Sticky Header, Mobile Drawer, Search Toggle,
 * Active Route Highlighting, and Smooth Scrolling.
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // DOM Elements Selection
  const navbar = document.querySelector('.navbar-header') || document.querySelector('.navbar') || document.querySelector('header');
  const mobileToggleBtn = document.getElementById('mobileMenuToggle') || document.querySelector('.mobile-menu-btn') || document.querySelector('.nav-toggle');
  const mobileMenuDrawer = document.getElementById('mobileNavDrawer') || document.querySelector('.mobile-nav-drawer') || document.querySelector('.mobile-menu') || document.querySelector('.nav-menu');
  const mobileMenuCloseBtn = document.getElementById('mobileNavClose') || document.querySelector('.mobile-nav-close') || document.querySelector('.mobile-menu-close');
  const navOverlay = document.getElementById('mobileNavOverlay') || document.querySelector('.mobile-nav-overlay') || document.querySelector('.nav-overlay');
  const searchToggleBtn = document.getElementById('searchToggleBtn') || document.querySelector('.search-trigger-btn') || document.querySelector('.search-toggle-btn');
  const searchBarContainer = document.getElementById('searchOverlay') || document.querySelector('.search-overlay') || document.querySelector('.search-bar-container') || document.querySelector('.nav-search-overlay');
  const searchInput = searchBarContainer ? searchBarContainer.querySelector('.search-input') || searchBarContainer.querySelector('.nav-search-input') : null;
  const searchCloseBtn = document.getElementById('searchCloseBtn') || document.querySelector('.search-close-btn');
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link, .mobile-nav-list a, .nav-item a');

  /**
   * 1. STICKY NAVBAR SCROLL CONTROLLER
   * Adds scrolled state class for elevation and dynamic opacity shifts.
   */
  function initStickyNavbar() {
    if (!navbar) return;

    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > 20) {
        navbar.classList.add('navbar-scrolled');
      } else {
        navbar.classList.remove('navbar-scrolled');
      }

      // Hide/Show navbar on downward/upward scroll for luxury floating effect
      if (currentScrollY > 150 && currentScrollY > lastScrollY && !document.body.classList.contains('menu-open')) {
        navbar.classList.add('navbar-hidden');
      } else {
        navbar.classList.remove('navbar-hidden');
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Trigger initial state
  }

  /**
   * 2. MOBILE MENU DRAWER CONTROLLER
   * Controls drawer opening, closing, body scroll lock, and accessibility states.
   */
  function initMobileMenu() {
    if (!mobileToggleBtn || !mobileMenuDrawer) return;

    const openMenu = () => {
      mobileMenuDrawer.classList.add('active');
      mobileToggleBtn.classList.add('is-active');
      if (navOverlay) navOverlay.classList.add('active');
      document.body.classList.add('menu-open');
      document.body.style.overflow = 'hidden';
      mobileToggleBtn.setAttribute('aria-expanded', 'true');
      mobileMenuDrawer.setAttribute('aria-hidden', 'false');
      const focusable = mobileMenuDrawer.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (focusable.length) focusable[0].focus();
    };

    const closeMenu = () => {
      mobileMenuDrawer.classList.remove('active');
      mobileToggleBtn.classList.remove('is-active');
      if (navOverlay) navOverlay.classList.remove('active');
      document.body.classList.remove('menu-open');
      document.body.style.overflow = '';
      mobileToggleBtn.setAttribute('aria-expanded', 'false');
      mobileMenuDrawer.setAttribute('aria-hidden', 'true');
      mobileToggleBtn.focus();
    };

    mobileToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = mobileMenuDrawer.classList.contains('active');
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    if (mobileMenuCloseBtn) {
      mobileMenuCloseBtn.addEventListener('click', closeMenu);
    }

    if (navOverlay) {
      navOverlay.addEventListener('click', closeMenu);
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenuDrawer.classList.contains('active')) {
        closeMenu();
      }
    });

    document.addEventListener('click', (e) => {
      if (!mobileMenuDrawer.classList.contains('active')) return;
      const clickedInsideDrawer = mobileMenuDrawer.contains(e.target);
      const clickedToggle = mobileToggleBtn.contains(e.target);
      if (!clickedInsideDrawer && !clickedToggle) {
        closeMenu();
      }
    });

    // Close mobile menu when window is resized above tablet breakpoint
    window.addEventListener('resize', () => {
      if (window.innerWidth > 992 && mobileMenuDrawer.classList.contains('active')) {
        closeMenu();
      }
    });
  }

  /**
   * 3. SEARCH OVERLAY & TOGGLE CONTROLLER
   * Expandable search bar with immediate input focus and Escape dismiss.
   */
  function initSearchToggle() {
    if (!searchToggleBtn || !searchBarContainer) return;

    const openSearch = () => {
      searchBarContainer.classList.add('active');
      document.body.classList.add('search-open');
      searchToggleBtn.setAttribute('aria-expanded', 'true');
      searchBarContainer.setAttribute('aria-hidden', 'false');
      if (searchInput) {
        setTimeout(() => searchInput.focus(), 150);
      }
    };

    const closeSearch = () => {
      searchBarContainer.classList.remove('active');
      document.body.classList.remove('search-open');
      searchToggleBtn.setAttribute('aria-expanded', 'false');
      searchBarContainer.setAttribute('aria-hidden', 'true');
      if (searchInput) {
        searchInput.blur();
      }
      searchToggleBtn.focus();
    };

    searchToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = searchBarContainer.classList.contains('active');
      if (isOpen) {
        closeSearch();
      } else {
        openSearch();
      }
    });

    if (searchCloseBtn) {
      searchCloseBtn.addEventListener('click', closeSearch);
    }

    document.addEventListener('click', (e) => {
      if (!searchBarContainer.classList.contains('active')) return;
      const clickedInside = searchBarContainer.contains(e.target);
      const clickedToggle = searchToggleBtn.contains(e.target);
      if (!clickedInside && !clickedToggle) {
        closeSearch();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && searchBarContainer.classList.contains('active')) {
        closeSearch();
      }
    });
  }

  /**
   * 4. ACTIVE LINK HIGHLIGHTING
   * Highlights menu items matching current URL pathname.
   */
  function initActiveLinkHighlight() {
    if (!navLinks.length) return;

    const currentPath = window.location.pathname;

    navLinks.forEach((link) => {
      const linkPath = link.getAttribute('href');
      if (!linkPath) return;

      // Match exact path or sub-routes for collections
      if (
        linkPath === currentPath ||
        (linkPath !== '/' && currentPath.startsWith(linkPath))
      ) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });
  }

  /**
   * 5. SMOOTH SCROLLING FOR INTERNAL ANCHORS
   * Clean ease-in-out smooth scrolling for in-page anchors.
   */
  function initSmoothScrolling() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]:not([href="#"])');

    anchorLinks.forEach((anchor) => {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);

        if (targetElement) {
          e.preventDefault();

          // Account for fixed navbar height
          const navbarHeight = navbar ? navbar.offsetHeight : 0;
          const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navbarHeight;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });

          // If inside mobile drawer, close it after clicking link
          if (mobileMenuDrawer && mobileMenuDrawer.classList.contains('active')) {
            mobileMenuDrawer.classList.remove('active');
            if (navOverlay) navOverlay.classList.remove('active');
            document.body.style.overflow = '';
          }
        }
      });
    });
  }

  /**
   * 6. COLLECTION FILTER DRAWER
   * The collection template supplies a compact filter trigger on smaller
   * screens. Keep the interaction here with the other shared drawers.
   */
  function initCollectionFilterDrawer() {
    const filterToggleBtn = document.getElementById('filterDrawerBtn');
    const filterSidebar = document.getElementById('filterSidebar');
    const filterCloseBtn = document.getElementById('closeFilterBtn');

    if (!filterToggleBtn || !filterSidebar) return;

    const closeFilter = () => {
      filterSidebar.classList.remove('active');
      filterToggleBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('filter-open');
    };

    const openFilter = () => {
      filterSidebar.classList.add('active');
      filterToggleBtn.setAttribute('aria-expanded', 'true');
      document.body.classList.add('filter-open');
      const firstControl = filterSidebar.querySelector('a, button, input, select');
      if (firstControl) firstControl.focus();
    };

    filterToggleBtn.setAttribute('aria-expanded', 'false');
    filterToggleBtn.addEventListener('click', () => {
      if (filterSidebar.classList.contains('active')) {
        closeFilter();
      } else {
        openFilter();
      }
    });

    if (filterCloseBtn) filterCloseBtn.addEventListener('click', closeFilter);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && filterSidebar.classList.contains('active')) closeFilter();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 800) closeFilter();
    });
  }

  // Initialize all navigation module functions
  initStickyNavbar();
  initMobileMenu();
  initSearchToggle();
  initActiveLinkHighlight();
  initSmoothScrolling();
  initCollectionFilterDrawer();
});
