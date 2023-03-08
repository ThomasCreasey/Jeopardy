import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import session, { Session } from 'express-session';
import bodyParser from 'body-parser';
import fs from 'fs';

interface Player {
  name: string;
  host: boolean;
  points: number;
  id: string;
}

interface questionDataClient {
  category: string;
  question?: string;
  value: number;
}

interface questionDataServer {
  category: string;
  usersAnswered: string[];
  question: string;
  answers: string[];
  value: number;
}
interface question {
  category: string;
  question: string;
  answers: string[];
  value: number;
}

interface Room {
  id: string;
  open: boolean;
  waitingFor: string;
  categories?: string[];
  question?: questionDataServer;
  questionsAnswered: number;
  questions: any;
  currentTurn: string;
  players: Player[];
}
declare module 'http' {
  interface IncomingMessage {
    session: Session & {
      name: string;
      code: string;
    };
  }
}

dotenv.config();

const app: Express = express();
app.use(bodyParser.urlencoded({ extended: true }));

const sessionMiddleware = session({
  secret: 'thicklizzywasgay',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 60 * 60 * 1000 },
});

app.use(sessionMiddleware);

const port = 3000;

const httpServer = createServer(app);
const io = new Server(httpServer, {});
io.engine.use(sessionMiddleware);

app.set('view engine', 'ejs');

app.use('/css', express.static('public/assets/css'));
app.use('/js', express.static('public/assets/js'));
app.set('views', path.join(__dirname, '../public/templates'));

const rooms: Room[] = [];

function checkName(name: string, roomId: string) {
  return new Promise((resolve) => {
    if (!rooms || rooms.length < 1) resolve(true);
    const roomData = rooms.filter((room) => room.id === roomId)[0];
    if (!roomData || !roomData.players[0]) resolve(true);
    const playerIndex = roomData.players.filter(
      (player) => player.name === name,
    );
    if (playerIndex.length > 0) {
      io.to(roomId)
        .timeout(5000)
        .emit(
          'checkname',
          playerIndex[0].id,
          (err: Error, response: boolean[]) => {
            if (err) {
              // Name is not taken
              resolve(true);
            } else {
              if (!response[0]) {
                // Name is not taken
                resolve(true);
              } else {
                // Name is taken
                resolve(false);
              }
            }
          },
        );
    } else {
      resolve(true);
    }
  });
}

