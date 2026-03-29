  const urlParams = new URLSearchParams(window.location.search);
    const isTestMode = urlParams.get('test') === 'true';
	
	const namePizza="PIZZ";
	
	
	let items = [];
        let standardCart = {}; 
        let pizzaCart = [];    
        let currentPizzaIdx = null;


	const i18n = {
		de: {impressumLink: "/bestelle1/impressumWsDe.html",
        privacyLink: "/bestelle1/datenschutzWsDe.html",
			impressum: "Impressum",
        privacy: "Datenschutz",tisch: "TISCH", aendern: "ÄNDERN", ohne: "OHNE", extra: "EXTRA", gesamt: "Gesamtbetrag", bestellen: "JETZT BESTELLEN", anpassen: "Anpassen", abbrechen: "ABBRECHEN", fertig: "SPEICHERN", weg: "weg", produkt: "Produkt", produkte: "Produkte",
        korrekturTitel: "Bestellung anpassen",
        korrekturFrage: "Welche Version möchtest du ändern?",
        schliessen: "Schließen", impressum: "Impressum",
        privacy: "Datenschutz",address: "Vinschgaustraße 74, 39023 Laas (BZ)",
        region: "Südtirol, Italien",
        vat: "MwSt.-Nr.: 12345678901"		},
		it: {impressumLink: "/bestelle1/impressumWsIt.html",
        privacyLink: "/bestelle1/datenschutzWsIt.html",impressum: "Note Legali",
        privacy: "Privacy",tisch: "TAVOLO", aendern: "MODIFICA", ohne: "SENZA", extra: "EXTRA", gesamt: "Totale", bestellen: "ORDINA ORA", anpassen: "Modifica", abbrechen: "ANNULLA", fertig: "SALVA", weg: "togli", produkt: "prodotto", produkte: "prodotti",
		korrekturTitel: "Modifica ordine",
        korrekturFrage: "Quale versione vuoi cambiare?",
        schliessen: "Chiudi",impressum: "Note legali",
        privacy: "Privacy", address: "Via Venosta 74, 39023 Lasa (BZ)",
        region: "Alto Adige, Italia",
        vat: "P.IVA: 12345678901"}
	};

// Ganz oben in deinem Script (außerhalb der Funktion) definieren:
const specialDescItems = new Set(); 

async function init() {
    const params = new URLSearchParams(window.location.search);
    const tischStr = "Tisch " + (params.get('tisch') || "/");
    document.getElementById('tisch-view').innerText = tischStr;
    
    setLanguage('de');

    try {
        const res = await fetch('/api/order-menu?v=' + Date.now());
        if (!res.ok) throw new Error("Server antwortet nicht korrekt");

        const data = await res.json(); 
        
        // 1. Daten filtern (dein bestehender Code)
        items = data.filter(item => {
            return item.view && item.view.toLowerCase().split(',').map(s => s.trim()).includes('b');
        });

        // --- 2. NEU: SPEZIAL-PRODUKTE ERKENNEN UND REINIGEN ---
        items.forEach((item, index) => {
            let priceStr = String(item.price);
            
            // Wenn der Preis ein "/" enthält
            if (priceStr.includes('/')) {
                const parts = priceStr.split('/').filter(p => p.trim() !== "");
                
                // Nur wenn genau EIN Preis vorhanden ist (z.B. "2,30/")
                if (parts.length === 1) {
                    // ID im Set speichern für addItem()
                    specialDescItems.add(index);
                    
                    // Das "/" aus dem Preis löschen, damit renderMenu() es sauber anzeigt
                    item.price = parts[0]; 
                    
                    // Markierung setzen, falls du später im CSS/Warenkorb darauf prüfen willst
                    item.isAutoDesc = true;
                }
            }
        });
        // --- ENDE NEU ---

        renderMenu();
        console.log("Speisekarte erfolgreich geladen, gefiltert und Spezial-Preise bereinigt.");
    } catch (e) { 
        console.error(e);
        document.getElementById('menu').innerText = "Fehler beim Laden der Speisekarte."; 
    }
}
let currentLang = localStorage.getItem('selectedLang') || 'de';

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('selectedLang', lang);
    
    // 1. Das Sprachpaket definieren
    const txt = i18n[lang] || i18n.de;
    
    // --- Tischnummer für die Links aus der URL holen ---
    const params = new URLSearchParams(window.location.search);
    const tischNr = params.get('tisch') || ""; 

    // 2. Texte UND HREFs der Links anpassen
    const impElem = document.getElementById('link-impressum');
    const privElem = document.getElementById('link-privacy');
    
    if (impElem && privElem) {
        impElem.innerText = txt.impressum;
        privElem.innerText = txt.privacy;

        // WICHTIG: Hier hängen wir den Tisch an die URL an!
        // Beispiel: "impressumWsDe.html?tisch=5"
        const tischSuffix = tischNr ? "?tisch=" + tischNr : "";
        impElem.href = txt.impressumLink + tischSuffix;
        privElem.href = txt.privacyLink + tischSuffix;
    }
    
    // --- Tischanzeige im Header übersetzen ---
    const tischElement = document.getElementById('tisch-view');
    if (tischElement) {
        tischElement.innerText = txt.tisch + " " + (tischNr || "?");
    }
    
    // 3. Die Flaggen-Optik anpassen
    if(document.getElementById('lang-de')) document.getElementById('lang-de').style.opacity = (lang === 'de' ? '1' : '0.4');
    if(document.getElementById('lang-it')) document.getElementById('lang-it').style.opacity = (lang === 'it' ? '1' : '0.4');

    // 4. Modal-Buttons übersetzen
    const btnSave = document.getElementById('btn-modal-done');
    const btnCancel = document.getElementById('btn-cancel');
    if (btnSave) btnSave.innerText = txt.fertig;
    if (btnCancel) btnCancel.innerText = txt.abbrechen;

    // 5. Footer-Texte übersetzen (Adressen etc.)
    if (document.getElementById('footer-address')) document.getElementById('footer-address').innerText = txt.address;
    if (document.getElementById('footer-region')) document.getElementById('footer-region').innerText = txt.region;
    if (document.getElementById('footer-vat')) document.getElementById('footer-vat').innerText = txt.vat;

    // 6. Den Rest der Seite neu zeichnen
    renderMenu();
    updateUI();
}

