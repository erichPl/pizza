// Ganz oben in stats-logic.js
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAccess();
});

function checkAdminAccess() {
    // Schauen, ob wir das PW schon in dieser Sitzung eingegeben haben
    let pw = sessionStorage.getItem('stat_pw');

    if (!pw) {
        pw = prompt("Bitte Admin-Passwort für die Statistik eingeben:", "");
        if (pw) {
            sessionStorage.setItem('stat_pw', pw);
        } else {
            // Wenn abgebrochen wurde, Seite sperren oder zurückschicken
            document.body.innerHTML = '<h1 style="color:white; text-align:center; margin-top:50px;">Zugriff verweigert. Bitte Seite neu laden und PW eingeben.</h1>';
        }
    }
}

async function loadStats() {
    // 1. Passwort aus dem Speicher holen statt jedes Mal zu fragen
    const pw = sessionStorage.getItem('stat_pw');
    
    if (!pw) {
        alert("Kein Passwort gefunden. Bitte laden Sie die Seite neu.");
        return;
    }
    
    // Eingabewerte auslesen
    const von = document.getElementById('dateFrom').value;
    const bis = document.getElementById('dateTo').value;
    const groupBy = document.getElementById('groupBy').value;

    if (!von || !bis) {
        alert("Bitte wählen Sie einen Zeitraum aus.");
        return;
    }

    // ... (Deine restlichen Filter: statusFilter, selectedWeekdays, activeProducts) ...
    const statusFilter = [];
    if (document.getElementById('status-neu').checked) statusFilter.push('neu');
    if (document.getElementById('status-erledigt').checked) statusFilter.push('erledigt');
    if (document.getElementById('status-storno').checked) statusFilter.push('storno'); // Beachte: 'storno' statt 'storniert' falls Server das nutzt

    const selectedWeekdays = Array.from(document.querySelectorAll('.wd-check:checked')).map(c => parseInt(c.value));
    const activeProducts = Array.from(document.querySelectorAll('.prod-check:checked')).map(p => p.value);

    let filteredData = []; 

    try {
        // Fetch mit dem gespeicherten Passwort
        const response = await fetch(`/api/get-all-orders?von=${von}&bis=${bis}&pw=${pw}&_t=${Date.now()}`);
        
        if (!response.ok) {
            if (response.status === 403) {
                alert("Passwort ungültig! Bitte laden Sie die Seite neu.");
                sessionStorage.removeItem('stat_pw'); // Löschen, damit neu gefragt wird
            } else {
                const text = await response.text();
                console.error("Server-Antwort ist nicht OK:", text);
                alert("Fehler vom Server: " + response.status);
            }
            return;
        }

        const allOrders = await response.json();
        console.log("Starte Verarbeitung von " + allOrders.length + " Bestellungen...");

        allOrders.forEach((order, index) => {
            const d = new Date(order.erstelltAm);
            d.setHours(d.getHours() - 5); 
            
            const wochentag = d.getDay();
            const statusMatch = statusFilter.includes(order.status);
            const weekdayMatch = selectedWeekdays.includes(wochentag);

			if (statusMatch && weekdayMatch) {
                // 1. Nur die Artikel filtern, die wirklich angehakt sind
                const relevanteDetails = order.details.filter(item => {
                    const orderItemName = (item.artikel || item.name || "").toLowerCase().trim();
                    
                    if (activeProducts.length === 0) return true;
                    
                    return activeProducts.some(activeProd => {
                        return orderItemName.includes(activeProd.toLowerCase().trim());
                    });
                });

                // 2. NUR wenn wir relevante Artikel gefunden haben, fügen wir die Bestellung hinzu
                if (relevanteDetails.length > 0) {
                    const partialSum = relevanteDetails.reduce((sum, item) => {
                        return sum + (parseFloat(item.preis) || 0);
                    }, 0);

                    // WICHTIG: Wir überschreiben 'details' mit 'relevanteDetails'
                    // So "vergisst" die Statistik das Pils, wenn nur Pizza gewählt ist.
                    filteredData.push({
                        ...order,
                        details: relevanteDetails, // <--- DAS IST NEU
                        logikDatum: d,
                        relevanterUmsatz: partialSum
                    });
                }
            }
        });

        console.log("Ergebnis nach Filterung:", filteredData.length, "Bestellungen übrig.");

        // 5. Gruppieren und UI
        const groups = groupOrders(filteredData, groupBy);
        renderChart(groups);
        updateSummary(groups);

    } catch (err) {
        console.error("Statistik-Fehler:", err);
        alert("Fehler beim Laden der Statistik-Daten.");
    }
    
    // --- Diese Funktionen werden erst NACH dem try-catch aufgerufen ---
    // Da filteredData ganz oben mit 'let' deklariert wurde, sind sie hier bekannt.
    updateTableStats(filteredData);
    window.lastFilteredData = filteredData; 
    
    console.log("Statistik geladen, Export bereit für " + filteredData.length + " Einträge.");
}

