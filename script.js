let currentPage = 1;
const itemsPerPage = 10;
let providers = [];
let products = [];
let history = [];
let totalCost = 0;
let selectedProducts = {}; // Objeto para almacenar productos seleccionados y sus cantidades
let chatHistory = [];

function loadData() {
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            providers = data.providersInfo;
            products = data.products;
            console.log("Data loaded successfully:", data);
            updateServiceTypes();
        })
        .catch(error => console.error('Error loading JSON data:', error));
}

function updateServiceTypes() {
    const serviceTypeSelect = document.getElementById('serviceType');
    serviceTypeSelect.innerHTML = '<option value="" disabled selected> Escull un tipus de servei</option>';

    const serviceTypes = [...new Set(providers.map(provider => provider.Category))];
    serviceTypes.forEach(serviceType => {
        const option = document.createElement('option');
        option.value = serviceType;
        option.textContent = serviceType;
        serviceTypeSelect.appendChild(option);
    });

    M.FormSelect.init(serviceTypeSelect);
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');

    if (screenId === 'history') {
        loadHistory();
    } else if (screenId === 'providers') {
        loadProviders();
    }
}

function updateProviders() {
    const serviceType = document.getElementById('serviceType').value;
    const providerSelect = document.getElementById('provider');
    providerSelect.innerHTML = '<option value="" disabled selected>Seleccioni el Proveidor</option>';

    const filteredProviders = providers.filter(provider => provider.Category === serviceType);

    filteredProviders.forEach(provider => {
        const option = document.createElement('option');
        option.value = provider.Provider;
        option.textContent = provider.Provider;
        providerSelect.appendChild(option);
    });

    M.FormSelect.init(providerSelect);
}

