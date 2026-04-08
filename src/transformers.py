import pandas as pd

def transform_and_consolidate(df_folha):
    """
    Calcula os KPIs de Folha de Pagamento agrupados por departamento.
    """
    if df_folha.empty:
        return pd.DataFrame(), []

    # Custo Total = Base + Extras + Encargos - Descontos
    df_folha['custo_total'] = (
        df_folha['salario_base'] + 
        df_folha['horas_extras'] + 
        df_folha['encargos_sociais'] - 
        df_folha['descontos']
    )
    
    # Detecção de Anomalias (Diferencial)
    anomalias = []
    
    # 1. Outliers de Salário (Z-Score simples p/ base global)
    mean_sal = df_folha['salario_base'].mean()
    std_sal = df_folha['salario_base'].std()
    
    if std_sal > 0:
        outliers = df_folha[df_folha['salario_base'] > (mean_sal + 2 * std_sal)]
        for _, row in outliers.iterrows():
            anomalias.append({
                "tipo": "Salário Atípico",
                "severidade": "Alta",
                "detalhe": f"Funcionário {row['id_funcionario']} com salário {row['salario_base']} está muito acima da média.",
                "contexto": row['departamento']
            })

    # Agrupar por departamento
    df_agrupado = df_folha.groupby('departamento').agg(
        qtd_funcionarios=('id_funcionario', 'count'),
        total_salarios=('salario_base', 'sum'),
        total_horas_extras=('horas_extras', 'sum'),
        total_encargos=('encargos_sociais', 'sum'),
        custo_departamento=('custo_total', 'sum')
    ).reset_index()
    
    # Percentual de Horas Extras sobre o Custo
    df_agrupado['perc_horas_extras'] = (df_agrupado['total_horas_extras'] / df_agrupado['custo_departamento']) * 100
    
    # 2. Vazamento Operacional (Excessive HE)
    excessive_he = df_agrupado[df_agrupado['perc_horas_extras'] > 15]
    for _, row in excessive_he.iterrows():
        anomalias.append({
            "tipo": "Vazamento Operacional",
            "severidade": "Média",
            "detalhe": f"Departamento {row['departamento']} operando com {row['perc_horas_extras']:.1f}% de Horas Extras. Risco de fadiga e custo elevado.",
            "contexto": row['departamento']
        })
    
    return df_agrupado.round(2), anomalias

