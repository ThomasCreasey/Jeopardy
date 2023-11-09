const totalValueLevels = 5 // Change this if you have less than 5 value levels, default is 5 (200, 400, 600, 800, 1000);

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

function generateUniqueID() {
    return Math.random().toString(36).substring(2, 15)
}

var errorModal = new bootstrap.Modal(document.getElementById('error-modal'), {
    keyboard: false
});

var answerModal = new bootstrap.Modal(document.getElementById('answer-modal'), {
    keyboard: false
});

window.onload = function() {
    const roomId = window.location.pathname.split('/')[2];
    let isHost;
    let username;
    let lastBuzzer;
    let players;

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
            const payload = data.payload;
            username = payload.username;
            isHost = payload.isHost;
            updateHost();

        }
        else if (data.type == "server_set_host") {
            if (data.payload == username) {
                isHost = true;
                updateHost();
            }
            else {
                isHost = false
                updateHost();
            }
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
            players = data.payload;

            updatePlayers(players)

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
                    document.getElementById('game-table').innerHTML = "";

                    const rows = []

                    for(let i=0; i < totalValueLevels; i++) {
                        rows.push([])
                    }

                    categories.forEach((category, index) => {
                        const th = document.createElement('th');
                        th.innerText = category.Category
                        document.getElementById('lobby-table-categories').appendChild(th);

                        category.Values.forEach((value, i) => {
                            rows[i].push({ value: value, disabled: category.Disabled[i]})
                        })
                    })

                    for(let i=0; i < rows.length; i++) {
                        const tr = document.createElement('tr');

                        for(let j=0; j < rows[i].length; j++) {
                            const td = document.createElement('td');
                            const element = rows[i][j];
                            td.innerText = '$'+element.value;
                            $(td).toggleClass('disabled', element.disabled);
                            tr.appendChild(td);
                        }

                        document.getElementById('game-table').appendChild(tr)
                    }

                    showPage('select');
                    break;
                case 2:
                    document.getElementById('answer-timer').innerText = '10s';
                    document.getElementById('question-timer').innerText = '10s';
                    document.getElementById('view-question-question').innerText = payloadData.Question;
                    
                    updatePlayers(players)
                    
                    showPage('question')
                    break;
                case 3:
                    const answers = payloadData.answers;
                    const scores = payloadData.scores;
                    const correctAnswer = payloadData.answer;

                    answers.forEach(answer => {
                        document.getElementById('answer-'+answer.Username).innerText = answer.Answer;
                        document.getElementById('answer-'+answer.Username).style.color = answer.Correct ? '#77dd77' : '#ff6961';
                        showSvgEl(answer.Username, 'answer')
                    })

                    scores.forEach(score => {
                        updateScore(score.username, score.score);
                        players.filter(player => player.username == score.username)[0].score = score.score;
                    })

                    document.getElementById('view-question-question').innerText = "Answer(s): "+correctAnswer;
                    break;
                case 4:
                    const playerScores = payloadData.scores;
                    playerScores.sort((a, b) => b.score - a.score);

                    const scoreTable = document.getElementById('game-over-score')
                    scoreTable.innerHTML = "";

                    playerScores.forEach(player => {
                        const tr = document.createElement('tr');

                        const usernameTd = document.createElement('td');
                        usernameTd.innerText = player.username;

                        const scoreTd = document.createElement('td');
                        scoreTd.innerText = player.score;

                        tr.appendChild(usernameTd);
                        tr.appendChild(scoreTd);

                        scoreTable.appendChild(tr);
                    })

                    showPage('gameover')
                    break;
                case 5:
                    document.getElementById('view-waiting-user-text').innerText = `Waiting for user: ${payloadData.Username} to reconnect...`;
                    showPage('waiting-user')
            }

        }
        else if(data.type == "server_update_question") {
            document.getElementById('view-question-question').innerText = data.payload;
        }
        else if(data.type == "server_buzzed") {
            lastBuzzer = data.payload;
            showSvgEl(lastBuzzer, 'buzz');

            if (lastBuzzer == username) {
                document.getElementById('answer-input').value = "";
                answerModal.show();
                console.log("YOU BUZZED BOZO")   
            }
        }
        else if(data.type == "server_update_answer_timer") {
            const timeLeft = data.payload;
            document.getElementById('answer-timer').innerText = timeLeft + 's';
        }
        else if(data.type == "server_update_question_timer") {
            answerModal.hide();
            document.getElementById('question-timer').innerText = data.payload + 's';
        }
        else if(data.type == "server_incorrect_answer") {
            lastBuzzer = data.payload
            showSvgEl(lastBuzzer, 'incorrect');
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
        else if(e.target.tagName == 'TD') {
            if(e.target.classList.contains('disabled')) return;
            
            const categories = document.getElementById('lobby-table-categories').children;
            const category = categories[e.target.cellIndex].innerText;
            let value = e.target.innerText
            value = value.replace('$', '');

            const outgoingEvent = {
                Category: category,
                Value: value
            }

            sendEvent("client_select_question", outgoingEvent);
        }
        else if(e.target.id == 'buzz') {
            sendEvent("client_buzz")
        }
    })

    $('#answer-form').submit(function(e) {
        e.preventDefault();
        const answer = document.getElementById('answer-input').value;
        if (!answer) return;
        const outgoingEvent = {
            Answer: answer
        }

        console.log(answer)

        sendEvent("client_answer", outgoingEvent);
    })
    
};