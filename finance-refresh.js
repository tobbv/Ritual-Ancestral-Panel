document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('pv-finanzas');
  if (!root || root.querySelector(':scope > .finance-primary-grid')) return;
  const left = document.createElement('div');
  const right = document.createElement('div');
  const grid = document.createElement('div');
  grid.className = 'finance-primary-grid';
  left.className = 'finance-primary-column finance-primary-left';
  right.className = 'finance-primary-column finance-primary-right';
  ['.finance-rhythm', '.finance-goals', '.finance-report', '.finance-visuals'].forEach(selector => {
    const card = root.querySelector(':scope > ' + selector);
    if (card) left.appendChild(card);
  });
  ['.finance-progress', '.finance-ads', '.finance-money'].forEach(selector => {
    const card = root.querySelector(':scope > ' + selector);
    if (card) right.appendChild(card);
  });
  grid.append(left, right);
  root.appendChild(grid);
});
