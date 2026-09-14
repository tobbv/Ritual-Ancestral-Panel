/* Completa los íconos de la vista estática de Delivery con el mismo trazo del panel. */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#pv-delivery [data-delivery-icon]').forEach(node => {
    node.innerHTML = uiIcon(node.dataset.deliveryIcon);
  });
});
