// chooseModal.js

let activePizza = null; // Speichert die Pizza, die gerade angepasst wird

function openBranchingModal() {
    // Wir erstellen eine tiefe Kopie, damit Änderungen nicht das Menü zerschießen
    //activePizza = JSON.parse(JSON.stringify(product)); 
   
    const modal = document.getElementById('branching-modal');
    document.getElementById('branch-title').innerText = activePizza.orderDetails.variant;
//console.log("test1:");
//cl(activePizza);
    // Speicher-Button: Schickt die global bearbeitete activePizza in den Warenkorb
/*   
document.getElementById('btn-text-save').onclick = function(e) {
    e.preventDefault();
    alert("Klick-Check: Jetzt müsste test2 kommen");
    console.log("test2 erreicht!");
};
*/

    modal.style.display = 'flex';
    updateBranchSummary(); // Zeigt direkt an, was schon gewählt wurde
}

function goToCustomize(type) {
	  //alert("goToCustomize:"+type);
    // 1. Zwischenmenü schließen
	if (type=="without"){
		document.getElementById('btn-modal-save').innerText = t.bestaetigen;
	}
	else{
		document.getElementById('btn-modal-save').innerText = t.bestaetigen;
	}
	//closeBranchModal();
    closeEditModal();
	
    // 2. Das Detail-Modal (selectionModal.js) aufrufen
    // Wir übergeben den Typ ('without' oder 'extras'), damit das Modal weiß, was es zeigen soll
    openEditModal(activePizza,type); 
}



function closeBranchModal() {
    const modal = document.getElementById('branching-modal');
    if (modal) {
        modal.style.display = 'none';
        // Falls du den Body fixiert hast, hier wieder lösen:
        document.body.style.overflow = '';
        document.body.style.position = '';
    }
}



function saveBranch() {
    if (!activePizza) return;

    // Wir bauen die finale Pizza-ID zusammen (inkl. Extras/Without)
    const extraString = activePizza.orderDetails.extras.join("-");
    const withoutString = activePizza.orderDetails.without.join("-");
    
    const finalPizza = {
        ...activePizza,
        id: activePizza.id + "_custom_" + Date.now(),
        quantity: activePizza.quantity || 1
    };

	if (currentEditIndex > -1) {
        orderCart.splice(currentEditIndex, 1);
        currentEditIndex = -1;
    }
	
    addToOrderCart(finalPizza);
    closeBranchModal();
}