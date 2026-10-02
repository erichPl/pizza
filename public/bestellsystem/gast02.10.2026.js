


// Testdaten (später aus data.js oder CSV)
var mockData = [
    { id: 1, category: "PIZZA", name: "Pizza Salami", desc: "Tomaten, Käse, Salami", price: 9.50 },
    { id: 2, category: "PIZZA", name: "Pizza Margherita", desc: "Mozzarella, Basilikum", price: 8.50 },
    { id: 3, category: "GETRÄNKE", name: "Cola 0,5l", desc: "Eiskalt serviert", price: 2.50 }
];



function renderMenu() {
    const container = document.getElementById('menu-container');
    const itemTemplate = document.getElementById('template-item');
    const headerTemplate = document.getElementById('template-header');
    
	// Wir holen uns NICHT den Haupt-Container, sondern nur die Liste
   // const itemsList = document.getElementById('template-item');
	
	// Nur die Produkte löschen, der Header (darüber) bleibt erhalten
    //itemsList.innerHTML = '';
    container.innerHTML = ""; 
    let lastCategory = "";

    menuCart.forEach(product => {
		
		// DER ENTSCHEIDENDE FILTER:
        if (product.isVisible === false) return;
		
		
        if (product.category !== lastCategory) {
            lastCategory = product.category;            
        }
        
        if (product.type == "header") {
            const headerClone = headerTemplate.content.cloneNode(true);
            headerClone.querySelector('.header-title').innerText = product['name'+ suffix] || product.name;
            container.appendChild(headerClone);
        } else {
            const itemClone = itemTemplate.content.cloneNode(true);
            const itemDiv = itemClone.querySelector('.item'); 
            
			let displayQty = product.quantity; // Standardmenge (direkt bestellt)
			
			//let count=0;
			// Wenn das aktuelle Produkt ein Extra ist, scannen wir alle Pizzen
			if (product.category === 'extra') {
				orderCart.forEach(cartItem => {
					// 1. Hat dieses Warenkorb-Item Extras?
					if (cartItem.orderDetails && cartItem.orderDetails.extras) {
						
						// 2. Suche in den Extras der Pizza nach dem Namen des aktuellen Produkts
						// Wir nutzen 'includes', da deine Extras Strings sind
						if (cartItem.orderDetails.extras.includes(product.name)) {
							// Wir addieren die Menge der Pizza (wenn 2 Pizzen mit Käse, dann +2 Käse)
							displayQty += (cartItem.orderDetails.quantity || 1);
							//alert(displayQty);
						}
					}
				});
			}
			
            
			// --- DER ENTSCHEIDENDE ANKER FÜR SYNC ---
            itemDiv.setAttribute('data-id', product.id); 
			//Anzeige Weihenstephaner Weizen 0,3 l / 0,5 l 3,50 / 5,50 €
            itemClone.querySelector('.item-name').innerText = product['name'+ suffix] || product.name;		 //Weihenstephaner Weizen
            itemClone.querySelector('.item-desc').innerText = product['desc'+ suffix] || product.desc;  		 //0,3 l / 0,5 l
            itemClone.querySelector('.item-price').innerText = product.price + " €"; //3,50 / 5,50
           
			itemClone.querySelector('.qty-display').innerText=displayQty;  //Menge  - 2 +
		  
			// + Button
			itemClone.querySelector('.btn-plus').onclick = () => {
				//changeQuantity(product, 1, qtyLabel);//   ==========================================
				plusMinusMenu(product,1);   //               plusMinusMenu(product,1) wird aufgerufen
			};                              //              ==========================================
			
			// - Button
			itemClone.querySelector('.btn-minus').onclick = () => {
				//changeQuantity(product, -1, qtyLabel);
				plusMinusMenu(product,-1);
			};
			
			
			
			
				
			if(product.category=='extra'){
				    itemClone.querySelector('.btn-plus').style.visibility='hidden';
					//itemClone.querySelector('.qty-display').innerText=product.quantity;
					itemClone.querySelector('.btn-minus').style.visibility='hidden';
					//console.log(product.name+" "+product.quantity+" "+count);
			}
       
       
			container.appendChild(itemClone);
			
	
	
		
		
		
		
		
		}
    });
	renderWochenplan();
}







