$(document).ready(function() {
    //let csrfToken = document.getElementsByName('gorilla.csrf.Token')[0].value;
    let csrfToken = "a"
    document.getElementById('create-game').disabled = false;

    $('#create-game').on('click', function() {
        this.disabled = true;

        const username = document.getElementById('username').value;
        const data = {
            'username': username
        }

        window.localStorage.setItem('username', username);
        
        $.ajax({
            url: '/create',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(data) {
               window.location.href = '/lobby/'+data
            },
            error: function(err) {
                console.log(err);
            },
        })
    })
})