// ====== SUPABASE INTEGRATION ======
const supabaseUrl = 'https://jzvoxaqhteqdfyurjlbk.supabase.co';
const supabaseKey = 'sb_publishable_hKgmUqtu7Wrfo1A5z0fiUg_xy4pLT9H';
const _supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

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
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Importante para Google Apps Script
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSend)
        });

        // Enviar para SUPABASE (integração com o Dashboard Vila Naval)
        if (_supabase) {
            const nipToSave = formData.dadosPessoais.nip.toLowerCase().trim();
            
            // Verifica se o morador já possui registro na Vila Naval (pelo NIP)
            const { data: searchResults, error: searchError } = await _supabase.from('moradores').select('id, dados').eq('nip', nipToSave);
            
            if (searchResults && searchResults.length > 0) {
                // Preservar a senha e outras definições internas já criadas do morador
                let oldDados = searchResults[0].dados || {};
                let combinedDados = { ...formData, senha: oldDados.senha || 'marinha123' };
                await _supabase.from('moradores').update({ dados: combinedDados }).eq('nip', nipToSave);
            } else {
                // Se não existe, cria o novo registro padrão (c/ senha provisória padrão)
                let newDados = { ...formData, senha: 'marinha123' };
                await _supabase.from('moradores').insert([{ nip: nipToSave, dados: newDados }]);
            }
        }

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
        </div>
    `;

    window.lastSubmittedData = data;

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

window.baixarFichaPDF = async function() {
    const data = window.lastSubmittedData;
    if (!data) {
        alert("Nenhum dado encontrado para gerar o PDF.");
        return;
    }
    
    const safeGet = (section, key) => data[section] && data[section][key] ? String(data[section][key]).toUpperCase() : '';

    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Ficha de Cadastro - Vila Naval</title>
        <style>
            body { font-family: 'Arial', sans-serif; color: #000; line-height: 1.4; margin:0; padding:20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { font-size: 16pt; margin: 5px 0 0 0; text-transform: uppercase; }
            h2 { font-size: 12pt; background-color: #f0f0f0; border: 1px solid #000; padding: 5px; margin-top: 20px; }
            .row { display: flex; flex-wrap: wrap; margin-bottom: 10px; }
            .field { flex: 1; padding: 0 5px; }
            .field-label { font-weight: bold; font-size: 9pt; }
            .field-value { border-bottom: 1px solid #000; padding: 3px 0; min-height: 20px; font-size: 11pt; text-transform: uppercase; }
            .box { border: 1px solid #000; padding: 10px; margin-bottom: 10px; }
            .obs { font-size: 8pt; font-style: italic; margin-top: 30px; text-align: justify;}
            .signature { margin-top: 50px; text-align: center; width: 100%; display: flex; justify-content: space-around;}
            .sig-line { border-top: 1px solid #000; width: 40%; padding-top: 5px; font-size: 10pt; }
        </style>
    </head>
    <body onload="window.print(); window.onafterprint = function(){ window.close(); }">
        <div class="header">
            <h1>MARINHA DO BRASIL</h1>
            <h2>Vila Naval de Tabatinga (APVNT) - Ficha de Cadastro/Atualização</h2>
        </div>
        
        <h2>DADOS DO PERMISSIONÁRIO (TITULAR)</h2>
        <div class="box">
            <div class="row">
                <div class="field" style="flex: 2;"><div class="field-label">NOME COMPLETO:</div><div class="field-value">${safeGet('dadosPessoais', 'nomeCompleto')}</div></div>
                <div class="field" style="flex: 1;"><div class="field-label">POSTO/GRADUAÇÃO:</div><div class="field-value">${safeGet('dadosPessoais', 'posto')}</div></div>
            </div>
            <div class="row">
                <div class="field"><div class="field-label">NIP:</div><div class="field-value">${safeGet('dadosPessoais', 'nip')}</div></div>
                <div class="field"><div class="field-label">CPF:</div><div class="field-value">${safeGet('dadosPessoais', 'cpf')}</div></div>
                <div class="field"><div class="field-label">DATA NASCIMENTO:</div><div class="field-value">${safeGet('dadosPessoais', 'dataNascimentoTitular')}</div></div>
            </div>
            <div class="row">
                <div class="field" style="flex: 1;"><div class="field-label">ENDEREÇO NA APVNT (PNR):</div><div class="field-value">${safeGet('dadosPessoais', 'endereco')}</div></div>
            </div>
        </div>
        
        <h2>DADOS DOS DEPENDENTES / AGREGADOS</h2>
        <div class="box">
            <div class="row">
                <div class="field" style="flex: 2;"><div class="field-label">1. NOME DO DEPENDENTE:</div><div class="field-value">${safeGet('dependentes', 'nomeDependente1')}</div></div>
                <div class="field"><div class="field-label">GRAU DE PARENTESCO:</div><div class="field-value">${safeGet('dependentes', 'grauParentesco')}</div></div>
            </div>
            <div class="row">
                <div class="field"><div class="field-label">TELEFONE:</div><div class="field-value">${safeGet('dependentes', 'telefone')}</div></div>
                <div class="field"><div class="field-label">DATA DE NASCIMENTO:</div><div class="field-value">${safeGet('dependentes', 'dataNascimento')}</div></div>
            </div>
            <div class="row mt-2">
                <div class="field"><div class="field-label">OUTROS DEPENDENTES:</div><div class="field-value" style="min-height: 40px;">${safeGet('dependentes', 'outrosDependentes')}</div></div>
            </div>
        </div>
        
        <h2>ANIMAIS DE ESTIMAÇÃO NO PNR</h2>
        <div class="box">
            <div class="row">
                <div class="field"><div class="field-label">POSSUI ANIMAL?</div><div style="font-size:11pt; padding:5px 0;"> ${data.animais.possuiAnimal === 'Sim' ? '( X )' : '(   )'} SIM &nbsp;&nbsp; ${data.animais.possuiAnimal === 'Não' ? '( X )' : '(   )'} NÃO</div></div>
                <div class="field"><div class="field-label">ESPÉCIE:</div><div class="field-value">${safeGet('animais', 'especie')}</div></div>
            </div>
            <div class="row">
                <div class="field" style="flex: 2;"><div class="field-label">NOME DO ANIMAL:</div><div class="field-value">${safeGet('animais', 'nomeAnimal')}</div></div>
            </div>
            <div class="row">
                <div class="field"><div class="field-label">VACINAS EM DIA?</div><div style="font-size:11pt; padding:5px 0;"> ${data.animais.vacinacao === 'Em dia' ? '( X )' : '(   )'} SIM &nbsp;&nbsp; ${data.animais.vacinacao === 'Pendente' ? '( X )' : '(   )'} NÃO </div></div>
            </div>
        </div>
        
        <p class="obs">
            Atesto sob as penas da lei e dos regulamentos militares a veracidade das informações ora prestadas, e comprometo-me a informar à Prefeitura da Vila Naval (Sistema APVNT) quaisquer atualizações ocorridas.
        </p>
        
        <div class="signature">
            <div class="sig-line">Local e Data</div>
            <div class="sig-line">Assinatura do Permissionário</div>
        </div>
    </body>
    </html>
    `;

    if (typeof html2pdf !== 'undefined') {
        let opt = {
            margin: 10,
            filename: 'ficha_cadastro_' + (data.dadosPessoais.nip || 'novo') + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        let container = document.createElement('div');
        container.innerHTML = html;
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '210mm'; 
        container.style.backgroundColor = 'white';
        document.body.appendChild(container);
        
        const btn = document.getElementById('btnBaixarPdf');
        const oldText = btn.innerHTML;
        btn.innerHTML = 'Gerando PDF...';
        btn.disabled = true;

        html2pdf().set(opt).from(container).save().then(() => {
            document.body.removeChild(container);
            btn.innerHTML = oldText;
            btn.disabled = false;
        });
    } else {
        alert("Erro: Biblioteca PDF não carregada.");
    }
}
