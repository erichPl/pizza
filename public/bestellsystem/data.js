// =============================================================================
// 1. GLOBALE DATENSTRUKTUREN & HILFSFUNKTIONEN
// =============================================================================

// menuCart, orderItems, translations etc. werden global genutzt
// (Hinweis: Hier ggf. fehlende Initialisierungen ergänzen, falls nicht in anderer Datei definiert)

/**
 * Wandelt einen String anhand eines Trennzeichens in ein Array um.
 * Entfernt Leerzeichen und leere Einträge.
 */
function getArray(input, separator = ',') {
    return (input || "")
        .split(separator)
        .map(s => s.trim())
        .filter(s => s !== ""); 
}


// =============================================================================
// 2. INITIALISIERUNG & DATEN-FETCHING (API)
// =============================================================================

/**
 * Lädt die Menüdaten aus der Datenbank, filtert nach Ansicht/Tisch
 * und kategorisiert die Einträge (Pizza, Extra, Standard).
 */
async function init() {
    t = translations[currentLang];
    const params = new URLSearchParams(window.location.search);
    let footerBestellzeiten = document.getElementById('oeffnungszeiten-footer');
    
    tischNr = params.get('tisch') || "Abholung";
    
    // Ermitteln der aktuellen Ansicht ('b' für Tisch, 't' für Abholung/Takeaway)
    const currentView = params.has('tisch') ? 'b' : 't';

    // UI-Element für Tisch-Anzeige anpassen
    const tischElement = document.getElementById('tisch-view');
    if (tischElement) {
        if (tischNr === "Abholung") {
            tischElement.innerText = "Abholung";
            if (footerBestellzeiten) footerBestellzeiten.style.display = "block";
        } else {
            tischElement.innerText = "Tisch " + tischNr;
            if (footerBestellzeiten) footerBestellzeiten.style.display = "none";
        }
    }

    try {
        const res = await fetch('/api/order-menu');
        const allData = await res.json(); // Vollständige Speisekarte aus DB

        // Einstellungen (z.B. Geolocation) auslesen
        const settings = allData.find(item => item.type === 'settings');
        isGeolocationActive = settings ? settings.isGeolocation : false;
        console.log("Geolocation Status aus DB:", isGeolocationActive);

        // Filter 1: Nach aktueller Ansicht filtern ('b' oder 't')
        let rawData = allData.filter(item => {
            if (!item.view) return false;
            const views = item.view.toLowerCase().split(',').map(s => s.trim());
            return views.includes(currentView);
        });

        // Filter 2: Spezifische Abhol-Optionen filtern
        if (tischNr === "Abholung") {
            rawData = rawData.filter(item => 
                item.name !== "Zum Mitnehmen" && 
                item.name !== "Extra Abholung"
            );
        }

        // Kategorisierung basierend auf Sektionen/Headern durchführen
        let currentSectionName = "standard"; 
        const items = [];

        rawData.forEach(item => {                    
            if (item.type === "header" || item.type === "header1" || item.type === "header2" || item.type === "header3") {
                currentSectionName = item.name;
                item.category = item.name;
            } else if (item.type === "product") {
                item.section = currentSectionName;    

                const isPizza = pizzaKeywords.some(keyword => keyword.includes(currentSectionName));
                if (isPizza) {
                    item.category = "pizza";
                    if (currentSectionName === kinderpizzaKeyword) {
                        item.category = "kinderpizza";
                    }                    
                } else {
                    const isExtra = extraKeywords.some(keyword => keyword.includes(currentSectionName));
                    if (isExtra) {
                        item.category = "extra";
                    } else {
                        item.category = "standard";                    
                    }
                }
            }            
            items.push(item);
        });

        // Daten ins finale Frontend-Format umwandeln
        processData(items);

    } catch (e) {
        console.error("Fehler beim Initialisieren der Speisekarte:", e);
    }
}


// =============================================================================
// 3. DATENVERARBEITUNG & WARENKORB-OBJEKT-GENERIERUNG
// =============================================================================

/**
 * Verarbeitet die aufbereiteten Rohdaten aus der DB in das finale menuCart-Objekt.
 * @param {Array} allProducts - Das aufbereitete Produkt-Array.
 */
