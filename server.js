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
    dauer: { type: String, default: null },	
	
	// --- DIESE VIER FELDER MÜSSEN NEU REIN ---
    needsPizzaReady: { type: Boolean, default: false },
    needsDrinksReady: { type: Boolean, default: false },
    pizzaReady: { type: Boolean, default: false },
    drinksReady: { type: Boolean, default: false },
	
	coords: {
        lat: { type: mongoose.Schema.Types.Mixed, default: null },
        lng: { type: mongoose.Schema.Types.Mixed, default: null },
        distanz: { type: Number, default: 0 } 
    },
    erstelltAm: { type: Date, default: Date.now },
	erledigtAm: { type: Date },
	zeitAngenommen: { type: Date },     // NEU
	dauerAbholung: { type: Number, default: 0 }, // Die eingegebenen Minuten
	adresse: {
        vorname: String,
        nachname: String,
        telefon: String
    }		
});
const Order = mongoose.model('Order', orderSchema, 'orders');


//Websocket Gast
//===================
//Die Bar klickt auf "Annehmen". Es wird nur ein Teil der Bestellung (Status & Zeit) geändert ("geflickt")
//--------------------------------------------------------------------------------------------------------
// 2. API Endpunkt für die Bar zum Annehmen
app.patch('/api/orders/:id/accept', async (req, res) => {
    try {
        const { id } = req.params;
        const { dauer } = req.body;

        const updatedOrder = await Order.findByIdAndUpdate(
            id,
            { status: 'angenommen',
			  dauerAbholung: dauer,      // Geschätzte Zeit speichern
              zeitAngenommen: new Date() // Jetzt-Zeitpunkt speichern
			},
            { new: true }
        );


		// --- DIESE ZEILE MUSS HIER REIN ---
        // Informiert alle anderen Bar-Monitore über den neuen Status und die Zeit
        io.to('bar-room').emit('bestellung-aktualisiert');


        // WebSocket Event an den Gast senden
        // Wir senden es an einen "Raum", der den Namen der Order-ID hat
        io.to(id).emit('order_confirmed', { orderId: id, dauer: dauer });

        res.json(updatedOrder);
    } catch (err) {
        res.status(500).send("Fehler beim Speichern");
    }
});

// 3. WebSocket Logik für Gast-Registrierung
io.on('connection', (socket) => {
    // Gast meldet sich an, um Updates für seine ID zu hören
    socket.on('join_order_room', (orderId) => {
        socket.join(orderId);
        console.log(`Gast hört nun auf Order-ID: ${orderId}`);
    });
});


//Ende //Websocket Gast


