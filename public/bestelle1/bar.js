
// Oben im Script:
let currentLoadedOrders = []; // Hier speichern wir die letzten gefetchten Daten
setBon(false);

// Ganz oben im Script:
//if (!sessionStorage.getItem('userRole')) {
    sessionStorage.setItem('userRole', 'kellner'); // Standardmäßig Kellner
//}

let zeigePreise = false; //für bar.html Auf false setzen, um Preise komplett auszublenden
let currentPassword = ""; // Ganz oben im Script-Bereich definieren
	let selectedOrderIds = new Set(); // Hier merken wir uns die IDs
//Dasmit checkboxen für Bon Ddruck nach intervall erhalten bleiben

// Diese Funktion rufst du mit dem 'onchange' der Checkbox auf
function toggleSelection(orderId) {
    if (selectedOrderIds.has(orderId)) {
        selectedOrderIds.delete(orderId);
    } else {
        selectedOrderIds.add(orderId);
    }
}
	
        // Automatische Uhrzeit oben rechts
        setInterval(() => {
            document.getElementById('clock').innerText = new Date().toLocaleTimeString('de-DE');
        }, 1000);




		
let lastOrderCount = 0;
const notificationSound = new Audio('/bestelle1/notification.mp3');

const feedbackSound = new Audio('https://actions.google.com/sounds/v1/foley/drawbridge_teal.ogg');

async function fetchOrders() {
    const savedPw = sessionStorage.getItem('barPassword');
    
    if (!savedPw) {
        if(document.getElementById('barLoginOverlay')) {
            document.getElementById('barLoginOverlay').style.display = 'flex';
        }
        return;
    }
    
    try {
        const res = await fetch('/api/get-orders', {
            headers: { 'x-bar-pw': savedPw }
        }); 
        
        if (res.status === 403) {
            alert("Nicht autorisiert! Bitte neu einloggen.");
            location.reload();
            return;
        }
        
        if (!res.ok) throw new Error("Server antwortet nicht korrekt");
        
        const orders = await res.json();
        
		currentLoadedOrders = orders; // Speichern
		renderCurrentOrders(); // Neue Filter-Funktion aufrufen
		
        // --- LOGIK-UPDATE ---
        // Wir prüfen: Ist der Historie-Filter gerade SICHTBAR?
        const isHistoryOpen = document.getElementById('historyFilter')?.style.display !== 'none';

        if (isHistoryOpen) {
            // In der Historie zeigen wir alles an, was vom Server kommt (da filtert der Server ja schon)
            renderOrders(orders);
        } else {
            // Im Live-Monitor filtern wir auf aktive Bestellungen
            const activeOrders = orders.filter(o => o.status === 'neu' || o.status === 'angenommen');
            
            // Sound-Logik
            const brandNewOrders = activeOrders.filter(o => o.status === 'neu');
            if (brandNewOrders.length > lastOrderCount) {
                notificationSound.play().catch(e => console.log("Audio blockiert"));
            }
            lastOrderCount = brandNewOrders.length;

            renderOrders(activeOrders);
        }
        
    } catch (err) {
        console.error("Fehler beim Laden:", err);
    }
}
		


