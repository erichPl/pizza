const urlParams = new URLSearchParams(window.location.search);

const isTestMode = urlParams.get('test') === 'true'; //bei Tconst urlParams = new URLSearchParams(window.location.search);st braucht es nie Geolocation
const tisch = urlParams.get('tisch') || "/";
const namePizza="PIZZ"; //Wenn dies in der Überschrift enthalten ist, dann werden die Produkte als Pizza behandelt
const nameExtras="EXTRAS";



// ==========================================
// 1. GLOBALE VARIABLEN & KONFIGURATION
// ==========================================
let items = [];  //Alle Produkte der Speisekarte (mit Überschriften)
let pizzaCart = []; //Warenkorb für angepasste Pizzas
let standardCart = {}; // Warenkorb für Getränke/Standardartikel
const specialDescItems = new Set();	// IDs für Spezial-Produkte (in desc mit Beistrich getrennt und/oder im Preis mit / getrennt (z.B. Fanta,Cola  0.2 l/0.4 l  2,30/4,60

//let currentLang = 'de';
let currentLang = localStorage.getItem('selectedLang') || 'de';
let currentPizzaIdx = null; // Aktuell bearbeitete Pizza im Modal


//das wird nicht gebraucht, da direkt zu items der productType gleich mit init hinzugefügt wird.
//letMyItems=[]; //dies erhält noch ein Feld mit productType standard,beistrich,slash,pizza,kinderpizza,extra

//standart ohne / im Preis, ohne , in name u. keine Pizza

//let myKommaItems=[]; //Beistrich in name   (Fanta, Cola)
//let mySlashItems=[]; // / in Preis (u. damit in desc 0.2 l/0.4 l
//let myPizzaItems=[]; //Pizzas (unter Überschrift Pizza)
//let myExtras= []; // Produkte unter Überschift Extras




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


//A meine Sortierung
function mySorter(){	
	let myHeaderPizza="";
	items.forEach((item, index) => {
		//Zuordnen eines index zum product bzw. header
		item.index=index;
		//schaue ob header Pizza oder EXTRAS ist
		if (item.type=="header"){	
			console.log(namePizza+" "+item.name+" includes:"+nameExtras.includes(item.name));
			if (namePizza.includes(item.name)==true){
			//if (1==1){
				//alert("in");
				myHeaderPizza="pizza";
				if(item.name=="KINDER PIZZA"){
					myHeaderPizza="kinderpizza";
				}
			}
			else{
				if (item.name=="EXTRAS"){
					myHeaderPizza="extras";
				}
				else{
				  myHeaderPizza="";
				}
			}
			console.log(myHeaderPizza);				
		}
		//wenn header Pizza ist dann productType=pizza, wenn KINDERPIZZA dann kinderpizza, wenn EXTRAS dann extra
		if (myHeaderPizza!=""){
			if (item.type=="product"){
				if (myHeaderPizza=="kinderpizza"){
					item.productType="kinderpizza";
				}
				else{
					if (myHeaderPizza=="extras"){
						item.productType="extra";
					}
					else{  
						item.productType="pizza";
					}
				}			
			}
		}			
		//wenn keine Pizza und kein extra
		else{
			//wenn name Beistrich
			if (item.name.includes(",")){
				item.produktType="beistrich";
				if (item.price.includes("/")){
					item.produktType="beistrichslash";
				}
			}
			else{
				if (item.price.includes("/")){
					item.productType="slash";
				}
				else{
					item.productType="standard";
				}
			}
			
		}
		console.log(item.type+" "+item.name+" "+item.desc+" "+item.price+" "+item.productType);	
	})

}



