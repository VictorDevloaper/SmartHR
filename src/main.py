import sys
import os

# Adiciona o diretório raiz ao path para permitir imports de 'src'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Importando os módulos da nossa pipeline
try:
    from src.extractors import extract_folha
    from src.transformers import transform_and_consolidate
    from src.ai_analyzer import analisar_dados_com_ia
    from src.reporter import generate_markdown_report
except ImportError:
    from extractors import extract_folha
    from transformers import transform_and_consolidate
    from ai_analyzer import analisar_dados_com_ia
    from reporter import generate_markdown_report

from dotenv import load_dotenv

def main():
    print("🚀 Iniciando Pipeline de Análise Automatizada...")
    load_dotenv()
    
    print("1️⃣ [EXTRACT] Coletando dados (SQLite)...")
    df_raw = extract_folha()
    
    print("2️⃣ [TRANSFORM] Transformando e consolidando os indicadores...")
    df_consolidado, anomalias = transform_and_consolidate(df_raw)
    
    print("3️⃣ [AI ANALYZE] Processando dados consolidados através do modelo de IA Generativa...")
    insights = analisar_dados_com_ia(df_consolidado)
    
    print("4️⃣ [LOAD/REPORT] Gerando relatório executivo e exportando...")
    report_path = generate_markdown_report(df_consolidado, insights)
    
    print(f"\n🎉 Pipeline finalizado com sucesso! Economia estimada nesta execução: 2 horas de trabalho manual.")
    print(f"📄 Verifique o relatório gerado na pasta: {report_path}")

if __name__ == "__main__":
    main()