// +/- in menuCart  (für standard wurde schon orderDetails hinzugefügt: (variant: name,variantIt: nameIt, size: desc, extras:[], without:[])
function plusMinusMenu(product0,delta){
	
	//Kopie des product0 von menuCart
	//==================================
	const product = JSON.parse(JSON.stringify(product0));	
	//alert("product "+product.orderDetails+"/");	
	//console.log("plusMinus index:"+editIndex+" product:"+JSON.stringify(product)+" productKopie"+JSON.stringify(productKopie);
	
	
	//alert(product.quantity); hier wird richtig mitgezählt
	if(delta<0){
		//wenn 0 und - dann return (menue)
		if(product0.quantity==0){		
			return;		
		}		
		//wenn größer 0
		//schaue, ob in Warenkorb mehr als 1x vorhanden, in diesem Fall Mitteilung dass direkt in Warenkorb zu ändern
		const matches = orderCart.filter(item => item.id === product.id);
		//alert(JSON.stringify(matches));
		if (matches.length > 1) {
			alert("Es sind verschiedene Varianten dieses Produkts im Warenkorb. Bitte passen Sie die Menge direkt im Warenkorb an."	);
			return; // Funktion abbrechen
		}
		else{
			//alert(JSON.stringify(menuCart[0]));
			//let matches=menuCart.find(p => p.id === product.id);
			//alert(JSON.stringify(matches[0]));
			matches[0].orderDetails.quantity--;
			// WICHTIG: Wenn die Menge jetzt 0 ist, lösche es komplett aus dem Warenkorb
			if (matches[0].orderDetails.quantity === 0) {
				orderCart = orderCart.filter(item => item !== matches[0]);
			}			
			updateAllQuantities(product.id); //Alle Mengen anpassen
		}
				
		
	}
	//    delta>0
	//==================
	else{
		 
		if (product.isStandard){                       // Standard: Forst 0.0  0.33l
			product.orderDetails.variant=product.name; //============================
			//product.orderDetails.It=product.nameIt;
			product.orderDetails.size=product.desc;	
			product.orderDetails.price=product.price;			
			addProduct(product);
			//------------------		  
		}
		else{    
			if(product.isPizza){                                    // Pizza
				//alert("plusMinus:"+product+" "+product.name);     // =======
				product.orderDetails.variant=product.name;
				product.orderDetails.price=product.price;
				//product.orderDetails.variantIt=product.nameIt;
				activePizza=product;
				openBranchingModal();//leitet nach openEditModal weiter für extras und für ohne
				//---------------------------
				return;  //WICHTIG: Funktion hier abbrechen! Das Modal übernimmt.
			}
			else{                                                  // "," u. "/"     Cola, Fanta  0.2 l / 0.4 l
				// variants, sizes                                 // ============================================
				openEditModal(product);//dort muss auch orderDetial: size,extras,without hinzugefügt werden
				//---------------------
				return; //WICHTIG: Funktion hier abbrechen! Das Modal übernimmt.
			}	 
		}			 	
	}	
	//alert(JSON.stringify(product));
	renderMenu();
	renderCart();
}



//Zählen in Menuekarte (unabhängig von variant, size, extras, ohne (nur für Menge in Menuekarte)
// menue.js



