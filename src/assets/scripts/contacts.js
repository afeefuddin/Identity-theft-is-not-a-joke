function toggleSecondary(contactId) {
  const secondaryDiv = document.getElementById(`secondary-${contactId}`);
  const expandBtn = document.querySelector(`[data-contact-id="${contactId}"] .expand-btn`);

  console.log(secondaryDiv, expandBtn)
  
  if (secondaryDiv && expandBtn) {
    if (secondaryDiv.classList.contains('show')) {
      secondaryDiv.classList.remove('show');
      expandBtn.classList.remove('expanded');
    } else {
      secondaryDiv.classList.add('show');
      expandBtn.classList.add('expanded');
    }
  }
}

function toggleSecondaryExclusive(contactId) {
  const allSecondary = document.querySelectorAll('.secondary-contacts');
  const allBtns = document.querySelectorAll('.expand-btn');
  
  allSecondary.forEach((div) => {
    if (div.id !== `secondary-${contactId}`) {
      div.classList.remove('show');
    }
  });
  
  allBtns.forEach((btn) => {
    const parentRow = btn.closest('.contact-row');
    if (parentRow && parentRow.dataset.contactId !== contactId) {
      btn.classList.remove('expanded');
    }
  });
  
  toggleSecondary(contactId);
}

document.addEventListener('DOMContentLoaded', function() {
  
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const allSecondary = document.querySelectorAll('.secondary-contacts.show');
      const allBtns = document.querySelectorAll('.expand-btn.expanded');
      
      allSecondary.forEach(div => div.classList.remove('show'));
      allBtns.forEach(btn => btn.classList.remove('expanded'));
    }
  });
});