
let tv="";let currentLoadedOrders=[];setBon(false);let pwInput;sessionStorage.setItem('userRole','kellner');let zeigePreise=false;let currentPassword="";let selectedOrderIds=new Set();let aktuellerStatus={};function toggleSelection(orderId){if(selectedOrderIds.has(orderId)){selectedOrderIds.delete(orderId);}else{selectedOrderIds.add(orderId);}}
setInterval(()=>{document.getElementById('clock').innerText=new Date().toLocaleTimeString('de-DE');},1000);let lastOrderCount=0;const notificationSound=new Audio('/bestelle1/notification.mp3');const feedbackSound=new Audio('https://actions.google.com/sounds/v1/foley/drawbridge_teal.ogg');async function fetchOrders(){const isHistoryOpen=document.getElementById('historyFilter')?.style.display!=='none';if(isHistoryOpen){console.log("Historie ist offen - automatischer Live-Update gestoppt.");return;}
const savedPw=sessionStorage.getItem('barPassword');const orderId=localStorage.getItem('orderId');if(!savedPw){if(document.getElementById('barLoginOverlay')){document.getElementById('barLoginOverlay').style.display='flex';}
return;}
try{const res=await fetch('/api/get-orders',{headers:{'x-bar-pw':savedPw,'x-device-token':orderId}});if(res.status===403){alert("Nicht autorisiert! Bitte neu einloggen.");location.reload();return;}
if(!res.ok)throw new Error("Server antwortet nicht korrekt");const orders=await res.json();currentLoadedOrders=orders;renderCurrentOrders();const isHistoryOpen=document.getElementById('historyFilter')?.style.display!=='none';if(isHistoryOpen){renderOrders(orders);}else{const activeOrders=orders.filter(o=>o.status==='neu'||o.status==='angenommen');const brandNewOrders=activeOrders.filter(o=>o.status==='neu');if(brandNewOrders.length>lastOrderCount){notificationSound.play().catch(e=>console.log("Audio blockiert"));}
lastOrderCount=brandNewOrders.length;renderOrders(activeOrders);}}catch(err){console.error("Fehler beim Laden:",err);}}
function renderOrders(orders){const container=document.getElementById('ordersContainer');const countNeu=orders.filter(o=>o.status==='neu'||!o.status).length;const countBestaetigt=orders.filter(o=>o.status==='angenommen').length;const countBar=orders.filter(o=>{const tischNum=String(o.tisch).toLowerCase();return!tischNum.includes('Abhol')&&!tischNum.includes('liefer');}).length;document.getElementById('count-neu').innerText=`A: ${countNeu}`;document.getElementById('count-bestaetigt').innerText=`B: ${countBestaetigt}`;document.getElementById('count-bar').innerText=`C: ${countBar}`;if(!container)return;const historyElement=document.getElementById('historyFilter');const isHistoryOpen=historyElement&&historyElement.style.display!=='none';const role=sessionStorage.getItem('userRole');const serverBestaetigteRolle=sessionStorage.getItem('userRole');const adminKey=sessionStorage.getItem('key_admin');isAdmin=(adminKey!==null&&adminKey!=="");let html="";if(isHistoryOpen){if(serverBestaetigteRolle==='chef'){html+=`
                <div style="background: rgba(0, 202, 78, 0.15); border: 1px solid #00ca4e; color: #00ca4e; padding: 12px; border-radius: 6px; margin-bottom: 15px; text-align: center; font-size: 0.9rem; border-left: 5px solid #00ca4e;">
                    <strong style="display: block; margin-bottom: 3px;">🔓 Admin-Vollzugriff</strong>
                    Alle Daten im gewählten Zeitraum werden angezeigt.
                </div>
            `;}else{html+=`
                <div style="background: rgba(255, 189, 68, 0.15); border: 1px solid #ffbd44; color: #ffbd44; padding: 12px; border-radius: 6px; margin-bottom: 15px; text-align: center; font-size: 0.9rem; border-left: 5px solid #ffbd44;">
                    <strong style="display: block; margin-bottom: 3px;"></strong>
                    Es werden nur erledigte Bestellungen der letzten 20 Stunden angezeigt.
                </div>
            `;}}
else{html="";}
if(orders.length===0){container.innerHTML=html+'<div class="no-orders" style="padding:20px; text-align:center;">Keine Bestellungen... 🍕</div>';return;}
const printedOrders=JSON.parse(localStorage.getItem('printedOrders')||'[]');const jetzt=new Date();container.innerHTML=html+orders.map(order=>{const needsP=order.needsPizzaReady;const needsD=order.needsDrinksReady;const pReady=order.pizzaReady;const dReady=order.drinksReady;const datumOptionen={day:'2-digit',month:'2-digit'};const zeitOptionen={hour:'2-digit',minute:'2-digit'};const bestellDatum=order.erstelltAm?new Date(order.erstelltAm).toLocaleDateString('de-DE',datumOptionen):"";const bestellZeit=order.erstelltAm?new Date(order.erstelltAm).toLocaleTimeString('de-DE',zeitOptionen):order.zeit;let distanzHTML="";if(order.coords&&order.coords.distanz!==undefined){if(order.coords.distanz===-1){distanzHTML=`<span style="font-size: 0.7rem; color: #3498db; background: rgba(52,152,219,0.1); padding: 1px 4px; border-radius: 3px;">💻 TEST</span>`;}else{const km=(order.coords.distanz/1000).toFixed(2);let dFarbe="#00ca4e";if(order.coords.distanz>5000)dFarbe="#ff4b2b";else if(order.coords.distanz>1000)dFarbe="#ffbd44";distanzHTML=`<span style="font-size: 0.8rem; font-weight: bold; color: ${dFarbe}; margin-left: 5px;">📍 ${km} km</span>`;}}else{distanzHTML=`<span style="font-size: 0.7rem; color: #555; margin-left: 5px;">(Kein GPS)</span>`;}
const saubererWert=String(order.tisch).replace(/tisch/gi,'').trim();const istAbholung=saubererWert.toLowerCase().includes('abhol');const tischAnzeige=istAbholung?saubererWert:`Tisch ${saubererWert}`;const isPrinted=printedOrders.includes(order._id);const erstellt=order.erstelltAm?new Date(order.erstelltAm):jetzt;const diffMinuten=Math.floor((jetzt-erstellt)/60000);const tischString=String(order.tisch).toLowerCase();const isChecked=selectedOrderIds.has(order._id)?'checked':'';let infoBox="";if(order.status==='angenommen'){const confirmedTime=order.zeitAngenommen?new Date(order.zeitAngenommen).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}):"--:--";infoBox=`
                <div style="background: rgba(0,202,78,0.1); padding: 4px 8px; border-radius: 4px; margin: 4px 0; border: 1px solid #00ca4e; font-size: 0.8rem;">
                    <span style="color: #00ca4e; font-weight: bold;">OK: ${confirmedTime} ${order.dauerAbholung > 0 ? '(' + order.dauerAbholung + 'm)' : ''}</span>
                    ${order.dauerAbholung > 0 ? `<div class="countdown"data-start="${order.zeitAngenommen}"data-duration="${order.dauerAbholung}"style="color:#fff;">Rest:<span class="timer-val"style="font-weight:bold;">...</span></div>` : ''}
                </div>`;}
let tColor=diffMinuten>=20?'#ff4b2b':(diffMinuten>=10?'#ffbd44':'#00ca4e');let kundenKontaktHTML="";if(istAbholung&&order.adresse){const vName=order.adresse.vorname||"";const nName=order.adresse.nachname||"";const tel=order.adresse.telefon||"";const vollerName=`${vName} ${nName}`.trim();if(vollerName||tel){kundenKontaktHTML=`
    <div class="kunden-info-box" style="background: rgba(0, 210, 255, 0.1); border: 1px dashed #00d2ff; padding: 8px; border-radius: 6px; margin: 8px 0;">
     ${vollerName ? `<div style="color: #00d2ff; font-weight: bold; font-size: 0.95rem;">👤 ${vollerName}</div>` : ''}
     ${tel ? `<div style="margin-top: 4px;"><a href="tel:${tel}"style="color: #28a745; text-decoration: none; font-weight: bold; font-size: 1.1rem; display: flex; align-items: center; gap: 5px;"><span>📞</span>${tel}</a></div>` : ''}
    </div>`;}}
return`



<div class="order-card" data-id="${order._id}" style="padding: 8px; margin-bottom: 8px; border-left: 5px solid ${order.status === 'angenommen' ? '#28a745' : '#e94560'}; background: #16213e; border-radius: 4px; ${isPrinted ? 'opacity: 0.7;' : ''}">
    
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
            <input type="checkbox" 
       class="print-checkbox btnPr" 
       value="${order._id}" 
       onchange="toggleSelection('${order._id}')" 
       ${isChecked} 
       style="width:16px; height:16px; vertical-align:middle; cursor:pointer;">
            
            <span style="font-weight: bold; font-size: 1.1rem; color: ${tColor}; margin-left: 5px;">
                ${istAbholung ? '🥡' : '🪑'}  ${tischAnzeige}
            </span>
        </div>
        <div style="text-align: right; line-height: 1.1;">
            <span style="color: #aaa; font-size: 0.8rem;">${bestellDatum} - ${order.zeit}</span><br>
            <span style="font-size: 0.7rem; color: ${tColor}; font-weight: bold;">
                ${isPrinted ? '✔️ Gedruckt' : diffMinuten + 'm'}
            </span>
        </div>
    </div>

    ${infoBox}
 ${kundenKontaktHTML} <ul style="padding: 0; margin: 4px 0; list-style: none;">
<ul style="padding: 0; margin: 4px 0; list-style: none;">
    ${order.details.map(item => {
        const detailObj = item.orderDetails || {};
        const extras = detailObj.extras || [];
        const without = detailObj.without || [];
        
        const menge = item.qty || 1;
        const einzelpreis = parseFloat(item.preis) || 0;
        const zeilenSumme = (menge * einzelpreis).toFixed(2);

        // Hier wird entschieden, ob der Preis-HTML-Teil erzeugt wird
        const preisAnzeigeHTML = zeigePreise 
            ? `<span style="color: #ccc !important;">${menge>1?`<small style="color: #888; font-size: 0.7rem;">(${einzelpreis.toFixed(2)}€) </small>`:''}
${zeilenSumme}€</span>` 
            : ''; // Falls false, bleibt der Bereich leer

        const extrasText = (extras.length > 0) 
            ? `<div style="color: #D2691E !important; font-size: 0.75rem !important; margin-top: 2px;">+${extras.map(e=>["Kleine Pizza","Glutenfreier Teig","Laktosefreie Mozarella"].includes(e)?`<span style="color: #ff4b2b !important; font-weight: bold;">${e}</span>`:e).join(', ')}</div>` : '';

        const withoutText = (without.length > 0) 
            ? `<div style="color: #28a745 !important; font-size: 0.75rem !important; margin-top: 1px;">-ohne:${without.join(', ')}</div>` : '';

        return `<li style="border-bottom: 1px solid #222; padding: 4px 0;"><div style="display: flex; justify-content: space-between; font-size: 0.85rem;"><span style="color: #eee !important; font-weight: bold;">${menge}x ${detailObj.variant}${detailObj.size?`(${detailObj.size})`:''}</span>${preisAnzeigeHTML}</div>${extrasText}
${withoutText}</li>`;
    }).join('')}
</ul>

${zeigePreise ? `<div style="display: flex; justify-content: space-between; padding: 5px 0; margin-top: 5px; border-top: 2px solid #444;"><span style="color: #aaa; font-size: 0.9rem; font-weight: bold;">GESAMTSUMME:</span><span style="color: #fff; font-size: 1rem; font-weight: bold; background: #28a745; padding: 2px 6px; border-radius: 3px;">${parseFloat(order.gesamtpreis||0).toFixed(2)}€</span></div>` : ''}


    <div style="display: flex; gap: 4px; margin-top: 6px;">
        <button onclick="printOrder('${order._id}')" style="flex: 0.6; padding: 5px; font-size: 0.75rem; background: #444; color: #fff; border: none; border-radius: 3px; cursor:pointer;">
            ${isPrinted ? 'Bon ✓' : '🖨️ Bon'}
        </button>
        
        ${istAbholung ? `
${(order.status==='neu'||!order.status)?`<button onclick="acceptOrder('${order._id}')" style="flex: 1.5; padding: 5px; background: #007bff; color: white; border: none; border-radius: 3px; font-weight: bold; font-size: 0.75rem; cursor:pointer;">✅ Zeit</button>`:`<button onclick="removeOrder('${order._id}')" style="flex: 1.5; padding: 5px; background: #28a745; color: white; border: none; border-radius: 3px; font-weight: bold; font-size: 0.75rem; cursor:pointer;">🍽️ Fertig</button>`}` 
        : `<div style="display: flex; gap: 4px; flex: 1.5;">${order.needsPizzaReady?`
                    <button onclick="markPartReady('${order._id}', 'pizza')" 
                            style="flex: 1; padding: 5px; background: ${order.pizzaReady ? '#444' : '#e94560'}; color: white; border: none; border-radius: 3px; font-weight: bold; font-size: 0.7rem; cursor:pointer;">
                        ${order.pizzaReady ? '🍕 OK' : '🍕 Pizza'}
                    </button>`:''}
${order.needsDrinksReady?`
                    <button onclick="markPartReady('${order._id}', 'drinks')" 
                            style="flex: 1; padding: 5px; background: ${order.drinksReady ? '#444' : '#ffbd44'}; color: ${order.drinksReady ? 'white' : 'black'}; border: none; border-radius: 3px; font-weight: bold; font-size: 0.7rem; cursor:pointer;">
                        ${order.drinksReady ? '🍺 OK' : '🍺 Getränke'}
                    </button>`:''}</div>`}
    </div>
</div>`;}).join('')}
fetchOrders();const socket=io();socket.emit('join-bar');socket.on('bestellung-aktualisiert',()=>{console.log("Synchronisierung: Lade Bestellungen neu...");fetchOrders();});let heartbeatInterval;socket.on('connect',()=>{console.log("Verbindung aktiv!");socket.emit('join-bar');fetchOrders();if(!heartbeatInterval){heartbeatInterval=setInterval(()=>{if(socket.connected)socket.emit('heartbeat');},25000);}});socket.on('neue-bestellung',(data)=>{console.log("🚀 Live-Update: Neue Bestellung vom Server erhalten!");fetchOrders();});socket.on('bestellung-aktualisiert',()=>{console.log("🔄 Live-Update: Eine Bestellung wurde bearbeitet!");fetchOrders();});socket.on('status-update',(data)=>{console.log("⚡ Live-Update Status empfangen:",data);updateBarTimer(data.timerStartVorlauf);fetchOrders();if(data.bestellStopManuell!==undefined){console.log("Manuelle Zeit wurde geändert auf:",data.bestellStopManuell);const anzeigeEl=document.getElementById('aktuelle-manuelle-zeit-anzeige');if(anzeigeEl)anzeigeEl.innerText=data.bestellStopManuell||"Keine";}
console.log("Bar-Ansicht: Status erhalten",data);aktuellerStatus=data;updateBarTimer();});setInterval(fetchOrders,60000);setInterval(()=>{const clockEl=document.getElementById('clock');if(clockEl)clockEl.innerText=new Date().toLocaleTimeString('de-DE');},1000);async function removeOrder(id){if(confirm('Bestellung als erledigt markieren?')){try{const res=await fetch(`/api/orders/${id}/done`,{method:'PATCH'});if(res.ok){let printedOrders=JSON.parse(localStorage.getItem('printedOrders')||'[]');printedOrders=printedOrders.filter(orderId=>orderId!==id);localStorage.setItem('printedOrders',JSON.stringify(printedOrders));fetchOrders();}else{alert("Server-Fehler beim Markieren.");}}catch(err){console.error("Netzwerkfehler:",err);}}}
function printOrder(orderId){const orderCard=document.querySelector(`[data-id="${orderId}"]`);if(!orderCard)return;orderCard.classList.add('print-area');window.print();orderCard.classList.remove('print-area');markAsPrinted(orderId);}
function printAllMarked(){const allCards=document.querySelectorAll('.order-card');if(allCards.length===0)return alert("Keine Bestellungen zum Drucken da!");allCards.forEach(card=>card.classList.add('print-area'));window.print();allCards.forEach(card=>{card.classList.remove('print-area');const orderId=card.getAttribute('data-id');markAsPrinted(orderId);});}
function markAsPrinted(orderId){let printedOrders=JSON.parse(localStorage.getItem('printedOrders')||'[]');if(!printedOrders.includes(orderId)){printedOrders.push(orderId);localStorage.setItem('printedOrders',JSON.stringify(printedOrders));}
fetchOrders();}
function printSelected(){if(selectedOrderIds.size===0)return alert("Nichts ausgewählt!");selectedOrderIds.forEach(id=>{const card=document.querySelector(`.order-card[data-id="${id}"]`);if(card){card.classList.add('print-area');markAsPrinted(id);}});window.print();document.querySelectorAll('.print-area').forEach(el=>el.classList.remove('print-area'));selectedOrderIds.clear();fetchOrders();}
function selectAllCheckboxes(){const boxes=document.querySelectorAll('.print-checkbox');boxes.forEach(box=>{box.checked=true;selectedOrderIds.add(box.value);});}
async function cancelOrder(id){if(confirm('Möchtest du diese Bestellung wirklich STORNIEREN? (Wird als Storno in der Datenbank markiert)')){try{const res=await fetch(`/api/orders/${id}/cancel`,{method:'PATCH'});if(res.ok){let printedOrders=JSON.parse(localStorage.getItem('printedOrders')||'[]');printedOrders=printedOrders.filter(orderId=>orderId!==id);localStorage.setItem('printedOrders',JSON.stringify(printedOrders));fetchOrders();}else{alert("Server-Fehler: Stornierung konnte nicht gespeichert werden.");}}catch(err){console.error("Netzwerkfehler beim Stornieren:",err);alert("Netzwerkfehler. Bitte Internetverbindung prüfen.");}}}
function setBon(value){isBon=value;let styleTag=document.getElementById('bon-hide-style');if(!isBon){if(!styleTag){styleTag=document.createElement('style');styleTag.id='bon-hide-style';styleTag.innerHTML=`.btnPr { display: none !important; }`;document.head.appendChild(styleTag);}}else{if(styleTag){styleTag.remove();}}}
async function acceptOrder(id){const minuten=prompt("In wie vielen Minuten ist die Bestellung fertig?","20");if(minuten===null||minuten.trim()==="")return;try{const res=await fetch(`/api/orders/${id}/accept`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({dauer:minuten})});if(res.ok){fetchOrders();}else{alert("Fehler beim Annehmen der Bestellung.");}}catch(err){console.error("Netzwerkfehler:",err);}}
async function stornoOrder(id){if(!confirm("Bestellung wirklich stornieren?"))return;try{const res=await fetch(`/api/orders/${id}/storno`,{method:'PATCH'});if(res.ok){fetchOrders();}}catch(err){console.error("Storno-Fehler:",err);}}
function startLiveCountdowns(){setInterval(()=>{const timers=document.querySelectorAll('.countdown');timers.forEach(timer=>{const startTime=new Date(timer.getAttribute('data-start')).getTime();const durationMinutes=parseInt(timer.getAttribute('data-duration'));const endTime=startTime+(durationMinutes*60*1000);const now=new Date().getTime();const diff=endTime-now;const display=timer.querySelector('.timer-val');if(diff<=0){display.innerText="JETZT FERTIG!";display.style.color="#e94560";display.classList.add('blink');}else{const mins=Math.floor(diff/60000);const secs=Math.floor((diff%60000)/1000);display.innerText=`${mins}:${secs < 10 ? '0' : ''}${secs} Min.`;if(mins<5)display.style.color="orange";}});},1000);}
startLiveCountdowns();async function fetchHistory_(){const von=document.getElementById('filterVon').value;const bis=document.getElementById('filterBis').value;if(!von||!bis){alert("Bitte wähle einen Zeitraum aus!");return;}
try{const res=await fetch(`/api/get-all-orders?von=${von}&bis=${bis}`);if(!res.ok){throw new Error(`Server-Status: ${res.status}`);}
const orders=await res.json();if(window.autoRefreshInterval){clearInterval(window.autoRefreshInterval);}
renderOrders(orders);console.log(`Statistik geladen: ${orders.length} Bestellungen.`);}catch(err){console.error("Historie-Fehler:",err);alert("Fehler beim Laden: "+err.message);}}
let autoRefreshInterval=setInterval(fetchOrders,60000);document.getElementById('adminPassword')?.addEventListener('keypress',(e)=>{if(e.key==='Enter')submitLogin();});let isLoggedIn=false;function openLogin(){if(isLoggedIn){showHistoryArea();}else{document.getElementById('loginOverlay').style.display='flex';}}
function closeLogin(){document.getElementById('loginOverlay').style.display='none';document.getElementById('adminPassword').value="";}
function submitLogin(){const pwInput=document.getElementById('adminPassword').value;if(!pwInput)return alert("Passwort fehlt");currentPassword=pwInput;sessionStorage.setItem('key_admin',pwInput);sessionStorage.setItem('userRole','chef');isLoggedIn=true;closeLogin();document.getElementById('historyFilter').style.display='block';fetchHistory();}
async function submitBarLogin(){pwInput=document.getElementById('barPasswordInput').value;sessionStorage.setItem('barPassword',pwInput);sessionStorage.setItem('userRole','kellner');document.getElementById('barLoginOverlay').style.display='none';fetchOrders();}
function showHistoryArea(){document.getElementById('historyFilter').style.display='block';}
function exitHistory(){document.getElementById('historyFilter').style.display='none';sessionStorage.removeItem('key_admin');sessionStorage.setItem('userRole','kellner');currentPassword="";isLoggedIn=false;document.getElementById('ordersContainer').innerHTML="";fetchOrders();}
async function fetchHistory5(){const von=document.getElementById('filterVon').value;const bis=document.getElementById('filterBis').value;if(document.getElementById('historyFilter').style.display==='none')return;if(!currentPassword){currentPassword=sessionStorage.getItem('key_admin');}
if(!currentPassword){openLogin();return;}
if(!von||!bis){alert("Bitte logge dich erst über das Schloss-Symbol ein.");openLogin();return;}
console.log("Lade Historie von",von,"bis",bis);try{const res=await fetch(`/api/get-history?von=${von}&bis=${bis}&pw=${currentPassword}`);if(!res.ok){if(res.status===403){alert("Passwort falsch oder Sitzung abgelaufen.");}
throw new Error(`Server antwortet mit Status ${res.status}`);}
const data=await res.json();if(Array.isArray(data)){renderOrders(data);}else{console.error("Daten sind kein Array:",data);}}catch(err){console.error("Fehler beim Historie-Laden:",err);alert("Fehler beim Laden der Daten.");}}
async function fetchHistory(){const von=document.getElementById('filterVon').value;const bis=document.getElementById('filterBis').value;let pw=sessionStorage.getItem('key_admin')||sessionStorage.getItem('barPassword');if(!pw){openLogin();return;}
console.log("Lade Historie mit Passwort-Typ: ",sessionStorage.getItem('key_admin')?"Admin":"Bar");try{const res=await fetch(`/api/get-history?von=${von}&bis=${bis}&pw=${pw}`);const data=await res.json();if(res.ok&&data.success){sessionStorage.setItem('userRole',data.role);currentLoadedOrders=data.orders;applyFilters();}else{alert("Zugriff verweigert oder Passwort falsch.");}}catch(err){console.error("Fehler:",err);}}
function applyFilters(){const showPizza=document.getElementById('checkPizza')?.checked;const showGetraenke=document.getElementById('checkGetraenke')?.checked;let gefiltert=currentLoadedOrders;if(showPizza||showGetraenke){gefiltert=currentLoadedOrders.filter(o=>{const matchesPizza=showPizza&&o.typ==='Pizza';const matchesDrink=showGetraenke&&o.typ==='Getränk';return matchesPizza||matchesDrink;});}
renderOrders(gefiltert);}
async function saveManualOrder(){const tisch=document.getElementById('manualTisch').value.trim();const status=document.getElementById('manualStatus').value;const von=document.getElementById('filterVon').value;const bis=document.getElementById('filterBis').value;if(tisch===""){if(!von||!bis){return alert("Bitte gib oben unter 'Zeitraum abfragen' ein START- und END-Datum ein!");}
const confirmMsg=`Achtung: Möchtest du wirklich ALLE Bestellungen vom ${von} bis ${bis} auf den Status "${status}" setzen?`;if(!confirm(confirmMsg))return;try{const res=await fetch('/api/orders/bulk-update',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({von,bis,status})});const result=await res.json();if(res.ok){alert(`Erfolg: ${result.modifiedCount} Bestellungen wurden aktualisiert.`);fetchHistory();}else{alert("Fehler beim Update: "+result.error);}}catch(err){console.error("Netzwerkfehler:",err);}}
else{const date=document.getElementById('manualDate').value;const preis=document.getElementById('manualPrice').value;if(!date||!preis){return alert("Für eine Einzelbuchung bitte Datum und Preis angeben!");}
const orderData={tisch:tisch,erstelltAm:new Date(date),status:status,gesamtpreis:parseFloat(preis),details:[{artikel:"Manuelle Buchung",preis:preis,qty:1}]};try{const res=await fetch('/api/orders/manual',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(orderData)});if(res.ok){alert("Einzelbuchung gespeichert!");fetchHistory();}}catch(err){console.error("Fehler bei Einzelbuchung:",err);}}}
async function confirmLocalOrder_(id){const res=await fetch(`/api/orders/${id}/accept`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({dauer:0})});if(res.ok){fetchOrders();}}
async function confirmLocalOrder(id){try{const res=await fetch(`/api/orders/${id}/done`,{method:'PATCH'});if(res.ok){let printedOrders=JSON.parse(localStorage.getItem('printedOrders')||'[]');printedOrders=printedOrders.filter(orderId=>orderId!==id);localStorage.setItem('printedOrders',JSON.stringify(printedOrders));fetchOrders();}else{alert("Fehler beim Abschließen der Bestellung.");}}catch(err){console.error("Netzwerkfehler:",err);}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){console.log("Tab wieder aktiv – Daten werden synchronisiert...");if(!socket.connected){socket.connect();}
fetchOrders();}});async function markPartReady(orderId,type){try{const response=await fetch(`/api/orders/${orderId}/part-ready`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:type})});if(res.ok){console.log(`${type} als bereit markiert.`);}else{const errorData=await res.json();alert("Fehler: "+errorData.error);}}catch(err){console.error("Netzwerkfehler bei markPartReady:",err);}}
function updatePreiseSetting(){const cb=document.getElementById('checkPreise');if(cb){zeigePreise=cb.checked;fetchHistory();}}
async function checkBarLogin(){const passwordInput=document.getElementById('barPasswordInput').value;const errorMsg=document.getElementById('loginError');if(!passwordInput)return;try{const res=await fetch('/api/login-bar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:passwordInput})});const data=await res.json();if(data.success){sessionStorage.setItem('barAuthenticated','true');sessionStorage.setItem('barPassword',passwordInput);document.getElementById('barLoginOverlay').style.display='none';fetchOrders();}else{errorMsg.style.display='block';errorMsg.innerText="Passwort falsch!";document.getElementById('barPasswordInput').value="";}}catch(err){console.error("Login-Fehler:",err);alert("Server nicht erreichbar");}}
function unlockAudio(){const silentAudio=new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');silentAudio.volume=0;silentAudio.play().then(()=>{console.log("Audio für dieses Fenster freigeschaltet!");window.removeEventListener('click',unlockAudio);}).catch(e=>console.error("Unlock fehlgeschlagen",e));}
const infoMsg=document.getElementById('historyInfoMsg');if(infoMsg){infoMsg.style.display=sessionStorage.getItem('key_admin')?'none':'block';}
function renderCurrentOrders(){if(!Array.isArray(currentLoadedOrders)){console.warn("Noch keine Bestelldaten zum Filtern vorhanden.");return;}
const showNeu=document.getElementById('filterNeu')?.checked??true;const showAngenommen=document.getElementById('filterAngenommen')?.checked??true;const showErledigt=document.getElementById('filterErledigt')?.checked??false;const historyFilter=document.getElementById('historyFilter');const isHistoryOpen=historyFilter&&historyFilter.style.display!=='none';const filtered=currentLoadedOrders.filter(o=>{const status=(o.status||'neu').toLowerCase();if(status==='neu'&&showNeu)return true;if(status==='angenommen'&&showAngenommen)return true;const isDone=(status==='erledigt'||status==='done'||status==='abgeschlossen');if(isDone&&showErledigt&&isHistoryOpen){return true;}
return false;});renderOrders(filtered);}
const tageNamen=["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];async function openSettingsModal(){const modal=document.getElementById('settings-modal');const tbody=document.getElementById('zeiten-tabelle-body');modal.style.display='flex';tbody.innerHTML="<tr><td colspan='4'>Lade Daten...</td></tr>";try{const res=await fetch('/api/status');if(!res.ok)throw new Error("Server-Antwort nicht OK");const data=await res.json();const config=data.kompletteConfig;if(!config){tbody.innerHTML="<tr><td colspan='4'>Keine Konfiguration in DB gefunden!</td></tr>";return;}
tbody.innerHTML="";const tage=config.wochentage||config;for(let i=0;i<7;i++){const tag=tage[i]||tage[i.toString()]||{start:"11:00",ende:"22:00",zu:false};tbody.innerHTML+=`
                <tr style="border-bottom:1px solid #333;">
                    <td style="padding:10px 0;">${tageNamen[i]}</td>
                    <td><input type="time" id="start-${i}" value="${tag.start || '11:00'}" style="background:#333; color:white; border:1px solid #555; padding:5px; border-radius:3px;"></td>
                    <td><input type="time" id="ende-${i}" value="${tag.ende || '22:00'}" style="background:#333; color:white; border:1px solid #555; padding:5px; border-radius:3px;"></td>
                    <td style="text-align:center;"><input type="checkbox" id="zu-${i}" ${tag.zu ? 'checked' : ''}></td>
                </tr>
            `;}
befuelleModal(config);}catch(err){console.error("Modal-Ladefehler:",err);tbody.innerHTML="<tr><td colspan='4' style='color:red;'>Fehler beim Laden: "+err.message+"</td></tr>";}}
function closeSettingsModal(){document.getElementById('settings-modal').style.display='none';}
async function speichereZeiten(){const pw=document.getElementById('barPasswordInput').value;;if(!pw){alert("Fehler: Kein Passwort im Speicher gefunden. Bitte lade die Seite neu.");return;}
const meinVorlaufWert=document.getElementById('input-vorlauf').value;const neueZeiten={};for(let i=0;i<7;i++){const startVal=document.getElementById(`start-${i}`).value;const endeVal=document.getElementById(`ende-${i}`).value;const istZu=document.getElementById(`zu-${i}`).checked;neueZeiten[i]={name:tageNamen[i],start:startVal,ende:endeVal,zu:istZu};}
const payload={zeiten:neueZeiten,timerStartVorlauf:meinVorlaufWert,pw:pw};try{const response=await fetch('/api/admin/oeffnungszeiten',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const result=await response.json();if(response.ok&&result.success){alert("✅ Gespeichert! Die Handys der Gäste wurden aktualisiert.");closeSettingsModal();}else{alert("❌ Fehler vom Server: "+(result.error||"Unbekannter Fehler"));}}catch(err){console.error("Netzwerkfehler:",err);alert("❌ Verbindung zum Server fehlgeschlagen.");}}
async function speichereManuelleZeit(){const zeit=document.getElementById('input-bestell-ende').value;const pw=document.getElementById('barPasswordInput').value;;if(!pw){alert("Fehler: Kein Passwort im Speicher gefunden. Bitte lade die Seite neu.");return;}
if(!zeit)return alert("Bitte erst eine Uhrzeit wählen!");const response=await fetch('/api/admin/set-bestell-ende',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uhrzeit:zeit,pw:pw})});if(response.ok){alert(`Manuelle Zeit (${zeit} Uhr) aktiv.`);}else{alert("Fehler beim Speichern. Passwort korrekt?");}}
async function loescheManuelleZeit(){const pw=document.getElementById('barPasswordInput').value;;const response=await fetch('/api/admin/set-bestell-ende',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uhrzeit:null,pw:pw})});if(response.ok){document.getElementById('input-bestell-ende').value="";alert("Manuelle Zeit entfernt. Reguläre Öffnungszeiten gelten wieder.");}
const buttonEl=document.getElementById('timer-button-element');if(buttonEl){buttonEl.classList.remove('timer-aktiv');}}
async function setzeVorlauf(){const min=document.getElementById('input-vorlauf').value;const pw=document.getElementById('barPasswordInput').value;;if(!min)return alert("Bitte Minuten eingeben!");try{const response=await fetch('/api/admin/set-timer-vorlauf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({minuten:min,pw:pw})});const result=await response.json();if(response.ok&&result.success){alert(`✅ Timer-Vorlauf auf ${min} Minuten gesetzt.`);}else{alert("❌ Fehler: "+(result.error||"Passwort falsch oder Serverfehler"));}}catch(err){console.error("Netzwerkfehler:",err);alert("❌ Verbindung zum Server fehlgeschlagen.");}}
function befuelleModal(config){if(!config)return;const tage=config.wochentage||(config.kompletteConfig?config.kompletteConfig.wochentage:null);if(tage){for(let i=0;i<7;i++){const tagDaten=tage[i.toString()]||tage[i];if(tagDaten){const startEl=document.getElementById(`start-${i}`);const endeEl=document.getElementById(`ende-${i}`);const zuEl=document.getElementById(`zu-${i}`);if(startEl)startEl.value=tagDaten.start||"11:00";if(endeEl)endeEl.value=tagDaten.ende||"22:00";if(zuEl)zuEl.checked=tagDaten.zu===true;}}}
const vorlauf=config.timerStartVorlauf??config.kompletteConfig?.timerStartVorlauf;const vorlaufInput=document.getElementById('input-vorlauf');if(vorlaufInput&&vorlauf!==undefined){vorlaufInput.value=vorlauf;}}
async function initialisiereBarStatus(){try{const res=await fetch('/api/status');const data=await res.json();console.log("--- DIAGNOSE START ---");console.log("Vom Server empfangene Daten:",data);if(data.kompletteConfig){console.log("kompletteConfig Inhalt:",data.kompletteConfig);console.log("Timer-Wert im Paket:",data.kompletteConfig.timerStartVorlauf);befuelleModal(data.kompletteConfig);}else{console.warn("ACHTUNG: kompletteConfig fehlt in der Server-Antwort!");}
console.log("--- DIAGNOSE ENDE ---");}catch(err){console.error("Fehler beim Laden:",err);}}
setInterval(function(){updateBarTimer();},1000);let inOeffnungszeit=false;function updateBarTimer(){const timerBalken=document.getElementById('timer-balken');const timerAnzeige=document.getElementById('timer-countdown');const infoStart=document.getElementById('info-start');const infoReg=document.getElementById('info-regulaer');if(!timerBalken||!aktuellerStatus){console.warn("Update abgebrochen: Keine Status-Daten vorhanden.");return;}
let heute=null;let vorlaufMinuten=aktuellerStatus.timerStartVorlauf||tv||30;if(aktuellerStatus.kompletteConfig&&aktuellerStatus.kompletteConfig.wochentage){const index=new Date().getDay();heute=aktuellerStatus.kompletteConfig.wochentage[index];vorlaufMinuten=aktuellerStatus.kompletteConfig?.timerStartVorlauf||30;}
if(!heute&&aktuellerStatus.wochentage){const index=new Date().getDay();heute=aktuellerStatus.wochentage[index];}
if(!heute){heute=aktuellerStatus.heute;}
if(!heute){return;}
const jetzt=new Date();const jetztHHMM=jetzt.getHours().toString().padStart(2,'0')+":"+
jetzt.getMinutes().toString().padStart(2,'0');const startZeit=heute.start||"00:00";const regEnde=heute.ende||"00:00";let schlussZeit=aktuellerStatus.bestellStopManuell||regEnde;schlussZeit=regEnde;if(aktuellerStatus.bestellStopManuell&&aktuellerStatus.bestellStopManuell>regEnde){schlussZeit=aktuellerStatus.bestellStopManuell;}
const istGeschlossen=heute.zu===true||heute.zu==="true"||aktuellerStatus.zustand!=='offen';let ende=regEnde;if(schlussZeit>regEnde){ende=regEnde+" - Heute Verlängerung bis "+schlussZeit;}
if(infoStart)infoStart.innerText=istGeschlossen?"--:--":startZeit;if(infoReg)infoReg.innerText=istGeschlossen?"--:--":ende;if(istGeschlossen){timerBalken.style.display='block';timerBalken.style.backgroundColor='#e74c3c';timerAnzeige.innerText=(heute.zu===true||heute.zu==="true")?"RUHETAG":"OFEN AUS";return;}
else{timerBalken.style.backgroundColor='#2ecc71';timerAnzeige.innerText="GEÖFFNET";}
if(jetztHHMM<startZeit){timerBalken.style.display='block';timerBalken.style.backgroundColor='#3498db';timerAnzeige.innerText=`ÖFFNET UM ${startZeit}`;return;}
if(jetztHHMM>=regEnde&&jetztHHMM>=schlussZeit){timerBalken.style.display='block';timerBalken.style.backgroundColor='#2c3e50';timerAnzeige.innerText="BESTELL-STOP";return;}
const[h,m]=schlussZeit.split(':');const zielDatum=new Date();zielDatum.setHours(parseInt(h),parseInt(m),0,0);const diffMs=zielDatum-jetzt;const restMinuten=Math.floor(diffMs/60000);if(restMinuten<=vorlaufMinuten){timerBalken.style.display='block';timerBalken.style.backgroundColor=restMinuten<5?'#e74c3c':'#f39c12';const sekunden=Math.floor((diffMs/1000)%60);timerAnzeige.innerText=`${restMinuten.toString().padStart(2, '0')}:${sekunden.toString().padStart(2, '0')}`;}else{timerBalken.style.display='block';}
const buttonEl=document.getElementById('timer-button-element');if(buttonEl){buttonEl.classList.add('timer-aktiv');}}
async function initBar(){const res=await fetch('/api/status');aktuellerStatus=await res.json();updateBarTimer();}
initBar();window.addEventListener('click',unlockAudio);window.addEventListener('touchstart',unlockAudio);