// URL do Google Apps Script para salvar dados
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx_3B0uEBLJiBL6u_sM8jFlmFGn9Z6qbBizQxK8IEqQ3UQLpGneqzFbV4aJWmnQOOGY0w/exec';

// Controle de exibição dos campos de animais
document.querySelectorAll('input[name="possuiAnimal"]').forEach(radio => {
    radio.addEventListener('change', function () {
        const animalFields = document.getElementById('animalFields');
        if (this.value === 'Sim') {
            animalFields.style.display = 'block';
        } else {
            animalFields.style.display = 'none';
            // Limpar campos quando "Não" é selecionado
            document.getElementById('especie').value = '';
            document.getElementById('nomeAnimal').value = '';
            document.getElementById('vacinacao').value = '';
        }
    });
});

// Máscara para CPF
document.getElementById('cpf').addEventListener('input', function (e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        e.target.value = value;
    }
});

// Máscara para telefone
document.getElementById('telefone').addEventListener('input', function (e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
        value = value.replace(/(\d{2})(\d)/, '($1) $2');
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
        e.target.value = value;
    }
});

// Validação do formulário
document.getElementById('cadastroForm').addEventListener('submit', function (e) {
    e.preventDefault();

    // Limpar mensagens de erro anteriores
    clearErrors();

    const missingFields = [];
    const form = e.target;

    // Validar campos obrigatórios
    const requiredFields = [
        { id: 'posto', label: 'Posto/Graduação' },
        { id: 'nomeCompleto', label: 'Nome Completo' },
        { id: 'nip', label: 'NIP' },
        { id: 'dataNascimentoTitular', label: 'Data de Nascimento do Titular' },
        { id: 'endereco', label: 'Endereço PNR' }
    ];

    // Validar campos de texto e select
    requiredFields.forEach(field => {
        const element = document.getElementById(field.id);
        if (!element.value.trim()) {
            missingFields.push(field.label);
            element.classList.add('error');
            const errorSpan = element.parentElement.querySelector('.error-message');
            if (errorSpan) {
                errorSpan.textContent = 'Este campo é obrigatório';
            }
        }
    });

    // Validar radio buttons (Possui animal)
    const possuiAnimalRadios = document.querySelectorAll('input[name="possuiAnimal"]');
    const possuiAnimalChecked = Array.from(possuiAnimalRadios).some(radio => radio.checked);
    if (!possuiAnimalChecked) {
        missingFields.push('Possui animal no PNR?');
        const errorSpan = possuiAnimalRadios[0].closest('.field').querySelector('.error-message');
        if (errorSpan) {
            errorSpan.textContent = 'Selecione uma opção';
        }
    }

    // Validar checkboxes do termo de compromisso
    const termoCheckboxes = [
        { name: 'termo1', label: 'Termo 1: Normas do PNR' },
        { name: 'termo2', label: 'Termo 2: Responsabilidade pelos dependentes' },
        { name: 'termo3', label: 'Termo 3: Responsabilidade pelos animais' },
        { name: 'termo4', label: 'Termo 4: Atualização de dados' },
        { name: 'termo5', label: 'Termo 5: Veracidade das informações' },
        { name: 'termo6', label: 'Termo 6: Penalidades' }
    ];

    termoCheckboxes.forEach(termo => {
        const checkbox = document.querySelector(`input[name="${termo.name}"]`);
        if (!checkbox.checked) {
            missingFields.push(termo.label);
        }
    });

    // Se houver campos faltando, exibir erros
    if (missingFields.length > 0) {
        displayValidationErrors(missingFields);
        // Scroll suave para a área de erros
        document.getElementById('validationErrors').scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        return;
    }

    // Se tudo estiver OK, enviar dados para o Google Sheets
    submitFormData(form);
});