function updateProducts() {
    const providerName = document.getElementById('provider').value;
    const productsContainer = document.getElementById('productsContainer');
    productsContainer.innerHTML = '';

    const filteredProducts = products.filter(product => product.Provider === providerName);
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

    let paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    let column1 = document.createElement('div');
    let column2 = document.createElement('div');
    column1.classList.add('column');
    column2.classList.add('column');

    paginatedProducts.forEach((product, index) => {
        const div = document.createElement('div');
        div.classList.add('product');
        const productName = product.Name;
        const quantity = selectedProducts[productName] ? selectedProducts[productName].quantity : 0;
        const isChecked = selectedProducts[productName] ? selectedProducts[productName].isChecked : false;

        div.innerHTML = `
            <div class="accordion">
                <div class="accordion-item">
                    <div class="accordion-header" id="heading-${productName}">
                        <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${productName}" aria-expanded="true" aria-controls="collapse-${productName}">
                            ${productName} - €${product.Price.toFixed(2)} (no inclou IVA)
                        </button>
                    </div>
                    <div id="collapse-${productName}" class="accordion-collapse collapse" aria-labelledby="heading-${productName}" data-bs-parent="#productsContainer">
                        <div class="accordion-body">
                            <label>
                                <input type="checkbox" id="${productName}" name="products" value="${productName}" ${isChecked ? 'checked' : ''}>
                                <span>Seleccionar</span>
                            </label>
                            <input type="number" id="${productName}_quantity" name="${productName}_quantity" min="0" value="${quantity}" ${isChecked ? '' : 'disabled'}>
                            <img src="${product.Image}" alt="${productName}">
                            <span>${product.Description}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (index % 2 === 0) {
            column1.appendChild(div);
        } else {
            column2.appendChild(div);
        }

        const checkbox = div.querySelector('input[type="checkbox"]');
        const quantityInput = div.querySelector('input[type="number"]');
        checkbox.addEventListener('change', () => {
            quantityInput.disabled = !checkbox.checked;
            if (!checkbox.checked) {
                quantityInput.value = 0;
            }
            selectedProducts[productName] = {
                isChecked: checkbox.checked,
                quantity: parseInt(quantityInput.value, 10)
            };
        });
        quantityInput.addEventListener('input', () => {
            selectedProducts[productName].quantity = parseInt(quantityInput.value, 10);
        });
    });

    const columnsWrapper = document.createElement('div');
    columnsWrapper.classList.add('columns-wrapper');
    columnsWrapper.appendChild(column1);
    columnsWrapper.appendChild(column2);
    productsContainer.appendChild(columnsWrapper);

    // Añadir controles de paginación
    const paginationControls = document.createElement('div');
    paginationControls.classList.add('pagination-controls');
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.classList.add('page-button');
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.addEventListener('click', () => {
            currentPage = i;
            updateProducts();
        });
        paginationControls.appendChild(pageButton);
    }
    productsContainer.appendChild(paginationControls);

    // Inicializar el acordeón
    const accordions = document.querySelectorAll('.accordion');
    accordions.forEach(accordion => {
        const accordionItems = accordion.querySelectorAll('.accordion-item');
        accordionItems.forEach(item => {
            const header = item.querySelector('.accordion-header');
            header.addEventListener('click', () => {
                const collapse = item.querySelector('.accordion-collapse');
                const isCollapsed = collapse.classList.contains('show');
                accordionItems.forEach(i => i.querySelector('.accordion-collapse').classList.remove('show'));
                if (!isCollapsed) {
                    collapse.classList.add('show');
                }
            });
        });
    });
}

function submitQuotation() {
    const requesterName = document.getElementById('requesterName').value;
    const serviceType = document.getElementById('serviceType').value;
    const provider = document.getElementById('provider').value;
    const deliveryDate = document.getElementById('deliveryDate').value;
    
    const currentDate = new Date();
    const deliveryDateObj = new Date(deliveryDate);
    const timeDiff = deliveryDateObj - currentDate;
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    totalCost = 0;
    let selectedProductsHtml = '';
    let adjustmentDetails = '';

    for (const productName in selectedProducts) {
        const product = products.find(p => p.Provider === provider && p.Name === productName);
        const quantity = selectedProducts[productName].quantity;
        if (product && quantity > 0) {
            let adjustedPrice = product.Price;
            let adjustment = '';
            let reason = '';

            // Aplicar el sistema de descuentos según la fecha de entrega
            if (daysDiff <= 3) {
                adjustedPrice *= 1.35; // Incremento del 35%
                adjustment = '+35%';
                reason = 'l`entrega és molt urgent (menys de 3 dies restants)';
            } else if (daysDiff <= 7) {
                adjustedPrice *= 1.15; // Incremento del 15%
                adjustment = '+15%';
                reason = 'l`entrega és urgent (entre 3 i 7 dies restants)';
            } else if (daysDiff > 28) {
                adjustedPrice *= 0.80; // Descuento del 20%
                adjustment = '-20%';
                reason = 'l`entrega està planificada amb més de 28 dies d`antelació';
            } else {
                adjustment = '0%';
                reason = 'l`entrega és normal';
            }

            const cost = adjustedPrice * quantity;
            totalCost += cost;
            selectedProductsHtml += `<p>${productName}: ${quantity} x €${adjustedPrice.toFixed(2)} (no inclou IVA) = €${cost.toFixed(2)}</p>`;
            adjustmentDetails += `<p>${productName}: Modificació del preu (${adjustment}) donat que ${reason}</p>`;
        }
    }

    const resultsDiv = document.getElementById('quotationResults');
    resultsDiv.innerHTML = `
        <p><strong>Qui demana: </strong> ${requesterName}</p>
        <p><strong>Tipus de Servei:</strong> ${serviceType}</p>
        <p><strong>Proveïdor:</strong> ${provider}</p>
        ${selectedProductsHtml}
        <p><strong>Data d'entrega desitjada:</strong> ${deliveryDate}</p>
        <p><strong>Preu Total Simulat:</strong> €${totalCost.toFixed(2)} (no inclou IVA)</p>
        <h4>Ajustaments del Preu:</h4>
        ${adjustmentDetails}
    `;
    
    saveQuotation(requesterName, serviceType, provider, selectedProductsHtml, deliveryDate, totalCost, adjustmentDetails);
    showScreen('results');
}

function resetForm() {
    document.getElementById('quotationForm').reset();
    document.getElementById('provider').innerHTML = '<option value="" disabled selected>Seleccioni el Proveidor</option>';
    document.getElementById('productsContainer').innerHTML = '';
    selectedProducts = {}; // Resetear productos seleccionados
    M.FormSelect.init(document.getElementById('provider'));
}