/*
//sorgt dafür, dass das Handy beim Zurückkehren zum Tab sofort beim Server nachfragt:
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        console.log("Gast ist zurück: Prüfe Bestellstatus...");
        
        // Falls du die Order-ID im LocalStorage oder einer Variable hast
        const orderId = localStorage.getItem('lastOrderId'); 
        
        if (orderId) {
            // Wir fragen den aktuellen Status der Bestellung ab
            fetch(`/api/orders/${orderId}`)
                .then(res => res.json())
                .then(order => {
                    if (order.status === 'angenommen') {
                        // Hier die Funktion aufrufen, die dem Gast 
                        // die Uhr und die Bestätigung anzeigt
                        showOrderConfirmed(order.dauerAbholung);
                    }
                });
        }
    }
});
*/


let countdownInterval = null;

/**
 * HAUPTFUNKTION: Aktualisiert die gesamte Status-Anzeige (Quadrat, Text, Banner)
 */
function aktualisiereStatusAnzeige(data) {
    const quadrat = document.getElementById('status-quadrat');
    const anzeige = document.getElementById('bestellzeit-anzeige');
    const banner = document.getElementById('countdown-banner');
    const timerDisplay = document.getElementById('countdown-timer');
    const bereich = document.getElementById('online-status-bereich');
	let bestellungMoeglich = false; // Standardmäßig ZU
   
    if (!data || !data.heute) return;

    // 1. Sichtbarkeit des gesamten Bereichs (nur bei Abholung)
    if (bereich) {
        bereich.style.display = (tischNr === "Abholung") ? 'flex' : 'none';
    }
	
	//alert(JSON.stringify(heute));
    const jetzt = new Date();
    const jetztHHMM = jetzt.getHours().toString().padStart(2, '0') + ":" + 
                      jetzt.getMinutes().toString().padStart(2, '0');

    const startZeit = data.heute.start || "00:00";
    const regulaeresEnde = data.heute.ende || "00:00";
    let schlussZeit;// = data.bestellStopManuell || reguläresEnde;
    //alert(JSON.stringify(data));
	//alert(data.bestellStopManuell);
	schlussZeit =regulaeresEnde;
	if (data.bestellStopManuell && data.bestellStopManuell > regulaeresEnde) {
		schlussZeit = data.bestellStopManuell;
	}
	
	// 3. Zusatz-Text berechnen
	let zusatz = "";
	let zusatzIt = "";
	// Check: Gibt es eine manuelle Zeit UND ist diese später als das reguläre Ende?
	// Check: Gibt es eine manuelle Zeit UND ist diese später als das reguläre Ende?
	if (schlussZeit && schlussZeit > regulaeresEnde) {
		zusatz = " - Heute Verlängerung";
		zusatzIt = " - Oggi prolungato fino ";
	}
		//alert(schlussZeit);
	//alert("in aktualisiere Statusanzeige:"+currentLang);
    const vorlaufMinuten = data.timerStartVorlauf || 30; 

    // --- BERECHNUNG DER RESTZEIT ---
    const [h, m] = schlussZeit.split(':');
    const zielZeit = new Date();
    zielZeit.setHours(parseInt(h), parseInt(m), 0);
    const restMinuten = Math.floor((zielZeit - jetzt) / 60000);

    if (banner) banner.style.display = 'none';
    if (countdownInterval) clearInterval(countdownInterval);

	

    // --- LOGIK-PRÜFUNG ---

    if (data.heute.zu || data.zustand !== 'offen') {
		//Geschlossen
		bestellungMoeglich = false; // Buttons aus
		if (currentLang === 'it') {
			updateUI('#e74c3c', data.meldung || "Oggi chiuso");
		}
		else{
			updateUI('#e74c3c', data.meldung || "Heute geschlossen");
		}
    }
    else if (jetztHHMM < startZeit||jetztHHMM >= schlussZeit) {
        // Fall: AUSSERHALB DER ZEITEN (ODER-Verknüpfung || benutzen!)
		console.log("<startZeit u >schlusszeit:<"+startZeit+ " >"+schlussZeit);
		if (currentLang === 'it') {
			updateUI('#e74c3c', `Ordinazione Takeaway tra ${startZeit} e ${regulaeresEnde}`);
		}
		else{
			updateUI('#e74c3c', `Takeaway Bestellung von ${startZeit} bis ${regulaeresEnde}`);
		}
		bestellungMoeglich = false; // Buttons aus
    }
    // 4. Fall: ORANGE (Vorlauf erreicht)
    else if (restMinuten <= vorlaufMinuten) {
		 console.log("restMinuten <= vorlaufMinuten::"+restMinuten+" <= "+vorlaufMinuten);
        // GEÄNDERT: Von ... bis ...
		if (currentLang === 'it') {
			if (schlussZeit>regulaeresEnde){
				updateUI('#f39c12', `Ordinazione Takeaway tra ${startZeit} e ${regulaeresEnde}`+zusatzIt+`${schlussZeit}`);
			}
			else{
				updateUI('#f39c12', `Ordinazione Takeaway tra ${startZeit} e ${regulaeresEnde}`);
			}
		}
		else{ 
			if (schlussZeit>regulaeresEnde){		
			updateUI('#f39c12', `Takeaway Bestellung von ${startZeit} -  ${regulaeresEnde}`+zusatz+` bis ${schlussZeit} Uhr`);
			}
			else{
				updateUI('#f39c12', `Takeaway Bestellung von ${startZeit} -  ${regulaeresEnde}`);
			}
		}
		if (tischNr=="Abholung"){
			if (banner) banner.style.display = 'block';
			starteEinheitlichenTimer(schlussZeit, timerDisplay,data);
		}
		bestellungMoeglich = true; // Buttons ein
    }
    // 5. Fall: GRÜN (Normalbetrieb)
    else {
		console.log("Normalbetrieb");
		if (currentLang === 'it') {
			if (schlussZeit>regulaeresEnde){		
				updateUI('#2ecc71', `Ordinazione Takeaway tra ${startZeit} e ${regulaeresEnde}`+zusatzIt+`${schlussZeit}`);
			}
			else{
				updateUI('#2ecc71', `Ordinazione Takeaway tra ${startZeit} e ${regulaeresEnde}`);		
			}
		}
		else{
			// GEÄNDERT: Von ... bis ...
			if (schlussZeit>regulaeresEnde){		
				updateUI('#2ecc71', `Takeaway Bestellung von ${startZeit} -  ${regulaeresEnde}`+zusatz+` bis ${schlussZeit} Uhr`);	
			}
			else{
				updateUI('#2ecc71', `Takeaway Bestellung von ${startZeit} -  ${regulaeresEnde}`);
			}	
		}
		bestellungMoeglich = true; // Buttons ein				
    }
	
	
	// --- LOGIK-ANPASSUNG AM ENDE DER FUNKTION ---

	// Wenn tischNr NICHT "Abholung" ist, darf IMMER bestellt werden (true).
	// Wenn es "Abholung" ist, gilt der berechnete Wert bestellungMoeglich.
	const finalMoeglich = (tischNr !== "Abholung") ? true : bestellungMoeglich;
	
	
	
	//alert(bestellungMoeglich);
	updateButtonStates(finalMoeglich);
    function updateUI(farbe, text) {
        if (quadrat) quadrat.style.backgroundColor = farbe;
        if (anzeige) anzeige.innerText = text;
    }
}

