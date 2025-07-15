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

function createDateFromInput(dateString) {
    // Corrige problema de fuso horário do input HTML
    // Input vem como "YYYY-MM-DD" mas Date() interpreta como UTC e pode dar 1 dia a menos
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

function calculateMonthsBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Cálculo direto: diferença de anos × 12 + diferença de meses
    const yearDiff = end.getFullYear() - start.getFullYear();
    const monthDiff = end.getMonth() - start.getMonth();
    
    let totalMonths = yearDiff * 12 + monthDiff;
    
    // Se o dia final é menor que o inicial, subtrai 1 mês
    if (end.getDate() < start.getDate()) {
        totalMonths--;
    }
    
    return Math.max(0, totalMonths);
}

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

    const benefitEndDate = createDateFromInput(benefitEndDateInput);
    const birthDate = createDateFromInput(birthDateInput);
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
    
    // Data fim do processo: hoje + meses do processo
    const processEndDate = new Date(today);
    processEndDate.setMonth(today.getMonth() + processMonths);

    // Cálculo dos Valores Retroativos (lógica corrigida)
    const retroactiveResult = calculateRetroactiveValues(
        benefitEndDate, 
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

    // Sistema de desconto atualizado - LÓGICA CORRIGIDA
    let finalRetroactive = retroactiveResult;
    let finalOngoing = ongoingResult; // Vincendos sem desconto (é só estimativa)
    
    if (!isAdminLoggedIn) {
        // Para clientes: aplica desconto conforme planilha
        // Desconto: 40% do valor total - 4 salários mínimos (R$ 6.072)
        const valorBruto = retroactiveResult.total;
        const descontoHonorarios = valorBruto * 0.40; // 40% de honorários
        const valorAposHonorarios = valorBruto - descontoHonorarios;
        const valorFinal = valorAposHonorarios - 6072; // Menos 4 salários mínimos
        
        finalRetroactive = {
            ...retroactiveResult,
            total: Math.max(0, valorFinal) // Não pode ser negativo
        };
    }

    // Exibição dos resultados
    displayResults(name, finalRetroactive, finalOngoing, processMonths, benefitEndDate, processEndDate);
}

function calculateRetroactiveValues(benefitEndDate, processEndDate, monthlyAmount) {
    const today = new Date();
    
    // Data de início: 1 dia após a cessação
    const startDate = new Date(benefitEndDate);
    startDate.setDate(benefitEndDate.getDate() + 1);
    
    // Calcular meses de processo
    const processMonths = calculateMonthsBetween(today, processEndDate);
    
    // Calcular meses desde cessação até hoje
    const monthsFromStartToToday = calculateMonthsBetween(startDate, today);
    
    // Limite de retroativo: máximo 5 anos × 13 meses (inclui 13º) = 65 meses
    const maxRetroactiveMonths = 5 * 13; // 65 meses
    
    // Retroativo limitado a 65 meses + processo sempre incluído
    let retroactiveMonths = Math.min(monthsFromStartToToday, maxRetroactiveMonths);
    let finalMonths = retroactiveMonths + processMonths;
    
    // Data de início final (se limitou retroativo, recalcula)
    let finalStartDate = startDate;
    if (monthsFromStartToToday > maxRetroactiveMonths) {
        finalStartDate = new Date(today);
        finalStartDate.setMonth(today.getMonth() - maxRetroactiveMonths);
    }
    
    const totalAmount = finalMonths * monthlyAmount;

    console.log('DEBUG - Retroativos (CORRIGIDO):');
    console.log('Cessação:', benefitEndDate.toLocaleDateString('pt-BR'));
    console.log('Início (cessação + 1):', startDate.toLocaleDateString('pt-BR'));
    console.log('Hoje:', today.toLocaleDateString('pt-BR'));
    console.log('Fim processo:', processEndDate.toLocaleDateString('pt-BR'));
    console.log('Meses desde cessação até hoje:', monthsFromStartToToday);
    console.log('Limite retroativo (5 anos × 13):', maxRetroactiveMonths);
    console.log('Retroativo final:', retroactiveMonths);
    console.log('Meses de processo:', processMonths);
    console.log('TOTAL MESES:', finalMonths);
    console.log('Data início final:', finalStartDate.toLocaleDateString('pt-BR'));
    console.log('Valor total:', totalAmount.toLocaleString('pt-BR'));

    return {
        values: [],
        total: totalAmount,
        totalMonths: finalMonths,
        period: {
            start: finalStartDate,
            end: processEndDate
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

    // Cálculo simples: total de meses × valor mensal
    const totalMonths = calculateMonthsBetween(startDate, retirementDate);
    const totalAmount = totalMonths * monthlyAmount;

    return {
        values: [],
        total: totalAmount,
        totalMonths: totalMonths,
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
        <strong>Data Inicial:</strong> ${retroactiveResult.period.start.toLocaleDateString('pt-BR')} --- 
        <strong>Data Final:</strong> ${retroactiveResult.period.end.toLocaleDateString('pt-BR')}
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