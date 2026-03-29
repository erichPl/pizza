require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// --- 1. MIDDLEWARE (Reihenfolge optimiert für Speed) ---
// Zuerst statische Dateien, damit Bilder/CSS sofort laden
app.use(express.static('public')); 
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health-Check
app.get('/healthz', (req, res) => res.status(200).send('OK'));

// --- 2. MONGODB VERBINDUNG (Pre-Warming) ---
const mongoURI = process.env.MONGO_URI;
const connectionOptions = {
    maxPoolSize: 10, // Hält Leitungen offen für schnellere Abfragen
    serverSelectionTimeoutMS: 5000
};

mongoose.connect(mongoURI, connectionOptions)
    .then(() => {
        console.log("==> MongoDB verbunden & vorgewärmt!");
        startServer();
    })
    .catch(err => console.error("Verbindungsfehler:", err));

// --- 3. DATEN-SCHEMAS ---
const DataSchema = new mongoose.Schema({
    type: { type: String, default: "main_data" },
    start: { img: String, textDE: String, textIT: String, zeiten: Array },
    pizzas: Array,
    events: Array,
    tv: Array
}, { strict: false });
// WICHTIG: Expliziter Kollektion-Name 'pizzadatas'
const DataModel = mongoose.model('PizzaData', DataSchema, 'pizzadatas');

const menuSchema = new mongoose.Schema({
    type: { type: String, default: "order_menu" },
    items: Array,
    isGeolocation: { type: Boolean, default: false }
}, { strict: false });
const OrderMenu = mongoose.model('OrderMenu', menuSchema, 'ordermenus');

const orderSchema = new mongoose.Schema({
    tisch: String,
    details: Array,
    gesamtpreis: Number,
    zeit: String,
    status: { type: String, default: 'neu' },
    coords: {
        lat: { type: mongoose.Schema.Types.Mixed, default: null },
        lng: { type: mongoose.Schema.Types.Mixed, default: null },
        distanz: { type: Number, default: 0 } 
    },
    erstelltAm: { type: Date, default: Date.now },
    erledigtAm: { type: Date } 
});
const Order = mongoose.model('Order', orderSchema, 'orders');

// --- 4. WEBSOCKET LOGIK ---
io.on('connection', (socket) => {
    socket.on('join-bar', () => {
        socket.join('bar-room');
        console.log("Bar-Monitor verbunden.");
    });
});

// --- 5. HTML ROUTEN ---
app.get('/gast', (req, res) => res.sendFile(path.join(__dirname, 'public','bestelle1','gast.html')));
app.get('/bar', (req, res) => res.sendFile(path.join(__dirname, 'public','bestelle1','bar.html')));
app.get('/statistik', (req, res) => res.sendFile(path.join(__dirname, 'public','bestelle1','statistik.html')));
app.get('/menue', (req, res) => res.sendFile(path.join(__dirname, 'public','bestelle1','menue.html')));
app.get('/qr', (req, res) => res.sendFile(path.join(__dirname, 'public','bestelle1','qrCode.html')));

// --- 6. API: WEBSEITE (PIZZERIA) ---
app.get('/api/data', async (req, res) => {
    try {
        // .lean() hinzugefügt -> Viel schnelleres Laden der Speisekarte
        let data = await DataModel.findOne({ type: "main_data" }).lean() || await DataModel.findOne({}).lean();
        if (!data) return res.json({ start: { img: "start.jpg", textDE: "Willkommen", textIT: "Benvenuti" }, pizzas: [], events: [], tv: [] });
        res.json(data);
    } catch (e) { res.status(500).json({ error: "Fehler" }); }
});

app.post('/api/data', async (req, res) => {
    if (req.query.pw !== 'leon2208') return res.status(403).json({ error: "Falsches Passwort" });
    try {
        // Hier KEIN .lean(), da wir Daten schreiben
        await DataModel.findOneAndUpdate({ type: "main_data" }, req.body, { upsert: true });
        res.json({ status: "Erfolg" });
    } catch (e) { res.status(500).send(e); }
});

app.get('/api/fix-all-heights', async (req, res) => {
    if (req.query.pw !== 'leon2208') return res.status(403).send("Falsches PW");
    try {
        // Hier KEIN .lean(), da wir danach data.save() aufrufen!
        const data = await DataModel.findOne({ type: "main_data" }) || await DataModel.findOne({});
        if (!data) return res.send("Keine Daten gefunden.");
        const addHeight = (arr) => {
            if (!Array.isArray(arr)) return arr;
            return arr.map(item => ({...item, imgHeightHandy: item.imgHeightHandy || 100}));
        };
        data.tv = addHeight(data.tv); data.pizzas = addHeight(data.pizzas); data.events = addHeight(data.events);
        await data.save();
        res.send("Update erfolgreich!");
    } catch (e) { res.status(500).send(e.message); }
});

