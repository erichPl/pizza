
    const testProducts = [
        {
            id: "piz_001",
            name: "Pizza Margherita",
            optionsSlash: ["Standard", "Familie (45cm)", "Party (60x40)"],
            optionsComma: ["Extra Käse", "Knoblauch-Rand", "Scharfes Öl", "Basilikum"]
        },
        {
            id: "piz_002",
            name: "Pizza Speziale",
            optionsSlash: ["Klein", "Normal", "Groß"],
            optionsComma: ["Zwiebeln", "Peperoni", "Ei", "Gorgonzola", "Sardellen"]
        },
        {
            id: "bev_001",
            name: "Softdrink 0.5l",
            optionsSlash: ["Cola", "Cola Zero", "Fanta", "Sprite"],
            optionsComma: ["mit Eis", "Zitrone"]
        }
    ];

 
 
 /**
 * Öffnet das Detail-Modal zur Auswahl von Größen, Varianten oder Extras.
 * @param {Object} product - Das Originalprodukt aus der Speisekarte.
 * @param {string} mode - 'default' (Größe/Sorte), 'extras' (Zusätze), 'without' (Entfernen).
 */
 
 //product ist Clone von menuCart 
//--------------------------------
 //um auf product0 von menuCart zuzugreifen (quantity), kann die id verwendet werden.
