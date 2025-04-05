// @ts-ignore
const socket = io();

interface UserData {
    cursor: HTMLImageElement;
    nameTag: HTMLDivElement;
}

interface MoveData {
    id: string;
    x: number;
    y: number;
    color: string;
    name: string;
}

let userColor: string = localStorage.getItem("userColor") || "";
let userName: string = localStorage.getItem("userName") || "";
let isSpectator = false;

let userCursor: HTMLImageElement;
let myTag: HTMLDivElement;

const cursors: Record<string, UserData> = {};

// 🔤 Demander nom
if (!userName) {
    userName = prompt("Quel est ton nom ?") || "Anonyme";
    userName = userName.trim().slice(0, 20);
    localStorage.setItem("userName", userName);
}
socket.emit("set_name", userName);

// 🔁 Restaurer couleur
if (userColor && !isSpectator) {
    socket.emit("restore_color", userColor);
}

// 🎟 Spectateur
socket.on("spectator_mode", (msg: string) => {
    isSpectator = true;

    const overlay = document.createElement("div");
    overlay.id = "spectatorOverlay";
    Object.assign(overlay.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        background: "rgba(0, 0, 0, 0.4)",
        zIndex: "9999",
        pointerEvents: "none"
    });
    document.body.appendChild(overlay);

    const msgBox = document.createElement("div");
    msgBox.id = "spectatorMsg";
    msgBox.innerText = msg;
    Object.assign(msgBox.style, {
        position: "fixed",
        bottom: "40px",
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: "24px",
        color: "white",
        fontWeight: "bold",
        background: "rgba(0,0,0,0.6)",
        padding: "10px 20px",
        borderRadius: "8px",
        zIndex: "10000",
        pointerEvents: "none",
        fontFamily: "Arial Black, sans-serif"
    });
    document.body.appendChild(msgBox);
});

// 🔁 Devenir joueur
setInterval(() => {
    if (isSpectator) socket.emit("try_become_player");
}, 5000);

// 🎨 Couleur
socket.on("user_color", (color: string) => {
    userColor = color;
    localStorage.setItem("userColor", color);
    isSpectator = false;

    document.getElementById("spectatorOverlay")?.remove();
    document.getElementById("spectatorMsg")?.remove();

    if (!document.querySelector("img.cursor")) {
        userCursor = document.createElement("img");
        userCursor.className = "cursor";
        userCursor.src = `images/cursor/${color}-cursor.png`;
        document.body.appendChild(userCursor);

        myTag = document.createElement("div");
        myTag.className = "name-tag";
        myTag.innerText = userName;
        document.body.appendChild(myTag);
    }

    if (!(window as any)._cursorListenerAdded) {
        document.addEventListener("mousemove", (e) => {
            if (isSpectator || !userColor) return;
            const x = e.clientX;
            const y = e.clientY;
            userCursor.style.left = `${x - 3}px`;
            userCursor.style.top = `${y - 4}px`;
            myTag.style.left = `${x + 20}px`;
            myTag.style.top = `${y + 45}px`;
            socket.emit("mouse_move", { x, y });
        });
        (window as any)._cursorListenerAdded = true;
    }
});

// 👁‍🗨 Mouvements des autres joueurs
socket.on("mouse_move", (data: MoveData) => {
    if (data.id === socket.id) return;

    if (!cursors[data.id]) {
        const cursor = document.createElement("img");
        cursor.className = "cursor";
        cursor.src = `images/cursor/${data.color}-cursor.png`;
        document.body.appendChild(cursor);

        const nameTag = document.createElement("div");
        nameTag.className = "name-tag";
        nameTag.innerText = data.name || "Anonyme";
        document.body.appendChild(nameTag);

        cursors[data.id] = { cursor, nameTag };
    }

    const { cursor, nameTag } = cursors[data.id];
    cursor.style.left = `${data.x - 3}px`;
    cursor.style.top = `${data.y - 4}px`;
    nameTag.style.left = `${data.x + 20}px`;
    nameTag.style.top = `${data.y + 45}px`;
});

// 📜 Liste connectés
socket.on("update_users", (userList: { id: string; name: string; color: string }[]) => {
    const ul = document.getElementById("users");
    if (!ul) return;

    ul.innerHTML = "";
    userList.forEach((user) => {
        const li = document.createElement("li");
        li.innerText = user.name || "Anonyme";
        li.style.color = user.color;
        if (user.id === socket.id) li.style.fontWeight = "bold";
        ul.appendChild(li);
    });
});

// ❌ Déconnectés
socket.on("user_disconnect", (id: string) => {
    if (cursors[id]) {
        cursors[id].cursor.remove();
        cursors[id].nameTag.remove();
        delete cursors[id];
    }
});

// ⚠️ Erreur
socket.on("error", (msg: string) => alert(msg));