/**
 * TIMER-FUNKTION: Ein einziger Timer für alle Fälle
 */
function starteEinheitlichenTimer(zielUhrzeit, displayElement,data) {
    if (!displayElement) return;
    const [h, m] = zielUhrzeit.split(':');
    
    function tick() {
        const jetzt = new Date();
        const ziel = new Date();
        ziel.setHours(parseInt(h), parseInt(m), 0);
        
        const diff = ziel - jetzt;
        if (diff <= 0) {
			const banner = document.getElementById('countdown-banner');
            if (banner) banner.style.display = 'none';
            //displayElement.innerText = "00:00";
            clearInterval(countdownInterval);
            // Wenn Zeit abgelaufen, Status-Box auf Rot zwingen
           // document.getElementById('status-quadrat').style.backgroundColor = '#e74c3c';
            //document.getElementById('bestellzeit-anzeige').innerText = "Bestellannahme beendet";
            //return;
			
			if (data) {
                aktualisiereStatusAnzeige(data);
            } else {
                // Sicherheits-Fallback falls data fehlt
                document.getElementById('status-quadrat').style.backgroundColor = '#e74c3c';
            }
            return;
        }
        
        const min = Math.floor(diff / 60000);
        const sek = Math.floor((diff % 60000) / 1000);
        displayElement.innerText = `${min}:${sek.toString().padStart(2, '0')}`;
		//aktualisiereStatusAnzeige(data);
    }
    
    tick();
    countdownInterval = setInterval(tick, 1000);
}


