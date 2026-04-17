


// Testdaten (später aus data.js oder CSV)
var mockData = [
    { id: 1, category: "PIZZA", name: "Pizza Salami", desc: "Tomaten, Käse, Salami", price: 9.50 },
    { id: 2, category: "PIZZA", name: "Pizza Margherita", desc: "Mozzarella, Basilikum", price: 8.50 },
    { id: 3, category: "GETRÄNKE", name: "Cola 0,5l", desc: "Eiskalt serviert", price: 2.50 }
];



function renderMenu() {
    const container = document.getElementById('menu-container');
    const itemTemplate = document.getElementById('template-item');
    const headerTemplate = document.getElementById('template-header');
    
	// Wir holen uns NICHT den Haupt-Container, sondern nur die Liste
   // const itemsList = document.getElementById('template-item');
	
	// Nur die Produkte löschen, der Header (darüber) bleibt erhalten
    //itemsList.innerHTML = '';
    container.innerHTML = ""; 
    let lastCategory = "";

    menuCart.forEach(product => {
		
		// DER ENTSCHEIDENDE FILTER:
        if (product.isVisible === false) return;
		
		
        if (product.category !== lastCategory) {
            lastCategory = product.category;            
        }
        
        if (product.type == "header") {
            const headerClone = headerTemplate.content.cloneNode(true);
            headerClone.querySelector('.header-title').innerText = product['name'+ suffix] || product.name;
            container.appendChild(headerClone);
        } else {
            const itemClone = itemTemplate.content.cloneNode(true);
            const itemDiv = itemClone.querySelector('.item'); 
            
			let displayQty = product.quantity; // Standardmenge (direkt bestellt)
			
			//let count=0;
			// Wenn das aktuelle Produkt ein Extra ist, scannen wir alle Pizzen
			if (product.category === 'extra') {
				orderCart.forEach(cartItem => {
					// 1. Hat dieses Warenkorb-Item Extras?
					if (cartItem.orderDetails && cartItem.orderDetails.extras) {
						
						// 2. Suche in den Extras der Pizza nach dem Namen des aktuellen Produkts
						// Wir nutzen 'includes', da deine Extras Strings sind
						if (cartItem.orderDetails.extras.includes(product.name)) {
							// Wir addieren die Menge der Pizza (wenn 2 Pizzen mit Käse, dann +2 Käse)
							displayQty += (cartItem.orderDetails.quantity || 1);
							//alert(displayQty);
						}
					}
				});
			}
			
            
			// --- DER ENTSCHEIDENDE ANKER FÜR SYNC ---
            itemDiv.setAttribute('data-id', product.id); 
			//Anzeige Weihenstephaner Weizen 0,3 l / 0,5 l 3,50 / 5,50 €
            itemClone.querySelector('.item-name').innerText = product['name'+ suffix] || product.name;		 //Weihenstephaner Weizen
            itemClone.querySelector('.item-desc').innerText = product['desc'+ suffix] || product.desc;  		 //0,3 l / 0,5 l
            itemClone.querySelector('.item-price').innerText = product.price + " €"; //3,50 / 5,50
           
			itemClone.querySelector('.qty-display').innerText=displayQty;  //Menge  - 2 +
		  
			// + Button
			itemClone.querySelector('.btn-plus').onclick = () => {
				//changeQuantity(product, 1, qtyLabel);//   ==========================================
				plusMinusMenu(product,1);   //               plusMinusMenu(product,1) wird aufgerufen
			};                              //              ==========================================
			
			// - Button
			itemClone.querySelector('.btn-minus').onclick = () => {
				//changeQuantity(product, -1, qtyLabel);
				plusMinusMenu(product,-1);
			};
			
			
			
			
				
			if(product.category=='extra'){
				    itemClone.querySelector('.btn-plus').style.visibility='hidden';
					//itemClone.querySelector('.qty-display').innerText=product.quantity;
					itemClone.querySelector('.btn-minus').style.visibility='hidden';
					//console.log(product.name+" "+product.quantity+" "+count);
			}
       
       
			container.appendChild(itemClone);
			
	
	
		
		
		
		
		
		}
    });
}







