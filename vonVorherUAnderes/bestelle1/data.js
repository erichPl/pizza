/*A. data.js (Die Fakten)

Hier liegen nur deine Datenstrukturen.

    menuCart (wird hier aus der DB befüllt).

    translations (deine Wörterbücher).

    Die Definition von orderItems = {}.*/
	




//in Array umformen, klappt auch wenn kein Wert ovorhanden ist, dann ensteht [""]
function getArray(input, separator = ',') {
    return (input || "")
        .split(separator)
        .map(s => s.trim())
        .filter(s => s !== ""); 
}




//Daten einlesen und section (Überschrift) und category (pizza, kinderpizza, standard) hinzufügen
async function init() {
    // 1. Tisch-Nummer aus URL holen
    t = translations[currentLang];
	const params = new URLSearchParams(window.location.search);
    tischNr = params.get('tisch') || "Abholung";
    //const tischStr = tisch;
    const tischElement = document.getElementById('tisch-view');
    if (tischElement) tischElement.innerText = "Tisch "+tischNr;
    //alert(tischNr);
	if (tischNr=="Abholung"){
		//alert(tischNr);
		tischElement.innerText="Abholung";
	}
   
    // 2. Sprache setzen
    //setLanguage('de'); 

   try {
        // Alle Items mit view: b einlesen
		const res = await fetch('/api/order-menu');
		const allData = await res.json(); // Hier ist noch ALLES drin (a, b, m...)

		// --- NEU: Einstellungen auslesen ---
        // Wir suchen das Objekt, das den type "settings" hat
        const settings = allData.find(item => item.type === 'settings');
        
        // Wert global oder lokal speichern (Standardmäßig false, falls nicht gefunden)
        isGeolocationActive = settings ? settings.isGeolocation : false;
        
        console.log("Geolocation Status aus DB:", isGeolocationActive);

		// Hier sortierst du manuell aus:
		const rawData = allData.filter(item => {
			// Falls view existiert, prüfe auf "b"
			return item.view && item.view.toLowerCase().split(',').map(s => s.trim()).includes('b');
		});

        // 1. VORBEREITUNG: Wir brauchen eine Variable für die aktuelle Sektion (Überschrift)
        let sectionName = "standard"; 
        const items = [];

        // 2. DIE LISTE DURCHLAUFEN (Staffelstab-Prinzip)
        rawData.forEach(item => {					
			// Check: Ist es eine Überschrift?
            //console.log(item.id+" "+item.name);
			if (item.type === "header") {
                section = item.name; // Wir merken uns die neue Überschrift
				item.category=item.name;
            } 
            // Check: Ist es ein Produkt?
            else if (item.type === "product") {
                item.section=section;				
				// WICHTIG: Wir "impfen" dem Produkt die aktuelle Überschrift ein	
				// .some() gibt true zurück, wenn mindestens ein Keyword passt
				const isPizza = pizzaKeywords.some(keyword => keyword.includes(section));
				if (isPizza) {
					//console.log("Das ist eine Pizza-Abteilung!");
					item.category = "pizza"; // Wir vereinheitlichen den Namen für die Logik
					if (section==kinderpizzaKeyword){
						item.category="kinderpizza";
					}									
				}
				else{
					const isExtra = extraKeywords.some(keyword => keyword.includes(section));
					if (isExtra){
						item.category = "extra";
						
					}
					else{
						item.category = "standard"; 				  
					}
				}
				//console.log(item.name+" "+item.desc+" "+item.category+" "+item.price);
				
                
            }			
			items.push(item);
        });

        // 3. DATEN VERARBEITEN
        // Jetzt enthält jedes Produkt im Array 'processedItems' das Feld 'currentSection'
        processData(items);

        //renderMenu();

    } catch (e) {
        console.error("Fehler:", e);
    }

	
}


/**
 * Verarbeitet die Rohdaten aus der Datenbank in ein sauberes Frontend-Format.
 * @param {Array} allProducts - Das JSON-Array aus deiner DB.
 */
