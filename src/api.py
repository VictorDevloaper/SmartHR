import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import logging
from tenacity import retry, stop_after_attempt, wait_exponential

# Imports locais (Pipeline)
from src.extractors import extract_folha
from src.transformers import transform_and_consolidate
from src.ai_analyzer import analisar_dados_com_ia, analisar_dados_externos_com_ia

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("hr_api")

load_dotenv()

app = FastAPI(title="Smart HR Data API")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)

class ExternalDataPayload(BaseModel):
    data: list[dict]
    context: str = "Dados importados de sistema externo ERP/CSV"

class FuncionarioCreate(BaseModel):
    id_funcionario: int | None = None
    departamento: str
    salario_base: float
    horas_extras: float = 0.0
    descontos: float = 0.0
    encargos_sociais: float = 0.0

class FuncionarioList(BaseModel):
    funcionarios: list[FuncionarioCreate]

class DeletePayload(BaseModel):
    departamentos: list[str]

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/login", summary="Autentica um usuário no sistema")
def login(payload: LoginRequest):
    import sqlite3
    from src.extractors import DB_PATH, init_db
    try:
        init_db() # Garantir que as tabelas existem
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT name, role FROM users WHERE LOWER(email) = LOWER(?) AND password = ?", (payload.email, payload.password))
        user = cur.fetchone()
        conn.close()
        
        if user:
            return {
                "status": "success",
                "user": {
                    "name": user[0],
                    "role": user[1]
                }
            }
        else:
            raise HTTPException(status_code=401, detail="E-mail ou senha inválidos.")
    except HTTPException as he:
        # Re-raise HTTPExceptions (like 401) so FastAPI handles them correctly
        raise he
    except Exception as e:
        logger.error(f"Erro grave no login: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno no servidor: {str(e)}")

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def process_pipeline():
    logger.info("Extraindo Banco SQLite RH...")
    df_raw = extract_folha()
    
    logger.info("Transformando custos e detecção de anomalias...")
    df_consolidado, anomalias = transform_and_consolidate(df_raw)
    return df_consolidado, anomalias

@app.get("/api/kpis", summary="Retorna os KPIs e Anomalias detectadas")
def get_kpis():
    try:
        df, anomalias = process_pipeline()
        return {
            "kpis": df.to_dict(orient="records"),
            "anomalias": anomalias
        }
    except Exception as e:
        logger.error(f"Erro ETL: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar dados de RH.")

@app.post("/api/funcionarios", summary="Adiciona funcionários em lote à base SQLite")
def add_funcionarios(payload: FuncionarioList):
    import sqlite3
    try:
        from src.extractors import DB_PATH
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        dados = []
        for f in payload.funcionarios:
            encargos = f.encargos_sociais if f.encargos_sociais > 0 else f.salario_base * 0.35
            dados.append((f.id_funcionario, f.departamento, f.salario_base, f.horas_extras, f.descontos, encargos))
        
        cur.executemany("INSERT OR REPLACE INTO folha_pagamento (id_funcionario, departamento, salario_base, horas_extras, descontos, encargos_sociais) VALUES (?, ?, ?, ?, ?, ?)", dados)
        conn.commit()
        conn.close()
        return {"status": "success", "inserted": len(dados)}
    except Exception as e:
        logger.error(f"Erro ao inserir nova linha. Payload: {payload.json()}")
        logger.error(f"Detalhe técnico do erro: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao gravar novas informações no banco: {str(e)}")

@app.delete("/api/departamentos", summary="Deleta os lançamentos de um ou mais departamentos")
def delete_departamentos(payload: DeletePayload):
    import sqlite3
    from src.extractors import DB_PATH
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        if not payload.departamentos:
            return {"status": "success", "deleted": 0}
        placeholders = ','.join('?' for _ in payload.departamentos)
        cur.execute(f"DELETE FROM folha_pagamento WHERE departamento IN ({placeholders})", payload.departamentos)
        deleted = cur.rowcount
        conn.commit()
        conn.close()
        return {"status": "success", "deleted": deleted}
    except Exception as e:
        logger.error(f"Erro ao deletar departamentos: {e}")
        raise HTTPException(status_code=500, detail="Erro ao deletar do banco.")

@app.delete("/api/funcionarios/all", summary="Deleta todos os lançamentos da base")
def delete_all():
    import sqlite3
    from src.extractors import DB_PATH
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("DELETE FROM folha_pagamento")
        conn.commit()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Erro ao deletar base: {e}")
        raise HTTPException(status_code=500, detail="Erro ao limpar banco.")

@app.get("/api/suggestions", summary="Gera sugestões da IA baseadas nas anomalias detectadas")
def get_suggestions():
    try:
        df, anomalias = process_pipeline()
        if not anomalias:
            return {"suggestion": "Tudo sob controle! Não detectamos anomalias críticas no momento."}
        
        # Criar um contexto resumido para a IA sugerir ações
        contexto_anomalias = "\n".join([f"- {a['tipo']} ({a['severidade']}): {a['detalhe']}" for a in anomalias])
        
        prompt = f"""
        Analise estas anomalias: {contexto_anomalias}
        Responda COM APENAS UMA FRASE de no máximo 10 palavras. 
        Seja direto e aja como um alerta de sistema. SEM INTRODUÇÃO.
        """
        
        from src.ai_analyzer import analisar_dados_externos_com_ia
        sugestao = analisar_dados_externos_com_ia(contexto_anomalias, prompt)
        
        return {"suggestion": sugestao}
    except Exception as e:
        logger.error(f"Falha ao gerar sugestões: {e}")
        return {"suggestion": "Dica: Revise os departamentos com maior volume de horas extras para otimizar custos."}

@app.get("/api/insights", summary="Gera análise da OpenAI sobre a Folha")
def get_insights():
    try:
        logger.info("Solicitando Azure OpenAI...")
        df, _ = process_pipeline()
        relatorio = analisar_dados_com_ia(df)
        return {"report_markdown": relatorio}
    except Exception as e:
        logger.error(f"Falha na IA: {e}")
        raise HTTPException(status_code=500, detail="Inteligência Artificial indisponível.")

@app.post("/api/analyze-external", summary="Analisa dados genéricos via payload JSON")
def analyze_external(payload: ExternalDataPayload):
    try:
        logger.info("Recebendo dados externos para IA...")
        resumo = str(payload.data)
        relatorio = analisar_dados_externos_com_ia(resumo, payload.context)
        return {"report_markdown": relatorio}
    except Exception as e:
        logger.error(f"Falha na IA externa: {e}")
        raise HTTPException(status_code=500, detail="Inteligência Artificial indisponível.")
