const wakeup=true;
function activateVideoFallback() {
    // 1. Element suchen oder erstellen (unsichtbar im Hintergrund)
    let video = document.getElementById('wakeLockVideo') || document.createElement('video');
    
    video.id = 'wakeLockVideo';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.style.display = 'none'; // Versteckt das Element komplett

    // 2. Die Video-Daten (Base64)
     video.src = video.src = "data:video/webm;base64,GkXfo6NChoEBQveBAUf3gQUqyQFAuqADveBAUKOjgQFC+4EBQYqBAUL7gQFCloEBQveBAUf3gQUqyQFAuqADveBAUKOjgQFC+4EBQYqBAUL7gQFCloEBQveBAUf3gQUqyQFAuqADveBAUf3gQUqyQFAuqADveBAUf3gQUqyQFAuqADveBAUf3gQUqyQFAuqA";
    // 3. Abspielen triggern
    video.play()
        .then(() => console.log("Wake-Lock im Hintergrund aktiv."))
        .catch(e => console.error("Monitor-Wachhalten fehlgeschlagen:", e));

    // 4. In den DOM einfügen, falls noch nicht geschehen (nötig für manche Browser)
    if (!video.parentElement) {
        document.body.appendChild(video);
    }
}
