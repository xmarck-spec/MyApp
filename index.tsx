/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
declare const jspdf: any;
declare const XLSX: any;

// --- DATA MOCKS ---
let mockStockItems = [
  { name: 'Produto X', quantity: 120, location: 'A1', category: 'Eletrônicos', lastUpdated: '2023-11-15' },
  { name: 'Produto Y', quantity: 120, location: 'A1', category: 'Eletrônicos', lastUpdated: '2023-11-20' },
  { name: 'Produto Z', quantity: 120, location: 'A1', category: 'Ferragens', lastUpdated: '2023-11-20' },
  { name: 'Parafuso Allen M5x20', quantity: 1500, location: 'Corredor A', category: 'Fixadores', lastUpdated: '2023-10-05' },
  { name: 'Arruela Lisa M5', quantity: 3200, location: 'Corredor A', category: 'Fixadores', lastUpdated: '2023-10-05' },
  { name: 'Óleo Lubrificante WD-40', quantity: 50, location: 'Corredor B', category: 'Químicos', lastUpdated: '2023-11-15' },
];

let mockLocations = ['Corredor A', 'Corredor B', 'Corredor C', 'Ferramentas', 'A1'];

let mockEntradas = [
    { id: Date.now() + 1, itemName: 'Produto X', quantity: 50, date: '2023-10-26' },
    { id: Date.now() + 3, itemName: 'Parafuso Allen M5x20', quantity: 500, date: '2023-10-05' },
    { id: Date.now() + 4, itemName: 'Produto Y', quantity: 120, date: '2023-11-20' },

];
let mockSaidas = [
    { id: Date.now() + 2, itemName: 'Óleo Lubrificante WD-40', quantity: 10, date: '2023-10-25', observation: 'Retirada para manutenção preventiva.' },
];


// --- APPLICATION STATE ---
let state = {
  currentPage: 'Dashboard', // Dashboard, Entradas, Saidas, Locais
  isDashboardExpanded: true,
  stockSearchTerm: '',
  editingEntradaId: null as number | null,
  editingSaidaId: null as number | null,
  editingLocationName: null as string | null,
  editingStockItemName: null as string | null,
  activeFilterType: 'local' as 'local' | 'category' | 'date',
  selectedCategory: 'all',
  selectedLocation: 'all',
  selectedDate: 'all',
  filtersOn: true,
};

// --- EXPORT FUNCTIONS ---
function handleExcelDownload(items: typeof mockStockItems) {
    if (items.length === 0) {
        alert('Não há itens para exportar.');
        return;
    }
    const headers = ["Nome", "Quantidade", "Local", "Categoria", "Última Atualização"];
    const data = items.map(item => ({
        "Nome": item.name,
        "Quantidade": item.quantity,
        "Local": item.location,
        "Categoria": item.category,
        "Última Atualização": item.lastUpdated
    }));

    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });

    const columnWidths = [
        { wch: 30 }, // Nome
        { wch: 12 }, // Quantidade
        { wch: 20 }, // Local
        { wch: 20 }, // Categoria
        { wch: 20 }  // Última Atualização
    ];
    worksheet['!cols'] = columnWidths;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Estoque");

    XLSX.writeFile(workbook, "relatorio_estoque.xlsx");
}

