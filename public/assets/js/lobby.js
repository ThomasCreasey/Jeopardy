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
    let isHost;

    document.getElementById('room-code').innerText = roomId;

    conn = new WebSocket('ws://localhost:8080/ws?roomId='+roomId);

    function sendEvent(eventName, payload) {
        // Create a event Object with a event named send_message
        const event = new Event(eventName, payload);
        // Format as JSON and send
        conn.send(JSON.stringify(event));
    }

    function updateHost() {
        const lobbyTable = document.getElementById('lobby-players');
        const tableChildren = lobbyTable.children;
        if (isHost) {
            document.getElementById('start-game-button').disabled = false;

            for(let i=0; i<tableChildren.length; i++) {
                const kickButton = tableChildren[i].children[2].children[0];
                kickButton.disabled = false;
            }

        } else {
            document.getElementById('start-game-button').disabled = true;

            for(let i=0; i<tableChildren.length; i++) {
                const kickButton = tableChildren[i].children[2].children[0];
                kickButton.disabled = true;
            }
        }
    }

    conn.onopen = function(e) {
        console.log("Connection established!");
    }

    conn.onmessage = function(e) {
        const data = JSON.parse(e.data);
        console.log(data)
        if(data.type == "server_successfully_joined") {
            $('#view-lobby').toggleClass('d-none', false);
            isHost = data.payload;
            updateHost();
        }
        else if (data.type == "server_set_host") {
            isHost = true;
            updateHost();
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
        else if(data.type == "server_update_players") {
            const players = data.payload;

            document.getElementById('lobby-players').innerHTML = "";

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
                kickButton.disabled = !isHost;
                kickTd.appendChild(kickButton);

                tr.appendChild(usernameTd);
                tr.appendChild(pingTd);
                tr.appendChild(kickTd);

                document.getElementById('lobby-players').append(tr);
            })
        }
    }

    conn.onclose = function(e) {
        $('#view-lobby').toggleClass('d-none', true);
        
        const fixedReason = '{"'+e.reason
        console.log(fixedReason)
        const parsed = JSON.parse(fixedReason);
        console.log(parsed)

        $('#error-modal-text').innerText = parsed.payload;
        $('#error-modal').modal('show');
        console.log("Connection closed!");
    }


    document.addEventListener('click', function(e) {
        if(e.target.classList.contains('kick-button')) {
            const username = e.target.dataset.id;

            let outgoingEvent = new KickEvent(username);

            sendEvent("client_kick_user", outgoingEvent);
        }
    })
};