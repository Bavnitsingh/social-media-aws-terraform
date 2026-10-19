const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const passwordInput = document.getElementById('password');
const oldPasswordInput = document.getElementById('oldpassword');
const cnfmpasswordInput = document.getElementById('cnfmpassword');
const errormsg = document.getElementById('error');
const changePasswordForm = document.getElementById('changePasswordForm');

changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    errormsg.textContent = '';
    errormsg.style.display = 'none';

    let message = '';


    if (!passwordRegex.test(passwordInput.value)) {
        message = 'Minimum 8 characters: 1 capital, 1 small, 1 digit, 1 special char.';
    } else if (oldPasswordInput.value === passwordInput.value) {
        message = 'Old and New Password must be different.';
    } else if (cnfmpasswordInput.value !== passwordInput.value) {
        message = 'Confirm Password and New Password must be same.';
    }

    if (message) {
        errormsg.textContent = message;
        errormsg.style.display = 'block';
        return;
    }

    try {
        const data = {
            oldpassword: oldPasswordInput.value,
            password: passwordInput.value,
            cnfmpassword: cnfmpasswordInput.value
        };

        const response = await fetch('/changePassword', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        errormsg.textContent = result.message || result; 
        errormsg.style.display = 'block';

        if (response.ok) {
            errormsg.style.color = 'red';
            changePasswordForm.reset(); 
        } else {
            errormsg.style.color = 'red';
        }

    } catch (error) {
        errormsg.textContent = 'Server error. Please try again later.';
        errormsg.style.display = 'block';
    }
});

