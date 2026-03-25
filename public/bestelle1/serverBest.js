require('dotenv').config(); // LÄDT DIE .env DATEI
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// --- BITTE NUR HIER DEINE URL EINTRAGEN ---
const mongoURI =  process.env.MONGO_URI;

mongoose.connect(mongoURI)
    .then(() => console.log("MongoDB verbunden"))
    .catch(err => console.error("MongoDB Fehler:", err));

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

app.get('/admin-editor', (req, res) => {
    if (req.query.pw !== 'leon2208') return res.status(403).send("Zugriff verweigert");
    res.sendFile(path.join(__dirname, 'adminNode.html'));
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



app.listen(3000, () => {
    console.log("Server laeuft auf Port 3000");
});
