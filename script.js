// Variável global para controlar se está logado como admin
let isAdminLoggedIn = false;
const ADMIN_PASSWORD = "Escritorio3116*";

document.addEventListener('DOMContentLoaded', () => {
    // Event listeners principais
    document.getElementById('calculateButton').addEventListener('click', calculateValues);
    document.getElementById('downloadPDFButton').addEventListener('click', downloadPDF);
    
    // Event listeners do sistema de login
    document.getElementById('lockButton').addEventListener('click', handleLockButtonClick);
    document.getElementById('closeModal').addEventListener('click', closeLoginModal);
    document.getElementById('cancelLogin').addEventListener('click', closeLoginModal);
    document.getElementById('confirmLogin').addEventListener('click', attemptLogin);
    document.getElementById('passwordInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') attemptLogin();
    });
    
    // Fecha modal clicando fora
    document.getElementById('loginModal').addEventListener('click', (e) => {
        if (e.target.id === 'loginModal') closeLoginModal();
    });
    
    // REMOVIDO: máscara de moeda que estava bloqueando
});

// Nova função para gerenciar o clique no botão de lock
function handleLockButtonClick() {
    if (isAdminLoggedIn) {
        // Se já está logado, faz logout
        logoutAdmin();
    } else {
        // Se não está logado, abre modal de login
        openLoginModal();
    }
}

// Nova função para fazer logout do admin
function logoutAdmin() {
    isAdminLoggedIn = false;
    
    // Restaura aparência original do botão
    const lockButton = document.getElementById('lockButton');
    lockButton.innerHTML = '🔒';
    lockButton.style.background = 'rgba(255, 255, 255, 0.1)';
    lockButton.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    lockButton.title = 'Acesso Administrativo';
    
    // Se já tem resultados calculados, recalcula com valores descontados
    if (document.getElementById('results').style.display === 'block') {
        calculateValues();
    }
}

// Sistema de Login
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
    document.getElementById('passwordInput').focus();
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('passwordInput').value = '';
}

function attemptLogin() {
    const password = document.getElementById('passwordInput').value;
    
    if (password === ADMIN_PASSWORD) {
        isAdminLoggedIn = true;
        closeLoginModal();
        
        // Feedback visual discreto
        const lockButton = document.getElementById('lockButton');
        lockButton.innerHTML = '🔓';
        lockButton.style.background = 'rgba(34, 197, 94, 0.2)';
        lockButton.style.borderColor = 'rgba(34, 197, 94, 0.4)';
        lockButton.title = 'Modo Administrativo Ativo - Clique para sair';
        
        // Se já tem resultados calculados, recalcula com valores reais
        if (document.getElementById('results').style.display === 'block') {
            calculateValues();
        }
    } else {
        // Senha incorreta
        const passwordInput = document.getElementById('passwordInput');
        passwordInput.style.borderColor = '#ef4444';
        passwordInput.style.backgroundColor = '#fef2f2';
        passwordInput.value = '';
        passwordInput.placeholder = 'Senha incorreta. Tente novamente.';
        
        setTimeout(() => {
            passwordInput.style.borderColor = '#e2e8f0';
            passwordInput.style.backgroundColor = '';
            passwordInput.placeholder = 'Digite a senha';
        }, 2000);
    }
}

// Função removida - estava bloqueando a digitação

