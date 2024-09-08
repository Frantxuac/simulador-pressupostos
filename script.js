let currentPage = 1;
const itemsPerPage = 10;
let providers = [];
let products = [];
let history = [];
let totalCost = 0;
let selectedProducts = {}; // Objeto para almacenar productos seleccionados y sus cantidades
let chatHistory = [];
let lastOfferTime = Date.now();  // Guardamos el momento en que se envió la última oferta
let fastResponseTime = 20000;  // 1/3 minuto en milisegundos
let slowResponseTime = 60000; // 1 minuto en milisegundos

function loadData() {
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            providers = data.providers;
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
    let selectedProductsList = [];  // Para negotiationDetails

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
            selectedProductsList.push({ name: productName, quantity: quantity });
        }
    }

    // Guardar en negotiationDetails
    negotiationDetails = {
        requesterName: requesterName,
        provider: provider,
        products: selectedProductsList,
        initialDeliveryDate: deliveryDate,
        currentDeliveryDate: deliveryDate
    };

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

    // Generar código aleatorio de 4 letras y 4 cifras
    const code = generateRandomCode();

    // Título
    doc.setFontSize(18);
    doc.text('Resum de la Cotització', 10, 10);

    // Código de presupuesto
    doc.setFontSize(12);
    doc.text(`Codi de pressupost: ${code}`, 10, 20);

    // Organizar los datos del cliente y proveedor en dos columnas específicas
    const leftColumn = 10;
    const rightColumn = 110;

    // Cliente (columna izquierda)
    doc.text('Dades del Client', leftColumn, 30);
    doc.text(negotiationDetails.requesterName || "No especificado", leftColumn, 40);

    // Proveedor (columna derecha con tipo de servicio)
    const serviceType = document.getElementById('serviceType').value;
    doc.text('Dades del Proveïdor', rightColumn, 30);
    doc.text(`${negotiationDetails.provider || "No especificado"} (${serviceType})`, rightColumn, 40);

    // Crear tabla con productos
    const tableData = negotiationDetails.products.map(product => {
        const productPrice = products.find(p => p.Name === product.name).Price; // Precio unitario
        const totalProductPrice = product.quantity * productPrice; // Precio total por producto

        return [
            product.name,
            product.quantity,
            formatCurrency(productPrice),  // Formatear el precio unitario
            formatCurrency(totalProductPrice) // Formatear el precio total
        ];
    });

    // Verificar si hay descuento o penalización y solo mostrar la información sin recalcular el total
    const deliveryDaysDiff = calculateDaysDifference(new Date(), new Date(negotiationDetails.currentDeliveryDate));
    let adjustmentRow = [];
    if (deliveryDaysDiff <= 3) {
        adjustmentRow = ['Penalització per entrega ràpida', '', '', formatCurrency(totalCost * 0.35)]; // Mostrar el valor de la penalización
        tableData.push(adjustmentRow);
    } else if (deliveryDaysDiff > 28) {
        adjustmentRow = ['Descompte per entrega relax', '', '', formatCurrency(totalCost * -0.20)]; // Mostrar el valor del descuento
        tableData.push(adjustmentRow);
    }

    // Calcular el IVA y el total con IVA
    const iva = totalCost * 0.21;
    const totalWithIva = totalCost + iva;

    // Añadir una fila de totales al final de la tabla
    tableData.push(['', '', 'Total (sense IVA)', formatCurrency(totalCost)]);
    tableData.push(['', '', 'IVA (21%)', formatCurrency(iva)]);
    tableData.push(['', '', 'Total (amb IVA)', formatCurrency(totalWithIva)]);

    // Agregar tabla con productos al PDF
    doc.autoTable({
        head: [['Producte', 'Quantitat', 'Preu Unitari', 'Preu Total']],
        body: tableData,
        startY: 50, // Iniciar la tabla después de los datos de cliente y proveedor
        styles: {
            fontSize: 12
        },
        didParseCell: (data) => {
            const rowIndex = data.row.index;
            const isTotalRow = rowIndex >= tableData.length - 3; // Últimas 3 filas son los totales
            if (isTotalRow) {
                data.cell.styles.fontStyle = 'bold'; // Negrita
                data.cell.styles.fillColor = [240, 240, 240]; // Fondo gris claro
            }
        }
    });

    // Añadir frase con las fechas de entrega debajo de la tabla de productos
    let finalY = doc.lastAutoTable.finalY + 10; // Posición final después de la tabla
    doc.text(`La data acordada d'entrega és: ${negotiationDetails.currentDeliveryDate}.`, 10, finalY);
    doc.text(`La petició inicial del client era: ${negotiationDetails.initialDeliveryDate}.`, 10, finalY + 10);

    // Resumen de negociación (si la hubo)
    if (negotiationAttempts > 0) {
        finalY += 20; // Añadir espacio para la tabla de negociación
        const ivaNegotiation = finalOffer * 0.21;
        const finalWithIvaNegotiation = finalOffer + ivaNegotiation;
        const negotiationData = [
            ['Nombre de negociacions', negotiationAttempts],
            ['Preu Inicial', formatCurrency(initialOffer)],
            ['Preu Final', formatCurrency(finalOffer)],
            ['IVA (21%)', formatCurrency(ivaNegotiation)],
            ['Preu Final amb IVA', formatCurrency(finalWithIvaNegotiation)]
        ];

        doc.autoTable({
            head: [['Detall de la Negociació', 'Valor']],
            body: negotiationData,
            startY: finalY, // Iniciar la tabla después de la frase de las fechas
            styles: {
                fontSize: 12
            },
            didParseCell: (data) => {
                data.cell.styles.fontStyle = 'bold'; // Aplicar negrita a la celda de la cabecera
            }
        });
    }

    // Añadir pie de página
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.text('Aquest és un pressupost fictici creat pel Simulador de Pressupostos del Politècnics', 10, pageHeight - 10);

    // Descargar el PDF con el nombre personalizado
    const fileName = `Cotitzacio-${negotiationDetails.provider}-${code}.pdf`;
    doc.save(fileName);
}



