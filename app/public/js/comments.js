const commentbtns = document.getElementsByClassName('comment')

for(let i=0;i<commentbtns.length;i++){

const commentbtn = commentbtns[i];
const tweet_id = commentbtn.getAttribute('tweet_id');
commentbtn.addEventListener('click',async ()=>{
window.location.href = `/comments/${tweet_id}`
})
}
const commentInput = document.getElementById('comment');
const commentForm = document.getElementById('commentForm');
commentForm.addEventListener('submit',(e)=>{
    if(!commentInput.value){
        alert('Comments cant be empty')
        e.preventDefault();
    }
})

