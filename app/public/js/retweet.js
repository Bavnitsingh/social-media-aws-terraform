const retweetbtns = document.getElementsByClassName('retweet')

for(let i=0;i<retweetbtns.length;i++){

const retweetbtn = retweetbtns[i];
const source_id = retweetbtn.getAttribute('tweet_id');
retweetbtn.addEventListener('click',async ()=>{

try {
    const response = await fetch(`/tweet?source_id=${source_id}`,{
        method: 'Post',
        headers: { 'Content-Type': 'application/json' }
    });
if (!response.ok) {
            alert('Failed to update retweet status');
        }
        
 window.location.reload();
    } catch (error) {
        window.location.reload();
        console.error(error);
        
    }
});
}