//let letzteStatusDaten = null; // Global speichern
/**
 * INITIALISIERUNG & SOCKETS
 */
socket.on('status-update', (data) => {
    //console.log("Neues Update empfangen:", data);

    // WICHTIG: Daten zusammenführen (Mergen)
    if (letzteStatusDaten) {
        // Wir nehmen die alten Daten und überschreiben sie mit den neuen
        letzteStatusDaten = Object.assign({}, letzteStatusDaten, data);
    } else {
        letzteStatusDaten = data;
    }

    // Jetzt die UI-Teile aktualisieren
    if (typeof aktualisiereStatusAnzeige === "function") {
        aktualisiereStatusAnzeige(letzteStatusDaten);
    }
	//console.log(JSON.stringify(letzteStatusDaten));
	//console.log(JSON.stringify(data));
    //renderMenu();
    // Die Wochenliste neu zeichnen
    // Warte 50ms, bis der Rest vom DOM sich beruhigt hat
    //setTimeout(() => {
       renderWochenplan();
    //}, 50);
});


async function initialisiereStatus() {
    try {
        // 1. Status vom Server holen
        const response = await fetch('/api/status');
        if (!response.ok) throw new Error("Server-Antwort war nicht okay");
        
        const data = await response.json();
		letzteStatusDaten = data; // <--- WICHTIG: Hier für den Sprachwechsel merken!
		aktualisiereStatusAnzeige(data);
        // 2. Modus-Erkennung (Optional, falls du ihn für andere Logik brauchst)
        const urlParams = new URLSearchParams(window.location.search);
        const aktuellerModus = urlParams.has('tisch') ? 'restaurant' : 'abholung';
        
        // Speichere den Modus global oder im localStorage, falls nötig
        window.bestellModus = aktuellerModus;

        // 3. Deine zentrale Anzeige-Funktion aufrufen
        // Wir übergeben nur data, da die Zeitlogik für beide Modi gleich ist
        aktualisiereStatusAnzeige(data);
        
        //console.log(`Initialer Status geladen (${aktuellerModus}):`, data);

    } catch (err) {
        console.error("Fehler beim ersten Laden des Status:", err);
        // Optional: Dem Gast anzeigen, dass die Verbindung hakt
        document.getElementById('bestellzeit-anzeige').innerText = "Status wird geladen...";
    }
}