function handleEmail(items: typeof mockStockItems) {
    if (items.length === 0) {
        alert('Não há itens para enviar por e-mail.');
        return;
    }
    const subject = "Relatório de Estoque";
    let body = "Segue o relatório de estoque atual:\n\n";
    body += "Nome do Item | Quantidade | Local\n";
    body += "-----------------------------------\n";
    items.forEach(item => {
        body += `${item.name} | ${item.quantity} | ${item.location}\n`;
    });

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function handleShare(items: typeof mockStockItems) {
    if (items.length === 0) {
        alert('Não há itens para compartilhar.');
        return;
    }

    const { jsPDF } = jspdf;
    const doc = new jsPDF();

    doc.autoTable({
        head: [['Nome', 'Qtd', 'Local', 'Categoria']],
        body: items.map(item => [item.name, item.quantity, item.location, item.category]),
        startY: 20,
    });
    doc.text("Relatório de Estoque", 14, 15);

    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], 'relatorio_estoque.pdf', { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
            await navigator.share({
                files: [pdfFile],
                title: 'Relatório de Estoque',
                text: 'Segue o relatório de estoque atual.',
            });
        } catch (error) {
            console.error('Erro ao compartilhar:', error);
            // Non-critical error, do not alert user unless it's a real problem.
        }
    } else {
        alert('Seu navegador não suporta o compartilhamento de arquivos. O PDF será baixado para que você possa compartilhá-lo manualmente.');
        const link = document.createElement('a');
        const url = URL.createObjectURL(pdfBlob);
        link.href = url;
        link.download = 'relatorio_estoque.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

function exportHistoryToExcel(history: any[], filename: string, headers: string[], keys: string[]) {
    if (history.length === 0) {
        alert('Não há registros no histórico para exportar.');
        return;
    }
    const data = history.map(item => {
        const row: { [key: string]: any } = {};
        keys.forEach((key, index) => {
            row[headers[index]] = item[key];
        });
        return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
    const columnWidths = headers.map(h => ({ wch: h.toLowerCase().includes('produto') ? 30 : (h.toLowerCase().includes('observação') ? 40 : 15) }));
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Histórico");
    XLSX.writeFile(workbook, filename);
}

function exportHistoryToPdf(history: any[], title: string, headers: string[], keys: string[]) {
     if (history.length === 0) {
        alert('Não há registros no histórico para exportar.');
        return;
    }
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    doc.text(title, 14, 15);
    doc.autoTable({
        head: [headers],
        body: history.map(item => keys.map(key => item[key] || '')),
        startY: 20,
    });
    doc.save(`${title.toLowerCase().replace(/\s/g, '_')}.pdf`);
}


// --- RENDER FUNCTIONS ---
const appContainer = document.getElementById('app')!;

function updateListAndDashboard() {
    const dashboardCard = document.querySelector('.dashboard-card');
    if (dashboardCard) {
        dashboardCard.replaceWith(renderDashboardCard());
    }

    const listContainer = document.querySelector('.list-container');
    if (listContainer) {
        listContainer.replaceWith(renderStockListAsCards());
    }
}


function render() {
  appContainer.innerHTML = '';

  const header = renderHeader();
  const mainContent = document.createElement('main');
  mainContent.className = 'main-content';
  
  let pageContent;
  switch (state.currentPage) {
    case 'Dashboard':
      pageContent = renderStockDashboardPage();
      break;
    case 'Entradas':
      pageContent = renderEntradasPage();
      break;
    case 'Saidas':
      pageContent = renderSaidasPage();
      break;
    case 'Locais':
      pageContent = renderLocaisPage();
      break;
    default:
      pageContent = renderStockDashboardPage();
      break;
  }

  mainContent.append(pageContent);
  appContainer.append(header, mainContent);
}

function renderHeader() {
  const header = document.createElement('header');
  header.className = 'header';
  
  const title = document.createElement('h1');

  if (state.currentPage === 'Dashboard') {
    header.innerHTML = `
        <h1>Controle de Estoque</h1>
        <div class="header-icons">
            <svg class="user-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            <svg id="settings-btn" class="settings-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12-.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59 1.69.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
        </div>
    `;
    header.querySelector('#settings-btn')?.addEventListener('click', () => {
        state.currentPage = 'Locais';
        render();
    });
  } else {
     header.innerHTML = `
        <button class="back-button">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <h1>${state.currentPage}</h1>
        <div class="header-placeholder"></div>
     `;
     header.querySelector('.back-button')?.addEventListener('click', () => {
        state.currentPage = 'Dashboard';
        state.editingEntradaId = null;
        state.editingSaidaId = null;
        state.editingLocationName = null;
        state.editingStockItemName = null;
        render();
     });
  }
  
  return header;
}

function getFilteredStockItems() {
    return mockStockItems.filter(item => {
        const term = state.stockSearchTerm.toLowerCase();
        const matchesSearch = !term || item.name.toLowerCase().includes(term) || item.location.toLowerCase().includes(term);
        if (!matchesSearch) return false;

        if (state.filtersOn) {
            if (state.activeFilterType === 'local' && state.selectedLocation !== 'all') {
                return item.location === state.selectedLocation;
            }
            if (state.activeFilterType === 'category' && state.selectedCategory !== 'all') {
                return item.category === state.selectedCategory;
            }
            if (state.activeFilterType === 'date' && state.selectedDate !== 'all') {
                return item.lastUpdated.startsWith(state.selectedDate); // Match YYYY-MM
            }
        }
        return true;
    });
}


function renderStockDashboardPage() {
    const page = document.createElement('div');
    page.className = 'page dashboard-page';

    page.appendChild(renderDashboardCard());

    const stockListHeader = document.createElement('h2');
    stockListHeader.className = 'stock-list-header';
    stockListHeader.textContent = 'Estoque Geral';
    page.appendChild(stockListHeader);

    page.appendChild(renderStockSearch());
    page.appendChild(renderFilterBar());

    if (state.filtersOn) {
        if (state.activeFilterType === 'local') {
            page.appendChild(renderLocationFilter());
        } else if (state.activeFilterType === 'category') {
            page.appendChild(renderCategoryFilter());
        } else if (state.activeFilterType === 'date') {
            page.appendChild(renderDateFilter());
        }
    }

    page.appendChild(renderStockListAsCards());
    page.appendChild(renderActionButtons());
    page.appendChild(renderFooter());

    return page;
}

function renderStockSearch() {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.innerHTML = `
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
        <input type="search" placeholder="Buscar por nome ou local..." class="search-input" value="${state.stockSearchTerm}">
    `;

    const searchInput = searchContainer.querySelector('.search-input') as HTMLInputElement;
    
    searchInput.addEventListener('input', (e) => {
        state.stockSearchTerm = (e.target as HTMLInputElement).value;
        updateListAndDashboard(); 
    });
    
    return searchContainer;
}

function renderDashboardCard() {
    const card = document.createElement('div');
    card.className = 'dashboard-card';

    const header = document.createElement('div');
    header.className = 'dashboard-header';
    header.innerHTML = `
        <h4>Visão Geral do Estoque</h4>
        <div class="dashboard-card-actions">
            <button class="action-icon-btn" id="share-btn" title="Compartilhar PDF">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3s3-1.34-3-3-1.34-3-3-3z"></path></svg>
            </button>
            <button class="action-icon-btn" id="email-btn" title="Enviar por E-mail">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"></path></svg>
            </button>
            <button class="action-icon-btn" id="excel-btn" title="Baixar como Excel">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"></path></svg>
            </button>
        </div>
    `;
    
    header.querySelector('#share-btn')?.addEventListener('click', () => handleShare(getFilteredStockItems()));
    header.querySelector('#email-btn')?.addEventListener('click', () => handleEmail(getFilteredStockItems()));
    header.querySelector('#excel-btn')?.addEventListener('click', () => handleExcelDownload(getFilteredStockItems()));

    const content = document.createElement('div');
    content.className = 'dashboard-content';
    if (!state.isDashboardExpanded) {
        content.style.display = 'none';
    }
    
    const filteredItems = getFilteredStockItems();
    const filteredItemNames = filteredItems.map(item => item.name);

    const relevantEntradas = mockEntradas.filter(entry => filteredItemNames.includes(entry.itemName));
    const relevantSaidas = mockSaidas.filter(exit => filteredItemNames.includes(exit.itemName));

    const totalQuantidadeEntradas = relevantEntradas.reduce((sum, entry) => sum + entry.quantity, 0);
    const totalEntradasRegistros = relevantEntradas.length;
    const totalQuantidadeSaidas = relevantSaidas.reduce((sum, exit) => sum + exit.quantity, 0);
    const totalSaidasRegistros = relevantSaidas.length;

    content.innerHTML = `
        <div class="summary-block">
            <div class="summary-title">ENTRADAS NO PERÍODO</div>
            <div class="summary-value">${totalQuantidadeEntradas}</div>
            <div class="summary-label">em ${totalEntradasRegistros} registros</div>
        </div>
        <div class="summary-block">
            <div class="summary-title">SAÍDAS NO PERÍODO</div>
            <div class="summary-value">${totalQuantidadeSaidas}</div>
            <div class="summary-label">em ${totalSaidasRegistros} registros</div>
        </div>
    `;

    const actions = document.createElement('div');
    actions.className = 'dashboard-actions';
    const toggleButton = document.createElement('button');
    toggleButton.id = 'toggle-dashboard-btn';
    toggleButton.innerHTML = `
        ${state.isDashboardExpanded 
            ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="m12 8-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14l-6-6z"></path></svg> Recolher` 
            : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="m12 15.41-6-6L7.41 8 12 12.58 16.59 8 18 9.41l-6 6z"></path></svg> Expandir`}
    `;
    toggleButton.addEventListener('click', () => {
        state.isDashboardExpanded = !state.isDashboardExpanded;
        render();
    });
    actions.appendChild(toggleButton);
    
    card.append(header, content, actions);
    return card;
}

function renderFilterBar() {
    const filterBar = document.createElement('div');
    filterBar.className = 'filter-bar';

    let filterOptionsHTML = '';
    if (state.filtersOn) {
        filterOptionsHTML = `
        <div class="filter-options">
            <label class="filter-radio-label">
                <input type="radio" name="filterType" value="local" ${state.activeFilterType === 'local' ? 'checked' : ''}>
                <span class="radio-custom"></span>
                <span>LOCAL</span>
            </label>
            <label class="filter-radio-label">
                <input type="radio" name="filterType" value="category" ${state.activeFilterType === 'category' ? 'checked' : ''}>
                <span class="radio-custom"></span>
                <span>CATEGORIA</span>
            </label>
            <label class="filter-radio-label">
                <input type="radio" name="filterType" value="date" ${state.activeFilterType === 'date' ? 'checked' : ''}>
                <span class="radio-custom"></span>
                <span>DATA</span>
            </label>
        </div>
        `;
    }

    filterBar.innerHTML = `
        ${filterOptionsHTML}
        <div class="filter-toggle">
            <span>FILTROS</span>
            <label class="switch">
                <input type="checkbox" ${state.filtersOn ? 'checked' : ''}>
                <span class="slider round"></span>
            </label>
        </div>
    `;

    if (state.filtersOn) {
        filterBar.querySelectorAll('input[name="filterType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                state.activeFilterType = (e.target as HTMLInputElement).value as 'local' | 'category' | 'date';
                render();
            });
        });
    }
    
    filterBar.querySelector('.switch input')?.addEventListener('change', (e) => {
        state.filtersOn = (e.target as HTMLInputElement).checked;
        if (!state.filtersOn) {
            state.selectedCategory = 'all';
            state.selectedLocation = 'all';
            state.selectedDate = 'all';
        }
        render();
    });

    return filterBar;
}

