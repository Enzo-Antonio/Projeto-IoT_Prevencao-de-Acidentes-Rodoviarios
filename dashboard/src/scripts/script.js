// script.js — Lógica do Dashboard (Sincronizado estritamente com o main.py)
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Configurações de Conexão ──────────────────────────────────────────────
// Altere o IP abaixo para o valor exato de BROKER_IP contido no seu config.py
const BROKER = "ws://10.132.112.4:8000";
// Deve ser idêntico ao TOPIC_PUB do seu config.py
const TOPICO = "senai/grupo2/prevencao-acidentes";
// ClientID gerado dinamicamente para evitar conflitos de sessão
const CLIENT_ID = "dashboard_" + Math.random().toString(16).slice(2, 8);

// ── 2. Elementos do HTML / Mapeamento do Layout ──────────────────────────────
const statusTexto = document.getElementById("statusRede");
const painelStatusGeral = document.getElementById("painelStatusGeral");
const picoStatusText = document.getElementById("picoStatusText");
const picoDistanciaTexto = document.getElementById("picoDistanciaTexto"); // Onde a velocidade será impressa
const logContainer = document.getElementById("logContainer");

// Elementos de Controle Visual do Card (CSS Dinâmico)
const picoCard = document.getElementById("picoCard");
const picoCardLabel = document.getElementById("picoCardLabel");
const picoIcon = document.getElementById("picoIcon");

// Variável global de estado para agrupar as duas transmissões consecutivas do Pico
let ultimoTipoDetectado = "";

// ── 3. Funções de Atualização da Interface ───────────────────────────────────

function atualizarStatus(conectado) {
  if (statusTexto) {
    statusTexto.textContent = conectado ? "ONLINE" : "DESCONECTADO";
    statusTexto.style.color = conectado
      ? "var(--primary-fixed-dim)"
      : "var(--error-bg)";
  }
  if (painelStatusGeral) {
    painelStatusGeral.textContent = conectado
      ? "SISTEMA OPERACIONAL"
      : "Aguardando Conexão...";
  }
}

function adicionarLogDoPico(tipo, velocidade, corHora) {
  const hora = new Date().toLocaleTimeString("pt-BR");

  // Remove o aviso inicial estático assim que a primeira telemetria real chega
  const placeholder = logContainer.querySelector(".placeholder-entry");
  if (placeholder) placeholder.remove();

  // Monta a estrutura HTML exigida pelo seu CSS
  const novoLog = document.createElement("div");
  novoLog.className = "log-entry";
  novoLog.innerHTML = `
        <p class="log-time ${corHora}">[${hora}]</p>
        <p class="log-msg">${tipo} Detectado</p>
        <p class="log-sub">Módulo: Pico 2W • Radar: ${velocidade}</p>
    `;

  // Injeta o log sempre no topo do contêiner lateral
  logContainer.insertBefore(novoLog, logContainer.firstChild);

  // Sistema de trava (FIFO) com limite de 4 itens para preservar a integridade do layout
  if (logContainer.children.length > 4) {
    logContainer.removeChild(logContainer.lastChild);
  }
}

// ── 4. Tratamento de Dados (Casamento estrito com as strings do Python) ──────
function exibirMensagem(topico, mensagem) {
  const payload = mensagem.trim();

  // PASSO A: O main.py disparou a mensagem de TIPO (Ex: "TIPO: ANIMAL SILVESTRE.")
  if (payload.startsWith("TIPO:")) {
    // Remove a etiqueta "TIPO:", elimina o ponto final "." e limpa espaços vazios
    ultimoTipoDetectado = payload.replace("TIPO:", "").replace(".", "").trim();
    return; // Sai da função e retém o valor na memória até que a velocidade chegue
  }

  // PASSO B: O main.py disparou a mensagem de VELOCIDADE (Ex: "VEL: 0.025 cm/ms")
  if (payload.startsWith("VEL:") && ultimoTipoDetectado !== "") {
    const velocidadeTexto = payload.replace("VEL:", "").trim();

    // INTERRUPÇÃO CRÍTICA: Se o Python classificou como ANIMAL SILVESTRE
    if (ultimoTipoDetectado === "ANIMAL SILVESTRE") {
      if (picoStatusText) picoStatusText.textContent = "ANIMAL NA PISTA";
      if (picoDistanciaTexto) {
        picoDistanciaTexto.textContent = velocidadeTexto;
        picoDistanciaTexto.style.color = "var(--accent-yellow)";
      }

      // Transiciona o card para a estilização de perigo amarela do seu CSS
      if (picoCard)
        picoCard.className = "glass-panel sensor-card border-yellow";
      if (picoCardLabel) picoCardLabel.className = "card-tag-label text-yellow";
      if (picoIcon)
        picoIcon.className = "material-symbols-outlined text-yellow";

      adicionarLogDoPico(ultimoTipoDetectado, velocidadeTexto, "text-yellow");
    } else {
      // FLUXO NORMAL: Se for VEICULO ou OBJETO COMUM/RUIDO
      if (picoStatusText) picoStatusText.textContent = ultimoTipoDetectado;
      if (picoDistanciaTexto) {
        picoDistanciaTexto.textContent = velocidadeTexto;
        picoDistanciaTexto.style.color = "var(--primary-fixed-dim)";
      }

      // Mantém ou retorna o card para os tons estáveis de azul ciano
      if (picoCard)
        picoCard.className = "glass-panel sensor-card border-primary";
      if (picoCardLabel) picoCardLabel.className = "card-tag-label text-muted";
      if (picoIcon)
        picoIcon.className = "material-symbols-outlined text-primary";

      adicionarLogDoPico(ultimoTipoDetectado, velocidadeTexto, "text-primary");
    }

    // Zera a memória temporária deixando o script pronto para o próximo loop do hardware
    ultimoTipoDetectado = "";
  }
}

// ── 5. Orquestração de Eventos MQTT.js ───────────────────────────────────────
console.log(`Estabelecendo canal WebSocket com o Broker: ${BROKER}`);
const cliente = mqtt.connect(BROKER, {
  clientId: CLIENT_ID,
  clean: true,
});

// Listener: Sucesso na conexão com a máquina servidora
cliente.on("connect", () => {
  atualizarStatus(true);
  console.log("Conectado com sucesso ao ecossistema MQTT.");

  cliente.subscribe(TOPICO, (err) => {
    if (!err) {
      console.log(`Escuta ativa estabelecida no tópico: "${TOPICO}"`);
    }
  });
});

// Listener: Receptor ativo do fluxo de mensagens (O porteiro de rede)
cliente.on("message", (topico, payload) => {
  const mensagem = payload.toString();
  exibirMensagem(topico, mensagem);
});

// Listener: Tratamento de falhas de rede ou timeout
cliente.on("error", (err) => {
  atualizarStatus(false);
  console.error(`[FALHA MQTT]: ${err.message}`);
});

// Listener: Encerramento abrupto ou manual da conexão
cliente.on("close", () => {
  atualizarStatus(false);
});