// --- 4. WEBSOCKET LOGIK ---
io.on('connection', (socket) => {
   
   
   // NEU: Den Herzschlag empfangen und ignorieren
    socket.on('heartbeat', () => {
        // Wir machen hier gar nichts. 
        // Der reine Datenaustausch hält Render davon ab, die Leitung zu puffern.
    });


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
//**************************************
//Webseite Daten holen
//=========================
app.get('/api/data', async (req, res) => {
    try {
        // .lean() hinzugefügt -> Viel schnelleres Laden der Speisekarte
        let data = await DataModel.findOne({ type: "main_data" }).lean() || await DataModel.findOne({}).lean();
        if (!data) return res.json({ start: { img: "start.jpg", textDE: "Willkommen", textIT: "Benvenuti" }, pizzas: [], events: [], tv: [] });
        res.json(data);
    } catch (e) { res.status(500).json({ error: "Fehler" }); }
});


//Webseite Daten hochladen  process.env.PW_WEBSEITE
//=========================
app.post('/api/data', async (req, res) => {
    if (req.query.pw !== 'leon2208') return res.status(403).json({ error: "Falsches Passwort" });
    try {
        // Hier KEIN .lean(), da wir Daten schreiben
        await DataModel.findOneAndUpdate({ type: "main_data" }, req.body, { upsert: true });
        res.json({ status: "Erfolg" });
    } catch (e) { res.status(500).send(e); }
});


//Ein Werkzeug, das automatisch Bildhöhen korrigiert, falls Handy-Bilder falsch angezeigt werden.
//==================================================
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




/*Sicherung 15.04.2026   für sicherung.html
***********************************************************/
// --- TEST SCHEMA ---
const test1Schema = new mongoose.Schema({
    name: String,
    datum: { type: Date, default: Date.now },
    notiz: String
}, { strict: false });
const Test1 = mongoose.model('Test1', test1Schema, 'test1');

// Hilfs-Route: Testdaten erstellen (damit überhaupt was in der DB ist)
/*app.get('/api/create-test-data', async (req, res) => {
    try {
        await Test1.create({ name: "Test-Eintrag " + Date.now(), notiz: "Funktioniert!" });
        res.send("Testdatensatz erstellt!");
    } catch (e) { res.status(500).send(e.message); }
});*/


// --- SICHERUNG & RESTORE MODUL (15.04.2026) ---
// In server.js
app.post('/api/sicherung-login', (req, res) => {
    const { password } = req.body;
    // Prüft gegen .env Variable ADMIN_PW
    if (password === process.env.PW_STATISTIK) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});



// 1. Die HTML-Seite aufrufbar machen (keine Daten)
app.get('/sicherung', (req, res) => res.sendFile(path.join(__dirname, 'public','bestelle1','sicherung.html')));

/*
// 2. Hilfs-Route für Testdaten
app.get('/api/create-test-data', async (req, res) => {
    try {
        await Test1.create({ name: "Test " + new Date().toLocaleTimeString(), notiz: "Sicherung ok" });
        res.send("Testdatensatz erstellt!");
    } catch (e) { res.status(500).send(e.message); }
});
*/

// 3. Der Backup-Endpunkt (Sammelt alles ein) pizzadatas, orders, ordermenus (u. test1) mit checkbox auswählen
//-------------------------
app.get('/api/backup-full', async (req, res) => {
    if (req.query.pw !== process.env.PW_STATISTIK) return res.status(403).send("Falsches PW");
    try {
        const [pizzas, orders, menus, tests] = await Promise.all([
            DataModel.find({}).lean(),
            Order.find({}).lean(),
            OrderMenu.find({}).lean(),
            Test1.find({}).lean()
        ]);
        res.json({ pizzadatas: pizzas, orders, ordermenus: menus, test1: tests, exportDatum: new Date().toISOString() });
    } catch (e) { res.status(500).send(e.message); }
});

// 4. Der Restore-Endpunkt (Spielt gezielt ein)
//--------------------------------------------------
app.post('/api/restore-full', async (req, res) => {
    if (req.query.pw !== process.env.PW_STATISTIK) return res.status(403).json({ error: "Falsches PW" });
    try {
        const data = req.body;
        const clean = (arr) => arr.map(item => { const { _id, ...rest } = item; return rest; });
        let report = [];

        if (data.pizzadatas) { await DataModel.deleteMany({}); if(data.pizzadatas.length) await DataModel.insertMany(clean(data.pizzadatas)); report.push("Pizzen"); }
        if (data.orders) { await Order.deleteMany({}); if(data.orders.length) await Order.insertMany(clean(data.orders)); report.push("Bestellungen"); }
        if (data.ordermenus) { await OrderMenu.deleteMany({}); if(data.ordermenus.length) await OrderMenu.insertMany(clean(data.ordermenus)); report.push("Menü"); }
        if (data.test1) { await Test1.deleteMany({}); if(data.test1.length) await Test1.insertMany(clean(data.test1)); report.push("Test1"); }

        res.json({ status: "Erfolgreich für: " + report.join(", ") });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


/*Ende Sicherung 15.04.2026*/
//*****************************************




//BESTELLSYSTEM
//**************************************

// Menuekarte laden
//------------------------------------------
// --- 8. API: BESTELLSYSTEM ---
app.get('/api/order-menu', async (req, res) => {
    try {
        // .lean() hinzugefügt
        const menu = await OrderMenu.findOne({ type: "order_menu" }).lean();
        res.json(menu ? menu.items : []);
    } catch (err) { res.status(500).send("Fehler"); }
});

// Gast schickt Bestellung ab
//--------------------------------
app.post('/api/orders', async (req, res) => {
    try {
        const neueBestellung = new Order(req.body);
        // Speichere die Bestellung in der Datenbank
        const savedOrder = await neueBestellung.save();
        
        // Sende die neue Bestellung sofort an den Bar-Monitor
        io.to('bar-room').emit('neue-bestellung', savedOrder);
        
        // WICHTIG: Sende die orderId zurück an den Gast (Frontend)
        // Ohne dieses 'orderId: savedOrder._id' kann das Frontend nicht auf Bestätigung warten!
        res.status(201).json({ 
            status: "ok", 
            orderId: savedOrder._id 
        });
    } catch (err) {
        console.error("Fehler beim Erstellen der Bestellung:", err);
        res.status(500).send("Fehler");
    }
});


//Die Bar klickt auf "Annehmen". Es wird nur ein Teil 
//der Bestellung (Status & Zeit) geändert ("geflickt").
//---------------------------------------------------


app.get('/api/get-orders', async (req, res) => {
    const clientPw = req.headers['x-bar-pw'];
    const correctPw = process.env.PW_BAR;

    // 1. Basis-Check (Passwort vorhanden?)
    if (!clientPw || clientPw === 'null' || clientPw === 'undefined') {
        return res.json([]); 
    }

    // 2. Passwort-Check
    if (clientPw !== correctPw) {
        return res.status(403).json({ error: "Falsches Passwort" });
    }

    try {
        // --- NEU: DIE 20-STUNDEN-SPERRE ---
        const zeitLimit = new Date();
        zeitLimit.setHours(zeitLimit.getHours() - 20); 

        // Wir suchen Bestellungen, die:
        // - Entweder den Status 'neu' oder 'angenommen' haben
        // - UND nicht älter als 20 Stunden sind
        const orders = await Order.find({ 
            status: { $in: ['neu', 'angenommen'] },
            erstelltAm: { $gte: zeitLimit } // Nur Daten ab (Greater Than or Equal) zeitLimit
        }).sort({ erstelltAm: 1 }).lean();
        
        res.json(orders);
    } catch (err) { 
        console.error("Fehler:", err);
        res.status(500).json([]); 
    }
});

// Das Passwort aus der .env
const PW_MENU = process.env.PW_MENU;

// 2. DAS SPEICHERN (Nur für den Admin-Button)
app.put('/api/order-menu', async (req, res,pw) => {
    // Falls du das Passwort im Frontend mitschickst:
    // const { items, pw } = req.body;
    if (pw !== PW_MENU) return res.status(403).send("Falsches Passwort");
	
	const { items } = req.body; 
	
	try {
        // Hier speicherst du das Menü. 
        // Oft wird eine einzige "Menu"-Dokument-Instanz genutzt, die das Array 'items' enthält
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

//Die Bar klickt auf "Erledigt". Die Bestellung wird archiviert und die Zeit berechnet.
//---------------------------------------------------------------------------------------
app.patch('/api/orders/:id/done', async (req, res) => {
    try {
        // 1. Erst die Bestellung finden, um das Erstellungsdatum zu haben
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).send("Bestellung nicht gefunden");

        const jetzt = new Date();
        
        // 2. Dauer berechnen: (Jetzt - Erstellt) / 1000ms / 60s
        const diffMs = jetzt - order.erstelltAm;
        const diffMins = Math.round(diffMs / 60000);

        // 3. Update ausführen
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id, 
            { 
                status: 'erledigt', 
                erledigtAm: jetzt,
                dauer: diffMins.toString() // Speichert z.B. "15" als String in 'dauer'
            }, 
            { new: true }
        ).lean();
		
		// --- DIESE ZEILE HINZUFÜGEN ---
        // Informiert alle verbundenen Bar-Monitore, dass sich etwas geändert hat
        io.to('bar-room').emit('bestellung-aktualisiert');
		
		

        res.json(updatedOrder);
    } catch (err) { 
        console.error("Fehler beim Abschließen:", err);
        res.status(500).send("Fehler"); 
    }
});


// GPS-Daten vom Gast empfangen und DB aktualisieren
app.post('/api/update-coords', async (req, res) => {
    try {
        const { orderId, coords } = req.body;

        await Order.findByIdAndUpdate(orderId, { 
            coords: {
                lat: coords.lat,
                lng: coords.lng,
                distanz: coords.distanz
            }
        });

        // Alle Bar-Clients informieren, damit die Anzeige aktualisiert wird
        io.emit('neue-bestellung'); 
        res.sendStatus(200);
    } catch (err) {
        console.error("Fehler beim GPS-Update:", err);
        res.status(500).send("Fehler");
    }
});




// In server.js   bar.html neu, angenommen,erledigt
app.post('/api/orders/manual', async (req, res) => {
    try {
        // Wir nutzen das Mongoose Model 'Order'
        const newOrder = new Order(req.body);
        await newOrder.save();
        
        res.status(201).json({ success: true });
    } catch (err) {
        console.error("Fehler bei manueller Bestellung:", err);
        res.status(500).json({ error: "Datenbankfehler" });
    }
});

// Massen-Update Endpunkt
app.patch('/api/orders/bulk-update', async (req, res) => {
    try {
        const { von, bis, status } = req.body;

        if (!von || !bis || !status) {
            return res.status(400).json({ error: "Fehlende Parameter" });
        }

        // Filter erstellen
        const filter = {
            erstelltAm: {
                $gte: new Date(von),
                $lte: new Date(bis)
            }
        };

        // Mongoose UpdateMany nutzen
        const result = await Order.updateMany(filter, { 
            $set: { status: status } 
        });

        console.log(`Massen-Update erfolgreich: ${result.modifiedCount} Dokumente geändert.`);
        res.json({ success: true, modifiedCount: result.modifiedCount });

    } catch (err) {
        console.error("Bulk Update Error:", err);
        res.status(500).json({ error: "Serverfehler beim Massen-Update" });
    }
});



// NEU: Bestellung stornieren
app.patch('/api/orders/:id/cancel', async (req, res) => {
    try {
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id, 
            { status: 'storniert' }, 
            { new: true }
        ).lean();
        
        // Bar-Monitore informieren
        io.to('bar-room').emit('bestellung-aktualisiert');
        
        res.json(updatedOrder);
    } catch (err) { 
        res.status(500).send("Fehler beim Stornieren"); 
    }
});
//bar 2 Buttons Getränke Pizza
app.patch('/api/orders/:id/part-ready', async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.body; // 'pizza' oder 'drinks'
        
        const update = {};
        if (type === 'pizza') update.pizzaReady = true;
        if (type === 'drinks') update.drinksReady = true;

        // 1. Update das Teil-Feld
        const order = await Order.findByIdAndUpdate(id, update, { new: true });

        // 2. Logik: Prüfen ob alles fertig ist
        // Eine Bestellung ist komplett fertig, wenn:
        // - Pizza gebraucht wurde UND fertig ist (oder gar keine Pizza gebraucht wurde)
        // UND
        // - Getränke gebraucht wurden UND fertig sind (oder gar keine Getränke gebraucht wurden)
        const pizzaDone = !order.needsPizzaReady || order.pizzaReady;
        const drinksDone = !order.needsDrinksReady || order.drinksReady;

        if (pizzaDone && drinksDone) {
            order.status = 'erledigt'; // Oder dein Status für "Verschwinden"
            await order.save();
        }

        // 3. Socket-Signal senden (damit alle Dashboards sofort updaten)
        if (typeof io !== 'undefined') {
            io.emit('bestellung-aktualisiert'); 
        }

        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



/*
// Server-seitig (Beispiel): Wenn Gast Koordinaten sendet
app.post('/api/update-coords', async (req, res) => {
    const { orderId, coords } = req.body;
    await Order.findByIdAndUpdate(orderId, { coords });
    
    // WICHTIG: Bar informieren, damit die Distanz dort aufpoppt
    io.emit('neue-bestellung'); 
    res.sendStatus(200);
});
*/


//Ruft erledigte Bestellungen für einen Zeitraum ab.  process.env.PW_HISTORY
//-------------------------------------------------
// Beispiel für die Einbindung in dein Node.js Backend (Express + MongoDB/NeDB)
// --- HISTORIE ABFRAGEN (FIXED) ---
/*app.get('/api/get-history', async (req, res) => {
    try {
        const { von, bis } = req.query;

        if (!von || !bis) {
            return res.status(400).json({ error: "Zeitraum fehlt" });
        }

        // Wir nutzen das Mongoose-Model 'Order' (wie im Rest deiner App)
        // Wir suchen Bestellungen zwischen VON und BIS
        const docs = await Order.find({
            erstelltAm: { 
                $gte: new Date(von), 
                $lte: new Date(bis) 
            }
        }).sort({ erstelltAm: -1 }).lean();

        // WICHTIG: Immer als JSON antworten
        res.json(docs); 
        
    } catch (err) {
        console.error("Datenbankfehler bei Historie:", err);
        res.status(500).json({ error: "Fehler beim Laden der Historie" });
    }
});*/
app.get('/api/get-history', async (req, res) => {
    const { von, bis, pw } = req.query;
    const absolutLimit = new Date();
    absolutLimit.setHours(absolutLimit.getHours() - 20); // Die 20-Stunden-Sperre

    let filter = {};

    // FALL 1: Der Chef fragt ab (voller Zugriff auf alle Daten)
    if (pw === process.env.PW_STATISTIK) {
        if (von && bis) {
            filter.erstelltAm = { 
                $gte: new Date(von), 
                $lte: new Date(new Date(bis).setHours(23, 59, 59)) 
            };
        }
    } 
    // FALL 2: Der Kellner fragt ab (PW_BAR)
   else if (pw === process.env.PW_BAR) {
        // 1. Das absolute Limit (jetzt minus 20h)
        const absolutLimit = new Date();
        absolutLimit.setHours(absolutLimit.getHours() - 20);

        // 2. Start- und Enddatum festlegen
        let startDatum = von ? new Date(von) : absolutLimit;
        let endDatum = bis ? new Date(new Date(bis).setHours(23, 59, 59)) : new Date();

        // 3. SICHERHEIT: Kellner darf niemals weiter zurück als 20h
        if (startDatum < absolutLimit) {
            startDatum = absolutLimit;
        }
        
        // Falls der Kellner ein Enddatum wählt, das vor dem 20h-Limit liegt, 
        // würde er gar nichts finden (das ist korrekt).

        filter.erstelltAm = { 
            $gte: startDatum, 
            $lte: endDatum 
        };
   }
    else {
        return res.status(403).json({ error: "Falsches Passwort" });
    }

    try {
        const orders = await Order.find(filter).sort({ erstelltAm: -1 }).lean();
        
		// NEU: Wir bestimmen die Rolle basierend auf dem Passwort, das oben geprüft wurde
        const role = (pw === process.env.PW_STATISTIK) ? 'chef' : 'kellner';
			
		// Wir schicken jetzt ein Objekt statt nur das Array
        res.json({
            success: true,
            role: role,
            orders: orders
        });
		
    } catch (err) {
        res.status(500).json([]);
    }
});





//Zieht absolut alle Daten für die Grafik-Auswertung (Umsatz etc.).  process.env.PW_STATISTIK
// für statistik
//--------------------------------------------------------------------
// --- 1. ROUTE FÜR DIE STATISTIK-DATEN ---
app.get('/api/get-all-orders', async (req, res) => {
    try {	
	
		
		const { von, bis,pw} = req.query;	
		
		if (pw !== process.env.PW_STATISTIK) { 
            return res.status(403).send("Nicht autorisiert"); 
        }
		
		
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


// BAR Paasswort
app.post('/api/login-bar', (req, res) => {
    const { password } = req.body;
    const correctPassword = process.env.PW_BAR;

    if (password === correctPassword) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Falsches Passwort' });
    }
});


//Damit der Gast seinen Status abfragen kann, braucht der Server eine Route, um eine einzelne Bestellung anhand ihrer ID zu finden
//Tabwechsel beim Handy, neuerliche Nachfrage beim Server
app.get('/api/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).lean();
        if (!order) return res.status(404).send("Nicht gefunden");
        res.json(order);
    } catch (err) {
        res.status(500).send("Fehler");
    }
});








// --- 9. SERVER START FUNKTION ---
function startServer() {
    const PORT = process.env.PORT || 10000;
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server läuft auf Port ${PORT}`);
    });
}

//http://localhost:10000/api/delete-orders-range?von=2026-01-01&bis=2026-04-13T23:59:59&pw
app.get('/api/delete-orders-range', async (req, res) => {
//app.delete('/api/delete-orders-range', async (req, res) => {
    // Parameter aus der URL holen: ?von=...&bis=...&pw=...
    const { von, bis, pw } = req.query;

    // 1. Passwort-Sicherung (Nutzt deine PW_MENU Variable)
    if (pw !== process.env.PW_STATISTIK) {
        return res.status(403).json({ success: false, message: "Nicht autorisiert!" });
    }

    // 2. Validierung
    if (!von || !bis) {
        return res.status(400).json({ success: false, message: "Zeitraum fehlt (von/bis)." });
    }

    try {
        // 3. Löschbefehl ausführen  (Collection Order)
        const result = await Order.deleteMany({
            erstelltAm: {
                $gte: new Date(von), // "von" (inklusive)
                $lte: new Date(bis)  // "bis" (inklusive)
            }
        });

        console.log(`🧹 Cleanup: ${result.deletedCount} Bestellungen gelöscht.`);
        
        res.json({ 
            success: true, 
            deletedCount: result.deletedCount, 
            message: `Erfolgreich ${result.deletedCount} Bestellungen gelöscht.` 
        });

    } catch (err) {
        console.error("Fehler beim Löschen:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});



// Funktion zum Anonymisieren alter Bestelldaten
async function cleanupGuestData() {
    const vierundzwanzigStundenAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
        const result = await mongoose.model('Order').updateMany(
            { 
                erstelltAm: { $lt: vierundzwanzigStundenAgo }, 
                $or: [
                    { "adresse.vorname": { $ne: null } },
                    { "adresse.telefon": { $ne: null } }
                ]
            },
            { 
                $set: { 
                    "adresse.vorname": "---", 
                    "adresse.nachname": "---", 
                    "adresse.telefon": "gelöscht" 
                } 
            }
        );
        if (result.modifiedCount > 0) {
            console.log(`DSGVO Cleanup: ${result.modifiedCount} Adressdaten anonymisiert.`);
        }
    } catch (err) {
        console.error("Fehler beim DSGVO Cleanup:", err);
    }
}

// Alle 6 Stunden ausführen (21600000 ms)
setInterval(cleanupGuestData, 21600000);