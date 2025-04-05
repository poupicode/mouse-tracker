import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

app.use(cors());
app.use(express.static(path.join(__dirname, '../../public')));

app.use('/dist/client', express.static(path.join(__dirname, '../client')));

app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
});

interface UserData {
    color: string;
    name: string;
    lastActive: number;
}

let users: Record<string, UserData> = {};
let availableColors: string[] = ['red', 'blue', 'orange', 'pink'];
let usedColors: Record<string, string> = {};

const INACTIVITY_TIMEOUT = 2 * 60 * 1000;

function freeColor(socketId: string) {
    const user = users[socketId];
    if (!user) return;
    const color = user.color;
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

    let isSpectator = false;

    if (availableColors.length === 0) {
        isSpectator = true;
        socket.emit('spectator_mode', '🎟 Le parc est complet – vous êtes en spectateur.');
    } else {
        const assignedColor = availableColors.shift()!;
        users[socket.id] = {
            color: assignedColor,
            lastActive: Date.now(),
            name: ''
        };
        usedColors[assignedColor] = socket.id;
        socket.emit('user_color', assignedColor);
        broadcastUserList();
    }

    socket.on('set_name', (name: string) => {
        if (users[socket.id]) {
            users[socket.id].name = name.trim().slice(0, 20);
            broadcastUserList();
        }
    });

    socket.on('restore_color', (color: string) => {
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
            const assignedColor = availableColors.shift()!;
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

    socket.on('mouse_move', (data: { x: number; y: number }) => {
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

server.listen(3000, () => {
    console.log('🚀 Serveur en ligne sur http://localhost:3000');
});