function renderCategoryFilter() {
    const container = document.createElement('div');
    container.className = 'category-filter-container';

    const categories = ['all', ...Array.from(new Set(mockStockItems.map(item => item.category)))];

    categories.forEach(category => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        if (state.selectedCategory === category) {
            btn.classList.add('active');
        }
        btn.textContent = category === 'all' ? 'TODOS' : category;
        btn.onclick = () => {
            state.selectedCategory = category;
            render();
        };
        container.appendChild(btn);
    });

    return container;
}

function renderLocationFilter() {
    const container = document.createElement('div');
    container.className = 'category-filter-container'; // Reuse styles

    const locations = ['all', ...Array.from(new Set(mockStockItems.map(item => item.location)))];

    locations.forEach(location => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        if (state.selectedLocation === location) {
            btn.classList.add('active');
        }
        btn.textContent = location === 'all' ? 'TODOS' : location;
        btn.onclick = () => {
            state.selectedLocation = location;
            render();
        };
        container.appendChild(btn);
    });

    return container;
}

function renderDateFilter() {
    const container = document.createElement('div');
    container.className = 'category-filter-container';

    const months = ['all', ...Array.from(new Set(mockStockItems.map(item => item.lastUpdated.substring(0, 7))))];
    months.sort((a, b) => (a === 'all' ? -1 : b === 'all' ? 1 : b.localeCompare(a)));

    months.forEach(month => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        if (state.selectedDate === month) {
            btn.classList.add('active');
        }

        if (month === 'all') {
            btn.textContent = 'TODOS';
        } else {
            const [year, monthNum] = month.split('-');
            const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
            const formattedDate = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
            btn.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
        }

        btn.onclick = () => {
            state.selectedDate = month;
            render();
        };
        container.appendChild(btn);
    });

    return container;
}

