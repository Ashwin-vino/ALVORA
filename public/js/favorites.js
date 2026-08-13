(function () {
  async function toggleFavorite(button) {
    const productId = button.dataset.productId;
    if (!productId || button.disabled) {
      return;
    }

    button.disabled = true;

    try {
      const response = await fetch('/wishlist/toggle', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: new URLSearchParams({ productId }).toString()
      });

      const payload = await response.json();

      if (response.status === 401 && payload.redirectUrl) {
        window.location.assign(payload.redirectUrl);
        return;
      }

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'We could not update your wishlist.');
      }

      button.classList.toggle('is-saved', payload.isAdded);
      button.setAttribute('aria-label', payload.isAdded ? 'Remove from Wishlist' : 'Add to Wishlist');
      button.setAttribute('title', payload.isAdded ? 'Remove from Wishlist' : 'Add to Wishlist');

      const icon = button.querySelector('i');
      if (icon) {
        icon.className = payload.isAdded ? 'ri-heart-fill' : 'ri-heart-line';
      }

      document.querySelectorAll('.wishlist-count').forEach((count) => {
        count.textContent = payload.count ?? 0;
      });
    } catch (error) {
      console.error('Wishlist toggle failed:', error);
      window.alert(error.message || 'We could not update your wishlist.');
    } finally {
      button.disabled = false;
    }
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('.wishlist-heart-btn, .btn-wishlist-toggle');
    if (button) {
      event.preventDefault();
      toggleFavorite(button);
    }
  });
}());
