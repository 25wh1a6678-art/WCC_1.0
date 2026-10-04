const params = new URLSearchParams(window.location.search);
const target = params.get('target');
const targetEl = document.getElementById('target-url');
if (targetEl) {
  targetEl.textContent = `Target: ${target || 'unknown page'}`;
}
