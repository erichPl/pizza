
// true = Preise werden angezeigt (Abholung), false = Preise ausgeblendet (Restaurant)
let showPricesInOrderCart = false;



let onlyPizza=true;

var isGeolocationActive=false;

// 1. Variablen ganz oben global definieren
let socket; 
let currentOrderId = null; // Wir speichern die ID für den Reconnect

// Variable außerhalb definieren!
let orderGesendet = false;

// Ganz oben in der Datei
var coords = {};
var adresse = {};

var menuCart = []; 
var extras = []; // Globaler Speicher für alle verfügbaren Extras
var currentCart = []; //Menuekarte mit den Mengen
var orderCart = []; //Warenkorb
var currentEditIndex = -1; // -1 bedeutet: Wir fügen gerade ein NEUES Produkt hinzu
var countTotal=0;
var orderDetails = { productId: null, size: "", variant: "",price: "",extras: [], without: [],extrasPrice: [] };

let pizzaKeywords=["PIZZA","KINDER PIZZA","PIZZE BIANCHE"];
let kinderpizzaKeyword="KINDER PIZZA";
let extraKeywords=["EXTRAS"];
let orderItems = {}; //Warenkorb	
var currentLang = 'de'; // 'de' oder 'it'

let tischNr="";

var editIndex=-1; //Wenn Ändern, damit sdas Zählen passt, wenn nicht Abbrechen ist ein urspüngliches im Warenkorb zu entfernen
var editProduct={};//Das Produkt iim Warenkorb wo Ändern aufgerufen wurde
var editWkId=-1;
let activPizzaBackup = {}; //für Abbrechen Selection
//let activePizza = null; // Globaler "Zwischenspeicher"

var suffix="";
var t={};


// Das branching-modal wird nie mit innerHTML überschrieben, nur sein Inhalt
document.getElementById('branching-modal').addEventListener('click', function(event) {
    // Prüfe, ob das geklickte Element (oder ein Kind davon) der Speicher-Button ist
    const saveBtn = event.target.closest('#btn-text-save');
    
    if (saveBtn) {
        event.preventDefault();
        //console.log("Speichern über Delegation ausgelöst");
        
        if (activePizza) {
            addProduct(activePizza);
            closeBranchModal();
            renderCart();
        }
    }
});



















const translations = {
    de: {
		//menue
		cart_title: "Tisch Nr.",		
        btnLeeren: "Leeren",
		btn_schliessen: "Schließen",
		btn_bestellen: "BESTELLE JETZT",
		btn_aendern: "Ändern",
			
		//warenkorb
        title: "MEINE BESTELLUNG",
        clear: "🗑️ leeren",
        close: "Schließen",
        order: "Jetzt bestellen",
        without: "Zutaten entfernen",
        extras: "Extras hinzufügen",
        edit: "Ändern",
        emptyConfirm: "Bestellung wirklich löschen?",
        // Neue Einträge für das Selection-Modal:
        cancel: "Verwerfen",
        save: "Bestaätigen",
        selectSize: "Bitte wählen Sie eine Größe!",
		successTitle: "Vielen Dank!",
        successMessage: "Deine Bestellung wurde erfolgreich abgeschickt.",
		modalProductName: ">Produkt anpassen",
		size: "Größe",
		pizzeria: "Pizzeria Pub St. Sisinius",
		adresse: "Vinschgaustraße 74 Laas (Bz) Tel. 389 833 4004",
		tisch: "Tisch ",
		abholung: "Abholung",
		saveChoose: "Pizza bestätigen",
		extrasSave: "Hinzufügen",
		withoutSave: "Entfernen",
		zurBestellung: "Zur Bestellung",
		vorname: "Vorname",
		nachname: "Nachname",
		telefon: "Telefon",
		deineDaten: "Deine Daten",
		zurWebseite: "Zur Webseite",
		verwerfen: "Verwerfen",
		bestaetigen: "Bestätigen",
		pizzaBestaetigen: "Pizza bestätigen",
		saveContact: "Jetzt bestellen",
	    cancelContact: "Zurück"
    },
    it: {
		//menue
		cart_title: "Tavolo n.",
        btnLeeren: "Svuota",
		btn_bestellen: "ORDINA ADESSO",
		btn_schliessen: "Chiudi",
		btn_aendern: "Modifica",	
		//warenkorb
        title: "IL MIO ORDINE",
        clear: "🗑️ svuota",
        close: "Chiudi",
        order: "Ordina ora",
        without: "Rimuovi ingredienti",
        extras: "Aggiungi extra",
        edit: "Modifica",
        emptyConfirm: "Vuoi veramente svuotare il carrello?",
        // Neue Einträge für das Selection-Modal:
        cancel: "Annulla",
        save: "Conferma",
        selectSize: "Per favore scegli una dimensione!",
		successTitle: "Grazie mille!",
        successMessage: "Il tuo ordine è stato inviato con successo.",
		modalProductName:">Adeguare il prodotto",
		size:"Misura",
		pizzeria: "Pizzeria Pub St. Sisinius",
		adresse: "Via Venosta 74 Lasa (Bz) Tel. 389 833 4004",
		tisch: "Tavolo",
		abholung: "Ritiro",
		saveChoose: "Conferma la pizza",
		extrasSave: "Aggiungere",
		withoutSave: "Rimuovere",
		zurBestellung:"Per ordinare",
		vorname: "Nome",
		nachname: "Cognome",
		telefon: "Telefono",
		deineDaten: "I tuoi dati",
		zurWebseite: "Al sito web",
		verwerfen: "Annulla",
		bestaetigen: "Conferma",
		pizzaBestaetigen: "Conferma la pizza",
		saveContact: "Ordina ora",
	    cancelContact: "Indietro"
    }
};


