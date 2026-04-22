
var mockData=[{id:1,category:"PIZZA",name:"Pizza Salami",desc:"Tomaten, Käse, Salami",price:9.50},{id:2,category:"PIZZA",name:"Pizza Margherita",desc:"Mozzarella, Basilikum",price:8.50},{id:3,category:"GETRÄNKE",name:"Cola 0,5l",desc:"Eiskalt serviert",price:2.50}];function renderMenu(){const container=document.getElementById('menu-container');const itemTemplate=document.getElementById('template-item');const headerTemplate=document.getElementById('template-header');container.innerHTML="";let lastCategory="";menuCart.forEach(product=>{if(product.isVisible===false)return;if(product.category!==lastCategory){lastCategory=product.category;}
if(product.type=="header"){const headerClone=headerTemplate.content.cloneNode(true);headerClone.querySelector('.header-title').innerText=product['name'+suffix]||product.name;container.appendChild(headerClone);}else{const itemClone=itemTemplate.content.cloneNode(true);const itemDiv=itemClone.querySelector('.item');let displayQty=product.quantity;if(product.category==='extra'){orderCart.forEach(cartItem=>{if(cartItem.orderDetails&&cartItem.orderDetails.extras){if(cartItem.orderDetails.extras.includes(product.name)){displayQty+=(cartItem.orderDetails.quantity||1);}}});}
itemDiv.setAttribute('data-id',product.id);itemClone.querySelector('.item-name').innerText=product['name'+suffix]||product.name;itemClone.querySelector('.item-desc').innerText=product['desc'+suffix]||product.desc;itemClone.querySelector('.item-price').innerText=product.price+" €";itemClone.querySelector('.qty-display').innerText=displayQty;itemClone.querySelector('.btn-plus').onclick=()=>{plusMinusMenu(product,1);};itemClone.querySelector('.btn-minus').onclick=()=>{plusMinusMenu(product,-1);};if(product.category=='extra'){itemClone.querySelector('.btn-plus').style.visibility='hidden';itemClone.querySelector('.btn-minus').style.visibility='hidden';}
container.appendChild(itemClone);}});renderWochenplan();}
function plusMinusMenu(product0,delta){const product=JSON.parse(JSON.stringify(product0));if(delta<0){if(product0.quantity==0){return;}
const matches=orderCart.filter(item=>item.id===product.id);if(matches.length>1){alert("Es sind verschiedene Varianten dieses Produkts im Warenkorb. Bitte passen Sie die Menge direkt im Warenkorb an.");return;}
else{matches[0].orderDetails.quantity--;if(matches[0].orderDetails.quantity===0){orderCart=orderCart.filter(item=>item!==matches[0]);}
updateAllQuantities(product.id);}}
else{if(product.isStandard){product.orderDetails.variant=product.name;product.orderDetails.size=product.desc;product.orderDetails.price=product.price;addProduct(product);}
else{if(product.isPizza){product.orderDetails.variant=product.name;product.orderDetails.price=product.price;activePizza=product;openBranchingModal();return;}
else{openEditModal(product);return;}}}
renderMenu();renderCart();}
let countdownInterval=null;function aktualisiereStatusAnzeige(data){const quadrat=document.getElementById('status-quadrat');const anzeige=document.getElementById('bestellzeit-anzeige');const banner=document.getElementById('countdown-banner');const timerDisplay=document.getElementById('countdown-timer');const bereich=document.getElementById('online-status-bereich');let bestellungMoeglich=false;if(!data||!data.heute)return;if(bereich){bereich.style.display=(tischNr==="Abholung")?'flex':'none';}
const jetzt=new Date();const jetztHHMM=jetzt.getHours().toString().padStart(2,'0')+":"+
jetzt.getMinutes().toString().padStart(2,'0');const startZeit=data.heute.start||"00:00";const regulaeresEnde=data.heute.ende||"00:00";let schlussZeit;schlussZeit=regulaeresEnde;if(data.bestellStopManuell&&data.bestellStopManuell>regulaeresEnde){schlussZeit=data.bestellStopManuell;}
let zusatz="";let zusatzIt="";if(schlussZeit&&schlussZeit>regulaeresEnde){zusatz=" - Heute Verlängerung";zusatzIt=" - Oggi prolungato fino ";}
const vorlaufMinuten=data.timerStartVorlauf||30;const[h,m]=schlussZeit.split(':');const zielZeit=new Date();zielZeit.setHours(parseInt(h),parseInt(m),0);const restMinuten=Math.floor((zielZeit-jetzt)/60000);if(banner)banner.style.display='none';if(countdownInterval)clearInterval(countdownInterval);if(data.heute.zu||data.zustand!=='offen'){bestellungMoeglich=false;if(currentLang==='it'){updateUI('#e74c3c',data.meldung||"Oggi chiuso");}
else{updateUI('#e74c3c',data.meldung||"Heute geschlossen");}}
else if(jetztHHMM<startZeit||jetztHHMM>=schlussZeit){console.log("<startZeit u >schlusszeit:<"+startZeit+" >"+schlussZeit);if(currentLang==='it'){updateUI('#e74c3c',`Ordinazione Takeaway tra ${startZeit} e ${regulaeresEnde}`);}
else{updateUI('#e74c3c',`Takeaway Bestellung von ${startZeit} bis ${regulaeresEnde}`);}
bestellungMoeglich=false;}
else if(restMinuten<=vorlaufMinuten){console.log("restMinuten <= vorlaufMinuten::"+restMinuten+" <= "+vorlaufMinuten);if(currentLang==='it'){updateUI('#f39c12',`Ordinazione Takeaway tra ${startZeit} e ${regulaeresEnde}`+zusatzIt+`${schlussZeit}`);}
else{updateUI('#f39c12',`Takeaway Bestellung von ${startZeit} -  ${regulaeresEnde}`+zusatz+` bis ${schlussZeit} Uhr`);}
if(tischNr=="Abholung"){if(banner)banner.style.display='block';starteEinheitlichenTimer(schlussZeit,timerDisplay,data);}
bestellungMoeglich=true;}
else{console.log("Normalbetrieb");if(currentLang==='it'){updateUI('#2ecc71',`Ordinazione Takeaway tra ${startZeit} e ${regulaeresEnde}`+zusatzIt+`${schlussZeit}`);}
else{updateUI('#2ecc71',`Takeaway Bestellung von ${startZeit} -  ${regulaeresEnde}`+zusatz+` bis ${schlussZeit} Uhr`);}
bestellungMoeglich=true;}
updateButtonStates(bestellungMoeglich);function updateUI(farbe,text){if(quadrat)quadrat.style.backgroundColor=farbe;if(anzeige)anzeige.innerText=text;}}
function starteEinheitlichenTimer(zielUhrzeit,displayElement,data){if(!displayElement)return;const[h,m]=zielUhrzeit.split(':');function tick(){const jetzt=new Date();const ziel=new Date();ziel.setHours(parseInt(h),parseInt(m),0);const diff=ziel-jetzt;if(diff<=0){const banner=document.getElementById('countdown-banner');if(banner)banner.style.display='none';clearInterval(countdownInterval);if(data){aktualisiereStatusAnzeige(data);}else{document.getElementById('status-quadrat').style.backgroundColor='#e74c3c';}
return;}
const min=Math.floor(diff/60000);const sek=Math.floor((diff%60000)/1000);displayElement.innerText=`${min}:${sek.toString().padStart(2, '0')}`;}
tick();countdownInterval=setInterval(tick,1000);}
socket.on('status-update',(data)=>{if(letzteStatusDaten){letzteStatusDaten=Object.assign({},letzteStatusDaten,data);}else{letzteStatusDaten=data;}
if(typeof aktualisiereStatusAnzeige==="function"){aktualisiereStatusAnzeige(letzteStatusDaten);}
renderWochenplan();});async function initialisiereStatus(){try{const response=await fetch('/api/status');if(!response.ok)throw new Error("Server-Antwort war nicht okay");const data=await response.json();letzteStatusDaten=data;aktualisiereStatusAnzeige(data);const urlParams=new URLSearchParams(window.location.search);const aktuellerModus=urlParams.has('tisch')?'restaurant':'abholung';window.bestellModus=aktuellerModus;aktualisiereStatusAnzeige(data);}catch(err){console.error("Fehler beim ersten Laden des Status:",err);document.getElementById('bestellzeit-anzeige').innerText="Status wird geladen...";}}
function renderWochenplan_(){const tabelle=document.getElementById('zeiten-tabelle');const titel=document.getElementById('titel-oeffnungszeiten');if(!tabelle||!letzteStatusDaten||!letzteStatusDaten.wochentage)return;titel.innerText=(currentLang==='it')?"Takeaway Orari accettazione ordini":"Takeaway Bestellzeiten";const tageDe=["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];const tageIt=["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];let html="";for(let i=0;i<7;i++){const tag=letzteStatusDaten.wochentage[i];if(!tag)continue;const name=(currentLang==='it')?tageIt[i]:tageDe[i];let zeitenText="";if(tag.zu===true||tag.zu==="true"){zeitenText=(currentLang==='it')?"Chiuso":"Geschlossen";}else{zeitenText=`${tag.start} - ${tag.ende} Uhr`;}
const istHeute=new Date().getDay()===i?"style='background-color: #f0f0f0; font-weight: bold;'":"";html+=`<tr ${istHeute}>
                    <td style="padding: 5px 10px;">${name}:</td>
                    <td style="padding: 5px 10px;">${zeitenText}</td>
                 </tr>`;}
tabelle.innerHTML=html;}
function renderWochenplan(){const tabelle=document.getElementById('zeiten-tabelle');if(!tabelle)return;const plan=letzteStatusDaten?.kompletteConfig?.wochentage;if(!plan){if(tabelle.innerHTML===""){tabelle.innerHTML="<tr><td>Lade Öffnungszeiten...</td></tr>";}
return;}
const isIt=(currentLang==='it');const tageNamen=isIt?["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"]:["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];let html="";for(let i=0;i<7;i++){const tag=plan[i];if(!tag)continue;const name=tageNamen[i];const zeiten=(tag.zu===true||tag.zu==="true")?(isIt?"Chiuso":"Geschlossen"):`${tag.start} - ${tag.ende}`;const style=(new Date().getDay()===i)?"style='color: #e67e22; font-weight: bold;'":"";html+=`<tr ${style}>
                    <td style="padding: 5px; text-align: left;">${name}:</td>
                    <td style="padding: 5px; text-align: right;">${zeiten}</td>
                 </tr>`;}
tabelle.innerHTML=html;const footer=document.getElementById('oeffnungszeiten-footer');if(footer){if(tischNr==="Abholung"){footer.style.display='block';}else{footer.style.display='none';}}}
function updateButtonStates(isPossible){const allPlusButtons=document.querySelectorAll('.btn-plus');allPlusButtons.forEach(btn=>{if(isPossible){btn.classList.remove('btn-disabled');}else{btn.classList.add('btn-disabled');}});const orderBtn=document.getElementById('btnCartOrder');if(orderBtn){orderBtn.disabled=!isPossible;orderBtn.style.opacity=isPossible?"1":"0.5";}}
document.addEventListener('DOMContentLoaded',initialisiereStatus);initialisiereStatus();setInterval(()=>{fetch('/api/status').then(res=>res.json()).then(data=>aktualisiereStatusAnzeige(data));},30000);