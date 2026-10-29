const profileForm = document.getElementById("profileForm");
const allowedExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
const MAX_BYTES = 5 * 1024 * 1024; // same limit as the server

profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(profileForm);

  try {
    // 1. Text validations
    if (formData.get("first_name").length < 2)
      throw "First name must be at least 2 chars.";

    const username = formData.get("user_name");
    if (username !== null && !/^[a-z0-9]+$/i.test(username))
      throw "Username must be alphanumeric.";

    // 2. File validations: type and size
    const validateFile = (fieldName, label) => {
      const file = formData.get(fieldName);
      if (file && file.name) {
        const ext = file.name.split(".").pop().toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          throw `${label} has an invalid extension. Only ${allowedExtensions.join(", ")} are allowed.`;
        }
        if (file.size > MAX_BYTES) {
          throw `${label} is too large. Maximum size is 5 MB.`;
        }
      }
    };

    validateFile("profile_pic", "Profile Picture");
    validateFile("cover_pic", "Cover Picture");

    const resp = await fetch(profileForm.action, {
      method: "POST",
      body: formData,
    });

    if (resp.ok) {
      alert("Profile Updated Successfully!");
      window.location.href = "/profile";
    } else {
      // Show what the server actually said (for example "File too large").
      const message = await resp.text();
      alert(`Update failed (${resp.status}): ${message.slice(0, 200)}`);
    }
  } catch (err) {
    alert(err);
  }
});