function calculateValues() {
    // Validação e obtenção dos dados
    const name = document.getElementById('name').value.trim();
    const benefitEndDateInput = document.getElementById('benefitEndDate').value;
    const birthDateInput = document.getElementById('birthDate').value;
    const gender = document.getElementById('gender').value;
    const isRural = document.getElementById('isRural').checked;
    const monthlyAmountInput = document.getElementById('monthlyAmount').value;

    // Validações
    if (!name || !benefitEndDateInput || !birthDateInput || !gender || !monthlyAmountInput) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    const benefitEndDate = new Date(benefitEndDateInput);
    const birthDate = new Date(birthDateInput);
    
    // Parse mais flexível para o valor monetário
    let monthlyAmount = parseFloat(
        monthlyAmountInput
            .replace(/[^\d,.-]/g, '') // Remove tudo exceto números, vírgula, ponto e hífen
            .replace(',', '.') // Troca vírgula por ponto
    );

    if (isNaN(monthlyAmount) || monthlyAmount <= 0) {
        alert("Por favor, insira um valor mensal válido.");
        return;
    }

    // Datas importantes para o cálculo
    const today = new Date();
    const fiveYearsAgo = new Date(today);
    fiveYearsAgo.setFullYear(today.getFullYear() - 5);
    
    // Adiciona 18 meses à data atual para separar retroativo de vincendo
    const eighteenMonthsFromNow = new Date(today);
    eighteenMonthsFromNow.setMonth(today.getMonth() + 18);

    // Cálculo dos Valores Retroativos (inclui os +18 meses)
    const retroactiveResult = calculateRetroactiveValues(
        benefitEndDate, 
        fiveYearsAgo, 
        eighteenMonthsFromNow,
        monthlyAmount
    );

    // Cálculo dos Valores Vincendos (a partir dos 18 meses até aposentadoria)
    const ongoingResult = calculateOngoingValues(
        eighteenMonthsFromNow,
        birthDate,
        gender,
        isRural,
        monthlyAmount
    );

    // Aplicar desconto se não estiver logado como admin
    let finalRetroactive = retroactiveResult;
    let finalOngoing = ongoingResult;
    
    if (!isAdminLoggedIn) {
        // Aplica desconto: 40% de desconto + 4 salários mínimos (R$ 1.500 cada)
        // Ou seja: 60% do valor total - R$ 6.000
        const originalTotal = retroactiveResult.total + ongoingResult.total;
        const discountedTotal = Math.max(0, (originalTotal * 0.6) - 6000);
        
        // Proporcionalmente distribui o valor com desconto
        const retroactiveRatio = retroactiveResult.total / originalTotal;
        const ongoingRatio = ongoingResult.total / originalTotal;
        
        finalRetroactive = {
            ...retroactiveResult,
            total: discountedTotal * retroactiveRatio
        };
        
        finalOngoing = {
            ...ongoingResult,
            total: discountedTotal * ongoingRatio
        };
        
        // Ajusta os valores individuais proporcionalmente
        if (finalRetroactive.values.length > 0) {
            const retroactiveMultiplier = finalRetroactive.total / retroactiveResult.total;
            finalRetroactive.values = finalRetroactive.values.map(item => ({
                ...item,
                value: item.value * retroactiveMultiplier
            }));
        }
        
        if (finalOngoing.values.length > 0) {
            const ongoingMultiplier = finalOngoing.total / ongoingResult.total;
            finalOngoing.values = finalOngoing.values.map(item => ({
                ...item,
                value: item.value * ongoingMultiplier
            }));
        }
    }

    // Exibição dos resultados
    displayResults(name, finalRetroactive, finalOngoing);
}

