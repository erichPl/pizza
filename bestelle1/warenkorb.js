


// 1. Test-Daten (Simulierte CSV-Daten)
// 1. Testdaten
// Globaler Warenkorb-Speicher
//let currentCart = [];

// Testdaten (später aus data.js oder CSV)
/*
// 1. Dein Warenkorb-Speicher
let orderCart = [
    { id: 101, name: "Pizza Salami", desc: "mit extra Käse", price: 9.50, qty: 1, without: ["Zwiebeln"], extras: ["Extra Käse"] },
    { id: 102, name: "Pasta Carbonara", desc: "Speck, Ei, Sahne", price: 11.00, qty: 2 },
    { id: 103, name: "Cola 0.5l", desc: "eiskalt serviert", price: 2.50, qty: 1 }
];
*/


function getDisplVariant(product,variant){
	// Wenn Italienisch aktiv ist und das Produkt Varianten-Listen hat
	if (currentLang === 'it' && product.variants && product.variantsIt) {
		const vIndex = product.variants.indexOf(variant);
		if (vIndex > -1 && product.variantsIt[vIndex]) 
		{
			return product.variantsIt[vIndex];
		}
	}
		
	else
	{
		return variant;
	}
}

function getDisplSize(product,size){
	// Wenn Italienisch aktiv ist und das Produkt Varianten-Listen hat
	if (currentLang === 'it' && product.sizes && product.sizesIt) {
		const vIndex = product.sizes.indexOf(size);
		if (vIndex > -1 && product.sizesIt[vIndex]) 
		{
			return product.sizesIt[vIndex];
		}
	}
		
	else
	{
		return size;
	}
}
/*
function getTranslatedValue(product, value, type) {
    // type ist entweder 'variants' oder 'sizes'
    const deArray = product[type];           // z.B. product['variants']
    const itArray = product[type + 'It'];     // z.B. product['variantsIt']

    if (currentLang === 'it' && deArray && itArray) {
        const index = deArray.indexOf(value);
        if (index > -1 && itArray[index]) {
            return itArray[index];
        }
    }
    
    // Fallback: Wenn nicht Italienisch oder Übersetzung fehlt
    return value;
}
*/

function getTranslatedList(product, selectedValues, type) {
    if (!selectedValues || selectedValues.length === 0) return [];
    
    // 1. Quelldaten holen (z.B. desc oder variants)
    let deSource = product[type];
    let itSource = product[type + 'It'];

    // Falls die Quelle ein String ist (wie bei desc), in Array umwandeln
    if (typeof deSource === 'string') deSource = deSource.split(',').map(s => s.trim());
    if (typeof itSource === 'string') itSource = itSource.split(',').map(s => s.trim());

    // 2. Wenn Italienisch nicht aktiv ist oder Übersetzungen fehlen: Original zurück
    if (currentLang !== 'it' || !itSource) return selectedValues;

    // 3. Werte einzeln übersetzen
    return selectedValues.map(val => {
        const idx = deSource ? deSource.indexOf(val) : -1;
        return (idx > -1 && itSource[idx]) ? itSource[idx] : val;
    });
}

function getTranslatedExtras(selectedNames, product) {
    // Falls nichts gewählt wurde oder Sprache nicht Italienisch ist
    if (!selectedNames || selectedNames.length === 0 || currentLang !== 'it') {
        return selectedNames;
    }

    // Das Array mit allen verfügbaren Extra-Objekten aus dem Produkt
    const availableExtras = product.extras || [];

    return selectedNames.map(selectedName => {
        // Wir suchen im verfügbaren Pool nach dem Objekt, das so heißt wie unsere Auswahl
        const extraObj = availableExtras.find(e => 
            e.name.trim() === selectedName.trim()
        );
        
        // Wenn gefunden, nimm nameIt, sonst bleib beim deutschen Namen
        return (extraObj && extraObj.nameIt) ? extraObj.nameIt : selectedName;
    });
}


