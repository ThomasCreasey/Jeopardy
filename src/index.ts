import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import session, { Session } from 'express-session';
import bodyParser from 'body-parser';

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

const port = 8080;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  /* options */
});

io.use((socket, next) => {
  sessionMiddleware(
    socket.request as Request,
    {} as Response,
    next as NextFunction,
  );
});

app.set('view engine', 'ejs');

app.use('/css', express.static('public/assets/css'));
app.use('/js', express.static('public/assets/js'));
app.set('views', path.join(__dirname, '../public/templates'));

declare module 'http' {
  interface IncomingMessage {
    session: Session & {
      name: string;
    };
  }
}

interface Player {
  name: string;
  id: string;
}

interface Room {
  id: string;
  players: Player[];
}

const rooms: Room[] = [];

function checkName(name: string, roomId: string) {
  const playerIndex = rooms[0].players.filter((player) => player.name === name);
  if (playerIndex.length > 0) {
    io.to(roomId)
      .timeout(5000)
      .emit('checkname', playerIndex[0].id, (err: any, response: any) => {
        if (err) {
          // Name is not taken
          return true;
        } else {
          if (!response[0]) {
            // Name is not taken
            return true;
          } else {
            // Name is taken
            return false;
          }
        }
      });
  } else {
    return 'room-empty';
  }
}

io.on('connection', (socket) => {
  const allowNewConnections = true;
  const referer = socket.handshake.headers.referer;
  const roomId = referer ? referer.split('/play/')[1] : null;
  if (!roomId || !allowNewConnections) return;
  const name = socket.request.session.name;
  const player = { name: socket.request.session.name, id: socket.id };

  socket.join(roomId);
  if (rooms.filter((room) => room.id === roomId).length === 0) {
    console.log('a');
    rooms.push({
      id: roomId,
      players: [player],
    });
  } else {
    console.log('b');
    console.log(rooms);
    console.log(rooms[0].players);
    const playerIndex = rooms[0].players.filter(
      (player) => player.name === name,
    );
    if (playerIndex.length > 0) {
      console.log('c');
      socket
        .to(roomId)
        .timeout(5000)
        .emit('checkname', playerIndex[0].id, (err: any, response: any) => {
          if (err) {
            // Name is not taken
          } else {
            if (!response[0]) {
              // Name is not taken
            } else {
              // Name is taken
            }
          }
        });
    } else {
      console.log('d');
      rooms[rooms.findIndex((room) => room.id === roomId)].players.push(player);
    }
    return;
  }

  socket.on('categorySelect', (data) => {
    console.log(socket.id);
    io.to(roomId).emit('setQuestion', data);
  });
});

app.get('/', (req: Request, res: Response) => {
  res.render('index.ejs');
});

app.post('/join-lobby', (req: Request, res: Response) => {
  console.log('a');
  const valid = checkName(req.body.name, req.body.code);
  if (valid === 'room-empty') {
    // Room is empty
    console.log('empty room');
  } else if (valid) {
    // Name is not taken
    console.log('name not taken');
  } else {
    // Name is taken
    console.log('name taken');
  }
});

app.post('/', (req: Request, res: Response) => {
  if (req.body.code) {
    // Check if code is valid
    // If valid, redirect to /play/:id
    // If invalid, redirect to /
    const valid = true;
    if (valid) {
      req.session.name = req.body.name;
      res.redirect(`/play/${req.body.code}`);
    } else {
      res.redirect('/');
    }
  }
});

app.get('/play/:id', (req: Request, res: Response) => {
  const categories = [
    {
      name: 'Category 1',
    },
    {
      name: 'Category 2',
    },
    {
      name: 'Category 3',
    },
    {
      name: 'Category 4',
    },
    {
      name: 'Category 5',
    },
  ];
  const name = req.session.name;
  res.render('play.ejs', { categories, name });
});

httpServer.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
