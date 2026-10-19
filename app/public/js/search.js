const search_bar = document.getElementById('search-bar');
const peopleContainer = document.getElementById('people');

search_bar.addEventListener('input', async () => {
    const word = search_bar.value;
    
    if (!word) {
        window.location.reload()
        return;
    }

    try {
        const response = await fetch(`/search?word=${word}`);
        const data = await response.json();
        const people = data.people;
        console.log(data.people)
        peopleContainer.innerHTML = '';

        people.forEach(person => {
            const personHTML = `
                <div class="d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-2">
                        <div class="bg-secondary rounded-circle d-flex align-items-center justify-content-center text-dark"
                             style="width: 40px; height: 40px; overflow: hidden;"> 
                            <a href="/userprofile/${person.user_id}">
                                <img src="/${person.profile_path}" alt="profile" class="w-100 h-100 object-fit-cover rounded-circle">
                            </a>
                        </div>
                        <div class="d-flex flex-column">
                            <span class="fw-bold lh-1 text-truncate" style="max-width: 110px;">
                                ${person.first_name} ${person.last_name}
                            </span>
                            <span class="text-secondary small text-truncate" style="max-width: 110px;">@${person.user_name}</span>
                        </div>
                    </div>
                    <input type="hidden" name="id" class="user_id" value="${person.user_id}">
<button class="btn ${person.is_following ? 'btn-outline-light' : 'btn-light'} rounded-pill fw-bold btn-sm px-3 py-1 followbtn">
    ${person.is_following ? "Following" : "Follow"}
</button>
                </div>`;
            peopleContainer.insertAdjacentHTML('beforeend', personHTML);
        });
    } catch (error) {
        console.error("Search error:", error);
    }
});
