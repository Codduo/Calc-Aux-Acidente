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

function calculateValues() {
    // Validação e obtenção dos dados
    const name = document.getElementById('name').value.trim();
    const benefitEndDateInput = document.getElementById('benefitEndDate').value;
    const birthDateInput = document.getElementById('birthDate').value;
    const gender = document.getElementById('gender').value;
    const isRural = document.getElementById('isRural').checked;
    const monthlyAmountInput = document.getElementById('monthlyAmount').value;
    const processMonthsInput = document.getElementById('processMonths').value;

    // Validações
    if (!name || !benefitEndDateInput || !birthDateInput || !gender || !monthlyAmountInput || !processMonthsInput) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    const benefitEndDate = new Date(benefitEndDateInput);
    const birthDate = new Date(birthDateInput);
    const processMonths = parseInt(processMonthsInput);
    
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

    if (isNaN(processMonths) || processMonths <= 0) {
        alert("Por favor, insira um número válido de meses para o processo.");
        return;
    }

    // Datas importantes para o cálculo
    const today = new Date();
    
    // Adiciona os meses do processo à data atual
    const processEndDate = new Date(today);
    processEndDate.setMonth(today.getMonth() + processMonths);

    // Cálculo dos Valores Retroativos (corrigido para 5 anos de HOJE)
    const retroactiveResult = calculateRetroactiveValues(
        benefitEndDate, 
        null, // Não usa mais fiveYearsAgo aqui, será calculado dentro da função
        processEndDate,
        monthlyAmount
    );

    // Cálculo dos Valores Vincendos (a partir do fim do processo até aposentadoria)
    const ongoingResult = calculateOngoingValues(
        processEndDate,
        birthDate,
        gender,
        isRural,
        monthlyAmount
    );

    // Sistema de desconto atualizado
    let finalRetroactive = retroactiveResult;
    let finalOngoing = ongoingResult; // Vincendos sem desconto (é só estimativa)
    
    if (!isAdminLoggedIn) {
        // Para clientes: aplica desconto APENAS nos retroativos
        // Retroativos: COM desconto de 40% (mantém 60%) - É O QUE REALMENTE VAI RECEBER
        finalRetroactive = {
            ...retroactiveResult,
            total: retroactiveResult.total * 0.6
        };
        
        // Vincendos: SEM desconto (é apenas estimativa informativa, não será recebido)
        // Mantém valores originais pois é só para mostrar estimativa
    }

    // Exibição dos resultados
    displayResults(name, finalRetroactive, finalOngoing, processMonths, benefitEndDate, processEndDate);
}

function calculateRetroactiveValues(benefitEndDate, fiveYearsAgo, endDate, monthlyAmount) {
    // CORREÇÃO: A data de início dos retroativos deve ser:
    // - Se cessação foi há menos de 5 anos: um dia após a cessação
    // - Se cessação foi há mais de 5 anos: 5 anos atrás de HOJE (não da cessação)
    
    const today = new Date();
    const oneDayAfterBenefitEnd = new Date(benefitEndDate);
    oneDayAfterBenefitEnd.setDate(oneDayAfterBenefitEnd.getDate() + 1);
    
    // Calcula 5 anos atrás de HOJE
    const fiveYearsFromToday = new Date(today);
    fiveYearsFromToday.setFullYear(today.getFullYear() - 5);
    
    // A data de início é a MAIOR entre:
    // 1. Um dia após a cessação
    // 2. 5 anos atrás de hoje
    const startDate = new Date(Math.max(oneDayAfterBenefitEnd.getTime(), fiveYearsFromToday.getTime()));
    
    const values = [];
    let totalAmount = 0;
    
    const currentDate = new Date(startDate);
    
    // Calcula mês a mês até a data final (fim do processo)
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

function displayResults(name, retroactiveResult, ongoingResult, processMonths, benefitEndDate, processEndDate) {
    // Nome do cliente
    document.getElementById('clientName').innerHTML = `
        <strong>Cliente:</strong> ${name}
    `;

    // Totais - SÓ PARA INFORMAÇÃO
    const totalValue = retroactiveResult.total + ongoingResult.total;
    document.getElementById('totalValue').innerHTML = `
        <small style="color: #718096; font-size: 0.9rem;">Valor Total Estimado até Aposentadoria (informativo): R$ ${formatCurrency(totalValue)}</small>
    `;

    // NOVA EXIBIÇÃO - Valores Retroativos como Parcela Única
    document.getElementById('lumpSumAmount').textContent = `R$ ${formatCurrency(retroactiveResult.total)}`;
    
    // Observação sobre o período do processo - SEM COMENTÁRIO EDITÁVEL
    document.getElementById('processObservation').innerHTML = `
        <strong>Período médio do processo:</strong> ${processMonths} meses
    `;
    
    // Período do cálculo dos retroativos
    document.getElementById('retroactivePeriod').innerHTML = `
        <strong>Data Inicial:</strong> ${benefitEndDate.toLocaleDateString('pt-BR')} --- 
        <strong>Data Final:</strong> ${processEndDate.toLocaleDateString('pt-BR')}
    `;

    // Valores Vincendos - SIMPLIFICADO SEM LISTA
    document.getElementById('ongoingTotal').innerHTML = `
        <strong>Total:</strong> R$ ${formatCurrency(ongoingResult.total)}
    `;

    // Período resumido dos vincendos
    document.getElementById('ongoingPeriodSummary').innerHTML = `
        <strong>Data Inicial:</strong> ${ongoingResult.period.start.toLocaleDateString('pt-BR')} --- 
        <strong>Data Final:</strong> ${ongoingResult.period.end.toLocaleDateString('pt-BR')}
    `;

    // Remove a lista detalhada - agora só mostra período resumido

    // FORÇAR TEXTO PRETO VIA JAVASCRIPT!
    setTimeout(() => {
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