function renderOrders(orders) {
    
	//console.log(JSON.stringify(orders));
	// Wir prüfen innerhalb EINER Bestellung (order), ob in deren Details Pizzas sind:
//const hasPizza = orders.details.some(item => 
//    item.category === "pizza" || item.category === "kinderpizza"
//);


	
	const container = document.getElementById('ordersContainer');
    
	
	
	
	// --- ZÄHLER-LOGIK ---
    // a) Neu / Abholung nicht bestätigt
    const countNeu = orders.filter(o => o.status === 'neu' || !o.status).length;
    
    // b) Abholung bestätigt (Status angenommen)
    const countBestaetigt = orders.filter(o => o.status === 'angenommen').length;
    
    // c) Bestellungen im Lokal (Wir prüfen, ob die Tischnummer kein Wort wie "Abholung" enthält)
    // Falls du ein Feld wie o.isLocal hast, nutze das. Sonst prüfen wir auf Tischnummern.
    const countBar = orders.filter(o => {
        const tischNum = String(o.tisch).toLowerCase();
        return !tischNum.includes('Abhol') && !tischNum.includes('liefer');
    }).length;

    // Anzeige im Header aktualisieren
    document.getElementById('count-neu').innerText = `A: ${countNeu}`;
    document.getElementById('count-bestaetigt').innerText = `B: ${countBestaetigt}`;
    document.getElementById('count-bar').innerText = `C: ${countBar}`;
    // ----------------------
	
	

	
	if (!container) return;

    // --- HINWEIS-LOGIK ---
    // Wir prüfen, ob das Filter-Menü gerade SICHTBAR ist
    const historyElement = document.getElementById('historyFilter');
    const isHistoryOpen = historyElement && historyElement.style.display !== 'none';
    const role = sessionStorage.getItem('userRole'); // 'chef' oder 'kellner'
    const serverBestaetigteRolle = sessionStorage.getItem('userRole'); // 'chef' oder 'kellner'
// WICHTIG: Hier direkt aus dem sessionStorage lesen!
   const adminKey = sessionStorage.getItem('key_admin');
   isAdmin = (adminKey !== null && adminKey !== "");


    let html = "";
//alert("role:"+role);
    if (isHistoryOpen) {
        if (serverBestaetigteRolle === 'chef') {
            // Gelber Balken für Kellner
			    html += `
                <div style="background: rgba(0, 202, 78, 0.15); border: 1px solid #00ca4e; color: #00ca4e; padding: 12px; border-radius: 6px; margin-bottom: 15px; text-align: center; font-size: 0.9rem; border-left: 5px solid #00ca4e;">
                    <strong style="display: block; margin-bottom: 3px;">🔓 Admin-Vollzugriff</strong>
                    Alle Daten im gewählten Zeitraum werden angezeigt.
                </div>
            `;
          
        } else {
            // Grüner Balken für Admin
        
			  html += `
                <div style="background: rgba(255, 189, 68, 0.15); border: 1px solid #ffbd44; color: #ffbd44; padding: 12px; border-radius: 6px; margin-bottom: 15px; text-align: center; font-size: 0.9rem; border-left: 5px solid #ffbd44;">
                    <strong style="display: block; margin-bottom: 3px;"></strong>
                    Es werden nur erledigte Bestellungen der letzten 20 Stunden angezeigt.
                </div>
            `;
			
			
        }
    }
	 else {
        // OPTIONAL: Hier könnte ein Balken für den "Live-Monitor" hin, 
        // oder html bleibt einfach leer "", dann verschwindet die Meldung.
        html = ""; 
    }



    if (orders.length === 0) {
        container.innerHTML = html+ '<div class="no-orders" style="padding:20px; text-align:center;">Keine Bestellungen... 🍕</div>';
        return;
    }

    const printedOrders = JSON.parse(localStorage.getItem('printedOrders') || '[]');
    const jetzt = new Date();

    container.innerHTML = html+orders.map(order => {
        
		const needsP = order.needsPizzaReady;
		const needsD = order.needsDrinksReady;
		const pReady = order.pizzaReady;
		const dReady = order.drinksReady;
		
		// Erstelle ein formatiertes Datum (z.B. 15.04. 18:30)
		const datumOptionen = { day: '2-digit', month: '2-digit' };
		const zeitOptionen = { hour: '2-digit', minute: '2-digit' };

		const bestellDatum = order.erstelltAm ? new Date(order.erstelltAm).toLocaleDateString('de-DE', datumOptionen) : "";
		const bestellZeit = order.erstelltAm ? new Date(order.erstelltAm).toLocaleTimeString('de-DE', zeitOptionen) : order.zeit;


		
		
		
		
		let distanzHTML = "";
		if (order.coords && order.coords.distanz !== undefined) {
			if (order.coords.distanz === -1) {
				// Fall für Desktop-Tests ohne GPS-Hardware
				distanzHTML = `<span style="font-size: 0.7rem; color: #3498db; background: rgba(52,152,219,0.1); padding: 1px 4px; border-radius: 3px;">💻 TEST</span>`;
			} else {
				const km = (order.coords.distanz / 1000).toFixed(2);
				// Farbe: Grün unter 1km, Orange bis 5km, sonst Rot
				let dFarbe = "#00ca4e"; 
				if (order.coords.distanz > 5000) dFarbe = "#ff4b2b";
				else if (order.coords.distanz > 1000) dFarbe = "#ffbd44";

				distanzHTML = `<span style="font-size: 0.8rem; font-weight: bold; color: ${dFarbe}; margin-left: 5px;">📍 ${km} km</span>`;
			}
		} else {
			// Wenn (noch) keine GPS Daten vom Gast gesendet wurden
			distanzHTML = `<span style="font-size: 0.7rem; color: #555; margin-left: 5px;">(Kein GPS)</span>`;
		}
			
		/// 1. "Tisch" radikal entfernen, um eine saubere Basis zu haben
        // Macht aus "Tisch 5" -> "5" und aus "Tisch Abholung" -> "Abholung"
        const saubererWert = String(order.tisch).replace(/tisch/gi, '').trim();

        // 2. Prüfen, ob es eine Abholung ist
        const istAbholung = saubererWert.toLowerCase().includes('abhol');

        // 3. Die Anzeige zusammenbauen
        // Bei Abholung: "Abholung", bei Lokal: "Tisch 5"
        const tischAnzeige = istAbholung ? saubererWert : `Tisch ${saubererWert}`;
		
		const isPrinted = printedOrders.includes(order._id);
        const erstellt = order.erstelltAm ? new Date(order.erstelltAm) : jetzt;
        const diffMinuten = Math.floor((jetzt - erstellt) / 60000);


		// --- UNTERSCHEIDUNG: ABHOLUNG ODER TISCH ---
        const tischString = String(order.tisch).toLowerCase();
        //const istAbholung = tischString.includes('abhol');


// 1. ZUERST: Prüfen, ob die ID im Set gespeichert ist
const isChecked = selectedOrderIds.has(order._id) ? 'checked' : '';


        // --- Zeit-Anzeige (Uhrzeit der Bestätigung) ---
        let infoBox = "";
        if (order.status === 'angenommen') {
            const confirmedTime = order.zeitAngenommen 
                ? new Date(order.zeitAngenommen).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) 
                : "--:--";

            infoBox = `
                <div style="background: rgba(0,202,78,0.1); padding: 4px 8px; border-radius: 4px; margin: 4px 0; border: 1px solid #00ca4e; font-size: 0.8rem;">
                    <span style="color: #00ca4e; font-weight: bold;">OK: ${confirmedTime} ${order.dauerAbholung > 0 ? '(' + order.dauerAbholung + 'm)' : ''}</span>
                    ${order.dauerAbholung > 0 ? `
                    <div class="countdown" data-start="${order.zeitAngenommen}" data-duration="${order.dauerAbholung}" style="color:#fff;">
                        Rest: <span class="timer-val" style="font-weight:bold;">...</span>
                    </div>` : ''}
                </div>`;
        }

        let tColor = diffMinuten >= 20 ? '#ff4b2b' : (diffMinuten >= 10 ? '#ffbd44' : '#00ca4e');

// --- NEU: KUNDEN-INFO BLOCK FÜR ABHOLUNGEN ---
        let kundenKontaktHTML = "";
        // Wir prüfen, ob es eine Abholung ist UND ob das adresse-Objekt existiert
		if (istAbholung && order.adresse) {
			const vName = order.adresse.vorname || "";
			const nName = order.adresse.nachname || "";
			const tel = order.adresse.telefon || "";
			const vollerName = `${vName} ${nName}`.trim();
//alert(vollerName);
			if (vollerName || tel) {
				kundenKontaktHTML = `
				<div class="kunden-info-box" style="background: rgba(0, 210, 255, 0.1); border: 1px dashed #00d2ff; padding: 8px; border-radius: 6px; margin: 8px 0;">
					${vollerName ? `<div style="color: #00d2ff; font-weight: bold; font-size: 0.95rem;">👤 ${vollerName}</div>` : ''}
					${tel ? `
						<div style="margin-top: 4px;">
							<a href="tel:${tel}" style="color: #28a745; text-decoration: none; font-weight: bold; font-size: 1.1rem; display: flex; align-items: center; gap: 5px;">
								<span>📞</span> ${tel}
							</a>
						</div>` : ''}
				</div>`;
			}
		}

        return `



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
            ? `<span style="color: #ccc !important;">
                ${menge > 1 ? `<small style="color: #888; font-size: 0.7rem;">(${einzelpreis.toFixed(2)}€) </small>` : ''}
                ${zeilenSumme}€
               </span>` 
            : ''; // Falls false, bleibt der Bereich leer

        const extrasText = (extras.length > 0) 
            ? `<div style="color: #D2691E !important; font-size: 0.75rem !important; margin-top: 2px;">
                + ${extras.map(e => ["Kleine Pizza", "Glutenfreier Teig", "Laktosefreie Mozarella"].includes(e) 
                    ? `<span style="color: #ff4b2b !important; font-weight: bold;">${e}</span>` : e).join(', ')}
               </div>` : '';

        const withoutText = (without.length > 0) 
            ? `<div style="color: #28a745 !important; font-size: 0.75rem !important; margin-top: 1px;">- ohne: ${without.join(', ')}</div>` : '';

        return `
            <li style="border-bottom: 1px solid #222; padding: 4px 0;">
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                    <span style="color: #eee !important; font-weight: bold;">
                        ${menge}x ${detailObj.variant} ${detailObj.size ? `(${detailObj.size})` : ''}
                    </span>
                    ${preisAnzeigeHTML}
                </div>
                ${extrasText}
                ${withoutText}
            </li>`;
    }).join('')}
</ul>

${zeigePreise ? `
    <div style="display: flex; justify-content: space-between; padding: 5px 0; margin-top: 5px; border-top: 2px solid #444;">
        <span style="color: #aaa; font-size: 0.9rem; font-weight: bold;">GESAMTSUMME:</span>
        <span style="color: #fff; font-size: 1rem; font-weight: bold; background: #28a745; padding: 2px 6px; border-radius: 3px;">
            ${parseFloat(order.gesamtpreis || 0).toFixed(2)}€
        </span>
    </div>
` : ''}


    <div style="display: flex; gap: 4px; margin-top: 6px;">
        <button onclick="printOrder('${order._id}')" style="flex: 0.6; padding: 5px; font-size: 0.75rem; background: #444; color: #fff; border: none; border-radius: 3px; cursor:pointer;">
            ${isPrinted ? 'Bon ✓' : '🖨️ Bon'}
        </button>
        
        ${istAbholung ? `
            ${(order.status === 'neu' || !order.status) ? 
                `<button onclick="acceptOrder('${order._id}')" style="flex: 1.5; padding: 5px; background: #007bff; color: white; border: none; border-radius: 3px; font-weight: bold; font-size: 0.75rem; cursor:pointer;">✅ Zeit</button>` : 
                `<button onclick="removeOrder('${order._id}')" style="flex: 1.5; padding: 5px; background: #28a745; color: white; border: none; border-radius: 3px; font-weight: bold; font-size: 0.75rem; cursor:pointer;">🍽️ Fertig</button>`
            }` 
        : `
            <div style="display: flex; gap: 4px; flex: 1.5;">
                ${order.needsPizzaReady ? `
                    <button onclick="markPartReady('${order._id}', 'pizza')" 
                            style="flex: 1; padding: 5px; background: ${order.pizzaReady ? '#444' : '#e94560'}; color: white; border: none; border-radius: 3px; font-weight: bold; font-size: 0.7rem; cursor:pointer;">
                        ${order.pizzaReady ? '🍕 OK' : '🍕 Pizza'}
                    </button>` : ''}
                
                ${order.needsDrinksReady ? `
                    <button onclick="markPartReady('${order._id}', 'drinks')" 
                            style="flex: 1; padding: 5px; background: ${order.drinksReady ? '#444' : '#ffbd44'}; color: ${order.drinksReady ? 'white' : 'black'}; border: none; border-radius: 3px; font-weight: bold; font-size: 0.7rem; cursor:pointer;">
                        ${order.drinksReady ? '🍺 OK' : '🍺 Getränke'}
                    </button>` : ''}
            </div>
        `}
    </div>
</div>`; // HIER wird die order-card erst ganz am Ende geschlossen!
}).join('')
	//console.log(JSON.stringify(orders));
}






       // 1. Initialer Aufruf beim Laden der Seite
		fetchOrders();

		// 2. Websocket-Verbindung aufbauen
		const socket = io();

		// 3. Der Bar-Ansicht sagen, dass sie dem "Bar-Raum" beitreten soll
		socket.emit('join-bar');


		// --- DIESEN TEIL HINZUFÜGEN ---
		// Wenn der Server sagt "bestellung-aktualisiert", lade die Liste neu
		socket.on('bestellung-aktualisiert', () => {
			console.log("Synchronisierung: Lade Bestellungen neu...");
			fetchOrders(); // Diese Funktion ruft die aktuellen Daten vom Server ab
		});



		// --- HIER DEN HERZSCHLAG EINBAUEN ---
		
		/*socket.on('connect', () => {
			console.log("Verbindung aktiv - Starte Herzschlag...");
			setInterval(() => {
				if (socket.connected) {
					socket.emit('heartbeat'); 
				}
			}, 20000); // Alle 20 Sekunden kurz "klopfen"
		});
		// ------------------------------------
		*/

		// Variable außerhalb definieren, damit nur EIN Timer läuft
		let heartbeatInterval;

		socket.on('connect', () => {
			console.log("Verbindung aktiv!");
			socket.emit('join-bar'); // WICHTIG: Immer neu dem Raum beitreten bei Reconnect!

			// 2. Daten sofort frisch vom Server ziehen (Sicherheits-Check nach Reconnect)
				fetchOrders();
			if (!heartbeatInterval) {
				heartbeatInterval = setInterval(() => {
					if (socket.connected) socket.emit('heartbeat');
				}, 25000); 
			}
		});






		// 4. Auf das Signal vom Server warten
		socket.on('neue-bestellung', (data) => {
			console.log("🚀 Live-Update: Neue Bestellung vom Server erhalten!");
			
			// Wir rufen deine bestehende Funktion auf. 
			// Diese holt die aktuellen Daten und spielt den Ton ab.
			fetchOrders(); 
		});
		
		// NEU: Auch auf Status-Änderungen hören (Done/Accept)
		socket.on('bestellung-aktualisiert', () => {
			console.log("🔄 Live-Update: Eine Bestellung wurde bearbeitet!");
			fetchOrders(); 
		});
				
		
		

		// 5. Sicherheits-Netz: Falls das WLAN mal kurz weg ist, 
		// prüft die Seite jede Minute trotzdem einmal manuell nach.
		setInterval(fetchOrders, 60000);

		// 6. Die Uhrzeit-Anzeige (hast du schon, kann so bleiben)
		setInterval(() => {
			const clockEl = document.getElementById('clock');
			if(clockEl) clockEl.innerText = new Date().toLocaleTimeString('de-DE');
		}, 1000);

        //Lösch-Funktion
       

	 async function removeOrder(id) {
    if (confirm('Bestellung als erledigt markieren?')) {
        try {
            // 1. Abfrage an den Server
            const res = await fetch(`/api/orders/${id}/done`, { 
                method: 'PATCH' 
            });

            if (res.ok) {
                // --- NEU: AUFRÄUMEN DES DRUCK-SPEICHERS ---
                // Wir holen die Liste, werfen die erledigte ID raus und speichern neu
                let printedOrders = JSON.parse(localStorage.getItem('printedOrders') || '[]');
                printedOrders = printedOrders.filter(orderId => orderId !== id);
                localStorage.setItem('printedOrders', JSON.stringify(printedOrders));
                // ------------------------------------------

                // Sobald alles sauber ist, Liste neu laden
                fetchOrders(); 
            } else {
                alert("Server-Fehler beim Markieren.");
            }
        } catch (err) {
            console.error("Netzwerkfehler:", err);
        }
    }
}
		
		
function printOrder(orderId) {
  
	const orderCard = document.querySelector(`[data-id="${orderId}"]`);
    //alert(orderCard);
	if (!orderCard) return;

    // 1. Drucken vorbereiten
    orderCard.classList.add('print-area');
    
	window.print();
    

	orderCard.classList.remove('print-area');

    // 2. Als gedruckt markieren (Lokal im Browser speichern)
    markAsPrinted(orderId);

}


