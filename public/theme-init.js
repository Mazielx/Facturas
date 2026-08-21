(function() {
  var t = localStorage.getItem('theme');
  var d = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.add(d ? 'dark' : 'light');
})();
