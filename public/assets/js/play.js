const modalName = new bootstrap.Modal('#modal-name');
const modalLoading = new bootstrap.Modal('#modal-loading');
const modalHost = new bootstrap.Modal('#modal-host');

/*$('.btn').click(function () {
  socket.emit('categorySelect', {
    category: $(this).data('category'),
    value: $(this).data('value'),
  });
});*/

$(document).ready(function () {
  modalName.show();
});

$('#btn-name').click(function () {
  if ($('#input-name').val() === '') {
    $('#input-name').attr('placeholder', 'Please enter a name');
    return;
  }
  modalName.hide();
  modalLoading.show();
  $.ajax({
    type: 'POST',
    url: '/join-lobby',
    data: {
      name: $('#input-name').val(),
      code: window.location.pathname.split('/')[2],
    },
    success: function (data) {
      if (data === 'valid') {
        // Success
        var socket = io();
        startSocket(socket);
      } else {
        console.log('Name already taken');
        setTimeout(() => {
          // Name already taken
          modalLoading.hide();
          modalName.show();
          $('#input-name').val('');
          $('#input-name').attr('placeholder', 'Name already taken');
        }, 500);
      }
    },
  });
});
