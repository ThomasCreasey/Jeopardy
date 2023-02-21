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
});
