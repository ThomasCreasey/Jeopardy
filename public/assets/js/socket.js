socket.on('connect', () => {
  window.localStorage.setItem('socketId', socket.id);
});

socket.on('joined', function (data) {
  console.log(data);
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
