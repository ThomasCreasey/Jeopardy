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

  socket.on('newplayer', (player) => {
    if (player.id === window.localStorage.getItem('socketId')) {
      setTimeout(() => {
        modalLoading.hide();
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

  socket.on('host', (host) => {
    if (host.id === window.localStorage.getItem('socketId')) {
      window.localStorage.setItem('host', true);
      modalHost.show();
    }
  });

  socket.on('checkname', (socketId, callback) => {
    if (socketId === window.localStorage.getItem('socketId')) {
      console.log('true');
      callback(true);
    }
  });

  socket.on('name-taken', (socketId) => {
    if (socketId === window.localStorage.getItem('socketId')) {
      console.log('false');
    }
  });
}

function kick(id) {
  sock.emit('kick', id);
}
