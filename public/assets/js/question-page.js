let allPlayerSvgs = [];

function createSvg(username, score, colour) {
  const uniqueID = username
  // Create a new SVG element
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("id", `Layer_${uniqueID}`);
  svg.setAttribute("data-name", `Layer ${uniqueID}`);
  svg.setAttribute("viewBox", "0 0 193.76 344.52");
  svg.setAttribute("height", "500");

  // Create <defs> and <style> elements
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `
    .cls-${uniqueID}-1 {
      font-family: TitilliumWeb-Bold, 'Titillium Web';
      fill: #8b5e3c;
    }

    .cls-${uniqueID}-1, .cls-${uniqueID}-2, .cls-${uniqueID}-3, .cls-${uniqueID}-4, .cls-${uniqueID}-5, .cls-${uniqueID}-6, .cls-${uniqueID}-7, .cls-${uniqueID}-8 {
      stroke: #231f20;
      stroke-miterlimit: 10;
    }

    .cls-${uniqueID}-9 {
      letter-spacing: 0em;
    }

    .cls-${uniqueID}-10 {
      letter-spacing: 0em;
    }

    .cls-${uniqueID}-2 {
      fill: #bcbec0;
    }

    .cls-${uniqueID}-11 {
      fill: #fff;
      font-family: TitilliumWeb-Bold, 'Titillium Web';
      font-size: 1rem;
      font-weight: 700;
    }

    .cls-${uniqueID}-12 {
        fill: #fff;
        font-family: TitilliumWeb-Bold, 'Titillium Web';
        font-size: 3rem;
        font-weight: 700;
    }

    .cls-${uniqueID}-13 {
      fill : #fff;
      font-family: TitilliumWeb-Bold, 'Titillium Web';
      font-size: 6rem;
      font-weight: 700;
    }

    .cls-${uniqueID}-3 {
      fill: #2f3d96;
    }

    .cls-${uniqueID}-4 {
      fill: #c49a6c;
    }

    .cls-${uniqueID}-5 {
      fill: #58595b;
    }

    .cls-${uniqueID}-6 {
      fill: ${colour};
    }

    .cls-${uniqueID}-7 {
      fill: #a7a9ac;
    }

    .cls-${uniqueID}-8 {
      fill: #6d6e71;
    }
  `;
  defs.appendChild(style);
  svg.appendChild(defs);

  // Create and append all the SVG elements as in the provided SVG
  const ellipse1 = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
  ellipse1.classList.add(`cls-${uniqueID}-6`);
  ellipse1.setAttribute("cx", "63.23");
  ellipse1.setAttribute("cy", "96.09");
  ellipse1.setAttribute("rx", "10.1");
  ellipse1.setAttribute("ry", "30.46");
  ellipse1.setAttribute("transform", "translate(-50.17 115.37) rotate(-66.3)");

  const ellipse2 = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
  ellipse2.classList.add(`cls-${uniqueID}-6`);
  ellipse2.setAttribute("cx", "133.73");
  ellipse2.setAttribute("cy", "94.91");
  ellipse2.setAttribute("rx", "30.46");
  ellipse2.setAttribute("ry", "10.1");
  ellipse2.setAttribute("transform", "translate(-26.87 61.75) rotate(-23.7)");

  const ellipse3 = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
  ellipse3.classList.add(`cls-${uniqueID}-6`);
  ellipse3.setAttribute("cx", "97.87");
  ellipse3.setAttribute("cy", "142.02");
  ellipse3.setAttribute("rx", "34.63");
  ellipse3.setAttribute("ry", "72.25");

  const rect1 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect1.classList.add(`cls-${uniqueID}-5`);
  rect1.setAttribute("x", "27.27");
  rect1.setAttribute("y", "132.96");
  rect1.setAttribute("width", "139.21");
  rect1.setAttribute("height", "211.06");

  const rect2 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect2.classList.add(`cls-${uniqueID}-3`);
  rect2.setAttribute("x", "33.8");
  rect2.setAttribute("y", "136.01");
  rect2.setAttribute("width", "128.13");
  rect2.setAttribute("height", "22.19");

  const rect3 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect3.classList.add(`cls-${uniqueID}-3`);
  rect3.setAttribute("x", "33.8");
  rect3.setAttribute("y", "162.08");
  rect3.setAttribute("width", "128.13");
  rect3.setAttribute("height", "178.61");

  const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path1.classList.add(`cls-${uniqueID}-1`);
  path1.setAttribute("d", "m.52,238.49h26.75v-105.53c-2.65.03-9.62.46-16.54,5.38-6.26,4.45-9.13,10.19-10.21,12.71v87.43");

  const polygon1 = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  polygon1.classList.add(`cls-${uniqueID}-2`);
  polygon1.setAttribute("points", "27.26 151.06 .52 170.96 .52 180.94 27.27 162.08 27.26 151.06");

  const polygon2 = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  polygon2.classList.add(`cls-${uniqueID}-8`);
  polygon2.setAttribute("points", "27.24 170.78 .5 190.68 .5 200.67 27.25 181.81 27.24 170.78");

  const polygon3 = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  polygon3.classList.add(`cls-${uniqueID}-7`);
  polygon3.setAttribute("points", "27.24 190.35 .5 210.25 .5 220.23 27.25 201.37 27.24 190.35");

  const polygon4 = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  polygon4.classList.add(`cls-${uniqueID}-8`);
  polygon4.setAttribute("points", "27.26 209.32 .52 229.22 .52 239.2 27.27 220.34 27.26 209.32");

  const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path2.classList.add(`cls-${uniqueID}-6`);
  path2.setAttribute("d", "m27.27,238.49v105.53c-2.66-.03-9.63-.46-16.55-5.38-6.26-4.45-9.13-10.19-10.21-12.71v-87.43");

  const path3 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path3.classList.add(`cls-${uniqueID}-1`);
  path3.setAttribute("d", "m193.24,238.49h-26.75v-105.53c2.65.03,9.62.46,16.54,5.38,6.26,4.45,9.13,10.19,10.21,12.71v87.43");

  const polygon5 = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  polygon5.classList.add(`cls-${uniqueID}-2`);
  polygon5.setAttribute("points", "166.49 151.06 193.24 170.96 193.24 180.94 166.49 162.08 166.49 151.06");

  const polygon6 = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  polygon6.classList.add(`cls-${uniqueID}-8`);
  polygon6.setAttribute("points", "166.51 170.78 193.26 190.68 193.26 200.67 166.5 181.81 166.51 170.78");

  const polygon7 = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  polygon7.classList.add(`cls-${uniqueID}-2`);
  polygon7.setAttribute("points", "166.51 190.35 193.26 210.25 193.26 220.23 166.5 201.37 166.51 190.35");

  const polygon8 = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  polygon8.classList.add(`cls-${uniqueID}-8`);
  polygon8.setAttribute("points", "166.49 209.32 193.24 229.22 193.24 239.2 166.49 220.34 166.49 209.32");

  const path4 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path4.classList.add(`cls-${uniqueID}-6`);
  path4.setAttribute("d", "m166.49,238.49v105.53c2.66-.03,9.63-.46,16.55-5.38,6.26-4.45,9.13-10.19,10.21-12.71v-87.43");

  const answerEl = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
  answerEl.setAttribute("x", "33.8");
  answerEl.setAttribute("y", "162.08");
  answerEl.setAttribute("width", "128.13");
  answerEl.setAttribute("height", "178.61");
  
  const answerTextDiv = document.createElement("div");
  answerTextDiv.style.textAlign = "center";
  answerTextDiv.style.display = "flex";
  answerTextDiv.style.alignItems = "center";
  answerTextDiv.style.justifyContent = "center";
  answerTextDiv.style.height = "100%";
  answerTextDiv.style.width = "100%";

  const answerText = document.createElement("p");
  answerText.id = `answer-${uniqueID}`;
  answerText.setAttribute("hidden", "true");
  answerText.style.margin = "0";
  answerText.textContent = "Who was the one along the way";

  answerTextDiv.appendChild(answerText);
  answerEl.appendChild(answerTextDiv);

  const usernameEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
  usernameEl.classList.add(`cls-${uniqueID}-11`);
  usernameEl.id = `username-${uniqueID}`;
  usernameEl.setAttribute("text-anchor", "middle");
  usernameEl.setAttribute("y", "152");
  usernameEl.setAttribute("x", "100");
  usernameEl.textContent = username;

  const scoreEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
  scoreEl.classList.add(`cls-${uniqueID}-12`);
  scoreEl.id = `score-${uniqueID}`;
  scoreEl.setAttribute("text-anchor", "middle");
  scoreEl.setAttribute("y", "250");
  scoreEl.setAttribute("x", "100");
  scoreEl.textContent = score;

  const incorrectEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
  incorrectEl.classList.add(`cls-${uniqueID}-13`);
  incorrectEl.id = `incorrect-${uniqueID}`;
  incorrectEl.setAttribute("text-anchor", "middle");
  incorrectEl.setAttribute("y", "275");
  incorrectEl.setAttribute("x", "100");
  incorrectEl.setAttribute("hidden", "true");
  incorrectEl.textContent = "X";

  const buzzSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    buzzSvg.setAttribute("width", "100");
    buzzSvg.setAttribute("height", "100");
    buzzSvg.setAttribute("viewBox", "0 0 24 24");
    buzzSvg.setAttribute("stroke-width", "2");
    buzzSvg.setAttribute("stroke", "currentColour");
    buzzSvg.setAttribute("fill", "none");
    buzzSvg.setAttribute("stroke-linecap", "round");
    buzzSvg.setAttribute("stroke-linejoin", "round");
    buzzSvg.setAttribute("y", "200");
    buzzSvg.setAttribute("x", "50");

    const buzzPath1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    buzzPath1.setAttribute("stroke", "none");
    buzzPath1.setAttribute("d", "M0 0h24v24H0z");
    buzzPath1.setAttribute("fill", "none");

    const buzzPath2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    buzzPath2.setAttribute("d", "M17.451 2.344a1 1 0 0 1 1.41 -.099a12.05 12.05 0 0 1 3.048 4.064a1 1 0 1 1 -1.818 .836a10.05 10.05 0 0 0 -2.54 -3.39a1 1 0 0 1 -.1 -1.41z");
    buzzPath2.setAttribute("stroke-width", "0");
    buzzPath2.setAttribute("fill", "#fff");

    const buzzPath3 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    buzzPath3.setAttribute("d", "M5.136 2.245a1 1 0 0 1 1.312 1.51a10.05 10.05 0 0 0 -2.54 3.39a1 1 0 1 1 -1.817 -.835a12.05 12.05 0 0 1 3.045 -4.065z");
    buzzPath3.setAttribute("stroke-width", "0");
    buzzPath3.setAttribute("fill", "#fff");

    const buzzPath4 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    buzzPath4.setAttribute("d", "M14.235 19c.865 0 1.322 1.024 .745 1.668a3.992 3.992 0 0 1 -2.98 1.332a3.992 3.992 0 0 1 -2.98 -1.332c-.552 -.616 -.158 -1.579 .634 -1.661l.11 -.006h4.471z");
    buzzPath4.setAttribute("stroke-width", "0");
    buzzPath4.setAttribute("fill", "#fff");

    const buzzPath5 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    buzzPath5.setAttribute("d", "M12 2c1.358 0 2.506 .903 2.875 2.141l.046 .171l.008 .043a8.013 8.013 0 0 1 4.024 6.069l.028 .287l.019 .289v2.931l.021 .136a3 3 0 0 0 1.143 1.847l.167 .117l.162 .099c.86 .487 .56 1.766 -.377 1.864l-.116 .006h-16c-1.028 0 -1.387 -1.364 -.493 -1.87a3 3 0 0 0 1.472 -2.063l.021 -.143l.001 -2.97a8 8 0 0 1 3.821 -6.454l.248 -.146l.01 -.043a3.003 3.003 0 0 1 2.562 -2.29l.182 -.017l.176 -.004z");
    buzzPath5.setAttribute("stroke-width", "0");
    buzzPath5.setAttribute("fill", "#fff");

    buzzSvg.appendChild(buzzPath1);
    buzzSvg.appendChild(buzzPath2);
    buzzSvg.appendChild(buzzPath3);
    buzzSvg.appendChild(buzzPath4);
    buzzSvg.appendChild(buzzPath5);

    buzzSvg.id = `buzz-${uniqueID}`;
    buzzSvg.setAttribute("hidden", "true")

    const circle1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle1.classList.add(`cls-${uniqueID}-4`);
    circle1.setAttribute("cx", "97.87");
    circle1.setAttribute("cy", "35.13");
    circle1.setAttribute("r", "34.63");

    // Append all SVG elements to the main SVG container
    svg.appendChild(ellipse1);
    svg.appendChild(ellipse2);
    svg.appendChild(ellipse3);
    svg.appendChild(rect1);
    svg.appendChild(rect2);
    svg.appendChild(rect3);
    svg.appendChild(path1);
    svg.appendChild(polygon1);
    svg.appendChild(polygon2);
    svg.appendChild(polygon3);
    svg.appendChild(polygon4);
    svg.appendChild(path2);
    svg.appendChild(path3);
    svg.appendChild(polygon5);
    svg.appendChild(polygon6);
    svg.appendChild(polygon7);
    svg.appendChild(polygon8);
    svg.appendChild(path4);
    svg.appendChild(usernameEl);
    svg.appendChild(scoreEl);
    svg.appendChild(incorrectEl);
    svg.appendChild(answerEl);
    svg.appendChild(buzzSvg);
    svg.appendChild(circle1);
  
  const col = document.createElement('div');
  col.classList.add('col');
  col.appendChild(svg);

  return col;
}

