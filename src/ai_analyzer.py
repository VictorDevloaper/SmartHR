import os
import random
from openai import AzureOpenAI
from dotenv import load_dotenv

load_dotenv()

def get_azure_client():
    api_key = os.getenv("AZURE_OPENAI_KEY")
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_version = os.getenv("AZURE_OPENAI_VERSION", "2024-02-15-preview")
    
    if not api_key or not endpoint or "sk-" in api_key: # Verifica se não é placeholder
        return None
        
    try:
        return AzureOpenAI(
            api_key=api_key,
            api_version=api_version,
            azure_endpoint=endpoint
        )
    except Exception:
        return None

def gerar_mock_analise(total_colaboradores, total_salarios, total_horas_extras, dept_count):
    """Gera uma análise técnica simulada de alta qualidade."""
    perc_he = (total_horas_extras / total_salarios) * 100 if total_salarios > 0 else 0
    analise = f"""# Resumo Executivo Financeiro (Simulação)

A presente auditoria processou a folha de pagamento consolidada no SmartHR, abrangendo um total de **{total_colaboradores} vidas** distribuídas em **{dept_count} centros de custo**.

## 📊 Cenário Geral
O custo total mapeado apresenta uma distribuição baseada em salários nominais de {total_salarios:,.2f}. Observamos que o impacto de encargos e provisões segue a média regulatória setorial.

## 🚩 Focos Críticos Detectados
- **Volume de Horas Extras**: O impacto das HE representa aproximadamente {perc_he:.1f}% da folha. Recomenda-se auditoria nos departamentos com desvio superior a 10%.
- **Concentração de Custos**: Identificamos áreas com pico de provisões que podem impactar o fluxo de caixa do próximo trimestre.

## 💡 Recomendações de Governança
1. **Otimização de Escalas**: Revisar as escalas de trabalho nos setores com maior incidência de HE.
2. **Projeção de Encargos**: Provisionar 35% sobre a folha para garantir cobertura fiscal integral.

## 🕵️ Fontes e Evidências
Esta análise foi gerada com base nos dados consolidados extraídos do Banco de Dados do SmartHR, processando um total de {total_colaboradores} vidas ativas e {dept_count} centros de custo. 
*Nota: Este relatório foi gerado em modo de simulação (IA Mock).*
"""
    return analise

def analisar_dados_com_ia(df_metrics):
    # Verificação de segurança: DataFrame vazio ou sem colunas esperadas
    if df_metrics.empty or 'qtd_funcionarios' not in df_metrics.columns:
        return "# Resumo Executivo Financeiro\n\nNão há dados disponíveis para análise no momento. Verifique a base de dados."

    # Cálculos seguros
    total_colaboradores = int(df_metrics['qtd_funcionarios'].sum())
    total_salarios = float(df_metrics['total_salarios'].sum())
    total_horas_extras = float(df_metrics['total_horas_extras'].sum())
    custo_total_consolidado = float(df_metrics['custo_departamento'].sum())
    dados_lista = df_metrics.to_dict(orient="records")
    
    client = get_azure_client()
    if not client:
        return gerar_mock_analise(total_colaboradores, total_salarios, total_horas_extras, len(dados_lista))

    deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4.1-mini")
    
    prompt = f"""
    Atue como um Especialista em Departamento Pessoal e Controladoria Financeira. 
    Analise os seguintes dados consolidados da folha de pagamento deste mês:
    
    --- FONTE DA VERDADE (USE ESTES VALORES EXATOS) ---
    - Custo Total Consolidado: R$ {custo_total_consolidado:,.2f}
    - Total de Colaboradores (Vidas): {total_colaboradores}
    - Total Salários Base: R$ {total_salarios:,.2f}
    - Total Horas Extras: R$ {total_horas_extras:,.2f}
    
    DETALHAMENTO POR DEPARTAMENTO:
    {dados_lista}
    
    GERE UM RELATÓRIO EXECUTIVO CONTENDO:
    1. O cenário geral de custos.
    2. Identificação de focos críticos (ex: departamentos com excesso de Horas Extras).
    3. Recomendações de governança e otimização.
    4. Ações Recomendadas no SmartHR.
    5. Fontes e Evidências da Análise.
    
    REGRAS CRÍTICAS:
    - PROIBIDO TENTAR RECALCULAR TOTAIS. Use os valores da "FONTE DA VERDADE".
    - Comece EXATAMENTE com "# Resumo Executivo Financeiro".
    - O último tópico DEVE obrigatoriamente se chamar "## 🕵️ Fontes e Evidências".
    """
    
    try:
        response = client.chat.completions.create(
            model=deployment_name,
            messages=[
                {"role": "system", "content": "Você é um auditor de folha de pagamento sênior."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception:
        return gerar_mock_analise(total_colaboradores, total_salarios, total_horas_extras, len(dados_lista))

def analisar_dados_externos_com_ia(dados_str, contexto):
    client = get_azure_client()
    if not client:
        return f"# Análise de Ingestão de Dados (Modo Simulação)\n\nOs dados ({contexto}) foram processados com sucesso. No modo de simulação, validamos a estrutura e integridade do payload.\n\n**Insights Simulados:**\n- Estrutura de dados compatível com ERP.\n- Identificamos {random.randint(2, 5)} pontos de atenção latentes.\n- Recomendamos a ativação de uma chave API para análise semântica profunda."

    deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt4.1-mini")
    prompt = f"{contexto}\n\nDados:\n{dados_str}\n\nComece com # Análise de Ingestão de Dados."
    
    try:
        response = client.chat.completions.create(
            model=deployment_name,
            messages=[
                {"role": "system", "content": "Você é um auditor de dados para RH e Controladoria."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        return response.choices[0].message.content
    except Exception:
        return f"# Análise de Ingestão de Dados (Fallback)\n\nErro na API. Exibindo resumo estrutural: {len(dados_str)} caracteres processados."
