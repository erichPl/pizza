const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

const DATA_FILE = path.join(__dirname, 'data.json');

// Initialdaten falls Datei fehlt
if (!fs.existsSync(DATA_FILE)) {
    const initial = { 
        start: { img: "start.jpg", textDE: "Willkommen!", textIT: "Benvenuti!" },
        pizzas: [], events: [], tv: [] 
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
}

app.get('/api/data', (req, res) => {
    res.sendFile(DATA_FILE);
});

app.post('/api/data', (req, res) => {
    fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2), (err) => {
        if (err) return res.status(500).send("Fehler");
        res.send({ status: "ok" });
    });
});

// Absolute Pfade sicherstellen
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Explizite Route für die Startseite
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});
app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));