function changeLanguage(lang) {
    currentLang = lang;
    t = translations[currentLang];

    document.getElementById('pizzeria').innerText = t.pizzeria;
	document.getElementById('adresse').innerText = t.adresse;
	document.getElementById('tisch-view').innerText=t.tisch+" "+tischNr;
    if (tischNr=="Abholung"){
		document.getElementById('tisch-view').innerText=t.abholung;
	}
    //document.getElementById('selectionVariant').innerText = t.variant;
	document.getElementById('selectionSize').innerText = t.size;
	//document.getElementById('btnEditWk').innerText = t.edit;

    document.getElementById('btn-modal-cancel').innerText = t.verwerfen;
	document.getElementById('btn-modal-save').innerText = t.bestaetigen;
	document.getElementById('btnCartClearAll').innerText = t.btnLeeren;
	
	document.getElementById('success-title').innerText = t.successTitle;
	document.getElementById('success-message').innerText = t.successMessage;
	
	document.getElementById('btn-text-without').innerText = t.without;
	document.getElementById('btn-text-extras').innerText = t.extras;
	
	document.getElementById('btn-text-save').innerText = t.bestaetigen;
	//document.getElementById('btn-text-cancel').innerText = t.cancel;
	
	
	
    // Statische Texte in der Sidebar ändern
    document.getElementById('cartTitle').innerText = t.title;
    document.getElementById('btnCartClearAll').innerText = t.clear;
    document.getElementById('btnCartClose').innerText = t.cancel;
    document.getElementById('btnCartOrder').innerText = t.order;
		
	document.getElementById('vorname').innerText = t.vorname;	
	document.getElementById('nachname').innerText = t.nachname;	
	document.getElementById('telefon').innerText = t.telefon;
    document.getElementById('btnCancelContact').innerText = t.cancel;
	
	document.getElementById('deineDaten').innerText = t.deineDaten;
	document.getElementById('zurWebseite').innerText = t.zurWebseite;
	
	document.getElementById('btnSaveContact').innerText=t.saveContact;
	document.getElementById('btnCancelContact').innerText=t.cancelContact;
	
	//alert(tischNr);
	if(tischNr=="Abholung"){
		document.getElementById("btnCartOrder").innerText=t.zurBestellung;
	}
	
    if (currentLang=="de"){
		suffix="";
	}
	else{
		suffix="It";
	}
		
		
	renderMenu();
    // Warenkorb neu zeichnen, damit auch "Ohne", "Extras" und "Ändern" übersetzt werden  
	renderCart();
	
}


//changeLanguage('it');


// Beispiel für den Zugriff innerhalb der Schleife
//const suffix = (currentLang === 'it') ? 'It' : '';

function cl(obj){
	console.log(JSON.stringify(obj));
}
function al(obj){
	alert(JSON.stringify(obj));
}

function syncMenuQuantity_(productId, newQuantity) {
    // 1. Speicher im Hintergrund updaten (currentCart)
    let item = currentCart.find(p => p.id === productId);
    
    if (item) {
        item.quantity = newQuantity;
    } else if (newQuantity > 0) {
        // WICHTIG: Wenn neu, dann ins Array schieben!
        currentCart.push({ id: productId, quantity: newQuantity });
    }

    // 2. Sofort-Update im HTML
    // WICHTIG: Prüfe, ob deine IDs Zahlen oder Strings sind (productId)
    const targetItem = document.querySelector(`.item[data-id="${productId}"]`);
    
    if (targetItem) {
        const label = targetItem.querySelector('.qty-display');
        if (label) {
            label.innerText = newQuantity;
            console.log(`Update HTML für ${productId} auf ${newQuantity}`);
        }
    } else {
        console.warn(`HTML-Element für ID ${productId} nicht gefunden! Check data-id im Template.`);
    }
	renderCart();
}






 window.onload = async () => {
    // Falls init() in data.js die Daten erst holt/verarbeitet:
    await init();	
	//document.getElementById("btnCartOrder").innerText=t.zurBestellung;
    if(tischNr=="Abholung"){
		document.getElementById("btnCartOrder").innerText=t.zurBestellung;
	}
	initCartDisplay();
    // Jetzt erst rendern
    if (Object.keys(menuCart).length > 0) {
        renderMenu(menuCart);
    } else {
        console.error("menuCart ist immer noch leer.");
    }
};

