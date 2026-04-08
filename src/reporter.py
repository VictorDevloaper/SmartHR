import os
from datetime import datetime

def generate_markdown_report(df_consolidado, insights_ia):
    """
    Gera um relatório automático consolidando métricas chave e os insights da IA.
    Salva como arquivo Markdown (.md).
    """
    hoje_str = datetime.now().strftime("%Y-%m-%d_%H-%M")
    report_filename = f"Relatorio_Operacional_{hoje_str}.md"
    
    metrics_md = df_consolidado.to_markdown(index=False)
    
    report_content = f"""# 📊 Relatório Executivo Automatizado
**Gerado em:** {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}

## 📈 Dados Consolidados da Semana
*Painel numérico das fontes SQL (Operação) e API (Sistemas)*

{metrics_md}

## 🤖 Análise e Insights Gerados por IA
*Esta seção foi processada automaticamente via Modelos Generativos treinados para análise de indicadores*

{insights_ia}

---
*Relatório gerado automaticamente pela Pipeline de Automação de Dados com IA.*
"""
    
    # Criar pasta 'reports' se não existir
    os.makedirs("reports", exist_ok=True)
    filepath = os.path.join("reports", report_filename)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(report_content)
        
    print(f"✅ Relatório criado com sucesso: {filepath}")
    return filepath
