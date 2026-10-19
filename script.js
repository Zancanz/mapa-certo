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

const MAX_MAP_FILE_SIZE = 30 * 1024 * 1024;
const MAX_UNCOMPRESSED_SIZE = 150 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 50;
const REQUIRED_SHAPEFILE_FILES = ['.shp', '.shx', '.dbf'];
const OPTIONAL_SHAPEFILE_FILES = ['.prj', '.cpg', '.sbn', '.sbx', '.qix', '.shp.xml'];

const getZipEntries = async (file) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length < 22) throw new Error('O arquivo não é um .zip válido.');
  const view = new DataView(bytes.buffer);
  const readUint32 = (offset) => view.getUint32(offset, true);
  let endOffset = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset -= 1) {
    if (readUint32(offset) === 0x06054b50) { endOffset = offset; break; }
  }
  if (endOffset < 0) throw new Error('O arquivo não é um .zip válido.');
  const entriesCount = view.getUint16(endOffset + 10, true);
  let offset = readUint32(endOffset + 16);
  if (entriesCount > 20) throw new Error('O arquivo possui itens demais para um Shapefile.');
  const decoder = new TextDecoder('utf-8');
  const entries = [];
  for (let index = 0; index < entriesCount; index += 1) {
    if (readUint32(offset) !== 0x02014b50) throw new Error('A estrutura do .zip é inválida.');
    const flags = view.getUint16(offset + 8, true);
    const compressedSize = readUint32(offset + 20);
    const uncompressedSize = readUint32(offset + 24);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const nameBytes = bytes.slice(offset + 46, offset + 46 + nameLength);
    const name = decoder.decode(nameBytes);
    if ((flags & 1) !== 0) throw new Error('Arquivos compactados com senha não são aceitos.');
    if (name.includes('..') || name.startsWith('/') || name.includes('\\')) throw new Error('O .zip possui um caminho de arquivo inválido.');
    if (uncompressedSize > MAX_UNCOMPRESSED_SIZE || (compressedSize > 0 && uncompressedSize / compressedSize > MAX_COMPRESSION_RATIO)) {
      throw new Error('O .zip excede o limite de segurança de descompactação.');
    }
    entries.push(name);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries.filter((name) => !name.endsWith('/'));
};

const validateShapefileZip = async (file) => {
  if (!file || !file.name.toLowerCase().endsWith('.zip')) return 'Envie um Shapefile compactado em .zip.';
  if (file.size > MAX_MAP_FILE_SIZE) return 'O arquivo deve ter no máximo 30 MB.';
  const entries = await getZipEntries(file);
  if (!entries.length) return 'O .zip está vazio.';
  const names = entries.map((name) => name.split('/').pop().toLowerCase());
  const extensions = names.map((name) => name.endsWith('.shp.xml') ? '.shp.xml' : name.slice(name.lastIndexOf('.')));
  if (extensions.some((extension) => ![...REQUIRED_SHAPEFILE_FILES, ...OPTIONAL_SHAPEFILE_FILES].includes(extension))) {
    return 'O .zip contém arquivos não permitidos. Envie somente os componentes do Shapefile.';
  }
  if (REQUIRED_SHAPEFILE_FILES.some((extension) => !extensions.includes(extension))) {
    return 'O Shapefile precisa conter os arquivos .shp, .shx e .dbf.';
  }
  const stems = names.map((name) => name.replace(/\.shp\.xml$|\.[^.]+$/, ''));
  if (new Set(stems).size !== 1) return 'Os arquivos do Shapefile devem ter o mesmo nome-base.';
  return null;
};

const orderForm = document.querySelector('#orderForm');
const modal = document.querySelector('#modal');
const orderInput = document.querySelector('#mapFile');
const orderLabel = document.querySelector('#fileLabel');
if (orderInput && orderLabel) {
  orderForm.insertAdjacentHTML('afterbegin', `
    <div class="client-request-fields">
      <div class="form-step"><span>1</span><h3>Seus dados</h3></div>
      <div class="client-fields-grid">
        <label class="client-field"><span>Nome completo</span><input id="clientName" name="clientName" type="text" autocomplete="name" minlength="3" required placeholder="Digite seu nome completo" /></label>
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
  orderLabel.nextElementSibling.textContent = 'ou clique para selecionar · somente Shapefile compactado (.zip, até 30 MB)';
}
makeDropzone(document.querySelector('#dropzone'), orderInput, orderLabel);
if (orderForm && modal) {
  orderForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!orderForm.checkValidity()) {
      orderForm.reportValidity();
      return;
    }
    const mapFile = orderInput.files[0];
    const fileError = await validateShapefileZip(mapFile);
    if (fileError) {
      orderLabel.textContent = fileError;
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