// Função para enviar dados ao Google Sheets
async function submitFormData(form) {
    // Mostrar loading
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Enviando...';

    try {
        // Coletar dados do formulário
        const formData = collectFormData(form);

        // Preparar dados para envio
        const dataToSend = {
            posto: formData.dadosPessoais.posto,
            nomeCompleto: formData.dadosPessoais.nomeCompleto,
            nip: formData.dadosPessoais.nip,
            dataNascimentoTitular: formData.dadosPessoais.dataNascimentoTitular,
            cpf: formData.dadosPessoais.cpf,
            endereco: formData.dadosPessoais.endereco,
            nomeDependente1: formData.dependentes.nomeDependente1,
            grauParentesco: formData.dependentes.grauParentesco,
            telefone: formData.dependentes.telefone,
            dataNascimento: formData.dependentes.dataNascimento,
            outrosDependentes: formData.dependentes.outrosDependentes,
            possuiAnimal: formData.animais.possuiAnimal,
            especie: formData.animais.especie,
            nomeAnimal: formData.animais.nomeAnimal,
            vacinacao: formData.animais.vacinacao,
            termo1: form.termo1.checked,
            termo2: form.termo2.checked,
            termo3: form.termo3.checked,
            termo4: form.termo4.checked,
            termo5: form.termo5.checked,
            termo6: form.termo6.checked
        };

        // Enviar para Google Sheets
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Importante para Google Apps Script
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSend)
        });

        // Como usamos no-cors, não podemos ler a resposta
        // Mas se chegou aqui, provavelmente funcionou

        // Exibir resumo
        displaySummary(formData);

    } catch (error) {
        console.error('Erro ao enviar dados:', error);

        // Mesmo com erro, mostrar resumo (dados foram preenchidos corretamente)
        const formData = collectFormData(form);
        displaySummary(formData);

        // Mostrar aviso discreto
        alert('✅ Formulário preenchido!\n⚠️ Houve um problema ao salvar automaticamente.\n\nPor favor, tire um print do resumo ou anote os dados.');
    } finally {
        // Restaurar botão
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function clearErrors() {
    // Remover classe de erro de todos os campos
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

    // Limpar mensagens de erro
    document.querySelectorAll('.error-message').forEach(span => span.textContent = '');

    // Ocultar área de erros de validação
    document.getElementById('validationErrors').style.display = 'none';
    document.getElementById('errorList').innerHTML = '';
}

function displayValidationErrors(missingFields) {
    const errorContainer = document.getElementById('validationErrors');
    const errorList = document.getElementById('errorList');

    errorList.innerHTML = '';
    missingFields.forEach(field => {
        const li = document.createElement('li');
        li.textContent = field;
        errorList.appendChild(li);
    });

    errorContainer.style.display = 'block';
}

function collectFormData(form) {
    const data = {
        dadosPessoais: {
            posto: form.posto.value,
            nomeCompleto: form.nomeCompleto.value,
            nip: form.nip.value,
            dataNascimentoTitular: form.dataNascimentoTitular.value,
            cpf: form.cpf.value || 'Não informado',
            endereco: form.endereco.value
        },
        dependentes: {
            nomeDependente1: form.nomeDependente1.value || 'Não informado',
            grauParentesco: form.grauParentesco.value || 'Não informado',
            telefone: form.telefone.value || 'Não informado',
            dataNascimento: form.dataNascimento.value || 'Não informado',
            outrosDependentes: form.outrosDependentes.value || 'Não informado'
        },
        animais: {
            possuiAnimal: form.possuiAnimal.value,
            especie: form.especie.value || 'Não informado',
            nomeAnimal: form.nomeAnimal.value || 'Não informado',
            vacinacao: form.vacinacao.value || 'Não informado'
        },
        termos: {
            termo1: form.termo1.checked ? '✓ Aceito' : '✗ Não aceito',
            termo2: form.termo2.checked ? '✓ Aceito' : '✗ Não aceito',
            termo3: form.termo3.checked ? '✓ Aceito' : '✗ Não aceito',
            termo4: form.termo4.checked ? '✓ Aceito' : '✗ Não aceito',
            termo5: form.termo5.checked ? '✓ Aceito' : '✗ Não aceito',
            termo6: form.termo6.checked ? '✓ Aceito' : '✗ Não aceito'
        }
    };

    return data;
}

function displaySummary(data) {
    const formSection = document.getElementById('formSection');
    const summarySection = document.getElementById('summarySection');
    const summaryContent = document.getElementById('summaryContent');

    // Criar HTML do resumo
    summaryContent.innerHTML = `
        <div class="summary-group">
            <h3>📋 Dados Pessoais</h3>
            <div class="summary-item">
                <div class="summary-label">Posto/Graduação:</div>
                <div class="summary-value">${data.dadosPessoais.posto}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Nome Completo:</div>
                <div class="summary-value">${data.dadosPessoais.nomeCompleto}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">NIP:</div>
                <div class="summary-value">${data.dadosPessoais.nip}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Data de Nascimento do Titular:</div>
                <div class="summary-value">${formatDate(data.dadosPessoais.dataNascimentoTitular)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">CPF:</div>
                <div class="summary-value ${data.dadosPessoais.cpf === 'Não informado' ? 'empty' : ''}">${data.dadosPessoais.cpf}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Endereço PNR:</div>
                <div class="summary-value">${data.dadosPessoais.endereco}</div>
            </div>
        </div>
        
        <div class="summary-group">
            <h3>👨‍👩‍👧‍👦 Dependentes</h3>
            <div class="summary-item">
                <div class="summary-label">Nome do Dependente 1:</div>
                <div class="summary-value ${data.dependentes.nomeDependente1 === 'Não informado' ? 'empty' : ''}">${data.dependentes.nomeDependente1}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Grau de Parentesco:</div>
                <div class="summary-value ${data.dependentes.grauParentesco === 'Não informado' ? 'empty' : ''}">${data.dependentes.grauParentesco}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Telefone/WhatsApp do Dependente:</div>
                <div class="summary-value ${data.dependentes.telefone === 'Não informado' ? 'empty' : ''}">${data.dependentes.telefone}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Data de Nascimento do Dependente:</div>
                <div class="summary-value ${data.dependentes.dataNascimento === 'Não informado' ? 'empty' : ''}">${formatDate(data.dependentes.dataNascimento)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Outros Dependentes:</div>
                <div class="summary-value ${data.dependentes.outrosDependentes === 'Não informado' ? 'empty' : ''}">${data.dependentes.outrosDependentes}</div>
            </div>
        </div>
        
        <div class="summary-group">
            <h3>🐾 Animais de Estimação</h3>
            <div class="summary-item">
                <div class="summary-label">Possui animal no PNR?</div>
                <div class="summary-value">${data.animais.possuiAnimal}</div>
            </div>
            ${data.animais.possuiAnimal === 'Sim' ? `
                <div class="summary-item">
                    <div class="summary-label">Espécie:</div>
                    <div class="summary-value ${data.animais.especie === 'Não informado' ? 'empty' : ''}">${data.animais.especie}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Nome do Animal:</div>
                    <div class="summary-value ${data.animais.nomeAnimal === 'Não informado' ? 'empty' : ''}">${data.animais.nomeAnimal}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Vacinação:</div>
                    <div class="summary-value ${data.animais.vacinacao === 'Não informado' ? 'empty' : ''}">${data.animais.vacinacao}</div>
                </div>
            ` : ''}
        </div>
        
        <div class="summary-group">
            <h3>📝 Termo de Compromisso</h3>
            <div class="summary-item">
                <div class="summary-label">Normas do PNR:</div>
                <div class="summary-value">${data.termos.termo1}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Responsabilidade pelos dependentes:</div>
                <div class="summary-value">${data.termos.termo2}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Responsabilidade pelos animais:</div>
                <div class="summary-value">${data.termos.termo3}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Atualização de dados:</div>
                <div class="summary-value">${data.termos.termo4}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Veracidade das informações:</div>
                <div class="summary-value">${data.termos.termo5}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Penalidades:</div>
                <div class="summary-value">${data.termos.termo6}</div>
            </div>
        </div>
    `;

    // Transição suave
    formSection.classList.add('fade-out');
    setTimeout(() => {
        formSection.style.display = 'none';
        summarySection.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
}

function formatDate(dateString) {
    if (dateString === 'Não informado' || !dateString) {
        return 'Não informado';
    }
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

function resetForm() {
    const formSection = document.getElementById('formSection');
    const summarySection = document.getElementById('summarySection');

    // Resetar formulário
    document.getElementById('cadastroForm').reset();

    // Ocultar campos de animais
    document.getElementById('animalFields').style.display = 'none';

    // Limpar erros
    clearErrors();

    // Transição suave
    summarySection.classList.add('fade-out');
    setTimeout(() => {
        summarySection.style.display = 'none';
        summarySection.classList.remove('fade-out');
        formSection.style.display = 'block';
        formSection.classList.remove('fade-out');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
}