function getCountForProduct(index, category) {
	if (category.includes(namePizza)) {
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
    const itemName = item.name;
    const priceStr = String(item.price);

    const hasSorts = itemName.includes(',');
    const hasVariants = priceStr.includes('/');




// 1. PRÜFUNG: Ist es eine ID aus unserem Spezial-Set (z.B. "2,30/")?
    if (specialDescItems.has(index)) {
        const desc = (currentLang === 'it' && item.desc_it) ? item.desc_it : item.desc;
        
        // Wir "missbrauchen" den pizzaCart, um die desc in 'size' zu speichern
        pizzaCart.push({
            parentIdx: index,
            name: (currentLang === 'it' && item.name_it) ? item.name_it : item.name,
            size: desc || "", // Hier landet "0,33l" etc.
            basePrice: parseFloat(priceStr.replace(',', '.')) || 0,
            extraPrice: 0,
            extras: [],
            removals: [],
            kategorie: category
        });
if (typeof renderMenu === "function") renderMenu();
        updateUI();
        return; // WICHTIG: Hier abbrechen, damit es NICHT im standardCart landet!
    }

















if (specialDescItems.has(index)) {
    // Logik für direktes Hinzufügen zum pizzaCart inklusive desc...
    // (Wie im vorherigen Schritt besprochen)
}


    // A. FALL: Spezial-Getränk (Sorten/Größen)
    if (hasSorts || hasVariants) {
        openSelectionModal(index, category, -1); 
        return;
    }

    // B. FALL: Pizza -> Sofort anpassen!
    if (category.toUpperCase().includes(namePizza)) {
        // 1. Wir fügen die Pizza als "Entwurf" in den Warenkorb ein
        const neuePizzaIdx = pizzaCart.push({
            parentIdx: index, 
            name: itemName, 
            size: "", 
            basePrice: parseFloat(priceStr.replace(',', '.')) || 0,
            extras: [], 
            removals: [], 
            extraPrice: 0, 
            kategorie: category
        }) - 1; // Wir holen uns den Index des gerade hinzugefügten Elements

        // 2. Wir öffnen sofort das Modal für genau diesen neuen Index
        openCombinedModal(neuePizzaIdx);
    } 
    // C. FALL: Normales Getränk (Cola etc.)
    else {
        standardCart[index] = (standardCart[index] || 0) + 1;
    }

    updateUI();
    renderMenu();
}


function cancelCustomization() {
    // Wenn wir gerade ein neues Item hinzugefügt haben und abbrechen:
    // Prüfen, ob die Pizza noch "leer" ist (keine Extras/Ohne) und wir sie gerade erst erstellt haben
    const p = pizzaCart[currentPizzaIdx];
    if (p && p.extras.length === 0 && p.removals.length === 0) {
        // Optional: Hier könntest du entscheiden, ob die Pizza ganz gelöscht wird
        // pizzaCart.splice(currentPizzaIdx, 1);
    }
    
    document.getElementById('modal').style.display = 'none';
    updateUI();
}

function removeItem(index, category) {
    const cat = category.toUpperCase();
    //if (cat.includes("PIZZA") || cat.includes("KINDERPIZZA")|| cat.includes("PIZZE")) {
    if (cat.includes(namePizza)) {
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
	//alert("openCombined");
    const bar = document.getElementById('cart-bar');
    if (bar) {
        bar.style.display = 'none';
    }
	
	currentPizzaIdx = idx; 
    const p = pizzaCart[idx];
    const pOriginal = items[p.parentIdx];
    const priceStr = String(pOriginal.price);
	
	
	
    // 1. IDENTISCHE PRODUKTE ZÄHLEN (Für den gelben Hinweis-Kasten)
    const extrasKey = p.extras.map(e => e.name).sort().join(",");
    const removalsKey = p.removals.sort().join(",");
    const identische = pizzaCart.filter(item => 
        item.parentIdx === p.parentIdx && 
        (item.size || "") === (p.size || "") && 
        item.extras.map(e => e.name).sort().join(",") === extrasKey &&
        item.removals.sort().join(",") === removalsKey
    ).length;

    let hinweisHtml = "";
    if (identische > 1) {
        const text = currentLang === 'it' 
            ? `Stai modificando <strong>uno</strong> di ${identische} prodotti identici.` 
            : `Du änderst gerade <strong>eines</strong> von ${identische} identischen Produkten.`;
        hinweisHtml = `<div id="edit-notice" style="background: #332b00; color: #ffcc00; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 0.85rem; border: 1px solid #554400; text-align: center;">ℹ️ ${text}</div>`;
    }

    // 2. ENTSCHEIDUNGS-LOGIK (Die "Weiche")
    //const priceStr = String(pOriginal.price);
    const hasVariants = priceStr.includes('/'); // Getränk mit Größen?
    const hasSorts = pOriginal.name.includes(',') || pOriginal.name.includes('/'); // Getränk mit Sorten?
    
    // Prüfen ob es eine Pizza ist (Groß-/Kleinschreibung ignorieren)
    const isPizza = p.kategorie.toUpperCase().includes(namePizza);

    const modal = document.getElementById('modal');
    modal.style.display = 'block';

    // FALL A: Getränk / Produkt mit Auswahl (Sorte oder Größe)
    // Bedingung: Hat Varianten/Sorten UND ist KEINE Pizza
    if ((hasVariants || hasSorts) && !isPizza) {
        
        // Erst das Auswahl-Fenster für Getränke bauen
        openSelectionModal(p.parentIdx, p.kategorie, idx);
        
        // Den gelben Hinweis oben einfügen, falls nötig
        if (hinweisHtml) {
            const list = document.getElementById('modal-list');
            list.insertAdjacentHTML('afterbegin', hinweisHtml);
        }
    } 
    // FALL B: Pizza oder normales Gericht (Extras & Ohne Liste)
    else {
        // Backup erstellen für Abbruch-Funktion
        pizzaBackup = JSON.parse(JSON.stringify(pizzaCart[idx])); 
        
        // Das Pizza-Fenster (Extras/Ohne) bauen
        renderModalContent();

        // Den gelben Hinweis oben einfügen, falls nötig
        if (hinweisHtml) {
            const list = document.getElementById('modal-list');
            list.insertAdjacentHTML('afterbegin', hinweisHtml);
        }
    }
}

function openCombinedModal0(idx) {
    currentPizzaIdx = idx; 
    const p = pizzaCart[idx];
    const pOriginal = items[p.parentIdx];
    const lang = i18n[currentLang] || i18n.de;

    // 1. IDENTISCHE PRODUKTE ZÄHLEN (Dein Code bleibt gleich)
    const extrasKey = p.extras.map(e => e.name).sort().join(",");
    const removalsKey = p.removals.sort().join(",");
    const identische = pizzaCart.filter(item => 
        item.parentIdx === p.parentIdx && 
        (item.size || "") === (p.size || "") && 
        item.extras.map(e => e.name).sort().join(",") === extrasKey &&
        item.removals.sort().join(",") === removalsKey
    ).length;

    let hinweisHtml = "";
    if (identische > 1) {
        const text = currentLang === 'it' 
            ? `Stai modificando <strong>uno</strong> di ${identische} prodotti identici.` 
            : `Du änderst gerade <strong>eines</strong> von ${identische} identischen Produkten.`;
        hinweisHtml = `<div id="edit-notice" style="background: #332b00; color: #ffcc00; padding: 10px; border-radius: 8px; margin-bottom: 15px; font-size: 0.85rem; border: 1px solid #554400; text-align: center;">ℹ️ ${text}</div>`;
    }

    // 2. ENTSCHEIDUNG LOGIK VERBESSERN
    const priceStr = String(pOriginal.price);
    const hasVariants = priceStr.includes('/'); // Hat Größen (0.2/0.4)
    const hasSorts = pOriginal.name.includes(',') || pOriginal.name.includes('/'); // NEU: Hat Sorten (Cola, Fanta)
    
    const isPizza = p.kategorie.toUpperCase().includes(namePizza)
                    

    const modal = document.getElementById('modal');
    modal.style.display = 'block';

    // Wenn es Sorten ODER Größen hat (und keine Pizza ist), öffne das Auswahl-Modal
    if ((hasVariants || hasSorts) && !isPizza) {
        // Wir nutzen hier openSelectionModal, da diese Funktion 
        // bereits die Logik für Sorten-Buttons und Größen-Buttons enthält
        openSelectionModal(p.parentIdx, p.kategorie, idx);
        
        if (hinweisHtml) {
            const list = document.getElementById('modal-list');
            list.insertAdjacentHTML('afterbegin', hinweisHtml);
        }
    } else {
        // Fall B: Pizza oder normales Gericht
        pizzaBackup = JSON.parse(JSON.stringify(pizzaCart[idx])); 
        renderModalContent();

        if (hinweisHtml) {
            const list = document.getElementById('modal-list');
            list.insertAdjacentHTML('afterbegin', hinweisHtml);
        }
    }
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
    const listDiv = document.getElementById('cart-items-list');
    const bar = document.getElementById('cart-bar');
    const openBtn = document.getElementById('cart-trigger'); // Der neue Button
    const badge = document.getElementById('cart-count-badge'); // Die Zahl am Button
    const lang = i18n[currentLang] || i18n.de;

    if (!listDiv || !bar) return;

    let total = 0;
    let absoluteProduktAnzahl = 0;
    let gruppen = {}; 
    let vorschauGruppen = {}; 

    // --- 1. DATEN VERARBEITEN (PIZZEN & SPEZIAL-GETRÄNKE) ---
    pizzaCart.forEach((p, originalIdx) => {
   
		total += p.basePrice + p.extraPrice;
        absoluteProduktAnzahl++;

        const pOriginal = items[p.parentIdx];
        const isDrink = !p.kategorie.toUpperCase().includes(namePizza);
        const displayName = p.name || ((currentLang === 'it' && pOriginal.name_it) ? pOriginal.name_it : pOriginal.name);

        vorschauGruppen[displayName] = (vorschauGruppen[displayName] || 0) + 1;

        const extrasKey = p.extras.map(e => e.name).sort().join(",");
        const removalsKey = p.removals.sort().join(",");
        const groupKey = `${p.parentIdx}|${p.size || ''}|${extrasKey}|${removalsKey}|${displayName}`;

        if (!gruppen[groupKey]) {
            gruppen[groupKey] = {
                name: displayName,
                qty: 1,
                size: p.size,
                parentIdx: p.parentIdx,
                extras: p.extras,
                removals: p.removals,
                sampleIdx: originalIdx,
                isSpecialDrink: isDrink
            };
        } else {
            gruppen[groupKey].qty += 1;
        }
    });

    // --- 2. STANDARD-GETRÄNKE VERARBEITEN ---
    
	let drinkHtml = "";
    Object.keys(standardCart).forEach(id => {	
        const qty = standardCart[id];
        if (qty <= 0) return;
        const pOriginal = items[id];
        const drinkName = (currentLang === 'it' && pOriginal.name_it) ? pOriginal.name_it : pOriginal.name;
        const price = parseFloat(String(pOriginal.price).replace(',', '.')) || 0;
        total += qty * price;
        absoluteProduktAnzahl += qty;
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

    // --- 3. PIZZA & SPEZIAL-DRINK HTML ---
    let pizzaDetailHtml = "";
Object.values(gruppen).forEach(g => {
    // 1. Die einzige Info, die wir noch brauchen: Ist es ein Spezial-Drink?
    const isSpecial = specialDescItems.has(parseInt(g.parentIdx));

    // 2. Ändern-Button: Nur wenn es KEIN Spezial-Drink ist
    const aendernButton = !isSpecial 
        ? `<br><button onclick="openCombinedModal(${g.sampleIdx})" style="margin-top:5px; padding: 2px 8px; background:#444; color:#ffcc00; border:none; border-radius:4px; font-size:0.7rem; cursor:pointer;">✎ ${lang.aendern}</button>` 
        : "";

    if (g.isSpecialDrink) {
        // --- GETRÄNKE LAYOUT ---
        pizzaDetailHtml += `
        <div class="cart-row" style="margin-bottom: 8px; border-left: 4px solid #007bff; padding: 10px; background: #2a2a2a; border-radius: 8px; display:flex; justify-content:space-between; align-items:center;">
            <div style="flex-grow:1;">
                <strong style="color:white;">${g.qty}x ${g.name}</strong> 
                <span style="color:#aaa; font-size:0.85rem;">${g.size ? g.size : ''}</span>
                ${aendernButton}
            </div>
            <div style="display: flex; align-items: center; gap: 4px; background: #1a1a1a; padding: 2px; border-radius: 6px;">
                <button onclick="changeGroupQty('${g.parentIdx}', '${(g.size||"").replace(/'/g,"\\'")}', '${g.extras.map(e=>e.name).join(",")}', '${g.removals.join(",")}', -1)" style="width:34px; height:34px; background:#444; color:white; border:none; border-radius:4px;">–</button>
                <button onclick="changeGroupQty('${g.parentIdx}', '${(g.size||"").replace(/'/g,"\\'")}', '${g.extras.map(e=>e.name).join(",")}', '${g.removals.join(",")}', 1)" style="width:34px; height:34px; background:#007bff; color:white; border:none; border-radius:4px;">+</button>
            </div>
        </div>`;
    } else {
        // ... (hier kommt dein normaler Pizza-Code, dort bleibt der Button meistens drin)
            const extraStrings = g.extras.map(e => `<span style="color: #2ecc71;">+ ${e.name}</span>`);
            pizzaDetailHtml += `
            <div class="cart-row" style="margin-bottom: 8px; border-left: 4px solid #ffcc00; padding: 10px; background: #2a2a2a; border-radius: 8px;">
                <div style="display:flex; justify-content:space-between; align-items: center;">
                    <div style="flex-grow:1;">
                        <strong>${g.qty}x ${g.name} ${g.size ? '('+g.size+')' : ''}</strong>
                        <div style="font-size: 0.82rem; margin-top: 4px;">
                            ${extraStrings.join(', ')}
                            ${g.removals.length > 0 ? `<div style="color:#ff4444;">${lang.ohne}: ${g.removals.join(', ')}</div>` : ''}
                        </div>
                        <button onclick="openCombinedModal(${g.sampleIdx})" style="margin-top:8px; padding: 4px 12px; background:#444; color:white; border:none; border-radius:4px; font-size:0.75rem;">✎ ${lang.aendern}</button>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px; background: #1a1a1a; padding: 2px; border-radius: 6px;">
                        <button onclick="changeGroupQty('${g.parentIdx}', '${(g.size||"").replace(/'/g,"\\'")}', '${g.extras.map(e=>e.name).join(",")}', '${g.removals.join(",")}', -1)" style="width:34px; height:34px; background:#444; color:white; border:none; border-radius:4px;">–</button>
                        <button onclick="changeGroupQty('${g.parentIdx}', '${(g.size||"").replace(/'/g,"\\'")}', '${g.extras.map(e=>e.name).join(",")}', '${g.removals.join(",")}', 1)" style="width:34px; height:34px; background:#007bff; color:white; border:none; border-radius:4px;">+</button>
                    </div>
                </div>
            </div>`;
        }
    });

// --- 4. FINALE STRUKTUR (Neues Design für Schließen-Button) ---
let cartHeader = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:12px;">
        <h2 style="color:#ffcc00; margin:0; font-size:1.1rem; text-transform: uppercase; letter-spacing: 1px;">
            ${lang.warenkorb || 'Warenkorb'}
        </h2>
        
        <div onclick="toggleCart(false)" style="
            cursor: pointer; 
            width: 32px; 
            height: 32px; 
            background: #333; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            margin-right: 10px; /* Schiebt das X weiter nach links */
            transition: background 0.2s;">
            <span style="color: #888; font-size: 1.2rem; line-height: 1; font-family: sans-serif;">✕</span>
        </div>
    </div>
`;

// Wir hängen den Bestell-Button direkt unten an die Liste an
let cartFooter = "";
if (absoluteProduktAnzahl > 0) {
    cartFooter = `
    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #444;">
        <button id="btn-send" class="btn-send" onclick="sendOrder()" 
            style="width:100%; padding: 15px; background: #28a745; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 1.1rem; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
            🚀 ${lang.bestellen || 'JETZT BESTELLEN'}
        </button>
    </div>`;
}

// Sichtbarkeit des Öffnen-Buttons (gelber Kreis oben rechts) steuern
if (openBtn && badge) {
    badge.innerText = absoluteProduktAnzahl;
    openBtn.style.display = (absoluteProduktAnzahl > 0) ? 'flex' : 'none';
}

// Wenn Warenkorb leer ist, Overlay schließen
if (absoluteProduktAnzahl === 0) {
    bar.style.display = 'none';
}

// ALLES zusammenfügen in das listDiv
listDiv.innerHTML = cartHeader + pizzaDetailHtml + drinkHtml + cartFooter;

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


function openSelectionModal(itemIndex, category, cartIdx = -1) {
    const item = items[itemIndex];
    const modal = document.getElementById('modal');
    const list = document.getElementById('modal-list');
    
    document.getElementById('modal-title').innerText = "Auswahl treffen";
    list.innerHTML = "";

    const isEditing = cartIdx > -1;
    const currentItemInCart = isEditing ? pizzaCart[cartIdx] : null;

    window.currentChoice = {
        sorte: isEditing ? currentItemInCart.name : "",
        preis: isEditing ? currentItemInCart.basePrice : 0,
        label: isEditing ? currentItemInCart.size : ""
    };

    let html = "";

// TEIL A: SORTEN
    if (item.name.includes(',') || item.name.includes('/')) {
        html += `<p style="color:#ffcc00; margin-bottom:10px;">Sorte wählen:</p>`;
        
        let sorten = [];
        
        // Spezial-Logik für "Name mit/ohne"
        if (item.name.includes('/') && !item.name.includes(',')) {
            const parts = item.name.split('/');
            const firstPart = parts[0].trim(); // z.B. "Wasser mit"
            const secondPart = parts[1].trim(); // z.B. "ohne"
            
            // Wir nehmen das erste Wort vom ersten Teil als Basis (z.B. "Wasser")
            const baseName = firstPart.split(' ')[0]; 
            
            // Falls der zweite Teil nur ein Wort ist (wie "ohne"), hängen wir den Basisnamen davor
            if (!secondPart.includes(' ')) {
                sorten = [firstPart, `${baseName} ${secondPart}`];
            } else {
                sorten = parts.map(s => s.trim());
            }
        } else {
            // Standard-Verhalten für Komma-Listen
            sorten = item.name.split(/[,/]/).map(s => s.trim());
        }

        html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:15px;">`;
        sorten.forEach((s, i) => {
            // WICHTIG: .trim() beim Vergleich, um Leerzeichen-Fehler zu vermeiden
            const active = s.trim() === window.currentChoice.sorte.trim() ? 'background:#ffcc00; color:black;' : 'background:#333; color:white;';
            html += `<button class="sorte-btn" id="sorte-${i}" onclick="selectSorte(${i}, '${s}')" 
                     style="padding:12px; border:1px solid #555; border-radius:8px; cursor:pointer; ${active}">
                     ${s}
                     </button>`;
        });
        html += `</div>`;
    }

    // TEIL B: GRÖSSEN
    const priceStr = String(item.price);
    if (priceStr.includes('/')) {
        html += `<p style="color:#ffcc00; margin:10px 0;">Größe wählen:</p>`;
        const preise = priceStr.split('/');
        const labels = (item.desc && item.desc.includes('/')) ? item.desc.split('/') : ["0,2l", "0,4l"];
        
        html += `<div style="display:flex; gap:10px; margin-bottom:20px;">`;
        preise.forEach((p, i) => {
            const pNum = parseFloat(p.trim().replace(',', '.')) || 0;
            const lText = labels[i].trim();
            const active = pNum === window.currentChoice.preis ? 'background:#007bff; border-color:#ffcc00;' : 'background:#444; border-color:transparent;';
            html += `<button class="size-btn" id="size-${i}" onclick="selectSize(${i}, ${pNum}, '${lText}')" style="flex:1; padding:15px 5px; color:white; border:2px solid; border-radius:8px; font-weight:bold; cursor:pointer; ${active}">${lText}<br>${p.trim()} €</button>`;
        });
        html += `</div>`;
    }

/*
    // TEIL C: BESTÄTIGEN (Wieder zurück im HTML-String)
    const btnText = isEditing ? "Änderung speichern" : "Hinzufügen ✓";
    html += `<button id="btnConfirmSelection" onclick="confirmSelection(${itemIndex}, '${category}', ${cartIdx})" style="width:100%; padding:15px; background:#28a745; color:white; border:none; border-radius:10px; font-weight:bold; font-size:1.1rem; cursor:pointer; margin-top:20px;">${btnText}</button>`;
*/
    list.innerHTML = html;
    modal.style.display = 'block';
    
    /*
	// WICHTIG: Den Footer-Button (unten) verstecken wir hier, damit er nicht verwirrt
    const footerBtn = document.getElementById('btn-modal-done');
    if (footerBtn) {
        footerBtn.style.display = "none"; 
    }*/
	
	const footerBtn = document.getElementById('btn-modal-done');

	if (footerBtn) {
		// Weg A: Eine bestehende Funktion zuweisen
		//footerBtn.onclick = closeModal; 

		// Weg B: Eine Funktion mit Parametern zuweisen (Wichtig für Getränke!)
		footerBtn.onclick = function() {
			confirmSelection(itemIndex, category, cartIdx);
		};
	}
	
}


// DIESE FUNKTIONEN HABEN GEFEHLT:

function selectSorte(idx, name) {
    // 1. Daten für confirmSelection vorbereiten
    if (!window.currentChoice) window.currentChoice = {};
    window.currentChoice.sorte = name;

    // 2. Optik: Buttons umschalten
    document.querySelectorAll('.sorte-btn').forEach(btn => {
        btn.style.background = "#333";
        btn.style.color = "white";
    });
    const sel = document.getElementById(`sorte-${idx}`);
    if (sel) {
        sel.style.background = "#ffcc00";
        sel.style.color = "black";
    }
}

function selectSize(idx, price, label) {
    // 1. Daten für confirmSelection vorbereiten
    if (!window.currentChoice) window.currentChoice = {};
    window.currentChoice.preis = price;
    window.currentChoice.label = label;

    // 2. Optik: Buttons umschalten
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.style.background = "#444";
        btn.style.borderColor = "transparent";
    });
    const sel = document.getElementById(`size-${idx}`);
    if (sel) {
        sel.style.background = "#007bff";
        sel.style.borderColor = "#ffcc00";
    }
}


function confirmSelection(itemIndex, category, cartIdx) {
    //alert("confirm");
	const item = items[itemIndex];
    if (!item) return;

    // A. SICHERSTELLEN, DASS DER SPEICHER EXISTIERT
    if (!window.currentChoice) {
        window.currentChoice = { sorte: "", preis: 0, label: "" };
    }

    // B. PRÜFUNG: WAS WIRD BENÖTIGT?
    const brauchtSorte = item.name.includes(',') || item.name.includes('/');
    const brauchtGroesse = String(item.price).includes('/');

    // C. ABBRUCH-CHECK (Validierung)
    if (brauchtSorte && !window.currentChoice.sorte) {
        alert("Bitte wählen Sie eine Sorte!");
        return;
    }
    if (brauchtGroesse && (!window.currentChoice.preis || window.currentChoice.preis === 0)) {
        alert("Bitte wählen Sie eine Größe!");
        return;
    }

    // D. DATEN FIXIEREN
    const finalName = brauchtSorte ? window.currentChoice.sorte : item.name;
    const finalPrice = brauchtGroesse ? window.currentChoice.preis : parseFloat(String(item.price).replace(',', '.'));
    const finalSize = window.currentChoice.label || "";

    // E. OBJEKT ERSTELLEN
    const cartObj = {
        parentIdx: itemIndex,
        name: finalName,
        size: finalSize,
        basePrice: finalPrice,
        extraPrice: 0,
        extras: [],
        removals: [],
        kategorie: category
    };

    // F. IN DEN WARENKORB SCHREIBEN
    if (cartIdx > -1) {
        pizzaCart[cartIdx] = cartObj; // Ändern
    } else {
        pizzaCart.push(cartObj); // Neu hinzufügen
    }

    // G. RESET & CLOSE
    window.currentChoice = { sorte: "", preis: 0, label: "" };
    closeModal();
    updateUI();
    if (typeof renderMenu === "function") renderMenu();
	
	//wieder zurücksetzen für Pizza
	//footerBtn.onclick = closeModal; 
}

function closeSelection() {
    const m = document.getElementById('selection-modal');
    if (m) m.remove();
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

	
		
	//let pizzaBackup = null; // Zwischenspeicher für "Abbrechen"

function renderModalContent() {
    const list = document.getElementById('modal-list');
    const pizza = pizzaCart[currentPizzaIdx]; 
    if (!pizza) return;

    const pOriginal = items[pizza.parentIdx];

    // --- NEUE LOGIK: ÜBERSCHRIFT FINDEN ---
    let aktuelleKategorie = "";
    // Wir gehen in der Original-Liste vom Produkt aus nach oben
    for (let i = pizza.parentIdx; i >= 0; i--) {
        if (items[i].type === 'header') {
            aktuelleKategorie = items[i].name.toUpperCase();
            break; // Erste Überschrift gefunden -> Stopp
        }
    }

    // Jetzt prüfen wir, ob in der Überschrift "KINDER" vorkommt
    const istKinder = aktuelleKategorie.includes("KINDER");
    
    const lang = i18n[currentLang] || i18n.de;
    const isIT = (currentLang === 'it');
    
    // Titel im Modal-Kopf setzen
    const displayNameHeader = (isIT && pOriginal.name_it) ? pOriginal.name_it : pOriginal.name;
    document.getElementById('modal-title').innerText = lang.anpassen + ": " + displayNameHeader;
    
    // Wir sammeln alles in der Variable 'html'
    let html = "";

    // 1. SEKTION: GRÖSSE / TYP (Negative Extras wie "Klein")
    if (!istKinder) {
        const negItems = items.filter(item => (parseFloat(String(item.price)?.replace(',','.')) || 0) < 0);
        if (negItems.length > 0) {
            const titelNeg = isIT ? "MISURA / TIPO" : "GRÖSSE / TYP";
            html += `<div class="modal-section-title">${titelNeg}</div>`;
            negItems.forEach(e => {
                const isActive = pizza.extras.some(ex => ex.name === e.name);
                const displayName = (isIT && e.name_it) ? e.name_it : e.name;
                html += `
                    <button class="modal-btn ${isActive ? 'active-add' : ''}" onclick="toggleExtra('${e.name}', '${e.price}')">
                        ${displayName} ${isActive ? ' ✓' : ''} 
                    </button>`;
            });
        }
    }

    // 2. SEKTION: OHNE (Zutaten abbestellen)
    const titelOhne = isIT ? "COSA TOGLIERE? (SENZA)" : "WAS SOLL WEG? (OHNE)";
    html += `<div class="modal-section-title">${titelOhne}</div>`;
    
    const descToSplit = (isIT && pOriginal.desc_it) ? pOriginal.desc_it : (pOriginal.desc || "");
    if (descToSplit) {
        const ingredients = descToSplit.split(',').map(s => s.trim());
        ingredients.forEach(ing => {
            const isOff = pizza.removals.includes(ing);
            const wegZusatz = isIT ? "togli" : "weg";
            html += `
                <button class="modal-btn ${isOff ? 'active-remove' : ''}" onclick="toggleRemoveInModal('${ing}')">
                    ${ing} ${isOff ? ' ✓ ('+wegZusatz+')' : ' -'}
                </button>`;
        });
    }

    // 3. SEKTION: EXTRAS (Hinzufügen)
	const titelExtra = isIT ? "COSA AGGIUNGERE? (EXTRA)" : "WAS SOLL DAZU? (EXTRAS)";
	html += `<div class="modal-section-title">${titelExtra}</div>`;

	let isExtraArea = false;
	items.forEach(item => {
		if (item.type === 'header') isExtraArea = item.name.toUpperCase().includes("EXTRAS");
		if (isExtraArea && item.type === 'product') {
			
			// --- NEU: FILTER FÜR KINDERPIZZA ---
			// Wir prüfen, ob im Namen das Wort "Pizza" vorkommt (z.B. "Extra große Pizza" oder "Extra kleine Pizza")
			// Diese Optionen wollen wir bei einer Kinderpizza nicht anzeigen.
			const isSizeOption = item.name.toLowerCase().includes("pizza");
			if (istKinder && isSizeOption) {
				return; // Überspringe diesen Button bei Kinderpizzen
			}
			// -----------------------------------

			const pNum = parseFloat(String(item.price).replace(',', '.')) || 0;
			if (pNum >= 0) {
				const isActive = pizza.extras.some(ex => ex.name === item.name);
				const displayName = (isIT && item.name_it) ? item.name_it : item.name;
				html += `
					<button class="modal-btn ${isActive ? 'active-add' : ''}" 
							onclick="toggleExtra('${item.name}', '${item.price}')">
						${displayName} ${isActive ? ' ✓' : ' +'}
					</button>`;
			}
		}
	});

    // --- ENTSCHEIDENDER SCHRITT ---
    // Das gesamte gesammelte HTML in die Liste schreiben!
    list.innerHTML = html;

    // Footer-Bereich sicherstellen
    const footer = document.getElementById('modal-footer');
    if (footer) footer.style.display = 'flex';
    
    const footerBtn = document.getElementById('btn-modal-done');
    if (footerBtn) {
        footerBtn.style.display = "block";
        footerBtn.innerText = lang.fertig || "Fertig & Speichern";
        footerBtn.style.background = "#28a745"; // Standardfarbe (z.B. Blau oder Dunkel)
        footerBtn.onclick = closeModal; 
    }
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


let isGeolocation=false;
async function sendOrder() {
    const urlParams = new URLSearchParams(window.location.search);
    const isTestMode = urlParams.get('test') === 'true';
    const tisch = urlParams.get('tisch') || "Unbekannt";

    // NEU: Wenn Geolocation generell AUS ist ODER Testmodus AN ist
    if (!isGeolocation || isTestMode) {
        if (isTestMode) console.log("🛠 Testmodus aktiv");
        else console.log("📡 Geolocation global deaktiviert");
        
        await executeOrder(tisch, 0, 0); 
        return;
    }

    // Ab hier läuft der normale GPS-Prozess nur, wenn isGeolocationActive === true
    const infoText = "📍 Standort-Bestätigung erforderlich...";
    if (!confirm(infoText)) return;

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            await executeOrder(tisch, position.coords.latitude, position.coords.longitude);
        },
        async (error) => {
            console.warn("GPS Fehler:", error.message);
            alert("Standort konnte nicht ermittelt werden.");
        },
        { enableHighAccuracy: true, timeout: 8000 }
    );
}

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
            // --- 1. SOFORT DAS FENSTER ZEIGEN ---
            // Wir rufen das Fenster auf, BEVOR wir die großen Aufräumarbeiten machen
            showCustomAlert();

            // --- 2. AUFRÄUMEN IM HINTERGRUND ---
            pizzaCart = [];
            for (let id in standardCart) {
                standardCart[id] = 0;
            }

            localStorage.removeItem('meinWarenkorb_Pizza');
            localStorage.removeItem('meinWarenkorb_Standard');

            // Hinweis: updateUI() und renderMenu() werden jetzt 
            // automatisch nach 1.5s durch closeCustomAlert() aufgerufen.
            // Das spart Rechenzeit im Moment des Klicks!

        } else {
            showErrorAlert("Fehler bei Übertragung");
        }
    } catch (err) {
        console.error("Netzwerkfehler", err);
        showErrorAlert("Netzwerkfehler");
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
    const urlParams = new URLSearchParams(window.location.search);
    const isTestMode = urlParams.get('test') === 'true';

    // SPERRE NUR WENN: 
    // 1. Geolocation eingeschaltet ist (isGeolocation === true)
    // 2. UND wir NICHT im Testmodus sind
    // 3. UND es KEIN Handy ist
    if (isGeolocation && !isTestMode && !isMobile) {
        document.body.innerHTML = `
            <div style="text-align:center; padding:50px; font-family:sans-serif;">
                <h1>📱 Mobilgerät erforderlich</h1>
                <p>Diese Funktion ist aus Sicherheitsgründen nur an Mobilgeräten verfügbar.</p>
                <p><small>Nutzen Sie am PC den Testmodus (?test=true), falls erlaubt.</small></p>
            </div>`;
        return false; 
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
		


window.onload = async function() {
    try {
        // 1. Einstellungen vom Server laden
        const res = await fetch('/api/get-settings');
        const settings = await res.json();
        isGeolocation = settings.isGeolocation; // Globalen Wert setzen
        
        console.log("Geolocation-Status vom Server:", isGeolocation);

        // 2. Jetzt erst den Mobile-Check machen
        if (!enforceMobileAndContext()) {
            return; // Stoppt hier, wenn PC-Sperre aktiv ist
        }

        // 3. Normaler Start der App (Menü laden etc.)
        // await loadMenu(); 
        
    } catch (err) {
        console.error("Fehler beim Initialisieren:", err);
    }
};


// Diese Funktionen irgendwo in dein <script> Bereich kopieren:
function showCustomAlert() {
    const el = document.getElementById('customAlert');
    const content = el.querySelector('div');
    
    // 1. Fenster anzeigen
    el.style.display = 'flex';
    
    // 2. Sanft einblenden
    //setTimeout(() => {
        el.style.opacity = '1';
        if(content) content.style.transform = 'scale(1)';
    //}, 50);

    // 3. NACH 3 SEKUNDEN AUTOMATISCH SCHLIESSEN
    setTimeout(() => {
        closeCustomAlert();
    }, 1500); // 3000ms = 3 Sekunden Sichtbarkeit
}

function closeCustomAlert() {
    const el = document.getElementById('customAlert');
    el.style.opacity = '0'; // Sanft ausfaden
    
    setTimeout(() => {
        el.style.display = 'none';

        // 4. Erst jetzt UI aufräumen
        if (typeof updateUI === "function") updateUI();
        if (typeof renderMenu === "function") renderMenu();

        // Optional: Nach oben scrollen
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    }, 500); // Wartet auf das Ende der Ausblend-Animation
}


// Zeigt das Fehlerfenster mit variablem Text
function showErrorAlert(nachricht) {
    const el = document.getElementById('errorAlert');
    const p = el.querySelector('p');
    
    // Falls ein Text übergeben wurde, setze ihn ein
    if (nachricht) {
        p.innerText = nachricht;
    } else {
        p.innerText = "Die Bestellung konnte nicht gesendet werden.";
    }

    el.style.display = 'flex';
    //setTimeout(() => {
        el.style.opacity = '1';
        el.querySelector('div').style.transform = 'scale(1)';
    //}, 50);
}

// Schließt das Fehlerfenster SICHER
function closeErrorAlert() {
    const el = document.getElementById('errorAlert');
    el.style.opacity = '0';
    
    setTimeout(() => {
        el.style.display = 'none';
        // WICHTIG: Hier kein updateUI(), damit der Warenkorb voll bleibt!
    }, 500);
}


function toggleCart(forceState) {
    const bar = document.getElementById('cart-bar');
    const trigger = document.getElementById('cart-trigger'); // Der gelbe Button
    if (!bar || !trigger) return;

    let shouldShow;
    if (forceState !== undefined) {
        shouldShow = forceState;
    } else {
        shouldShow = (bar.style.display === 'none' || bar.style.display === '');
    }

    if (shouldShow) {
        // WARENKORB ÖFFNEN
        bar.style.display = 'flex'; // 'flex' statt 'block' für besseres Layout
        trigger.style.display = 'none'; // Gelber Button verstecken
    } else {
        // WARENKORB SCHLIESSEN
        bar.style.display = 'none';
        
        // Button nur wiederzeigen, wenn Artikel drin sind
        // Wir prüfen das Badge, um sicherzugehen
        const count = parseInt(document.getElementById('cart-count-badge').innerText) || 0;
        if (count > 0) {
            trigger.style.display = 'flex';
        }
    }
}

/*
		Ein weiterer Check: "Event Bubbling"

Manchmal löst ein Klick auf einen Button auch einen Klick auf das Element darunter aus. Wenn du im Warenkorb arbeitest, stelle sicher, dass deine Buttons so definiert sind:
HTML

<button onclick="event.stopPropagation(); changeGroupQty(...)" ...>

Das event.stopPropagation() verhindert, dass der Klick "durchgereicht" wird an andere Funktionen, die vielleicht die Seite beeinflussen könnten.
*/