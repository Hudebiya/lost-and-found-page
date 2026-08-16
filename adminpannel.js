const signupBtn = document.getElementById('signupBtn');
const loginBtn = document.getElementById('loginBtn');
const mainContainer = document.getElementById('main-container');

const signupForm = document.querySelector('.sign-up-box form');
const loginForm = document.querySelector('.login-box form');

const ADMIN_CODE = 'SELFAdmin@123';

signupBtn.addEventListener('click', () => {
    mainContainer.classList.add("active-signup");
});

loginBtn.addEventListener('click', () => {
    mainContainer.classList.remove("active-signup");
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = signupForm.querySelectorAll('input')[0].value;
    const email = signupForm.querySelectorAll('input')[1].value;
    const pass = signupForm.querySelectorAll('input')[2].value;
    const confirmPass = signupForm.querySelectorAll('input')[3].value;
    const adminCode = signupForm.querySelectorAll('input')[4].value;

    if (pass !== confirmPass) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Passwords do not match!',
            confirmButtonColor: '#004dff'
        });
        return;
    }

    if (pass.length < 6) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Password must be at least 6 characters.',
            confirmButtonColor: '#004dff'
        });
        return;
    }

    if (adminCode !== ADMIN_CODE) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Code',
            text: 'Admin invite code is incorrect.',
            confirmButtonColor: '#d33'
        });
        return;
    }

    Swal.fire({
        title: 'Creating admin account...',
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false
    });

    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: pass,
        options: {
            data: { full_name: name }
        }
    });

    if (error) {
        Swal.fire({
            icon: 'error',
            title: 'Sign Up Failed',
            text: error.message,
            confirmButtonColor: '#d33'
        });
        return;
    }

    // Role directly set to 'admin' — code already verified above
    if (data.user) {
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .insert([{ id: data.user.id, full_name: name, role: 'admin' }]);

        if (profileError) {
            console.warn('Profile insert failed:', profileError.message);
        }
    }

    Swal.fire({
        icon: 'success',
        title: 'Admin Account Created!',
        text: 'Registration successful. Now you can Login.',
        confirmButtonColor: '#004dff'
    }).then(() => {
        signupForm.reset();
        mainContainer.classList.remove("active-signup");
    });
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailInput = loginForm.querySelectorAll('input')[0].value;
    const passInput = loginForm.querySelectorAll('input')[1].value;

    Swal.fire({
        title: 'Logging in...',
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false
    });

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: emailInput,
        password: passInput
    });

    if (error) {
        Swal.fire({
            icon: 'error',
            title: 'Login Failed',
            text: 'Invalid Email or Password! ❌',
            confirmButtonColor: '#d33'
        });
        return;
    }

    const userName = data.user.user_metadata?.full_name || data.user.email;

    Swal.fire({
        icon: 'success',
        title: 'Login Successful!',
        text: `Welcome back, ${userName}!`,
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,
    }).then(() => {
        window.location.href = "admin.html";
    });
});

(async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        // window.location.href = "admin.html";
    }
})();