// 2. Warenkorb anzeigen
function renderCart() {
    //alert(orderCart.length);
	const container = document.getElementById('cart-container');
    const itemTemplate = document.getElementById('template-cart-item');
    if (!container || !itemTemplate) return;
    container.innerHTML = "";
    let totalItems = 0;

	
	
	orderCart.forEach((product,index) => {
        const itemClone = itemTemplate.content.cloneNode(true);
        const isPizza = product.isPizza || product.category === 'pizza';
        totalItems += product.quantity;
        let displayVariant=getDisplVariant(product,product.orderDetails.variant);
        let displaySize=getDisplSize(product,product.orderDetails.size);
		// 1. BASIS-DATEN (Menge und Name)
        itemClone.querySelector('.item-name').innerText = displayVariant, //['variant'+ suffix] || product.orderDetails.variant; 
        itemClone.querySelector('.qty-display').innerText = product.orderDetails.quantity;

        // 2. SPEZIAL-LOGIK FÜR DIE ANZEIGE-REIHENFOLGE
        const descElement = itemClone.querySelector('.item-desc');
        
        // Wir nutzen product.orderDetails für die gewählten Optionen
        const sel = product.orderDetails || { size: "", variant: "", extras: [], without: [] };
        
		// Anzeige Logik
        if (isPizza) {
            // Zeile 1: Größe (z.B. Kleine Pizza) in Orange und Größer
            //alert("sel.size"+sel.size); ist bei Pizza immer "", könnte also weggelassen werden.
			if (sel.size) {
                descElement.innerHTML = `<span style="color: #ffa500; font-size: 1.2rem; font-weight: bold; display: block; margin-bottom: 5px;">${displaySize}</span>`;
                descElement.style.display = 'block';
            } 
			else {
                descElement.style.display = 'none';
            }
        } 
		else {
            // Standard-Produkte (Getränke): Name evtl. durch Variante ersetzen
            //if (product.variant && sel.variant.length > 0) {
                itemClone.querySelector('.item-name').innerText = displayVariant;
            //}
            //descElement.innerText = sel.size || product.desc;
			//alert(product.wkSize);
			itemClone.querySelector('.item-desc').innerText = displaySize;
        }

        // 3. "OHNE"-LOGIK (Grün)
        const withoutDiv = itemClone.querySelector('.item-without');
        const currentWithout = sel.without || [];
        if (currentWithout.length > 0) {
            withoutDiv.style.color = "#28a745"; // Grün
            withoutDiv.style.display = "block";
            
			// HIER setzt du den Text für genau diesen einen Listeneintrag
            withoutDiv.querySelector('.without-prefix').innerText = t.without + ": ";
			
			// Funktion aufrufen: Wir schicken die gewählten Werte und sagen, 
			// dass die Quelle 'desc' ist (woraus dann 'desc' und 'descIt' wird)
			const translatedNames = getTranslatedList(product, currentWithout, 'desc');
			
			const prefix = currentLang === 'it' ? "Senza: " : "Ohne: ";
			// Präfix "Ohne: " + Liste
            const names = currentWithout.map(e => e.name || e);
            withoutDiv.querySelector('.without-list').innerText = translatedNames.join(', ');
        } 
		else {
            withoutDiv.style.display = 'none';
        }

        // 4. "EXTRAS"-LOGIK
        const extrasDiv = itemClone.querySelector('.item-extras');
        const currentExtras = sel.extras || [];
        if (currentExtras.length > 0) {
            extrasDiv.style.display = "block";
            // Präfix "Extras: " + Liste
            // Präfix "Extras: " + Liste
			//const names = currentExtras.map(e => e.name || e);
            
			// Hier wird die neue Funktion aufgerufen
			//alert(currentExtras);
			const translatedExtras = getTranslatedExtras(currentExtras,product);
			const prefix = currentLang === 'it' ? "Extra: " : "Extras: ";
			extrasDiv.querySelector('.extras-list').innerText = prefix+translatedExtras.join(', ');
        } 
		else {
            extrasDiv.style.display = 'none';
        }

		//preis
		let preis=calculateItemPrice(product);
		//alert(preis0);
		
		//let preis=product.orderDetails.quantity*preis0;
		
		//let preis=product.orderDetails.quantity*(product.price).replace(",",".");
		//itemClone.querySelector('.item-price').innerText=preis.toFixed(2).replace(".", ",")+" €"; // Ergebnis: "12,50"
		itemClone.querySelector('.item-price').innerText=preis.toFixed(2);

        // 5. BUTTONS verknüpfen
        itemClone.querySelector('.btn-minus').onclick = () => changeCartQty(index,-1);
        itemClone.querySelector('.btn-plus').onclick = () =>changeCartQty(index, 1);
        
		
		
        const btnEdit = itemClone.querySelector('.btn-edit');
        if (btnEdit) {
			// 1. ZUERST prüfen: Braucht das Produkt überhaupt einen Ändern-Button?
			if (product.isStandard) {
				btnEdit.style.display = 'none';
			} 
			else {
				let currentEditItem = null; // Wir merken uns das ganze Objekt

				// In renderCart()
				btnEdit.onclick = () => {
					//activePizza = product;      // Das Objekt für das Modal
					//currentEditIndex = index;   // Die Position im orderCart Array
					//currentEditItem = product; // Das ist die "Referenz" auf genau diese Zeile
					/*if (product.isPizza) {
						openBranchingModal();
					} else {
						openEditModal(product);
					}*/
					editProduct=product;//Global
					editIndex=index;;//Global
				    editWkId=product.wkId;
					//alert(editWkId);
					//q=product.orderDetails.quantity;
					
					//if (q>1){
						//product.orderDetails.quantity--;
						//product.quantity--;
						//let productKopie = JSON.parse(JSON.stringify(product));
					
						//console.log("plusMinus index:"+editIndex+" product:"+JSON.stringify(product)+" productKopie"+JSON.stringify(productKopie);
						//alert(JSON.stringify(product));
						plusMinusMenu(product,1);						
					/*}
					else{
						if(product.isPizza){
						    //product.quantity--;
							//product.orderDetails.quantity--;
							activePizza=product;
						    openBranchingModal();//leitet nach openEditModal weiter für extras und für ohne
							
						}
						else{
							//product.quantity--;
							//product.orderDetails.quantity--;
							//product.quantity=0;
							//product.orderDetails.quantity=0;
							openEditModal(product);
						}
					}*/
					
				};
				if (btnEdit) {
					// Nutze hier deine globale Übersetzungs-Variable
					btnEdit.innerText = translations[currentLang].edit; 
				}
				
			}
			//console.log("editWkId:"+editWkId+" id:"+product.id+"var: "+product.variant+" size:"+product.size+" qty:"+product.quantity+" "+product.wkId+" ordQty:"+product.orderDetails.quantity);
		}			
		// 3. Eine Kopie für das Modal erstellen (Menge immer 1)
		const itemToEdit = JSON.parse(JSON.stringify(product));
		itemToEdit.quantity = 1;
		itemToEdit.isEditing = true; // Markierung für das Modal

		
		//renderCart(); // Menü-Zahlen und Korb sofort aktualisieren
		container.appendChild(itemClone);
		
	});
    
	document.getElementById("cart-count-badge").innerHTML=countTotal;
}