function updateScore(username, score) {
  console.log(username)
  const scoreEl = document.getElementById(`score-${username}`);
  console.log(scoreEl)
  scoreEl.textContent = score;
}


function showSvgEl(username, el) {
  if(!username || !el) return;

  const buzzEl = document.getElementById(`buzz-${username}`);
  const scoreEl = document.getElementById(`score-${username}`);
  const incorrectEl = document.getElementById(`incorrect-${username}`);
  const answerEl = document.getElementById(`answer-${username}`);

  if(el == "score" && !incorrectEl.hasAttribute("hidden")) return; 

  el == "buzz" ? buzzEl.removeAttribute("hidden") : buzzEl.setAttribute("hidden", "true");
  el == "score" ? scoreEl.removeAttribute("hidden") : scoreEl.setAttribute("hidden", "true");
  el == "incorrect" ? incorrectEl.removeAttribute("hidden") : incorrectEl.setAttribute("hidden", "true");
  el == "answer" ? answerEl.removeAttribute("hidden") : answerEl.setAttribute("hidden", "true");
}


function updatePlayers(players) {
  const container = document.getElementById('question-players')
  container.innerHTML = '';

  players.forEach(player => {
    const svg = createSvg(player.username, player.score, player.colour);
    container.appendChild(svg);
  });
}
