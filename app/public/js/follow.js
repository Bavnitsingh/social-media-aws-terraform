const followbtns = document.getElementsByClassName('followbtn');
const userIds = document.getElementsByClassName('user_id');


for(let i=0;i<Object.keys(followbtns).length;i++){
    const followbtn = followbtns[i];
    const userId = userIds[i].value
    followbtn.addEventListener('click', async () => {
   

    try {
       
        const response = await fetch(`/follow/${userId}`, {
            method: 'POST',  
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error('Failed to update follow status');
        }
        window.location.reload();
    } catch (error) {
        // 4. Revert UI if the request fails
        console.error(error);
        alert("Something went wrong. Please try again.");
        followbtn.innerText = isFollowing ? 'Unfollow' : 'Follow';
    }
});
}


