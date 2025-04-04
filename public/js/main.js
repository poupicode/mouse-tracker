const socket = io();

let userColor = localStorage.getItem('userColor') || '';
let userName = localStorage.getItem('userName') || '';
let isSpectator = false;
let userCursor, myTag;

// 👤 Demande nom si pas stocké
if (!userName) {
    userName = prompt("Quel est ton nom ?") || "Anonyme";
    userName = userName.trim().slice(0, 20);
    localStorage.setItem('userName', userName);
}
socket.emit('set_name', userName);

// 🔄 Si une couleur est en mémoire, on tente de la récupérer
if (userColor && !isSpectator) {
    socket.emit('restore_color', userColor);
}

// 🎟 Mode spectateur activé
socket.on('spectator_mode', (msg) => {
    isSpectator = true;

    // Overlay sombre
    const overlay = document.createElement('div');
    overlay.id = 'spectatorOverlay';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0, 0, 0, 0.4)';
    overlay.style.zIndex = '9999';
    overlay.style.pointerEvents = 'none';
    document.body.appendChild(overlay);

    // Message en bas de l'écran
    const spectatorMsg = document.createElement('div');
    spectatorMsg.id = 'spectatorMsg';
    spectatorMsg.innerText = msg;
    spectatorMsg.style.position = 'fixed';
    spectatorMsg.style.bottom = '40px';
    spectatorMsg.style.left = '50%';
    spectatorMsg.style.transform = 'translateX(-50%)';
    spectatorMsg.style.fontSize = '24px';
    spectatorMsg.style.color = 'white';
    spectatorMsg.style.fontWeight = 'bold';
    spectatorMsg.style.background = 'rgba(0, 0, 0, 0.6)';
    spectatorMsg.style.padding = '10px 20px';
    spectatorMsg.style.borderRadius = '8px';
    spectatorMsg.style.zIndex = '10000';
    spectatorMsg.style.pointerEvents = 'none';
    spectatorMsg.style.fontFamily = 'Arial Black, sans-serif';
    document.body.appendChild(spectatorMsg);
});

// 🔄 Essaye de devenir joueur si spectateur
setInterval(() => {
    if (isSpectator) {
        socket.emit('try_become_player');
    }
}, 5000);

// ✅ Réception de la couleur → passage en joueur
socket.on('user_color', (color) => {
    userColor = color;
    localStorage.setItem('userColor', color);
    console.log(`🎯 Image du curseur chargée: images/${color}-cursor.png`);

    if (isSpectator) {
        isSpectator = false;
        document.getElementById('spectatorOverlay')?.remove();
        document.getElementById('spectatorMsg')?.remove();
    }

    // Crée le curseur et le tag s’ils n’existent pas
    if (!document.querySelector('img.cursor')) {
        userCursor = document.createElement("img");
        userCursor.className = "cursor";
        userCursor.src = `images/${color}-cursor.png`;
        document.body.appendChild(userCursor);

        myTag = document.createElement("div");
        myTag.className = "name-tag";
        myTag.innerText = userName;
        document.body.appendChild(myTag);
    } else {
        userCursor = document.querySelector('img.cursor');
        userCursor.src = `images/${color}-cursor.png`;
    }

    // Attache listener souris une seule fois
    if (!window._cursorListenerAdded) {
        document.addEventListener('mousemove', (event) => {
            if (isSpectator || !userColor) return;
            const x = event.clientX, y = event.clientY;
            userCursor.style.left = `${x - 3}px`;
            userCursor.style.top = `${y - 4}px`;
            myTag.style.left = `${x + 20}px`;
            myTag.style.top = `${y + 45}px`;
            socket.emit('mouse_move', { x, y });
        });
        window._cursorListenerAdded = true;
    }
});

// 👁 Affichage des autres joueurs
const cursors = {};

socket.on('mouse_move', (data) => {
    if (data.id === socket.id) return;

    if (!cursors[data.id]) {
        const cursor = document.createElement("img");
        cursor.className = "cursor";
        cursor.src = `images/${data.color}-cursor.png`;
        document.body.appendChild(cursor);

        const nameTag = document.createElement("div");
        nameTag.className = "name-tag";
        nameTag.innerText = data.name || 'Anonyme';
        document.body.appendChild(nameTag);

        cursors[data.id] = { cursor, nameTag };
    }

    const { cursor, nameTag } = cursors[data.id];
    cursor.style.left = `${data.x - 3}px`;
    cursor.style.top = `${data.y - 4}px`;
    nameTag.style.left = `${data.x + 20}px`;
    nameTag.style.top = `${data.y + 45}px`;
});

// 🧍‍♂️ Liste des utilisateurs connectés
socket.on('update_users', (userList) => {
    const ul = document.getElementById('users');
    if (!ul) return;
    ul.innerHTML = '';
    userList.forEach(user => {
        const li = document.createElement('li');
        li.innerText = user.name || 'Anonyme';
        li.style.color = user.color;
        if (user.id === socket.id) li.style.fontWeight = 'bold';
        ul.appendChild(li);
    });
});

socket.on('error', (msg) => alert(msg));