function printAllMarked() {
    // 1. Alle Karten finden, die aktuell auf dem Monitor sind
    const allCards = document.querySelectorAll('.order-card');
    
    if (allCards.length === 0) return alert("Keine Bestellungen zum Drucken da!");

    // 2. Allen Karten die Druck-Klasse geben
    allCards.forEach(card => card.classList.add('print-area'));

    // 3. Druckdialog öffnen (jetzt sind alle Karten sichtbar für den Drucker)
    window.print();

    // 4. Nach dem Drucken: Allen Karten die Klasse wieder wegnehmen
    // UND sie als "gedruckt" im Speicher markieren
    allCards.forEach(card => {
        card.classList.remove('print-area');
        const orderId = card.getAttribute('data-id');
        markAsPrinted(orderId); // Diese Funktion haben wir im vorletzten Schritt gebaut
    });
}

// Hilfsfunktion zum Markieren (falls noch nicht vorhanden)
function markAsPrinted(orderId) {
    let printedOrders = JSON.parse(localStorage.getItem('printedOrders') || '[]');
    if (!printedOrders.includes(orderId)) {
        printedOrders.push(orderId);
        localStorage.setItem('printedOrders', JSON.stringify(printedOrders));
    }
    fetchOrders(); // Seite neu laden, um die "Gedruckt"-Optik anzuzeigen
}
		
	
function printSelected() {
    if (selectedOrderIds.size === 0) return alert("Nichts ausgewählt!");

    selectedOrderIds.forEach(id => {
        const card = document.querySelector(`.order-card[data-id="${id}"]`);
        if (card) {
            card.classList.add('print-area');
            markAsPrinted(id); // Setzt den isPrinted Status im localStorage
        }
    });

    window.print();

    // Aufräumen
    document.querySelectorAll('.print-area').forEach(el => el.classList.remove('print-area'));
    selectedOrderIds.clear(); // Auswahl nach Druck leeren
    fetchOrders(); // Ansicht aktualisieren (Häkchen weg, Optik grau)
}