function renderStockListAsCards() {
    const listContainer = document.createElement('div');
    listContainer.className = 'list-container';
    
    const filteredItems = getFilteredStockItems();
  
    if (filteredItems.length > 0) {
        filteredItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'stock-item-card';

            if (state.editingStockItemName === item.name) {
                card.classList.add('editing');
                const form = document.createElement('form');
                form.className = 'edit-stock-form';
                
                form.innerHTML = `
                    <div class="edit-form-grid">
                        <label for="edit-name">Nome</label>
                        <input type="text" id="edit-name" name="name" value="${item.name}" required>

                        <label for="edit-category">Categoria</label>
                        <input type="text" id="edit-category" name="category" value="${item.category}" required>

                        <label for="edit-location">Local</label>
                        <select id="edit-location" name="location" required>
                            ${mockLocations.map(loc => `<option value="${loc}" ${item.location === loc ? 'selected' : ''}>${loc}</option>`).join('')}
                        </select>

                        <label for="edit-lastUpdated">Data</label>
                        <input type="date" id="edit-lastUpdated" name="lastUpdated" value="${item.lastUpdated}" required>
                    </div>
                    <div class="button-group">
                        <button type="submit" class="btn-edit">Salvar</button>
                        <button type="button" class="btn-delete btn-cancel">Cancelar</button>
                    </div>
                `;

                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const formData = new FormData(form);
                    const newName = (formData.get('name') as string).trim();
                    const newCategory = (formData.get('category') as string).trim();
                    const newLocation = formData.get('location') as string;
                    const newLastUpdated = formData.get('lastUpdated') as string;
                    const oldName = state.editingStockItemName!;

                    if (!newName || !newCategory || !newLocation || !newLastUpdated) {
                        alert('Todos os campos são obrigatórios.');
                        return;
                    }

                    if (newName.toLowerCase() !== oldName.toLowerCase() && mockStockItems.some(i => i.name.toLowerCase() === newName.toLowerCase())) {
                        alert('Já existe um item com este nome.');
                        return;
                    }

                    const stockItemToUpdate = mockStockItems.find(i => i.name === oldName);
                    if (stockItemToUpdate) {
                        stockItemToUpdate.name = newName;
                        stockItemToUpdate.category = newCategory;
                        stockItemToUpdate.location = newLocation;
                        stockItemToUpdate.lastUpdated = newLastUpdated;
                    }

                    if (newName !== oldName) {
                        mockEntradas.forEach(entry => {
                            if (entry.itemName === oldName) entry.itemName = newName;
                        });
                        mockSaidas.forEach(exit => {
                            if (exit.itemName === oldName) exit.itemName = newName;
                        });
                    }
                    
                    state.editingStockItemName = null;
                    render();
                });

                form.querySelector('.btn-cancel')?.addEventListener('click', () => {
                    state.editingStockItemName = null;
                    render();
                });

                card.appendChild(form);

            } else {
                card.innerHTML = `
                    <div class="item-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zm0 3h16v2H4zm0 3h16v2H4zm0 3h16v2H4z"/></svg>
                    </div>
                    <div class="item-info">
                        <div class="item-name-wrapper">
                            <div class="item-name">${item.name}</div>
                        </div>
                        <div class="item-sub-info">${new Date(item.lastUpdated + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                    </div>
                    <div class="item-details">
                        <div class="item-category">${item.category.toUpperCase()}</div>
                        <div class="item-location">${item.location}</div>
                    </div>
                    <div class="item-qty">
                        <div class="qty-label">QTD: ${item.quantity}</div>
                    </div>
                    <div class="item-toggle"></div>
                `;

                const toggleContainer = card.querySelector('.item-toggle')!;
                const editBtn = document.createElement('button');
                editBtn.className = 'btn-edit';
                editBtn.textContent = 'Alterar';
                editBtn.onclick = () => {
                    state.editingStockItemName = item.name;
                    render();
                };
                toggleContainer.appendChild(editBtn);
            }
            listContainer.appendChild(card);
        });
    } else {
        const empty = document.createElement('div');
        empty.className = 'list-empty';
        empty.textContent = 'Nenhum item encontrado.';
        listContainer.appendChild(empty);
    }
    return listContainer;
}

