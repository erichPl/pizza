     let items = [];
        let standardCart = {}; 
        let pizzaCart = [];    
        let currentPizzaIdx = null;


	const i18n = {
		de: {tisch: "TISCH", aendern: "ÄNDERN", ohne: "OHNE", extra: "EXTRA", gesamt: "Gesamtsumme", bestellen: "JETZT BESTELLEN", anpassen: "Anpassen", abbrechen: "ABBRECHEN", fertig: "SPEICHERN & FERTIG", weg: "weg" },
		it: {tisch: "TAVOLO", aendern: "MODIFICA", ohne: "SENZA", extra: "EXTRA", gesamt: "Totale", bestellen: "ORDINA ORA", anpassen: "Modifica", abbrechen: "ANNULLA", fertig: "SALVA & CHIUDI", weg: "togli" }
	};


      async function init() {
		const params = new URLSearchParams(window.location.search);
		document.getElementById('tisch-view').innerText = "Tisch " + (params.get('tisch') || "Unbekannt");
		
		try {
			// Wir rufen jetzt die Daten von deinem Node-Server ab
			// Das 'v=' + Date.now() hilft gegen Browser-Caching
			const res = await fetch('/api/order-menu?v=' + Date.now());
			
			if (!res.ok) throw new Error("Server antwortet nicht korrekt");

			const data = await res.json(); 
			
			// Dein Filter bleibt logisch gleich, arbeitet jetzt aber mit den MongoDB-Daten
			items = data.filter(item => {
				// Wir prüfen, ob 'view' existiert und 'b' (für Bar/Bestellen) enthält
				return item.view && item.view.toLowerCase().split(',').map(s => s.trim()).includes('b');
			});
alert("init");
			renderMenu();
			console.log("Speisekarte erfolgreich geladen und gefiltert.");
		} catch (e) { 
			console.error(e);
			document.getElementById('menu').innerText = "Fehler beim Laden der Speisekarte."; 
		}
	}

		let currentLang = localStorage.getItem('selectedLang') || 'de';

		function setLanguage(lang) {
			currentLang = lang;
			localStorage.setItem('selectedLang', lang);
			
			// 1. Das Sprachpaket für diese Funktion definieren (Wichtig!)
			const txt = i18n[lang] || i18n.de;
			
			
			// --- Tischanzeige übersetzen ---
			const params = new URLSearchParams(window.location.search);
			const tischNr = params.get('tisch') || "?";
			const tischElement = document.getElementById('tisch-view');
			if (tischElement) {
				tischElement.innerText = txt.tisch + " " + tischNr;
			}
			
			
			// 2. Die Flaggen-Optik anpassen
			document.getElementById('lang-de').style.opacity = (lang === 'de' ? '1' : '0.4');
			document.getElementById('lang-it').style.opacity = (lang === 'it' ? '1' : '0.4');

			// 3. Die Buttons im Modal-Footer übersetzen (über ihre IDs)
			const btnSave = document.getElementById('btn-save');
			const btnCancel = document.getElementById('btn-cancel');
			
			if (btnSave) btnSave.innerText = txt.fertig;
			if (btnCancel) btnCancel.innerText = txt.abbrechen;

			// 4. Den Rest der Seite neu zeichnen
			renderMenu();
			updateUI();
		}




		function getCountForProduct(index, category) {
			if (category.includes("PIZZA")) {
				// Zähle alle Einträge in pizzaCart, die von diesem Produkt stammen
				return pizzaCart.filter(p => p.parentIdx === index).length;
			} else {
				// Bei Getränken einfach den Wert aus dem standardCart nehmen
				return standardCart[index] || 0;
			}
		}


		function getTotalPizzaCount(index) {
			// 1. Normale Pizzen zählen
			let count = cart[index] || 0;
			
			// 2. Alle Spezial-Versionen (customCart) dazuaddieren, die zu dieser Pizza gehören
			Object.keys(customCart).forEach(cIdx => {
				if (customOrders[cIdx].parentIndex === index) {
					count += (customCart[cIdx] || 0);
				}
			});
			return count;
		}

