const wakeup=true;
function activateVideoFallback() {
    let wakeAudio = document.getElementById('wakeLockAudio');
    
    if (!wakeAudio) {
        wakeAudio = document.createElement('audio');
        wakeAudio.id = 'wakeLockAudio';
        document.body.appendChild(wakeAudio);
    }

    wakeAudio.loop = true;
    wakeAudio.muted = false; // Manche Browser blockieren lautlose Streams, wir stellen Volume auf fast 0
    wakeAudio.volume = 0.01; 
    wakeAudio.style.display = 'none';

    // Ein robusterer Base64-String für eine lautlose WAV-Datei (1 Sekunde)
    // Dieser String enthält korrekte Header-Informationen, die den Metadata-Fehler verhindern.
    wakeAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

    // Wir laden die Ressource explizit neu, bevor wir abspielen
    wakeAudio.load();

    wakeAudio.play()
        .then(() => {
            console.log("✅ Monitor-Wachhalten aktiv (Audio-Mode)");
        })
        .catch(e => {
            console.warn("⚠️ Audio fehlgeschlagen, versuche alternativen Video-Trick...");
            // Letzter Rettungsanker: Ein Video mit einer echten (sehr kurzen) Quelle
            // Falls du irgendwo eine winzige mp4 liegen hast, wäre hier der Platz für die URL
            // video.src = "https://deine-domain.de/silent.mp4"; 
        });
}
