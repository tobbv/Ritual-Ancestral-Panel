/* Completa los íconos de la vista estática de Delivery con el mismo trazo del panel. */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#pv-delivery [data-delivery-icon]').forEach(node => {
    node.innerHTML = uiIcon(node.dataset.deliveryIcon);
  });
  const notes = [
    'Esperando asignación',
    'Actualmente en ruta',
    'Completados en el período',
    'No concretados',
    'Costo de distribución',
    'Por cobrar a clientes'
  ];
  document.querySelectorAll('#pv-delivery .stats .stat').forEach((stat, index) => {
    const content = stat.querySelector(':scope > div');
    if (!content || content.querySelector('.delivery-stat-note')) return;
    const note = document.createElement('small');
    note.className = 'delivery-stat-note';
    note.textContent = notes[index] || '';
    content.appendChild(note);
  });
});
