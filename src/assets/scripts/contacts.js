function toggleSecondary(contactId) {
  const secondaryDiv = document.getElementById(`secondary-${contactId}`);
  const expandBtn = document.querySelector(`[data-contact-id="${contactId}"] .expand-btn`);
  
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

// Optional: Close other expanded rows when opening a new one (exclusive mode)
function toggleSecondaryExclusive(contactId) {
  // Close all other expanded rows first
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
  
  // Then toggle current row
  toggleSecondary(contactId);
}

// Initialize any additional functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Contacts table initialized');
  
  // Add keyboard navigation support
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      // Close all expanded rows when Escape is pressed
      const allSecondary = document.querySelectorAll('.secondary-contacts.show');
      const allBtns = document.querySelectorAll('.expand-btn.expanded');
      
      allSecondary.forEach(div => div.classList.remove('show'));
      allBtns.forEach(btn => btn.classList.remove('expanded'));
    }
  });
});