const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*"
    }
});

io.on('connection', (socket) => {
    console.log('Nouvelle connexion');

    socket.on('mouse_move', (data) => {
        socket.broadcast.emit('mouse_move', data);
    });

    socket.on('disconnect', () => {
        console.log('Utilisateur déconnecté');
    });
});

server.listen(3000, '0.0.0.0', () => console.log('Serveur sur http://localhost:3000'));