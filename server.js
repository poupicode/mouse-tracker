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
const io = socketIo(server, { cors: { origin: "*" } });

let users = {};  // { socket.id: { color, name, lastActive } }
let availableColors = ['red', 'blue', 'orange', 'pink'];
let usedColors = {}; // { color: socket.id }

const INACTIVITY_TIMEOUT = 120 * 1000;

function freeColor(socketId) {
    if (!users[socketId]) return;
    const color = users[socketId].color;
    if (!availableColors.includes(color)) {
        availableColors.push(color);
    }
    delete usedColors[color];
    delete users[socketId];
}

function broadcastUserList() {
    const connectedUsers = Object.entries(users).map(([id, user]) => ({
        id,
        color: user.color,
        name: user.name || 'Anonyme'
    }));
    io.emit('update_users', connectedUsers);
}

setInterval(() => {
    const now = Date.now();
    for (const socketId in users) {
        const user = users[socketId];
        const socketStillConnected = io.sockets.sockets.get(socketId);
        if (!socketStillConnected || now - user.lastActive > INACTIVITY_TIMEOUT) {
            console.log(`⚠️ Inactif ou déconnecté: ${socketId} → libération couleur ${user.color}`);
            freeColor(socketId);
            broadcastUserList();
        }
    }
}, 10000);

io.on('connection', (socket) => {
    console.log('🔵 Connexion:', socket.id);

    // Nettoyage avant attribution
    const now = Date.now();
    for (const socketId in users) {
        const user = users[socketId];
        const socketStillConnected = io.sockets.sockets.get(socketId);
        if (!socketStillConnected || now - user.lastActive > INACTIVITY_TIMEOUT) {
            console.log(`🧹 Nettoyage connexion: ${socketId} → couleur ${user.color} libérée`);
            freeColor(socketId);
        }
    }

    let isSpectator = false;

    if (availableColors.length === 0) {
        isSpectator = true;
        socket.emit('spectator_mode', '🎟 Le parc est complet – vous êtes en spectateur.');
    } else {
        const assignedColor = availableColors.shift();
        users[socket.id] = {
            color: assignedColor,
            lastActive: Date.now(),
            name: ''
        };
        usedColors[assignedColor] = socket.id;
        socket.emit('user_color', assignedColor);
        broadcastUserList();
    }

    socket.on('set_name', (name) => {
        if (users[socket.id]) {
            users[socket.id].name = name.trim().slice(0, 20);
            broadcastUserList();
        }
    });

    socket.on('restore_color', (color) => {
        const taken = Object.values(users).some(user => user.color === color);
        if (
            availableColors.includes(color) &&
            !taken &&
            !users[socket.id]
        ) {
            users[socket.id] = {
                color,
                lastActive: Date.now(),
                name: ''
            };
            availableColors = availableColors.filter(c => c !== color);
            usedColors[color] = socket.id;
            socket.emit('user_color', color);
            broadcastUserList();
        }
    });

    socket.on('try_become_player', () => {
        if (availableColors.length > 0 && !users[socket.id]) {
            const assignedColor = availableColors.shift();
            users[socket.id] = {
                color: assignedColor,
                lastActive: Date.now(),
                name: ''
            };
            usedColors[assignedColor] = socket.id;
            socket.emit('user_color', assignedColor);
            broadcastUserList();
        }
    });

    socket.on('mouse_move', (data) => {
        if (users[socket.id]) {
            users[socket.id].lastActive = Date.now();
            io.emit('mouse_move', {
                id: socket.id,
                x: data.x,
                y: data.y,
                color: users[socket.id].color,
                name: users[socket.id].name
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('🔴 Déconnexion:', socket.id);
        freeColor(socket.id);
        broadcastUserList();
        
        io.emit('user_disconnect', socket.id);
    });
});

server.listen(3000, '0.0.0.0', () => {
    console.log('🚀 Serveur en ligne sur http://localhost:3000');
});