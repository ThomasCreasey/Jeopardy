class Event {
    constructor(type, payload) {
        this.type = type;
        this.payload = payload;
    }
}

class KickEvent {
    constructor(username) {
        this.username = username;
    }
}


window.onload = function() {
    const roomId = window.location.pathname.split('/')[2];

    document.getElementById('room-code').innerText = roomId;

    conn = new WebSocket('ws://localhost:8080/ws?roomId='+roomId);

    function sendEvent(eventName, payload) {
        // Create a event Object with a event named send_message
        const event = new Event(eventName, payload);
        // Format as JSON and send
        conn.send(JSON.stringify(event));
    }

    conn.onopen = function(e) {
        console.log("Connection established!");
    }

    conn.onmessage = function(e) {
        const data = JSON.parse(e.data);
        console.log(data)
        if(data.type == "server_successfully_joined") {
            $('#view-lobby').toggleClass('d-none', false);

            const players = data.payload;

            players.forEach(player => {
                const tr = document.createElement('tr');

                const usernameTd = document.createElement('td');
                usernameTd.innerText = player.username;

                const pingTd = document.createElement('td');
                pingTd.innerText = "?";

                const kickTd = document.createElement('td');
                const kickButton = document.createElement('button');
                kickButton.innerText = "Kick";
                kickButton.classList.add('btn', 'btn-danger', 'kick-button');
                kickButton.dataset.id = player.username
                kickTd.appendChild(kickButton);

                tr.appendChild(usernameTd);
                tr.appendChild(pingTd);
                tr.appendChild(kickTd);

                document.getElementById('lobby-players').append(tr);
            })
        }
        else if (data.type == "server_update_ping") {
            const lobbyTable = document.getElementById('lobby-players');
            const players = data.payload;

            const tableChildren = lobbyTable.children;

            for(let i=0; i<tableChildren.length; i++) {
                const username = tableChildren[i].children[0].innerText;
                const ping = tableChildren[i].children[1];

                const player = players.filter(player => player.username == username)[0];
                ping.innerText = player.ping;
            }
        }
    }

    conn.onclose = function(e) {
        $('#view-lobby').toggleClass('d-none', true);
        console.log(e.code, e.reason)
        console.log("Connection closed!");
    }


    document.addEventListener('click', function(e) {
        if(e.target.classList.contains('kick-button')) {
            console.log('kick')
            const username = e.target.dataset.id;
            const data = {
                username
            }

            let outgoingEvent = new KickEvent(username);

            sendEvent("client_kick_user", outgoingEvent);
        }
    })
};