// 4. Sidebar umschalten
function toggleCart(show) {
    const cart = document.getElementById('cart-sidebar');
    cart.style.display = show ? 'flex' : 'none';
}

// 5. Alles leeren
function clearFullCart() {
    /*if (confirm("Bestellung wirklich löschen?")) {
        orderCart = [];
        renderCart();
    }*/
    const confirmMsg = t.emptyConfirm || "Bestellung wirklich löschen?";

    if (confirm(confirmMsg)) {
        // 1. Den eigentlichen Warenkorb leeren
        orderCart = [];
        
        // 2. Den Status-Speicher für die Menü-Anzeige leeren
        currentCart = [];

        // 3. Den Warenkorb-Bereich (Sidebar) aktualisieren
        renderCart();

        // 4. Die Anzeige direkt im Menü auf 0 zurücksetzen
        resetMenuQuantities();
    }	
}


function resetMenuQuantities() {
    const qtyLabels = document.querySelectorAll('.qty-display');
    qtyLabels.forEach(label => {
        label.innerText = "0";
    });
}




function closeSuccessModal() {
    document.getElementById('order-success-modal').style.display = 'none';
    toggleCart(false); // Schließt auch die Sidebar
}


/*
// Start
window.addEventListener('DOMContentLoaded', () => {
    renderCart();
    toggleCart(true); 
});

*/