function selectAllCheckboxes() {
    const boxes = document.querySelectorAll('.print-checkbox');
    boxes.forEach(box => {
        box.checked = true;
        selectedOrderIds.add(box.value); // WICHTIG: Hier ins Set speichern
    });
}

async function cancelOrder(id) {
    // Sicherheitsabfrage, damit man nicht aus Versehen storniert
    if (confirm('Möchtest du diese Bestellung wirklich STORNIEREN? (Wird als Storno in der Datenbank markiert)')) {
        try {
            // WICHTIG: Die URL muss zu deinem Backend passen (z.B. /api/orders/ID/cancel)
            const res = await fetch(`/api/orders/${id}/cancel`, { 
                method: 'PATCH' 
            });

            if (res.ok) {
                // 1. Druck-Status im Browser aufräumen
                let printedOrders = JSON.parse(localStorage.getItem('printedOrders') || '[]');
                printedOrders = printedOrders.filter(orderId => orderId !== id);
                localStorage.setItem('printedOrders', JSON.stringify(printedOrders));

                // 2. Ansicht aktualisieren
                fetchOrders(); 
            } else {
                alert("Server-Fehler: Stornierung konnte nicht gespeichert werden.");
            }
        } catch (err) {
            console.error("Netzwerkfehler beim Stornieren:", err);
            alert("Netzwerkfehler. Bitte Internetverbindung prüfen.");
        }
    }
}

