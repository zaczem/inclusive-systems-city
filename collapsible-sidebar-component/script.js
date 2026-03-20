const app = document.querySelector('.app');
const toggleButton = document.getElementById('sidebar-toggle');
const navItems = Array.from(document.querySelectorAll('.nav-item'));

function setSidebarState(expanded) {
  const state = expanded ? 'expanded' : 'collapsed';
  app.dataset.sidebarState = state;
  toggleButton.setAttribute('aria-expanded', String(expanded));
  toggleButton.setAttribute('aria-label', expanded ? 'Collapse navigation' : 'Expand navigation');
}

function setActiveItem(targetItem) {
  navItems.forEach((item) => {
    const isActive = item === targetItem;
    item.classList.toggle('is-active', isActive);
    if (isActive) {
      item.setAttribute('aria-current', 'page');
    } else {
      item.removeAttribute('aria-current');
    }
  });
}

toggleButton.addEventListener('click', () => {
  const expanded = app.dataset.sidebarState !== 'collapsed';
  setSidebarState(!expanded);
});

navItems.forEach((item) => {
  item.addEventListener('click', () => {
    setActiveItem(item);
  });
});

setSidebarState(true);
