/* Presentación de Nuevo producto: conserva los IDs y las acciones del formulario original. */
(function () {
  const $ = id => document.getElementById(id);
  const svg = (name, color = 'currentColor') => {
    const paths = {
      cube: '<path d="m12 2 9 5-9 5-9-5 9-5Zm-9 5v10l9 5 9-5V7M12 12v10"/>',
      tag: '<path d="M3 4h9l9 9-8 8-10-10V4Z"/><circle cx="8" cy="8" r="1"/>',
      chart: '<path d="M4 20V11m5 9V5m5 15v-8m5 8V3"/>',
      calculator: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 10h2m4 0h2M8 14h2m4 0h2M8 18h2m4 0h2"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      close: '<path d="M5 5l14 14M19 5 5 19"/>',
      layers: '<path d="m12 2 9 5-9 5-9-5 9-5Zm-9 10 9 5 9-5M3 17l9 5 9-5"/>',
      truck: '<path d="M2 6h12v11H2zM14 10h4l4 4v3h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
      target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
      check: '<path d="m4 12 5 5L20 6"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + paths[name] + '</svg>';
  };
  const money = id => typeof window.moneyVal === 'function' ? window.moneyVal(id) : Number(($(id)?.value || '0').replace(/\D/g, ''));
  const format = value => typeof window.fmtGs === 'function' ? window.fmtGs(value) : 'Gs ' + Math.round(value || 0).toLocaleString('es-PY');
  const field = id => $(id)?.closest('.field');

  function updateEstimate() {
    const price = money('pPrecio');
    const cost = money('pCosto');
    const stock = Number($('pStockInicial')?.value || 0);
    const minimum = Number($('pStockMin')?.value || 0);
    const margin = price > 0 ? Math.round((price - cost) / price * 100) : 0;
    $('pRefreshMargin').textContent = margin + '%';
    const unit = $('pUnidad')?.value || 'unidad';
    const plural = amount => amount + ' ' + (amount === 1 ? unit : unit === 'unidad' ? 'unidades' : unit);
    $('pRefreshStock').textContent = plural(stock);
    $('pRefreshMinimum').textContent = plural(minimum);
    $('pRefreshMargin').classList.toggle('is-negative', margin < 0);
  }

  function updateVariants() {
    const list = $('pVariantesList');
    $('pRefreshVariantsEmpty')?.classList.toggle('hidden', !!list?.children.length);
  }

  function buildProduct() {
    const pv = $('pv-productos');
    const root = pv?.querySelector(':scope > .card');
    const formGrid = root?.querySelector(':scope > .fg');
    const combo = $('raComboBtn');
    const variantsList = $('pVariantesList');
    if (!pv || !root || !formGrid || !combo || !variantsList || root.classList.contains('p-refresh')) return;
    root.classList.add('p-refresh');
    const oldHeading = root.querySelector(':scope > .card-hdr');
    const oldComboBar = combo.parentElement;
    const variants = variantsList.parentElement;
    const preview = $('pVariantesPreview');
    const actions = [...root.children].find(el => el.querySelector?.('button[onclick="pGuardar()"]'));
    const message = $('pMsg');
    const intro = document.createElement('div');
    intro.className = 'p-refresh-intro';
    intro.innerHTML = '<h2>Nuevo Producto</h2><p>Registra un nuevo producto en tu catálogo.</p>';
    const general = document.createElement('section');
    general.className = 'p-refresh-section p-refresh-general';
    general.innerHTML = '<div class="p-refresh-section-head"><span class="p-refresh-symbol green">' + svg('cube') + '</span><div><h3>Registrar Producto</h3><p>Información general del producto en tu catálogo.</p></div><div class="p-refresh-header-actions"></div></div><div class="p-refresh-general-grid"></div>';
    const calcButton = document.createElement('button');
    calcButton.type = 'button';
    calcButton.id = 'pRefreshCalcButton';
    calcButton.className = 'p-refresh-header-button';
    calcButton.innerHTML = svg('calculator') + '<span>Calculadora</span>';
    calcButton.setAttribute('aria-label', 'Abrir calculadora de costos y precio');
    calcButton.addEventListener('click', () => openCalculator(true));
    const headerActions = general.querySelector('.p-refresh-header-actions');
    headerActions.append(calcButton, combo);
    combo.classList.add('p-refresh-header-button');
    const generalGrid = general.querySelector('.p-refresh-general-grid');
    ['pNombre', 'pCodigo', 'pGrupoPicker', 'pEstado', 'pUnidadPicker'].forEach(id => {
      const el = field(id) || $(id)?.closest('.field');
      if (el) {
        if (id === 'pNombre') { el.classList.add('p-refresh-wide'); el.style.removeProperty('grid-column'); }
        generalGrid.append(el);
      }
    });
    const inventory = document.createElement('section');
    inventory.className = 'p-refresh-section p-refresh-inventory';
    inventory.innerHTML = '<div class="p-refresh-inventory-main"><div class="p-refresh-section-head"><span class="p-refresh-symbol blue">' + svg('tag') + '</span><div><h3>Precio e inventario</h3><p>Define los precios, costos y el stock de tu producto.</p></div></div><div class="p-refresh-price-grid"></div></div><aside class="p-refresh-estimate"><div class="p-refresh-section-head"><span class="p-refresh-symbol green">' + svg('chart') + '</span><div><h3>Resumen estimado</h3><p>Cálculo basado en los datos ingresados.</p></div></div><div class="p-refresh-estimate-row"><span>Margen estimado</span><strong id="pRefreshMargin">0%</strong></div><div class="p-refresh-estimate-row"><span>Stock inicial</span><strong id="pRefreshStock">0 unidades</strong></div><div class="p-refresh-estimate-row"><span>Stock mínimo</span><strong id="pRefreshMinimum">0 unidades</strong></div><p class="p-refresh-estimate-note">El margen se calcula con el precio de venta y el costo del producto.</p></aside>';
    const priceGrid = inventory.querySelector('.p-refresh-price-grid');
    ['pPrecio', 'pPrecioPromo', 'pCosto', 'pStockInicial', 'pStockMin'].forEach(id => { if (field(id)) priceGrid.append(field(id)); });
    const marginIndicator = $('pMargenIndicador');
    if (marginIndicator) { marginIndicator.classList.add('p-refresh-original-margin'); inventory.append(marginIndicator); }
    variants.classList.add('p-refresh-section', 'p-refresh-variants');
    variants.removeAttribute('style');
    const variantTitle = variants.firstElementChild;
    variantTitle?.classList.add('p-refresh-variant-title');
    const variantButton = variants.querySelector('button[onclick="pAbrirModalVariante()"]');
    if (variantTitle && variantButton) {
      const variantHead = document.createElement('div');
      variantHead.className = 'p-refresh-section-head';
      variantHead.innerHTML = '<span class="p-refresh-symbol purple">' + svg('cube') + '</span>';
      variantHead.append(variantTitle, variantButton);
      variants.prepend(variantHead);
    }
    const empty = document.createElement('div');
    empty.id = 'pRefreshVariantsEmpty';
    empty.className = 'p-refresh-empty';
    empty.innerHTML = svg('cube') + '<strong>Sin variantes configuradas</strong><span>Agregá una o más variantes si tu producto tiene opciones como colores o tamaños.</span>';
    variantsList.after(empty);
    actions?.classList.add('p-refresh-save-actions');
    root.replaceChildren(intro, general, inventory, variants);
    if (preview) root.append(preview);
    if (actions) root.append(actions);
    if (message) root.append(message);
    oldHeading?.remove(); oldComboBar?.remove(); formGrid.remove();
    ['pPrecio', 'pCosto', 'pStockInicial', 'pStockMin'].forEach(id => $(id)?.addEventListener('input', updateEstimate));
    $('pUnidadPicker')?.addEventListener('click', () => setTimeout(updateEstimate, 100));
    new MutationObserver(updateVariants).observe(variantsList, {childList:true});
    const clearButton = actions?.querySelector('button[onclick="pLimpiar()"]');
    clearButton?.addEventListener('click', () => setTimeout(updateEstimate, 0));
    const saveButton = actions?.querySelector('button[onclick="pGuardar()"]');
    saveButton?.addEventListener('click', () => setTimeout(updateEstimate, 600));
    updateEstimate(); updateVariants();
  }

  function updateCalculator() {
    const base = money('raFcProd') + money('raFcEmp') + money('raFcImp') + money('raFcOtros');
    const total = base + money('raFcAds') + money('raFcDel');
    const desired = Math.max(0, Math.min(95, Number($('raFcMargen')?.value || 0)));
    const suggested = total > 0 ? Math.ceil(total / (1 - desired / 100) / 1000) * 1000 : 0;
    const current = money('raFcActual');
    const chosen = current || suggested;
    const gain = chosen - total;
    const gross = chosen > 0 ? (chosen - base) * 100 / chosen : 0;
    const discount = chosen > 0 ? Math.min(Math.max(0, Number($('raFcDesc')?.value || 0)), Math.max(0, (chosen - total) * 100 / chosen)) : 0;
    const status = $('pRefreshCalcStatus');
    status.className = 'p-refresh-calc-status ' + (chosen <= 0 ? 'neutral' : gain < 0 ? 'danger' : gain / chosen * 100 < desired ? 'warning' : 'healthy');
    status.querySelector('strong').textContent = chosen <= 0 ? 'Ingresá tus costos' : gain < 0 ? 'Este precio genera pérdida' : gain / chosen * 100 < desired ? 'Margen inferior al deseado' : 'Margen saludable';
    status.querySelector('span').textContent = chosen <= 0 ? 'La estimación aparecerá aquí.' : gain < 0 ? 'Revisá costos o precio antes de vender.' : gain / chosen * 100 < desired ? 'El precio actual no alcanza tu objetivo.' : 'Tu margen permite un crecimiento sostenible.';
    [['pRefreshCalcCost',total],['pRefreshCalcSuggested',suggested],['pRefreshCalcGain',gain],['pRefreshCalcBreakEven',total],['pRefreshCalcUnitGain',gain]].forEach(([id,value]) => { $(id).textContent = format(value); });
    $('pRefreshCalcGross').textContent = gross.toFixed(1) + '%';
    $('pRefreshCalcDiscount').textContent = discount.toFixed(1) + '% (hasta ' + format(chosen * (1 - discount / 100)) + ')';
    $('pRefreshCalcCurrent').textContent = current ? format(current) : '—';
    $('pRefreshCalcDifference').textContent = current ? format(suggested - current) : '—';
    const breakdown = $('pRefreshCalcBreakdown');
    const parts = [money('raFcProd'),money('raFcEmp'),money('raFcAds'),money('raFcDel'),money('raFcImp'),money('raFcOtros')];
    breakdown.innerHTML = parts.map((amount,index) => '<span style="width:' + (total ? amount / total * 100 : 0) + '%;background:' + ['#337de8','#9b71db','#eea765','#59ae86','#ee8f91','#aeb9cc'][index] + '"></span>').join('');
    $('pRefreshCalcLegend').innerHTML = ['Producto','Empaque','Publicidad','Delivery','IVA','Otros'].map((label,index) => '<div><i style="background:' + ['#337de8','#9b71db','#eea765','#59ae86','#ee8f91','#aeb9cc'][index] + '"></i><span>' + label + '</span><strong>' + (total ? (parts[index] / total * 100).toFixed(1) : '0') + '%</strong></div>').join('');
  }

  function openCalculator(open) {
    const overlay = $('pRefreshCalcOverlay');
    if (!overlay) return;
    overlay.hidden = !open;
    document.body.classList.toggle('p-refresh-calc-open', open);
    if (open) { updateCalculator(); $('raFcProd')?.focus(); requestAnimationFrame(() => { overlay.querySelector('.p-refresh-calc-dialog').scrollTop = 0; }); }
    else $('pRefreshCalcButton')?.focus();
  }

  function buildCalculator() {
    const card = $('raCalcCard');
    if (!card || $('pRefreshCalcOverlay')) return;
    const grid = card.querySelector('.fg');
    const oldResult = $('raCalcResultado');
    const overlay = document.createElement('div');
    overlay.id = 'pRefreshCalcOverlay';
    overlay.className = 'p-refresh-calc-overlay';
    overlay.hidden = true;
    overlay.innerHTML = '<div class="p-refresh-calc-dialog" role="dialog" aria-modal="true" aria-labelledby="pRefreshCalcTitle"><header class="p-refresh-calc-top"><span class="p-refresh-symbol blue">' + svg('calculator') + '</span><div><h2 id="pRefreshCalcTitle">Calculadora de costos y precio</h2><p>Definí tus costos, establecé tu margen y calculá el precio ideal para tu producto.</p></div><button type="button" class="p-refresh-calc-close" aria-label="Cerrar calculadora">' + svg('close') + '</button></header><div class="p-refresh-calc-layout"><div class="p-refresh-calc-inputs"><section class="p-refresh-calc-box"><div class="p-refresh-section-head"><span class="p-refresh-symbol blue">' + svg('layers') + '</span><div><h3>Costos directos</h3><p>Costos base del producto</p></div></div><div class="p-refresh-calc-fields" id="pRefreshDirect"></div></section><section class="p-refresh-calc-box"><div class="p-refresh-section-head"><span class="p-refresh-symbol blue">' + svg('truck') + '</span><div><h3>Costos variables</h3><p>Gastos que varían por venta</p></div></div><div class="p-refresh-calc-fields" id="pRefreshVariable"></div></section><section class="p-refresh-calc-box p-refresh-calc-goal"><div class="p-refresh-section-head"><span class="p-refresh-symbol purple">' + svg('target') + '</span><div><h3>Objetivo comercial</h3><p>Definí tu estrategia de precio</p></div></div><div class="p-refresh-calc-fields" id="pRefreshGoal"></div><div class="p-refresh-calc-chips"><div><button type="button" data-calc-target="raFcMargen" data-calc-value="20">20%</button><button type="button" data-calc-target="raFcMargen" data-calc-value="30">30%</button><button type="button" data-calc-target="raFcMargen" data-calc-value="40">40%</button><button type="button" data-calc-target="raFcMargen" data-calc-value="50">50%</button><button type="button" data-calc-target="raFcMargen" data-calc-value="60">60%</button></div><div><button type="button" data-calc-target="raFcDesc" data-calc-value="5">5%</button><button type="button" data-calc-target="raFcDesc" data-calc-value="10">10%</button><button type="button" data-calc-target="raFcDesc" data-calc-value="15">15%</button><button type="button" data-calc-target="raFcDesc" data-calc-value="20">20%</button></div></div></section></div><aside class="p-refresh-calc-summary"><div id="pRefreshCalcStatus" class="p-refresh-calc-status neutral"><strong>Ingresá tus costos</strong><span>La estimación aparecerá aquí.</span></div><div class="p-refresh-calc-summary-row"><span>Costo total real</span><strong id="pRefreshCalcCost">Gs 0</strong></div><div class="p-refresh-calc-summary-row featured"><span>Precio sugerido</span><strong id="pRefreshCalcSuggested">Gs 0</strong></div><div class="p-refresh-calc-summary-row gain"><span>Ganancia neta estimada</span><strong id="pRefreshCalcGain">Gs 0</strong></div><hr><div class="p-refresh-calc-summary-row"><span>Margen bruto</span><strong id="pRefreshCalcGross">0%</strong></div><div class="p-refresh-calc-summary-row"><span>Descuento seguro</span><strong id="pRefreshCalcDiscount">0%</strong></div><div class="p-refresh-calc-summary-row"><span>Punto de equilibrio</span><strong id="pRefreshCalcBreakEven">Gs 0</strong></div><div class="p-refresh-calc-summary-row"><span>Ganancia por unidad</span><strong id="pRefreshCalcUnitGain">Gs 0</strong></div><div class="p-refresh-calc-comparison"><span>Precio actual <strong id="pRefreshCalcCurrent">—</strong></span><span>Diferencia <strong id="pRefreshCalcDifference">—</strong></span></div><div class="p-refresh-calc-breakdown-title">Desglose de costos</div><div class="p-refresh-calc-breakdown" id="pRefreshCalcBreakdown"></div><div class="p-refresh-calc-legend" id="pRefreshCalcLegend"></div><div class="p-refresh-calc-summary-actions"><button type="button" id="pRefreshUsePrice">Usar precio sugerido</button></div></aside></div></div>';
    document.body.append(overlay);
    [['pRefreshDirect',['raFcProd','raFcEmp']],['pRefreshVariable',['raFcAds','raFcDel','raFcImp','raFcOtros']],['pRefreshGoal',['raFcMargen','raFcDesc','raFcActual']]].forEach(([target,ids]) => ids.forEach(id => { if (field(id)) $(target).append(field(id)); }));
    if (oldResult) { oldResult.hidden = true; overlay.append(oldResult); }
    grid?.remove(); card.remove();
    overlay.querySelector('.p-refresh-calc-close').addEventListener('click', () => openCalculator(false));
    overlay.addEventListener('click', event => { if (event.target === overlay) openCalculator(false); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !overlay.hidden) openCalculator(false); });
    overlay.querySelectorAll('input').forEach(input => input.addEventListener('input', updateCalculator));
    overlay.querySelectorAll('[data-calc-target]').forEach(button => button.addEventListener('click', () => {
      $(button.dataset.calcTarget).value = button.dataset.calcValue;
      $(button.dataset.calcTarget).dispatchEvent(new Event('input', {bubbles:true}));
    }));
    $('pRefreshUsePrice').addEventListener('click', () => {
      const total = money('raFcProd') + money('raFcEmp') + money('raFcAds') + money('raFcDel') + money('raFcImp') + money('raFcOtros');
      const margin = Math.max(0, Math.min(95, Number($('raFcMargen')?.value || 0)));
      const suggested = total ? Math.ceil(total / (1 - margin / 100) / 1000) * 1000 : 0;
      if (!suggested) return;
      $('pPrecio').value = suggested.toLocaleString('es-PY');
      $('pPrecio').dispatchEvent(new Event('input', {bubbles:true}));
      openCalculator(false);
    });
    updateCalculator();
  }

  function initialize() { if ($('raComboBtn') && $('raCalcCard')) { buildProduct(); buildCalculator(); } }
  document.addEventListener('DOMContentLoaded', () => { initialize(); setTimeout(initialize, 400); });
})();
