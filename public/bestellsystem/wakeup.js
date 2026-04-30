 const wakeup=true;
 const wakeBtn = document.getElementById('wakeUpBtn');

  function activateVideoFallback() {
    // 2. Methode: Video-Hack für alte Samsung-Browser
    let video = document.createElement('video');
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.style.display = 'none';
    
    // Ein winziges, fast leeres Video
    video.src = "https://githubusercontent.com"; 
    
    video.play().then(() => {
      wakeBtn.innerText = "✅ Wach (Video-Mode)";
      wakeBtn.style.background = "#1e7e34";
    }).catch(e => {
      //alert("Bitte noch einmal klicken!");
    });
    document.body.appendChild(video);
  }
  
  //if (wakeup==true){
  //  activateVideoFallback();
  //}