// --- HILFSFUNKTION: GRUPPIERUNG ---

function groupOrders(data, mode) {
    const groups = {};

    data.forEach(order => {
        const d = order.logikDatum; // Das Datum inklusive 5-Stunden-Shift
        let key;
        
        // Bestimmen des Schlüssels (Key) für den Balken
        if (mode === 'day') {
            key = d.toLocaleDateString('de-DE'); // Z.B. "25.03.2026"
        } else if (mode === 'week') {
            const kw = getWeekNumber(d);
            key = `KW ${kw} (${d.getFullYear()})`; // Z.B. "KW 12 (2026)"
        } else if (mode === 'month') {
            key = d.toLocaleString('de-DE', { month: 'long', year: 'numeric' }); // Z.B. "März 2026"
        }

        // Falls die Gruppe (der Balken) noch nicht existiert, neu anlegen
        if (!groups[key]) {
            groups[key] = { 
                label: key, 
                total: 0, 
                days: { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 } // Speicher für Mo-So
            };
        }

        // Umsatz zum Balken-Gesamtwert addieren
        groups[key].total += order.relevanterUmsatz;
        
        // Umsatz zum spezifischen Wochentag addieren (wichtig für die Farben im Balken)
        const wochentagIndex = d.getDay(); // 0=So, 1=Mo, ... 6=Sa
        groups[key].days[wochentagIndex] += order.relevanterUmsatz;
    });

    // Wir geben die Gruppen als Array zurück, damit wir sie leichter sortieren/rendern können
    return Object.values(groups);
}
function processData(orders, mode) {
    const groups = {};

    orders.forEach(order => {
        const d = new Date(order.erstelltAm);
        // DER GESCHÄFTSTAG-SHIFT: 5 Stunden zurück
        d.setHours(d.getHours() - 5);
        
        let key;
        const dayIdx = d.getDay(); // 0=So, 1=Mo...
        
        if (mode === 'day') {
            key = d.toLocaleDateString('de-DE');
        } else if (mode === 'week') {
            // Kalenderwoche berechnen
            key = "KW " + getWeekNumber(d);
        } else {
            key = d.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
        }

        if (!groups[key]) {
            groups[key] = { label: key, total: 0, days: { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 } };
        }

        const preis = parseFloat(order.gesamtpreis) || 0;
        groups[key].total += preis;
        groups[key].days[dayIdx] += preis;
    });

    return Object.values(groups);
}

function renderChart(groupArray) {
    const container = document.getElementById('chart-container');
    container.innerHTML = '';
    
    // Max-Wert für die Skalierung finden
    const maxTotal = Math.max(...groupArray.map(g => g.total), 1);

    groupArray.forEach(group => {
        const wrapper = document.createElement('div');
        wrapper.className = 'bar-wrapper';

        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = (group.total / maxTotal * 100) + "%";

        // Segmente für jeden Tag (Stacked)
        for (let i = 0; i < 7; i++) {
            if (group.days[i] > 0) {
                const segment = document.createElement('div');
                segment.className = `bar-segment day-${i}`;
                segment.style.height = (group.days[i] / group.total * 100) + "%";
                segment.title = `Tag ${i}: ${group.days[i].toFixed(2)}€`;
                bar.appendChild(segment);
            }
        }

        const label = document.createElement('div');
        label.className = 'bar-label';
        label.innerText = group.label;

        wrapper.appendChild(bar);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
    });
}

// --- HILFSFUNKTION: ZUSAMMENFASSUNG ---

