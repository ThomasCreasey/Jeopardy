class WSEvent {
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

function padStringToEnd(inputString, desiredLength) {
    if (inputString.length >= desiredLength) {
        console.log(inputString.length)
      return inputString; // No need to pad if the string is already long enough
    }
    
    const spacesToAdd = desiredLength - inputString.length;
    const paddedString = inputString + '&nbsp;'.repeat(spacesToAdd);
    
    console.log(paddedString)

    return paddedString;
  }


var errorModal = new bootstrap.Modal(document.getElementById('error-modal'), {
    keyboard: false
});

window.onload = function() {
    const roomId = window.location.pathname.split('/')[2];
    let isHost;

    document.getElementById('room-code').innerText = roomId;

    conn = new WebSocket('ws://localhost:8080/ws?roomId='+roomId);

    // Close the WebSocket connection when it is no longer needed
    window.addEventListener('beforeunload', function() {
        conn.close();
    });

    function sendEvent(eventName, payload) {
        // Create a event Object with a event named send_message
        const event = new WSEvent(eventName, payload);
        // Format as JSON and send
        conn.send(JSON.stringify(event));
    }

    function showPage(page) {
        if(!page) return;

        const allViews = $('div[id^="view-"]');
        allViews.toggleClass('d-none', true);

        console.log(page)

        if(page == 'select' && !isHost) {
            page = 'waiting';
        }
        $('#view-'+page).toggleClass('d-none', false);
        
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

    $('#start-game-button').click(function() {
        if (!isHost) return;
        sendEvent("client_start_game", null)
    })

    conn.onopen = function(e) {
        console.log("Connection established!");
    }

    conn.onmessage = function(e) {
        const data = JSON.parse(e.data);
        console.log(data)
        if(data.type == "server_successfully_joined") {
            //$('#view-lobby').toggleClass('d-none', false);
            isHost = data.payload

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
        else if(data.type == "server_update_game_state") {
            const payload = data.payload;
            const state = payload.roomState;
            const payloadData = payload.data;

            /* ROOM STATES
                0: Waiting for players
                1: Selecting categories
                2: Answering questions
                3: Displaying Scores
                4: Game Over
                5: Waiting for user to reconnect
            */
                console.log(state)
            switch (state) {
                case 0:
                    showPage('lobby')
                    break;
                case 1:
                    const categories = payloadData.Categories;

                    document.getElementById('lobby-table-categories').innerHTML = "";

                    categories.forEach((category, index) => {
                        const th = document.createElement('th');
                        th.innerText = category.Category
                        document.getElementById('lobby-table-categories').appendChild(th);

                        for(let i = 0; i < 5; i++) {
                            const children = document.getElementById('game-table').children[i];
                            const disabled = category.Disabled[i];
                            $(children.children[index]).toggleClass('disabled', disabled)
                        }
                    })
                    showPage('select');
                    break;
                case 2:
                    break;
                case 3:
                    break;
                case 4:
                    break;
                case 5:
                    document.getElementById('view-waiting-user-text').innerText = `Waiting for user: ${payloadData.Username} to reconnect...`;
                    showPage('waiting-user')
            }

        }
    }

    conn.onclose = function(e) {
        console.log("CLOSED")
        $('#view-lobby').toggleClass('d-none', true);
        try {
            document.getElementById('error-modal-text').innerText = e.reason;
        }
        catch (e) {
            document.getElementById('error-modal-text').innerText = "Connection closed without reason";
        }
        
        errorModal.show()
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