const profileForm = document.getElementById('profileForm');
const allowedExtensions = ['jpg', 'jpeg', 'png'];

profileForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const formData = new FormData(profileForm);

    try {
        // 1. Text Validations
        if (formData.get('first_name').length < 2) throw "First name must be at least 2 chars.";
        
        const username = formData.get('user_name');
        if (!/^[a-z0-9]+$/i.test(username)) throw "Username must be alphanumeric.";

        // 2. File Extension Validations
        const validateFile = (fieldName, label) => {
            const file = formData.get(fieldName);
            if (file && file.name) { 
                const ext = file.name.split('.').pop().toLowerCase();
                if (!allowedExtensions.includes(ext)) {
                    throw `${label} has an invalid extension. Only ${allowedExtensions.join(', ')} are allowed.`;
                }
            }
        };

        validateFile('profile_pic', 'Profile Picture');
        validateFile('cover_pic', 'Cover Picture');

   
        const resp = await fetch(profileForm.action, {
            method: 'POST',
            body: formData 
        });


        if (resp.ok) {
            alert("Profile Updated Successfully!");
            window.location.href = '/profile'; 
        } else {
            alert(result.error || "Update failed");
        }

    } catch (err) {
        alert(err);
    }
});