function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const resultsDiv = document.getElementById('quotationResults');
    const content = resultsDiv.innerHTML;

    // Dividir el contenido en líneas individuales
    const lines = content.replace(/<\/?[^>]+(>|$)/g, "").split('\n');

    // Añadir cada línea al PDF
    let y = 20; // Coordenada Y inicial
    lines.forEach(line => {
        doc.text(line.trim(), 10, y);
        y += 10; // Incrementar la coordenada Y para la siguiente línea
    });

    doc.save('cotizacion.pdf');
}

function saveQuotation(requesterName, serviceType, provider, selectedProductsHtml, deliveryDate, totalCost, adjustmentDetails) {
    const quotation = {
        requesterName,
        serviceType,
        provider,
        selectedProductsHtml,
        deliveryDate,
        totalCost,
        adjustmentDetails
    };
    history.push(quotation);
    localStorage.setItem('quotationsHistory', JSON.stringify(history));
}

function loadHistory() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    history = JSON.parse(localStorage.getItem('quotationsHistory')) || [];
    if (history.length === 0) {
        historyList.innerHTML = '<p>No hi ha sol·licituds anteriors.</p>';
    } else {
        history.forEach((quotation, index) => {
            const quotationDiv = document.createElement('div');
            quotationDiv.classList.add('card');
            quotationDiv.innerHTML = `
                <div class="card-content">
                    <span class="card-title">Sol·licitut #${index + 1}</span>
                    <p><strong>Qui demana el pressupost:</strong> ${quotation.requesterName}</p>
                    <p><strong>Tipus de Servei:</strong> ${quotation.serviceType}</p>
                    <p><strong>Proveïdor:</strong> ${quotation.provider}</p>
                    ${quotation.selectedProductsHtml}
                    <p><strong>Data d'entrega desitjada:</strong> ${quotation.deliveryDate}</p>
                    <p><strong>Precio Total Simulado:</strong> €${quotation.totalCost.toFixed(2)} (no inclou IVA)</p>
                    <h4>Ajustaments del preu:</h4>
                    ${quotation.adjustmentDetails}
                </div>
            `;
            historyList.appendChild(quotationDiv);
        });
    }
}

function loadProviders() {
    const providersGrid = document.getElementById('providersGrid');
    providersGrid.innerHTML = '';

    // Ordenar proveedores alfabéticamente
    const sortedProviders = providers.sort((a, b) => a.Provider.localeCompare(b.Provider));

    sortedProviders.forEach(provider => {
        const providerDiv = document.createElement('div');
        providerDiv.classList.add('card');
        providerDiv.innerHTML = `
            <div class="card">
                <div class="card-image">
                    <img src="${provider.Logo}" alt="${provider.Provider}" class="provider-logo">
                </div>
                <div class="card-content">
                    <span class="card-title">${provider.Provider}</span>
                    <p>${provider.Description}</p>
                </div>
                <div class="card-action">
                    <button class="btn waves-effect waves-light" onclick="showProviderDetails('${provider.Provider}')">Veure Productes</button>
                </div>
            </div>
        `;
        providersGrid.appendChild(providerDiv);
    });
}

function showProviderDetails(providerName) {
    const provider = providers.find(p => p.Provider === providerName);
    const productsList = products.filter(p => p.Provider === providerName).map(product => `
        <p><strong>${product.Name}:</strong> ${product.Description} - €${product.Price.toFixed(2)} (no inclou IVA)</p>
        <img src="${product.Image}" alt="${product.Name}" style="max-width: 100px; max-height: 100px;">
    `).join('');
    
    const modalContent = `
        <h4>${provider.Provider}</h4>
        <p>${provider.Description}</p>
        ${productsList}
    `;

    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.innerHTML = `
        <div class="modal-content">
            ${modalContent}
        </div>
        <div class="modal-footer">
            <button class="modal-close btn waves-effect waves-light">Cerrar</button>
        </div>
    `;
    document.body.appendChild(modal);
    const instance = M.Modal.init(modal);
    instance.open();
    modal.addEventListener('click', () => {
        instance.destroy();
        modal.remove();
    });
}

let negotiationAttempts = 0;
const maxNegotiations = 4;
let currentOffer = 0;
let initialOffer = 0;
let finalOffer = 0;
let negotiationDetails = {};

