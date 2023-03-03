$(document).ready(function () {
  $('#code-input').keyup(function (a) {
    var e = document.getElementById('start-button');
    if (!this.value || this.value == '') {
      e.innerText = 'Create Game';
    } else {
      e.innerText = 'Join Game';
    }
  });

  $('#start-form').submit(function (el) {
    el.preventDefault();
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
        url: '/',
        data: {
          code: $('#code-input').val(),
        },
        success: function (data) {
          if (data === 'invalid') {
            document.getElementById('code-input').value = '';
            document
              .getElementById('code-input')
              .setAttribute('placeholder', 'This game doesnt exist');
            var e = document.getElementById('start-button');
            e.innerText = 'Create Game';
          }
        },
      });
    }
  });
});
