import { socket } from './shared.js';

const clickButton = document.getElementById("click-button") as HTMLButtonElement;
const counterDisplay = document.getElementById("click-counter")!;
const countdown = document.getElementById("countdown")!;
const bars = Array.from(document.querySelectorAll(".power-bar")) as HTMLDivElement[];

let clickCount = 0;
let startTime: number | null = null;
let interval: ReturnType<typeof setInterval>;
let isPlaying = false;
let hasRequestedTurn = false;
let currentTurnSocketId: string | null = null;

/** 🎨 Détermine la couleur selon la vitesse de clics */
function getColorFromCPS(cps: number): string {
    if (cps < 3) return "black";
    if (cps < 4) return "red";
    if (cps < 5) return "orange";
    return "green";
}

/** 🔁 Met à jour compteur, timer et barres */
function updateBarsAndTimer() {
    const now = Date.now();
    const elapsed = (now - (startTime ?? 0)) / 1000;
    const remaining = Math.max(0, 10 - elapsed);
    const cps = clickCount / (elapsed || 1);

    countdown.innerText = remaining.toFixed(2) + "s";
    counterDisplay.innerText = clickCount.toString();

    const color = getColorFromCPS(cps);
    let segments = 0;
    if (clickCount >= 10) segments++;
    if (clickCount >= 35) segments++;
    if (clickCount >= 45) segments++;

    bars.forEach(bar => {
        Array.from(bar.children).forEach((segment, index) => {
            const segmentDiv = segment as HTMLDivElement;
            if (index < segments) {
                segmentDiv.style.backgroundColor = color;
                segmentDiv.style.opacity = "1";
            } else {
                segmentDiv.style.backgroundColor = "black";
                segmentDiv.style.opacity = "0.1";
            }
        });

        if (clickCount >= 50) {
            bar.classList.add("glow-blue");
        } else {
            bar.classList.remove("glow-blue");
        }
    });

    socket.emit('clickzone_update', {
        clickCount,
        elapsed,
    });

    if (remaining <= 0) {
        clearInterval(interval);
        countdown.innerText = "0.00s";

        const cpsFinal = clickCount / 10;
        socket.emit('clickzone_score', { clicks: clickCount, cps: cpsFinal });

        isPlaying = false;
        hasRequestedTurn = false; 
    }
}

/** 🖱️ Gérer les clics */
clickButton.addEventListener("click", () => {
    if (!isPlaying && !hasRequestedTurn) {
        console.log("🟡 Demande de tour envoyée");
        socket.emit("start_turn");
        hasRequestedTurn = true;
        return; // on attend la réponse 'your_turn'
    }

    if (!isPlaying) return;

    if (!startTime) {
        startTime = Date.now();
        interval = setInterval(updateBarsAndTimer, 33);
    }

    clickCount++;
    updateBarsAndTimer();
});

socket.on('your_turn', () => {
    clickCount = 0;
    startTime = null;
    hasRequestedTurn = false;
    countdown.innerText = "10.00s";
    counterDisplay.innerText = "0";
});

/** 🕐 Session en cours : rien ne se passe */
socket.on('waiting_turn', (playerName: string) => {
    isPlaying = false;
    clickButton.setAttribute("disabled", "true");
    countdown.innerText = `En attente de ${playerName}`;
});

socket.on('sync_turn', (turnId: string) => {
    currentTurnSocketId = turnId;
    isPlaying = socket.id === turnId;
    clickButton.disabled = !isPlaying;
});

socket.on('clickzone_sync', (data: { socketId: string; clickCount: number; elapsed: number }) => {
    if (data.socketId === socket.id) return; // pas besoin de traiter si c’est moi

    const remaining = Math.max(0, 10 - data.elapsed);
    const cps = data.clickCount / (data.elapsed || 1);

    countdown.innerText = remaining.toFixed(2) + "s";
    counterDisplay.innerText = data.clickCount.toString();

    const color = getColorFromCPS(cps);
    let segments = 0;
    if (data.clickCount >= 10) segments++;
    if (data.clickCount >= 35) segments++;
    if (data.clickCount >= 45) segments++;

    bars.forEach(bar => {
        Array.from(bar.children).forEach((segment, index) => {
            const segmentDiv = segment as HTMLDivElement;
            if (index < segments) {
                segmentDiv.style.backgroundColor = color;
                segmentDiv.style.opacity = "1";
            } else {
                segmentDiv.style.backgroundColor = "black";
                segmentDiv.style.opacity = "0.1";
            }
        });

        if (data.clickCount >= 50) {
            bar.classList.add("glow-blue");
        } else {
            bar.classList.remove("glow-blue");
        }
    });
});


/** 🎉 Fin du tour : on montre la carte */
socket.on('turn_result', (data: { name: string, clicks: number, cps: string, score: number }) => {
    const card = document.createElement("div");
    card.id = "scoreCard";
    card.innerHTML = `
        <strong>${data.name}</strong><br/>
        <span>${data.clicks} clics</span><br/>
        <span>${data.cps} CPS</span><br/>
        <span>Score: ${data.score}</span>
    `;
    Object.assign(card.style, {
        position: "fixed",
        top: "20px",
        right: "20px",
        padding: "15px",
        background: "#222",
        color: "white",
        fontFamily: "Arial Black, sans-serif",
        borderRadius: "10px",
        zIndex: "9999",
        boxShadow: "0 0 10px rgba(0,0,0,0.5)",
        textAlign: "center"
    });
    document.body.appendChild(card);
    clickButton.setAttribute("disabled", "true");

    document.body.appendChild(card);

    setTimeout(() => {
        card.remove();
        clickButton.removeAttribute("disabled");
    }, 4000);
});