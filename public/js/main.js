const socket = io();

let userColor = localStorage.getItem('userColor') || '';
let userName = localStorage.getItem('userName') || '';
let isSpectator = false;

// Si spectateur → UI spéciale
socket.on('spectator_mode', (msg) => {
    isSpectator = true;
    document.body.innerHTML = `
        <div style="color:white;text-align:center;padding-top:30vh;font-size:2rem;">
            ${msg}<br><br><i>Vous pouvez observer les autres joueurs.</i>
        </div>`;
});

// Demande nom si pas encore stocké
if (!userName) {
    userName = prompt("Quel est ton nom ?") || "Anonyme";
    userName = userName.trim().slice(0, 20);
    localStorage.setItem('userName', userName);
}
socket.emit('set_name', userName);

// Si pas spectateur, envoie tentative de restore
if (userColor && !isSpectator) {
    socket.emit('restore_color', userColor);
}

let userCursor, myTag;

if (!isSpectator) {
    userCursor = document.createElement("img");
    userCursor.className = "cursor";
    document.body.appendChild(userCursor);

    myTag = document.createElement("div");
    myTag.className = "name-tag";
    myTag.innerText = userName;
    document.body.appendChild(myTag);

    document.addEventListener('mousemove', (event) => {
        if (!userColor || isSpectator) return;
        const x = event.clientX, y = event.clientY;
        userCursor.style.left = `${x - 3}px`;
        userCursor.style.top = `${y - 4}px`;
        myTag.style.left = `${x + 20}px`;
        myTag.style.top = `${y + 45}px`;
        socket.emit('mouse_move', { x, y });
    });
}

socket.on('user_color', (color) => {
    userColor = color;
    localStorage.setItem('userColor', color);
    if (userCursor) {
        userCursor.src = `images/${color}-cursor.png`;
    }
});

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