function calculateRetroactiveValues(benefitEndDate, fiveYearsAgo, endDate, monthlyAmount) {
    const startDate = new Date(Math.max(benefitEndDate.getTime(), fiveYearsAgo.getTime()));
    const values = [];
    let totalAmount = 0;
    
    const currentDate = new Date(startDate);
    
    // Calcula mês a mês até a data final (hoje + 18 meses)
    while (currentDate <= endDate) {
        const monthValue = monthlyAmount;
        const dateStr = currentDate.toLocaleDateString('pt-BR', { 
            month: '2-digit', 
            year: 'numeric' 
        });
        
        values.push({
            date: dateStr,
            value: monthValue,
            isThirteenth: false
        });
        totalAmount += monthValue;

        // Adiciona 13º salário em dezembro
        if (currentDate.getMonth() === 11) { // Dezembro
            values.push({
                date: `13º/${currentDate.getFullYear()}`,
                value: monthlyAmount,
                isThirteenth: true
            });
            totalAmount += monthlyAmount;
        }

        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return {
        values: values,
        total: totalAmount,
        period: {
            start: startDate,
            end: endDate
        }
    };
}

function calculateOngoingValues(startDate, birthDate, gender, isRural, monthlyAmount) {
    // Calcula idade de aposentadoria
    const retirementAge = isRural ? 
        (gender === 'male' ? 60 : 55) : 
        (gender === 'male' ? 65 : 62);
    
    const retirementDate = new Date(birthDate);
    retirementDate.setFullYear(retirementDate.getFullYear() + retirementAge);

    // Se já passou da idade de aposentadoria, não há valores vincendos
    if (startDate >= retirementDate) {
        return {
            values: [],
            total: 0,
            period: {
                start: startDate,
                end: retirementDate
            }
        };
    }

    const values = [];
    let totalAmount = 0;
    const currentDate = new Date(startDate);

    // Calcula mês a mês até a aposentadoria
    while (currentDate < retirementDate) {
        const monthValue = monthlyAmount;
        const dateStr = currentDate.toLocaleDateString('pt-BR', { 
            month: '2-digit', 
            year: 'numeric' 
        });
        
        values.push({
            date: dateStr,
            value: monthValue,
            isThirteenth: false
        });
        totalAmount += monthValue;

        // Adiciona 13º salário em dezembro
        if (currentDate.getMonth() === 11) { // Dezembro
            values.push({
                date: `13º/${currentDate.getFullYear()}`,
                value: monthlyAmount,
                isThirteenth: true
            });
            totalAmount += monthlyAmount;
        }

        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return {
        values: values,
        total: totalAmount,
        period: {
            start: startDate,
            end: retirementDate
        }
    };
}

function displayResults(name, retroactiveResult, ongoingResult) {
    // Nome do cliente
    document.getElementById('clientName').innerHTML = `
        <strong>Cliente:</strong> ${name}
    `;

    // Totais
    const totalValue = retroactiveResult.total + ongoingResult.total;
    document.getElementById('totalValue').innerHTML = `
        Valor Total Estimado: <span class="amount">R$ ${formatCurrency(totalValue)}</span>
    `;

    // Valores Retroativos
    document.getElementById('retroactiveTotal').innerHTML = `
        <strong>Total:</strong> R$ ${formatCurrency(retroactiveResult.total)}<br>
        <small>Período: ${retroactiveResult.period.start.toLocaleDateString('pt-BR')} até ${retroactiveResult.period.end.toLocaleDateString('pt-BR')}</small>
    `;

    const retroactiveList = document.getElementById('retroactiveValues');
    retroactiveList.innerHTML = '';
    retroactiveResult.values.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            ${item.isThirteenth ? 
                `<span class="highlight-13">${item.date}</span>` : 
                item.date
            } - R$ ${formatCurrency(item.value)}
        `;
        retroactiveList.appendChild(li);
    });

    // Valores Vincendos
    document.getElementById('ongoingTotal').innerHTML = `
        <strong>Total:</strong> R$ ${formatCurrency(ongoingResult.total)}<br>
        <small>Período: ${ongoingResult.period.start.toLocaleDateString('pt-BR')} até ${ongoingResult.period.end.toLocaleDateString('pt-BR')}</small>
    `;

    const ongoingList = document.getElementById('ongoingValues');
    ongoingList.innerHTML = '';
    
    if (ongoingResult.values.length === 0) {
        const li = document.createElement('li');
        li.innerHTML = '<em>Cliente já atingiu idade de aposentadoria</em>';
        li.style.fontStyle = 'italic';
        li.style.color = '#666';
        ongoingList.appendChild(li);
    } else {
        ongoingResult.values.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                ${item.isThirteenth ? 
                    `<span class="highlight-13">${item.date}</span>` : 
                    item.date
                } - R$ ${formatCurrency(item.value)}
            `;
            ongoingList.appendChild(li);
        });
    }

    // FORÇAR TEXTO PRETO VIA JAVASCRIPT!
    setTimeout(() => {
        // Período considerado nos retroativos
        const retroCalculationInfo = document.querySelector('.retroactive .calculation-info');
        if (retroCalculationInfo) {
            retroCalculationInfo.style.color = '#000000';
            retroCalculationInfo.style.fontWeight = '800';
            const retroP = retroCalculationInfo.querySelector('p');
            if (retroP) {
                retroP.style.color = '#000000';
                retroP.style.fontWeight = '800';
                const retroStrong = retroP.querySelector('strong');
                if (retroStrong) {
                    retroStrong.style.color = '#000000';
                    retroStrong.style.fontWeight = '800';
                }
            }
        }

        // Período considerado nos vincendos
        const ongoingCalculationInfo = document.querySelector('.ongoing .calculation-info');
        if (ongoingCalculationInfo) {
            ongoingCalculationInfo.style.color = '#000000';
            ongoingCalculationInfo.style.fontWeight = '800';
            const ongoingP = ongoingCalculationInfo.querySelector('p');
            if (ongoingP) {
                ongoingP.style.color = '#000000';
                ongoingP.style.fontWeight = '800';
                const ongoingStrong = ongoingP.querySelector('strong');
                if (ongoingStrong) {
                    ongoingStrong.style.color = '#000000';
                    ongoingStrong.style.fontWeight = '800';
                }
            }
        }

        // Disclaimer importante
        const disclaimer = document.querySelector('.disclaimer');
        if (disclaimer) {
            disclaimer.style.color = '#000000';
            disclaimer.style.fontWeight = '800';
            const disclaimerH4 = disclaimer.querySelector('h4');
            if (disclaimerH4) {
                disclaimerH4.style.color = '#000000';
                disclaimerH4.style.fontWeight = '800';
            }
            const disclaimerP = disclaimer.querySelector('p');
            if (disclaimerP) {
                disclaimerP.style.color = '#000000';
                disclaimerP.style.fontWeight = '800';
            }
        }
    }, 100);

    // Mostra os resultados
    document.getElementById('results').style.display = 'block';
    
    // Scroll suave para os resultados
    document.getElementById('results').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });

    // Forçar cor preta nos textos específicos
    setTimeout(() => {
        document.querySelectorAll('.calculation-info, .calculation-info *, .disclaimer, .disclaimer *').forEach(el => {
            el.style.color = '#000000';
            el.style.fontWeight = '800';
        });
    }, 50);
}

