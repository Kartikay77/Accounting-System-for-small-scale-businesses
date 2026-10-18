document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('print-invoice-button');

  if (button) {
    button.addEventListener('click', () => {
      window.print();
    });
  }
});