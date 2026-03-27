  const urlParams = new URLSearchParams(window.location.search);
    const isTestMode = urlParams.get('test') === 'true';
	let items = [];
        let standardCart = {}; 
        let pizzaCart = [];    
        let currentPizzaIdx = null;


	const i18n = {
		de: {tisch: "TISCH", aendern: "ÄNDERN", ohne: "OHNE", extra: "EXTRA", gesamt: "Gesamtbetrag", bestellen: "JETZT BESTELLEN", anpassen: "Anpassen", abbrechen: "ABBRECHEN", fertig: "SPEICHERN & FERTIG", weg: "weg", produkt: "Produkt", produkte: "Produkte",
        korrekturTitel: "Bestellung anpassen",
        korrekturFrage: "Welche Version möchtest du ändern?",
        schliessen: "Schließen"		},
		it: {tisch: "TAVOLO", aendern: "MODIFICA", ohne: "SENZA", extra: "EXTRA", gesamt: "Totale", bestellen: "ORDINA ORA", anpassen: "Modifica", abbrechen: "ANNULLA", fertig: "SALVA & CHIUDI", weg: "togli", produkt: "prodotto", produkte: "prodotti",
		korrekturTitel: "Modifica ordine",
        korrekturFrage: "Quale versione vuoi cambiare?",
        schliessen: "Chiudi"}
	};


      async function init() {
    const params = new URLSearchParams(window.location.search);
	(currentLang === 'it') ? 
	document.getElementById('tisch-view').innerText = "Tisch " + (params.get('tisch') || "/"):
	document.getElementById('tisch-view').innerText = "Tisch " + (params.get('tisch') || "/");
    
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
					<div class="category-header" style="
						margin-top: 5px;     /* Extrem nah am Produkt darüber */
						margin-bottom: 0px;   /* Kein Platz zur Linie hin */
						border-bottom: 1px solid #444;
						padding-bottom: 2px;
					">
					<h2 style="margin:0; padding:0; font-size:1.2rem; color:#ffcc00;">${displayName}</h2>
					<span style="color:#ffcc00; font-weight:bold; font-size:1rem;">${preisDisplay}</span>
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
		

function addItem__(index, category) {
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


function addItem(index, category) {
    const item = items[index];
    const cat = category.toUpperCase();
    const isPizza = cat.includes("PIZZA") || cat.includes("KINDERPIZZA");
    
    const priceStr = String(item.price);
    const hasVariants = priceStr.includes('/');

    // 1. FALL: Es gibt Varianten (z.B. Klein / Groß oder Cocktail-Größen)
    if (hasVariants) {
        // Wir öffnen IMMER das Modal und beenden die Funktion hier mit return!
        openVariantModal(index, category);
        return; 
    }

    // 2. FALL: Es ist eine normale Pizza ohne Varianten (direkt in den Korb)
    if (isPizza) {
        pizzaCart.push({
            parentIdx: index,
            name: item.name,
            size: "", // Keine Variante gewählt
            basePrice: parseFloat(priceStr.replace(',', '.')) || 0,
            extras: [], 
            removals: [], 
            extraPrice: 0, 
            kategorie: category
        });
    } 
    // 3. FALL: Es ist ein Standard-Getränk (z.B. Cola ohne Varianten)
    else {
        standardCart[index] = (standardCart[index] || 0) + 1;
    }

    updateUI();
    renderMenu();
}


function removeItem_(index, category) {
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


function removeItem(index, category) {
    const cat = category.toUpperCase();
    if (cat.includes("PIZZA") || cat.includes("KINDERPIZZA")) {
        // Alle Pizzen finden, die zu diesem Index gehören
        const passendePizzen = pizzaCart.filter(p => p.parentIdx === index);

        if (passendePizzen.length === 0) return; // Nichts zu tun

        // Prüfen, ob alle diese Pizzen identisch sind
        const erstePizza = JSON.stringify({s: passendePizzen[0].size, e: passendePizzen[0].extras, r: passendePizzen[0].removals});
        const alleGleich = passendePizzen.every(p => 
            JSON.stringify({s: p.size, e: p.extras, r: p.removals}) === erstePizza
        );

        if (alleGleich) {
            // Einfach die letzte gefundene Pizza dieses Typs löschen
            for (let i = pizzaCart.length - 1; i >= 0; i--) {
                if (pizzaCart[i].parentIdx === index) {
                    pizzaCart.splice(i, 1);
                    break;
                }
            }
            updateUI();
            renderMenu();
        } else {
            // Es gibt Unterschiede -> Auswahl-Fenster öffnen
            openCorrectionModal(index);
        }
    } else {
        // Standard-Logik für Getränke
        if (standardCart[index] > 0) {
            standardCart[index]--;
            if (standardCart[index] === 0) delete standardCart[index];
        }
        updateUI();
        renderMenu();
    }
}

function openCombinedModal(idx) {
    currentPizzaIdx = idx; // Wichtig für die Referenz
    const p = pizzaCart[idx];
    const pOriginal = items[p.parentIdx];
    const lang = i18n[currentLang] || i18n.de;

    // 1. IDENTISCHE PRODUKTE ZÄHLEN (für den Hinweis)
    const extrasKey = p.extras.map(e => e.name).sort().join(",");
    const removalsKey = p.removals.sort().join(",");
    const identische = pizzaCart.filter(item => 
        item.parentIdx === p.parentIdx && 
        (item.size || "") === (p.size || "") && 
        item.extras.map(e => e.name).sort().join(",") === extrasKey &&
        item.removals.sort().join(",") === removalsKey
    ).length;

    // 2. HINWEIS-HTML GENERIEREN
    let hinweisHtml = "";
    if (identische > 1) {
        const text = currentLang === 'it' 
            ? `Stai modificando <strong>uno</strong> di ${identische} prodotti identici.` 
            : `Du änderst gerade <strong>eines</strong> von ${identische} identischen Produkten.`;
            
        hinweisHtml = `
            <div id="edit-notice" style="background: #332b00; color: #ffcc00; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 0.85rem; border: 1px solid #554400; text-align: center;">
                ℹ️ ${text}
            </div>`;
    }

    // 3. ENTSCHEIDUNG: WELCHES MODAL ÖFFNEN?
    const priceStr = String(pOriginal.price);
    const hasVariants = priceStr.includes('/');
    const isPizza = p.kategorie.toUpperCase().includes("PIZZA") || 
                    p.kategorie.toUpperCase().includes("KINDERPIZZA");

    const modal = document.getElementById('modal');
    modal.style.display = 'block';

    if (hasVariants && !isPizza) {
        // Fall A: Cocktail/Getränk mit Größen (0.2l / 0.4l)
        openVariantChangeModal(idx);
        
        // Hinweis nachträglich oben einfügen, falls vorhanden
        if (hinweisHtml) {
            const list = document.getElementById('modal-list');
            list.insertAdjacentHTML('afterbegin', hinweisHtml);
        }
    } else {
        // Fall B: Pizza oder Produkt mit Zutaten-Checkliste
        pizzaBackup = JSON.parse(JSON.stringify(pizzaCart[idx])); 
        
        // Den Inhalt zeichnen
        renderModalContent();

        // Hinweis oben einfügen
        if (hinweisHtml) {
            const list = document.getElementById('modal-list');
            list.insertAdjacentHTML('afterbegin', hinweisHtml);
        }
    }
}


function openCombinedModal11(idx) {
    const p = pizzaCart[idx];
    const pOriginal = items[p.parentIdx];
    
    // Zähle, wie viele IDENTISCHE Produkte gerade im Warenkorb sind
    const extrasKey = p.extras.map(e => e.name).sort().join(",");
    const removalsKey = p.removals.sort().join(",");
    const identische = pizzaCart.filter(item => 
        item.parentIdx === p.parentIdx && 
        item.size === p.size && 
        item.extras.map(e => e.name).sort().join(",") === extrasKey &&
        item.removals.sort().join(",") === removalsKey
    ).length;

    let hinweisHtml = "";
    if (identische > 1) {
        hinweisHtml = `
            <div style="background: #332b00; color: #ffcc00; padding: 8px; border-radius: 5px; margin-bottom: 15px; font-size: 0.85rem; border: 1px solid #554400; text-align: center;">
                ℹ️ Du änderst gerade <strong>eines</strong> von ${identische} identischen Produkten.
            </div>`;
    }

    // Füge hinweisHtml oben in dein Modal-HTML ein
    const modalContent = document.getElementById('modal-list');
    modalContent.innerHTML = hinweisHtml + restlicherContent;
    
    document.getElementById('modal').style.display = 'block';
}


function openCorrectionModal4(parentIndex) {
      alert("openCorrectionModal");
	const lang = i18n[currentLang] || i18n.de;
    const item = items[parentIndex];
    const itemName = (currentLang === 'it' && item.name_it) ? item.name_it : item.name;

	

    // Wir gruppieren die vorhandenen Pizzen im Warenkorb nach ihrer Konfiguration
    let varianten = {};
    
	// Zähle, wie viele verschiedene Varianten (Gruppen) es gibt
	const anzahlVarianten = Object.keys(varianten).length;
	
	// 4. Den Text-Baustein festlegen
    const zeigeFrage = anzahlVarianten > 1 
        ? `<p style="text-align:center; font-size:0.9rem; color:#bbb; margin-bottom:20px;">${lang.korrekturFrage}</p>` 
        : `<div style="margin-bottom:20px;"></div>`;
	
    pizzaCart.forEach((p, originalIdx) => {
        if (p.parentIdx === parentIndex) {
            // Erstelle einen Schlüssel für die Variante
            const key = JSON.stringify({s: p.size, e: p.extras, r: p.removals});
            if (!varianten[key]) {
                varianten[key] = { 
                    data: p, 
                    count: 1, 
                    indices: [originalIdx] // Wir merken uns die echten Indizes im pizzaCart
                };
            } else {
                varianten[key].count++;
                varianten[key].indices.push(originalIdx);
            }
        }
    });

    let modalHtml = `
        <div id="correction-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:2000; display:flex; align-items:center; justify-content:center; font-family:sans-serif;">
            <div style="background:#1a1a1a; width:95%; max-width:450px; padding:20px; border-radius:12px; border:2px solid #ffcc00; color:white;">
                <h3 style="color:#ffcc00; margin:0 0 10px 0; text-align:center;">${lang.korrekturTitel}</h3>               
				<p style="text-align:center; font-size:0.9rem; color:#bbb; margin-bottom:20px;">${zeigeFrage}</p>				               
                <div style="max-height:60vh; overflow-y:auto; padding-right:5px;">
    `;

    Object.values(varianten).forEach(v => {
        const p = v.data;
        const extrasText = p.extras.length > 0 ? `<br><small style="color:#2ecc71;">+ ${p.extras.map(e => e.name).join(', ')}</small>` : "";
        const removalText = p.removals.length > 0 ? `<br><small style="color:#e74c3c;">${lang.ohne}: ${p.removals.join(', ')}</small>` : "";
        const groesseText = p.size ? ` (${p.size})` : "";

        modalHtml += `
            <div style="background:#2a2a2a; margin-bottom:10px; padding:12px; border-radius:8px; display:flex; align-items:center; justify-content:space-between;">
                <div style="flex-grow:1; padding-right:10px; font-size:0.95rem;">
                    <strong>${itemName}${groesseText}</strong>
                    ${extrasText}${removalText}
                </div>
                
                <div style="display:flex; align-items:center; gap:12px;">
                    <button onclick="executeModalRemove(${v.indices[v.indices.length-1]}, ${parentIndex})" 
                            style="width:35px; height:35px; background:#444; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">-</button>
                    
                    <span style="font-weight:bold; color:#ffcc00; min-width:20px; text-align:center;">${v.count}</span>
                    
                    <button onclick="executeModalAdd(${v.indices[0]}, ${parentIndex})" 
                            style="width:35px; height:35px; background:#007bff; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">+</button>
                </div>
            </div>
        `;
    });

    modalHtml += `
                </div>
                <button onclick="closeCorrection()" style="width:100%; margin-top:20px; padding:12px; background:#ffcc00; color:black; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">${lang.schliessen}</button>
            </div>
        </div>
    `;

    // Altes Modal entfernen, falls vorhanden
    closeCorrection();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Hilfsfunktionen für die Buttons im Modal
function executeModalRemove(cartIdx, parentIdx) {
    pizzaCart.splice(cartIdx, 1);
    finishUpdate(parentIdx);
}

function executeModalAdd(sampleIdx, parentIdx) {
    // Kopiert die Pizza an sampleIdx (inkl. aller Extras/Größen)
    const neuePizza = JSON.parse(JSON.stringify(pizzaCart[sampleIdx]));
    pizzaCart.push(neuePizza);
    finishUpdate(parentIdx);
}

function finishUpdate(parentIdx) {
    updateUI();
    renderMenu();
    // Wenn noch Pizzen dieses Typs da sind, Modal aktualisieren, sonst schließen
    const nochDa = pizzaCart.some(p => p.parentIdx === parentIdx);
    if (nochDa) {
        openCorrectionModal(parentIdx); // Modal neu zeichnen mit neuen Werten
    } else {
        closeCorrection();
    }
}

function closeCorrection() {
    const m = document.getElementById('correction-modal');
    if (m) m.remove();
}


//let wurdeGeladen = false; // Diese Variable überlebt den Funktionsaufruf

function updateUI() {
	//loadCart();
	
	/*
	// 1. NUR BEIM ERSTEN AUFRUF LADEN
    if (!wurdeGeladen) {
        const savedPizza = localStorage.getItem('meinWarenkorb_Pizza');
        const savedStd = localStorage.getItem('meinWarenkorb_Standard');
        
        if (savedPizza) pizzaCart = JSON.parse(savedPizza);
        if (savedStd) standardCart = JSON.parse(savedStd);
        
        wurdeGeladen = true; // Jetzt ist für immer "wahr", bis die Seite neu lädt
        console.log("Daten einmalig aus dem Speicher geholt.");
    }
	**/
	
    const listDiv = document.getElementById('cart-items-list');
    const bar = document.getElementById('cart-bar');
    const lang = i18n[currentLang] || i18n.de;

    if (!listDiv || !bar) return;

    let total = 0;
    let absoluteProduktAnzahl = 0;
    let gruppen = {}; 
    let vorschauGruppen = {}; 

    // --- 1. DATEN VERARBEITEN (PIZZEN & GERICHTE) ---
    pizzaCart.forEach((p, originalIdx) => {
        total += p.basePrice + p.extraPrice;
        absoluteProduktAnzahl++;

        const pOriginal = items[p.parentIdx];
        const nameNormal = (currentLang === 'it' && pOriginal.name_it) ? pOriginal.name_it : pOriginal.name;

        // Für Quick-Summary (nur Name zählen)
        vorschauGruppen[nameNormal] = (vorschauGruppen[nameNormal] || 0) + 1;

        // Für Detail-Liste (Gruppierung nach Konfiguration)
        const extrasKey = p.extras.map(e => e.name).sort().join(",");
        const removalsKey = p.removals.sort().join(",");
        const groupKey = `${p.parentIdx}|${p.size || ''}|${extrasKey}|${removalsKey}`;

        if (!gruppen[groupKey]) {
            gruppen[groupKey] = {
                name: (currentLang === 'it' && pOriginal.name_it) ? pOriginal.name_it : p.name,
                qty: 1,
                size: p.size,
                parentIdx: p.parentIdx,
                extras: p.extras,
                removals: p.removals,
                sampleIdx: originalIdx
            };
        } else {
            gruppen[groupKey].qty += 1;
        }
    });

    // --- 2. GETRÄNKE VERARBEITEN ---
    let drinkHtml = "";
    Object.keys(standardCart).forEach(id => {
        const qty = standardCart[id];
        if (qty <= 0) return;
        
        const pOriginal = items[id];
        const drinkName = (currentLang === 'it' && pOriginal.name_it) ? pOriginal.name_it : pOriginal.name;
        const price = parseFloat(pOriginal.price.replace(',', '.')) || 0;
        
        total += qty * price;
        absoluteProduktAnzahl += qty;
        
        // Getränke zur Summary hinzufügen
        vorschauGruppen[drinkName] = (vorschauGruppen[drinkName] || 0) + qty;

        drinkHtml += `
        <div class="cart-row" style="border-left: 4px solid #007bff; padding: 10px; background: #2a2a2a; margin-bottom: 8px; border-radius: 8px; display:flex; justify-content:space-between; align-items:center;">
            <span><strong>${qty}x ${drinkName}</strong></span>
            <div style="display: flex; gap: 4px; background: #1a1a1a; padding: 2px; border-radius: 6px;">
                <button onclick="changeStdQty(${id}, -1)" style="width:34px; height:34px; background:#444; color:white; border:none; border-radius:4px; font-weight:bold;">–</button>
                <button onclick="changeStdQty(${id}, 1)" style="width:34px; height:34px; background:#007bff; color:white; border:none; border-radius:4px; font-weight:bold;">+</button>
            </div>
        </div>`;
    });

    // --- 3. HTML GENERIEREN ---
    
    // A. Summary HTML (Sticky oben)
    let summaryHtml = "";
    if (absoluteProduktAnzahl > 0) {
        const vorschauTexte = Object.entries(vorschauGruppen).map(([name, qty]) => `${qty}x ${name}`);
        summaryHtml = `
            <div id="quick-summary" style="position: sticky; top: 0; background: #1a1a1a; border-bottom: 4px solid #ffcc00; padding: 10px; z-index: 1000; color: #ffcc00; font-size: 0.85rem; line-height: 1.4; word-wrap: break-word; box-shadow: 0 4px 10px rgba(0,0,0,0.3); margin-bottom: 10px;">
                <strong>(${absoluteProduktAnzahl})</strong> ${vorschauTexte.join(", ")}
            </div>`;
    }

    // B. Pizza-Details HTML
    let pizzaDetailHtml = "";
    Object.values(gruppen).forEach(g => {
        const extraStrings = g.extras.map(e => {
            const extraOriginal = items.find(item => item.name === e.name);
            const dName = (currentLang === 'it' && extraOriginal?.name_it) ? extraOriginal.name_it : e.name;
            return `<span style="color: #2ecc71;">+ ${dName}</span>`;
        });

        pizzaDetailHtml += `
        <div class="cart-row" style="margin-bottom: 8px; border-left: 4px solid #ffcc00; padding: 10px; background: #2a2a2a; border-radius: 8px;">
            <div style="display:flex; justify-content:space-between; align-items: center;">
                <div style="flex-grow:1;">
                    <strong>${g.qty}x ${g.name} ${g.size ? '('+g.size+')' : ''}</strong>
                    <div style="font-size: 0.82rem; margin-top: 4px;">
                        ${extraStrings.length > 0 ? `<div>${extraStrings.join(', ')}</div>` : ''}
                        ${g.removals.length > 0 ? `<div style="color:#ff4444;">${lang.ohne}: ${g.removals.join(', ')}</div>` : ''}
                    </div>
                    <button onclick="openCombinedModal(${g.sampleIdx})" style="margin-top:8px; padding: 4px 12px; background:#444; color:white; border:none; border-radius:4px; font-size:0.75rem; cursor:pointer;">✎ ${lang.aendern}</button>
                </div>
                <div style="display: flex; align-items: center; gap: 4px; background: #1a1a1a; padding: 2px; border-radius: 6px;">
                    <button onclick="changeGroupQty('${g.parentIdx}', '${(g.size||"").replace(/'/g,"\\'")}', '${g.extras.map(e=>e.name).join(",")}', '${g.removals.join(",")}', -1)" 
                            style="width:34px; height:34px; background:#444; color:white; border:none; border-radius:4px; font-weight:bold;">–</button>
                    <button onclick="changeGroupQty('${g.parentIdx}', '${(g.size||"").replace(/'/g,"\\'")}', '${g.extras.map(e=>e.name).join(",")}', '${g.removals.join(",")}', 1)" 
                            style="width:34px; height:34px; background:#007bff; color:white; border:none; border-radius:4px; font-weight:bold;">+</button>
                </div>
            </div>
        </div>`;
    });

    // --- 4. ANZEIGEN ---
    bar.style.display = absoluteProduktAnzahl > 0 ? 'block' : 'none';
    listDiv.innerHTML = summaryHtml + pizzaDetailHtml + drinkHtml;

    const orderBtn = document.getElementById('btn-send');
    if (orderBtn) orderBtn.innerText = `${lang.bestellen}`;
    
    if (typeof renderMenu === "function") renderMenu();
	saveCart();
	
}

function saveCart() {
    localStorage.setItem('meinWarenkorb_Pizza', JSON.stringify(pizzaCart));
    localStorage.setItem('meinWarenkorb_Standard', JSON.stringify(standardCart));
}



function changeGroupQty(parentIdx, size, extrasStr, removalsStr, change) {
    parentIdx = parseInt(parentIdx);
    
    if (change === 1) {
        // Finden wir ein Beispiel-Objekt dieser Gruppe zum Klonen
        const sample = pizzaCart.find(p => 
            p.parentIdx === parentIdx && 
            (p.size || "") === size && 
            p.extras.map(e => e.name).join(",") === extrasStr && 
            p.removals.join(",") === removalsStr
        );
        if (sample) {
            pizzaCart.push(JSON.parse(JSON.stringify(sample)));
        }
    } else {
        // Finden wir den letzten Index dieser Gruppe zum Löschen
        for (let i = pizzaCart.length - 1; i >= 0; i--) {
            const p = pizzaCart[i];
            if (p.parentIdx === parentIdx && 
                (p.size || "") === size && 
                p.extras.map(e => e.name).join(",") === extrasStr && 
                p.removals.join(",") === removalsStr) {
                pizzaCart.splice(i, 1);
                break;
            }
        }
    }
    updateUI();
}



function getGroupedCartForOrder() {
    let groupedOrder = [];
    let tempGroups = {};

    pizzaCart.forEach(p => {
        // Der identische "Fingerabdruck" wie in der updateUI
        const extrasKey = p.extras.map(e => e.name).sort().join(",");
        const removalsKey = p.removals.sort().join(",");
        const groupKey = `${p.parentIdx}|${p.size || ''}|${extrasKey}|${removalsKey}`;

        if (!tempGroups[groupKey]) {
            tempGroups[groupKey] = {
                name: p.name,
                qty: 1,
                size: p.size,
                extras: p.extras,
                removals: p.removals,
                priceSingle: (p.basePrice + p.extraPrice)
            };
        } else {
            tempGroups[groupKey].qty += 1;
        }
    });

    return Object.values(tempGroups);
}


function generateOrderSummary() {
    const groupedItems = getGroupedCartForOrder();
    let orderText = "";

    groupedItems.forEach(item => {
        const extras = item.extras.map(e => `+${e.name}`).join(", ");
        const ohne = item.removals.length > 0 ? ` (ohne ${item.removals.join(", ")})` : "";
        
        // Format: "2x Pizza Salami (Groß) +Extra Käse (ohne Zwiebeln)"
        orderText += `${item.qty}x ${item.name}${item.size ? ' ('+item.size+')' : ''} ${extras}${ohne}\n`;
    });

    // Jetzt noch die Standard-Produkte (Getränke) dazu
    Object.keys(standardCart).forEach(id => {
        if (standardCart[id] > 0) {
            orderText += `${standardCart[id]}x ${items[id].name}\n`;
        }
    });

    return orderText;
}


function updateUI4() {
    const listDiv = document.getElementById('cart-items-list');
    const bar = document.getElementById('cart-bar');
    const lang = i18n[currentLang] || i18n.de;

    let total = 0;
    let absoluteProduktAnzahl = 0;
    let cartHtml = "";

    // 1. PIZZEN / KONFIGURIERBARE PRODUKTE (Einzeln auflisten)
    pizzaCart.forEach((p, idx) => {
        absoluteProduktAnzahl++;
        const preisFuerDieseEins = p.basePrice + p.extraPrice;
        total += preisFuerDieseEins;

        const pOriginal = items[p.parentIdx];
        const displayName = (currentLang === 'it' && pOriginal.name_it) ? pOriginal.name_it : p.name;
        
        const extraStrings = p.extras.map(e => {
            const extraOriginal = items.find(item => item.name === e.name);
            const displayExtraName = (currentLang === 'it' && extraOriginal?.name_it) ? extraOriginal.name_it : e.name;
            return `<span style="color: #2ecc71;">+ ${displayExtraName}</span>`;
        });

        cartHtml += `
        <div class="cart-row" style="margin-bottom: 8px; border-left: 4px solid #ffcc00; padding: 10px; background: #2a2a2a; border-radius: 8px;">
            <div style="display:flex; justify-content:space-between; align-items: flex-start;">
                <div style="flex-grow:1;">
                    <strong style="font-size: 1rem;">1x ${displayName} ${p.size ? '('+p.size+')' : ''}</strong>
                    <div style="font-size: 0.85rem; margin-top: 4px;">
                        ${extraStrings.length > 0 ? `<div>${extraStrings.join(', ')}</div>` : ''}
                        ${p.removals.length > 0 ? `<div style="color:#ff4444;">${lang.ohne}: ${p.removals.join(', ')}</div>` : ''}
                    </div>
                    <button onclick="openCombinedModal(${idx})" style="margin-top:8px; padding: 5px 12px; background:#444; color:white; border:none; border-radius:4px; font-size:0.8rem; cursor:pointer;">✎ ${lang.aendern}</button>
                </div>
                
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button onclick="changePizzaQty(${idx}, -1)" style="width:32px; height:32px; background:#444; color:white; border:none; border-radius:5px; font-weight:bold;">-</button>
                    <span style="min-width: 15px; text-align: center; font-weight: bold; color: #ffcc00;">1</span>
                    <button onclick="changePizzaQty(${idx}, 1)" style="width:32px; height:32px; background:#007bff; color:white; border:none; border-radius:5px; font-weight:bold;">+</button>
                </div>
            </div>
        </div>`;
    });

    // 2. GETRÄNKE / STANDARDPRODUKTE
    Object.keys(standardCart).forEach(id => {
        const qty = standardCart[id];
        if (qty <= 0) return;
        
        const drinkName = (currentLang === 'it' && items[id].name_it) ? items[id].name_it : items[id].name;
        const price = parseFloat(items[id].price.replace(',', '.')) || 0;
        
        total += qty * price;
        absoluteProduktAnzahl += qty;

        cartHtml += `
        <div class="cart-row" style="border-left: 4px solid #007bff; padding: 10px; background: #2a2a2a; margin-bottom: 8px; border-radius: 8px; display:flex; justify-content:space-between; align-items:center;">
            <span><strong>${qty}x ${drinkName}</strong></span>
            <div style="display: flex; gap: 8px;">
                <button onclick="changeStdQty(${id}, -1)" style="width:32px; height:32px; background:#444; color:white; border:none; border-radius:5px;">-</button>
                <button onclick="changeStdQty(${id}, 1)" style="width:32px; height:32px; background:#007bff; color:white; border:none; border-radius:5px;">+</button>
            </div>
        </div>`;
    });

    bar.style.display = total > 0 ? 'block' : 'none';
    listDiv.innerHTML = cartHtml; // Nur noch die Liste, kein Summary-Header mehr nötig

    const orderBtn = document.getElementById('btn-send');
    if (orderBtn) orderBtn.innerText = `${lang.bestellen} (${total.toFixed(2).replace('.', ',')} €)`;

    // Menü-Counter aktualisieren
    if (typeof renderMenu === "function") renderMenu();
}



function updateUI3() {
    const listDiv = document.getElementById('cart-items-list');
    const bar = document.getElementById('cart-bar');
    const lang = i18n[currentLang] || i18n.de;

    let total = 0;
    let gruppen = {}; 
    let absoluteProduktAnzahl = 0;

    // 1. PIZZEN GRUPPIEREN
    pizzaCart.forEach((p, idx) => {
        absoluteProduktAnzahl++;
        total += p.basePrice + p.extraPrice;

        const pOriginal = items[p.parentIdx];
        const displayName = (currentLang === 'it' && pOriginal.name_it) ? pOriginal.name_it : p.name;
        
        // Eindeutiger Schlüssel für identische Konfiguration
        const extrasKey = p.extras.map(e => e.name).sort().join(",");
        const removalsKey = p.removals.sort().join(",");
        const groupKey = `${p.parentIdx}|${p.size || ''}|${extrasKey}|${removalsKey}`;

		// In deiner updateUI() innerhalb von pizzaCart.forEach:

		// WICHTIG: Der Schlüssel braucht p.parentIdx UND p.size
		// Wenn p.size nicht da ist (normale Pizza), nutzen wir 'standard'
		//const groupKey = `${p.parentIdx}|${p.size || 'standard'}|${extrasKey}|${removalsKey}`;

		if (!gruppen[groupKey]) {
			gruppen[groupKey] = { 
				name: displayName, 
				qty: 1, 
				size: p.size, // Hier merken wir uns "0,2l" oder "Groß"
				parentIdx: p.parentIdx,
				extras: p.extras,
				removals: p.removals,
				firstIdx: idx // Referenz zum Löschen
			};
		} else {
			gruppen[groupKey].qty += 1;
		}
    });

    // 2. GETRÄNKE GRUPPIEREN (direkt in detailHtml einbauen)
    let drinkHtml = "";
    Object.keys(standardCart).forEach(id => {
        const qty = standardCart[id];
        const drinkName = (currentLang === 'it' && items[id].name_it) ? items[id].name_it : items[id].name;
        const price = parseFloat(items[id].price.replace(',', '.')) || 0;
        
        total += qty * price;
        absoluteProduktAnzahl += qty;

        drinkHtml += `
        <div class="cart-row" style="border-left: 4px solid #007bff; padding: 2px; background: #2a2a2a; margin-bottom: 5px; border-radius: 5px; display:flex; justify-content:space-between; align-items:center;">
            <span><strong>${qty}x ${drinkName}</strong></span>
            <div style="display: flex; gap: 8px;">
                <button onclick="changeStdQty(${id}, -1)" style="width:35px; height:35px; background:#444; color:white; border:none; border-radius:5px;">-</button>
                <button onclick="changeStdQty(${id}, 1)" style="width:35px; height:35px; background:#007bff; color:white; border:none; border-radius:5px;">+</button>
            </div>
        </div>`;
    });

    // 3. HTML GENERIEREN
    let summaryHtml = "";
    let pizzaDetailHtml = "";
    const gruppenArray = Object.values(gruppen);

    if (gruppenArray.length > 0 || absoluteProduktAnzahl > 0) {
        // Vorschau-Zeile (Fließtext)
        const vorschauTexte = gruppenArray.map(g => `${g.qty}x ${g.name}${g.size ? ' ('+g.size+')' : ''}`);
        // Getränke zur Vorschau hinzufügen
        Object.keys(standardCart).forEach(id => {
            const drinkName = (currentLang === 'it' && items[id].name_it) ? items[id].name_it : items[id].name;
            vorschauTexte.push(`${standardCart[id]}x ${drinkName}`);
        });

        summaryHtml = `
            <div id="quick-summary" style="position: sticky; top: 0; background: #1a1a1a; border-bottom: 6px solid #ffcc00; padding: 6px; z-index: 1000; color: #ffcc00; font-size: 0.95rem; line-height: 1.2; word-wrap: break-word; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                <strong>(${absoluteProduktAnzahl})</strong> ${vorschauTexte.join(", ")}
            </div>`;

        // Detaillierte Pizza-Liste (Gruppiert)
        gruppenArray.forEach(g => {
            const extraStrings = g.extras.map(e => {
                const extraOriginal = items.find(item => item.name === e.name);
                const displayExtraName = (currentLang === 'it' && extraOriginal?.name_it) ? extraOriginal.name_it : e.name;
                return `<span style="color: #2ecc71;">+ ${displayExtraName}</span>`;
            });

            pizzaDetailHtml += `
            <div class="cart-row" style="margin-bottom: 5px; border-left: 4px solid #ffcc00; padding: 2px; background: #2a2a2a; border-radius: 5px;">
                <div style="display:flex; justify-content:space-between; align-items: center;">
                    <div style="flex-grow:1;">
                        <strong>${g.qty}x ${g.name} ${g.size ? '('+g.size+')' : ''}</strong>
                        <button onclick="openSelectionModal(${g.parentIdx})" style="margin-left:8px; padding: 4px 10px; background:#444; color:white; border:none; border-radius:3px; font-size:0.8rem;">✎ ${lang.aendern}</button>
                    </div>
                    <button class="btn-del-square" onclick="removePizza(${g.firstIdx})" >✕</button>
                </div>
                <div style="font-size: 0.85rem; margin-top: 5px;">
                    ${extraStrings.length > 0 ? `<div>${extraStrings.join(', ')}</div>` : ''}
                    ${g.removals.length > 0 ? `<div style="color:#ff4444;">${lang.ohne}: ${g.removals.join(', ')}</div>` : ''}
                </div>
            </div>`;
        });
    }

    bar.style.display = total > 0 ? 'block' : 'none';
    listDiv.innerHTML = summaryHtml + pizzaDetailHtml + drinkHtml;

    // NEU: Menü aktualisieren, damit die Counter-Badges stimmen
    if (typeof renderMenu === "function") {
        renderMenu();
    }


    const orderBtn = document.getElementById('btn-send');
    if (orderBtn) orderBtn.innerText = lang.bestellen;
}

function changePizzaQty(idx, change) {
    if (change === 1) {
        // Produkt kopieren (Clonen) und neu hinzufügen
        const neueKopie = JSON.parse(JSON.stringify(pizzaCart[idx]));
        pizzaCart.push(neueKopie);
    } else {
        // Produkt entfernen
        pizzaCart.splice(idx, 1);
    }
    updateUI();
}


function openSelectionModal(parentIndex) {
    const lang = i18n[currentLang] || i18n.de;
    const item = items[parentIndex];
    const itemName = (currentLang === 'it' && item.name_it) ? item.name_it : item.name;

    // 1. Zähle, wie viele Exemplare dieses Produkts im Warenkorb sind
    // Wir filtern den pizzaCart und merken uns die echten Indizes
    const passendeProdukte = [];
    pizzaCart.forEach((p, idx) => {
        if (p.parentIdx === parentIndex) {
            passendeProdukte.push(idx);
        }
    });

    // --- NEU: LOGIK ZUM ÜBERSPRÜNGEN ---
    if (passendeProdukte.length === 0) return; // Nichts im Warenkorb

    if (passendeProdukte.length === 1) {
        console.log("Nur ein Produkt gefunden, springe direkt zum CombinedModal...");
        // Öffne direkt das Bearbeitungsfenster für dieses eine Produkt
        openCombinedModal(passendeProdukte[0]); 
        return; // Beende hier, damit das Auswahl-Modal nicht erscheint
    }
    // -----------------------------------

    // Ab hier dein bisheriger Code für das Modal (wenn es mehr als 1 gibt)
    let modalHtml = `
        <div id="selection-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:3000; display:flex; align-items:center; justify-content:center;">
            <div style="background:#1a1a1a; width:90%; max-width:450px; padding:20px; border-radius:12px; border:2px solid #ffcc00;">
                <h3 style="color:#ffcc00; text-align:center;">${itemName}</h3>
                <p style="text-align:center; color:#888;">${lang.korrekturFrage}</p>
                <div style="max-height:50vh; overflow-y:auto; padding-right:5px;">
    `;

    pizzaCart.forEach((p, idx) => {
        if (p.parentIdx === parentIndex) {
            const extras = p.extras.map(e => e.name).join(", ");
            const removals = p.removals.join(", ");

            modalHtml += `
                <div style="background:#2a2a2a; padding:12px; margin-bottom:8px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:0.9rem; color:white;">
                        <strong>1x ${itemName} ${p.size ? '('+p.size+')' : ''}</strong>
                        <div style="font-size:0.75rem; color:#aaa;">
                            ${extras ? '+ ' + extras : ''} ${removals ? '| ' + lang.ohne + ' ' + removals : ''}
                        </div>
                    </div>
                    <button onclick="closeSelection(); openCombinedModal(${idx})" 
                            style="background:#007bff; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer;">
                        ${lang.aendern}
                    </button>
                </div>
            `;
        }
    });

    modalHtml += `
                </div>
                <button onclick="closeSelection()" style="width:100%; margin-top:15px; padding:12px; background:#444; color:white; border:none; border-radius:8px; cursor:pointer;">${lang.schliessen}</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}
function closeSelection() {
    const m = document.getElementById('selection-modal');
    if (m) m.remove();
}



function updateUI2() {
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

function openCombinedModal10(idx) {
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


// NUR DIESE EINE VERSION BEHALTEN:
function updateVariantInCart(idx, newVariantName, newPrice) {
    const p = pizzaCart[idx];
    const item = items[p.parentIdx];
    
    // 1. Der Name bleibt SAUBER (nur der Produktname, z.B. "Mosquito")
    p.name = (currentLang === 'it' && item.name_it) ? item.name_it : item.name;
    
    // 2. Die Größe wird im dafür vorgesehenen Feld gespeichert
    p.size = newVariantName; 
    
    // 3. Preis aktualisieren
    p.basePrice = newPrice;
    
    closeModal();
    updateUI();
    renderMenu(); // Menü auch neu zeichnen, falls sich dort Zahlen ändern
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
	//alert("in sendOrder");
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
let isGeolocation=false;
async function executeOrder(tisch, lat, lng) {
	//alert("in executeOrder");
    // --- DEINE RESTAURANT DATEN ---
    const RESTAURANT_LAT = 46.62259; // HIER DEINEN WERT EINTRAGEN
    const RESTAURANT_LNG = 10.69399;; // HIER DEINEN WERT EINTRAGEN

    let artikelDetails = [];
    let gesamtSumme = 0;
    let berechneteDistanz = null;

    if (isGeolocation){
		// Distanz berechnen, wenn Koordinaten vorhanden
		// Wir prüfen auf !isTestMode oder ob lat nicht 0 ist, damit der PC-Test nicht "0m" anzeigt
		if (lat !== null && lng !== null && lat !== 0) {
			berechneteDistanz = getDistance(RESTAURANT_LAT, RESTAURANT_LNG, lat, lng);
		} else if (lat === 0) {
			berechneteDistanz = -1; // Kennzeichen für Testmodus in der DB
		}
	}

    // --- NEU: GRUPPIERUNG FÜR DIE BESTELLUNG ---
    let orderGroups = {};

    // A. PIZZEN / VARIANTEN gruppieren
    pizzaCart.forEach(p => {
        // Gleicher "Fingerabdruck" wie in updateUI
        const extrasKey = p.extras.map(e => e.name).sort().join(",");
        const removalsKey = p.removals.sort().join(",");
        const groupKey = `${p.parentIdx}|${p.size || ''}|${extrasKey}|${removalsKey}`;

        if (!orderGroups[groupKey]) {
            orderGroups[groupKey] = {
                name: p.name,
                size: p.size,
                extras: p.extras,
                removals: p.removals,
                qty: 1,
                basePrice: p.basePrice,
                extraPrice: p.extraPrice
            };
        } else {
            orderGroups[groupKey].qty += 1;
        }
    });

    // Jetzt die gruppierten Pizzen in das finale Format für die Datenbank umwandeln
    Object.values(orderGroups).forEach(g => {
        const preisEinzelticket = (g.basePrice + g.extraPrice);
        const zeilenGesamtPreis = preisEinzelticket * g.qty;
        gesamtSumme += zeilenGesamtPreis;

        let extraText = g.extras.map(e => (e.price < 0 ? e.name : "+ " + e.name)).join(', ');
        
        // Formatiere den Namen für die Anzeige in orders.html
        let displayLine = `${g.qty}x ${g.name}`;
        if (g.size) displayLine += ` (${g.size})`;
        if (g.removals.length > 0) displayLine += ` (OHNE: ${g.removals.join(', ')})`;
        if (extraText) displayLine += ` (${extraText})`;

        artikelDetails.push({
            artikel: displayLine,
            preis: zeilenGesamtPreis.toFixed(2).replace('.', ','), // Preis für die ganze Gruppe
            qty: g.qty // Optional, falls deine orders.html ein extra Feld dafür hat
        });
    });

    // B. GETRÄNKE (bleibt fast gleich, wird aber zur gesamtSumme addiert)
    Object.keys(standardCart).forEach(id => {
        const qty = standardCart[id];
        if (qty > 0) {
            const price = parseFloat(items[id].price.replace(',', '.')) || 0;
            const zeilenPreis = qty * price;
            gesamtSumme += zeilenPreis;

            artikelDetails.push({
                artikel: `${qty}x ${items[id].name}`,
                preis: zeilenPreis.toFixed(2).replace('.', ','),
                kategorie: "GETRÄNKE"
            });
        }
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
            // 1. Arbeitsspeicher (Variablen) sofort leeren
            pizzaCart = [];
            for (let id in standardCart) {
                standardCart[id] = 0;
            }

            // 2. Dauerspeicher (LocalStorage) komplett löschen
            // Das verhindert, dass neue Fenster alte Daten laden!
            localStorage.removeItem('meinWarenkorb_Pizza');
            localStorage.removeItem('meinWarenkorb_Standard');

            // 3. UI & Menü-Zähler aktualisieren
            updateUI();
            if (typeof renderMenu === "function") {
                renderMenu(); 
            }

            alert("Bestellung abgeschickt! 🍻"); 

            // 4. Seite neu laden (Sorgt für einen absolut sauberen Status)
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
    
    const descText = (currentLang === 'it' && item.desc_it) ? item.desc_it : item.desc;
    const namen = descText.split('/');
    const preise = String(item.price).split('/');

    // --- NEU: ÜBERSPRÜNG-LOGIK ---
    if (namen.length === 1) {
        console.log("Nur eine Version vorhanden, füge direkt hinzu...");
        const pNum = parseFloat(preise[0].replace(',', '.')) || 0;
        
        // Wir rufen die Speicher-Funktion direkt auf
        addVariantToCart(index, namen[0], pNum, category);
        
        return; // Funktion hier beenden, Modal wird nicht geöffnet!
    }
    // -----------------------------

    // Ab hier der normale Code für MEHRERE Varianten
    const modal = document.getElementById('modal');
    const footer = document.getElementById('modal-footer');
    const list = document.getElementById('modal-list');
    
    document.getElementById('modal-title').innerText = item.name;
    list.innerHTML = "";
    
    if (footer) footer.style.display = 'none';

    namen.forEach((name, i) => {
        const pNum = parseFloat(preise[i].replace(',', '.')) || 0;
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
    // Wir speichern die Variante sauber im Feld "size"
    pizzaCart.push({
        parentIdx: parentIdx,
        name: items[parentIdx].name, // Nur der reine Name (z.B. "Mojito")
        size: variantName,           // Hier steht "0.2l" oder "Groß"
        basePrice: price,
        extras: [], 
        removals: [], 
        extraPrice: 0, 
        kategorie: category
    });
    
    closeModal(); // oder closeVariantModal()
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
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isTestMode){
		if (!isMobile) {
			// Seite leeren und Sperre anzeigen
			document.body.innerHTML = `
				<div style="text-align:center; padding:50px; font-family:sans-serif;">
					<h1>📱 Nur am Handy</h1>
					<p>Bestellungen sind am PC nicht möglich.</p>
				</div>`;
			
			// GANZ WICHTIG: Wir werfen einen "sanften" Fehler oder stoppen alles
			return false; 
		}
	}
    return true;
}


// Zeigt den Scrollbalken bei Berührung an
document.addEventListener('touchstart', function() {
    document.body.classList.add('is-touching');
});

// Versteckt ihn wieder nach einer kurzen Verzögerung, wenn der Finger weg ist
document.addEventListener('touchend', function() {
    setTimeout(() => {
        document.body.classList.remove('is-touching');
    }, 1000); // Bleibt noch 1 Sekunde sichtbar
});


// 1. Speichern: Ruf das am Ende von updateUI() auf
function saveCart() {
    localStorage.setItem('meinWarenkorb_Pizza', JSON.stringify(pizzaCart));
    localStorage.setItem('meinWarenkorb_Standard', JSON.stringify(standardCart));
}

// 2. Laden: Ruf das ganz am Anfang beim Laden der Seite auf
function loadCart() {
    const savedPizza = localStorage.getItem('meinWarenkorb_Pizza');
    const savedStd = localStorage.getItem('meinWarenkorb_Standard');
    
    if (savedPizza) pizzaCart = JSON.parse(savedPizza);
    if (savedStd) standardCart = JSON.parse(savedStd);
    
    updateUI();
}


// DER AUFRUF GANZ UNTEN IN DEINER DATEI:
const allowed = enforceMobileAndContext();

// NUR wenn allowed TRUE ist, darf der Rest laufen!
if (allowed) {
    init(); // Hier drin wird renderMenu() gerufen
}
		


/*
		Ein weiterer Check: "Event Bubbling"

Manchmal löst ein Klick auf einen Button auch einen Klick auf das Element darunter aus. Wenn du im Warenkorb arbeitest, stelle sicher, dass deine Buttons so definiert sind:
HTML

<button onclick="event.stopPropagation(); changeGroupQty(...)" ...>

Das event.stopPropagation() verhindert, dass der Klick "durchgereicht" wird an andere Funktionen, die vielleicht die Seite beeinflussen könnten.
*/