// ==========================================================
// IMAGE UPLOAD BOX (+ icon click -> file picker -> preview)
// ==========================================================
const imageUploadBox = document.getElementById('imageUploadBox');
const imageInput = document.getElementById('imageInput');
const previewImg = document.getElementById('previewImg');
const removeImgBtn = document.getElementById('removeImgBtn');

let selectedFile = null;

// Click anywhere on the box (except the remove button) opens file picker
imageUploadBox.addEventListener('click', (e) => {
    if (e.target.closest('#removeImgBtn')) return;
    imageInput.click();
});

imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        Swal.fire('Error', 'Please select an image file.', 'error');
        return;
    }

    selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        imageUploadBox.classList.add('has-image');
    };
    reader.readAsDataURL(file);
});

removeImgBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedFile = null;
    imageInput.value = '';
    previewImg.src = '';
    imageUploadBox.classList.remove('has-image');
});

// ==========================================================
// FORM SUBMIT
// ==========================================================
const reportForm = document.getElementById('reportForm');
const submitBtn = document.getElementById('submitBtn');

reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const status = document.querySelector('input[name="itemStatus"]:checked').value; // 'lost' or 'found'
    const title = document.getElementById('itemTitle').value.trim();
    const description = document.getElementById('itemDescription').value.trim();
    const location = document.getElementById('itemLocation').value.trim();
    const contact = document.getElementById('itemContact').value.trim();

    if (!title || !description || !location || !contact) {
        Swal.fire('Error', 'Please fill all fields.', 'error');
        return;
    }

    submitBtn.disabled = true;
    Swal.fire({ title: 'Submitting report...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    // Get current logged-in user (so we know who reported it)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError) {
        Swal.fire('Connection Error', `Could not verify login: ${userError.message}`, 'error');
        submitBtn.disabled = false;
        return;
    }

    if (!user) {
        Swal.fire('Error', 'You must be logged in to report an item.', 'error');
        submitBtn.disabled = false;
        return;
    }

    let imageUrl = null;

    // 1. Upload image to Supabase Storage (if one was selected)
    if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabaseClient
            .storage
            .from('item-images')
            .upload(fileName, selectedFile);

        if (uploadError) {
            Swal.fire('Upload Failed', uploadError.message, 'error');
            submitBtn.disabled = false;
            return;
        }

        // Get the public URL for the uploaded image
        const { data: publicUrlData } = supabaseClient
            .storage
            .from('item-images')
            .getPublicUrl(fileName);

        imageUrl = publicUrlData.publicUrl;
    }

    // 2. Insert the item into the "items" table
    const { error: insertError } = await supabaseClient
        .from('items')
        .insert([{
            title,
            description,
            location,
            contact_info: contact,
            'img-url': imageUrl,
            type: status,        // 'lost' or 'found' — from the radio button
            status: 'pending',   // admin approval workflow
            user_id: user.id
        }]);

    submitBtn.disabled = false;

    if (insertError) {
        Swal.fire('Error', insertError.message, 'error');
        return;
    }

    Swal.fire('Report Submitted!', 'Your report will appear once approved by admin.', 'success')
        .then(() => {
            window.location.href = 'dashboard.html';
        });
});