io.on('connection', (socket: Socket) => {
  // When a client connects to the server
  const roomId = socket.request.session.code; // Get the room id from the referer
  if (!roomId) return; // If there is no room id return
  const name = socket.request.session.name; // Get the users name from the session
  if (!name) return; // If there is no name, return

  const player: Player = {
    // Create a new player object
    name: socket.request.session.name,
    points: 0,
    id: socket.id,
    host: false,
  };
  if (
    // If there are no rooms or the room does not exist
    rooms.length < 1 ||
    rooms.filter((room) => room.id === roomId).length === 0
  ) {
    player.host = true; // Set the player as the host
    player.name = `⭐ ${player.name}`;
    rooms.push({
      // Create a new room
      id: roomId,
      waitingFor: '',
      questions: [],
      questionsAnswered: 0,
      open: true,
      currentTurn: player.id,
      players: [player],
    });
    socket.join(roomId); // Subscribe client to the room

    io.to(roomId).emit('newplayer', player); // Emit the new player event to the room
    io.to(roomId).emit('host', player); // Set the host of the room via event
  } else {
    // If the room exists
    const roomData = rooms[rooms.findIndex((room) => room.id === roomId)]; // Get the room data
    const playerIndex = roomData.players.filter(
      // Check if the player exists in room data
      (player) => player.name === name,
    );
    if (!roomData.open) {
      return socket.emit('lobby-locked', socket.id);
    }
    socket.join(roomId); // Subscribe client to the room
    if (playerIndex.length < 1) {
      // If the player is not in the room
      roomData.players.push(player); // Add the player to the room
      io.to(roomId).emit('newplayer', player);
    } else {
      // If the player is in the room
      if (playerIndex[0].host) {
        const index = rooms.findIndex((room) => room.id === roomId);
        rooms.splice(index, 1);
        io.to(roomId).emit('lobby-closed', 'Host left the lobby');
      } else {
        roomData.players.push(player); // Add the player to the room
        playerIndex[0].id = socket.id;
        io.to(roomId).emit('newplayer', player);
      }
    }
  }

  socket.on('start-game', (data) => {
    // When the host starts the game
    const roomData = rooms[rooms.findIndex((room) => room.id === roomId)];
    if (player.host && roomData.players.length > 1) {
      // If the player is the host and there is more than 1 player
      if (!data.allowJoining) roomData.open = false;

      if (data.categories.length > 5) return; // If there are more than 5 categories, return
      roomData.categories = data.categories;

      const questions = JSON.parse(fs.readFileSync('questions.json', 'utf8')); // Read the questions file
      const categories = data.categories; // Get the categories from the request
      categories.forEach((category: string) => {
        // For each category
        const categoryQuestions = questions[category]; // Get the questions for the category
        const randomQuestions: question[] = []; // Create an array for the random questions
        for (let i = 0; i < 5; i++) {
          const categoryValue = (i + 1) * 200;
          const filteredQuestions = categoryQuestions.filter(
            (question: any) => question.value === categoryValue,
          );
          const randomQuestion =
            filteredQuestions[
              Math.floor(Math.random() * filteredQuestions.length)
            ];
          if (randomQuestion) randomQuestions.push(randomQuestion);
        }
        roomData.questions[category] = randomQuestions; // Push the random questions to the room questions array
      });

      io.to(roomId).emit('start-game', data.categories); // Emit the start game event to the room
    }
  });

  socket.on('kick', (id: string) => {
    // When the host kicks a player
    if (player.host) {
      // Verify the request is from the host
      const roomData = rooms[rooms.findIndex((room) => room.id === roomId)];
      const playerIndex = roomData.players.findIndex(
        // Find the player in the room
        (player) => player.id === id,
      );
      if (playerIndex > -1) {
        roomData.players.splice(playerIndex, 1); // Remove the player from the room
        io.to(roomId).emit('kick', id); // Emit the kick event to the room to redirect them
      }
    }
  });

  socket.on('category-select', (data: questionDataClient) => {
    // When a category is selected
    const roomData = rooms[rooms.findIndex((room) => room.id === roomId)];
    if (roomData.currentTurn === socket.id) {
      roomData.waitingFor = '';
      const currentQuestion = roomData.questions[data.category].filter(
        (q: any) => q.value === data.value,
      )[0];
      if (!currentQuestion) return;
      // Ensure the request is from the right player
      data['question'] = currentQuestion.name;
      const serverData: questionDataServer = {
        question: currentQuestion.name,
        usersAnswered: [],
        answers: currentQuestion.answers,
        category: data.category,
        value: currentQuestion.value,
      };
      roomData.question = serverData;
      roomData.questionsAnswered += 1;
      io.to(roomId).emit('set-question', data);
    }
  });

  socket.on('buzz', () => {
    // When a player buzzes in
    const roomData = rooms[rooms.findIndex((room) => room.id === roomId)];
    if (roomData.question.usersAnswered.includes(player.id)) return; // If the player has already buzzed in, return
    if (roomData.waitingFor) return;
    roomData.waitingFor = socket.id; // Set the waiting for property to the player who buzzed in
    roomData.question.usersAnswered.push(player.id); // Add the player to the users answered array
    io.to(roomId).emit('buzzed', player); // Emit the buzzed event to the room to allow them to input an answer
  });

  socket.on('timed-out', () => {
    // When a player doesnt answer in time
    const roomData = rooms[rooms.findIndex((room) => room.id === roomId)];
    if (roomData.waitingFor === socket.id) {
      roomData.waitingFor = ''; // Set the waiting for property to empty
      io.to(roomId).emit('timed-out'); // Emit the timed out event to the room to allow the next player to buzz in

      const colourData = {
        // Data to update the colour of the category buttons
        colour: 'danger',
        category: roomData.question.category,
        value: roomData.question.value,
      };
      if (
        // If all players have answered
        roomData.question.usersAnswered.length === roomData.players.length
      ) {
        setTimeout(() => {
          // Set a timeout to allow the modal to display for a few seconds, time should match the client side modal timeout
          const nextUser = roomData.players.find(
            (player) => player.id === roomData.currentTurn,
          );
          if (!nextUser)
            return io.to(roomId).emit('lobby-closed', 'Not enough players');

          io.to(roomId).emit('category-select', nextUser); // Allow the user to select a new category
          io.to(roomId).emit('update-colour', colourData); // Emit the update colour event to the room to update the colour of the category buttons
        }, 3000);
      }
    }
  });

  socket.on('get-points', (cb) => {
    // When a player requests the points
    const roomData = rooms[rooms.findIndex((room) => room.id === roomId)];
    const points = roomData.players.map((player) => {
      // Map the players to an object with their name and points
      return { name: player.name, points: player.points };
    });
    cb(points); // Return the points to the requester via a callback
  });

  socket.on('category-select-timeout', () => {
    // When the category select timer runs out
    const roomData = rooms[rooms.findIndex((room) => room.id === roomId)];
    if (socket.id === roomData.currentTurn) {
      // If the request is from the right player
      const newPlayers = roomData.players.filter(
        // Make an array of all players excluding the one that just timed out
        (p) => p.id !== roomData.currentTurn,
      );
      if (!newPlayers)
        return io.to(roomId).emit('lobby-closed', 'Not enough players');
      const nextUser = newPlayers[0]; // Set the next user to the first player in the new array that was just made
      if (!nextUser)
        return io.to(roomId).emit('lobby-closed', 'Not enough players');

      roomData.currentTurn = nextUser.id; // Set the current turn to the next user
      io.to(roomId).emit('category-select', nextUser); // Emit the category select event to the room to allow the next player to select a category
    }
  });

  socket.on('main-timeout', () => {
    // When the main timer runs out for inputs
    const roomData = rooms[rooms.findIndex((room) => room.id === roomId)];
    if (player.host) {
      // Only allow request from the host, to prevent this event from firing multiple times
      const colourData = {
        // Data to update the colour of the category buttons
        colour: 'danger',
        category: roomData.question.category,
        value: roomData.question.value,
      };

      const nextUser = roomData.players.find(
        // Find the next user
        (player) => player.id === roomData.currentTurn,
      );
      if (!nextUser)
        return io.to(roomId).emit('lobby-closed', 'Not enough players');
      io.to(roomId).emit('category-select', nextUser); // Emit the category select event to the room to allow the next player to select a category
      io.to(roomId).emit('update-colour', colourData); // Emit the update colour event to the room to update the colour of the category buttons
    }
  });

  socket.on('answer', (answer: string) => {
    // When a player answers a question
    const roomData = rooms[rooms.findIndex((room) => room.id === roomId)];
    if (roomData.waitingFor === socket.id) {
      roomData.waitingFor = '';
      // If the request is from the right player
      const playerIndex = roomData.players.findIndex(
        (player) => player.id === socket.id,
      );

      const questionData = roomData.question;
      const currentQuestion = roomData.questions[questionData.category].filter(
        (q: any) => q.name === questionData.question,
      )[0];
      const answers = currentQuestion.answers;

      if (answers.includes(answer.toLowerCase())) {
        // If the answer is correct
        const colourData = {
          // Data to update the colour of the category buttons
          category: roomData.question.category,
          colour: 'success',
          value: roomData.question.value,
        };
        const points = roomData.question.value;
        roomData.players[playerIndex].points += points; // Add the points to the players points
        roomData.currentTurn = socket.id; // Set the current turn to the player who answered correctly
        io.emit('correct-answer', {
          // Will display a modal to show users that the player answered correctly
          answer,
          points,
          player: roomData.players[playerIndex],
        });
        io.emit('update-colour', colourData); // Emit the update colour event to the room to update the colour of the category buttons

        setTimeout(() => {
          // Set a timeout to allow the modal to display for a few seconds
          const nextUser = roomData.players.find(
            (player) => player.id === roomData.currentTurn,
          );
          if (!nextUser)
            return io.to(roomId).emit('lobby-closed', 'Not enough players');

          if (
            roomData.questionsAnswered ===
            Object.keys(roomData.questions).length * 5
          ) {
            const playerPoints = roomData.players.map((player) => {
              return { name: player.name, points: player.points };
            });
            const sortedPlayers = playerPoints.sort(
              (a, b) => b.points - a.points,
            );
            io.to(roomId).emit('game-over', sortedPlayers);
          } else {
            io.to(roomId).emit('category-select', nextUser); // Allow the user to select a new category
          }
        }, 3000);
      } else {
        const colourData = {
          // Data to update the colour of the category buttons
          colour: 'danger',
          category: roomData.question.category,
          value: roomData.question.value,
        };

        io.emit('incorrect-answer', roomData.players[playerIndex]); // Will display a modal to show users that the player answered incorrectly

        if (
          // If all players have answered
          roomData.question.usersAnswered.length === roomData.players.length
        ) {
          setTimeout(() => {
            // Set a timeout to allow the modal to display for a few seconds, time should match the client side modal timeout
            const nextUser = roomData.players.find(
              (player) => player.id === roomData.currentTurn,
            );
            if (!nextUser)
              return io.to(roomId).emit('lobby-closed', 'Not enough players');

            if (
              roomData.questionsAnswered ===
              Object.keys(roomData.questions).length * 5
            ) {
              console.log('game over');
              const playerPoints = roomData.players.map((player) => {
                return { name: player.name, points: player.points };
              });
              const sortedPlayers = playerPoints.sort(
                (a, b) => b.points - a.points,
              );
              io.to(roomId).emit('game-over', sortedPlayers);
            } else {
              io.to(roomId).emit('category-select', nextUser); // Allow the user to select a new category
              io.to(roomId).emit('update-colour', colourData); // Emit the update colour event to the room to update the colour of the category buttons
            }
          }, 3000);
        }
      }
    }
  });

  socket.on('disconnect', () => {
    // When a user disconnects
    const roomData = rooms[rooms.findIndex((room) => room.id === roomId)];
    if (!roomData) return;
    const playerIndex = roomData.players.findIndex(
      (player) => player.id === socket.id,
    );

    if (player.host) {
      // If the player is the host
      const index = rooms.findIndex((room) => room.id === roomId);
      rooms.splice(index, 1);
      io.to(roomId).emit('lobby-closed', 'Host left'); // Close the room
    } else {
      roomData.players.splice(playerIndex, 1); // Remove the player from the room
    }

    if (roomData.players.length < 2 && !roomData.open) {
      // if there are less than 2 players in the room and the game has not started
      const index = rooms.findIndex((room) => room.id === roomId);
      rooms.splice(index, 1);
      io.to(roomId).emit('lobby-closed', 'Not enough players'); // Close the room
      return;
    }

    io.to(roomId).emit('player-left', socket.id); // Emit event to remove player from host menu
  });
});

