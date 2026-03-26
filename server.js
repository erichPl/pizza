require('dotenv').config(); // Lädt die Variablen aus der .env Datei in process.env
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

//app.use(express.json());

// Erhöhe das Limit auf z.B. 10MB (statt der standardmäßigen 100KB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(express.static('public'));

// Ein extrem schneller Health-Check Endpunkt
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});






//für local I7
// Nutzt die Cloud-URI falls vorhanden, ansonsten die lokale MongoDB
//const mongoURI = process.env.MONGO_URI || "mongodb://127.0.1.7/pizzeria"; 

const mongoURI = process.env.MONGO_URI


mongoose.connect(mongoURI)
    .then(() => console.log("==> MongoDB Cloud verbunden!"))
    .catch(err => console.error("Verbindungsfehler zu Cloud:", err));

/*
//github
// DIE FEHLENDE VERBINDUNG:
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("==> MongoDB verbunden!"))
    .catch(err => console.error("Verbindungsfehler:", err));
*/

// DATEN-SCHEMA
const DataSchema = new mongoose.Schema({
    type: { type: String, default: "main_data" },
    start: { 
        img: String, 
        textDE: String, 
        textIT: String,
        zeiten: Array // <== DIESE ZEILE MUSS REIN!
    },
    pizzas: Array,
    events: Array,
    tv: Array
}, { strict: false }); // 'strict: false' erlaubt zusätzliche Felder

const DataModel = mongoose.model('PizzaData', DataSchema);

// API ENDPUNKTE
app.get('/api/data', async (req, res) => {
    try {
        // Suche nach den Daten
        let data = await DataModel.findOne({ type: "main_data" });
        
        // WICHTIG: Wenn nichts gefunden wird, schicke ein leeres Start-Objekt
        if (!data) {
            console.log("Datenbank ist noch leer, sende Standard-Objekt");
            return res.json({ 
                start: { img: "start.jpg", textDE: "Willkommen", textIT: "Benvenuti" }, 
                pizzas: [], 
                events: [], 
                tv: [] 
            });
        }
        
        res.json(data);
    } catch (e) {
        console.error("Fehler beim Laden:", e);
        res.status(500).json({ error: "Interner Serverfehler" });
    }
});

//=================================================================
//Aufruf:   localhost:10000/api/fix-all-heights?pw=leon2208
//An MongoDb ein Feld hinzufügen bei pizza, tv und event 
//=============================================================
app.post('/api/data', async (req, res) => {
    // PRÜFUNG: Ist das Passwort in der URL korrekt?
    if (req.query.pw !== 'leon2208') {
        return res.status(403).json({ error: "Zugriff verweigert: Falsches Passwort" });
    }

    try {
        await DataModel.findOneAndUpdate({ type: "main_data" }, req.body, { upsert: true });
        res.json({ status: "Erfolg" });
    } catch (e) { 
        res.status(500).send(e); 
    }
});

//Der "Update-Alles" Endpunkt für deine server.js: imgHeightHandy in mongoDb hinzufügen
app.get('/api/fix-all-heights', async (req, res) => {
    if (req.query.pw !== 'leon2208') return res.status(403).send("Falsches PW");

    try {
        const data = await DataModel.findOne({ type: "main_data" });
        if (!data) return res.send("Keine Daten zum Aktualisieren gefunden.");

        // Funktion zum sicheren Hinzufügen/Überschreiben (bzw. nicht überschreiben) von imgHeightHeight
        const addHeight = (arr) => {
            if (!Array.isArray(arr)) return arr;
            return arr.map(item => {
				
				// Hier definieren wir hasHeight für jedes einzelne Element im Array
                const hasHeight = item.imgHeightHandy !== undefined && item.imgHeightHandy !== null;
				return {
					...item,        // Behält alle alten Felder (img, text, etc.)
					//NICHT ÜBERSCHREIBEN
					imgHeightHandy: hasHeight ? item.imgHeightHandy : 100 // Falls vorhanden: behalte alten Wert, sonst: setze 100
					//ÜBERSCHREIBEN
					//imgHeightHandy: 100  // Setzt imgHeightHandy auf 100 (überschreibt falls vorhanden)
				}
            });
        };

        // Auf alle drei Kategorien anwenden
        data.tv = addHeight(data.tv);
        data.pizzas = addHeight(data.pizzas);
        data.events = addHeight(data.events);

        await data.save();
        res.send("Update erfolgreich: tv, pizzas und events haben nun imgHeightHandy: 100");
    } catch (e) {
        res.status(500).send("Fehler: " + e.message);
    }
});

