const signupForm = document.getElementById('signupForm');
const passwordInput = document.getElementById('password');
const strongPasswordMessage = document.getElementById('strongPasswordMessage');

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

passwordInput.addEventListener('input', () => {
    const val = passwordInput.value;
    strongPasswordMessage.style.display = (val === "" || passwordRegex.test(val)) ? 'none' : 'block';
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const formData = new FormData(signupForm);
    const data = Object.fromEntries(formData.entries());

    try {
        if (data.first_name.length < 2) throw "First name must be at least 2 chars.";
        
        if (!/^[a-z0-9]+$/i.test(data.user_name)) throw "Username must be alphanumeric.";
        
        if (!/^\d{10}$/.test(data.phone_number)) throw "Enter a valid 10-digit phone number.";
        
        if (!data.email.includes('@')) throw "Enter a valid email address.";

        if (!passwordRegex.test(data.password)) throw "Password does not meet requirements.";

        if (!data.captchaAns) throw "Please enter the captcha.";

        // --- IF VALID, SEND TO BACKEND ---
        const resp = await fetch(signupForm.action, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await resp.json();

        if (resp.ok) {
            alert("Signup Successful!");
            window.location.href = '/login';
        } else {
            alert(result.error || "Signup failed");
            await loadCaptcha(); // Refresh captcha on failure
        }

    } catch (err) {
        // Catch local validation errors
        alert(err);
    }
});