function renderActionButtons() {
    const container = document.createElement('div');
    container.className = 'action-buttons-container';
    
    const entradaBtn = document.createElement('button');
    entradaBtn.className = 'action-btn';
    entradaBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11 20V7.83l-5.59 5.59L4 12l8-8 8 8-1.41 1.41L13 7.83V20h-2z"/></svg> ENTRADAS`;
    entradaBtn.addEventListener('click', () => {
        state.currentPage = 'Entradas';
        render();
    });

    const saidaBtn = document.createElement('button');
    saidaBtn.className = 'action-btn';
    saidaBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13 4v12.17l5.59-5.59L20 12l-8 8-8-8 1.41-1.41L11 10.17V4h2z"/></svg> SAÍDAS`;
    saidaBtn.addEventListener('click', () => {
        state.currentPage = 'Saidas';
        render();
    });

    container.append(entradaBtn, saidaBtn);
    return container;
}

function renderFooter() {
    const footer = document.createElement('footer');
    footer.className = 'footer';
    footer.innerHTML = `Conectado como: <strong>[Nome do Usuário]</strong>`;
    return footer;
}

// --- OTHER PAGES (re-using previous logic with minor tweaks) ---

function createForm(id: string, fields: any[], submitText: string, onSubmit: (formData: FormData) => void) {
    const form = document.createElement('form');
    form.id = id;
    form.className = 'form-container';
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        onSubmit(formData);
        if (!id.includes('edit')) {
             form.reset();
        }
    });

    fields.forEach(field => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.htmlFor = field.id;
        label.textContent = field.label;
        
        let input;
        if (field.type === 'select') {
            input = document.createElement('select');
            input.id = field.id;
            input.name = field.name;
            input.required = field.required;
            field.options.forEach((opt: any) => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.text;
                input.appendChild(option);
            });
        } else if (field.type === 'textarea') {
            input = document.createElement('textarea');
            input.id = field.id;
            input.name = field.name;
            if(field.required) input.required = field.required;
        } else {
            input = document.createElement('input');
            input.type = field.type;
            input.id = field.id;
            input.name = field.name;
            input.required = field.required;
            if (field.min) input.min = field.min;
        }

        if (field.value) {
            (input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value = field.value;
        }
        
        group.append(label, input);
        form.appendChild(group);
    });

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.className = 'btn';
    submitButton.textContent = submitText;
    form.appendChild(submitButton);

    return form;
}