//****************************************
//sisinius.it/backup.html?pw=leon2208
//****************************************
//=====================================================================================
//BACKUP MnogoDb
//=====================================================================================
// DOWNLOAD: Alles als JSON exportieren
app.get('/api/backup-download', async (req, res) => {
    if (req.query.pw !== 'leon2208') return res.status(403).send("Falsches PW");
    
    try {
        const allData = await DataModel.find({});
        const jsonContent = JSON.stringify(allData, null, 2);
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=mongodb_backup.json');
        res.send(jsonContent);
    } catch (e) {
        res.status(500).send("Export-Fehler: " + e.message);
    }
});

//=====================================================================================
//UPLOAD MnogoDb (RESTORE)
//=====================================================================================
// UPLOAD: JSON wieder in MongoDB importieren
// UPLOAD & RESTORE: Datenbank leeren und JSON neu einspielen
app.post('/api/restore-upload', async (req, res) => {
    if (req.query.pw !== 'leon2208') return res.status(403).send("Falsches PW");

    try {
        const backupData = req.body;
        
        if (!Array.isArray(backupData)) {
            return res.status(400).send("Ungültiges Format: Erwarte ein Array von Objekten.");
        }

        // 1. SCHRITT: Alle alten Daten in der Kollektion löschen
        const deleteResult = await DataModel.deleteMany({});
        console.log(`${deleteResult.deletedCount} alte Dokumente gelöscht.`);

        // 2. SCHRITT: Die Backup-Daten einfügen
        // Wir entfernen die _id bei jedem Item, falls MongoDB neue IDs vergeben soll
        // oder lassen sie, wenn die IDs exakt gleich bleiben sollen.
        const cleanedData = backupData.map(item => {
            const { _id, ...rest } = item; 
            return rest; // Wir löschen die alte _id, um Konflikte zu vermeiden
        });

        await DataModel.insertMany(cleanedData);
        
        res.json({ 
            status: "Restore erfolgreich", 
            deleted: deleteResult.deletedCount, 
            inserted: cleanedData.length 
        });
    } catch (e) {
        console.error("Restore Fehler:", e);
        res.status(500).send("Import-Fehler: " + e.message);
    }
});




















//*******************************************************************************************
//Für Bestellung
//========================================
//*******************************************************************************************

/*require('dotenv').config(); // LÄDT DIE .env DATEI
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
//app.use(express.static(__dirname));
app.use(express.static('public'));

// --- BITTE NUR HIER DEINE URL EINTRAGEN ---
const mongoURI =  process.env.MONGO_URI; 

mongoose.connect(mongoURI)
    .then(() => console.log("MongoDB verbunden"))
    .catch(err => console.error("MongoDB Fehler:", err));

*/

const menuSchema = new mongoose.Schema({
    type: { type: String, default: "order_menu" },
    items: Array
});
const OrderMenu = mongoose.model('OrderMenu', menuSchema);

const orderSchema = new mongoose.Schema({
    tisch: String,
    details: Array,
    gesamtpreis: Number, // Oder String, falls du ihn bereits formatiert speicherst
	zeit: String,
    status: { type: String, default: 'neu' },
	
	// DIESER TEIL MUSS HINZUGEFÜGT WERDEN:
    coords: {
        lat: { type: mongoose.Schema.Types.Mixed, default: null },
        lng: { type: mongoose.Schema.Types.Mixed, default: null },
		distanz: { type: Number, default: 0 } 
    },
	
    erstelltAm: { type: Date, default: Date.now },
    // NEU: Damit das Datum gespeichert werden darf
    erledigtAm: { type: Date } 
});
const Order = mongoose.model('Order', orderSchema);


app.get('/bestelle', (req, res) => {
    res.sendFile(path.join(__dirname, 'public','bestelle1','bestelle.html'));
});

app.get('/orders', (req, res) => {
    if (req.query.pw !== 'schaukel2') return res.status(403).send("Zugriff verweigert");
	res.sendFile(path.join(__dirname, 'public','bestelle1','orders.html'));
});
app.get('/statistik', (req, res) => {
    if (req.query.pw !== 'schaukel23!') return res.status(403).send("Zugriff verweigert");
	res.sendFile(path.join(__dirname, 'public','bestelle1','statistik.html'));
});


app.get('/adminBest', (req, res) => {
    if (req.query.pw !== 'leon2208') return res.status(403).send("Zugriff verweigert");
    res.sendFile(path.join(__dirname, 'public','bestelle1','adminNode.html'));
});

app.get('/api/order-menu', async (req, res) => {
    try {
        const menu = await OrderMenu.findOne({ type: "order_menu" });
        res.json(menu ? menu.items : []);
    } catch (err) {
        res.status(500).send("Fehler");
    }
});

