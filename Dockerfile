FROM python:3.10-slim

WORKDIR /app

# Instalar dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar projeto
COPY . .

# Variáveis de ambiente configuráveis (por padrão usará vazio ou o passado pelo orquestrador)
ENV GEMINI_API_KEY=""

# Porta padrão de acesso à API
EXPOSE 8000

# Executar a API
CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]