function addToOrderCart(product) {
	orderCart.push(product);
	//alert("add");
	renderCart();
	renderMenu();
}



/**
 * Ändert die Menge eines bereits im Warenkorb (Order) befindlichen Items.
 * @param {string|number} productId - Die ID des Produkts im Warenkorb.
 * @param {number} delta - Die Änderung (+1 oder -1).
 */
function changeQuantityOrder(cartItemId, delta) {
    // 1. Finde das Item im Warenkorb (Order)
    let item = orderCart.find(i => i.id === cartItemId);
    	let found = orderCart.find(p => p.id==item.id);
	
    if (item) {
        // Menge im Warenkorb ändern
        item.quantity += delta;
			countTotal+=delta;
			found.quantity+=delta;
			if (countTotal==-1){
				countTotal=0;				
			}
			if (found.quantity<0){
				found.quantity=0;
			}
        // 2. Synchronisation mit der Menükarte
        // Da 'item.id' der Zahl aus deinem Menü entspricht:
       

        // 3. Löschen, wenn Menge 0 erreicht
        if (item.quantity <= 0) {
            orderCart = orderCart.filter(i => i.id !== cartItemId);
       
        }
    }

    // 4. Den Warenkorb in der Sidebar neu zeichnen
    renderCart();
	renderMenu();
	
}



function changeCartQty(index, delta) {
    const item = orderCart[index];
    
    if (delta > 0) {
        // Einfach die Menge der bestehenden Kombination erhöhen
        item.orderDetails.quantity++;
    } else {
        // Menge verringern
        item.orderDetails.quantity--;
        // Wenn 0, dann aus dem Array löschen
        if (item.orderDetails.quantity <= 0) {
            orderCart.splice(index, 1);
        }
    }
    
    // Alles aktualisieren
    updateAllQuantities(); // Synchronisiert die Zahlen im Menü
    renderCart();
    renderMenu();
}



function calculateItemPrice(item) {
    // 1. Basispreis (Punkt statt Komma für die Rechnung)
    let basePrice = parseFloat(item.price.toString().replace(",", "."));
    let extrasTotal = 0;

    // 2. Preise der Extras addieren
    if (item.orderDetails && item.orderDetails.extras) {
        item.orderDetails.extras.forEach(extraName => {
            // Wir suchen das Extra in der menuCart, um den Preis zu finden
            const extraProduct = menuCart.find(p => p.name === extraName && p.category === 'extra');
            if (extraProduct) {
                extrasTotal += parseFloat(extraProduct.price.toString().replace(",", "."));
            }
        });
    }

    // 3. Gesamtsumme mal Menge
    return (basePrice + extrasTotal) * item.orderDetails.quantity;
}


