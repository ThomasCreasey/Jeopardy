const buzzSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-bell-ringing-filled" width="150" height="150" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
<path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
<path d="M17.451 2.344a1 1 0 0 1 1.41 -.099a12.05 12.05 0 0 1 3.048 4.064a1 1 0 1 1 -1.818 .836a10.05 10.05 0 0 0 -2.54 -3.39a1 1 0 0 1 -.1 -1.41z" stroke-width="0" fill="currentColor"></path>
<path d="M5.136 2.245a1 1 0 0 1 1.312 1.51a10.05 10.05 0 0 0 -2.54 3.39a1 1 0 1 1 -1.817 -.835a12.05 12.05 0 0 1 3.045 -4.065z" stroke-width="0" fill="currentColor"></path>
<path d="M14.235 19c.865 0 1.322 1.024 .745 1.668a3.992 3.992 0 0 1 -2.98 1.332a3.992 3.992 0 0 1 -2.98 -1.332c-.552 -.616 -.158 -1.579 .634 -1.661l.11 -.006h4.471z" stroke-width="0" fill="currentColor"></path>
<path d="M12 2c1.358 0 2.506 .903 2.875 2.141l.046 .171l.008 .043a8.013 8.013 0 0 1 4.024 6.069l.028 .287l.019 .289v2.931l.021 .136a3 3 0 0 0 1.143 1.847l.167 .117l.162 .099c.86 .487 .56 1.766 -.377 1.864l-.116 .006h-16c-1.028 0 -1.387 -1.364 -.493 -1.87a3 3 0 0 0 1.472 -2.063l.021 -.143l.001 -2.97a8 8 0 0 1 3.821 -6.454l.248 -.146l.01 -.043a3.003 3.003 0 0 1 2.562 -2.29l.182 -.017l.176 -.004z" stroke-width="0" fill="currentColor"></path>
</svg>`

const incorrectSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-x" width="150" height="150" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
<path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
<path d="M18 6l-12 12"></path>
<path d="M6 6l12 12"></path>
</svg>`

$(document).ready(function() {
    const question = "Question question question question question question question question?";

    let allTimeouts = [];

    for(let i=0; i<question.length; i++) {
        var timeout = setTimeout(function() {
            $("#question").append(question.charAt(i));
        }, 50*i);
        allTimeouts.push(timeout);
    }

    $('#buzz').on('click', function() {
        let currPlayer = 1;

        document.getElementById(`player-${currPlayer}-body`).innerHTML = buzzSvg

        for(let i=0; i<allTimeouts.length; i++) {
            clearTimeout(allTimeouts[i]);
        }

        setTimeout(function() {
            const correct = false
            if(!correct) {
                document.getElementById(`player-${currPlayer}-body`).innerHTML = incorrectSvg;
            }
            var rendered = document.getElementById("question").innerText;

            for(let i=rendered.length; i<question.length; i++) {
                var timeout = setTimeout(function() {
                    $("#question").append(question.charAt(i));
                }
                , 50*(i - rendered.length));
                allTimeouts.push(timeout);
            }
        }, 1000);
    });
});