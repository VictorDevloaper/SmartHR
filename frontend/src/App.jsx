import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import './index.css';

function App() {
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'integration', 'fechamento', 'holerites', 'config'

  // States - Dashboard
  const [dados, setDados] = useState([]);
  const [anomalias, setAnomalias] = useState([]);
  const [sugestaoIa, setSugestaoIa] = useState('');
  const [insights, setInsights] = useState('');
  const [loadingDados, setLoadingDados] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [erro, setErro] = useState('');

  // States - UI Layout
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // States - Custom Toast Alert
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  };

  // States - Novo Lançamento (Manual/Upload)
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState('manual'); // 'manual' or 'json'
  const [formDepto, setFormDepto] = useState('TI');
  const [formSalario, setFormSalario] = useState(0);
  const [formHoras, setFormHoras] = useState(0);
  const [formDescontos, setFormDescontos] = useState(0);
  const [jsonUploadText, setJsonUploadText] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // States - Table Selection
  const [selectedDepts, setSelectedDepts] = useState([]);

  // States - Integração Externa
  const [externalText, setExternalText] = useState('');
  const [externalInsights, setExternalInsights] = useState('');
  const [loadingExternal, setLoadingExternal] = useState(false);

  // States - Fechamento de Ponto
  const [modalData, setModalData] = useState(null);
  const [jornadaData, setJornadaData] = useState([]);

  // States - Holerites
  const [holeritesData, setHoleritesData] = useState([]);

  // States - Configurações
  const [configMes, setConfigMes] = useState("2026-10-01");
  const [configAlertaHe, setConfigAlertaHe] = useState(true);
  const [configIntegracao, setConfigIntegracao] = useState(true);
  const [configLoading, setConfigLoading] = useState(false);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [showAiReportModal, setShowAiReportModal] = useState(false);
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);

  // States - Authentication
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('smartHR_auth') === 'true';
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('smartHR_user');
    return saved ? JSON.parse(saved) : { name: 'Visitante', role: 'Convidado' };
  });
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('smartHR_auth', isAuthenticated);
    localStorage.setItem('smartHR_user', JSON.stringify(currentUser));
  }, [isAuthenticated, currentUser]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginUser, password: loginPass })
      });

      const res = await resp.json();

      if (resp.ok && res.status === 'success') {
        setCurrentUser(res.user);
        setIsAuthenticated(true);
        showToast(`Bem-vindo, ${res.user.name}!`, 'success');
      } else {
        showToast(res.detail || 'Falha na autenticação', 'error');
      }
    } catch (err) {
      showToast('Erro ao conectar com servidor de autenticação', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser({ name: 'Visitante', role: 'Convidado' });
    setLoginUser('');
    setLoginPass('');
    localStorage.removeItem('smartHR_auth');
    localStorage.removeItem('smartHR_user');
    showToast('Sessão encerrada.', 'success');
  };

  const safeDados = Array.isArray(dados) ? dados : [];

  // ---------- Funções do Dashboard ----------
  const carregarDados = async () => {
    setLoadingDados(true);
    setErro('');
    try {
      const resp = await fetch('/api/kpis');
      if (!resp.ok) throw new Error('Falha ao buscar KPIs');
      const json = await resp.json();
      setDados(json.kpis || []);
      setAnomalias(json.anomalias || []);

      // Buscar sugestão automática da IA se houver anomalias
      if (json.anomalias && json.anomalias.length > 0) {
        carregarSugestoes();
      } else {
        setSugestaoIa('');
      }

      // --- Gerar dados mockados dinâmicos baseados no JSON ---
      const generatedJornada = [];
      const generatedHolerites = [];
      const names = ["Ana", "Carlos", "Beatriz", "João", "Maria", "Pedro", "Juliana", "Lucas", "Fernanda", "Rafael"];
      const lastNames = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes"];

      const today = new Date();
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const dataFechamento = `${String(lastDay.getDate()).padStart(2, '0')}/${String(lastDay.getMonth() + 1).padStart(2, '0')}/${lastDay.getFullYear()}`;

      let empId = 1;
      (json.kpis || []).forEach(d => {
        const mockCount = Math.min(d.qtd_funcionarios || 1, 5);
        for (let i = 0; i < mockCount; i++) {
          const randomName = `${names[Math.floor(Math.random() * names.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
          const hasHe = d.total_horas_extras > 0 && Math.random() > 0.4;

          generatedJornada.push({
            id: empId,
            nome: randomName,
            depto: d.departamento,
            hn: "160h",
            he: hasHe ? `${Math.floor(Math.random() * 12 + 1)}h` : "0h",
            status: Math.random() > 0.3 ? "Aprovado" : "Pendente"
          });

          generatedHolerites.push({
            id: empId,
            nome: randomName,
            cargo: `Analista (${d.departamento})`,
            data: dataFechamento,
            enviou: Math.random() > 0.2 ? "Enviado" : "Pendente"
          });
          empId++;
        }
      });
      setJornadaData(generatedJornada);
      setHoleritesData(generatedHolerites);
      // --------------------------------------------------------
    } catch (err) {
      setErro('Erro de conexão com FastAPI Backend na porta 8001.');
    } finally {
      setLoadingDados(false);
    }
  };

  const gerarInsightsAi = async () => {
    setLoadingAi(true);
    try {
      const resp = await fetch('/api/insights');
      if (!resp.ok) throw new Error('Falha ao gerar insights da IA');
      const json = await resp.json();
      setInsights(json.report_markdown);
    } catch (err) {
      setInsights('Erro ao contatar API de Inteligência Artificial.');
    } finally {
      setLoadingAi(false);
    }
  };

  const exportarCSV = () => {
    if (dados.length === 0) return;
    const headers = ['Departamento', 'Qtd_Funcionarios', 'Total_Salarios', 'Horas_Extras', 'Encargos', 'Custo_Departamento'];
    const rows = safeDados.map(d => [
      d.departamento || '-', d.qtd_funcionarios || 0, Number(d.total_salarios || 0).toFixed(2), Number(d.total_horas_extras || 0).toFixed(2),
      Number(d.total_encargos || 0).toFixed(2), Number(d.custo_departamento || 0).toFixed(2)
    ]);
    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'export_arquitetura_rh.csv';
    link.click();
  };

  const exportarParaERP = () => {
    if (dados.length === 0) return;
    const jsonStr = JSON.stringify(dados, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'export_erp_smarthr.json';
    link.click();
    showToast('Arquivo JSON gerado para ERP com sucesso!', 'success');
  };

  const carregarSugestoes = async () => {
    try {
      const resp = await fetch('/api/suggestions');
      const json = await resp.json();
      setSugestaoIa(json.suggestion);
    } catch (err) {
      console.error("Erro ao carregar sugestões:", err);
    }
  };


  const exportarPDF = () => {
    if (dados.length === 0) return;
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("SmartHR - Relatório de Centro de Custos", 14, 20);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, 28);

      let y = 40;
      safeDados.forEach((d, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.text(`Setor/DP: ${d.departamento || '-'}`, 14, y);
        doc.setFont("helvetica", "normal");
        doc.text(`Headcount: ${d.qtd_funcionarios || 0} | Salários: R$ ${Number(d.total_salarios || 0).toFixed(2)} | Horas Extras: R$ ${Number(d.total_horas_extras || 0).toFixed(2)}`, 14, y + 6);
        doc.text(`Encargos: R$ ${Number(d.total_encargos || 0).toFixed(2)} | Custo Consolidado: R$ ${Number(d.custo_departamento || 0).toFixed(2)}`, 14, y + 12);

        doc.setLineWidth(0.1);
        doc.line(14, y + 16, 196, y + 16);
        y += 24;
      });

      doc.save('export_arquitetura_rh.pdf');
    } catch (err) {
      showToast('Erro ao gerar PDF.', 'error');
    }
  };

  const enviarNovosDados = async () => {
    setAddLoading(true);
    try {
      let payload = { funcionarios: [] };
      if (addMode === 'manual') {
        payload.funcionarios.push({
          departamento: formDepto,
          salario_base: Number(formSalario),
          horas_extras: Number(formHoras),
          descontos: Number(formDescontos)
        });
      } else {
        const parsed = JSON.parse(jsonUploadText);
        let list = [];
        if (parsed.funcionarios && Array.isArray(parsed.funcionarios)) {
          list = parsed.funcionarios;
        } else {
          list = Array.isArray(parsed) ? parsed : [parsed];
        }
        payload.funcionarios = list;
      }

      const resp = await fetch('/api/funcionarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error('Falha ao inserir dados');

      showToast('Dados inseridos com sucesso na base!');
      setShowAddModal(false);
      setAddMode('manual');
      setJsonUploadText('');
      setFormSalario(0); setFormHoras(0); setFormDescontos(0);
      carregarDados(); // atualiza o dashboard inteiro
    } catch (err) {
      const errorMsg = err.message.includes('inserir') ? `Erro no servidor: ${err.message}` : 'Erro ao processar envio: verifique a estrutura do JSON ou sua conexão.';
      showToast(errorMsg, 'error');
    } finally {
      setAddLoading(false);
    }
  };

  const baixarJsonExemplo = () => {
    const exemploArray = [
      { id_funcionario: 101, departamento: "TI", salario_base: 15400.00, horas_extras: 0, descontos: 150.0 },
      { id_funcionario: 102, departamento: "Comercial", salario_base: 8200.50, horas_extras: 1250.00, descontos: 0 },
      { id_funcionario: 103, departamento: "Operacoes", salario_base: 9500.00, horas_extras: 450.50, descontos: 0 }
    ];
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exemploArray, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "template_importacao_rh.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedDepts(dados.map(d => d.departamento));
    } else {
      setSelectedDepts([]);
    }
  };

  const handleSelectDept = (depto) => {
    setSelectedDepts(prev => prev.includes(depto) ? prev.filter(d => d !== depto) : [...prev, depto]);
  };

  const deleteSelected = async () => {
    if (!window.confirm(`Tem certeza que deseja apagar todos os lançamentos de ${selectedDepts.length} área(s) selecionada(s)?`)) return;
    setLoadingDados(true);
    try {
      const resp = await fetch('/api/departamentos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departamentos: selectedDepts })
      });
      if (!resp.ok) throw new Error('Falha ao deletar dados');
      setSelectedDepts([]);
      showToast(`${selectedDepts.length} área(s) deletada(s) com sucesso.`);
      carregarDados();
    } catch (err) {
      showToast('Erro ao apagar dados. ' + err.message, 'error');
      setLoadingDados(false);
    }
  };

  // ---------- Funções de Integração Externa ----------
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setExternalText(event.target.result);
    reader.readAsText(file);
  };

  const analisarDadosExternos = async () => {
    if (!externalText) return;
    setLoadingExternal(true);

    const payload = {
      data: [{ raw_import: externalText.substring(0, 1500) }],
      context: "Dados inseridos manualmente (CSV/JSON/Raw)"
    };

    try {
      const resp = await fetch('/api/analyze-external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error('Falha ao analisar IA externa');
      const json = await resp.json();
      setExternalInsights(json.report_markdown);
    } catch (err) {
      setExternalInsights('Erro ao contatar backend para analisar dados externos.');
    } finally {
      setLoadingExternal(false);
    }
  };

  // ---------- Funções dos Novos Módulos ----------
  const aprovarTodasJornadas = () => {
    setJornadaData(jornadaData.map(d => ({ ...d, status: 'Aprovado' })));
    showToast("Marcações pendentes foram aprovadas com sucesso e espelhadas para a folha.");
  };

  const exibirDetalheJornada = (row) => {
    setModalData(row);
  };

  const dispararHolerites = () => {
    setModuleLoading(true);
    setTimeout(() => {
      setHoleritesData(holeritesData.map(d => ({ ...d, enviou: 'Enviado' })));
      setModuleLoading(false);
      showToast("Lote de holerites processado e enviado para os e-mails.");
    }, 1500);
  };

  const gerarPdfHolerite = (nome) => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("SmartHR - Demonstrativo de Pagamento", 20, 20);
      doc.setFontSize(12);
      doc.text(`Colaborador: ${nome}`, 20, 30);
      doc.text(`Competência: Outubro/2026`, 20, 40);
      doc.text(`Salário Base: R$ 5.400,00`, 20, 50);
      doc.text(`Descontos: R$ 640,00`, 20, 60);
      doc.text(`Líquido: R$ 4.760,00`, 20, 70);

      doc.save(`Holerite_${nome.replace(/ /g, '_')}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar PDF.");
    }
  };

  const salvarConfiguracoes = () => {
    setConfigLoading(true);
    setTimeout(() => {
      setConfigLoading(false);
      alert("Parâmetros do sistema salvos e integrados com sucesso.");
    }, 800);
  };

  const cancelarConfiguracoes = () => {
    setConfigMes("2026-10-01");
    setConfigAlertaHe(true);
    setConfigIntegracao(true);
  };

  // ---------- Efeitos e Helpers ----------
  useEffect(() => {
    if (activeView === 'dashboard') {
      carregarDados();
    }
  }, [activeView]);

  const totalFolha = safeDados.reduce((acc, curr) => acc + (curr.custo_departamento || 0), 0);
  const totalFuncionarios = safeDados.reduce((acc, curr) => acc + (curr.qtd_funcionarios || 0), 0);
  const mediaHorasExtras = safeDados.length > 0
    ? (safeDados.reduce((acc, curr) => acc + (curr.perc_horas_extras || 0), 0) / safeDados.length)
    : 0;
  const formatBRL = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const currentMonthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const currentMonthLabel = `${currentMonthNames[new Date().getMonth()]}/${new Date().getFullYear()}`;

  const getHeaderTitle = () => {
    switch (activeView) {
      case 'dashboard': return 'Dashboard de Controladoria: Folha de Pagamento';
      case 'integration': return 'Central de Integração de Dados Externa';
      case 'fechamento': return 'Módulo: Fechamento de Ponto';
      case 'holerites': return 'Módulo: Holerites e Benefícios';
      case 'config': return 'Painel de Configurações Base';
      default: return 'Smart HR';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="login-wrapper">
        <div className="login-video-container">
          <video autoPlay loop muted playsInline>
            <source src="/login_bg.mp4" type="video/mp4" />
          </video>
          <div className="login-video-overlay"></div>
        </div>

        <div className="login-content">
          {/* Lado Esquerdo: Apresentação Clean */}
          <div className="login-info-side">
            <div className="presentation-badge">Plataforma Enterprise</div>
            <h1 className="presentation-title">
              Controle Total da <span>Sua Operação</span>
            </h1>
            <p className="presentation-text">
              O SmartHR é a solução definitiva para gestão estratégica de capital humano.
              Integre dados, automatize processos e tome decisões baseadas em analytics de ponta.
            </p>

            <div className="presentation-features">
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
                </div>
                <div className="feature-text-content">
                  <h4>Analytics em Tempo Real</h4>
                  <p>Performance consolidada em dashboards executivos.</p>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                </div>
                <div className="feature-text-content">
                  <h4>Inteligência Cortex IA</h4>
                  <p>Algoritmos proativos para detecção de anomalias.</p>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </div>
                <div className="feature-text-content">
                  <h4>Gestão Integrada</h4>
                  <p>Folha e benefícios em uma única plataforma.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Lado Direito: Formulário de Login */}
          <div className="login-form-side">
            <div className="login-header">
              <div className="login-logo">
                <div className="login-logo-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                </div>
                <div className="login-logo-text">Smart<span>HR</span></div>
              </div>
              <p className="login-subtitle">Acesso Restrito ao Sistema CRM</p>
            </div>

            <form className="login-form" onSubmit={handleLogin}>
              <div className="input-wrapper">
                <label>E-mail Corporativo</label>
                <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <input
                  type="email"
                  className="input-field"
                  placeholder="nome@empresa.com.br"
                  required
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                />
              </div>

              <div className="input-wrapper">
                <label>Senha de Acesso</label>
                <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <input
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                  required
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                />
              </div>

              <div className="login-meta">
                <label className="remember-me">
                  <input type="checkbox" style={{ accentColor: 'var(--primary)' }} /> Lembrar acesso
                </label>
                <a href="#" className="forgot-password">Esqueceu a senha?</a>
              </div>

              <button type="submit" className="btn-login" disabled={loginLoading}>
                {loginLoading ? <span className="loader" style={{ borderTopColor: '#000' }}></span> : 'Entrar na Plataforma'}
              </button>
            </form>

            <div className="login-footer">
              <div className="dev-credit">
                Desenvolvido por <strong>João Victor Melo</strong>
              </div>
              <a href="https://www.linkedin.com/in/victor-melo21/" target="_blank" rel="noopener noreferrer" className="dev-social">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                LinkedIn
              </a>
              <div className="legal-links">
                <a href="#">Privacidade</a>
                <a href="#">Termos de Uso</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {toast.visible && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 99999,
          backgroundColor: toast.type === 'success' ? '#2ecc71' : '#e74c3c',
          color: '#fff', padding: '16px 24px', borderRadius: '8px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', gap: '12px',
          animation: 'slideInRight 0.3s ease forwards',
          fontWeight: '500'
        }}>
          <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          {toast.message}
        </div>
      )}

      <aside className={`erp-sidebar fade-in-left ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="erp-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
          <span className="erp-brand-text">Smart<span>HR</span></span>
        </div>
        <nav className="erp-menu">
          <div className={`erp-menu-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
            <span>Visão Geral (Painel)</span>
          </div>
          <div className={`erp-menu-item ${activeView === 'fechamento' ? 'active' : ''}`} onClick={() => setActiveView('fechamento')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span>Fechamento de Ponto</span>
          </div>
          <div className={`erp-menu-item ${activeView === 'holerites' ? 'active' : ''}`} onClick={() => setActiveView('holerites')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <span>Holerites e Benefícios</span>
          </div>
          <div className={`erp-menu-item ${activeView === 'config' ? 'active' : ''}`} onClick={() => setActiveView('config')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            <span>Configurações Base</span>
          </div>
          <div className="erp-menu-item" onClick={exportarParaERP} style={{ marginTop: 'auto', color: 'var(--primary)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span>Integração ERP</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-collapse-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} title={isSidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            <span className="erp-brand-text">Recolher Menu</span>
          </button>

          <div className="logout-item" onClick={handleLogout} style={{ marginTop: '12px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            <span>Sair do Sistema</span>
          </div>
        </div>
      </aside>

      <main className="app-container">
        <header className="fade-in-down">
          <div className="header-title">
            <h2 style={{ fontSize: '1.25rem' }}>
              {getHeaderTitle()}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </div>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{currentUser.name} ({currentUser.role})</span>
          </div>
        </header>

        <div className="workspace-content fade-in-up">
          {erro && (
            <div className="panel" style={{ borderColor: 'var(--danger)', color: '#ff8a8a', padding: '16px' }}>
              ⚠️ {erro}
            </div>
          )}

          {activeView === 'dashboard' && (
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              {!showAiSuggestion ? (
                <button
                  className="btn btn-premium fade-in-up"
                  onClick={() => {
                    setShowAiSuggestion(true);
                    if (!sugestaoIa) carregarSugestoes();
                  }}
                  style={{ borderRadius: '20px', padding: '10px 24px' }}
                >
                  ✨ Analisar Cenário com IA
                </button>
              ) : (
                <button
                  className="btn btn-outline fade-in-up"
                  onClick={() => setShowAiSuggestion(false)}
                  style={{ borderRadius: '20px', padding: '8px 20px', fontSize: '0.8rem' }}
                >
                  ✕ Ocultar Análise
                </button>
              )}
            </div>
          )}

          {activeView === 'dashboard' && showAiSuggestion && sugestaoIa && (
            <div className="panel ai-hint-card fade-in-down" style={{ marginBottom: '25px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: 1 }}>
                  <div className="ai-friendly-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z" /><path d="M12 12L2.1 12.1" /><path d="M12 12l9.9-0.1" /><path d="M12 12V22" /><path d="M12 12l-7-7" /><path d="M12 12l7 7" /></svg>
                  </div>
                  <div className="ai-hint-markdown">
                    <h4 className="ai-label-friendly">Insight da Inteligência SmartHR</h4>
                    <p className="ai-suggestion-text-friendly">{sugestaoIa}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn btn-premium-small"
                    onClick={() => {
                      setShowAiReportModal(true);
                      if (!insights) gerarInsightsAi();
                    }}
                    disabled={loadingAi}
                  >
                    {loadingAi ? <span className="loader"></span> : 'Abrir Relatório'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeView === 'dashboard' && (
            <>
              {/* KPIs */}
              <section className="kpi-grid">
                <div className="panel kpi-card hover-lift">
                  <h3>Custo Total da Folha</h3>
                  <div className="value">{formatBRL(totalFolha)}</div>
                  <div className="trend negative">Projetado (Mensal)</div>
                </div>
                <div className="panel kpi-card hover-lift" style={{ animationDelay: '0.1s' }}>
                  <h3>Headcount Total</h3>
                  <div className="value">{totalFuncionarios} Vidas</div>
                  <div className="trend positive">Equipe Base Estável</div>
                </div>
                <div className="panel kpi-card hover-lift" style={{ animationDelay: '0.2s' }}>
                  <h3>Risco Financeiro (HE)</h3>
                  <div className="value">{Number(mediaHorasExtras).toFixed(1)}%</div>
                  <div className="trend negative">Média Horas Extras / Custo Base</div>
                </div>
              </section>

              {/* Tabelas e Audit */}
              <section className="main-content">
                <div className="panel table-panel fade-in-up" style={{ animationDelay: '0.3s', gridColumn: '1 / -1' }}>
                  <div className="table-header">
                    <h2>Centro de Custos por Área</h2>
                    <div className="table-actions">
                      {selectedDepts.length > 0 && (
                        <button className="btn glow-on-hover fade-in-up" onClick={deleteSelected} style={{ backgroundColor: 'var(--danger)', color: '#fff' }}>
                          🗑 Apagar Selecionados ({selectedDepts.length})
                        </button>
                      )}
                      <button className="btn glow-on-hover" onClick={() => setShowAddModal(true)} style={{ backgroundColor: 'var(--primary)', color: '#000' }}>
                        + Novo Lançamento
                      </button>
                      <button className="btn btn-outline glow-on-hover" onClick={carregarDados} disabled={loadingDados}>
                        {loadingDados ? <span className="loader"></span> : '⟳ Refresh'}
                      </button>
                      <button className="btn btn-outline glow-on-hover" onClick={exportarCSV} disabled={dados.length === 0} style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
                        ⬇ CSV
                      </button>
                      <button className="btn btn-outline glow-on-hover" onClick={exportarPDF} disabled={dados.length === 0} style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                        ⬇ PDF
                      </button>
                    </div>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>
                            <input
                              type="checkbox"
                              checked={dados.length > 0 && selectedDepts.length === dados.length}
                              onChange={handleSelectAll}
                              style={{ transform: 'scale(1.2)' }}
                            />
                          </th>
                          <th>Setor / DP</th>
                          <th>Headcount</th>
                          <th>Salários (Base)</th>
                          <th>Impacto Hora Extra</th>
                          <th>Encargos (INSS/FGTS)</th>
                          <th>Custo Consolidado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {safeDados.map((linha, i) => (
                          <tr key={i} className="row-animate" style={{ animationDelay: `${0.1 * i}s` }}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedDepts.includes(linha.departamento)}
                                onChange={() => handleSelectDept(linha.departamento)}
                                style={{ transform: 'scale(1.2)' }}
                              />
                            </td>
                            <td style={{ fontWeight: '600', color: 'var(--text-main)' }}>{linha.departamento || '-'}</td>
                            <td>{linha.qtd_funcionarios || 0}</td>
                            <td>{formatBRL(linha.total_salarios)}</td>
                            <td style={{ color: (linha.perc_horas_extras || 0) > 10 ? 'var(--danger)' : 'var(--success)' }}>
                              {formatBRL(linha.total_horas_extras)} ({Number(linha.perc_horas_extras || 0).toFixed(1)}%)
                            </td>
                            <td>{formatBRL(linha.total_encargos)}</td>
                            <td style={{ fontWeight: '600' }}>{formatBRL(linha.custo_departamento)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* Diferencial: Painel de Anomalias (Shadow Payroll Audit) */}
              <section className="fade-in-up" style={{ marginTop: '24px' }}>
                <div className="panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: anomalias.length > 0 ? 'var(--danger)' : 'var(--success)', animation: anomalias.length > 0 ? 'pulse 2s infinite' : 'none' }}></div>
                      <h2 style={{ fontSize: '1.1rem' }}>SmartHR Audit Monitor (Real-time Anomaly Detection)</h2>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{anomalias.length} Riscos Detectados</span>
                  </div>

                  {anomalias.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                      <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>🛡️</span>
                      Tudo em conformidade. O SmartHR não detectou riscos operacionais na base de dados atual.
                    </div>
                  ) : (
                    <div className="anomaly-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                      {anomalias.map((a, idx) => (
                        <div key={idx} style={{
                          padding: '16px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          borderLeft: `4px solid ${a.severidade === 'Alta' ? 'var(--danger)' : 'var(--warning)'}`,
                          border: '1px solid rgba(255,255,255,0.05)',
                          display: 'flex', flexDirection: 'column', gap: '8px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: a.severidade === 'Alta' ? 'var(--danger)' : 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{a.tipo}</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{a.contexto}</span>
                          </div>
                          <div style={{ color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.4' }}>{a.detalhe}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}



          {/* View: Fechamento de Ponto */}
          {activeView === 'fechamento' && (
            <div className="panel table-panel fade-in-up">
              <div className="table-header">
                <h2>Controle de Jornada e Horas Extras</h2>
                <div className="table-actions">
                  <button className="btn glow-on-hover" onClick={aprovarTodasJornadas}>Aprovar Todos (Lote)</button>
                </div>
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem', padding: '0 20px' }}>
                Gestão e aprovação de horas para fechamento de folha da competência atual ({currentMonthLabel}).
              </p>
              <div className="table-scroll">
                {jornadaData.length === 0 ? (
                  <div style={{ textAlign: 'center', margin: '40px', color: 'var(--text-muted)' }}>
                    Sem dados de jornada. Adicione lançamentos no painel principal ou ingira dados de RH.
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Colaborador</th>
                        <th>Departamento</th>
                        <th>Horas Normais</th>
                        <th>Horas Extras</th>
                        <th>Status Aprovação</th>
                        <th>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jornadaData.map((row) => (
                        <tr key={row.id} className="row-animate">
                          <td style={{ fontWeight: '600' }}>{row.nome}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{row.depto}</td>
                          <td>{row.hn}</td>
                          <td style={{ color: row.he !== '0h' ? 'var(--danger)' : '' }}>{row.he}</td>
                          <td>
                            <span style={{
                              padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold',
                              backgroundColor: row.status === 'Aprovado' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(241, 196, 15, 0.1)',
                              color: row.status === 'Aprovado' ? 'var(--success)' : 'var(--warning)'
                            }}>
                              {row.status}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => exibirDetalheJornada(row)}>Exibir</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* View: Holerites e Benefícios */}
          {activeView === 'holerites' && (
            <div className="panel table-panel fade-in-up">
              <div className="table-header">
                <h2>Distribuição de Holerites - {currentMonthLabel}</h2>
                <div className="table-actions">
                  <button className="btn glow-on-hover" onClick={dispararHolerites} disabled={moduleLoading || holeritesData.length === 0}>
                    {moduleLoading ? <span className="loader" style={{ width: '16px', height: '16px' }}></span> : 'Disparar Lote por E-mail'}
                  </button>
                </div>
              </div>
              <div className="table-scroll">
                {holeritesData.length === 0 ? (
                  <div style={{ textAlign: 'center', margin: '40px', color: 'var(--text-muted)' }}>
                    Nenhum holerite disponível para a competência atual. Verifique os lançamentos de RH.
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Colaborador</th>
                        <th>Cargo</th>
                        <th>Data de Fechamento</th>
                        <th>Envio Digital</th>
                        <th>Download PDF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holeritesData.map((row) => (
                        <tr key={row.id} className="row-animate">
                          <td style={{ fontWeight: '600' }}>{row.nome}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{row.cargo}</td>
                          <td>{row.data}</td>
                          <td>
                            <span style={{
                              padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold',
                              backgroundColor: row.enviou === 'Enviado' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)',
                              color: row.enviou === 'Enviado' ? 'var(--success)' : 'var(--danger)'
                            }}>
                              {row.enviou}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => gerarPdfHolerite(row.nome)}>Gerar PDF</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* View: Configurações Base */}
          {activeView === 'config' && (
            <div className="panel fade-in-up" style={{ maxWidth: '600px', margin: '0 auto' }}>
              <h2 style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
                Configurações Corporativas do HR
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ display: 'block' }}>Mês de Competência Ativo</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Define a folha que está sendo rodada no sistema.</span>
                  </div>
                  <input type="date" value={configMes} onChange={(e) => setConfigMes(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-dark)', color: 'white', fontFamily: 'inherit' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ display: 'block' }}>Alerta Automático de Horas Extras</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Notifica gestores se a jornada exceder 10%.</span>
                  </div>
                  <input type="checkbox" checked={configAlertaHe} onChange={(e) => setConfigAlertaHe(e.target.checked)} style={{ transform: 'scale(1.5)', accentColor: 'var(--primary)' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ display: 'block' }}>Integração Contábil (ERP)</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Exporta lançamentos fechados para a API do ERP principal.</span>
                  </div>
                  <input type="checkbox" checked={configIntegracao} onChange={(e) => setConfigIntegracao(e.target.checked)} style={{ transform: 'scale(1.5)', accentColor: 'var(--primary)' }} />
                </div>
              </div>

              <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button className="btn btn-outline" onClick={cancelarConfiguracoes}>Cancelar</button>
                <button className="btn glow-on-hover" onClick={salvarConfiguracoes} disabled={configLoading}>
                  {configLoading ? <span className="loader" style={{ width: '16px', height: '16px' }}></span> : 'Salvar Configurações'}
                </button>
              </div>
            </div>
          )}

        </div >
      </main >

      {/* Modal de Detalhe de Jornada */}
      {
        modalData && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div className="modal-content fade-in-up" style={{ backgroundColor: '#1a1a1a', padding: '24px', borderRadius: '8px', minWidth: '400px', border: '1px solid var(--border-light)', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
              <h2 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>Espelho de Ponto: {modalData.nome}</h2>
              <div style={{ marginBottom: '12px' }}><strong>Departamento:</strong> {modalData.depto}</div>
              <div style={{ marginBottom: '12px' }}><strong>Horas Normais Feitas:</strong> {modalData.hn}</div>
              <div style={{ marginBottom: '12px', color: modalData.he !== '0h' ? 'var(--danger)' : 'var(--text-main)' }}>
                <strong>Horas Extras Realizadas:</strong> {modalData.he}
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button className="btn btn-outline" onClick={() => setModalData(null)}>Fechar</button>
                <button className="btn glow-on-hover" onClick={() => {
                  setJornadaData(jornadaData.map(d => d.id === modalData.id ? { ...d, status: 'Aprovado' } : d));
                  setModalData(null);
                }}>Aprovar Ponto Individual</button>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal de Adição de Dados */}
      {
        showAddModal && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div className="modal-content fade-in-up" style={{ backgroundColor: '#1a1a1a', padding: '24px', borderRadius: '8px', width: '500px', border: '1px solid var(--border-light)', boxShadow: '0 10px 40px rgba(0,0,0,0.8)', maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>Realizar Lançamento Manual / Importação</h2>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button className={`btn ${addMode === 'manual' ? 'glow-on-hover' : 'btn-outline'}`} onClick={() => setAddMode('manual')} style={{ flex: 1 }}>Input Manual</button>
                <button className={`btn ${addMode === 'json' ? 'glow-on-hover' : 'btn-outline'}`} onClick={() => setAddMode('json')} style={{ flex: 1 }}>Input via JSON</button>
              </div>

              {addMode === 'manual' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Departamento</label>
                    <select value={formDepto} onChange={(e) => setFormDepto(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-dark)', color: 'white' }}>
                      <option value="TI">TI e Desenvolvimento</option>
                      <option value="Comercial">Comercial</option>
                      <option value="Operacoes">Operações</option>
                      <option value="Diretoria">Diretoria</option>
                      <option value="Atendimento">Atendimento</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Salário Base Apurado (R$)</label>
                    <input type="number" value={formSalario} onChange={(e) => setFormSalario(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-dark)', color: 'white' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Horas Extras (R$ Valor)</label>
                    <input type="number" value={formHoras} onChange={(e) => setFormHoras(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-dark)', color: 'white' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Descontos Variáveis (R$)</label>
                    <input type="number" value={formDescontos} onChange={(e) => setFormDescontos(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-dark)', color: 'white' }} />
                  </div>
                </div>
              )}

              {addMode === 'json' && (
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
                    Consulte o Dicionário de Dados abaixo para formatar corretamente seu arquivo antes de colar. Certifique-se de colar um Array válido {"`[{...}]`"}.
                  </p>

                  <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '16px', border: '1px solid var(--border-light)', borderRadius: '4px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead style={{ backgroundColor: '#222', position: 'sticky', top: 0 }}>
                        <tr>
                          <th style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'left', color: '#aaa' }}>Ordem</th>
                          <th style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'left', color: '#aaa' }}>Campo (JSON Key)</th>
                          <th style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'left', color: '#aaa' }}>Descrição / Observações do campo</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #333' }}>
                          <td style={{ padding: '8px', color: '#777' }}>1</td>
                          <td style={{ padding: '8px', color: '#98c379', fontWeight: 'bold' }}>id_funcionario</td>
                          <td style={{ padding: '8px', color: '#ddd' }}><strong>Tipo Inteiro.</strong> ID único (Ex: 10). Se enviado e existir, ATUALIZA. Opcional.</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #333' }}>
                          <td style={{ padding: '8px', color: '#777' }}>2</td>
                          <td style={{ padding: '8px', color: '#98c379', fontWeight: 'bold' }}>departamento</td>
                          <td style={{ padding: '8px', color: '#ddd' }}><strong>Tipo String.</strong> Nome da área (Ex: "Comercial", "TI"). Obrigatório.</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #333' }}>
                          <td style={{ padding: '8px', color: '#777' }}>3</td>
                          <td style={{ padding: '8px', color: '#98c379', fontWeight: 'bold' }}>salario_base</td>
                          <td style={{ padding: '8px', color: '#ddd' }}><strong>Tipo Float/Int.</strong> Remuneração (Ex: 5000.50). Obrigatório.</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #333' }}>
                          <td style={{ padding: '8px', color: '#777' }}>4</td>
                          <td style={{ padding: '8px', color: '#98c379', fontWeight: 'bold' }}>horas_extras</td>
                          <td style={{ padding: '8px', color: '#ddd' }}><strong>Tipo Float/Int.</strong> Valor em R$ gasto. Opcional (Padrão: 0).</td>
                        </tr>
                        <tr style={{ borderBottom: 'none' }}>
                          <td style={{ padding: '8px', color: '#777' }}>5</td>
                          <td style={{ padding: '8px', color: '#98c379', fontWeight: 'bold' }}>descontos</td>
                          <td style={{ padding: '8px', color: '#ddd' }}><strong>Tipo Float/Int.</strong> Deduções globais. Opcional (Padrão: 0).</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.9rem', color: 'white' }}>Fazer Upload do Arquivo JSON:</label>
                    <button className="btn btn-outline" onClick={baixarJsonExemplo} style={{ padding: '4px 12px', fontSize: '0.8rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                      ⏬ Baixar Arquivo Template (.json)
                    </button>
                  </div>
                  <input
                    type="file"
                    accept=".json,.csv"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) {
                        setJsonUploadText('');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (event) => setJsonUploadText(event.target.result);
                      reader.readAsText(file);
                    }}
                    style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px dashed var(--border-light)', backgroundColor: '#111', color: 'white', cursor: 'pointer' }}
                  />
                  {jsonUploadText && (
                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'rgba(46, 204, 113, 0.1)', color: 'var(--success)', borderRadius: '4px', fontSize: '0.85rem' }}>
                      ✅ Arquivo carregado na memória e pronto para envio! Clique em Salvar Dados.
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button className="btn btn-outline" onClick={() => setShowAddModal(false)} disabled={addLoading}>Cancelar</button>
                <button className="btn glow-on-hover" onClick={enviarNovosDados} disabled={addLoading}>
                  {addLoading ? <span className="loader" style={{ width: '16px', height: '16px' }}></span> : 'Salvar Dados no Banco'}
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* Modal de Relatório Completo de IA */}
      {showAiReportModal && (
        <div className="modal-overlay" onClick={() => setShowAiReportModal(false)}>
          <div className="modal-content erp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div className="ai-icon-premium">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                </div>
                <h2 style={{ fontSize: '1.4rem', letterSpacing: '-0.5px' }}>AuditAICore <span style={{ color: 'var(--primary)', fontWeight: '400', opacity: '0.8' }}>— Relatório Executivo</span></h2>
              </div>
              <button className="close-btn" onClick={() => setShowAiReportModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="modal-body ai-modal-body">
              {loadingAi && !insights ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px' }}>
                  <span className="loader" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></span>
                  <p style={{ marginTop: '20px', color: 'var(--text-muted)' }}>Gerando análise profunda de dados...</p>
                </div>
              ) : (
                <div className="ai-report-content">
                  <ReactMarkdown>{insights}</ReactMarkdown>
                  <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-light)', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline" onClick={gerarInsightsAi} disabled={loadingAi}>
                      {loadingAi ? <span className="loader"></span> : '⟳ Recalcular Auditoria'}
                    </button>
                    <button className="btn" style={{ marginLeft: '12px' }} onClick={() => setShowAiReportModal(false)}>Fechar Relatório</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
}

export default App;
