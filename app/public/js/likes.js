const likebtns = document.querySelectorAll('.fa-heart.like');

likebtns.forEach(likebtn => {
    likebtn.addEventListener('click', async () => {
        const tweet_id = likebtn.getAttribute('tweet_id');

        try {
            const response = await fetch(`/like/${tweet_id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json(); // Get the { liked: true/false } result

            
            window.location.reload()
    

        } catch (error) {
            console.error("Error updating like:", error);
            // Optionally show a small toast/alert if the request fails
        }
    });
});