function startNegotiation() {
    initialOffer = totalCost; // Guardamos la oferta inicial
    currentOffer = totalCost;
    finalOffer = 0;
    negotiationAttempts = 0;

    // Guardar detalles de la negociación
    const provider = document.getElementById('provider').value;
    const requesterName = document.getElementById('requesterName').value;
    const initialDeliveryDate = document.getElementById('deliveryDate').value;
    const selectedProducts = [];
    document.querySelectorAll('#productsContainer .product').forEach(productDiv => {
        const checkbox = productDiv.querySelector('input[type="checkbox"]');
        if (checkbox.checked) {
            const productName = checkbox.value;
            const quantity = parseInt(productDiv.querySelector('input[type="number"]').value, 10);
            selectedProducts.push({ name: productName, quantity: quantity });
        }
    });

    negotiationDetails = {
        provider: provider,
        requesterName: requesterName,
        initialDeliveryDate: initialDeliveryDate,
        currentDeliveryDate: initialDeliveryDate,
        products: selectedProducts
    };

    showScreen('negotiation');
    updateNegotiationDetails();
}

function updateNegotiationDetails() {
    const negotiationDetailsDiv = document.getElementById('negotiationDetails');
    let productsDetails = '';
    negotiationDetails.products.forEach(product => {
        productsDetails += `<p><strong>Producte:</strong> ${product.name} - <strong>Quantitat:</strong> ${product.quantity}</p>`;
    });

    negotiationDetailsDiv.innerHTML = `
        <p><strong>Client:</strong> ${negotiationDetails.requesterName}</p>
        <p><strong>Proveïdor:</strong> ${negotiationDetails.provider}</p>
        <p><strong>Data d'entrega inicial:</strong> ${negotiationDetails.initialDeliveryDate}</p>
        <p><strong>Nova data d'entrega:</strong> ${negotiationDetails.currentDeliveryDate}</p>
        ${productsDetails}
        <p><strong>Oferta Inicial del Proveïdor:</strong> €${initialOffer.toFixed(2)}</p>
        ${finalOffer > 0 ? `<p><strong>Oferta Final Acceptada:</strong> €${finalOffer.toFixed(2)}</p>` : ''}
        <p><strong>Oferta Actual del Proveïdor:</strong> €${currentOffer.toFixed(2)}</p>
    `;
}

function submitCounterOffer() {
    const counterOffer = parseFloat(document.getElementById('counterOffer').value);
    if (isNaN(counterOffer) || counterOffer <= 0) {
        alert('Introdueix una oferta vàlida.');
        return;
    }

    const difference = Math.abs(currentOffer - counterOffer);

    if (difference <= currentOffer * 0.05) {
        // Aceptar la contraoferta si la diferencia es menor o igual al 5%
        currentOffer = counterOffer;
        finalOffer = currentOffer;
        alert('El proveïdor ha acceptat la teva oferta.');
        endNegotiation();
        return;
    } else if (difference <= currentOffer * 0.2) {
        // Hacer una nueva oferta si la diferencia es menor o igual al 20%
        currentOffer = (currentOffer + counterOffer) / 2;
        negotiationAttempts++;

        // Retrasar la fecha de entrega entre 1 y 4 días
        let deliveryDate = new Date(negotiationDetails.currentDeliveryDate);
        deliveryDate.setDate(deliveryDate.getDate() + Math.floor(Math.random() * 4) + 1);
        negotiationDetails.currentDeliveryDate = deliveryDate.toISOString().split('T')[0];
    } else {
        // Rechazar la contraoferta si la diferencia es mayor al 20%
        alert('El proveïdor ha rebutjat la teva oferta.');
        negotiationAttempts++;
    }

    if (negotiationAttempts >= maxNegotiations) {
        alert('El proveïdor ha arribat al màxim de negociacions.');
        finalOffer = 0; // Indicar que no se ha llegado a un acuerdo
        endNegotiation();
    } else {
        updateNegotiationDetails();
    }
}

function acceptOffer() {
    finalOffer = currentOffer;
    alert('Has acceptat l\'oferta del proveïdor.');
    endNegotiation();
}

