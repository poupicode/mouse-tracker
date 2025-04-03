const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*"
    }
});

let users = {};

io.on('connection', (socket) => {
    console.log('Nouvelle connexion', socket.id);

    // Attribuer une couleur aléatoire à chaque utilisateur
    const colors = ['red', 'blue', 'orange', 'pink'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    // Enregistrer la couleur de l'utilisateur
    users[socket.id] = { color: randomColor };

    socket.on('mouse_move', (data) => {
        // Inclure la couleur dans les données envoyées aux autres utilisateurs
        io.emit('mouse_move', { id: socket.id, ...data, color: randomColor });
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
    });
});

server.listen(3000, '0.0.0.0', () => {
    console.log('Serveur sur http://localhost:3000');
});