
let activePizza=null;function openBranchingModal(){const modal=document.getElementById('branching-modal');document.getElementById('branch-title').innerText=activePizza.orderDetails.variant;modal.style.display='flex';updateBranchSummary();}
function goToCustomize(type){if(type=="without"){document.getElementById('btn-modal-save').innerText=t.bestaetigen;}
else{document.getElementById('btn-modal-save').innerText=t.bestaetigen;}
closeEditModal();openEditModal(activePizza,type);}
function closeBranchModal(){const modal=document.getElementById('branching-modal');if(modal){modal.style.display='none';document.body.style.overflow='';document.body.style.position='';}}
function saveBranch(){if(!activePizza)return;const extraString=activePizza.orderDetails.extras.join("-");const withoutString=activePizza.orderDetails.without.join("-");const finalPizza={...activePizza,id:activePizza.id+"_custom_"+Date.now(),quantity:activePizza.quantity||1};if(currentEditIndex>-1){orderCart.splice(currentEditIndex,1);currentEditIndex=-1;}
addToOrderCart(finalPizza);closeBranchModal();}