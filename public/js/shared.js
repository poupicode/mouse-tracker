const socket = io();

let userColor = localStorage.getItem('userColor') || '';
let userName = localStorage.getItem('userName') || '';
let isSpectator = false;
let userCursor, myTag;
const cursors = {};

// 🔤 Demander le nom si absent
if (!userName) {
    userName = prompt("Quel est ton nom ?") || "Anonyme";
    userName = userName.trim().slice(0, 20);
    localStorage.setItem('userName', userName);
}
socket.emit('set_name', userName);

// 🔁 Restaurer la couleur si déjà stockée
if (userColor && !isSpectator) {
    socket.emit('restore_color', userColor);
}

// 🎟 Mode spectateur
socket.on('spectator_mode', (msg) => {
    isSpectator = true;

    const overlay = document.createElement('div');
    overlay.id = 'spectatorOverlay';
    overlay.style = `
        position: fixed; top: 0; left: 0;
        width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.4);
        z-index: 9999;
        pointer-events: none;
    `;
    document.body.appendChild(overlay);

    const msgBox = document.createElement('div');
    msgBox.id = 'spectatorMsg';
    msgBox.innerText = msg;
    msgBox.style = `
        position: fixed;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 24px;
        color: white;
        font-weight: bold;
        background: rgba(0,0,0,0.6);
        padding: 10px 20px;
        border-radius: 8px;
        z-index: 10000;
        pointer-events: none;
        font-family: Arial Black, sans-serif;
    `;
    document.body.appendChild(msgBox);
});

// 🔁 Tentative auto de redevenir joueur
setInterval(() => {
    if (isSpectator) socket.emit('try_become_player');
}, 5000);

// 🎨 Réception de la couleur
socket.on('user_color', (color) => {
    userColor = color;
    localStorage.setItem('userColor', color);
    isSpectator = false;

    document.getElementById('spectatorOverlay')?.remove();
    document.getElementById('spectatorMsg')?.remove();

    if (!document.querySelector('img.cursor')) {
        userCursor = document.createElement('img');
        userCursor.className = 'cursor';
        userCursor.src = `images/cursor/${color}-cursor.png`;
        document.body.appendChild(userCursor);

        myTag = document.createElement('div');
        myTag.className = 'name-tag';
        myTag.innerText = userName;
        document.body.appendChild(myTag);
    }

    // 🎯 Suivi souris
    if (!window._cursorListenerAdded) {
        document.addEventListener('mousemove', (e) => {
            if (isSpectator || !userColor) return;
            const x = e.clientX, y = e.clientY;
            userCursor.style.left = `${x - 3}px`;
            userCursor.style.top = `${y - 4}px`;
            myTag.style.left = `${x + 20}px`;
            myTag.style.top = `${y + 45}px`;
            socket.emit('mouse_move', { x, y });
        });
        window._cursorListenerAdded = true;
    }
});

// 👀 Voir les autres joueurs
socket.on('mouse_move', (data) => {
    if (data.id === socket.id) return;

    if (!cursors[data.id]) {
        const cursor = document.createElement('img');
        cursor.className = 'cursor';
        cursor.src = `images/cursor/${data.color}-cursor.png`;
        document.body.appendChild(cursor);

        const nameTag = document.createElement('div');
        nameTag.className = 'name-tag';
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

// 👥 Liste connectés
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

// ❌ Nettoyage des déconnectés
socket.on('user_disconnect', (id) => {
    if (cursors[id]) {
        cursors[id].cursor.remove();
        cursors[id].nameTag.remove();
        delete cursors[id];
    }
});

// ⚠️ Message d'erreur
socket.on('error', (msg) => alert(msg));