function setBon(value) {
    isBon = value; // Update der Variable (true/false)

    // Wir suchen, ob der Style-Tag schon existiert
    let styleTag = document.getElementById('bon-hide-style');

    if (!isBon) {
        // Wenn Bon aus ist: Style-Tag erstellen, falls noch nicht da
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'bon-hide-style';
            styleTag.innerHTML = `.btnPr { display: none !important; }`;
            document.head.appendChild(styleTag);
        }
    } else {
        // Wenn Bon an ist: Den Style-Tag einfach löschen
        if (styleTag) {
            styleTag.remove();
        }
    }
}

// Funktion 1: Bestellung annehmen und Zeit an Gast senden
async function acceptOrder(id) {
    const minuten = prompt("In wie vielen Minuten ist die Bestellung fertig?", "20");
    
    // Wenn der User auf "Abbrechen" klickt oder nichts eingibt, Funktion beenden
    if (minuten === null || minuten.trim() === "") return;

    try {
        const res = await fetch(`/api/orders/${id}/accept`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dauer: minuten })
        });

        if (res.ok) {
            // Nach erfolgreichem Update Liste neu laden
            fetchOrders(); 
        } else {
            alert("Fehler beim Annehmen der Bestellung.");
        }
    } catch (err) {
        console.error("Netzwerkfehler:", err);
    }
}

// Funktion 2: Storno (Falls noch nicht vorhanden)
async function stornoOrder(id) {
    if (!confirm("Bestellung wirklich stornieren?")) return;

    try {
        const res = await fetch(`/api/orders/${id}/storno`, {
            method: 'PATCH'
        });

        if (res.ok) {
            fetchOrders();
        }
    } catch (err) {
        console.error("Storno-Fehler:", err);
    }
}