function sumExtras(prod) {
    let prArr = prod.orderDetails.extrasPrice || [];
    //alert(JSON.stringify(prArr));
	// 1. Prüfen ob es überhaupt ein Array ist und ob es Inhalt hat
    //alert(prArr.length);
	//if (!prArr || (prArr.length ==1 && prArr[0]==null)) return 0;
	//alert("pr:"+prArr);
    // Wir geben das Ergebnis des reduce direkt zurück
    return prArr.reduce((acc, priceString) => {
		//alert(cleanPrice);
        let cleanPrice = parseFloat(priceString.replace('+', '').replace(',', '.')) || 0;
        return acc + cleanPrice; // Das Ergebnis wird an den nächsten Schritt weitergereicht
    }, 0); // Startwert ist 0
}


function processCheckout(btn) {
	
	if(tischNr!="Abholung"){
		processCheckout0(btn);
	}
	else{
		//alert("open");
		openContactModal(btn);		
	}
	
}

async function processCheckout0(btn) {
    if (!window.orderCart || orderCart.length === 0) return null;

    try {
        if (btn) btn.disabled = true;


// --- SCHRITT 1: Variablen berechnen (VOR der Verwendung) ---
        // Hier lag der Fehler: Die Variablen müssen definiert sein, bevor orderData sie nutzt
        const hasPizza = window.orderCart.some(item => 
            item.category === 'pizza' || 
            item.category === 'kinderpizza' || 
            item.isPizza === true
        );

        const hasDrinks = window.orderCart.some(item => 
            item.category !== 'pizza' && 
            item.category !== 'kinderpizza' && 
            item.category !== 'extra'
        );

        // 1. Daten für die Bar aufbereiten
        const artikelDetails = window.orderCart.map(item => {
            let vollerName = item.name;
            let zusatz = item.orderDetails.size || "";
            if (item.orderDetails?.extras?.length > 0) {
                vollerName += " + " + item.orderDetails.extras.join(", ");
            }
            if (item.orderDetails?.removed?.length > 0) {
                vollerName += " (OHNE: " + item.orderDetails.removed.join(", ") + ")";
            }

            return {
                artikel: vollerName + " " + zusatz,
                qty: item.orderDetails?.quantity || 1,
                preis: (parseFloat(item.price.toString().replace(',', '.')) + 
                       (item.orderDetails?.extrasPrice || []).reduce((s, p) => s + parseFloat(p.toString().replace('+', '').replace(',', '.')), 0)).toFixed(2),
                orderDetails: item.orderDetails
            };
        });

        // 2. Gesamtsumme berechnen
        const gesamtSumme = window.orderCart.reduce((sum, item) => {
            const basePrice = parseFloat(item.price.toString().replace(',', '.')) || 0;
            const extrasTotal = (item.orderDetails?.extrasPrice || []).reduce((eSum, ePrice) => {
                const cleanPrice = parseFloat(ePrice.toString().replace('+', '').replace(',', '.')) || 0;
                return eSum + cleanPrice;
            }, 0);
            const qty = item.orderDetails?.quantity || 1;
            return sum + ((basePrice + extrasTotal) * qty);
        }, 0);

        const orderData = {
            tisch: document.getElementById('tisch-view')?.innerText || "Gast",
            details: artikelDetails, 
            gesamtpreis: parseFloat(gesamtSumme.toFixed(2)),
            zeit: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
            status: 'neu',
            
			// --- NEUE FELDER FÜR DIE GETRENNTEN BUTTONS ---
            needsPizzaReady: hasPizza,    // Sagt dem Dashboard: "Zeig den Pizza-Button"
            needsDrinksReady: hasDrinks,  // Sagt dem Dashboard: "Zeig den Getränke-Button"
            pizzaReady: false,            // Initialer Status
            drinksReady: false,           // Initialer Status
			
			
			
			location: (typeof coords !== 'undefined' && coords) ? { lat: coords.latitude, lng: coords.longitude } : "Kein GPS",
            coords: (typeof coords !== 'undefined') ? coords : null,
            adresse: (typeof adresse !== 'undefined') ? adresse : null
        };

        // 3. ABSCHICKEN
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if (response.ok) {
            const result = await response.json();
            
            // --- WARENKORB LOKAL LEEREN ---
            window.orderCart = []; 
            const badge = document.getElementById('cart-count-badge');
            if (badge) badge.innerText = "0";

            if (window.menuCart) {
                window.menuCart.forEach(item => {
                    item.quantity = 0;
                    if (item.orderDetails) {
                        item.orderDetails.quantity = 0;
                        item.orderDetails.extras = [];
                        item.orderDetails.removed = [];
                        item.orderDetails.extrasPrice = [];
                    }
                });
            }

            if (typeof renderMenu === "function") renderMenu();
            if (typeof toggleCart === "function") toggleCart(false);

            // GIBT DIE ID AN finishOrder ZURÜCK
            return result.orderId; 

        } else {
            alert("Fehler beim Senden an den Server.");
            if (btn) btn.disabled = false;
            return null;
        }

    } catch (err) {
        console.error("Fehler im Checkout-Prozess:", err);
        if (btn) btn.disabled = false;
        return null;
    }
}