function updateSummary(groups) {
    const total = groups.reduce((sum, g) => sum + g.total, 0);
    
    // Durchschnitt pro TAG berechnen (nicht pro Balken!)
    // Wir zählen die einzigartigen Tage im Datensatz
    const totalSumEl = document.getElementById('total-sum');
    const avgSumEl = document.getElementById('avg-sum');

    totalSumEl.innerText = total.toFixed(2).replace('.', ',');
    
    // Einfacher Durchschnitt: Gesamt / Anzahl der Balken
    const avg = groups.length > 0 ? total / groups.length : 0;
    avgSumEl.innerText = avg.toFixed(2).replace('.', ',');
}

// --- HILFSFUNKTION: KALENDERWOCHE ---

function getWeekNumber(d) {
    const tempDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    tempDate.setUTCDate(tempDate.getUTCDate() + 4 - (tempDate.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
    return Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
}


// Beispiel: So sollte dein Menü-Array im Code ankommen
let menuStructure = []; 

function buildMenuFilter(menuData) {
    const container = document.getElementById('menu-filter-container');
    if (!container) return;
    container.innerHTML = '';
    
    let currentHeaderName = "";
    let currentListElement = null;

    menuData.forEach(item => {
        if (item.type === 'header') {
            currentHeaderName = item.name;
            // ID generieren (Leerzeichen zu Bindestrichen)
            const safeId = "group-" + item.name.replace(/\s+/g, '-').toLowerCase();

            const groupDiv = document.createElement('div');
            groupDiv.className = 'menu-group';
            groupDiv.style = "position: relative; display: inline-block; margin: 8px 5px;";

            groupDiv.innerHTML = `
                <div style="display: flex; align-items: center; background: #2a2a2a; padding: 10px 15px; border-radius: 6px; border: 1px solid #444; box-shadow: 2px 2px 5px rgba(0,0,0,0.2);">
                    <input type="checkbox" class="header-check" data-header="${currentHeaderName}" checked 
                           onclick="toggleAllProducts('${currentHeaderName}', this.checked)" style="cursor:pointer; width:18px; height:18px;">
                    <span style="margin-left: 12px; cursor: pointer; font-weight: bold; color: #00ca4e; font-size: 1rem;" 
                          onclick="toggleDropdown('${safeId}')">
                        ${currentHeaderName} <small style="color:#888; margin-left:5px;">▾</small>
                    </span>
                </div>
                <div id="${safeId}" class="product-dropdown" 
                     style="display: none; position: absolute; top: 110%; left: 0; background: #333; border: 1px solid #555; 
                            padding: 15px; z-index: 2000; min-width: 240px; box-shadow: 0 8px 25px rgba(0,0,0,0.6); border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #444; padding-bottom: 8px;">
                        <button onclick="selectAll('${currentHeaderName}')" style="background:#444; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.75rem;">Alle</button>
                        <button onclick="selectNone('${currentHeaderName}')" style="background:#444; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.75rem;">Keine</button>
                    </div>
                    <div class="product-list" id="list-${safeId}" style="max-height: 350px; overflow-y: auto;"></div>
                </div>
            `;
            container.appendChild(groupDiv);
            currentListElement = document.getElementById(`list-${safeId}`);
        } 
        else if (item.type === 'product' && currentListElement) {
            const label = document.createElement('label');
            label.style = "display: flex; align-items: center; padding: 6px 0; color: #f0f0f0; cursor: pointer; transition: background 0.2s;";
            label.onmouseover = () => label.style.background = "#3d3d3d";
            label.onmouseout = () => label.style.background = "transparent";
            
            label.innerHTML = `
                <input type="checkbox" class="prod-check" data-parent="${currentHeaderName}" 
                       value="${item.name}" checked style="margin-right: 12px; width:16px; height:16px; cursor:pointer;">
                <span style="font-size: 0.95rem;">${item.name}</span>
            `;
            currentListElement.appendChild(label);
        }
    });
}

// NUR DIESE EINE Dropdown-Funktion behalten!
// Dropdown umschalten und andere schließen
function toggleDropdown(id) {
    const target = document.getElementById(id);
    if (!target) return;
    
    const isVisible = target.style.display === 'block';
    
    // Alle schließen
    document.querySelectorAll('.product-dropdown').forEach(d => d.style.display = 'none');
    
    // Gewähltes öffnen/schließen
    target.style.display = isVisible ? 'none' : 'block';
}

// Alle Produkte eines Headers an/aus
function toggleAllProducts(headerName, isChecked) {
    const checkboxes = document.querySelectorAll(`.prod-check[data-parent="${headerName}"]`);
    checkboxes.forEach(cb => cb.checked = isChecked);
}

function selectAll(name) {
    toggleAllProducts(name, true);
    const headerCb = document.querySelector(`.header-check[data-header="${name}"]`);
    if (headerCb) headerCb.checked = true;
}

function selectNone(name) {
    toggleAllProducts(name, false);
    const headerCb = document.querySelector(`.header-check[data-header="${name}"]`);
    if (headerCb) headerCb.checked = false;
}

// Klick außerhalb schließt alle Dropdowns
window.addEventListener('click', function(e) {
    if (!e.target.closest('.menu-group')) {
        document.querySelectorAll('.product-dropdown').forEach(d => d.style.display = 'none');
    }
});

/*
// Test-Aufruf
const testMenu = [
    { type: 'header', name: 'Pizza' },
    { type: 'product', name: 'Salami' },
    { type: 'product', name: 'Margherita' },
    { type: 'header', name: 'Getränke' },
    { type: 'product', name: 'Pils' }
];

// Sicherstellen, dass das HTML geladen ist
window.onload = () => {
    buildMenuFilter(testMenu);
};
*/


function updateTableStats(filteredData) {
    const tableMap = {};

    filteredData.forEach(order => {
        const tischNr = order.tisch || "Unbekannt";
        const umsatz = order.relevanterUmsatz || 0;

        if (!tableMap[tischNr]) {
            tableMap[tischNr] = { umsatz: 0, anzahl: 0 };
        }
        tableMap[tischNr].umsatz += umsatz;
        tableMap[tischNr].anzahl += 1;
    });

    // In ein Array umwandeln und nach Umsatz sortieren
    const sortedTables = Object.keys(tableMap).map(name => ({
        name: name,
        umsatz: tableMap[name].umsatz,
        anzahl: tableMap[name].anzahl,
        schnitt: tableMap[name].umsatz / tableMap[name].anzahl
    })).sort((a, b) => b.umsatz - a.umsatz);

    renderTableStatsUI(sortedTables);
}



function renderTableStatsUI(sortedTables) {
    const tbody = document.getElementById('table-stats-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    sortedTables.forEach(t => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #333";
        tr.innerHTML = `
            <td style="padding: 12px; font-weight: bold;">Tisch ${t.name}</td>
            <td>${t.anzahl}</td>
            <td style="color: #00ca4e; font-weight: bold;">${t.umsatz.toFixed(2)} €</td>
            <td style="color: #aaa;">${t.schnitt.toFixed(2)} €</td>
        `;
        tbody.appendChild(tr);
    });
}


function exportToCSV() {
    // Wir nutzen die globalen gefilterten Daten (stelle sicher, dass filteredData global verfügbar ist)
   // Wenn gefiltert leer ist, schauen wir, ob wir eine Fehlermeldung brauchen
    if (!window.lastFilteredData || window.lastFilteredData.length === 0) {
        console.error("Export-Variable ist leer!");
        alert("Der aktuelle Filter liefert 0 Ergebnisse. Bitte prüfe Datum und Checkboxen.");
        return;
    }

    // CSV Header
    let csvContent = "Datum;Tisch;Artikel;Menge;Einzelpreis;Gesamt\n";

    window.lastFilteredData.forEach(order => {
        const datum = new Date(order.erstelltAm).toLocaleString('de-DE');
        const tisch = order.tisch;

        order.details.forEach(item => {
            // Wir exportieren nur Artikel, die im aktuellen Filter aktiv sind
            csvContent += `${datum};${tisch};${item.artikel || item.name};1;${item.preis};${item.preis}\n`;
        });
    });

    // Download-Link erstellen
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Umsatzexport_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}










document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/get-fixed-menu'); // Diese Route haben wir gerade korrigiert
        const menuData = await response.json();

        console.log("Anzahl empfangener Items:", menuData.length);

        if (menuData && menuData.length > 0) {
            buildMenuFilter(menuData);
        }
    } catch (err) {
        console.error("Fehler beim Initialisieren:", err);
    }
});

// Test-Check: Existiert der Container?
setTimeout(() => {
    const container = document.getElementById('menu-filter-container');
    if (!container) {
        alert("FEHLER: Der Container 'menu-filter-container' wurde nicht gefunden!");
    } else {
        console.log("Container gefunden. Aktueller Inhalt:", container.innerHTML);
    }
}, 1000);










