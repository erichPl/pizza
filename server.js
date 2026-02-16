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
        let data = await DataModel.findOne({ type: "main_data" });
        if (!data) data = { start: {}, pizzas: [], events: [], tv: [] };
        res.json(data);
    } catch (e) { res.status(500).send(e); }
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