function openEditModal(product, mode = 'default') {	//mode für extras u without
	// TIEFE KOPIE ERSTELLEN, bevor irgendwas geändert wird
	activePizzaBackup = JSON.parse(JSON.stringify(activePizza));
	
	/*if (mode='extras'||mode=='without'){
		product=activePizza;
	}*/
	//alert("open "+product);
	const modal = document.getElementById('selection-modal');
    //alert("in openEditModal Beginn:"+JSON.stringify(product));
	if (!modal) return;
    //alert("openEditModal:"+product);

    // --- 2. UI-ELEMENTE VORBEREITEN ---
    const title = document.getElementById('modal-product-name');
    const commaGrid = document.getElementById('grid-comma');
    const slashGrid = document.getElementById('grid-slash');
    const commaSection = document.getElementById('modal-section-comma');
    const slashSection = document.getElementById('modal-section-slash');
    const labelComma = document.querySelector('#modal-section-comma .selection-label');

    title.innerText = product.name;
    commaGrid.innerHTML = ""; // Container leeren vor Neuaufbau //variant  Cola, Fanta
    slashGrid.innerHTML = ""; // Container leeren vor Neuaufbau //size     0,2 l / 0.4 l
    
	if(mode=='default'){
		document.getElementById('btn-modal-save').innerText = t.bestaetigen;
		if(editIndex!=-1){
			document.getElementById('btn-modal-save').innerText = t.bestaetigen;
		}
	}
	//=====================================
	//   --- A.)  AUSWAHLEN ---
    //=====================================
 
    
	//=====================================
	//            Pizza
	//=====================================
	// --- 3. MODUS-LOGIK ---
    //extras:
	//alert(mode);
	//    extras
	//----------------
	if (mode === 'extras') {
        slashSection.style.display = 'none';
        commaSection.style.display = 'block';
        labelComma.innerText = currentLang === 'de' ? "Extras hinzufügen:" : "Aggiungi extra:";
      
        // Rendert die Checkbox-Buttons für Extras (extras bereits beim product in menCart vorhanden)
		renderMultiSelectButtons(product,extras,"", commaGrid, 'extras'); //Multiselect
    //     without:                                                    //-----------
    //------------------
	} else if (mode === 'without') {
        slashSection.style.display = 'none';
        commaSection.style.display = 'block';
        labelComma.innerText = currentLang === 'de' ? "Zutaten entfernen:" : "Rimuovi ingredienti:";
        // Erstellt Array aus dem Beschreibungs-String  (ingredients aus product.desc)
        const ingredients = product["desc"] ? product["desc"].split(',').map(s => s.trim()) : [];
		const ingredientsIt = product["descIt"] ? product["descIt"].split(',').map(s => s.trim()) : [];
		renderMultiSelectButtons(product,ingredients, ingredientsIt,commaGrid, 'without');       //Multiselect
                                                                                   //-----------
	} else {
        //================================================================
	    //   Fanta, Cola   0,2 l / 0.4 l  (variants: comma, sizes: slash)
	    //================================================================
        labelComma.innerText = currentLang === 'de' ? "Variante wählen:" : "Scegli variante:";
		// sizes:
		//--------
		if (product.hasSizes){
			//alert(JSON.stringify(product));
            slashSection.style.display = 'block';
            product.sizes.forEach((opt,index) => {
                const btn = document.createElement('button');
                if (currentLang=="it"){
				  //alert(JSON.stringify(product));
				  
				  btn.innerText=product.sizesIt[index];
				}
				else{
				   btn.innerText = opt;
				}
                btn.className = "option-btn option-btn-long";
                if (opt === product.orderDetails.size) btn.classList.add('selected');
                
				//für Ändern
				//if(product.sizes[index]=product.orderDetails.size){
					 //btn.classList.add('selected');
				//}
				
				
				
                btn.onclick = () => {
                    Array.from(slashGrid.children).forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    product.orderDetails.size = opt; // Speichert gewählte Größe (size)
				//alert(product.prices);
				//alert(product.sizes);
				//alert(product.sizes[1]);
					const selectedPrice = product.prices[index];
					//alert(selectedPrice);
					product.orderDetails.price=selectedPrice;
                };
                slashGrid.appendChild(btn);
            });
	    //orderDetail.variant=product.name; //wenn keine Varianten, dann name als variant
		} else {
			//alert("test "+product);
			product.orderDetails.size=product["desc"+suffix];
			product.orderDetails.price=product.price;
            slashSection.style.display = 'none'; 			
        }

        // --- FEHLERQUELLE 2: Sorte/Variante ---
        const variantsToRender = product.variants || product.optionsComma;
        //  variants:
		//-------------
        if (product.hasVariants) {
            commaSection.style.display = 'block';
            product.variants.forEach((opt,index) => {
                const btn = document.createElement('button');
                //btn.innerText = opt;
                
				if (currentLang=="it"){
				  //alert(JSON.stringify(product));
				  
				  btn.innerText=product.variantsIt[index];
				}
				else{
				   btn.innerText = opt;
				}
				
				
				
				btn.className = "option-btn";
                if (product.orderDetails.variant===opt) btn.classList.add('selected');
                
                btn.onclick = () => {
                    // Radio-Button-Logik: Nur einer darf ausgewählt sein
                    Array.from(commaGrid.children).forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    product.orderDetails.variant = opt; // Speichert gewählte Sorte (variant)
                };
                commaGrid.appendChild(btn);
            });
        } else { 
		    //wenn keine sizes, dann size=product.desc
		    product.orderDetails.variant=product["name"+suffix];
            commaSection.style.display = 'none'; 
        }
    }
	//Ende variants, sizes
	
	
	
	
    //alert("Speichern-Logik:"+JSON.stringify(product));
    //=================================
	// --- B.) SPEICHERN-LOGIK ---
    //=================================
	document.getElementById('btn-modal-save').onclick = () => {
        // Validierung: Wenn Größen da sind, MUSS eine gewählt werden
        if (product.category!='pizza'){
			if (slashSection.style.display !== 'none' && !product.orderDetails.size) {
				alert(currentLang === 'de' ? "Bitte Größe wählen!" : "Scegli dimensione!");
				return;
			}
			// Validierung: Wenn Sorten da sind, MUSS eine gewählt werden
			if (commaSection.style.display !== 'none' && !product.orderDetails.variant) {
				alert(currentLang === 'de' ? "Bitte Sorte wählen!" : "Scegli sorta!");
				return;
			}
		}


        // Auswahl im Original-Objekt zwischenspeichern
        //product.orderDetails = { ...orderDetails };

        // Falls wir ein bestehendes Item im Warenkorb bearbeiten (Index vorhanden)
        if (typeof currentEditIndex !== 'undefined' && currentEditIndex > -1) {
            orderCart.splice(currentEditIndex, 1,); // Altes Item entfernen
        }


        if (mode !== 'default') {
            // Wenn wir nur Extras/Without geändert haben -> zurück zur Auswahl
            closeModal();
            openBranchingModal(
			); 
        } else {
			
			//alert("elese");
            // --- FEHLERQUELLE 3: Daten-Mapping ---
            // Hier müssen wir sicherstellen, dass wkSize und wkExtras flach im Objekt liegen
            // damit renderCart() sie findet!
           /* const finalItem = {
                ...product,
                wkId: Date.now() + Math.random(), // Eindeutige ID für dieses spezifische Custom-Produkt
                wkName: product.name,
                wkSize: orderDetails.size,
                wkVariant: orderDetails.variant || "",
                wkExtras: [...orderDetails.extras],
                wkWithoute i: [...orderDetails.without],
                quantity: 1, // Startmenge im Warenkorb
                wkQuantity: 1
            };*/

            currentEditIndex = -1; // Reset des Bearbeitungs-Modus
              
            // WICHTIG: Hier muss das fertige Item in den Warenkorb-Prozess
            //alert(JSON.stringify(product));
			//alert (JSON.stringify(product));
			addProduct(product);
            closeModal();
        }
    };

    // Modal Sichtbarkeit
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Scrollen verhindern
    document.body.style.position = 'fixed';
	
}
 

