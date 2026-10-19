const content = document.getElementById('content');
const image_upload = document.getElementById('image-upload');

const submitForm = document.getElementById('tweetForm')

submitForm.addEventListener('submit',(e)=>{
    if(content.value==="" && image_upload.value===""){
        e.preventDefault()
        alert('You have to enter either Content or Media ')
    }
})