function startLiveCountdowns() {
    setInterval(() => {
        const timers = document.querySelectorAll('.countdown');
        
        timers.forEach(timer => {
            const startTime = new Date(timer.getAttribute('data-start')).getTime();
            const durationMinutes = parseInt(timer.getAttribute('data-duration'));
            const endTime = startTime + (durationMinutes * 60 * 1000);
            const now = new Date().getTime();
            
            const diff = endTime - now;
            const display = timer.querySelector('.timer-val');

            if (diff <= 0) {
                display.innerText = "JETZT FERTIG!";
                display.style.color = "#e94560"; // Rot, wenn überfällig
                display.classList.add('blink'); // Optionaler Blink-Effekt
            } else {
                const mins = Math.floor(diff / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                display.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs} Min.`;
                
                // Farbe ändern, wenn es knapp wird (unter 5 Min)
                if (mins < 5) display.style.color = "orange";
            }
        });
    }, 1000);
}

// Starte den Timer-Check einmalig beim Laden
startLiveCountdowns();


async function fetchHistory_() {
    const von = document.getElementById('filterVon').value;
    const bis = document.getElementById('filterBis').value;
//alert(von+" "+bis);
    if (!von || !bis) {
        alert("Bitte wähle einen Zeitraum aus!");
        return;
    }

    try {
        // WICHTIG: Der Pfad muss EXAKT wie in deiner server.js sein
        // Wenn dein HTML im Unterordner /best3/ liegt, nutze den absoluten Pfad:
        const res = await fetch(`/api/get-all-orders?von=${von}&bis=${bis}`);
        
        if (!res.ok) {
            throw new Error(`Server-Status: ${res.status}`);
        }
        
        const orders = await res.json();

        // Intervall stoppen, damit die Ansicht nicht weggespült wird
        if (window.autoRefreshInterval) {
            clearInterval(window.autoRefreshInterval);
        }

        // Deine vorhandene Render-Funktion nutzen
        renderOrders(orders);
        
        console.log(`Statistik geladen: ${orders.length} Bestellungen.`);
        
    } catch (err) {
        console.error("Historie-Fehler:", err);
        alert("Fehler beim Laden: " + err.message);
    }
}

// Damit wir das Intervall stoppen können, müssen wir es einer Variable zuweisen:
// Ändere dein vorhandenes setInterval(fetchOrders, 60000) zu:
let autoRefreshInterval = setInterval(fetchOrders, 60000);



// Bonus: Login mit Enter-Taste bestätigen
document.getElementById('adminPassword')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitLogin();
});


/* --- KORRIGIERTE LOGIN & HISTORY LOGIK --- */

let isLoggedIn = false; // Merkt sich den Login-Status

function openLogin() {
    // Wenn man schon eingeloggt ist, direkt den Filter zeigen
    if (isLoggedIn) {
        showHistoryArea();
    } else {
        document.getElementById('loginOverlay').style.display = 'flex';
    }
}

function closeLogin() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('adminPassword').value = "";
}


function submitLogin() {
    const pwInput = document.getElementById('adminPassword').value;
    if (!pwInput) return alert("Passwort fehlt");

    // WICHTIG: Wir setzen die Rolle erst NACHDEM wir das PW gespeichert haben
    // und die Historie geladen wird.
    currentPassword = pwInput; 
    sessionStorage.setItem('key_admin', pwInput); 
    sessionStorage.setItem('userRole', 'chef'); 
    
    isLoggedIn = true;
    closeLogin();
    document.getElementById('historyFilter').style.display = 'block';
    
    // Hier wird die Historie geladen – erst JETZT ist man "Chef"
    fetchHistory(); 
}

async function submitBarLogin() {
    const pwInput = document.getElementById('barPasswordInput').value;
    
    // Wir speichern das Bar-PW unter 'barPassword' (wie von fetchOrders erwartet)
    sessionStorage.setItem('barPassword', pwInput);
    sessionStorage.setItem('userRole', 'kellner'); // <--- NEU: Rolle merken
    document.getElementById('barLoginOverlay').style.display = 'none';
    fetchOrders();
}


function showHistoryArea() {
    document.getElementById('historyFilter').style.display = 'block';
	/*
	// Checkbox für History wieder aktivieren
    document.getElementById('filterErledigt').parentElement.style.opacity = "1";
    document.getElementById('filterErledigt').disabled = false;
	*/
}

function exitHistory() {
    document.getElementById('historyFilter').style.display = 'none';
	/*
	// Checkbox "Erledigt" für Live-Modus deaktivieren/ausblenden
    document.getElementById('filterErledigt').checked = false;
    document.getElementById('filterErledigt').parentElement.style.opacity = "0.3";
    document.getElementById('filterErledigt').disabled = true;
	*/
	// WICHTIG: Admin-Rechte beim Verlassen löschen
    sessionStorage.removeItem('key_admin'); 
	sessionStorage.setItem('userRole', 'kellner'); // Standardmäßig Kellner
    currentPassword = "";
    isLoggedIn = false; // Optional: Beim Schließen wieder ausloggen
    // Test: Container sofort leeren, damit alter Balken sicher weg ist
    document.getElementById('ordersContainer').innerHTML = "";
	
	
	fetchOrders(); 
}

// DIESE FUNKTION DARF KEIN PASSWORT MEHR ENTHALTEN
async function fetchHistory5() {
    // Werte aus den Feldern holen
    const von = document.getElementById('filterVon').value;
    const bis = document.getElementById('filterBis').value;
	alert(von+" "+bis);
	
	// 1. Wenn die Historie gar nicht offen ist, gar nicht erst prüfen!
	if (document.getElementById('historyFilter').style.display === 'none') return;
	// Falls currentPassword leer ist (z.B. nach Refresh), 
    // versuchen wir es aus dem sessionStorage zu retten
    if (!currentPassword) {
        currentPassword = sessionStorage.getItem('key_admin'); 
    }
	// 3. Wenn kein Passwort da, dann erst Login fordern
    if (!currentPassword) {
        openLogin(); 
        return;
    }
	
	
	if (!von || !bis) {
			//alert("Bitte Zeitraum wählen!");
			//return;
			alert("Bitte logge dich erst über das Schloss-Symbol ein.");
            openLogin(); 
        return;
		}
    console.log("Lade Historie von", von, "bis", bis);

    try {
        // WICHTIG: Hier nur die API aufrufen, KEINE PW-Abfrage!
        const res = await fetch(`/api/get-history?von=${von}&bis=${bis}&pw=${currentPassword}`);
        
		// Falls der Server 403 (Falsches PW) oder 500 sendet
        if (!res.ok) {
            if (res.status === 403) {
                alert("Passwort falsch oder Sitzung abgelaufen.");
            }
            throw new Error(`Server antwortet mit Status ${res.status}`);
        }
		
	
		const data = await res.json();
        
        // Anzeige aktualisieren, ohne die Seite neu zu laden
        // Nur rendern, wenn wir wirklich ein Array erhalten haben
        if (Array.isArray(data)) {
            renderOrders(data); 
        } else {
            console.error("Daten sind kein Array:", data);
        } 
        
    } catch (err) {
        console.error("Fehler beim Historie-Laden:", err);
        alert("Fehler beim Laden der Daten.");
    }
}


async function fetchHistory() {
    // 1. Werte aus den Feldern holen
    const von = document.getElementById('filterVon').value;
    const bis = document.getElementById('filterBis').value;
    
    // 2. Passwörter prüfen: Erst Admin, dann Bar
    let pw = sessionStorage.getItem('key_admin') || sessionStorage.getItem('barPassword');

    // 3. Wenn gar kein Passwort da ist, Login fordern
    if (!pw) {
        openLogin(); 
        return;
    }

    // 4. Wenn 'von' und 'bis' leer sind (Kellner-Schnellansicht)
    // können wir optional Standardwerte setzen oder eine Meldung zeigen
    console.log("Lade Historie mit Passwort-Typ: ", sessionStorage.getItem('key_admin') ? "Admin" : "Bar");

    try {
        // Wir hängen das gefundene Passwort (egal ob Admin oder Bar) an die URL
       const res = await fetch(`/api/get-history?von=${von}&bis=${bis}&pw=${pw}`);
    const data = await res.json();

    if (res.ok && data.success) {
        sessionStorage.setItem('userRole', data.role);
        
        // 1. Alle Daten vom Server speichern
        currentLoadedOrders = data.orders;
        
        // 2. Deine Filter-Logik anwenden (die die Checkboxen prüft)
        applyFilters(); 
        
    } else {
        alert("Zugriff verweigert oder Passwort falsch.");
    }
    } catch (err) {
        console.error("Fehler:", err);
    }
}


// Hilfsfunktion für die Checkboxen
function applyFilters() {
    const showPizza = document.getElementById('checkPizza')?.checked;
    const showGetraenke = document.getElementById('checkGetraenke')?.checked;

    let gefiltert = currentLoadedOrders;
//alert(JSON.stringify(currentLoadedOrders));
    // Nur filtern, wenn mindestens eine Checkbox aktiv ist
    if (showPizza || showGetraenke) {
        gefiltert = currentLoadedOrders.filter(o => {
            const matchesPizza = showPizza && o.typ === 'Pizza';
            const matchesDrink = showGetraenke && o.typ === 'Getränk';
            return matchesPizza || matchesDrink;
        });
    }

    renderOrders(gefiltert);
}

async function saveManualOrder() {
    const tisch = document.getElementById('manualTisch').value.trim();
    const status = document.getElementById('manualStatus').value;
    
    // Wir nehmen die Zeiträume aus den Filter-Feldern deiner Historie
    const von = document.getElementById('filterVon').value;
    const bis = document.getElementById('filterBis').value;

    // FALL A: Massen-Update (Tisch ist leer)
    if (tisch === "") {
        if (!von || !bis) {
            return alert("Bitte gib oben unter 'Zeitraum abfragen' ein START- und END-Datum ein!");
        }

        const confirmMsg = `Achtung: Möchtest du wirklich ALLE Bestellungen vom ${von} bis ${bis} auf den Status "${status}" setzen?`;
        if (!confirm(confirmMsg)) return;

        try {
            const res = await fetch('/api/orders/bulk-update', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ von, bis, status })
            });

            const result = await res.json();
            if (res.ok) {
                alert(`Erfolg: ${result.modifiedCount} Bestellungen wurden aktualisiert.`);
                fetchHistory(); // Liste neu laden
            } else {
                alert("Fehler beim Update: " + result.error);
            }
        } catch (err) {
            console.error("Netzwerkfehler:", err);
        }
    } 
    
    // FALL B: Einzelne manuelle Buchung (Tisch ist ausgefüllt)
    else {
        const date = document.getElementById('manualDate').value;
        const preis = document.getElementById('manualPrice').value;

        if (!date || !preis) {
            return alert("Für eine Einzelbuchung bitte Datum und Preis angeben!");
        }

        const orderData = {
            tisch: tisch,
            erstelltAm: new Date(date),
            status: status,
            gesamtpreis: parseFloat(preis),
            details: [{ artikel: "Manuelle Buchung", preis: preis, qty: 1 }]
        };

        try {
            const res = await fetch('/api/orders/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (res.ok) {
                alert("Einzelbuchung gespeichert!");
                fetchHistory();
            }
        } catch (err) {
            console.error("Fehler bei Einzelbuchung:", err);
        }
    }
}


async function confirmLocalOrder_(id) {
    // Schickt 0 Minuten Dauer, da der Gast im Lokal sitzt
    const res = await fetch(`/api/orders/${id}/accept`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dauer: 0 })
    });

    if (res.ok) {
        // Liste neu laden, damit der Status auf 'angenommen' springt
        fetchOrders(); 
    }
}


async function confirmLocalOrder(id) {
    // Da es keine Abholung ist, überspringen wir den Status "angenommen" 
    // und setzen die Bestellung sofort auf "erledigt"
    try {
        const res = await fetch(`/api/orders/${id}/done`, { 
            method: 'PATCH' 
        });

        if (res.ok) {
            // Optional: Falls du den Druck-Speicher auch hier aufräumen willst:
            let printedOrders = JSON.parse(localStorage.getItem('printedOrders') || '[]');
            printedOrders = printedOrders.filter(orderId => orderId !== id);
            localStorage.setItem('printedOrders', JSON.stringify(printedOrders));

            // Liste neu laden -> Bestellung verschwindet aus der aktiven Ansicht
            fetchOrders(); 
        } else {
            alert("Fehler beim Abschließen der Bestellung.");
        }
    } catch (err) {
        console.error("Netzwerkfehler:", err);
    }
}






//Tabwechsel Firefox ua. nachladen
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        console.log("Tab wieder aktiv – Daten werden synchronisiert...");
        
        // 1. Verbindung prüfen/neu aufbauen falls getrennt
        if (!socket.connected) {
            socket.connect(); 
        }
        
        // 2. Sofort die aktuellen Bestellungen ziehen
        fetchOrders();
    }
});


async function markPartReady(orderId, type) {
    try {
        const response = await fetch(`/api/orders/${orderId}/part-ready`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: type }) // type ist 'pizza' oder 'drinks'
        });

		if (res.ok) {
					console.log(`${type} als bereit markiert.`);
					
        // Optional: Ein kleiner Sound-Effekt für das Feedback
        // new Audio('https://actions.google.com/sounds/v1/foley/drawbridge_teal.ogg').play();
					
					// Wir müssen hier nicht manuell neu laden, 
					// da der Server über Socket 'bestellung-aktualisiert' sendet
				} else {
					const errorData = await res.json();
					alert("Fehler: " + errorData.error);
				}
			} catch (err) {
				console.error("Netzwerkfehler bei markPartReady:", err);
			}
		}




// Neue Funktion, um die Einstellung zu übernehmen
function updatePreiseSetting() {
    const cb = document.getElementById('checkPreise');
    if (cb) {
        zeigePreise = cb.checked;
        
        // WICHTIG: Wenn wir gerade in der Historie sind, müssen wir 
        // die Daten nicht neu vom Server laden, sondern nur neu zeichnen.
        // Falls du eine Variable hast, die die aktuellen orders speichert:
        // renderOrders(lastLoadedOrders); 
        
        // Einfachster Weg: Die Liste einmal neu triggern
        fetchHistory(); 
    }
}

async function checkBarLogin() {
    const passwordInput = document.getElementById('barPasswordInput').value;
    const errorMsg = document.getElementById('loginError');

    if (!passwordInput) return; // Nichts tun, wenn leer

    try {
        // 1. Erstmal beim Server prüfen, ob das Passwort stimmt
        const res = await fetch('/api/login-bar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: passwordInput })
        });

        const data = await res.json();

        if (data.success) {
            // 2. Erfolg! Jetzt das Passwort und den Status speichern
            sessionStorage.setItem('barAuthenticated', 'true');
            sessionStorage.setItem('barPassword', passwordInput); // WICHTIG für fetchOrders!
            
            // 3. UI verstecken
            document.getElementById('barLoginOverlay').style.display = 'none';
            
            // 4. Jetzt die Bestellungen laden (fetchOrders nutzt jetzt das barPassword)
            fetchOrders(); 
        } else {
            // Fehlerfall
            errorMsg.style.display = 'block';
            errorMsg.innerText = "Passwort falsch!";
            document.getElementById('barPasswordInput').value = "";
        }
    } catch (err) {
        console.error("Login-Fehler:", err);
        alert("Server nicht erreichbar");
    }
}






// Funktion, um Audio freizuschalten
function unlockAudio() {
    const silentAudio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    silentAudio.volume = 0; // Lautlos
    silentAudio.play().then(() => {
        console.log("Audio für dieses Fenster freigeschaltet!");
        // Event-Listener entfernen, damit es nur einmal passiert
        window.removeEventListener('click', unlockAudio);
    }).catch(e => console.error("Unlock fehlgeschlagen", e));
}


// In fetchHistory() nach dem erfolgreichen Laden:
const infoMsg = document.getElementById('historyInfoMsg');
if (infoMsg) {
    // Wenn Admin eingeloggt ist, Hinweis verstecken, sonst zeigen
    infoMsg.style.display = sessionStorage.getItem('key_admin') ? 'none' : 'block';
}



function renderCurrentOrders() {
    // 1. Sicherheits-Check: Haben wir überhaupt Daten?
    if (!Array.isArray(currentLoadedOrders)) {
        console.warn("Noch keine Bestelldaten zum Filtern vorhanden.");
        return;
    }

    // 2. Sicherheits-Check: Existieren die Checkboxen? (Nutze Optional Chaining '?')
    const showNeu = document.getElementById('filterNeu')?.checked ?? true;
    const showAngenommen = document.getElementById('filterAngenommen')?.checked ?? true;
    const showErledigt = document.getElementById('filterErledigt')?.checked ?? false;
    
    const historyFilter = document.getElementById('historyFilter');
    const isHistoryOpen = historyFilter && historyFilter.style.display !== 'none';

    // 3. Filtern mit Fehler-Toleranz bei den Status-Namen
    const filtered = currentLoadedOrders.filter(o => {
        // Status normalisieren (kleingeschrieben, Fallback 'neu')
        const status = (o.status || 'neu').toLowerCase();
        
        if (status === 'neu' && showNeu) return true;
        if (status === 'angenommen' && showAngenommen) return true;
        
        // Erledigt-Logik
        const isDone = (status === 'erledigt' || status === 'done' || status === 'abgeschlossen');
        if (isDone && showErledigt && isHistoryOpen) {
            return true;
        }
        
        return false;
    });

    // 4. Jetzt erst rendern
    renderOrders(filtered);
}



// Sobald der Nutzer das erste Mal irgendwo hinklickt, wird Audio erlaubt
// Auf Klick (PC) oder Touch (Tablet/Handy) reagieren
window.addEventListener('click', unlockAudio);
window.addEventListener('touchstart', unlockAudio);