app.put('/api/order-menu', async (req, res) => {
    try {
        await OrderMenu.findOneAndUpdate(
            { type: "order_menu" }, 
            { items: req.body.items }, 
            { upsert: true }
        );
        res.json({ status: "ok" });
    } catch (err) {
        res.status(500).send("Fehler");
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const neueBestellung = new Order(req.body);
        await neueBestellung.save();
        res.status(201).json({ status: "ok" });
    } catch (err) {
        res.status(500).send("Fehler");
    }
});

app.get('/api/get-orders', async (req, res) => {
    try {
        const orders = await Order.find({ status: 'neu' }).sort({ erstelltAm: 1 });
        res.json(orders);
    } catch (err) {
        res.status(500).send("Fehler");
    }
});

// Bestellung NICHT löschen, sondern nur als ERLEDIGT markieren
// WICHTIG: Prüfe, ob /api/orders/:id/done genau so da steht
app.patch('/api/orders/:id/done', async (req, res) => {
    try {
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id, 
            { 
                status: 'erledigt',
                erledigtAm: new Date() // Setzt das aktuelle Datum/Uhrzeit
            }, 
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).send("Bestellung nicht gefunden");
        }

        console.log(`✅ Erledigt am: ${updatedOrder.erledigtAm}`);
        res.json(updatedOrder);
    } catch (err) {
        console.error("Fehler:", err);
        res.status(500).send("Server Fehler");
    }
});

// Beispiel für den Server-Endpunkt
app.patch('/api/orders/:id/cancel', async (req, res) => {
    try {
        await Order.findByIdAndUpdate(req.params.id, { status: 'storniert' });
        res.status(200).send({ message: 'Bestellung storniert' });
    } catch (err) {
        res.status(500).send(err);
    }
});




// Route für die Historie / Bar-Auswertung
app.get('/api/get-history', async (req, res) => {
    try {
        // Wir suchen alle, die den Status 'erledigt' haben
        // .sort({ erledigtAm: -1 }) zeigt die neuesten oben an
        const history = await Order.find({ status: 'erledigt' }).sort({ erledigtAm: -1 });
        res.json(history);
    } catch (err) {
        console.error("Fehler beim Laden der Historie:", err);
        res.status(500).send("Fehler");
    }
});


// Füge dies zu deinen anderen API-Routen hinzu
app.get('/api/get-all-orders', async (req, res) => {
    try {
        const { von, bis } = req.query;
        
        // Wir suchen alle Bestellungen im Zeitraum
        // Wichtig: Wir nutzen ISO-Format, damit MongoDB es versteht
        const orders = await Order.find({
            erstelltAm: {
                $gte: new Date(von + "T00:00:00Z"),
                $lte: new Date(bis + "T23:59:59Z")
            }
        });

        res.json(orders); // Schickt die Daten als echtes JSON
    } catch (err) {
        console.error("Statistik-Abfrage fehlgeschlagen:", err);
        res.status(500).send("Server-Fehler");
    }
});


app.get('/api/get-menu-structure', async (req, res) => {
    try {
        // Wir holen alle erledigten Bestellungen
        const orders = await Order.find({ status: 'erledigt' });
        
        let categories = {};

        orders.forEach(order => {
            order.details.forEach(item => {
                const cat = item.kategorie || "UNSORTIERT";
                const name = item.artikel || item.name;
                
                if (!categories[cat]) categories[cat] = new Set();
                categories[cat].add(name);
            });
        });

        // Umwandeln in das Format für buildMenuFilter
        let menuFormat = [];
        for (let cat in categories) {
            menuFormat.push({ type: 'header', name: cat });
            categories[cat].forEach(prod => {
                menuFormat.push({ type: 'product', name: prod, parent: cat });
            });
        }

        res.json(menuFormat);
    } catch (err) {
        res.status(500).json([]);
    }
});


app.get('/api/get-fixed-menu', async (req, res) => {
    try {
        // Wir suchen das EINE Dokument, das deine Speisekarte enthält
        const menuDoc = await OrderMenu.findOne({ type: "order_menu" });
        
        if (menuDoc && menuDoc.items) {
            console.log(`Menü-Abfrage: ${menuDoc.items.length} Elemente im Array gefunden.`);
            res.json(menuDoc.items); // Wir schicken nur den INHALT des Arrays
        } else {
            console.log("Menü-Abfrage: Dokument oder Items-Array nicht gefunden.");
            res.json([]);
        }
    } catch (err) {
        console.error("Fehler beim Laden der Speisekarte:", err);
        res.status(500).json([]);
    }
});




//app.listen(3000, () => {
//    console.log("Server laeuft auf Port 3000");
//});

/*
//für render erforderlich
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {  //server hört nicht nur "interne" Anfragen
    console.log(`Server läuft auf Port ${PORT}`);
});
*/


// START
const PORT = process.env.PORT || 10000;
//app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
// Füge '0.0.0.0' als Host-Argument hinzu
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server läuft auf allen Schnittstellen am Port ${PORT}`);
});