function endNegotiation() {
    const resultsDiv = document.getElementById('quotationResults');
    let productsDetails = '';
    negotiationDetails.products.forEach(product => {
        productsDetails += `<p><strong>Producte:</strong> ${product.name} - <strong>Quantitat:</strong> ${product.quantity}</p>`;
    });

    let finalOfferText = finalOffer > 0 ? `€${finalOffer.toFixed(2)}` : "NO S'HA ARRIBAT A CAP ACORD";

    resultsDiv.innerHTML = `
        <p><strong>Client:</strong> ${negotiationDetails.requesterName}</p>
        <p><strong>Proveïdor:</strong> ${negotiationDetails.provider}</p>
        <p><strong>Data d'entrega inicial:</strong> ${negotiationDetails.initialDeliveryDate}</p>
        <p><strong>Nova data d'entrega:</strong> ${negotiationDetails.currentDeliveryDate}</p>
        ${productsDetails}
        <p><strong>Oferta Inicial del Proveïdor:</strong> €${initialOffer.toFixed(2)}</p>
        <p><strong>Oferta Final Acceptada:</strong> ${finalOfferText}</p>
        <h4>Detalls de les Negociacions:</h4>
        <p>Nombre de Negociacions: ${negotiationAttempts}</p>
        <p>Preu Final: ${finalOfferText}</p>
    `;
    showScreen('results');
}

function cancelNegotiation() {
    alert('Has cancel·lat la negociació.');
    showScreen('results');
}

function startChat() {
    chatHistory = [];
    document.getElementById('chatMessages').innerHTML = '';
    showScreen('chat');
}

function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    if (message) {
        addMessageToChat('Alumno', message);
        chatInput.value = '';
        simulateProviderResponse();
    }
}

function addMessageToChat(sender, message) {
    chatHistory.push({ sender, message });
    const chatMessagesDiv = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
    chatMessagesDiv.appendChild(messageDiv);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
}

function simulateProviderResponse() {
    const message = chatHistory[chatHistory.length - 1].message.toLowerCase();
    let responseText = '';

    if (message.includes('preu') || message.includes('cost')|| message.includes('despesa')) {
        responseText = 'El preu varia segons diferents factors, incloent la quantitat i el tipus de servei. Em pots donar més detalls?';
    } else if (message.includes('temps d entrega') || message.includes('entrega')|| message.includes('enviament')) {
        responseText = 'El temps estimat és 3 a 5 dies hàbils, segons la disponibilitat del producte.';
    } else if (message.includes('descompte') || message.includes('promoció')|| message.includes('promocions')) {
        responseText = 'Actualment no oferim promocions, però pots negocionar millors condicions amb el nostre equip comercial. ';
    } else if (message.includes('forma de pagament') || message.includes('pagament')) {
        responseText = 'Aceptem pagaments amb targeta de crèdit, transferència bancària i PayPal. Tens alguna preferència?';
    } else if (message.includes('devolució') || message.includes('cancelació')) {
        responseText = 'Les devolucions es poden realitzar dintre dels 30 dies següents a la compra, sempre i quan els productes estiguin en el seu estat original.';
    } else {
        responseText = 'Gràcies pel teu missatge. Ens pots concretar de què vols parlar? Preu, enviament, promocions, forma de pagamentmo devolució?';
    }

    setTimeout(() => {
        addMessageToChat('Proveïdor', responseText);
    }, 750); // Respuesta simulada tras 0'75 segundo
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    showScreen('home');
    document.getElementById('provider').addEventListener('change', updateProducts);

    // Inicializar Materialize CSS
    const elems = document.querySelectorAll('select');
    M.FormSelect.init(elems);
    const sidenav = document.querySelectorAll('.sidenav');
    M.Sidenav.init(sidenav);

    // Inicializar Flatpickr
    flatpickr("#deliveryDate", {
        dateFormat: "Y-m-d",
        allowInput: true
    });

    // Vacía el historial de presupuestos cada vez que se carga la página
    localStorage.removeItem('quotationsHistory');
    loadData();
    showScreen('home');

    // Detectar dispositivos móviles y forzar la recarga
    if (/Mobi|Android/i.test(navigator.userAgent)) {
        window.location.reload(true);  // Forzar la recarga completa de la página en móviles
    }

});