function renderEntradasPage() {
    const page = document.createElement('div');
    page.className = 'page';
    
    const entryToEdit = mockEntradas.find(e => e.id === state.editingEntradaId);
    if (entryToEdit) {
        page.innerHTML = '<h2>Alterar Entrada</h2>';
        const stockItem = mockStockItems.find(i => i.name === entryToEdit.itemName);
        
        const info = document.createElement('p');
        info.innerHTML = `Alterando entrada para o item: <strong>${stockItem?.name || 'N/A'}</strong>`;
        page.appendChild(info);

        const fields = [
            { id: 'quantity', name: 'quantity', label: 'Quantidade:', type: 'number', required: true, min: '1', value: entryToEdit.quantity },
            { id: 'date', name: 'date', label: 'Data:', type: 'date', required: true, value: entryToEdit.date }
        ];

        const form = createForm('entrada-edit-form', fields, 'Salvar Alterações', (formData) => {
            const newQuantity = parseInt(formData.get('quantity') as string, 10);
            const newDate = formData.get('date') as string;
            
            if (stockItem) {
                const quantityDiff = newQuantity - entryToEdit.quantity;
                stockItem.quantity += quantityDiff;
            }

            entryToEdit.quantity = newQuantity;
            entryToEdit.date = newDate;
            
            state.editingEntradaId = null;
            render();
        });
        
        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.textContent = 'Cancelar';
        cancelButton.className = 'btn btn-secondary';
        cancelButton.onclick = () => {
            state.editingEntradaId = null;
            render();
        };
        form.appendChild(cancelButton);
        page.appendChild(form);
    } else {
        page.innerHTML = '<h2>Registrar Nova Entrada / Item</h2>';
        page.innerHTML += '<p class="form-description">Digite o nome de um item. Se já existir, a quantidade será somada. Caso contrário, um novo item será criado.</p>';

        const fields = [
            { id: 'item-name', name: 'itemName', label: 'Nome do Produto:', type: 'text', required: true },
            { id: 'quantity', name: 'quantity', label: 'Quantidade:', type: 'number', required: true, min: '1' },
            { id: 'location', name: 'location', label: 'Local:', type: 'select', required: true, options: mockLocations.map(l => ({ value: l, text: l })) },
            { id: 'category', name: 'category', label: 'Categoria (para itens novos):', type: 'select', required: true, options: [{value: 'Consumo', text: 'Consumo'}, {value: 'Serviço', text: 'Serviço'}] },
            { id: 'date', name: 'date', label: 'Data:', type: 'date', required: true }
        ];

        const form = createForm('entrada-form', fields, 'Registrar Entrada', (formData) => {
            const itemName = (formData.get('itemName') as string).trim();
            const quantity = parseInt(formData.get('quantity') as string, 10);
            const location = formData.get('location') as string;
            const category = formData.get('category') as string;
            const date = formData.get('date') as string;
            
            if (!itemName) {
                alert('Nome do Produto é obrigatório.');
                return;
            }

            let stockItem = mockStockItems.find(i => i.name.toLowerCase() === itemName.toLowerCase());
            if (stockItem) {
                stockItem.quantity += quantity;
                stockItem.location = location;
            } else {
                stockItem = { name: itemName, quantity, location, category: category, lastUpdated: new Date().toISOString().split('T')[0] };
                mockStockItems.push(stockItem);
                mockStockItems.sort((a,b) => a.name.localeCompare(b.name));
            }
            
            mockEntradas.push({ id: Date.now(), itemName, quantity, date });
            render();
        });
        
        const itemNameInput = form.querySelector('#item-name') as HTMLInputElement;
        const locationSelect = form.querySelector('#location') as HTMLSelectElement;
        const dataListId = 'stock-items-list';
        itemNameInput.setAttribute('list', dataListId);

        const dataList = document.createElement('datalist');
        dataList.id = dataListId;
        mockStockItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item.name;
            dataList.appendChild(option);
        });
        form.appendChild(dataList);
        
        itemNameInput.addEventListener('input', (e) => {
            const value = (e.target as HTMLInputElement).value;
            const existingItem = mockStockItems.find(i => i.name.toLowerCase() === value.toLowerCase());
            if (existingItem) {
                locationSelect.value = existingItem.location;
            }
        });

        page.appendChild(form);
    }
    
    const history = document.createElement('div');
    const historyHeader = document.createElement('div');
    historyHeader.className = 'history-header';
    historyHeader.innerHTML = `
        <h3>Histórico de Entradas</h3>
        <div class="history-actions">
            <button class="action-icon-btn" id="pdf-entradas-btn" title="Baixar PDF">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm-2.5-2H15V8.5h-1.5v3zM9 8.5h1v1H9v-1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z"/></svg>
            </button>
            <button class="action-icon-btn" id="excel-entradas-btn" title="Exportar Excel">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"></path></svg>
            </button>
        </div>
    `;
    historyHeader.querySelector('#pdf-entradas-btn')?.addEventListener('click', () => {
        exportHistoryToPdf(
            [...mockEntradas].reverse(), 
            'Histórico de Entradas', 
            ['Produto', 'Quantidade', 'Data'], 
            ['itemName', 'quantity', 'date']
        );
    });
    historyHeader.querySelector('#excel-entradas-btn')?.addEventListener('click', () => {
        exportHistoryToExcel(
            [...mockEntradas].reverse(), 
            'historico_entradas.xlsx', 
            ['Produto', 'Quantidade', 'Data'], 
            ['itemName', 'quantity', 'date']
        );
    });
    history.appendChild(historyHeader);
    
    const list = document.createElement('ul');
    list.className = 'history-list';

    [...mockEntradas].reverse().forEach(entry => {
        const item = document.createElement('li');
        item.className = 'history-item';
        const stockItem = mockStockItems.find(i => i.name === entry.itemName);
        item.innerHTML = `
            <div>
                <strong>${stockItem?.name || 'Item não encontrado'}</strong>
                <small>Qtd: ${entry.quantity} | Data: ${new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR')}</small>
            </div>
        `;
        
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Alterar';
        editBtn.className = 'btn-edit';
        editBtn.onclick = () => {
            state.editingEntradaId = entry.id;
            render();
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Excluir';
        deleteBtn.className = 'btn-delete';
        deleteBtn.onclick = () => {
            if (confirm('Tem certeza que deseja excluir esta entrada? A quantidade será removida do estoque.')) {
                const stockItem = mockStockItems.find(i => i.name === entry.itemName);
                if (stockItem) {
                    stockItem.quantity -= entry.quantity;
                }
                mockEntradas = mockEntradas.filter(e => e.id !== entry.id);
                render();
            }
        };

        buttonGroup.append(editBtn, deleteBtn);
        item.appendChild(buttonGroup);
        list.appendChild(item);
    });

    history.appendChild(list);
    page.appendChild(history);

    return page;
}

