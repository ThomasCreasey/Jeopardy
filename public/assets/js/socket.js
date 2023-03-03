/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */

var sock;
var questionTimer;
var inputCountdown;
var data;
var inputTimeout;
var questionCountdown;
var timeLeft = 30;
var categorySelectTimer;
var categorySelectCountdown;

function hideAll() {
  modalLoading.hide();
  modalQuestion.hide();
  modalResponse.hide();
  modalAnswered.hide();
  modalCategory.hide();
  modalCategorySelect.hide();
  modalHost.hide();
  modalClosed.hide();
}

function showLoadModal() {
  modalLoading.show();
  document.getElementById('load-points').innerText = 'Show Points';
  document.getElementById('show-points').innerHTML = '';
}

function startSocket(socket) {
  sock = socket;

  socket.on('connect', () => {
    console.log('Connected');
    window.localStorage.removeItem('host');
    window.localStorage.setItem('socketId', socket.id);
  });

  socket.on('joined', function (data) {
    console.log(data);
  });

  socket.on('lobby-locked', (id) => {
    if (id === window.localStorage.getItem('socketId')) {
      hideAll();

      document.getElementById('modal-closed-reason').innerText =
        'Game has already begun';
      modalClosed.show();
      let timeLeft = 5;
      const closedCountdown = setInterval(() => {
        timeLeft--;
        document.getElementById(
          'modal-closed-countdown',
        ).innerText = `You will be redirected in ${timeLeft} seconds...`;
        if (timeLeft === 0) {
          clearInterval(closedCountdown);
        }
      }, 1000);

      setTimeout(() => {
        window.location.href = '/';
      }, 5000);
    }
  });

  socket.on('category-select', (player) => {
    hideAll();
    hide('category-select-countdown');
    var categorySelectTimeLeft = 30;
    inputTimeLeft = 10;
    timeLeft = 30;
    clearTimeout(questionTimer);
    clearTimeout(inputTimeout);
    clearInterval(inputCountdown);
    clearInterval(questionCountdown);

    if (player.id === window.localStorage.getItem('socketId')) {
      modalCategorySelect.show();
      categorySelectCountdown = setInterval(() => {
        show('category-select-countdown');
        categorySelectTimeLeft--;
        document.getElementById(
          'category-select-countdown',
        ).innerText = `You have ${categorySelectTimeLeft} seconds to select a category`;
        if (categorySelectTimeLeft === 0) {
          clearInterval(categorySelectCountdown);
        }
      }, 1000);

      categorySelectTimer = setTimeout(() => {
        modalCategorySelect.hide();
        socket.emit('category-select-timeout');
      }, 30000);
    } else {
      showLoadModal();
      document.getElementById(
        'modal-loading-text',
      ).innerText = `${player.name} is selecting a category...`;
    }
  });

  socket.on('set-question', (inpData) => {
    hideAll();
    hide('category-select-countdown');
    clearTimeout(categorySelectTimer);
    clearInterval(categorySelectCountdown);

    inputTimeLeft = 10;
    timeLeft = 30;
    document.getElementById('modal-question-countdown').innerText = 30;
    document.getElementById('submit-response').disabled = false;
    document.getElementById('buzz').disabled = false;

    data = inpData;
    document.getElementById(`${data.category}-${data.value}`).disabled = true;
    document.getElementById('modal-category-name').innerText = data.category;
    document.getElementById(
      'modal-category-points',
    ).innerText = `For ${data.value} points`;
    modalCategory.show();

    setTimeout(() => {
      modalCategory.hide();

      document.getElementById('modal-question-name').innerText = data.question;
      modalQuestion.show();

      questionCountdown = setInterval(() => {
        timeLeft--;
        document.getElementById('modal-question-countdown').innerText =
          timeLeft;
        if (timeLeft === 0) {
          clearInterval(questionCountdown);
        }
      }, 1000);

      questionTimerHandler(30);
    }, 3500);
  });

  socket.on('buzzed', (player) => {
    clearInterval(questionCountdown);
    clearTimeout(questionTimer);
    document.getElementById('input-response').value = '';
    hideAll();

    if (player.id === window.localStorage.getItem('socketId')) {
      document.getElementById('buzz').disabled = true;
      document.getElementById('modal-response-countdown').innerText = 10;
      let inputTimeLeft = 10;
      modalResponse.show();

      inputCountdown = setInterval(() => {
        inputTimeLeft--;
        document.getElementById('modal-response-countdown').innerText =
          inputTimeLeft;
        if (inputTimeLeft === 0) {
          clearInterval(inputCountdown);
        }
      }, 1000);

      inputTimeout = setTimeout(() => {
        modalResponse.hide();
        socket.emit('timed-out');
        console.log('Took too long');
      }, 10000);
      // Bring up input box
    } else {
      document.getElementById(
        'modal-loading-text',
      ).innerText = `${player.name} buzzed in! Waiting for answer...`;
      showLoadModal();
    }
  });

  socket.on('timed-out', () => {
    hideAll();
    showLoadModal();
    document.getElementById(
      'modal-loading-text',
    ).innerText = `Player took too long to answer...`;
    setTimeout(() => {
      modalLoading.hide();
      modalQuestion.show();
      questionCountdown = setInterval(() => {
        timeLeft--;
        document.getElementById('modal-question-countdown').innerText =
          timeLeft;
        if (timeLeft === 0) {
          clearInterval(questionCountdown);
        }
      }, 1000);

      questionTimerHandler(timeLeft);
    }, 2000);
  });

  socket.on('newplayer', (player) => {
    if (player.id === window.localStorage.getItem('socketId')) {
      document.getElementById('modal-loading-text').innerText =
        'Waiting for host to start game...';
    }

    var htmlString = `<tr id="hosttable-${player.id}"><td>${player.name}</td><td></td></tr>`;
    if (!player.host) {
      htmlString = `<tr id="hosttable-${player.id}"><td>${player.name}</td><td><button class="btn btn-outline-danger" onclick="kick('${player.id}')">Kick</button></td></tr>`;
    }

    var div = document.createElement('template');
    div.innerHTML = htmlString.trim();

    document.getElementById('player-list').appendChild(div.content.firstChild);
  });

  socket.on('player-left', (player) => {
    if (!player) return;
    const el = document.getElementById(`hosttable-${player}`);
    if (el) el.remove();
  });

  socket.on('kick', (player) => {
    console.log(player);
    if (player === window.localStorage.getItem('socketId')) {
      window.location.href = '/';
    }
    document.getElementById(`hosttable-${player}`).remove();
  });

  socket.on('correct-answer', (data) => {
    hideAll();
    document.getElementById(
      'modal-answered-text-1',
    ).innerText = `${data.player.name} answered correctly`;

    document.getElementById(
      'modal-answered-text-2',
    ).innerText = `The answer was ${data.answer}.`;
    document.getElementById(
      'modal-answered-text-3',
    ).innerText = `They earned ${data.points} points!`;

    show('modal-answered-text-2');
    show('modal-answered-text-3');
    modalAnswered.show();
  });

  socket.on('incorrect-answer', (player) => {
    hideAll();
    document.getElementById(
      'modal-answered-text-1',
    ).innerText = `${player.name} answered incorrectly`;

    hide('modal-answered-text-2');

    hide('modal-answered-text-3');
    modalAnswered.show();

    inputTimeout = setTimeout(() => {
      modalAnswered.hide();
      modalQuestion.show();
      questionCountdown = setInterval(() => {
        timeLeft--;
        document.getElementById('modal-question-countdown').innerText =
          timeLeft;
        if (timeLeft === 0) {
          clearInterval(questionCountdown);
        }
      }, 1000);

      questionTimerHandler(timeLeft);
    }, 2000);
  });

  socket.on('lobby-closed', (reason) => {
    hideAll();

    document.getElementById('modal-closed-reason').innerText = reason;
    modalClosed.show();
    let timeLeft = 5;
    const closedCountdown = setInterval(() => {
      timeLeft--;
      document.getElementById(
        'modal-closed-countdown',
      ).innerText = `You will be redirected in ${timeLeft} seconds...`;
      if (timeLeft === 0) {
        clearInterval(closedCountdown);
      }
    }, 1000);

    setTimeout(() => {
      window.location.href = '/';
    }, 5000);
  });

  socket.on('host', (host) => {
    if (host.id === window.localStorage.getItem('socketId')) {
      window.localStorage.setItem('host', true);
      hideAll();
      modalHost.show();
    }
  });

  socket.on('checkname', (socketId, callback) => {
    if (socketId === window.localStorage.getItem('socketId')) {
      callback(true);
    }
  });

  socket.on('start-game', (categories) => {
    show('load-points');
    if (window.localStorage.getItem('host') === 'true') {
      // Show category options
      hideAll();
      modalCategorySelect.show();
    } else {
      document.getElementById('modal-loading-text').innerText =
        'Waiting for host to select a category...';
    }
    const head = document.getElementById('category-select-head');
    const body = document.getElementById('category-select-body');

    categories.forEach((category) => {
      const th = document.createElement('th');
      th.setAttribute('scope', 'row');
      th.innerText = category;
      head.appendChild(th);
    });

    for (let i = 0; i < 5; i++) {
      const tr = document.createElement('tr');
      categories.forEach((category) => {
        const value = 200 * (i + 1);
        const td = document.createElement('td');
        const button = document.createElement('button');
        button.classList.add('btn', 'btn-outline-info', 'category-select-btn');
        button.innerText = value;
        button.id = `${category}-${value}`;
        button.setAttribute('data-category', category);
        button.setAttribute('data-value', value);
        td.appendChild(button);
        tr.appendChild(td);
      });
      body.appendChild(tr);
    }
  });

  socket.on('game-over', (data) => {
    hideAll();
    modalGameOver.show();
    console.log(data);
    document.getElementById('gameover-points').innerHTML = data
      .map((player) => `<li>${player.name} - ${player.points}</li>`)
      .join('');
  });

  socket.on('update-colour', (data) => {
    const categoryEl = document.getElementById(
      `${data.category}-${data.value}`,
    );

    categoryEl.classList.remove('btn-outline-info');
    categoryEl.classList.add(`btn-outline-${data.colour}`);
  });
}