// --- 1. FUNKTION NUR ZUM ÖFFNEN ---
function openContactModal(btn) {
    // Falls toggleCart() den Warenkorb schließt, hier aufrufen:
    if (typeof toggleCart === "function") toggleCart(false); 
    
    document.getElementById('contactModal').style.display = 'flex';
}

// --- 2. DIE LOGIK (Einmalig definieren) ---
document.addEventListener('DOMContentLoaded', () => {
    const btnSave = document.getElementById('btnSaveContact');
	const btnBack = document.getElementById('btnCancelContact');
    
	// 1. ZURÜCK-LOGIK (Wird SOFORT beim Laden definiert)
    if (btnBack) {
        btnBack.onclick = function() {
            // Modal schließen
            document.getElementById('contactModal').style.display = 'none';
            
            // Falls der OK-Button gesperrt war (z.B. nach Fehlversuch), wieder freigeben
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.innerText = "OK";
            }
        };
    }
	
	
	
    if (btnSave) {
        btnSave.onclick = function() {
            const vorname = document.getElementById('fname').value.trim();
            const nachname = document.getElementById('lname').value.trim();
            const telefon = document.getElementById('phone').value.trim();

            if (!vorname || !nachname || telefon.length < 9) {
                alert("Bitte alle Felder ausfüllen.");
                return;
            }

            btnSave.disabled = true;
			
			// --- DIE WEICHE ---
		   if (isGeolocationActive === true) {
			
				btnSave.innerText = "Standort wird ermittelt...";

				if ("geolocation" in navigator) {
					// NUR DIESER EINE AUFRUF im ganzen Skript:
					navigator.geolocation.watchPosition(
						async (position) => {
							const c = {
								lat: position.coords.latitude,
								lng: position.coords.longitude
							};

							// 1. Bestellung abschicken (nur beim allerersten Mal)
							if (!orderGesendet) {
								orderGesendet = true;
								await finishOrder(c, vorname, nachname, telefon);
							}

							// 2. Live-Update senden (sobald ID da ist)
							if (window.currentOrderId) {
								sendGpsUpdate(window.currentOrderId, c.lat, c.lng);
							}
						},
						(err) => {
							console.error("GPS Fehler:", err);
							// Nur Fehlermeldung zeigen, wenn noch nicht bestellt wurde
							if (!orderGesendet) {
								alert("Standort benötigt! Bitte GPS erlauben.");
								btnSave.disabled = false;
								btnSave.innerText = "Erneut versuchen";
								
								// Button sicherheitshalber einblenden falls er auf display:none war
                                if (btnBack) btnBack.style.display = "inline-block";
								
							
							}
						},
						{ 
							enableHighAccuracy: true, // Direkt präzise anfragen
							timeout: 10000, 
							maximumAge: 0 
						}
					);
				} 
				else {
					alert("GPS nicht unterstützt.");
					btnSave.disabled = false;
				}
			}
			else{
		// --- FALL: GEOLOCATION IST DEAKTIVIERT ---
				btnSave.innerText = "Bestellung wird gesendet...";
				
				// Wir senden einfach 0,0 als Platzhalter-Koordinaten
				const dummyCoords = { lat: 0, lng: 0 };
				
				if (!orderGesendet) {
					orderGesendet = true;
					// Direkt zur Bestellung ohne GPS-Abfrage
					finishOrder(dummyCoords, vorname, nachname, telefon);
				}
			}

		}
	}
});