function renderWochenplan_() {
    const tabelle = document.getElementById('zeiten-tabelle');
    const titel = document.getElementById('titel-oeffnungszeiten');
    
    // Sicherheitscheck: Sind Daten und Element da?
    if (!tabelle || !letzteStatusDaten || !letzteStatusDaten.wochentage) return;

    // Titel übersetzen
    titel.innerText = (currentLang === 'it') ? "Takeaway Orari accettazione ordini" : "Takeaway Bestellzeiten";

    const tageDe = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
    const tageIt = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
    
    let html = "";

    // Wir gehen die Tage 0 (So) bis 6 (Sa) durch
    for (let i = 0; i < 7; i++) {
        const tag = letzteStatusDaten.wochentage[i];
        if (!tag) continue;

        const name = (currentLang === 'it') ? tageIt[i] : tageDe[i];
        let zeitenText = "";

        if (tag.zu === true || tag.zu === "true") {
            zeitenText = (currentLang === 'it') ? "Chiuso" : "Geschlossen";
        } else {
            zeitenText = `${tag.start} - ${tag.ende} Uhr`;
        }

        // Heute markieren?
        const istHeute = new Date().getDay() === i ? "style='background-color: #f0f0f0; font-weight: bold;'" : "";

        html += `<tr ${istHeute}>
                    <td style="padding: 5px 10px;">${name}:</td>
                    <td style="padding: 5px 10px;">${zeitenText}</td>
                 </tr>`;
    }

    tabelle.innerHTML = html;
}


function renderWochenplan() {
   //alert("render");
	const tabelle = document.getElementById('zeiten-tabelle');
    if (!tabelle) return;

    // Pfad laut deinem letzten Alert
    const plan = letzteStatusDaten?.kompletteConfig?.wochentage;
 //alert(JSON.stringify(plan));
    if (!plan) {
        // Wenn noch NIE Daten da waren, zeige "Laden"
        if (tabelle.innerHTML === "") {
            tabelle.innerHTML = "<tr><td>Lade Öffnungszeiten...</td></tr>";
        }
        return; 
    }

    // Wenn Daten da sind, wird die Tabelle hier neu aufgebaut
    const isIt = (currentLang === 'it');
    const tageNamen = isIt 
        ? ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"]
        : ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

    let html = "";
    for (let i = 0; i < 7; i++) {
        const tag = plan[i];
        if (!tag) continue;

        const name = tageNamen[i];
        const zeiten = (tag.zu === true || tag.zu === "true") 
            ? (isIt ? "Chiuso" : "Geschlossen") 
            : `${tag.start} - ${tag.ende}`;

        const style = (new Date().getDay() === i) ? "style='color: #e67e22; font-weight: bold;'" : "";

        html += `<tr ${style}>
                    <td style="padding: 5px; text-align: left;">${name}:</td>
                    <td style="padding: 5px; text-align: right;">${zeiten}</td>
                 </tr>`;
    }
    tabelle.innerHTML = html;
	// 3. WICHTIG: Falls der Container drumherum versteckt ist
    const footer = document.getElementById('oeffnungszeiten-footer');
    if (footer) {
        if (tischNr === "Abholung") {
            footer.style.display = 'block'; 
        } else {
            footer.style.display = 'none'; // Explizit verstecken bei Tischbestellung
        }
    }
}


// In der Schleife, die deine Produkte (template-item) erstellt:
function updateButtonStates(isPossible) {
    const allPlusButtons = document.querySelectorAll('.btn-plus');
    
    allPlusButtons.forEach(btn => {
        if (isPossible) {
            btn.classList.remove('btn-disabled');
        } else {
            btn.classList.add('btn-disabled');
        }
    });
    
    // Auch den "Jetzt bestellen" Button im Warenkorb deaktivieren
    const orderBtn = document.getElementById('btnCartOrder');
    if (orderBtn) {
        orderBtn.disabled = !isPossible;
        orderBtn.style.opacity = isPossible ? "1" : "0.5";
    }
}


// Aufruf der Initialisierung beim Laden der Seite
document.addEventListener('DOMContentLoaded', initialisiereStatus);

// WICHTIG: Die Funktion muss auch aufgerufen werden!
initialisiereStatus();


// Optional: Alle 30 Sek. prüfen, ob die Uhrzeit die reguläre Ende-Zeit überschritten hat
setInterval(() => {
    fetch('/api/status').then(res => res.json()).then(data => aktualisiereStatusAnzeige(data));
}, 30000);