// +/- in menuCart  (für standard wurde schon orderDetails hinzugefügt: (variant: name,variantIt: nameIt, size: desc, extras:[], without:[])
function plusMinusMenu(product0,delta){
	
	//Kopie des product0 von menuCart
	//==================================
	const product = JSON.parse(JSON.stringify(product0));	
	//alert("product "+product.orderDetails+"/");	
	//console.log("plusMinus index:"+editIndex+" product:"+JSON.stringify(product)+" productKopie"+JSON.stringify(productKopie);
	
	
	//alert(product.quantity); hier wird richtig mitgezählt
	if(delta<0){
		//wenn 0 und - dann return (menue)
		if(product0.quantity==0){		
			return;		
		}		
		//wenn größer 0
		//schaue, ob in Warenkorb mehr als 1x vorhanden, in diesem Fall Mitteilung dass direkt in Warenkorb zu ändern
		const matches = orderCart.filter(item => item.id === product.id);
		//alert(JSON.stringify(matches));
		if (matches.length > 1) {
			alert("Es sind verschiedene Varianten dieses Produkts im Warenkorb. Bitte passen Sie die Menge direkt im Warenkorb an."	);
			return; // Funktion abbrechen
		}
		else{
			//alert(JSON.stringify(menuCart[0]));
			//let matches=menuCart.find(p => p.id === product.id);
			//alert(JSON.stringify(matches[0]));
			matches[0].orderDetails.quantity--;
			// WICHTIG: Wenn die Menge jetzt 0 ist, lösche es komplett aus dem Warenkorb
			if (matches[0].orderDetails.quantity === 0) {
				orderCart = orderCart.filter(item => item !== matches[0]);
			}			
			updateAllQuantities(product.id); //Alle Mengen anpassen
		}
				
		
	}
	//    delta>0
	//==================
	else{
		 
		if (product.isStandard){                       // Standard: Forst 0.0  0.33l
			product.orderDetails.variant=product.name; //============================
			//product.orderDetails.It=product.nameIt;
			product.orderDetails.size=product.desc;	
			product.orderDetails.price=product.price;			
			addProduct(product);
			//------------------		  
		}
		else{    
			if(product.isPizza){                                    // Pizza
				//alert("plusMinus:"+product+" "+product.name);     // =======
				product.orderDetails.variant=product.name;
				product.orderDetails.price=product.price;
				//product.orderDetails.variantIt=product.nameIt;
				activePizza=product;
				openBranchingModal();//leitet nach openEditModal weiter für extras und für ohne
				//---------------------------
				return;  //WICHTIG: Funktion hier abbrechen! Das Modal übernimmt.
			}
			else{                                                  // "," u. "/"     Cola, Fanta  0.2 l / 0.4 l
				// variants, sizes                                 // ============================================
				openEditModal(product);//dort muss auch orderDetial: size,extras,without hinzugefügt werden
				//---------------------
				return; //WICHTIG: Funktion hier abbrechen! Das Modal übernimmt.
			}	 
		}			 	
	}	
	//alert(JSON.stringify(product));
	renderMenu();
	renderCart();
}



//Zählen in Menuekarte (unabhängig von variant, size, extras, ohne (nur für Menge in Menuekarte)
// menue.js



/*
//sorgt dafür, dass das Handy beim Zurückkehren zum Tab sofort beim Server nachfragt:
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        console.log("Gast ist zurück: Prüfe Bestellstatus...");
        
        // Falls du die Order-ID im LocalStorage oder einer Variable hast
        const orderId = localStorage.getItem('lastOrderId'); 
        
        if (orderId) {
            // Wir fragen den aktuellen Status der Bestellung ab
            fetch(`/api/orders/${orderId}`)
                .then(res => res.json())
                .then(order => {
                    if (order.status === 'angenommen') {
                        // Hier die Funktion aufrufen, die dem Gast 
                        // die Uhr und die Bestätigung anzeigt
                        showOrderConfirmed(order.dauerAbholung);
                    }
                });
        }
    }
});
*/