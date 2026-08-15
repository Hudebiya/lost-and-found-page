const pendingGrid = document.getElementById('pendingGrid');
const allItemsBody = document.getElementById('allItemsBody');
const welcomeText = document.getElementById('welcomeText');
const logoutBtn = document.getElementById('logoutBtn');

// ==========================================================
// AUTH + ADMIN ROLE CHECK
// ==========================================================
(async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('role, full_name')
        .eq('id', session.user.id)
        .single();

    if (error || !profile || profile.role !== 'admin') {
        Swal.fire('Access Denied', 'You are not authorized to view this page.', 'error')
            .then(() => window.location.href = 'dashboard.html');
        return;
    }

    welcomeText.textContent = `Admin: ${profile.full_name || session.user.email}`;
    loadPending();
    loadAllItems();
})();

logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
});

// ==========================================================
// LOAD PENDING REPORTS
// ==========================================================
async function loadPending() {
    const { data, error } = await supabaseClient
        .from('items')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        pendingGrid.innerHTML = `<p class="loading-text">Error: ${error.message}</p>`;
        return;
    }

    if (data.length === 0) {
        pendingGrid.innerHTML = `<p class="loading-text">No pending reports 🎉</p>`;
        return;
    }

    pendingGrid.innerHTML = data.map(item => `
        <div class="pending-card">
            <img src="${item['img-url'] || 'https://via.placeholder.com/300x150?text=No+Image'}" alt="${item.title}">
            <div class="pending-card-body">
                <span class="pending-type-tag ${item.type}">${item.type}</span>
                <h5>${escapeHtml(item.title || 'Untitled')}</h5>
                <p>${escapeHtml(item.description || '')}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(item.location || 'N/A')}</p>
                <div class="action-btns">
                    <button class="approve-btn" data-id="${item.id}">Approve</button>
                    <button class="reject-btn" data-id="${item.id}">Reject</button>
                </div>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.approve-btn').forEach(btn =>
        btn.addEventListener('click', () => updateStatus(btn.dataset.id, 'approved'))
    );
    document.querySelectorAll('.reject-btn').forEach(btn =>
        btn.addEventListener('click', () => updateStatus(btn.dataset.id, 'rejected'))
    );
}

async function updateStatus(id, newStatus) {
    const { error } = await supabaseClient
        .from('items')
        .update({ status: newStatus })
        .eq('id', id);

    if (error) {
        Swal.fire('Error', error.message, 'error');
        return;
    }

    Swal.fire('Done', `Item ${newStatus}.`, 'success');
    loadPending();
    loadAllItems();
}

// ==========================================================
// LOAD ALL ITEMS (management table)
// ==========================================================
async function loadAllItems() {
    const { data, error } = await supabaseClient
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        allItemsBody.innerHTML = `<tr><td colspan="5">Error: ${error.message}</td></tr>`;
        return;
    }

    allItemsBody.innerHTML = data.map(item => `
        <tr>
            <td>${escapeHtml(item.title || 'Untitled')}</td>
            <td>${item.type || '-'}</td>
            <td>${item.status}</td>
            <td>${escapeHtml(item.location || '-')}</td>
            <td><button class="delete-btn" data-id="${item.id}">Delete</button></td>
        </tr>
    `).join('');

    document.querySelectorAll('.delete-btn').forEach(btn =>
        btn.addEventListener('click', () => deleteItem(btn.dataset.id))
    );
}

async function deleteItem(id) {
    const confirm = await Swal.fire({
        title: 'Are you sure?',
        text: 'This will permanently delete the item.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        confirmButtonColor: '#e63946'
    });

    if (!confirm.isConfirmed) return;

    const { error } = await supabaseClient.from('items').delete().eq('id', id);

    if (error) {
        Swal.fire('Error', error.message, 'error');
        return;
    }

    loadPending();
    loadAllItems();
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}