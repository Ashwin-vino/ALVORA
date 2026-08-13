document.addEventListener('DOMContentLoaded', () => {
    // 1. Product Page Quantity Stepper
    const qtyDecrement = document.getElementById('qtyDecrement');
    const qtyIncrement = document.getElementById('qtyIncrement');
    const quantityInput = document.getElementById('quantityInput');

    if (qtyDecrement && qtyIncrement && quantityInput) {
        qtyDecrement.addEventListener('click', () => {
            let val = parseInt(quantityInput.value, 10);
            if (val > 1) {
                quantityInput.value = val - 1;
            }
        });
        
        qtyIncrement.addEventListener('click', () => {
            let val = parseInt(quantityInput.value, 10);
            let max = parseInt(quantityInput.getAttribute('max') || '10', 10);
            if (val < max) {
                quantityInput.value = val + 1;
            }
        });
    }

    // 2. Checkout / Buy Now Page & Cart Page Quantity Stepper & Price Calculation
    document.body.addEventListener('click', async (e) => {
        // Find if it's a decrease or increase button inside a form
        const isDecrease = e.target.matches('.qty-btn.decrease, .checkout-qty-btn.decrease') || (e.target.name === 'action' && e.target.value === 'decrease');
        const isIncrease = e.target.matches('.qty-btn.increase, .checkout-qty-btn.increase') || (e.target.name === 'action' && e.target.value === 'increase');

        if (isDecrease || isIncrease) {
            const form = e.target.closest('form.update-qty-form, form.checkout-qty-form');
            if (form) {
                e.preventDefault(); // Prevent standard form submission
                
                const wrapper = e.target.closest('.item-row, .mini-item-row');
                const qtyInput = form.querySelector('input[name="quantity"]');
                
                if (qtyInput && wrapper) {
                    let val = parseInt(qtyInput.value, 10);
                    let action = isDecrease ? 'decrease' : 'increase';
                    
                    if (isDecrease && val > 1) {
                        qtyInput.value = val - 1;
                        await submitQuantity(form, wrapper, action);
                    } else if (isIncrease && val < 99) {
                        qtyInput.value = val + 1;
                        await submitQuantity(form, wrapper, action);
                    }
                }
            }
        }
    });

    async function submitQuantity(form, wrapper, action) {
        const formData = new FormData(form);
        formData.append('action', action);

        const data = new URLSearchParams();
        for (const pair of formData) {
            data.append(pair[0], pair[1]);
        }

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: data
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.cart) {
                    // Update the specific item's total line price dynamically
                    const itemId = formData.get('itemId');
                    const updatedItem = result.cart.items.find(i => String(i.id) === String(itemId) || String(i._id) === String(itemId));
                    if (updatedItem && updatedItem.product) {
                        const priceDisplays = wrapper.querySelectorAll('.mini-item-price, .item-total-price');
                        priceDisplays.forEach(display => {
                            const newPrice = (updatedItem.product.price * updatedItem.quantity);
                            display.textContent = '$' + newPrice.toLocaleString('en-US', { minimumFractionDigits: 2 });
                        });
                    }

                    // Update Subtotals and Totals on page
                    document.querySelectorAll('.summary-row:not(.discount-row):not(.total-row) span:last-child').forEach(el => {
                        if (result.cart.subtotalAmount !== undefined) {
                            el.textContent = '$' + result.cart.subtotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 });
                        }
                    });

                    document.querySelectorAll('.total-amount').forEach(el => {
                        if (result.cart.finalAmount !== undefined) {
                            el.textContent = '$' + result.cart.finalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 });
                        }
                    });
                    
                    // Update header cart count
                    const cartCountBadge = document.querySelector('.badge-count.cart-count');
                    if (cartCountBadge) {
                        const count = result.cart.items.reduce((acc, it) => acc + it.quantity, 0);
                        cartCountBadge.textContent = count;
                    }
                }
            } else {
                window.location.reload();
            }
        } catch (err) {
            console.error('Update failed', err);
            window.location.reload();
        }
    }
});
