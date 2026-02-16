const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// DIE FEHLENDE VERBINDUNG:
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("==> MongoDB verbunden!"))
    .catch(err => console.error("Verbindungsfehler:", err));

// DATEN-SCHEMA
const DataSchema = new mongoose.Schema({
    type: { type: String, default: "main_data" },
    start: { img: String, textDE: String, textIT: String },
    pizzas: Array,
    events: Array,
    tv: Array
});
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
    try {
        await DataModel.findOneAndUpdate({ type: "main_data" }, req.body, { upsert: true });
        res.json({ status: "Erfolg" });
    } catch (e) { res.status(500).send(e); }
});

// START
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));