// Hilfsfunktion zum Abschließen (wird vom Modal aufgerufen)
async function finishOrder(coords, vorname, nachname, tel) {
    // UI Feedback
    document.getElementById('contactModal').style.display = 'none';
    const finishModal = document.getElementById('finischModal');
    if(finishModal) finishModal.style.display = "flex";

	// Wir erstellen das adresse-Objekt global
    window.adresse = {
        vorname: vorname,
        nachname: nachname,
        telefon: tel
    };


    // Koordinaten für processCheckout0 bereitstellen
    window.coords = { latitude: coords.lat, longitude: coords.lng };

    if (typeof processCheckout0 === "function") {
        try {
            const orderId = await processCheckout0(); 
            if (orderId) {
                window.currentOrderId = orderId; // Global speichern für Updates
                document.getElementById('kontaktdaten').innerText = "Gesendet!";
                listenForConfirmation(orderId);
            } else {
                throw new Error("Keine OrderId erhalten");
            }
        } catch (err) {
            console.error(err);
            alert("Senden fehlgeschlagen.");
            orderGesendet = false; // Reset, damit man es nochmal probieren kann
            if(finishModal) finishModal.style.display = "none";
        }
    }
}

function listenForConfirmation(orderId) {
    if (typeof io !== 'undefined') {
        if (!socket) socket = io();

        // WICHTIG: Jedes Mal, wenn der Socket (neu) verbindet, dem Raum beitreten
        socket.on('connect', () => {
            console.log("Socket verbunden, trete Raum bei:", orderId);
            socket.emit('join_order_room', orderId);
        });

        // Falls der Socket schon verbunden ist, sofort beitreten
        if (socket.connected) {
            socket.emit('join_order_room', orderId);
        }

        // Einmalig den Listener registrieren (verhindert doppelte Sounds)
        socket.off('order_confirmed'); 
        socket.on('order_confirmed', (data) => {
            console.log("Signal empfangen!", data);
            if (data.orderId == orderId) {
                updateOrderUI(data.dauer);
            }
        });
    } else {
        console.error("Socket.io nicht geladen!");
    }
}

function updateOrderUI(dauer) {
    const kontaktdaten = document.getElementById('kontaktdaten');
    const waitText = document.getElementById('waitText');
    const loader = document.getElementById('modalLoader');
    const area = document.getElementById('confirmedArea');
    const display = document.getElementById('durationDisplay');

    // Nur ausführen, wenn die Elemente da sind (verhindert Fehler)
    if (waitText && waitText.style.display !== "none") {
        if (kontaktdaten) kontaktdaten.innerText = "Bestätigt! ✅";
        if (waitText) waitText.style.display = "none";
        if (loader) loader.style.display = "none";
        if (area) area.style.display = "block";
        if (display) display.innerText = dauer;

        try { new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play(); } catch(e){}
    }
}

/*
// Der "Handy-Wachmacher"
document.addEventListener("visibilitychange", () => {
    // Nur neu verbinden, wenn wir eine aktive Bestellung haben und der Tab sichtbar wird
    if (document.visibilityState === "visible" && currentOrderId) {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            console.log("Handy aufgewacht – verbinde neu für ID:", currentOrderId);
            listenForConfirmation(currentOrderId);
        }
    }
});
*/

