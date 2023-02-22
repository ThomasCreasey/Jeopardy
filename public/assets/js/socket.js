/* eslint-disable no-undef */
var sock;
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

  socket.on('set-question', (data) => {
    hide('category-select');
    modalLoading.hide();
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

      for (let i = 0; i < 31; i++) {
        setTimeout(() => {
          document.getElementById('modal-question-countdown').innerText =
            30 - i;
        }, i * 1000);
      }

      setTimeout(() => {
        modalQuestion.hide();
        const categoryEl = document.getElementById(
          `${data.category}-${data.value}`,
        );

        categoryEl.classList.remove('btn-outline-info');
        categoryEl.classList.add('btn-outline-danger');
        if (window.localStorage.getItem('host') === 'true') {
          document.getElementById(
            'modal-loading-text',
          ).innerText = `Nobody answered in time... Waiting for next category to be selected.`;
          modalLoading.show();
          setTimeout(() => {
            modalLoading.hide();
            show('category-select');
          }, 3000);
        } else {
          document.getElementById(
            'modal-loading-text',
          ).innerText = `Nobody answered in time... Waiting for next category to be selected.`;
          modalLoading.show();
        }
      }, 30500);
    }, 3500);
  });

  socket.on('newplayer', (player) => {
    if (player.id === window.localStorage.getItem('socketId')) {
      setTimeout(() => {
        document.getElementById('modal-loading-text').innerText =
          'Waiting for host to start game...';
      }, 1000);
    }

    var htmlString = `<tr id="hosttable-${player.id}"><td>${player.name}</td><td></td></tr>`;
    if (!player.host) {
      htmlString = `<tr id="hosttable-${player.id}"><td>${player.name}</td><td><button class="btn btn-outline-danger" onclick="kick('${player.id}')">Kick</button></td></tr>`;
    }

    var div = document.createElement('template');
    div.innerHTML = htmlString.trim();

    document.getElementById('player-list').appendChild(div.content.firstChild);
  });

  socket.on('kick', (player) => {
    console.log(player);
    if (player === window.localStorage.getItem('socketId')) {
      window.location.href = '/';
    }
    document.getElementById(`hosttable-${player}`).remove();
  });

  socket.on('lobby-closed', () => {
    window.location.href = '/';
  });

  socket.on('host', (host) => {
    if (host.id === window.localStorage.getItem('socketId')) {
      window.localStorage.setItem('host', true);
      modalLoading.hide();
      modalHost.show();
    }
  });

  socket.on('checkname', (socketId, callback) => {
    if (socketId === window.localStorage.getItem('socketId')) {
      console.log('true');
      callback(true);
    }
  });

  socket.on('start-game', () => {
    if (window.localStorage.getItem('host') === 'true') {
      // Show category options
      modalLoading.hide();
      modalHost.hide();
      show('category-select');
    } else {
      document.getElementById('modal-loading-text').innerText =
        'Waiting for host to select a category...';
    }
  });

  socket.on('name-taken', (socketId) => {
    if (socketId === window.localStorage.getItem('socketId')) {
      console.log('false');
    }
  });
}

$('#host-startgame').click(function () {
  sock.emit('start-game');
});

function kick(id) {
  sock.emit('kick', id);
}

$('.category-select-btn').click(function () {
  sock.emit('category-select', {
    category: $(this).data('category'),
    value: $(this).data('value'),
  });
});