function calculateDaysDifference(startDate, endDate) {
    const timeDiff = endDate - startDate;
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}


// Función para generar un código aleatorio de 4 letras y 4 cifras
function generateRandomCode() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    let code = '';
    
    // Generar 4 letras aleatorias
    for (let i = 0; i < 4; i++) {
        code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    
    // Generar 4 números aleatorios
    for (let i = 0; i < 4; i++) {
        code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    
    return code;
}

// Función para formatear las cantidades económicas (número seguido de €)
function formatCurrency(amount) {
    return `${amount.toLocaleString('ca-ES')} €`;  // Añadir espacio antes del símbolo €
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
    const providerName = negotiationDetails.provider;
    const providerBehavior = providers.find(p => p.Provider === providerName).behavior;  // Obtener comportamiento

    let acceptanceThreshold; // Diferencia aceptable en %
    
    // Definir el comportamiento basado en el perfil del proveedor
    switch (providerBehavior) {
        case 'flexible':
            acceptanceThreshold = 0.10; // Acepta contraofertas con diferencia de hasta 10%
            break;
        case 'rígid':
            acceptanceThreshold = 0.02; // Solo acepta contraofertas cercanas, 2% de diferencia
            break;
        case 'agressiu':
            acceptanceThreshold = 0.20; // Puede negociar más, hasta 20% de diferencia
            break;
        default:
            acceptanceThreshold = 0.05; // Valor por defecto
    }

    const difference = Math.abs(currentOffer - counterOffer);

    // Incrementar el número de negociaciones, incluso en el primer intento
    negotiationAttempts++;

    if (difference <= currentOffer * acceptanceThreshold) {
        // Aceptar la contraoferta si la diferencia está dentro del umbral
        currentOffer = counterOffer;
        finalOffer = currentOffer;
        alert('El proveïdor ha acceptat la teva oferta.');
        endNegotiation();
    } else {
        // Rechazar la oferta si está fuera del rango aceptable
        alert('El proveïdor ha rebutjat la teva oferta.');
        if (negotiationAttempts >= maxNegotiations) {
            alert('El proveïdor ha arribat al màxim de negociacions.');
            endNegotiation();
        }
    }
}



// Añadir un evento para que la tecla ENTER también envíe la oferta
document.getElementById('counterOffer').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        submitCounterOffer();  // Ejecutar la función cuando se presiona ENTER
    }
});


function acceptOffer() {
    finalOffer = currentOffer;
    alert('Has acceptat l\'oferta del proveïdor.');
    endNegotiation();
}

function endNegotiation() {
    const resultsDiv = document.getElementById('quotationResults');
    
    let productsDetails = '';
    negotiationDetails.products.forEach(product => {
        const productData = products.find(p => p.Name === product.name);
        const productPrice = productData.Price; // Precio unitario original
        const totalProductPrice = product.quantity * productPrice; // Precio total sin bonificaciones o penalizaciones
        productsDetails += `
            <p><strong>Producte:</strong> ${product.name} - 
            <strong>Quantitat:</strong> ${product.quantity} - 
            <strong>Preu Unitari:</strong> ${formatCurrency(productPrice)} - 
            <strong>Preu Total:</strong> ${formatCurrency(totalProductPrice)}</p>`;
    });

    let adjustmentText = '';
    if (finalOffer < initialOffer) {
        adjustmentText = 'Bonificació aplicada per resposta ràpida.';
    } else if (finalOffer > initialOffer) {
        adjustmentText = 'Penalització aplicada per resposta lenta.';
    }

    let finalOfferText = finalOffer > 0 ? formatCurrency(finalOffer) : "NO S'HA ARRIBAT A CAP ACORD";

    resultsDiv.innerHTML = `
        <p><strong>Client:</strong> ${negotiationDetails.requesterName}</p>
        <p><strong>Proveïdor:</strong> ${negotiationDetails.provider}</p>
        ${productsDetails}
        <p><strong>Preu Inicial del Proveïdor:</strong> ${formatCurrency(initialOffer)}</p>
        <p><strong>Oferta Final Acceptada:</strong> ${finalOfferText}</p>
        <p><strong>Detalls de l'Oferta:</strong> ${adjustmentText}</p>
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
        addMessageToChat('Client', message);
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

   // Inicializar Flatpickr con las mejoras solicitadas
flatpickr("#deliveryDate", {
    dateFormat: "d-m-Y", // Formato de fecha: Año-Mes-Día
    allowInput: true,
    locale: {
        firstDayOfWeek: 1, // Empezar la semana el lunes
        weekdays: {
            shorthand: ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'],
            longhand: ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge']
        },
        months: {
            shorthand: ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'],
            longhand: ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre']
        }
    },
    monthSelectorType: "static" // Mostrar el mes y el año en el encabezado
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