// --- 7. API: BACKUP & RESTORE ---
app.get('/api/backup-download', async (req, res) => {
    if (req.query.pw !== 'leon2208') return res.status(403).send("Falsches PW");
    try {
        // .lean() hinzugefügt -> Export geht schneller
        const allData = await DataModel.find({}).lean();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=mongodb_backup.json');
        res.send(JSON.stringify(allData, null, 2));
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/restore-upload', async (req, res) => {
    if (req.query.pw !== 'leon2208') return res.status(403).send("Falsches PW");
    try {
        await DataModel.deleteMany({});
        const cleanedData = req.body.map(item => { const { _id, ...rest } = item; return rest; });
        await DataModel.insertMany(cleanedData);
        res.json({ status: "Restore erfolgreich" });
    } catch (e) { res.status(500).send(e.message); }
});

// --- 8. API: BESTELLSYSTEM ---
app.get('/api/order-menu', async (req, res) => {
    try {
        // .lean() hinzugefügt
        const menu = await OrderMenu.findOne({ type: "order_menu" }).lean();
        res.json(menu ? menu.items : []);
    } catch (err) { res.status(500).send("Fehler"); }
});

app.post('/api/orders', async (req, res) => {
    try {
        const neueBestellung = new Order(req.body);
        await neueBestellung.save();
        io.to('bar-room').emit('neue-bestellung', neueBestellung);
        res.status(201).json({ status: "ok" });
    } catch (err) { res.status(500).send("Fehler"); }
});

app.get('/api/get-orders', async (req, res) => {
    try {
        // .lean() hinzugefügt
        const orders = await Order.find({ status: 'neu' }).sort({ erstelltAm: 1 }).lean();
        res.json(orders);
    } catch (err) { res.status(500).send("Fehler"); }
});

// 2. DAS SPEICHERN (Nur für den Admin-Button)
app.put('/api/order-menu', async (req, res) => {
    try {
        const { items } = req.body; 
        await OrderMenu.findOneAndUpdate(
            { type: "order_menu" }, 
            { items: items }, 
            { upsert: true } // Erstellt das Dokument, falls es das erste Mal ist
        );
        res.json({ success: true });
    } catch (err) { 
        res.status(500).send("Fehler beim Speichern"); 
    }
});


app.patch('/api/orders/:id/done', async (req, res) => {
    try {
        // findByIdAndUpdate gibt standardmäßig ein Mongoose-Dokument zurück, 
        // hier ist .lean() oft nicht nötig, aber schadet auch nicht.
        const updatedOrder = await Order.findByIdAndUpdate(req.params.id, { status: 'erledigt', erledigtAm: new Date() }, { new: true }).lean();
        res.json(updatedOrder);
    } catch (err) { res.status(500).send("Fehler"); }
});

/*
app.get('/api/get-history', async (req, res) => {
    try {
        // .lean() hinzugefügt -> Statistik lädt schneller
        const history = await Order.find({ status: 'erledigt' }).sort({ erledigtAm: -1 }).lean();
        res.json(history);
    } catch (err) { res.status(500).send("Fehler"); }
});

*/



// --- 1. ROUTE FÜR DIE STATISTIK-DATEN ---
app.get('/api/get-all-orders', async (req, res) => {
    try {
        const { von, bis } = req.query;
        
        // Wir suchen alle Bestellungen im Zeitraum
        // .lean() für Speed, da die Statistik viele Daten verarbeitet
        const orders = await Order.find({
            erstelltAm: { 
                $gte: new Date(von), 
                $lte: new Date(new Date(bis).setHours(23,59,59)) 
            }
        }).lean();

        res.json(orders);
    } catch (err) {
        console.error("Fehler bei get-all-orders:", err);
        res.status(500).send("Serverfehler");
    }
});

// --- 2. ROUTE FÜR DIE MENÜ-FILTER (CHECKBOXEN) ---
app.get('/api/get-fixed-menu', async (req, res) => {
    try {
        // Holt das Menü aus der Kollektion 'ordermenus'
        const menu = await OrderMenu.findOne({ type: "order_menu" }).lean();
        res.json(menu ? menu.items : []);
    } catch (err) {
        res.status(500).send("Fehler beim Laden des Menü-Filters");
    }
});




// Variable für die Einstellungen (vorerst im Arbeitsspeicher, später DB möglich)
let systemSettings = { isGeolocation: false };

// 1. Einstellungen abrufen
app.get('/api/get-settings', (req, res) => {
    res.json(systemSettings);
});

// 2. Einstellungen speichern
app.post('/api/save-settings', (req, res) => {
    if (req.body && typeof req.body.isGeolocation === 'boolean') {
        systemSettings.isGeolocation = req.body.isGeolocation;
        console.log("System-Einstellungen aktualisiert:", systemSettings);
        res.json({ success: true, settings: systemSettings });
    } else {
        res.status(400).json({ error: "Ungültige Daten" });
    }
});














// --- 9. SERVER START FUNKTION ---
function startServer() {
    const PORT = process.env.PORT || 10000;
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server läuft auf Port ${PORT}`);
    });
}