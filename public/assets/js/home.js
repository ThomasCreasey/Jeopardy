$(document).ready(function () {
  $('#code-input').keyup(function (a) {
    console.log(this.value);
    var e = document.getElementById('start-button');
    if (!this.value || this.value == '') {
      e.innerText = 'Create Game';
    } else {
      e.innerText = 'Join Game';
    }
  });

  $('#start-button').click(function () {
    var e = document.getElementById('start-button');
    if (e.innerText == 'Create Game') {
      $.ajax({
        type: 'POST',
        url: '/create-lobby',
        data: {
          name: $('#name-input').val(),
        },
        success: function (data) {
          window.location.href = `/play/${data}`;
        },
      });
    } else {
      $.ajax({
        type: 'POST',
        url: '/join-game',
        data: {
          name: $('#name-input').val(),
          code: $('#code-input').val(),
        },
        success: function (data) {
          console.log(data);
        },
      });
    }
  });
});