app.get('/', (req: Request, res: Response) => {
  res.render('index.ejs');
});

app.post('/create-lobby', (req: Request, res: Response) => {
  const id = Math.random().toString(36).substring(2, 7);
  res.status(200).send(id);
});

app.post('/join-lobby', async (req: Request, res: Response) => {
  const name = req.body.name.slice(0, 15);
  const valid = await checkName(name, req.body.code); // Check if name is taken
  if (valid) {
    // Name is not taken
    req.session.code = req.body.code;
    req.session.name = name;
    res.status(200).send('valid');
  } else {
    // Name is taken
    res.status(200).send('invalid');
  }
});

app.post('/', (req: Request, res: Response) => {
  const room = rooms.find((room) => room.id === req.body.code);
  if (room) {
    // If room exists
    res.redirect(`/play/${req.body.code}`);
  } else {
    res.status(200).send('invalid');
  }
});

app.get('/play/:id', (req: Request, res: Response) => {
  const categories = JSON.parse(fs.readFileSync('questions.json', 'utf8')); // Get the categories from the json file (this is just an array of objects

  for (let i = 0; i < 5; ) {
    const random = Math.floor(Math.random() * Object.keys(categories).length);
    const index = Object.keys(categories)[random];
    if (!categories[index].selected) {
      categories[index].selected = true;
      i++;
    }
  }

  const name = req.session.name;
  res.render('play.ejs', { categories, name });
});

httpServer.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
