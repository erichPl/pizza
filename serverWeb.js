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

// START
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));


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