async function init() {
    const params = new URLSearchParams(window.location.search);
    const tischStr = "Tisch " + (params.get('tisch') || "/");
    document.getElementById('tisch-view').innerText = tischStr;
    
    setLanguage('de');

    try {
        //Daten aus Datenbank
	    const res = await fetch('/api/order-menu?v=' + Date.now());
        if (!res.ok) throw new Error("Server antwortet nicht korrekt");

        const data = await res.json(); 
        
        // 1. Daten filtern (nur view b  oder B,m)
        items = data.filter(item => {
            return item.view && item.view.toLowerCase().split(',').map(s => s.trim()).includes('b');
        });
		
			
		
		
	
        //mySorter(); //Meine Sortierung zu Beginn
        
		// --- 2. NEU: SPEZIAL-PRODUKTE ERKENNEN UND REINIGEN --- (nur / im Preis)
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
function addItem_(index, category){
	//alert(index+" "+category);
	//openSelectionModal(index, category, -1); 
	openCombinedModal(index);
}

function addItem(index, category) {
    const item = items[index];
    const itemName = item.name;
    const priceStr = String(item.price);

    const hasSorts = itemName.includes(',');
    const hasVariants = priceStr.includes('/');

	//alert("specialDescItems:"+index+" has:"+specialDescItems.has(index))
  
	// A. FALL: Spezial-Getränk (Sorten/Größen) PRÜFUNG: Ist es eine ID aus unserem Spezial-Set (z.B. "2,30/")?
	if (hasSorts || hasVariants) {
		console.log("hasSorte||hasVariants")
		openSelectionModal(index, category, -1); 
		return;
	}

	// B. FALL: Pizza - Produkt unter Überschrift isPizza ("PIZZ")
	if (category.toUpperCase().includes(namePizza)) {
		console.log("includesPizza")
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
		console.log("standardCart")
		standardCart[index] = (standardCart[index] || 0) + 1;
	}

	updateUI();
	renderMenu();
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
    // Bedingung: Hat Varianten/Sorten UND ist KEINE Pizza   //wenn das nicht ist geht es zu pizza zurück bei / u ,
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


// Hilfsfunktionen für die Buttons im Modal
function executeModalRemove_(cartIdx, parentIdx) {
    pizzaCart.splice(cartIdx, 1);
    finishUpdate(parentIdx);
}

function executeModalAdd_(sampleIdx, parentIdx) {
    // Kopiert die Pizza an sampleIdx (inkl. aller Extras/Größen)
    const neuePizza = JSON.parse(JSON.stringify(pizzaCart[sampleIdx]));
    pizzaCart.push(neuePizza);
    finishUpdate(parentIdx);
}

function finishUpdate_(parentIdx) {
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

function closeCorrection_() {
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
   // --- 3. PIZZA & SPEZIAL-DRINK HTML ---
    let pizzaDetailHtml = "";
    Object.values(gruppen).forEach(g => {
        const isSpecial = specialDescItems.has(parseInt(g.parentIdx));
        
		//alert(isSpecial);
        // Button Logik
        const aendernButton = !isSpecial 
            ? `<button onclick="openCombinedModal(${g.sampleIdx})" style="margin-top:8px; padding: 4px 12px; background:#444; color:white; border:none; border-radius:4px; font-size:0.75rem; cursor:pointer;">✎ ${lang.aendern}</button>` 
            : "";

        // Escape helper für Strings in onclick-Attributen
        const escSize = (g.size || "").replace(/'/g, "\\'");
        const escExtras = g.extras.map(e => e.name.replace(/'/g, "\\'")).join(",");
        const escRemovals = g.removals.map(r => r.replace(/'/g, "\\'")).join(",");

        if (g.isSpecialDrink) {
            // --- GETRÄNKE LAYOUT (Blau) ---
            pizzaDetailHtml += `
            <div class="cart-row" style="margin-bottom: 8px; border-left: 4px solid #007bff; padding: 10px; background: #2a2a2a; border-radius: 8px; display:flex; justify-content:space-between; align-items:center;">
                <div style="flex-grow:1;">
                    <strong style="color:white;">${g.qty}x ${g.name}</strong> 
                    <span style="color:#aaa; font-size:0.85rem;">${g.size ? g.size : ''}</span>
                    <div style="display:block;">${aendernButton}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 4px; background: #1a1a1a; padding: 2px; border-radius: 6px;">
                    <button onclick="changeGroupQty('${g.parentIdx}', '${escSize}', '${escExtras}', '${escRemovals}', -1)" style="width:34px; height:34px; background:#444; color:white; border:none; border-radius:4px;">–</button>
                    <button onclick="changeGroupQty('${g.parentIdx}', '${escSize}', '${escExtras}', '${escRemovals}', 1)" style="width:34px; height:34px; background:#007bff; color:white; border:none; border-radius:4px;">+</button>
                </div>
            </div>`;
        } else {
            // --- PIZZA LAYOUT (Gelb) ---
            // Extras Formatierung
            const extraList = g.extras.length > 0 
                ? g.extras.map(e => `<span style="color: #ffcc00;">+ ${e.name}</span>`).join(', ') 
                : "";
            
            // Ohne-Zutaten Formatierung
            const ohneList = g.removals.length > 0 
                ? `<div style="color:#2ecc71; margin-top: 2px;">${lang.ohne}: ${g.removals.join(', ')}</div>` 
                : "";

            pizzaDetailHtml += `
            <div class="cart-row" style="margin-bottom: 8px; border-left: 4px solid #ffcc00; padding: 10px; background: #2a2a2a; border-radius: 8px;">
                <div style="display:flex; justify-content:space-between; align-items: flex-start;">
                    <div style="flex-grow:1;">
                        <strong style="color:white;">${g.qty}x ${g.name}</strong> 
                        <span style="color:#aaa; font-size:0.9rem;">${g.size ? '('+g.size+')' : ''}</span>
                        
                        <div style="font-size: 0.82rem; margin-top: 4px; line-height: 1.3;">
                            ${extraList}
                            ${ohneList}
                        </div>
                        
                        ${aendernButton}
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 4px; background: #1a1a1a; padding: 2px; border-radius: 6px; margin-left: 10px;">
                        <button onclick="changeGroupQty('${g.parentIdx}', '${escSize}', '${escExtras}', '${escRemovals}', -1)" style="width:34px; height:34px; background:#444; color:white; border:none; border-radius:4px;">–</button>
                        <button onclick="changeGroupQty('${g.parentIdx}', '${escSize}', '${escExtras}', '${escRemovals}', 1)" style="width:34px; height:34px; background:#007bff; color:white; border:none; border-radius:4px;">+</button>
                    </div>
                </div>
            </div>`;
        }
    });

 

// --- 4. FINALE STRUKTUR ---
    let cartHeader = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:12px;">
            <h2 style="color:#ffcc00; margin:0; font-size:1.1rem; text-transform: uppercase; letter-spacing: 1px;">
                ${lang.produkte || 'Warenkorb'}
            </h2>
            <div onclick="toggleCart(false)" style="cursor: pointer; width: 32px; height: 32px; background: #444; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 1.2rem;">✕</span>
            </div>
        </div>
    `;
let totalHtml="";
    // Warenkorb Summe hinzufügen
/*    let totalHtml = `
        <div style="margin: 15px 0; padding: 10px; background: #1a1a1a; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #333;">
            <strong style="color: #aaa;">${lang.gesamt || 'Gesamt'}:</strong>
            <strong style="color: #ffcc00; font-size: 1.2rem;">${total.toFixed(2)} €</strong>
        </div>
    `;*/
	

    let cartFooter = "";
    if (absoluteProduktAnzahl > 0) {
        cartFooter = `
        <div style="margin-top: 10px;">
            <button id="btn-send" onclick="sendOrder()" 
                style="width:100%; padding: 15px; background: #28a745; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 1.1rem; cursor: pointer;">
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
// --- WICHTIG: Hier wird alles zusammengefügt und in das Div geschrieben ---
    listDiv.innerHTML = cartHeader + pizzaDetailHtml + drinkHtml + totalHtml + cartFooter;

    // Sichtbarkeit des Floating-Buttons (Badge)
    if (openBtn && badge) {
        badge.innerText = absoluteProduktAnzahl;
        if (absoluteProduktAnzahl > 0) {
            openBtn.style.display = 'flex';
        } else {
            openBtn.style.display = 'none';
            // Falls der Warenkorb leer ist, schließen wir ihn auch
            if (bar.style.display === 'block') toggleCart(false);
        }
    }

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


function changePizzaQty_(idx, change) {
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

//Fenster 2 fpr Zutaten Extras und ohne (bei Pizzas)
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

     // TEIL A: SORTEN u Variants ("," in desc  Fanta,Cola oder "/" in Preis)
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
            html += `<button class="size-btn" id="size-${i}" onclick="selectSize(${i}, ${pNum}, '${lText}')" style="flex:1; padding:15px 5px; 
			color:white; border:2px solid; border-radius:8px; font-weight:bold; cursor:pointer; ${active}">${lText}</button>`;
			//color:white; border:2px solid; border-radius:8px; font-weight:bold; cursor:pointer; ${active}">${lText}<br>${p.trim()} €</button>`;
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

//nicht verwendet?
function openVariantChangeModal(idx) {
	alert("openVariantChangeModal");
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
    const isIT = (currentLang === 'it');
    const lang = i18n[currentLang] || i18n.de;
    
    // Titel setzen
    const displayNameHeader = (isIT && pOriginal.name_it) ? pOriginal.name_it : pOriginal.name;
    document.getElementById('modal-title').innerText = lang.anpassen + ": " + displayNameHeader;

    let html = "";

	// --- SEKTION: OHNE (Zutaten abbestellen) ---
	const titelOhne = isIT ? "COSA TOGLIERE? (SENZA)" : "WAS SOLL WEG? (OHNE)";
	const wegZusatz = isIT ? "Senza" : "Ohne";

	// Wir erstellen den String für die Anzeige unter dem Button
	// pizza.removals ist das Array mit den Namen der abgewählten Zutaten
	const gewaehlteRemovals = pizza.removals.join(", ");

	//html += `<div class="modal-section-title" style="margin-top:20px;">${titelOhne}</div>`;    
		
	html += `
		<div style="padding: 10px 0;">
			  <button class="modal-btn" style="background: #444444 !important; color: white;  width: 100%; height: 55px; background:transparent;" 
					onclick="openRemovalsSelection()">
				– ${isIT ? "Rimovi ingredienti" : "Zutaten entfernen"}
			</button>
			
			${gewaehlteRemovals ? `
				<div style="color:#2ecc71; font-size:0.85rem; margin-top:8px; font-weight:bold;">
					✕ ${wegZusatz}: ${gewaehlteRemovals}
				</div>` : ''}
		</div>
	`;
	
	
	 // --- SEKTION: EXTRAS (Öffnet neues Fenster) ---
    const titelExtra = isIT ? "EXTRA" : "EXTRAS HINZUFÜGEN";	
    const gewaehlteExtras = pizza.extras.map(e => e.name).join(", ");
    
    html += `
        <div style="padding: 10px 0;">
            <button class="modal-btn"style="background: #444444 !important; color: white; width: 100%; height: 55px; background:transparent;" 
                    onclick="openExtrasSelection()">
                + ${isIT ? 'Aggiungi Extra' : 'Extras auswählen'}
            </button>
            ${gewaehlteExtras ? `<div style="color:#ffcc00; font-size:0.85rem; margin-top:8px; font-weight:bold;">✔ ${gewaehlteExtras}</div>` : ''}
        </div>
    `;

    list.innerHTML = html;

    // Footer-Button "SPEICHERN" sicherstellen
    const footerBtn = document.getElementById('btn-modal-done');
    if (footerBtn) {
        footerBtn.innerText = lang.fertig || "SPEICHERN";
        footerBtn.onclick = closeModal; 
    }
}




// Diese Funktion wird aufgerufen, wenn man im Hauptmodal auf eine Zutat klickt
function toggleRemoveInModal(ing) {
    const pizza = pizzaCart[currentPizzaIdx];
    if (!pizza) return;

    // Falls das Array noch nicht existiert, erstellen
    if (!pizza.removals) pizza.removals = [];
    
    const index = pizza.removals.indexOf(ing);
    if (index > -1) {
        // Zutat ist schon auf der "Weg"-Liste -> wieder hinzufügen (aus Liste entfernen)
        pizza.removals.splice(index, 1);
    } else {
        // Zutat neu auf die "Weg"-Liste setzen
        pizza.removals.push(ing);
    }
    
    // WICHTIG: Das Modal sofort neu zeichnen, damit das Häkchen erscheint
    renderModalContent();
}


// Logik für die Extra-Buttons im 2. Fenster
function toggleExtraInWindow(name, price) {
    const pizza = pizzaCart[currentPizzaIdx];
    const idx = pizza.extras.findIndex(e => e.name === name);
    
    if (idx > -1) {
        pizza.extraPrice -= pizza.extras[idx].price;
        pizza.extras.splice(idx, 1);
    } else {
        pizza.extras.push({name: name, price: price});
        pizza.extraPrice += price;
    }
    renderExtrasContent(); // 2. Fenster aktualisieren
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

function closeModal() {
    // ... deine Logik zum Schließen ...
    document.getElementById('modal').style.display = 'none';
    
    updateUI(); // <--- HIER REFRESH ERZWINGEN
}


let isGeolocation=false;
async function sendOrder() {
    
	



  

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

    const btn = document.getElementById('btn-send'); // Die ID deines Buttons
    
    // 1. Prüfen, ob der Button schon gesperrt ist (verhindert Doppelklick)
    if (btn.disabled) return;
    // 2. Button sperren und Optik ändern
    btn.disabled = true;
    const originalText = btn.innerText;
    btn.innerText = "⏳ Sende Bestellung...";
    btn.style.opacity = "0.5";
    btn.style.cursor = "not-allowed";





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


            // 2. Button endgültig verstecken oder Text ändern
    // Wir lassen ihn 'disabled', damit kein zweiter Klick möglich ist,
    // während der Warenkorb im Hintergrund geleert wird.
    btn.innerText = "✅ Bestellung abgeschlossen";
    btn.style.backgroundColor = "#28a745"; // Schön grün machen



            // --- 2. AUFRÄUMEN IM HINTERGRUND ---
            pizzaCart = [];
            for (let id in standardCart) {
                standardCart[id] = 0;
            }

            localStorage.removeItem('meinWarenkorb_Pizza');
            localStorage.removeItem('meinWarenkorb_Standard');


		// 4. UI aktualisieren, damit der Warenkorb auch optisch leer ist
			if (typeof updateUI === "function") updateUI();
			
            // Hinweis: updateUI() und renderMenu() werden jetzt 
            // automatisch nach 1.5s durch closeCustomAlert() aufgerufen.
            // Das spart Rechenzeit im Moment des Klicks!

        } else {
            showErrorAlert("Fehler bei Übertragung");
        }
    } catch (err) {
        console.error("Netzwerkfehler", err);
        showErrorAlert("Netzwerkfehler");
		// Falls ein Fehler passiert: Button wieder freigeben!
        alert("Fehler: " + err.message);
        btn.disabled = false;
        btn.innerText = originalText;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
		
		
    }
}
		
// Alle 20 Sekunden ein winziger "Wachhalte-Gruß" an den Server
setInterval(() => {
    fetch('/api/data?ping=' + Date.now())
        .then(() => console.log("Gast-Leitung gewärmt"))
        .catch(() => {}); 
}, 20000);		
		
		
		
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

//PIZZA EXTRAS 30.03.26
function openExtrasSelection() {
	//alert("openExtrasSelection");
    // --- NEU: Zuerst das erste Fenster (ID: modal) verstecken ---
    const firstModal = document.getElementById('modal');
    if (firstModal) {
        firstModal.style.display = 'none';
    }

    // 1. Erstelle das Overlay, falls es noch nicht existiert
    let extraOverlay = document.getElementById('extras-overlay');
    if (!extraOverlay) {
        extraOverlay = document.createElement('div');
        extraOverlay.id = 'extras-overlay';
        // Styling für das neue Fenster
        extraOverlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:3000; padding:20px; overflow-y:auto; box-sizing:border-box; color:white; font-family:sans-serif;";
        document.body.appendChild(extraOverlay);
    }
    extraOverlay.style.display = 'block';

    const isIT = (currentLang === 'it');
    const pizza = pizzaCart[currentPizzaIdx];
    
    let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h2 style="color:#ffcc00; margin:0;">${isIT ? 'Seleziona Extra' : 'Extras wählen'}</h2>
                    <button onclick="closeExtrasSelection()" style="background:#444; color:white; border:none; border-radius:50%; width:30px; height:30px;">✕</button>
                </div>`;
    
    html += `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">`;

    let isExtraArea = false;
    items.forEach(item => {
        if (item.type === 'header') {
            isExtraArea = item.name.toUpperCase().includes("EXTRAS") || item.name.toUpperCase().includes("ZUTATEN");
        }
        
        if (isExtraArea && item.type === 'product') {
            const names = item.name.split(',').map(n => n.trim());
            const price = parseFloat(String(item.price).replace(',', '.')) || 0;

            names.forEach(name => {
                const isActive = pizza.extras.some(ex => ex.name === name);
                
                html += `
                    <button class="modal-btn ${isActive ? 'active-add' : ''}" 
						style="height:auto; padding:12px 5px; font-size:0.9rem; transition: background 0.2s;
						${isActive 
							? 'background-color: #ffcc00 !important; border: 2px solid #ffcc00; color: #ffffff;' 
							: 'background-color: rgb(51,51,51); border: 1px solid #555; color: #ccc;'}"
						onclick="toggleExtraFromWindow('${name}', ${price})">
						${name}<br>
						
					</button>`;
            });
        }
    });

    html += `</div>`;
    html += `<button onclick="closeExtrasSelection()" style="margin-top:30px; width:100%; padding:15px; background:#28a745; color:white; border:none; border-radius:8px; font-weight:bold;">${isIT ? 'OK / CHIUDI' : 'FERTIG / SCHLIESSEN'}</button>`;
    
    extraOverlay.innerHTML = html;
}

// Logik zum Hinzufügen/Entfernen im neuen Fenster
function toggleExtraFromWindow(name, price) {
    const pizza = pizzaCart[currentPizzaIdx];
    const index = pizza.extras.findIndex(ex => ex.name === name);

    if (index > -1) {
        // Entfernen
        pizza.extraPrice -= pizza.extras[index].price;
        pizza.extras.splice(index, 1);
    } else {
        // Hinzufügen
        pizza.extras.push({ name: name, price: price });
        pizza.extraPrice += price;
    }
    
    // Beide Fenster aktualisieren
    openExtrasSelection(); 
    renderModalContent(); 
}

// Schließt das Extra-Fenster und zeigt das Hauptmodal wieder
function closeExtrasSelection() {
    // 1. Extra-Fenster verstecken
    const extraOverlay = document.getElementById('extras-overlay');
    if (extraOverlay) {
        extraOverlay.style.display = 'none';
    }

    // 2. Haupt-Fenster (modal) wieder anzeigen
    const firstModal = document.getElementById('modal');
    if (firstModal) {
        firstModal.style.display = 'block';
    }

    // 3. Inhalt im Haupt-Fenster aktualisieren (damit gewählte Extras angezeigt werden)
    renderModalContent();
}

function openRemovalsSelection() {
    // --- 1. Fenster 1 (ID: modal) verstecken ---
    const firstModal = document.getElementById('modal');
    if (firstModal) {
        firstModal.style.display = 'none';
    }

    // --- 2. Overlay finden oder NEU ERSTELLEN (genau wie bei Extras) ---
    let extraOverlay = document.getElementById('extras-overlay');
    if (!extraOverlay) {
        extraOverlay = document.createElement('div');
        extraOverlay.id = 'extras-overlay';
        // Gleiches Styling wie bei den Extras für ein einheitliches Design
        extraOverlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:3000; padding:20px; overflow-y:auto; box-sizing:border-box; color:white; font-family:sans-serif;";
        document.body.appendChild(extraOverlay);
    }
    extraOverlay.style.display = 'block';

    const isIT = (currentLang === 'it');
    const pizza = pizzaCart[currentPizzaIdx];
    const pOriginal = items[pizza.parentIdx];

    let isOff = pizza.removals.includes(name);
    // --- 3. Titel für "OHNE" anpassen ---
    const titel = isIT ? 'Cosa togliere? (Senza)' : 'Zutaten abwählen (Ohne)';
    let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h2 style="color:#ffcc00; margin:0;">${titel}</h2>
                    <button onclick="closeExtrasSelection()" style="background:#444; color:white; border: 2px solid #ffcc00; border-radius:50%; width:30px; height:30px;">✕</button>
                </div>`;
    

    html += `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">`;

    // --- 4. Zutaten aus der Beschreibung der Pizza holen ---
    const desc = (isIT && pOriginal.desc_it) ? pOriginal.desc_it : (pOriginal.desc || "");
    const ingredients = desc.split(',').map(s => s.trim()).filter(s => s !== "");

    ingredients.forEach(name => {
        isOff = pizza.removals.includes(name);
        const wegZusatz = isIT ? "togli" : "weg";
        
        // Nutzt onclick="toggleRemoval(...)" für die Logik
        //Zuitaten entfernen
		html += `
            <button class="modal-btn ${isOff ? 'active-remove' : ''}" 
                style="height:auto; padding:15px 5px; font-size:1rem; ${isOff ? 'border: 2px solid #27ae60; background: #2ecc71 !important; color:white;' : ''}"
                onclick="toggleRemoval('${name.replace(/'/g, "\\'")}')">
                ${name}
                ${isOff ? `<br><small style="color:#ff4444;"></small>` : ''}
            </button>`;
    });

    html += `</div>`;

    // --- 5. Fertig-Button ---
    const buttonText = isIT ? 'OK / CHIUDI' : 'FERTIG / SPEICHERN';
    html += `<button onclick="closeExtrasSelection()" style="margin-top:30px; width:100%; padding:15px; background:#28a745; color:white; border:none; border-radius:8px; font-weight:bold;">${buttonText}</button>`;
    
    extraOverlay.innerHTML = html;
}
function toggleRemoval(ingName) {
    const p = pizzaCart[currentPizzaIdx];
    
    // Falls das removals-Array noch nicht existiert (Sicherheitscheck)
    if (!p.removals) p.removals = [];

    const idx = p.removals.indexOf(ingName);

    if (idx > -1) {
        p.removals.splice(idx, 1); // Zutat wieder "drauf" auf die Pizza
    } else {
        p.removals.push(ingName); // Zutat "runter" von der Pizza
    }

    // 1. Warenkorb-UI im Hintergrund aktualisieren
    updateUI(); 
    
    // 2. Fenster 2 (das Overlay) sofort neu zeichnen, damit man das "X" sieht
    openRemovalsSelection(); 
}


/*
		Ein weiterer Check: "Event Bubbling"

Manchmal löst ein Klick auf einen Button auch einen Klick auf das Element darunter aus. Wenn du im Warenkorb arbeitest, stelle sicher, dass deine Buttons so definiert sind:
HTML

<button onclick="event.stopPropagation(); changeGroupQty(...)" ...>

Das event.stopPropagation() verhindert, dass der Klick "durchgereicht" wird an andere Funktionen, die vielleicht die Seite beeinflussen könnten.
*/