$('#host-startgame').click(function () {
  const select = document.getElementById('host-categories');
  if (select.options.length > 5 || select.options.length < 1) {
    alert('Please select up to 5 categories');
    return;
  }
  const allowJoining = document.getElementById('join-after-start').checked;

  const categories = [...select.options].map((option) => option.value);

  sock.emit('start-game', { categories, allowJoining });
});

function kick(id) {
  sock.emit('kick', id);
}

$(document).on('click', '.category-select-btn', function () {
  sock.emit('category-select', {
    category: $(this).data('category'),
    value: $(this).data('value'),
  });
});

$('#buzz').click(function () {
  sock.emit('buzz');
});

$('#submit-response-form').submit(function () {
  document.getElementById('submit-response').disabled = true;
  clearTimeout(inputTimeout);
  const answer = document.getElementById('input-response').value;
  sock.emit('answer', answer);
});

function questionTimerHandler(time) {
  console.log(`${time} seconds left`);
  questionTimer = setTimeout(() => {
    modalQuestion.hide();
    if (window.localStorage.getItem('host') === 'true') {
      sock.emit('main-timeout');
    }
  }, time * 1000);
}

$('#load-points').click(function () {
  sock.emit('get-points', (data) => {
    const points = data
      .map((player) => {
        return `${player.name}: ${player.points}`;
      })
      .join('\n');
    if (document.getElementById('load-points').innerHTML === 'Hide Points') {
      document.getElementById('load-points').innerHTML = 'Load Points';
      document.getElementById('show-points').innerText = '';
    } else {
      document.getElementById('load-points').innerHTML = 'Hide Points';
      document.getElementById('show-points').innerText = points;
    }
  });
});