function processData(allProducts) {
    let readOnlyPizza = false;
    /* 
    if (typeof onlyPizza !== 'undefined' && onlyPizza && tischNr === "Abholung") {
        readOnlyPizza = true;
    }
    */

    // 1. Zuerst alle Extras sammeln
    allProducts.forEach(item => {
        if (item.category === "extra") {
            extras.push({
                name: item.name,
                nameIt: item.name_it,
                desc: item.desc,
                descIt: item.desc_it,
                price: item.price,
                category: item.category,
                section: item.section
            });
        }
    });

    // 2. Alle Produkte verarbeiten & menuCart befüllen
    allProducts.forEach((item, index) => {
        
        // Sichtbarkeit initialisieren
        item.isVisible = true;

        // Einschränkung auf reine Pizza-Sichtbarkeit prüfen
        if (readOnlyPizza) {
            const isAllowedCategory = item.category === "pizza" || 
                         item.category === "kinderpizza" || 
                         item.category === "extra" ||
                         ((item.type === "header" || item.type === "header1" || item.type === "header2" || item.type === "header3") && (
                             item.name.startsWith("PIZZ") || 
                             item.name.startsWith("EXTRA") || 
                             item.name.startsWith("KINDER PIZZ")
                         ));
            
            if (!isAllowedCategory) {
                item.isVisible = false;
            }
        }

        const id = index;
        const name = item.name;
        const nameIt = item.name_it;
        const desc = item.desc;
        const descIt = item.desc_it;
        const category = item.category;
        const price = item.price;

        // Arrays für Varianten, Größen & Preise generieren
        item.variants = getArray(name, ',');
        item.variantsIt = getArray(nameIt, ',');
        item.sizes = getArray(desc, '/');
        item.sizesIt = getArray(descIt, '/');
        item.prices = getArray(price, '/');
       
        item.extras = [""];
        item.extrasIt = [""];
        item.removables = [""];
        item.removablesIt = [""];
        
        item.hasVariants = false;
        item.hasSizes = false;
        item.isPizza = false;
        item.isKinderpizza = false;
        item.isStandard = true;
        item.isExtra = false;
        item.hasExtras = false;
        item.hasRemovables = false;

        // Kategorien zuweisen
        if (category === 'pizza') item.isPizza = true;
        if (category === 'kinderpizza') item.isKinderpizza = true;
        if (category === 'extra') item.isExtra = true;

        // Komplexere Varianten- & Größen-Logik (Sonderfall mit Slash im Namen)
        let parts = name.split('/');
        let firstPart = parts[0].trim();
        
        if (name.includes("/") && firstPart.indexOf(" ") !== -1 && !name.includes(",")) {
            let namesComplete = name.split(' ');
            let lastIndex = name.lastIndexOf(' ');
            let lastIndexIt = nameIt.lastIndexOf(' ');
            
            let basename = name.slice(0, lastIndex + 1);
            let basenameIt = nameIt.slice(0, lastIndexIt + 1);
            let others = name.slice(lastIndex + 1);
            let othersIt = nameIt.slice(lastIndexIt + 1);
            
            if (namesComplete.length > 1) {
                let othersArray = getArray(others, '/');
                let othersArrayIt = getArray(othersIt, '/');
                
                item.variants = othersArray.map(v => `${basename} ${v}`);
                item.variantsIt = othersArrayIt.map(v => `${basenameIt} ${v}`);    
                item.hasVariants = true;
                
                if (item.sizes.length > 1) {
                    item.hasSizes = true;
                }    
            }
            item.isStandard = false;
        } else {
            if (item.category === "pizza" || item.category === "kinderpizza") {            
                item.isStandard = false;
                item.extras = extras;
                item.removables = item.desc;
                item.removablesIt = item.descIt;
                item.isPizza = true;
            } else {
                if (item.category === "extra") {
                    item.isExtra = true;
                    item.isStandard = false;
                } else {
                    if (item.variants.length > 1) {
                        item.hasVariants = true;
                        item.isStandard = false;
                    }
                    if (item.sizes.length > 1) {
                        item.hasSizes = true;
                        item.isStandard = false;
                    }                        
                }
            }
        }

        // Objekt für den Warenkorb aufbauen und im menuCart-Array speichern
        menuCart[id] = {
            id: id,
            type: item.type,
            name: item.name,
            nameIt: item.name_it,
            desc: item.desc,
            descIt: item.desc_it,
            category: item.category,
            price: item.price,
            hasVariants: item.hasVariants,
            variants: item.variants,
            variantsIt: item.variantsIt,
            hasSizes: item.hasSizes,
            sizes: item.sizes,
            sizesIt: item.sizesIt,
            prices: item.prices,
            extras: item.extras,
            hasExtras: item.hasExtras,
            hasRemovables: item.hasRemovables,
            isStandard: item.isStandard,
            isPizza: item.isPizza,
            isKinderpizza: item.isKinderpizza,
            isExtra: item.isExtra,
            isVisible: item.isVisible,
            view: item.view,
            hidePrice: item.hidePrice,
            quantity: 0,
            idWk: null,
            orderDetails: { 
                size: "",
                sizeIt: "",
                variant: "",
                extras: [],
                extrasPrice: [],
                without: [],
                quantity: 0,
                price: ""
            }
        };
    });
}