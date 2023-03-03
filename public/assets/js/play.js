/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */
const modalName = new bootstrap.Modal('#modal-name');
const modalLoading = new bootstrap.Modal('#modal-loading');
const modalHost = new bootstrap.Modal('#modal-host');
const modalCategory = new bootstrap.Modal('#modal-category');
const modalQuestion = new bootstrap.Modal('#modal-question');
const modalResponse = new bootstrap.Modal('#modal-response');
const modalAnswered = new bootstrap.Modal('#modal-answered');
const modalCategorySelect = new bootstrap.Modal('#modal-category-select');
const modalClosed = new bootstrap.Modal('#modal-closed');
const modalGameOver = new bootstrap.Modal('#modal-game-over');

function show(id) {
  document.getElementById(id).style.display = 'block';
}
function hide(id) {
  document.getElementById(id).style.display = 'none';
}

$(document).ready(function () {
  modalName.show();
  $('#host-categories').selectize({ maxitems: 5 });
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
