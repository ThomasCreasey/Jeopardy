import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
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

io.use((socket: Socket, next) => {
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
  host: boolean;
  id: string;
}

interface Room {
  id: string;
  open: boolean;
  players: Player[];
}

const rooms: Room[] = [];

function checkName(name: string, roomId: string) {
  return new Promise((resolve, reject) => {
    if (!rooms || rooms.length < 1) resolve(true);
    const roomData = rooms.filter((room) => room.id === roomId)[0];
    if (!roomData || !roomData.players[0]) resolve(true);
    const playerIndex = roomData.players.filter(
      (player) => player.name === name,
    );
    if (playerIndex.length > 0) {
      io.to(roomId)
        .timeout(5000)
        .emit('checkname', playerIndex[0].id, (err: any, response: any) => {
          if (err) {
            console.log(err);
            // Name is not taken
            resolve(true);
          } else {
            console.log(response);
            if (!response[0]) {
              console.log('a2');
              // Name is not taken
              resolve(true);
            } else {
              console.log('a3');
              // Name is taken
              resolve(false);
            }
          }
        });
    } else {
      resolve(true);
    }
  });
}

io.on('connection', (socket: Socket) => {
  const allowNewConnections = true;
  const referer = socket.handshake.headers.referer;
  const roomId = referer ? referer.split('/play/')[1] : null;
  if (!roomId || !allowNewConnections) return;
  const name = socket.request.session.name;
  if (!name) return;
  const player: Player = {
    name: socket.request.session.name,
    id: socket.id,
    host: false,
  };
  socket.join(roomId);
  if (
    rooms.length < 1 ||
    rooms.filter((room) => room.id === roomId).length === 0
  ) {
    player.host = true;
    rooms.push({
      id: roomId,
      open: true,
      players: [player],
    });

    io.to(roomId).emit('newplayer', player);
    io.to(roomId).emit('host', player);
    console.log('created new room');
  } else {
    const roomData = rooms[rooms.findIndex((room) => room.id === roomId)];
    if (roomData.players.filter((player) => player.name === name).length < 1) {
      rooms[rooms.findIndex((room) => room.id === roomId)].players.push(player);
      io.to(roomId).emit('newplayer', player);
    } else {
      if (roomData.players.filter((player) => player.name === name)[0].host) {
        console.log('close lobby');
      } else {
        rooms[rooms.findIndex((room) => room.id === roomId)].players.filter(
          (player) => player.name === name,
        )[0].id = socket.id;
        console.log('reconnected');
        io.to(roomId).emit('newplayer', player);
      }
    }
  }
  console.log(rooms[rooms.findIndex((room) => room.id === roomId)].players);

  socket.on('kick', (id: string) => {
    if (player.host) {
      const roomData = rooms[rooms.findIndex((room) => room.id === roomId)];
      const playerIndex = roomData.players.findIndex(
        (player) => player.id === id,
      );
      if (playerIndex > -1) {
        roomData.players.splice(playerIndex, 1);
        io.to(roomId).emit('kick', id);
      }
    }
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
  const valid = await checkName(name, req.body.code);
  if (valid) {
    req.session.name = name;
    res.status(200).send('valid');
    // Name is not taken
    console.log('name not taken');
  } else {
    res.status(200).send('invalid');
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
