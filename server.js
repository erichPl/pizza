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


