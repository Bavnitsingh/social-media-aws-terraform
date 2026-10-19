let unfollowbtns = document.getElementsByClassName('unfollowbtn');

for (let i = 0; i < unfollowbtns.length; i++) {
    const unfollowbtn = unfollowbtns[i];
    
    unfollowbtn.addEventListener('click', async () => {
      
        const userId = unfollowbtn.getAttribute('data-userid');

        try {
            const response = await fetch(`/unfollow/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Failed to update follow status');
            }
            // 3. Reload after success
            window.location.reload();
        } catch (error) {
            console.error(error);
            alert("Something went wrong. Please try again.");
        }
    });
}
