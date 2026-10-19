function makeDropzone(dropzone, input, label) {
  if (!dropzone || !input || !label) return;
  const showFile = (file) => {
    if (!file) return;
    label.textContent = file.name;
    dropzone.classList.add('dragover');
  };
  input.addEventListener('change', () => showFile(input.files[0]));
  ['dragenter', 'dragover'].forEach((eventName) => dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach((eventName) => dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove('dragover');
  }));
  dropzone.addEventListener('drop', (event) => {
    const [file] = event.dataTransfer.files;
    if (!file) return;
    const data = new DataTransfer();
    data.items.add(file);
    input.files = data.files;
    showFile(file);
  });
}

const orderForm = document.querySelector('#orderForm');
const modal = document.querySelector('#modal');
const orderInput = document.querySelector('#mapFile');
const orderLabel = document.querySelector('#fileLabel');
if (orderInput && orderLabel) {
  orderLabel.textContent = 'Arraste seu Shapefile aqui';
  orderLabel.nextElementSibling.textContent = 'ou clique para selecionar · somente Shapefile compactado (.zip)';
}
makeDropzone(document.querySelector('#dropzone'), orderInput, orderLabel);
if (orderForm && modal) {
  orderForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const mapFile = orderInput.files[0];
    if (!mapFile || !mapFile.name.toLowerCase().endsWith('.zip')) {
      orderLabel.textContent = 'Envie um Shapefile compactado em .zip';
      return;
    }
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  });
  const closeModal = () => { modal.hidden = true; document.body.style.overflow = ''; };
  document.querySelectorAll('.close, .close-modal').forEach((button) => button.addEventListener('click', closeModal));
  modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
}

const trialForm = document.querySelector('#trialForm');
const trialFile = document.querySelector('#trialFile');
makeDropzone(document.querySelector('#trialDropzone'), trialFile, document.querySelector('#trialFileLabel'));
if (trialForm && trialFile) {
  trialForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const instruction = document.querySelector('#trialInstructions').value.trim();
    const file = trialFile.files[0];
    if (!file) {
      document.querySelector('#trialDropzone').focus();
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      document.querySelector('#trialFileLabel').textContent = 'Escolha uma imagem de até 5 MB';
      return;
    }
    document.querySelector('#previewImage').src = URL.createObjectURL(file);
    document.querySelector('#resultCopy').textContent = instruction ? `Instrução registrada: “${instruction}”` : 'A correção solicitada foi registrada para revisão.';
    document.querySelector('#resultEmpty').hidden = true;
    document.querySelector('#resultReady').hidden = false;
  });
}