// Der kombinierte "Handy-Wachmacher" in warenkorb.js
document.addEventListener("visibilitychange", async () => {
    // Wir holen uns die ID aus dem Speicher (da currentOrderId beim Refresh weg sein könnte)
    const orderId = currentOrderId || localStorage.getItem('lastOrderId');

    if (document.visibilityState === "visible" && orderId) {
        console.log("Handy aufgewacht – Prüfe Status für ID:", orderId);

        // 1. WebSocket neu starten (für zukünftige Signale wie "Bestellung fertig")
        if (typeof io !== 'undefined') {
            if (!socket || !socket.connected) {
                listenForConfirmation(orderId);
            }
        }

        // 2. Sofort beim Server nachschauen (falls Signal verpasst wurde)
        try {
            const res = await fetch(`/api/orders/${orderId}`);
            if (res.ok) {
                const order = await res.json();
                if (order.status === 'angenommen' || order.status === 'done') {
                    // Wir rufen einfach die UI-Update Logik auf, 
                    // die du schon in listenForConfirmation geschrieben hast!
                    updateOrderUI(order.dauerAbholung || order.dauer);
                }
            }
        } catch (err) {
            console.error("Fehler beim Status-Check nach Aufwachen:", err);
        }
    }
});










// Berechnet die Luftlinie in Metern
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Erdradius in m
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

function starteLiveTracking(orderId, initialCoords) {
    if (!("geolocation" in navigator)) return;

    // 1. Sofort den ersten Standort senden (den wir schon beim Button-Klick bekommen haben)
    if (initialCoords) {
        sendGpsUpdate(orderId, initialCoords.lat, initialCoords.lng);
    }

    // 2. Das "Beobachten" starten (nutzt meist den bestehenden Cache/Erlaubnis)
    navigator.geolocation.watchPosition(position => {
        sendGpsUpdate(orderId, position.coords.latitude, position.coords.longitude);
    }, null, { enableHighAccuracy: true });
}




// Hilfsfunktion, um doppelten Code zu vermeiden
function sendGpsUpdate(orderId, lat, lng) {
    // DEINE BAR-KOORDINATEN
    const barLat = 46.6225; 
    const barLng = 10.6941;
    
    const distanz = calculateDistance(lat, lng, barLat, barLng);

    fetch('/api/update-coords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            orderId: orderId,
            coords: {
                lat: lat,
                lng: lng,
                distanz: Math.round(distanz)
            }
        })
    });
}


function confirmSelection_() {
    // ... Deine Logik um Extras/Größe in activePizza.orderDetails zu sammeln ...

    // SCHRITT A: Wenn wir ein einzelnes Item editiert haben (currentEditIndex >= 0)
    // Löschen wir es kurzzeitig aus dem Array, um es gleich "sauber" neu zu prüfen
    if (currentEditIndex !== -1) {
        orderCart.splice(currentEditIndex, 1);
        currentEditIndex = -1; // Reset
    }

    // SCHRITT B: Prüfen, ob exakt dieses Produkt (gleiche ID + gleiche Extras) schon im Korb ist
    const existingIndex = orderCart.findIndex(item => {
        const sameId = item.id === activePizza.id;
        const sameSize = item.orderDetails.size === activePizza.orderDetails.size;
        const sameExtras = JSON.stringify(item.orderDetails.extras?.sort()) === 
                           JSON.stringify(activePizza.orderDetails.extras?.sort());
        const sameWithout = JSON.stringify(item.orderDetails.without?.sort()) === 
                            JSON.stringify(activePizza.orderDetails.without?.sort());
        
        return sameId && sameSize && sameExtras && sameWithout;
    });

    if (existingIndex !== -1) {
        // Gefunden! Wir erhöhen einfach die Anzahl des bestehenden Eintrags
        orderCart[existingIndex].orderDetails.quantity += 1;
    } else {
        // Nicht gefunden: Als neue, eigene Zeile hinzufügen
        activePizza.orderDetails.quantity = 1;
        orderCart.push(activePizza);
    }

    // Aufräumen
    activePizza = null;
    renderCart();
    // Falls offen, Modal schließen (z.B. closeModal())
}