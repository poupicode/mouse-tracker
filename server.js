const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Servir les fichiers statiques de 'public' (index.html, etc.)
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

let users = {};  // Pour stocker les utilisateurs
let availableColors = ['red', 'blue', 'orange', 'pink'];  // Liste des couleurs disponibles

io.on('connection', (socket) => {
    console.log('Nouvelle connexion:', socket.id);

    // Vérifie si une couleur est disponible, sinon rejette la connexion
    if (availableColors.length === 0) {
        socket.emit('error', 'Aucune couleur disponible');
        socket.disconnect();
        return;
    }

    // Attribuer la première couleur disponible à l'utilisateur
    const assignedColor = availableColors.shift();  // Prend la première couleur dans la liste

    // Enregistrer la couleur pour cet utilisateur
    users[socket.id] = { color: assignedColor };

    // Envoie la couleur au client lors de la connexion
    socket.emit('user_color', assignedColor);

    // Écoute des mouvements de souris de l'utilisateur
    socket.on('mouse_move', (data) => {
        // Diffuser la position de la souris avec l'id de l'utilisateur et la couleur
        io.emit('mouse_move', { id: socket.id, ...data, color: assignedColor });
    });

    // Gestion de la déconnexion
    socket.on('disconnect', () => {
        // Libérer la couleur pour qu'elle soit réutilisée
        availableColors.push(assignedColor);
        console.log('Utilisateur déconnecté:', socket.id);
        delete users[socket.id];
    });
});

// Démarrer le serveur
server.listen(3000, '0.0.0.0', () => {
    console.log('Serveur sur http://localhost:3000');
});