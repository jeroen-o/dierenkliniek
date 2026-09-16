function copyBadgeCode(btn) {
  const code = document.getElementById('badge-html-code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = '✓ Gekopieerd';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Kopieer'; btn.classList.remove('copied'); }, 2000);
  }).catch(() => {
    const range = document.createRange();
    range.selectNode(document.getElementById('badge-html-code'));
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
    btn.textContent = '✓ Gekopieerd';
    setTimeout(() => btn.textContent = 'Kopieer', 2000);
  });
}