function initCartDisplay() {
    const cartContainer = document.getElementById('cart-container');
    if (!showPricesInOrderCart) {
        cartContainer.classList.add('hide-cart-prices');
    } else {
        cartContainer.classList.remove('hide-cart-prices');
    }
}




function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    // Prüfen, ob jedes Element aus a auch in b vorkommt
    return a.every(val => b.includes(val));
}

function arraysEqualDopppelt(a, b) {
    if (a.length !== b.length) return false;

    // Kopieren (um die Originale nicht zu verändern) und sortieren
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();

    // Jetzt müssen die Elemente an exakt der gleichen Stelle stehen
    return sortedA.every((val, index) => val === sortedB[index]);
}







function getProductWk(product){
	let found = orderCart.find(p => 
	    p.id === product.id &&
		p.orderDetails.variant === product.orderDetails.variant && 
		p.orderDetails.size === product.orderDetails.size &&
		arraysEqual(p.orderDetails.extras, product.orderDetails.extras) &&
		arraysEqual(p.orderDetails.without, product.orderDetails.without) &&
		arraysEqual(p.orderDetails.extrasPrice, product.orderDetails.extrasPrice)
	);
	return found;	
}




function updateAllQuantities() {
    // 1. Zuerst alle Mengen im Menü auf 0 setzen
    menuCart.forEach(p => p.quantity = 0);
    countTotal = orderCart.reduce((sum, item) => sum + item.orderDetails.quantity, 0);
    // 2. Dann den Warenkorb durchgehen und für jede ID die Mengen addieren
    orderCart.forEach(item => {
        const productInMenu = menuCart.find(p => p.id === item.id);
        if (productInMenu) {
            productInMenu.quantity += item.orderDetails.quantity;
        }
    });
}


function cons(str,product){
	//console.log("A");
	//console.log("id: "+product.id);
	console.log(str+" id:"+product.id+" qty:"+product.quantity+" ordqty:"+product.orderDetails.quantity+" var:"+product.orderDetails.variant+" size:"+product.orderDetails.size+" extras:"+product.orderDetails.extras+" without:"+product.orderDetails.without);
}

function addProduct(product) {
	cons("hinzu:",product);
	product.orderDetails.quantity=0;
	if(editIndex!=-1){
        // editProduct.quantity--;
		 editProduct.orderDetails.quantity--;
		 //alert("epOdQ:"+editProduct.orderDetails.quantity);
		 //console.log("addProduct: editProduct"+JSON.stringify(editProduct)+" *************product:"+JSON.stringify(product)+" 
		 cons("product:",product);
		 console.log("editIndex:"+editIndex);
		 cons("prodEdit:",editProduct);	 
		 if(editProduct.orderDetails.quantity==0){
			 //alert("0");
			 // 1. Finde die Position des Elements mit der passenden wkId
			const editIndex2 = orderCart.findIndex(item => item.wkId === editProduct.wkId);

			// 2. Nur löschen, wenn das Element auch wirklich gefunden wurde
			if (editIndex2 !== -1) {
				orderCart.splice(editIndex2, 1);
			}		 	 
		 }
		 editIndex=-1;
	}		
	// 1. Prüfen, ob GENAU dieses Produkt schon im Warenkorb ist
    let found = getProductWk(product);
	//alert(found);

    if (found) {
       // Erhöhe nur die Menge beim existierenden Objekt
       found.orderDetails.quantity++;
	} 
    else {
        // Neues Objekt: Sicherstellen, dass die Menge 1 ist und ID vergeben
        product.orderDetails.quantity = 1;
        product.wkId = Date.now() + "_" + Math.floor(Math.random() * 1000);
        orderCart.push(product);
    }

    // 2. Mengen-Logik für das Menü berechnen
    updateAllQuantities(product.id);


    // 3. UI updaten
    renderCart();
    renderMenu();
}

// Funktion zum Auslesen der URL-Parameter
function getTableFromURL__() {
    const params = new URLSearchParams(window.location.search);
    tischNr = params.get('tisch'); // Sucht nach "tisch=..."
   
	// 2. Den Text im UI anpassen (damit der Gast es sieht)
	const tischDisplay = document.getElementById('tisch-view');     
	if (tischNr=""||tischNr==null){
		tischDisplay.innerText = "Tisch "+" " + tischNr;
	}
	else{
		tischDisplay.innerText ="Abholung";
	}
}

// Sofort beim Laden ausführen
//window.addEventListener('DOMContentLoaded', getTableFromURL);