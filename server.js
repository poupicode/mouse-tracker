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

let users = {};  // Stocke { socket.id: couleur }
let availableColors = ['red', 'blue', 'orange', 'pink'];  

io.on('connection', (socket) => {
    console.log('Nouvelle connexion:', socket.id);

    if (availableColors.length === 0) {
        socket.emit('error', 'Aucune couleur disponible');
        socket.disconnect();
        return;
    }

    // 🔥 Attribuer la première couleur dispo
    const assignedColor = availableColors.shift();  
    users[socket.id] = assignedColor;  

    // 🔄 Envoyer la couleur uniquement à l'utilisateur concerné
    socket.emit('user_color', assignedColor);  

    // Quand l'utilisateur bouge sa souris
    socket.on('mouse_move', (data) => {
        if (users[socket.id]) {  
            io.emit('mouse_move', { 
                id: socket.id, 
                x: data.x, 
                y: data.y, 
                color: users[socket.id]  
            });
        }
    });

    // 🛑 Gestion de la déconnexion propre
    socket.on('disconnect', () => {
        console.log('Utilisateur déconnecté:', socket.id);
        
        if (users[socket.id]) {
            availableColors.push(users[socket.id]);  // 🔄 Remet la couleur dispo
            delete users[socket.id];  
        }
    });
});

server.listen(3000, '0.0.0.0', () => {
    console.log('Serveur en ligne sur http://localhost:3000');
});