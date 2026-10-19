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
  orderForm.insertAdjacentHTML('afterbegin', `
    <div class="client-request-fields">
      <div class="form-step"><span>1</span><h3>Seus dados</h3></div>
      <div class="client-fields-grid">
        <label class="client-field client-field-wide"><span>Nome completo</span><input id="clientName" name="clientName" type="text" autocomplete="name" minlength="3" required placeholder="Digite seu nome completo" /></label>
        <label class="client-field"><span>CPF</span><input id="clientCpf" name="clientCpf" type="text" inputmode="numeric" autocomplete="off" maxlength="14" required placeholder="000.000.000-00" /></label>
        <label class="client-field"><span>E-mail</span><input id="clientEmail" name="clientEmail" type="email" autocomplete="email" required placeholder="voce@email.com" /></label>
      </div>
    </div>`);
  const orderSteps = orderForm.querySelectorAll('.form-step span');
  orderSteps[1].textContent = '2';
  orderSteps[2].textContent = '3';
  const style = document.createElement('style');
  style.textContent = `.client-request-fields{margin-bottom:29px}.client-fields-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.client-field{display:flex;flex-direction:column;gap:6px;color:var(--ink);font-size:12px;font-weight:600}.client-field-wide{grid-column:1/-1}.client-field input{width:100%;border:1px solid #dfe3dc;padding:12px;color:var(--ink);font:13px var(--sans)}.client-field input:focus{outline:2px solid #dceadd;border-color:#668574}@media(max-width:760px){.client-fields-grid{grid-template-columns:1fr}.client-field-wide{grid-column:auto}}`;
  document.head.appendChild(style);
  orderLabel.textContent = 'Arraste seu Shapefile aqui';
  orderLabel.nextElementSibling.textContent = 'ou clique para selecionar · somente Shapefile compactado (.zip)';
}
makeDropzone(document.querySelector('#dropzone'), orderInput, orderLabel);
if (orderForm && modal) {
  const cpfInput = document.querySelector('#clientCpf');
  cpfInput.addEventListener('input', () => {
    const digits = cpfInput.value.replace(/\D/g, '').slice(0, 11);
    cpfInput.value = digits.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  });
  const isValidCpf = (value) => {
    const cpf = value.replace(/\D/g, '');
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
    const digit = (length) => {
      let sum = 0;
      for (let i = 0; i < length; i += 1) sum += Number(cpf[i]) * (length + 1 - i);
      const result = (sum * 10) % 11;
      return result === 10 ? 0 : result;
    };
    return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
  };
  orderForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!orderForm.checkValidity()) { orderForm.reportValidity(); return; }
    if (!isValidCpf(cpfInput.value)) {
      cpfInput.setCustomValidity('Informe um CPF válido.');
      cpfInput.reportValidity();
      cpfInput.setCustomValidity('');
      return;
    }
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
    if (!file) { document.querySelector('#trialDropzone').focus(); return; }
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
