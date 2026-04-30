const wakeup=true;
function activateVideoFallback() {
    // 1. Element im Hintergrund suchen oder erstellen
    let wakeAudio = document.getElementById('wakeLockAudio') || document.createElement('audio');
    
    wakeAudio.id = 'wakeLockAudio';
    wakeAudio.loop = true;
    wakeAudio.style.display = 'none'; // Damit es auf der Seite niemals sichtbar ist

    // 2. Pfad zur echten Datei (Stelle sicher, dass silent.mp3 im Ordner liegt!)
    wakeAudio.src = "silent.mp3"; 

    // 3. Abspielen starten
    // Da dies durch den Login-Button-Klick ausgelöst wird, erlaubt der Browser das Audio
    wakeAudio.play()
        .then(() => {
            console.log("✅ Monitor-Wachhalten aktiv (Datei-Modus)");
        })
        .catch(e => {
            console.error("❌ Fehler beim Abspielen der Datei:", e);
        });

    // 4. Nur hinzufügen, falls es noch nicht im HTML existiert
    if (!wakeAudio.parentElement) {
        document.body.appendChild(wakeAudio);
    }
}
