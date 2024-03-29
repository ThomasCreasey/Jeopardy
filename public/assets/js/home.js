$(document).ready(function() {
    document.getElementById('create-game').disabled = false;

    $('#create-game').on('click', function() {
        this.disabled = true;

        const username = document.getElementById('username').value;
        const data = {
            'username': username
        }
        
        $.ajax({
            url: '/create',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(data) {
                document.getElementById('create-game').disabled = false
                window.location.href = '/lobby/'+data
            },
            error: function(err) {
                document.getElementById('error-home-text').innerText = err.responseText.replace("\n", "");
                document.getElementById('create-game').disabled = false;
                console.log(err);
            },
        })
    })

    $('#join-game').on('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        if(!username) return;
        const roomId = document.getElementById('room-code').value;
        if(!roomId) return;

        this.disabled = true;

        const data = {
            'username': username,
            'roomId': roomId
        }
        
        $.ajax({
            url: '/join',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(data) {
                document.getElementById('join-game').disabled = false
                window.location.href = '/lobby/'+data
            },
            error: function(err) {
                document.getElementById('error-home-text').innerText = err.responseText.replace("\n", "");
                $('#error-home-text').toggleClass('d-none', false);
                document.getElementById('join-game').disabled = false;
            },
        })
    })
})