function renderSaidasPage() {
    const page = document.createElement('div');
    page.className = 'page';

    const exitToEdit = mockSaidas.find(e => e.id === state.editingSaidaId);
    if (exitToEdit) {
        page.innerHTML = '<h2>Alterar Saída</h2>';
        const stockItem = mockStockItems.find(i => i.name === exitToEdit.itemName);
        
        const info = document.createElement('p');
        info.innerHTML = `Alterando saída para o item: <strong>${stockItem?.name || 'N/A'}</strong>`;
        page.appendChild(info);

        const fields = [
            { id: 'quantity', name: 'quantity', label: 'Quantidade:', type: 'number', required: true, min: '1', value: exitToEdit.quantity },
            { id: 'observation', name: 'observation', label: 'Observação:', type: 'textarea', required: false, value: exitToEdit.observation },
            { id: 'date', name: 'date', label: 'Data:', type: 'date', required: true, value: exitToEdit.date }
        ];

        const form = createForm('saida-edit-form', fields, 'Salvar Alterações', (formData) => {
            const newQuantity = parseInt(formData.get('quantity') as string, 10);
            const newObservation = formData.get('observation') as string;
            const newDate = formData.get('date') as string;
            
            if (stockItem) {
                const quantityDiff = newQuantity - exitToEdit.quantity;
                if (stockItem.quantity >= quantityDiff) {
                    stockItem.quantity -= quantityDiff;
                    
                    exitToEdit.quantity = newQuantity;
                    exitToEdit.date = newDate;
                    exitToEdit.observation = newObservation;
                    
                    state.editingSaidaId = null;
                    render();
                } else {
                    alert('Alteração resultaria em estoque negativo!');
                }
            }
        });
        
        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.textContent = 'Cancelar';
        cancelButton.className = 'btn btn-secondary';
        cancelButton.onclick = () => {
            state.editingSaidaId = null;
            render();
        };
        form.appendChild(cancelButton);
        page.appendChild(form);

    } else {
        page.innerHTML = '<h2>Registrar Saída</h2>';
        const fields = [
            { id: 'item-name', name: 'itemName', label: 'Produto:', type: 'text', required: true },
            { id: 'quantity', name: 'quantity', label: 'Quantidade:', type: 'number', required: true, min: '1' },
            { id: 'observation', name: 'observation', label: 'Observação:', type: 'textarea', required: false },
            { id: 'date', name: 'date', label: 'Data:', type: 'date', required: true }
        ];

        const form = createForm('saida-form', fields, 'Registrar Saída', (formData) => {
            const itemName = (formData.get('itemName') as string).trim();
            const quantity = parseInt(formData.get('quantity') as string, 10);
            const observation = formData.get('observation') as string;
            const date = formData.get('date') as string;

            const stockItem = mockStockItems.find(i => i.name.toLowerCase() === itemName.toLowerCase());
            if (stockItem) {
                if (stockItem.quantity >= quantity) {
                    stockItem.quantity -= quantity;
                    mockSaidas.push({ id: Date.now(), itemName, quantity, date, observation });
                    render();
                } else {
                    alert('Quantidade de saída maior que o estoque disponível!');
                }
            } else {
                alert('Produto não encontrado no estoque.');
            }
        });
        
        const itemNameInput = form.querySelector('#item-name') as HTMLInputElement;
        const dataListId = 'stock-items-list-saida';
        itemNameInput.setAttribute('list', dataListId);

        const dataList = document.createElement('datalist');
        dataList.id = dataListId;
        mockStockItems.filter(i => i.quantity > 0).forEach(item => {
            const option = document.createElement('option');
            option.value = item.name;
            dataList.appendChild(option);
        });
        form.appendChild(dataList);

        page.appendChild(form);
    }

    const history = document.createElement('div');
    const historyHeader = document.createElement('div');
    historyHeader.className = 'history-header';
    historyHeader.innerHTML = `
        <h3>Histórico de Saídas</h3>
        <div class="history-actions">
            <button class="action-icon-btn" id="pdf-saidas-btn" title="Baixar PDF">
                 <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm-2.5-2H15V8.5h-1.5v3zM9 8.5h1v1H9v-1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z"/></svg>
            </button>
            <button class="action-icon-btn" id="excel-saidas-btn" title="Exportar Excel">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"></path></svg>
            </button>
        </div>
    `;
    historyHeader.querySelector('#pdf-saidas-btn')?.addEventListener('click', () => {
        exportHistoryToPdf(
            [...mockSaidas].reverse(), 
            'Histórico de Saídas', 
            ['Produto', 'Quantidade', 'Data', 'Observação'], 
            ['itemName', 'quantity', 'date', 'observation']
        );
    });
    historyHeader.querySelector('#excel-saidas-btn')?.addEventListener('click', () => {
        exportHistoryToExcel(
            [...mockSaidas].reverse(), 
            'historico_saidas.xlsx', 
            ['Produto', 'Quantidade', 'Data', 'Observação'], 
            ['itemName', 'quantity', 'date', 'observation']
        );
    });
    history.appendChild(historyHeader);
    
    const list = document.createElement('ul');
    list.className = 'history-list';

    [...mockSaidas].reverse().forEach(exit => {
        const item = document.createElement('li');
        item.className = 'history-item';
        const stockItem = mockStockItems.find(i => i.name === exit.itemName);
        item.innerHTML = `
            <div>
                <strong>${stockItem?.name || 'Item não encontrado'}</strong>
                <small>Qtd: ${exit.quantity} | Data: ${new Date(exit.date + 'T00:00:00').toLocaleDateString('pt-BR')}</small>
                ${exit.observation ? `<small class="observation-text">Obs: ${exit.observation}</small>` : ''}
            </div>
        `;
        
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Alterar';
        editBtn.className = 'btn-edit';
        editBtn.onclick = () => {
            state.editingSaidaId = exit.id;
            render();
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Excluir';
        deleteBtn.className = 'btn-delete';
        deleteBtn.onclick = () => {
             if (confirm('Tem certeza que deseja excluir esta saída? A quantidade será retornada ao estoque.')) {
                const stockItem = mockStockItems.find(i => i.name === exit.itemName);
                if (stockItem) {
                    stockItem.quantity += exit.quantity;
                }
                mockSaidas = mockSaidas.filter(e => e.id !== exit.id);
                render();
            }
        };

        buttonGroup.append(editBtn, deleteBtn);
        item.appendChild(buttonGroup);
        list.appendChild(item);
    });

    history.appendChild(list);
    page.appendChild(history);

    return page;
}

function renderLocaisPage() {
    const page = document.createElement('div');
    page.className = 'page';
    page.innerHTML = '<h2>Gerenciar Locais</h2>';

    const addForm = document.createElement('form');
    addForm.className = 'form-container simple-form';
    addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = (e.target as HTMLFormElement).elements.namedItem('locationName') as HTMLInputElement;
        const newLocation = input.value.trim();
        if (newLocation && !mockLocations.find(l => l.toLowerCase() === newLocation.toLowerCase())) {
            mockLocations.push(newLocation);
            mockLocations.sort();
            render();
        } else if (newLocation) {
            alert('Este local já existe.');
        }
        input.value = '';
    });
    addForm.innerHTML = `
        <input type="text" name="locationName" placeholder="Nome do novo local" required />
        <button type="submit" class="btn">Adicionar</button>
    `;
    page.appendChild(addForm);

    const list = document.createElement('ul');
    list.className = 'history-list';
    mockLocations.forEach(location => {
        const item = document.createElement('li');
        item.className = 'history-item';

        if (state.editingLocationName === location) {
            const editForm = document.createElement('form');
            editForm.className = 'inline-edit-form';
            const input = document.createElement('input');
            input.type = 'text';
            input.value = location;
            input.required = true;

            const saveBtn = document.createElement('button');
            saveBtn.type = 'submit';
            saveBtn.textContent = 'Salvar';
            saveBtn.className = 'btn-edit';

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.textContent = 'Cancelar';
            cancelBtn.className = 'btn-delete';
            cancelBtn.onclick = () => {
                state.editingLocationName = null;
                render();
            };

            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const newName = input.value.trim();
                const oldName = state.editingLocationName!;
                
                if (!newName) return;
                
                const isDuplicate = mockLocations.some(l => l.toLowerCase() === newName.toLowerCase() && l.toLowerCase() !== oldName.toLowerCase());

                if (isDuplicate) {
                    alert('Este nome de local já está em uso.');
                    return;
                }

                mockLocations = mockLocations.map(l => l === oldName ? newName : l);
                mockLocations.sort();
                
                mockStockItems.forEach(stockItem => {
                    if (stockItem.location === oldName) {
                        stockItem.location = newName;
                    }
                });

                state.editingLocationName = null;
                render();
            });

            editForm.append(input, saveBtn, cancelBtn);
            item.appendChild(editForm);
        } else {
            const locationName = document.createElement('div');
            locationName.innerHTML = `<strong>${location}</strong>`;

            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'button-group';
            
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Alterar';
            editBtn.className = 'btn-edit';
            editBtn.onclick = () => {
                state.editingLocationName = location;
                render();
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Excluir';
            deleteBtn.className = 'btn-delete';
            deleteBtn.onclick = () => {
                const isLocationInUse = mockStockItems.some(item => item.location === location);
                if (isLocationInUse) {
                    alert('Não é possível excluir um local que está em uso.');
                } else {
                    if (confirm(`Tem certeza que deseja excluir o local "${location}"?`)) {
                        mockLocations = mockLocations.filter(l => l !== location);
                        render();
                    }
                }
            };
            
            buttonGroup.append(editBtn, deleteBtn);
            item.append(locationName, buttonGroup);
        }
        
        list.appendChild(item);
    });

    page.appendChild(list);

    return page;
}

// --- INITIALIZE ---
document.addEventListener('DOMContentLoaded', render);