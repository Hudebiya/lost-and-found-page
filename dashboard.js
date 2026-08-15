const itemsGrid = document.getElementById('itemsGrid');
const loadingText = document.getElementById('loadingText');
const welcomeText = document.getElementById('welcomeText');
const logoutBtn = document.getElementById('logoutBtn');
const filterBtns = document.querySelectorAll('.filter-btn');

let currentUser = null;
let allItems = [];
let currentFilter = 'all';

// ==========================================================
// AUTH CHECK - redirect to login if not signed in
// ==========================================================
(async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    currentUser = session.user;
    welcomeText.textContent = `Hi, ${currentUser.user_metadata?.full_name || currentUser.email}`;

    loadItems();
})();

// ==========================================================
// LOGOUT
// ==========================================================
logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
});

// ==========================================================
// LOAD ITEMS (only approved ones: lost, found, resolved — not pending)
// ==========================================================
async function loadItems() {
    const { data, error } = await supabaseClient
        .from('items')
        .select('*')
        .in('status',['approved', 'resolved'])
        .order('created_at', { ascending: false });

    if (error) {
        itemsGrid.innerHTML = `<p class="loading-text">Failed to load items: ${error.message}</p>`;
        return;
    }

    allItems = data;
    renderItems();
}

// ==========================================================
// RENDER ITEMS (respects current filter)
// ==========================================================
// RENDER ITEMS block — filter aur badge logic type/status dono use karega
function renderItems() {
    const filtered = currentFilter === 'all'
        ? allItems
        : currentFilter === 'resolved'
            ? allItems.filter(item => item.status === 'resolved')
            : allItems.filter(item => item.type === currentFilter && item.status !== 'resolved');

    if (filtered.length === 0) {
        itemsGrid.innerHTML = `<p class="loading-text">No items found.</p>`;
        return;
    }

    itemsGrid.innerHTML = filtered.map(item => {
        const isOwner = currentUser && item.user_id === currentUser.id;
        const canResolve = isOwner && item.status !== 'resolved';
        const badgeClass = item.status === 'resolved' ? 'resolved' : item.type;
        const badgeText = item.status === 'resolved' ? 'resolved' : item.type;

        return `
            <div class="item-card">
                <span class="status-badge ${badgeClass}">${badgeText}</span>
                <img src="${item['img-url'] || 'https://via.placeholder.com/300x160?text=No+Image'}" class="item-card-img" alt="${item.title}">
                <div class="item-card-body">
                    <h5>${escapeHtml(item.title || 'Untitled')}</h5>
                    <p>${escapeHtml(item.description || '')}</p>
                    <div class="item-meta">
                        <i class="fas fa-map-marker-alt"></i>${escapeHtml(item.location || 'N/A')}
                    </div>
                    ${canResolve
                        ? `<button class="resolve-btn" data-id="${item.id}">Mark as Resolved</button>`
                        : ''
                    }
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.resolve-btn').forEach(btn => {
        btn.addEventListener('click', () => markResolved(btn.dataset.id, btn));
    });
}

// ==========================================================
// MARK AS RESOLVED
// ==========================================================
async function markResolved(itemId, btn) {
    btn.disabled = true;
    btn.textContent = 'Updating...';

    const { error } = await supabaseClient
        .from('items')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', itemId);

    if (error) {
        Swal.fire('Error', error.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Mark as Resolved';
        return;
    }

    Swal.fire('Done!', 'Item marked as resolved.', 'success');
    loadItems();
}

// ==========================================================
// FILTER TABS
// ==========================================================
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderItems();
    });
});

// ==========================================================
// SIMPLE HTML ESCAPE (prevent broken layout from special chars)
// ==========================================================
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}