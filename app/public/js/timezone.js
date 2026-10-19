 const times = document.getElementsByClassName('time')

 for(let i=0;i<times.length;i++){
    let timeElement = times[i];
    const timevalue = timeElement.getAttribute('createdAt')
    let localTime = new Date(timevalue).toLocaleString();
    timeElement.innerText = localTime;
 }
 