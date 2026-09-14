/* Presentación de Ventas del Mes. Conserva los controles y funciones originales. */
(function () {
  let currentRows = [];
  const openClientDetails = new Set();
  const openExtra = new Set();
  const openHistory = new Set();
  const paths = {
    store: '<path d="M3 10h18l-1.5-6h-15L3 10Z"/><path d="M5 10v10h14V10M9 20v-6h6v6M3 10c0 2 3 3 4.5 1.5C9 13 12 13 12 11.5c0 1.5 3 1.5 4.5 0C18 13 21 12 21 10"/>',
    whatsapp: '<path d="M12 2.5a9 9 0 0 0-7.8 13.5L3 21l5-1.2A9 9 0 1 0 12 2.5Z"/><path d="M8.1 7.8c-.35.2-.7.8-.7 1.25.05 2.65 3.95 6.55 6.6 6.6.45 0 1.05-.35 1.25-.7l.55-1.1-2.4-1.15-1.15 1.15a8.2 8.2 0 0 1-3.1-3.1l1.15-1.15-1.15-2.4-1.05.6Z"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
    message: '<path d="M20 11.5a8 8 0 0 1-8 8c-1.5 0-3-.4-4.3-1.2L4 20l1.2-3.7A8 8 0 1 1 20 11.5Z"/><path d="M8 11h8M8 14h5"/>',
    package: '<path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10"/>',
    truck: '<path d="M2 6h12v11H2zM14 10h4l4 4v3h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    document: '<path d="M6 2h8l5 5v14H6zM14 2v5h5M9 12h7M9 16h7"/>',
    history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
    edit: '<path d="m4 17 12-12 3 3L7 20H4v-3ZM14 7l3 3"/>'
    ,phone: '<path d="M6 3h4l1 5-2 2a14 14 0 0 0 5 5l2-2 5 1v4a3 3 0 0 1-3 3A17 17 0 0 1 3 6a3 3 0 0 1 3-3Z"/>'
    ,copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/>'
    ,eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'
    ,printer: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 15h12v6H6z"/>'
    ,trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/>'
    ,bell: '<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3ZM10 20h4"/>'
  };
  const icon = (name, className = '') => '<svg class="vm-refresh-icon ' + className + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + paths[name] + '</svg>';
  function decorateFields(section, names) {
    const labels = [...section.querySelectorAll(':scope > .vm-detail-grid > label')];
    labels.forEach((label, index) => {
      const textNode = [...label.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
      if (!textNode || !names[index]) return;
      const title = document.createElement('span');
      title.className = 'vm-refresh-field-title';
      title.innerHTML = icon(names[index]);
      title.append(document.createTextNode(textNode.textContent.trim()));
      textNode.remove();
      label.prepend(title);
    });
  }
  function enhance(card) {
    if (card.dataset.vmRefresh === '1') return;
    const sections = card.querySelector('.vm-sale-sections');
    if (!sections || sections.children.length !== 4) return;
    const [client, order, payment, delivery] = [...sections.children];
    const id = card.dataset.id;
    const record = currentRows.find(row => String(row.id) === String(id));
    if (!record) return;
    card.dataset.vmRefresh = '1';
    const left = document.createElement('div');
    const right = document.createElement('div');
    left.className = 'vm-refresh-column';
    right.className = 'vm-refresh-column';
    left.append(client, payment);
    right.append(order, delivery);
    sections.append(left, right);

    const heading = client.querySelector('h4');
    const fields = client.querySelector('.vm-detail-grid');
    const actions = client.querySelector('.vm-section-actions');
    if (heading && fields && actions) {
      const more = document.createElement('details');
      more.className = 'vm-refresh-more';
      more.open = openClientDetails.has(String(id));
      const summary = document.createElement('summary');
      summary.textContent = 'Datos editables';
      const moreButton = document.createElement('button');
      moreButton.type = 'button';
      moreButton.className = 'vm-refresh-more-button';
      moreButton.textContent = 'Ver más detalles';
      moreButton.addEventListener('click', () => {
        more.open = !more.open;
        if (more.open) openClientDetails.add(String(id));
        else openClientDetails.delete(String(id));
      });
      heading.append(moreButton);
      fields.replaceWith(more);
      more.append(summary, fields);
      const profile = document.createElement('div');
      profile.className = 'vm-refresh-profile';
      const info = document.createElement('div');
      info.className = 'vm-refresh-profile-info';
      const name = document.createElement('strong');
      name.textContent = record.cliente || 'Sin cliente';
      const phone = document.createElement('span');
      phone.className = 'vm-refresh-phone';
      phone.textContent = record.contacto || 'Sin teléfono';
      const city = document.createElement('span');
      city.className = 'vm-refresh-city';
      city.textContent = record.ciudad || 'Sin ciudad';
      const cityIcon = String(record.ciudad || '').toLowerCase().includes('retiro') ? 'store' : 'pin';
      phone.insertAdjacentHTML('afterbegin', icon('whatsapp'));
      city.insertAdjacentHTML('afterbegin', icon(cityIcon));
      info.append(name, phone, city);
      profile.append(info, actions);
      const wa = actions.querySelector('.btn-wa');
      if (wa) wa.insertAdjacentHTML('afterbegin', icon('whatsapp'));
      more.before(profile);
    }
    if (String(record.ciudad || '').toLowerCase().includes('retiro')) {
      const pin = card.querySelector('.vm-sale-meta span:first-child .ui-icon');
      if (pin) pin.outerHTML = icon('store');
    }

    const orderHeading = order.querySelector('h4');
    const edit = order.querySelector('.vm-product-edit');
    if (orderHeading && edit) {
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'vm-refresh-edit';
      editButton.innerHTML = icon('edit') + ' Editar';
      editButton.addEventListener('click', () => edit.click());
      orderHeading.append(editButton);
    }
    decorateFields(order, ['package', 'calendar', 'message']);
    decorateFields(payment, ['clock', 'card']);
    decorateFields(delivery, ['truck', 'user', 'calendar', 'pin', 'pin']);
    const footer = card.querySelector('.vm-sale-footer');
    if (footer) {
      const extra = document.createElement('details');
      extra.className = 'vm-refresh-bottom-card';
      extra.open = openExtra.has(String(id));
      extra.innerHTML = '<summary>' + icon('document') + '<span>Detalles adicionales</span><b>⌄</b></summary><div class="vm-refresh-extra-actions"></div>';
      extra.addEventListener('toggle', () => {
        if (extra.open) openExtra.add(String(id)); else openExtra.delete(String(id));
      });
      const extraActions = extra.querySelector('.vm-refresh-extra-actions');
      card.querySelectorAll('.vm-sale-section .action-menu, .vm-sale-footer .action-menu').forEach(menu => {
        const items = menu.querySelector('.action-menu-pop');
        if (items) [...items.children].forEach(item => {
          const label = item.textContent.trim().toLowerCase();
          if (label.includes('historial')) return;
          const actionIcon = label.includes('llamar') ? 'phone'
            : label.includes('recordar') ? 'bell'
            : label.includes('copiar') ? 'copy'
            : label.includes('vista previa') ? 'eye'
            : label.includes('duplicar') ? 'copy'
            : label.includes('imprimir') ? 'printer'
            : label.includes('eliminar') ? 'trash' : 'document';
          item.insertAdjacentHTML('afterbegin', icon(actionIcon));
          extraActions.append(item);
        });
        menu.remove();
      });
      footer.querySelector('.btn-wa')?.remove();
      left.append(extra);

      const history = document.createElement('details');
      history.className = 'vm-refresh-bottom-card';
      history.open = openHistory.has(String(id));
      history.innerHTML = '<summary>' + icon('history') + '<span>Historial de la venta</span><b>⌄</b></summary><div class="vm-refresh-history-content"></div>';
      history.addEventListener('toggle', () => {
        if (history.open) openHistory.add(String(id)); else openHistory.delete(String(id));
      });
      const historyContent = history.querySelector('.vm-refresh-history-content');
      let entries = Array.isArray(record.historial) ? record.historial : [];
      if (!entries.length && typeof record.historial === 'string') {
        try { entries = JSON.parse(record.historial); } catch (_) { entries = []; }
      }
      entries = Array.isArray(entries) ? entries.slice(-4).reverse() : [];
      if (entries.length) entries.forEach(entry => {
        const row = document.createElement('p');
        row.textContent = entry.accion || 'Actualización del pedido';
        historyContent.append(row);
      });
      else historyContent.textContent = 'Sin cambios registrados todavía.';
      const fullHistory = document.createElement('button');
      fullHistory.type = 'button';
      fullHistory.textContent = 'Ver historial completo';
      fullHistory.addEventListener('click', () => window.verHistorialVenta?.(id));
      historyContent.append(fullHistory);
      right.append(history);
    }
  }
  function enhanceAll() {
    document.querySelectorAll('#pv-ventasmes .vm-sale-card').forEach(enhance);
  }
  if (typeof window.vmRenderCards === 'function') {
    const original = window.vmRenderCards;
    window.vmRenderCards = function (rows) {
      currentRows = rows || [];
      const result = original.apply(this, arguments);
      enhanceAll();
      return result;
    };
  }
  document.addEventListener('DOMContentLoaded', enhanceAll);
})();
