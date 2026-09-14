/* Rediseño de superficies: reutiliza los campos y acciones existentes. */
(function () {
  const byId = id => document.getElementById(id);
  const section = (title, subtitle, className) => {
    const el = document.createElement('section');
    el.className = 'refresh-card ' + className;
    el.innerHTML = '<div class="refresh-heading"><div><h2>' + title + '</h2><p>' + subtitle + '</p></div></div>';
    return el;
  };
  const field = id => byId(id)?.closest('.field');

  function productSummary() {
    const box = byId('refreshProductSummary');
    if (!box) return;
    const n = id => Math.max(0, Number(String(byId(id)?.value || '0').replace(/\D/g, '')) || 0);
    const price = n('pPrecioPromo') || n('pPrecio');
    const cost = n('pCosto');
    const margin = price > 0 ? Math.round((price - cost) * 100 / price) : 0;
    byId('refreshMargin').textContent = price > 0 ? margin + '%' : '0%';
    byId('refreshStock').textContent = n('pStockInicial') + ' ' + (byId('pUnidad')?.value || 'unidades');
    byId('refreshMin').textContent = n('pStockMin') + ' ' + (byId('pUnidad')?.value || 'unidades');
    box.classList.toggle('is-warning', price > 0 && cost > price);
  }

  function organizeProduct() {
    const root = byId('pv-productos');
    const original = root?.querySelector(':scope > .card');
    if (!original || original.classList.contains('refresh-product')) return;
    const base = original.querySelector(':scope > .fg');
    const variants = byId('pVariantesList')?.parentElement;
    const preview = byId('pVariantesPreview');
    const actions = byId('pMsg')?.previousElementSibling;
    if (!base || !variants || !actions) return;

    original.classList.add('refresh-product');
    const title = document.createElement('header');
    title.className = 'refresh-page-heading';
    title.innerHTML = '<div><h1>Nuevo producto</h1><p>Registrá un nuevo producto en tu catálogo.</p></div>';
    original.prepend(title);
    original.querySelector(':scope > .card-hdr')?.remove();

    const general = section('Registrar producto', 'Información general del producto en tu catálogo.', 'refresh-general');
    const combo = byId('raComboBtn');
    const originalComboBar = combo?.parentElement;
    if (combo) general.querySelector('.refresh-heading').append(combo);
    const generalGrid = document.createElement('div');
    generalGrid.className = 'refresh-fields refresh-general-fields';
    ['pNombre', 'pCodigo', 'pGrupoPicker', 'pEstado', 'pUnidadPicker'].forEach(id => {
      const el = field(id);
      if (el) generalGrid.append(el);
    });
    general.append(generalGrid);

    const pricing = section('Precio e inventario', 'Definí los precios, costos y el stock de tu producto.', 'refresh-pricing');
    const pricingBody = document.createElement('div');
    pricingBody.className = 'refresh-pricing-body';
    const priceFields = document.createElement('div');
    priceFields.className = 'refresh-fields refresh-price-fields';
    ['pPrecio', 'pPrecioPromo', 'pCosto', 'pStockInicial', 'pStockMin'].forEach(id => {
      const el = field(id);
      if (el) priceFields.append(el);
    });
    pricingBody.append(priceFields);
    const summary = document.createElement('aside');
    summary.id = 'refreshProductSummary';
    summary.className = 'refresh-summary';
    summary.innerHTML = '<h3>Resumen estimado</h3><p>Cálculo basado en los datos ingresados.</p>' +
      '<dl><div><dt>Margen estimado</dt><dd id="refreshMargin">—</dd></div>' +
      '<div><dt>Stock inicial</dt><dd id="refreshStock">0 unidades</dd></div>' +
      '<div><dt>Stock mínimo</dt><dd id="refreshMin">0 unidades</dd></div></dl>' +
      '<small>El margen se calcula con el precio de venta efectivo y el costo del producto.</small>';
    pricingBody.append(summary);
    pricing.append(pricingBody);
    const oldMargin = byId('pMargenIndicador');
    if (oldMargin) { pricing.append(oldMargin); oldMargin.classList.add('refresh-legacy-margin'); }

    const variantCard = section('Variantes', 'Agregá variantes si el producto existe en distintos colores, tamaños u otras opciones.', 'refresh-variants');
    const variantButton = variants.querySelector('button');
    if (variantButton) variantCard.querySelector('.refresh-heading').append(variantButton);
    variantCard.append(byId('pVariantesList'));
    if (preview) variantCard.append(preview);
    variants.remove();
    const empty = document.createElement('div');
    empty.className = 'refresh-variant-empty';
    empty.id = 'refreshVariantEmpty';
    empty.innerHTML = '<strong>Sin variantes configuradas</strong><span>Agregá una o más variantes si tu producto tiene opciones como colores o tamaños.</span>';
    byId('pVariantesList')?.after(empty);
    const observer = new MutationObserver(() => {
      empty.hidden = Boolean(byId('pVariantesList')?.textContent?.trim());
    });
    if (byId('pVariantesList')) observer.observe(byId('pVariantesList'), { childList: true, subtree: true, characterData: true });
    empty.hidden = Boolean(byId('pVariantesList')?.textContent?.trim());

    if (originalComboBar) originalComboBar.remove();
    base.remove();
    original.insertBefore(general, actions);
    original.insertBefore(pricing, actions);
    original.insertBefore(variantCard, actions);
    actions.classList.add('refresh-product-actions');
    for (const id of ['pPrecio', 'pPrecioPromo', 'pCosto', 'pStockInicial', 'pStockMin', 'pUnidad']) {
      byId(id)?.addEventListener('input', productSummary);
      byId(id)?.addEventListener('change', productSummary);
    }
    productSummary();
  }

  function moveCalculator() {
    const calc = byId('raCalcCard');
    const pricing = document.querySelector('.refresh-pricing');
    if (!calc || !pricing || calc.closest('.refresh-pricing')) return;
    const details = document.createElement('details');
    details.className = 'refresh-calculator';
    const toggle = document.createElement('summary');
    toggle.textContent = 'Calculadora de costos y precio';
    details.append(toggle, calc);
    pricing.append(details);
    details.addEventListener('toggle', () => {
      if (!details.open) return;
      if (!byId('raFcProd')?.value && byId('pCosto')?.value) byId('raFcProd').value = byId('pCosto').value;
      if (!byId('raFcActual')?.value && byId('pPrecio')?.value) byId('raFcActual').value = byId('pPrecio').value;
      if (typeof raCalcPrecio === 'function') raCalcPrecio();
    });
    calc.querySelector('.card-hdr')?.remove();
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'btn btn-s btn-sm';
    apply.textContent = 'Aplicar precio sugerido';
    apply.addEventListener('click', () => {
      const n = id => Number(String(byId(id)?.value || '').replace(/\D/g, '')) || 0;
      const unit = n('raFcProd') + n('raFcEmp') + n('raFcImp') + n('raFcOtros');
      const scenario = n('raFcAds') + n('raFcDel');
      const margin = Math.max(0, Math.min(95, Number(byId('raFcMargen')?.value) || 0));
      const suggested = Math.ceil(((unit + scenario) / (1 - margin / 100)) / 1000) * 1000;
      if (!unit || !suggested) return alert('Ingresá primero el costo del producto.');
      const input = byId('pPrecio');
      input.value = suggested.toLocaleString('es-PY');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      details.open = false;
      input.focus();
    });
    calc.append(apply);
    const note = document.createElement('p');
    note.className = 'refresh-calculator-note';
    note.textContent = 'Publicidad y delivery son supuestos de esta simulación; no cambian el costo unitario guardado.';
    calc.append(note);
  }

  function organizeDelivery() {
    const root = byId('pv-delivery');
    if (!root || root.classList.contains('refresh-delivery-ready')) return;
    const portal = byId('deliveryPortalCard');
    const stats = root.querySelector(':scope > .stats');
    const route = byId('dRutaDelDia')?.closest('.card');
    const settlement = byId('rendicionContainer')?.closest('.card');
    const table = byId('dBody')?.closest('.tw');
    if (!portal || !stats || !route || !settlement || !table) return;
    root.classList.add('refresh-delivery-ready');
    portal.classList.add('refresh-delivery-portal');
    stats.classList.add('refresh-delivery-stats');
    route.classList.add('refresh-delivery-route');
    settlement.classList.add('refresh-delivery-settlement');
    const pair = document.createElement('div');
    pair.className = 'refresh-delivery-pair';
    pair.append(route, settlement);
    const list = section('Listado de entregas', '', 'refresh-delivery-list');
    list.append(table);
    root.append(portal, stats, pair, list);
  }

  function organizeFinance() {
    const root = byId('pv-finanzas');
    if (!root || root.classList.contains('refresh-finance-ready')) return;
    const hero = byId('fHero');
    const stats = root.querySelector(':scope > .stats');
    const cards = [...root.querySelectorAll(':scope > .card')];
    const find = text => cards.find(c => c.querySelector('.card-hdr')?.textContent?.toLowerCase().includes(text));
    const rhythm = find('ritmo y comparativa');
    const goals = find('metas del mes');
    const progress = find('progreso');
    const money = find('dinero que');
    const ads = find('publicidad y dinero');
    const expenses = find('gastos del mes');
    const report = find('reporte del mes');
    const insights = root.querySelector(':scope > .mini-grid');
    if (![hero, stats, rhythm, goals, progress, money, ads, expenses, report, insights].every(Boolean)) return;
    root.classList.add('refresh-finance-ready');
    const performance = section('Desempeño del mes', 'Ritmo, proyecciones y metas de tu negocio.', 'refresh-finance-performance');
    performance.append(rhythm, goals, progress);
    const movement = section('Movimiento y cobros', 'Resumen de ventas, cobros y métodos de pago.', 'refresh-finance-movement');
    const extraStats = document.createElement('div');
    extraStats.className = 'refresh-finance-extra-stats';
    [3, 4, 5, 6, 7].map(i => stats.children[i]).filter(Boolean).forEach(el => extraStats.append(el));
    movement.append(money, extraStats);
    const operations = document.createElement('div');
    operations.className = 'refresh-finance-operations';
    operations.append(ads, expenses);
    const tools = section('Más herramientas e insights', '', 'refresh-finance-tools');
    tools.append(insights, report);
    root.append(hero, stats, performance, movement, operations, tools);
  }

  function boot() {
    organizeProduct();
    moveCalculator();
    organizeDelivery();
    organizeFinance();
  }
  function enhanceSaleCards(rows) {
    const indexed = new Map((rows || []).map(r => [String(r.id), r]));
    document.querySelectorAll('#vmCards .vm-sale-card').forEach(card => {
      if (card.dataset.refreshEnhanced) return;
      const record = indexed.get(String(card.dataset.id));
      const client = card.querySelector('.vm-sale-section');
      const form = client?.querySelector('.vm-detail-grid');
      if (!record || !form) return;
      card.dataset.refreshEnhanced = 'true';
      const initials = String(record.cliente || 'C').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
      const overview = document.createElement('div');
      overview.className = 'refresh-client-overview';
      const avatar = document.createElement('span');
      avatar.className = 'refresh-client-avatar';
      avatar.textContent = initials;
      const info = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = record.cliente || 'Sin cliente';
      const phone = document.createElement('span');
      phone.textContent = [record.contacto, record.ciudad].filter(Boolean).join(' · ') || 'Sin contacto cargado';
      info.append(strong, phone);
      overview.append(avatar, info);
      form.before(overview);
      const more = document.createElement('details');
      more.className = 'refresh-client-details';
      more.innerHTML = '<summary>Ver más detalles</summary>';
      form.replaceWith(more);
      more.append(form);
    });
  }
  if (typeof window.vmRenderCards === 'function') {
    const renderCards = window.vmRenderCards;
    window.vmRenderCards = function (rows) {
      const result = renderCards(rows);
      enhanceSaleCards(rows);
      return result;
    };
  }
  document.addEventListener('DOMContentLoaded', () => {
    boot();
    setTimeout(boot, 350);
    setTimeout(boot, 1000);
  });
})();