function downloadPDF() {
    const resultsContainer = document.getElementById('results');
    const button = document.getElementById('downloadPDFButton');
    
    // Feedback visual
    button.textContent = '⏳ Gerando PDF...';
    button.disabled = true;

    // Configurações do html2canvas
    const options = {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: resultsContainer.scrollWidth,
        height: resultsContainer.scrollHeight
    };

    html2canvas(resultsContainer, options)
        .then(canvas => {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            // Dimensões da página A4
            const imgWidth = 210;
            const pageHeight = 295;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            let position = 0;

            // Adiciona a primeira página
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // Adiciona páginas extras se necessário
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            // Gera nome do arquivo com data
            const today = new Date();
            const dateStr = today.toLocaleDateString('pt-BR').replace(/\//g, '-');
            const clientName = document.getElementById('name').value.replace(/\s+/g, '_');
            const filename = `Calculo_Auxilio_Acidente_${clientName}_${dateStr}.pdf`;

            pdf.save(filename);
        })
        .catch(error => {
            console.error("Erro ao gerar PDF:", error);
            alert("Erro ao gerar o PDF. Tente novamente.");
        })
        .finally(() => {
            // Restaura o botão
            button.textContent = '📄 Baixar Relatório em PDF';
            button.disabled = false;
        });
}

function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
}
