const shareBtns = document.getElementsByClassName('share-btn');


for(let i=0;i<shareBtns.length;i++){
    let shareBtn = shareBtns[i];
    let tweet_id = shareBtn.getAttribute('tweet_id')
shareBtn.addEventListener('click', async () => {
  const shareData = {
    title: 'Check out this post!',
    text: 'Insightful tweet from my app',
    url: `${window.location.origin}${window.location.pathname}#tweet-${tweet_id}` 
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      console.log('Shared successfully');
    } catch (err) {
      console.error('Error sharing:', err);
    }
  } else {
    // Fallback: Copy to clipboard if API not supported
    copyToClipboard(shareData.url);
  }
});
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert("Link copied to clipboard!");
  }).catch(err => {
    console.error("Could not copy text: ", err);
  });
}