function renderMenu() {
    const menuDiv = document.getElementById('menu');
    let html = "";
    let currentCat = "";

    items.forEach((item, index) => {
        const displayName = (currentLang === 'it' && item.name_it) ? item.name_it : item.name;
        const displayDesc = (currentLang === 'it' && item.desc_it) ? item.desc_it : item.desc;

        // NEUE LOGIK: Preis nur anzeigen, wenn hidePrice NICHT aktiv ist 
        // UND ein Preis eingetragen wurde
        const showPrice = !item.hidePrice && item.price && item.price !== "";
        const preisDisplay = showPrice ? `${item.price} €` : "";

        if (item.type === 'header') {
            currentCat = item.name.toUpperCase();
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #444; margin-top:20px;">
                    <h2>${displayName}</h2>
                    <span style="color:#ffcc00; font-weight:bold; font-size:1.1rem;">${preisDisplay}</span>
                </div>`;
            return;
        }

        const isExtra = currentCat.includes("EXTRAS") || currentCat.includes("ZUTATEN");
        const count = getCountForProduct(index, currentCat);

        html += `
        <div class="item">
            <div class="info">
                <strong>${displayName}</strong>
                <span class="desc">${displayDesc}</span>
                <span class="preis" id="price-${index}">${preisDisplay}</span>
            </div>
            <div class="controls">
                ${!isExtra ? `
                    <div style="display: flex; align-items: center; gap: 12px; background: #2a2a2a; padding: 5px 10px; border-radius: 10px;">
                        <button onclick="removeItem(${index}, '${currentCat}')" 
                                style="width:30px; height:30px; background:#444; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">-</button>
                        
                        <span id="qty-${index}" style="min-width:20px; text-align:center; font-weight:bold; color:#ffcc00;">
                            ${count}
                        </span>
                        
                        <button onclick="addItem(${index}, '${currentCat}')" 
                                style="width:30px; height:30px; background:#007bff; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">+</button>
                    </div>
                ` : ''}
            </div>
        </div>`;
    });
    menuDiv.innerHTML = html;
}




function renderMenu__() {
    const menuDiv = document.getElementById('menu');
    let html = "";
    let currentCat = "";

    items.forEach((item, index) => {
        if (item.type === 'header') {
            currentCat = item.name.toUpperCase();
            html += `<h2>${item.name}</h2>`;
            return;
        }

        const isExtra = currentCat.includes("EXTRAS") || currentCat.includes("ZUTATEN");
        const count = getCountForProduct(index, currentCat);


		const cat = currentCat.toUpperCase();
		//const isPizzaType = cat.includes("PIZZA") || cat.includes("KINDERPIZZA");
        html += `
        <div class="item">
            <div class="info">
                <strong>${item.name}</strong>
                <span class="desc">${item.desc}</span>
                <span class="preis">${item.price} €</span>
            </div>
            <div class="controls">
                ${!isExtra ? `
                    <div style="display: flex; align-items: center; gap: 12px; background: #2a2a2a; padding: 5px 10px; border-radius: 10px;">
                        <!-- MINUS: Verringert die Menge -->
                        <button onclick="removeItem(${index}, '${currentCat}')" 
                                style="width:30px; height:30px; background:#444; color:white; border:none; border-radius:5px; cursor:pointer;">-</button>
                        
                        <!-- ZAHL: Aktuelle Menge -->
                        <span id="qty-${index}" style="min-width:20px; text-align:center; font-weight:bold; color:#ffcc00;">
                            ${count}
                        </span>
                        
                        <!-- PLUS: Fügt neues Item hinzu -->
                        <button onclick="addItem(${index}, '${currentCat}')" 
                                style="width:30px; height:30px; background:#007bff; color:white; border:none; border-radius:5px; cursor:pointer;">+</button>
                    </div>
                ` : ''}
            </div>
        </div>`;
    });
    menuDiv.innerHTML = html;
}

        function renderMenu__() {
			const menuDiv = document.getElementById('menu');
			let html = "";
			let aktuelleKategorie = "";

			items.forEach((item, index) => {
				// FALL 1: Es ist eine Überschrift
				if (item.type === 'header') {
					aktuelleKategorie = item.name.toUpperCase();
					html += `<h2>${item.name}</h2>`;
					return; // Keine Buttons für Überschriften
				}

				// FALL 2: Es ist ein Produkt
				const isExtra = aktuelleKategorie.includes("EXTRAS") || aktuelleKategorie.includes("ZUTATEN");

				html += `
				<div class="item">
					<div class="info">
						<strong>${item.name}</strong>
						<span class="desc">${item.desc}</span>
						<span class="preis">${item.price} €</span>
					</div>
					<div class="controls">
						 ${!isExtra ? `
							<div style="display: flex; align-items: center; gap: 10px; background: #222; padding: 5px; border-radius: 8px;">
								<!-- Minus Button -->
								<button class="btn-minus" onclick="changeQty(${index}, -1)" 
										style="width:30px; height:30px; border-radius:5px; border:none; background:#444; color:white; cursor:pointer;">-</button>
								
								<!-- Mengen Anzeige -->
								<span id="qty-${index}" style="min-width: 20px; text-align: center; font-weight: bold; color: #ffcc00;">
									${displayQty}
								</span>
								
								<!-- Plus Button -->
								<button class="btn-plus" onclick="addItem(${index}, '${aktuelleKategorie}')" 
										style="width:30px; height:30px; border-radius:5px; border:none; background:#007bff; color:white; cursor:pointer;">+</button>
							</div>
						` : ''}
					</div>
				</div>`;
			});
			menuDiv.innerHTML = html;
		}
		
		function changeQty(index, delta) {
			if (delta < 0) {
				// Logik für Minus
				if (cart[index] && cart[index] > 0) {
					cart[index] -= 1;
				} else {
					// Wenn keine normale Pizza mehr da ist, suche die letzte Spezial-Pizza dieses Typs
					for (let i = customOrders.length - 1; i >= 0; i--) {
						if (customOrders[i].parentIndex === index && customCart[i] > 0) {
							customCart[i] -= 1;
							break;
						}
					}
				}
			}
			updateUI();
			renderMenu(); // Menü neu zeichnen, um die Zahlen zu aktualisieren
		}
		

function addItem(index, category) {
    const item = items[index];
    const cat = category.toUpperCase();
    const isPizza = cat.includes("PIZZA") || cat.includes("KINDERPIZZA");
    
    // SICHERHEIT: Preis in String umwandeln, falls er vom Server als Zahl kommt
    const priceStr = String(item.price);
    const hasVariants = priceStr.includes('/');

    if (isPizza || hasVariants) {
        // Falls Cocktail mit Varianten
        if (hasVariants && !isPizza) {
            openVariantModal(index, category); // Dies öffnet das Fenster
        } else {
            // Normale Pizza-Logik
            pizzaCart.push({
                parentIdx: index,
                name: item.name,
                basePrice: parseFloat(priceStr.replace(',', '.')) || 0,
                extras: [], removals: [], extraPrice: 0, kategorie: category
            });
            updateUI();
        }
    } else {
        // Standard-Getränk ohne Varianten
        standardCart[index] = (standardCart[index] || 0) + 1;
        updateUI();
    }
    renderMenu();
}



function removeItem(index, category) {
    if (category.includes("PIZZA") || category.includes("KINDERPIZZA")) {
        // Suche die letzte Pizza dieses Typs im pizzaCart und entferne sie
        for (let i = pizzaCart.length - 1; i >= 0; i--) {
            if (pizzaCart[i].parentIdx === index) {
                pizzaCart.splice(i, 1);
                break;
            }
        }
    } else {
        // Bei Getränken einfach die Zahl im standardCart senken
        if (standardCart[index] > 0) {
            standardCart[index]--;
            if (standardCart[index] === 0) delete standardCart[index];
        }
    }
    updateUI(); // Warenkorb unten aktualisieren
    renderMenu(); // Zahlen oben in der Liste aktualisieren
}


function updateUI() {
    const listDiv = document.getElementById('cart-items-list');
    const totalDiv = document.getElementById('cart-total');
    const bar = document.getElementById('cart-bar');
    const lang = i18n[currentLang] || i18n.de; // Aktuelle Sprache laden

    let html = "";
    let total = 0;

     // --- Den Text des Bestell-Buttons ändern ---
    const orderBtn = document.getElementById('btn-send');
    if (orderBtn) {
        orderBtn.innerText = lang.bestellen;
    }


    pizzaCart.forEach((p, idx) => {
        // 1. Namen übersetzen (Falls IT gewählt und vorhanden)
        const pOriginal = items[p.parentIdx];
        const displayName = (currentLang === 'it' && pOriginal.name_it) ? pOriginal.name_it : p.name;

        // 2. Extras sortieren & übersetzen
        const sortedExtras = [...p.extras].sort((a, b) => a.price - b.price);
        const extraStrings = sortedExtras.map(e => {
            // Wir suchen den Namen des Extras in der Sprache des Gastes
            const extraOriginal = items.find(item => item.name === e.name);
            const displayExtraName = (currentLang === 'it' && extraOriginal?.name_it) ? extraOriginal.name_it : e.name;

            if (e.price < 0) {
                return `<span style="color: #2ecc71;">${displayExtraName}</span>`; 
            } else {
                return `<span style="color: #2ecc71;">+ ${displayExtraName}</span>`; 
            }
        });

        const extraHTML = extraStrings.length > 0 ? 
            `<span class="extra-badge">${extraStrings.join(', ')}</span>` : '';

        total += p.basePrice + p.extraPrice;

        html += `
        <div class="cart-row">
            <div class="cart-header">
                <div style="flex-grow: 1;">
                    <strong>1x ${displayName}</strong>
                    <button class="btn-edit" onclick="openCombinedModal(${idx})">✎ ${lang.aendern}</button>
                </div>
                <button class="btn-del-square" onclick="removePizza(${idx})">✕</button>
            </div>
            ${extraHTML}
            ${p.removals.length > 0 ? `<span class="remove-badge">${lang.ohne}: ${p.removals.join(', ')}</span>` : ''}
        </div>`;
    });

    Object.keys(standardCart).forEach(id => {
        const qty = standardCart[id];
        const price = parseFloat(items[id].price.replace(',', '.')) || 0;
        total += qty * price;
        
        // Name des Getränks übersetzen
        const drinkName = (currentLang === 'it' && items[id].name_it) ? items[id].name_it : items[id].name;

        html += `<div class="cart-row" style="border-left-color:#007bff; display:flex; justify-content:space-between; align-items:center;">
            <span><strong>${qty}x ${drinkName}</strong></span>
            <div>
                <button onclick="changeStdQty(${id}, -1)" style="width:35px; height:35px; background:#444; color:white; border:none; border-radius:5px;">-</button>
                <button onclick="changeStdQty(${id}, 1)" style="width:35px; height:35px; background:#007bff; color:white; border:none; border-radius:5px; margin-left:8px;">+</button>
            </div>
        </div>`;
    });

    bar.style.display = total > 0 ? 'block' : 'none';
    listDiv.innerHTML = html;
    //totalDiv.innerText = `${lang.gesamt}: ${total.toFixed(2).replace('.', ',')} €`;
}



        function updateUI__() {
            const listDiv = document.getElementById('cart-items-list');
            const totalDiv = document.getElementById('cart-total');
            const bar = document.getElementById('cart-bar');
            let html = "";
            let total = 0;

            pizzaCart.forEach((p, idx) => {
    // 1. Extras sortieren: Negative Preise nach vorne (z.B. -1.50 vor +2.00)
    // WICHTIG: Funktioniert nur, wenn p.extras Objekte mit {name, price} sind!
    const sortedExtras = [...p.extras].sort((a, b) => a.price - b.price);

    // 2. Text zusammenbauen mit Logik für das Plus-Zeichen
    const extraStrings = sortedExtras.map(e => {
        if (e.price < 0) {
            // Negativ (z.B. Kleine Pizza) -> Ohne Plus
            return `<span style="color: #2ecc71;">${e.name}</span>`; 
        } else {
            // Positiv -> Mit Plus
            return `<span style="color: #2ecc71;">+ ${e.name}</span>`; 
        }
    });

    const extraHTML = extraStrings.length > 0 ? 
        `<span class="extra-badge">${extraStrings.join(', ')}</span>` : '';

    total += p.basePrice + p.extraPrice;

   // Innerhalb der pizzaCart.forEach Schleife in updateUI:
html += `
<div class="cart-row">
    <div class="cart-header">
        <div style="flex-grow: 1;">
            <strong>1x ${p.name}</strong>
            <button class="btn-edit" onclick="openCombinedModal(${idx})">✎ ÄNDERN</button>
        </div>
        <button class="btn-del-square" onclick="removePizza(${idx})">✕</button>
    </div>
    ${extraHTML}
    ${p.removals.length > 0 ? `<span class="remove-badge">OHNE: ${p.removals.join(', ')}</span>` : ''}
</div>`;
   
   
   
});


            Object.keys(standardCart).forEach(id => {
                const qty = standardCart[id];
                const price = parseFloat(items[id].price.replace(',', '.')) || 0;
                total += qty * price;
                html += `<div class="cart-row" style="border-left-color:#007bff; display:flex; justify-content:space-between; align-items:center;">
                    <span><strong>${qty}x ${items[id].name}</strong></span>
                    <div>
                        <button onclick="changeStdQty(${id}, -1)" style="width:35px; height:35px; background:#444; color:white; border:none; border-radius:5px;">-</button>
                        <button onclick="changeStdQty(${id}, 1)" style="width:35px; height:35px; background:#007bff; color:white; border:none; border-radius:5px; margin-left:8px;">+</button>
                    </div>
                </div>`;
            });

            bar.style.display = total > 0 ? 'block' : 'none';
            listDiv.innerHTML = html;
            //totalDiv.innerText = `Gesamtsumme: ${total.toFixed(2).replace('.', ',')} €`;
        }

        function removePizza(idx) { pizzaCart.splice(idx, 1); updateUI(); }
        function changeStdQty(id, delta) { standardCart[id] += delta; if(standardCart[id]<=0) delete standardCart[id]; updateUI(); }

        function openModal(idx, mode) {
            currentPizzaIdx = idx;
            const pizza = pizzaCart[idx];
			const istKinderpizza = pizza.kategorie.toUpperCase().includes("KINDERPIZZA");
            const modal = document.getElementById('modal');
            const list = document.getElementById('modal-list');
            modal.style.display = 'block';
            list.innerHTML = "";

            if (mode === 'remove') {
                document.getElementById('modal-title').innerText = "Zutat abbestellen";
                const ingredients = items[pizza.parentIdx].desc.split(',').map(s => s.trim());
                ingredients.forEach(ing => {
                    const isRemoved = pizza.removals.includes(ing);
                    list.innerHTML += `<button onclick="toggleRemove('${ing}')" style="display:block; width:100%; padding:12px; margin:8px 0; background:${isRemoved ? '#ff8800' : '#444'}; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">
                        ${ing} ${isRemoved ? '✓ (entfernt)' : ''}
                    </button>`;
                });
            } else {
                document.getElementById('modal-title').innerText = "Extra hinzufügen";
                let isExtra = false;
                items.forEach(item => {
                    if (item.type === 'header') isExtra = item.name.toUpperCase().includes("EXTRAS") || item.name.toUpperCase().includes("ZUTATEN");
                    if (isExtra && item.type === 'product') {
					
					    // FILTER: Wenn Kinderpizza, dann keine negativen Preise anzeigen
                        const pNum = parseFloat(item.price.replace(',', '.')) || 0;
						
						
						// Logik für das Vorzeichen: Nur ein "+" wenn der Preis positiv ist
						const vorzeichen = (pNum >= 0) ? "+" : "";
						
						if (istKinderpizza && pNum < 0) return; 
				
                        list.innerHTML += `<button onclick="addExtra('${item.name}', '${item.price}')" style="display:block; width:100%; padding:12px; margin:8px 0; background:#333; color:white; border:none; border-radius:8px; text-align:left; cursor:pointer; font-weight:bold;">
                            ${item.name} (${vorzeichen}${item.price} €)
                        </button>`;
                    }
                });
            }
        }
		
	
let pizzaBackup = null; // Zwischenspeicher für "Abbrechen"

function openCombinedModal(idx) {
    currentPizzaIdx = idx;
    const pizza = pizzaCart[idx];
    const pOriginal = items[pizza.parentIdx];
    
    // SICHERHEIT: Preis in Text umwandeln für den Check
    const priceStr = String(pOriginal.price);
    const hasVariants = priceStr.includes('/');
    const isPizza = pizza.kategorie.toUpperCase().includes("PIZZA") || 
                    pizza.kategorie.toUpperCase().includes("KINDERPIZZA");

    const modal = document.getElementById('modal');
    
    if (hasVariants && !isPizza) {
        // Es ist ein Cocktail/Getränk mit Größen -> Größen-Fenster öffnen
        modal.style.display = 'block';
        openVariantChangeModal(idx);
    } else {
        // Es ist eine Pizza -> Normales Zutaten-Fenster öffnen
        // Backup für "Abbrechen" erstellen
        pizzaBackup = JSON.parse(JSON.stringify(pizzaCart[idx])); 
        modal.style.display = 'block';
        renderModalContent();
    }
}


function openVariantChangeModal(idx) {
    const p = pizzaCart[idx];
    const item = items[p.parentIdx];
    const list = document.getElementById('modal-list');
    const footer = document.getElementById('modal-footer');

    if (footer) footer.style.display = 'none';

    const descText = (currentLang === 'it' && item.desc_it) ? item.desc_it : item.desc;
    const namen = descText.split('/');
    const preise = String(item.price).split('/');
    
    document.getElementById('modal-title').innerText = (currentLang === 'it' ? "Modifica: " : "Ändern: ") + item.name;
    list.innerHTML = "";

    namen.forEach((name, i) => {
        const pNum = parseFloat(preise[i].replace(',', '.')) || 0;
        const isActive = p.name.includes(name);

        list.innerHTML += `
            <button class="modal-btn ${isActive ? 'active-add' : ''}" 
                    onclick="updateVariantInCart(${idx}, '${name}', ${pNum})">
                ${name} (${pNum.toFixed(2).replace('.', ',')} €) ${isActive ? ' ✓' : ''}
            </button>`;
    });
}


function updateVariantInCart(idx, newName, newPrice) {
    const p = pizzaCart[idx];
    const item = items[p.parentIdx];
    // Namen aktualisieren: Name des Produkts + neue Größe
    p.name = item.name + " (" + newName + ")";
    p.basePrice = newPrice;
    
    closeModal(); // Schließt das Fenster und speichert
    updateUI();
}

function updateVariantInCart(idx, newVariantName, newPrice) {
    const p = pizzaCart[idx];
    const item = items[p.parentIdx];
    
    // Daten im Warenkorb aktualisieren
    p.name = item.name + " (" + newVariantName + ")";
    p.basePrice = newPrice;
    
    closeModal();
    updateUI();
}




// Diese Funktion wird aufgerufen, wenn man RECHTS auf ABBRECHEN klickt
function cancelModal() {
    if (pizzaBackup) {
        pizzaCart[currentPizzaIdx] = pizzaBackup; // Alten Zustand wiederherstellen
        updateUI();
    }
    closeModal();
}

function renderModalContent__() {
    const list = document.getElementById('modal-list');
    const pizza = pizzaCart[currentPizzaIdx];
    const istKinder = pizza.kategorie.toUpperCase().includes("KINDERPIZZA");
    list.innerHTML = "";

    // ... (Deine Sektionen 1 bis 3 bleiben exakt gleich) ...

    // Das Finale mit den zwei Buttons nebeneinander:
    list.innerHTML += `
        <div style="display:flex; gap:10px; margin-top:25px;">
            <!-- SPEICHERN & FERTIG (Links, grün, groß) -->
            <button onclick="closeModal()" 
                style="flex:2; padding:15px; background:#00ca4e; color:white; border:none; border-radius:8px; font-weight:bold; font-size:1rem; cursor:pointer;">
                SPEICHERN & FERTIG
            </button>
            
            <!-- ABBRECHEN (Rechts, grau, schmaler) -->
            <button onclick="cancelModal()" 
                style="flex:1; padding:15px; background:#444; color:#ccc; border:none; border-radius:8px; font-weight:bold; font-size:0.9rem; cursor:pointer;">
                ABBRECHEN
            </button>
        </div>`;
}

	
		
		
	//let pizzaBackup = null; // Zwischenspeicher für "Abbrechen"

function renderModalContent() {
    const list = document.getElementById('modal-list');
    const pizza = pizzaCart[currentPizzaIdx];
    const pOriginal = items[pizza.parentIdx];
    const istKinder = pizza.kategorie.toUpperCase().includes("KINDERPIZZA");
    
    const lang = i18n[currentLang] || i18n.de;
    const isIT = (currentLang === 'it');
    
    const displayNameHeader = (isIT && pOriginal.name_it) ? pOriginal.name_it : pOriginal.name;
    document.getElementById('modal-title').innerText = lang.anpassen + ": " + displayNameHeader;
    
    if(document.getElementById('btn-save')) document.getElementById('btn-save').innerText = lang.fertig;
    if(document.getElementById('btn-cancel')) document.getElementById('btn-cancel').innerText = lang.abbrechen;
	
    list.innerHTML = "";

    // 1. SEKTION: GRÖSSE / TYP (Negative Extras)
    if (!istKinder) {
        const negItems = items.filter(item => (parseFloat(String(item.price)?.replace(',','.')) || 0) < 0);
        if (negItems.length > 0) {
            const titelNeg = isIT ? "MISURA / TIPO" : "GRÖSSE / TYP";
            list.innerHTML += `<div class="modal-section-title">${titelNeg}</div>`;
            negItems.forEach(e => {
                const isActive = pizza.extras.some(ex => ex.name === e.name);
                const displayName = (isIT && e.name_it) ? e.name_it : e.name;
                
                // PREIS-INFO HIER ENTFERNT (nur noch Name und Checkmark)
                list.innerHTML += `
                    <button class="modal-btn ${isActive ? 'active-add' : ''}" onclick="toggleExtra('${e.name}', '${e.price}')">
                        ${displayName} ${isActive ? ' ✓' : ''} 
                    </button>`;
            });
        }
    }

    // 2. SEKTION: OHNE (Abbestellen)
    const titelOhne = isIT ? "COSA TOGLIERE? (SENZA)" : "WAS SOLL WEG? (OHNE)";
    list.innerHTML += `<div class="modal-section-title">${titelOhne}</div>`;
    const descToSplit = (isIT && pOriginal.desc_it) ? pOriginal.desc_it : pOriginal.desc;
    const ingredients = descToSplit.split(',').map(s => s.trim());
    
    ingredients.forEach(ing => {
        const isOff = pizza.removals.includes(ing);
        const wegZusatz = isIT ? "togli" : "weg";
        list.innerHTML += `
            <button class="modal-btn ${isOff ? 'active-remove' : ''}" onclick="toggleRemoveInModal('${ing}')">
                ${ing} ${isOff ? ' ✓ ('+wegZusatz+')' : ' -'}
            </button>`;
    });

    // 3. SEKTION: EXTRAS (Hinzufügen)
    const titelExtra = isIT ? "COSA AGGIUNGERE? (EXTRA)" : "WAS SOLL DAZU? (EXTRAS)";
    list.innerHTML += `<div class="modal-section-title">${titelExtra}</div>`;
    
    let isExtraArea = false;
    items.forEach(item => {
        if (item.type === 'header') isExtraArea = item.name.toUpperCase().includes("EXTRAS");
        if (isExtraArea && item.type === 'product') {
            const pNum = parseFloat(String(item.price).replace(',', '.')) || 0;
            if (pNum >= 0) {
                const isActive = pizza.extras.some(ex => ex.name === item.name);
                const displayName = (isIT && item.name_it) ? item.name_it : item.name;

                // PREIS-INFO BLEIBT ENTFERNT
                list.innerHTML += `
                    <button class="modal-btn ${isActive ? 'active-add' : ''}" 
                            onclick="toggleExtra('${item.name}', '${item.price}')">
                        ${displayName} ${isActive ? ' ✓' : ' +'}
                    </button>`;
            }
        }
    });
	
    const footer = document.getElementById('modal-footer');
    if (footer) footer.style.display = 'flex';
}



// Funktionen, die den Zustand ändern und das Modal NEU ZEICHNEN
function toggleRemoveInModal(ing) {
    const p = pizzaCart[currentPizzaIdx];
    if (p.removals.includes(ing)) p.removals = p.removals.filter(r => r !== ing);
    else p.removals.push(ing);
    renderModalContent(); // Bleibt offen, zeichnet nur neu
    updateUI();
}

function toggleExtra(name, priceStr) {
    const p = pizzaCart[currentPizzaIdx];
    const pNum = parseFloat(priceStr.replace(',', '.')) || 0;
    
    const existIdx = p.extras.findIndex(e => e.name === name);
    if (existIdx > -1) {
        p.extraPrice -= p.extras[existIdx].price;
        p.extras.splice(existIdx, 1);
    } else {
        p.extras.push({ name: name, price: pNum });
        p.extraPrice += pNum;
    }
    renderModalContent(); // Bleibt offen, zeichnet nur neu
    updateUI();
}



       // Funktion für ZUTATEN - (Entfernen)
function toggleRemove(ing) {
    const p = pizzaCart[currentPizzaIdx];
    
    // Zutat hinzufügen (falls noch nicht drin)
    if (!p.removals.includes(ing)) {
        p.removals.push(ing);
    } else {
        // Falls sie schon drin war, wieder rausnehmen (Toggle)
        p.removals = p.removals.filter(r => r !== ing);
    }
    
    updateUI(); 
    closeModal(); // SOFORT SCHLIESSEN
}

// Diese Funktion wird aufgerufen, wenn man RECHTS auf ABBRECHEN klickt
function cancelModal() {
    if (pizzaBackup) {
        pizzaCart[currentPizzaIdx] = pizzaBackup; // Alten Zustand wiederherstellen
        updateUI();
    }
    closeModal();
}


// Funktion für ZUTATEN + (Hinzufügen)
function addExtra(name, priceStr) {
    const p = pizzaCart[currentPizzaIdx];
    const pNum = parseFloat(priceStr.replace(',', '.')) || 0;

    // Wir speichern NAME und PREIS als Objekt für die Sortierung!
    p.extras.push({ name: name, price: pNum });
    
    p.extraPrice += pNum;
    updateUI(); 
    closeModal();
}

        function closeModal() { document.getElementById('modal').style.display = 'none'; }

async function sendOrder() {
    const urlParams = new URLSearchParams(window.location.search);
    const isTestMode = urlParams.get('test') === 'true';
    const tisch = urlParams.get('tisch') || "Unbekannt";

    if (isTestMode) {
	    alert("🛠 Testmodus aktiv: Geolocation wird übersprungen.");
        console.log("🛠 Testmodus aktiv: Geolocation wird übersprungen.");
        // Wir übergeben im Testmodus 0,0 - die Distanz wird dann in executeOrder berechnet
        await executeOrder(tisch, 0, 0); 
        return;
    }

    const infoText = "📍 Zum Schutz vor Fehlbestellungen bitten wir Sie um eine kurze Standort-Bestätigung.\n\nVielen Dank für Ihre Mithilfe!";
    
    if (!confirm(infoText)) {
        alert("Bestellung abgebrochen. Eine Standort-Verifizierung ist für die Sicherheit erforderlich.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            await executeOrder(tisch, lat, lng);
        },
        async (error) => {
            console.warn("Geolocation Fehler:", error.message);
            alert("Standort konnte nicht ermittelt werden. Bitte prüfen Sie Ihre GPS-Einstellungen.");
        },
        { enableHighAccuracy: true, timeout: 8000 }
    );
}

async function executeOrder(tisch, lat, lng) {
    // --- DEINE RESTAURANT DATEN ---
    const RESTAURANT_LAT = 48.12345; // HIER DEINEN WERT EINTRAGEN
    const RESTAURANT_LNG = 11.12345; // HIER DEINEN WERT EINTRAGEN

    let artikelDetails = [];
    let gesamtSumme = 0;
    let berechneteDistanz = null;

    // Distanz berechnen, wenn Koordinaten vorhanden
    // Wir prüfen auf !isTestMode oder ob lat nicht 0 ist, damit der PC-Test nicht "0m" anzeigt
    if (lat !== null && lng !== null && lat !== 0) {
        berechneteDistanz = getDistance(RESTAURANT_LAT, RESTAURANT_LNG, lat, lng);
    } else if (lat === 0) {
        berechneteDistanz = -1; // Kennzeichen für Testmodus in der DB
    }

    // A. PIZZEN verarbeiten
    pizzaCart.forEach(p => {
        let extraText = p.extras.map(e => (e.price < 0 ? e.name : "+ " + e.name)).join(', ');
        let name = `1x ${p.name}`;
        if (p.removals.length > 0) name += ` (OHNE: ${p.removals.join(', ')})`;
        if (extraText) name += ` (${extraText})`;

        const artikelPreis = parseFloat(p.basePrice + p.extraPrice) || 0;
        gesamtSumme += artikelPreis;

        artikelDetails.push({
            artikel: name,
            preis: artikelPreis.toFixed(2).replace('.', ','),
            extras: p.extras, 
            removals: p.removals
        });
    });

    // B. GETRÄNKE / STANDARD-ARTIKEL verarbeiten
    Object.keys(standardCart).forEach(id => {
        const qty = standardCart[id];
        const price = parseFloat(items[id].price.replace(',', '.')) || 0;
        const zeilenPreis = qty * price;
        gesamtSumme += zeilenPreis;

        artikelDetails.push({
            artikel: `${qty}x ${items[id].name}`,
            preis: zeilenPreis.toFixed(2).replace('.', ','),
            kategorie: "GETRÄNKE"
        });
    });

    if (artikelDetails.length === 0) {
        alert("Warenkorb ist leer!");
        return;
    }

	// 1. Wir legen fest, was bei den Koordinaten passieren soll
	let coordsFuerDatenbank;

    // C. Das finale Paket inkl. DISTANZ
    const orderData = {
        tisch: tisch,
        details: artikelDetails,
        coords: {
            lat: lat,
            lng: lng,
            distanz: berechneteDistanz // Wird direkt mitgespeichert!
        },
        gesamtpreis: parseFloat(gesamtSumme.toFixed(2)), 
        zeit: new Date().toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'}),
        status: 'neu'
    };

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if (res.ok) {
            alert("Bestellung abgeschickt! 🍻"); 
            location.reload(); 
        } else {
            alert("Fehler beim Senden. Bitte Personal rufen!");
        }
    } catch (err) {
        console.error("Netzwerkfehler:", err);
        alert("Server nicht erreichbar!");
    }
}
		
		
		
		
		
function openVariantModal(index, category) {
    currentPizzaIdx = null;
    const item = items[index];
    const modal = document.getElementById('modal');
    const footer = document.getElementById('modal-footer'); // Die Button-Leiste unten
    const list = document.getElementById('modal-list');
    
    const descText = (currentLang === 'it' && item.desc_it) ? item.desc_it : item.desc;
    const namen = descText.split('/');
    const preise = String(item.price).split('/');
    
    document.getElementById('modal-title').innerText = item.name;
    list.innerHTML = "";
    
    // Footer ausblenden, da wir sofort beim Klick speichern
    if (footer) footer.style.display = 'none';

    namen.forEach((name, i) => {
        const pNum = parseFloat(preise[i].replace(',', '.')) || 0;
        // Check: Ist es das letzte Element in der Liste?
        const isLast = (i === namen.length - 1);

        list.innerHTML += `
            <button class="modal-btn ${isLast ? 'active-add' : ''}" 
                    onclick="addVariantToCart(${index}, '${name}', ${pNum}, '${category}')">
                ${name} (${pNum.toFixed(2).replace('.', ',')} €) ${isLast ? ' ✓' : ''}
            </button>`;
    });

    modal.style.display = 'block';
}



function addVariantToCart(parentIdx, variantName, price, category) {
    // Wir speichern Cocktails mit Größe im pizzaCart, damit sie gruppiert werden können
    pizzaCart.push({
        parentIdx: parentIdx,
        name: items[parentIdx].name + " (" + variantName + ")",
        basePrice: price,
        extras: [], removals: [], extraPrice: 0, kategorie: category
    });
    closeModal();
    updateUI();
    renderMenu();
}
		
		
function getCountForProduct(index, category) {
	// Zählt alle Einträge im pizzaCart, die denselben parentIdx haben
	let count = pizzaCart.filter(p => p.parentIdx === index).length;

	// Plus die aus dem Standard-Cart (für Getränke ohne Varianten)
	count += (standardCart[index] || 0);

	return count;
}
	


function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Erdradius in Metern
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c); // Ergebnis in ganzen Metern
}

//nicht verwendet, jedoch damit nicht leerer bildschirm falls standort abgelehnt wird
function getStandort() {
    if (!navigator.geolocation) {
        console.log("Browser kann kein GPS");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            // ERFOLG
            window.userCoords = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            };
            console.log("Standort erhalten");
        },
        (err) => {
            // FEHLER (z.B. HTTPS fehlt oder abgelehnt)
            console.warn("Standort-Fehler:", err.message);
            // Wir setzen Standardwerte, damit die App nicht abstürzt
            window.userCoords = { lat: 0, lng: 0, distanz: 0 }; 
        },
        { timeout: 5000 } // Nach 5 Sek. abbrechen
    );
}

function checkDevice__() {
    // Einfacher Check auf mobile Endgeräte
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (!isMobile) {
        // Zeige eine permanente Meldung über die Seite
        document.body.innerHTML = `
            <div style="text-align:center; padding:50px; font-family:sans-serif;">
                <h1>📍 Mobilgerät erforderlich</h1>
                <p>Aus Sicherheitsgründen sind Abhol-Bestellungen nur via Smartphone möglich.</p>
                <p>Bitte scannen Sie den QR-Code vor Ort oder nutzen Sie Ihr Handy.</p>
                <hr>
                <p>Alternativ: <a href="mailto:deine@email.com">Bestellung per E-Mail anfragen</a></p>
            </div>
        `;
        return false;
    }
    return true;
}

function checkDevice___() {
    const urlParams = new URLSearchParams(window.location.search);
    const isTestMode = urlParams.get('test') === 'true';
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Wenn es kein Handy ist UND kein Testmodus aktiv ist -> Sperren
    if (!isMobile && !isTestMode) {
        document.body.innerHTML = `
            <div style="text-align:center; padding:50px; font-family:sans-serif;">
                <h1>📍 Mobilgerät erforderlich</h1>
                <p>Bitte scannen Sie den QR-Code mit Ihrem Smartphone.</p>
            </div>`;
        return false;
    }
    return true;
}


function checkDevice() {
    const urlParams = new URLSearchParams(window.location.search);
    const tisch = urlParams.get('tisch');
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (!isMobile) {
        if (tisch) {
            // FALL: Gast am Tisch, aber nutzt PC
            document.body.innerHTML = `
                <div style="text-align:center; padding:40px; font-family:sans-serif;">
                    <h2>📍 Tisch-Bestellung</h2>
                    <p>Sie haben den QR-Code für <b>Tisch ${tisch}</b> aufgerufen.</p>
                    <p>Bestellungen am Tisch sind aus Sicherheitsgründen <b>nur mit dem Smartphone</b> möglich.</p>
                    <p>Bitte scannen Sie den Code mit Ihrer Handy-Kamera.</p>
                </div>`;
            return false;
        } else {
            // FALL: Abholer am PC
            // Hier blockieren wir nicht komplett, sondern geben nur einen Hinweis
            const info = document.createElement('div');
            info.style = "background:#fff3cd; color:#856404; padding:15px; text-align:center; border-bottom:2px solid #ffeeba;";
            info.innerHTML = "<b>Hinweis für Abholer:</b> Am PC ist am Ende eine E-Mail-Bestätigung erforderlich. Am Handy geht es schneller!";
            document.prepend(info); 
            return true; 
        }
    }
    return true;
}
function enforceMobileAndContext() {
    const urlParams = new URLSearchParams(window.location.search);
    const tisch = urlParams.get('tisch');
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // 1. Sperre für PC
    if (!isMobile) {
        document.body.innerHTML = `
            <div style="text-align:center; padding:50px; font-family:sans-serif; line-height:1.6;">
                <div style="font-size:50px;">📱</div>
                <h2>Bestellung nur per Smartphone</h2>
                <p>Aus Sicherheitsgründen ist unser System nur für Mobilgeräte verfügbar.</p>
                <p><b>Im Restaurant:</b> QR-Code am Tisch scannen.<br>
                <b>Von zu Hause:</b> Seite am Handy aufrufen.</p>
            </div>`;
        return false;
    }

    // 2. Info-Text für Handy-Nutzer (optional)
    if (tisch) {
        console.log("Modus: Tisch-Bestellung (" + tisch + ") - GPS wird beim Senden geprüft.");
    } else {
        console.log("Modus: Abholung zu Hause - Keine GPS-Prüfung nötig.");
    }
    
    return true;
}



	
enforceMobileAndContext();		
init();
		