function processData(allProducts) {
	
	let readOnlyPizza=false;
	if (onlyPizza&&tischNr=="Abholung"){
		readOnlyPizza=true;
	}
	
	
	// 1. Zuerst alle Extras sammeln (Wichtig für die Pizza-Logik)
    allProducts.forEach(item => {
        //console.log(item.name+" "+item.desc+" "+item.category+" "+item.price);
		if (item.category == "extra") {
            extras.push({
                name: item.name,
                nameIt: item.name_it,
                desc: item.desc,
				descIt: item.desc_it,
				//price: parseFloat(item.price.replace(',', '.')),
				price: item.price,
				category: item.category,
				section: item.section
            });
        }
    });
	
	
//console.log("extras:"+extras);
    // 2. Alle Produkte verarbeiten
    allProducts.forEach((item, index) => {
    item.isVisible=false;    
	if (!readOnlyPizza||item.category=="pizza"||item.category=="kinderpizza"||item.category=="extra"||(item.type=="header"&&(item.name.slice(0, 4)=="PIZZ"||item.name.slice(0,5)=="EXTRA"||item.name.slice(0,11)=="KINDER PIZZ"))){
		  item.isVisible=true;
	}
		
		
		//const id = "item_" + index; // Index-basierte ID
		const id = index; // Index-basierte ID
        //console.log(item.desc);
        // --- BASIS-DATEN ---
        //const category = item.currentSection;//unter Überschrift
        const name=item.name;
		const nameIt=item.name_it;
		const desc=item.desc;
		const descIt=item.desc_it;
        const category=item.category;
		const price=item.price;
		
		
		
		
		//item: isStandard=true, isPizza=false, isKinderpizza=false, hasVariants=false, hasSizes=false, 
		//hasExtras=false, hasRemovables=false
		// variants=name (",")      jedes item hat mimndestens 1 variants (passt)
		// sizes=descr (price "/")  jedes element hat mind. 1 size
		item.variants=getArray(name,',');
		item.variantsIt=getArray(nameIt,',');
		item.sizes=getArray(desc,'/');
		item.sizesIt=getArray(descIt,'/');
		item.prices=getArray(price,'/');
	   
	    item.extras=[""];
		item.extrasIt=[""]
		item.removables=[""];
		item.removablesIt=[""];
		
		
	    item.hasVariants=false;
		item.hasSizes=false;
		item.isPizza=false;
		item.isKinderpizza=false;
		item.isStandard=true;
		item.isExtra=false;
	    item.hasExtras=false;
		item.hasRemovables=false;
		
		
		//console.log(item.variants+" "+item.sizes);
		
		if(category=='pizza'){
			item.isPizza=true;
		}
		if(category=='kinderpizza'){
			item.isKinderpizza=true;
		}
		if(category=='extra'){
			item.isExtra=true;
		}
	
	    
		
		// 1.) Wenn in name / (Wasser mit/ohne)
		//--------------------------------------
		// nur wenn ein Leerzeichen nach dem ersten Wort ist und kein Beistrich vorhanden ist
		// Wir teilen den Namen am ersten Schrägstrich
		let parts = name.split('/');
		//let partsIt = nameIt.split('/');
		let firstPart = parts[0].trim();//Vino della casa rosso/bianco:  Vino della casa
		//let firstPartIt = partsIt[0].trim();//Vino della casa rosso/bianco:  Vino della casa
		
		if (name.includes("/")&&firstPart.indexOf(" ") !== -1&&!name.includes(",")){
			
			//const hasSpaceAfterFirstWord = str.trim().indexOf(" ") !== -1;
			let namesComplete=name.split(' ');
			//let namesCompleteIt=nameIt.split(' ');	
			
			let lastIndex=name.lastIndexOf(' ');
			let lastIndexIt=nameIt.lastIndexOf(' ');
			
			
			let basename=name.slice(0, lastIndex + 1); // "vino della casa " (inkl. Leerzeichen)
			let basenameIt=nameIt.slice(0, lastIndexIt + 1); // "vino della casa " (inkl. Leerzeichen)
			let others=name.slice(lastIndex + 1);     // "rosso"
			let othersIt=nameIt.slice(lastIndexIt + 1);     // "rosso"
			
			//Wenn / in name (mit/ohne)
			if (namesComplete.length>1){
				/*let basename=namesComplete[0];
				let others=namesComplete[1];
				console.log(name);
				console.log(namesComplete);
				console.log(basename);
				console.log(others);
				let basenameIt=namesCompleteIt[0];
				let othersIt=namesCompleteIt[1];*/
				
				let othersArray=getArray(others,'/');
				let othersArrayIt=getArray(othersIt,'/');
				
				item.variants = othersArray.map(v => `${basename} ${v}`);
				item.variantsIt = othersArrayIt.map(v => `${basenameIt} ${v}`);	
				item.hasVariants=true;
				
				//item.sizes=getArray(price,'/');	
				if (item.sizes.length>1){
					item.hasSizes=true
				}	
			}
			item.isStandard=false;
		}
		else{
			// 2.) Pizza
			//--------------
			if (item.category=="pizza"||item.category=="kinderpizza"){			
				item.isStandard=false;
				item.extras=extras;
				item.removables=item.desc;
				item.removablesIt=item.descIt;
				item.isPizza=true;
				if (item.category=="kinderpizza"){
					isKinderpizza=true;
				}
			}
			else{
			   // 3.) Extras
			   //-------------------------			 
			  if (item.category=="extra"){
				item.isExtra=true;
				item.isStandard=false;
			  }		
				else{
					// 4.) wenn in name "," (variants: Fanta,Cola) und/oder in desc "/" (0.2 l/0.4 l)
					//---------------------------------------------------------------------------
					if (item.variants.length>1){
						item.hasVariants=true;
						item.isStandard=false;
					}
					if (item.sizes.length>1){
						item.hasSizes=true;
						item.isStandard=false;
					}						
				}
				
			}
		}
		// --- WEICHENSTELLUNG (Sonderfall-Erkennung) ---
		// Ein Produkt hat echte Auswahl-Varianten, wenn mehrere Preise ODER Namen da sind
		//const hasVariants = (priceParts.length > 1 || nameParts.length > 1);
		//const isPizza = (category === "Pizza");

		// --- OBJEKT ERSTELLEN ---
		menuCart[id] = {
			id: id,
			type: item.type,
			name: item.name,
			nameIt: item.name_it,
			desc: item.desc,
			descIt: item.desc_it,
			category: item.category,
			price: item.price,
		
			// Varianten-Konfiguration (für das Modal)
			hasVariants: item.hasVariants,
			variants: item.variants,       // ["Wasser mit", "ohne" wird Wasser mit, Wasser ohne]  Cola,Fanta
			variantsIt: item.variantsIt,
			hasSizes:item.hasSizes,
			sizes: item.sizes,  //  0,1 l / 0,2 l
			sizesIt: item.sizesIt,  //  0,1 l / 0,2 l
			prices: item.prices,
			extras: item.extras,
			hasExtras: item.hasExtras,
			hasRemovables: item.hasRemovables,
			isStandard:item.isStandard,  // nur einfache Produkte: Forst 0.33 l     (extras sind hier auch false)
			isPizza: item.isPizza,
			isKinderpizza: item.isKinderpizza,
			isExtra: item.isExtra,
			isVisible: item.isVisible,
			view: item.view,
			hidePrice: item.hidePrice,
			quantity:0,
			
			idWk: null,
			orderDetails: { 
				size: "",
				sizeIt: "",
				variant: "",
				extras: [],
				extrasPrice:[],
				without: [],
				quantity: 0,
				price: ""
			}
			
		};
	 
	//console.log(menuCart[id].id+" name:"+menuCart[id].name+" desc:"+menuCart[id].desc);
    });
	
	
	
	
}