function closeEditModal(){
	  document.getElementById('selection-modal').style.display = 'none';
}

//storageKey: extras oder without
function renderMultiSelectButtons(product, list,listIt, container, storageKey) {
    container.innerHTML = ""; // Container leeren
//alert(list[1]);
    list.forEach((item,index) => {
		if(!(product.category=="kinderpizza"&&item.name=="Kleine Pizza")){
			const val = item.name || item; 
			//const val=item['name'+ suffix] || item; 
			//alert(val);
			const btn = document.createElement('button');
			//btn.innerText =val;
			if (currentLang=='it'){
			  btn.innerText = item['name'+ suffix] || listIt[index]; 
			}
			else{
			  btn.innerText = item['name'+ suffix] || list[index];
			}
			btn.className = "option-btn";

			// Check: Ist dieses Extra/Zutat schon in der Liste?
			// Zugriff via: activePizza.orderDetails["extras"]
			if (activePizza.orderDetails[storageKey].includes(val)) {
				btn.classList.add('selected');
			}

			btn.onclick = () => {
				const listRef = activePizza.orderDetails[storageKey];
				const index = listRef.indexOf(val);
				
				if (index > -1) {
					//if (storageKey === 'extras') {
					  listRef.splice(index, 1); // Entfernen
					//}
					//product.orderDetails.extras.splice(index, 1);
					btn.classList.remove('selected');
				} else {
					listRef.push(val); // Hinzufügen
					if (storageKey === 'extras') {
					  activePizza.orderDetails.extrasPrice.push(item.price);
					}
					//product.orderDetails.extras.push(val);
					btn.classList.add('selected');
				}
				console.log(`Update ${storageKey}:`, listRef);
			};
			container.appendChild(btn);
		}
    });
}

function updateBranchSummary_() {
    if(!activePizza) return;
    
    const withoutDiv = document.getElementById('display-without');
    const extrasDiv = document.getElementById('display-extras');

	// DYNAMISCHES PRÄFIX: Hier lag der Fehler
     const prefix = currentLang === 'it' ? "Senza: " : "Ohne: ";

    if(withoutDiv) {
        withoutDiv.innerText = activePizza.orderDetails.without.length > 0 
            ? prefix + activePizza.orderDetails.without.join(", ") 
            : "";
    }
    if(extrasDiv) {
        extrasDiv.innerText = activePizza.orderDetails.extras.length > 0 
            ? "Extras: " + activePizza.orderDetails.extras.join(", ") 
            : "";
    }
}


function updateBranchSummary() {
    if (!activePizza) return;
    
    const withoutDiv = document.getElementById('display-without');
    const extrasDiv = document.getElementById('display-extras');

    // 1. "Ohne"-Logik übersetzen
    if (withoutDiv) {
        const selectedWithout = activePizza.orderDetails.without || [];
        if (selectedWithout.length > 0) {
            // Nutze die Funktion für die Zutaten-Liste (aus product.desc / descIt)
            const translatedWithout = getTranslatedList(activePizza, selectedWithout, 'desc');
            const prefix = currentLang === 'it' ? "Senza: " : "Ohne: ";
            withoutDiv.innerText = prefix + translatedWithout.join(", ");
        } else {
            withoutDiv.innerText = "";
        }
    }

    // 2. "Extras"-Logik übersetzen
    if (extrasDiv) {
        const selectedExtras = activePizza.orderDetails.extras || [];
        if (selectedExtras.length > 0) {
            // Nutze die Funktion für Extras (suche nameIt in activePizza.extras)
            const translatedExtras = getTranslatedExtras(selectedExtras, activePizza);
            const prefix = currentLang === 'it' ? "Extra: " : "Extras: ";
            extrasDiv.innerText = prefix + translatedExtras.join(", ");
        } else {
            extrasDiv.innerText = "";
        }
    }
}

function closeModalBackup(){
	activePizza=activePizzaBackup;
	closeModal();
}

function closeModal(product) {
	// 1. Falls ein Backup existiert, spielen wir es zurück
    if (activePizzaBackup) {
        // Wir überschreiben die orderDetails der aktuellen Pizza mit dem Backup
        //activePizza.orderDetails = JSON.parse(JSON.stringify(activePizzaBackup.orderDetails));
    }
	
	
	document.getElementById('selection-modal').style.display = 'none';
	document.body.style.overflow = '';
	document.body.style.position = '';
	
	
	// 3. WICHTIG: UI aktualisieren
    // Da wir die Daten im Hintergrund zurückgesetzt haben, muss die Anzeige 
    // der Pizza im Warenkorb/Interface neu gerendert werden.
    //if (typeof renderCart === "function") renderCart(); 
    
    //console.log("Änderungen verworfen.");
}
