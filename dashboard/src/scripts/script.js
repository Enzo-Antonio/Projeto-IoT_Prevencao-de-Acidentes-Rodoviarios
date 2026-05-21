document.addEventListener('DOMContentLoaded', () => {

    const btnEmergencia = document.getElementById('btnEmergencia');

    btnEmergencia.addEventListener('click', () => {
        document.body.style.transition = 'background-color 0.2s';
        document.body.style.backgroundColor = '#220000';
        setTimeout(() => { document.body.style.backgroundColor = ''; }, 2000);

        alert('PROTOCOLO DE EMERGÊNCIA ATIVADO!\nAutoridades notificadas.');
    });


    const logContainer = document.getElementById('logContainer');

    const initialLogs = [
        { time: '09:45 AM', msg: 'Movimento detectado no KM 142',       sub: 'ID Sensor PIR: 88A • Verificado',              isPrimary: true  },
        { time: '08:12 AM', msg: 'Caminho Livre - Atualização de Distância', sub: 'Ultrassônico: Setor 09 • Normal',          isPrimary: false },
        { time: '07:55 AM', msg: 'Diagnóstico do Sistema Concluído',     sub: 'Todos os 124 sensores sincronizados',          isPrimary: false },
    ];

    const buildEntry = ({ time, msg, sub, isPrimary }) => {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = `
            <p class="log-time ${isPrimary ? 'text-primary' : 'text-muted'}">${time}</p>
            <p class="log-msg">${msg}</p>
            <p class="log-sub">${sub}</p>
        `;
        return entry;
    };

    if (!logContainer.children.length) {
        initialLogs.forEach(log => logContainer.appendChild(buildEntry(log)));
    }

    const liveMessages = [
        { msg: 'Sensor PIR-104 recalibrado',          sub: 'Setor 07 • Auto-calibração concluída'          },
        { msg: 'Leitura ultrassônica nominal',         sub: 'Distância: 18.3m • Setor 11'                  },
        { msg: 'Link MQTT renovado',                   sub: 'Broker: mqtt.rod-smart.local • Latência: 11ms' },
        { msg: 'Câmera CAM_LESTE_02 sincronizada',     sub: 'Feed de vídeo estável • 1080p/30fps'           },
        { msg: 'Nenhum obstáculo detectado – KM 148',  sub: 'Sensor Ultra-09 • Normal'                      },
    ];
    let liveIdx = 0;

    const addLiveLog = () => {
        const now = new Date();
        const hh   = String(now.getHours()).padStart(2, '0');
        const mm   = String(now.getMinutes()).padStart(2, '0');
        const ss   = String(now.getSeconds()).padStart(2, '0');

        const entry = buildEntry({
            time: `${hh}:${mm}:${ss}`,
            msg:  liveMessages[liveIdx % liveMessages.length].msg,
            sub:  liveMessages[liveIdx % liveMessages.length].sub,
            isPrimary: Math.random() > 0.6,
        });

        entry.style.opacity = '0';
        entry.style.transform = 'translateY(-8px)';
        entry.style.transition = 'opacity 0.4s, transform 0.4s';
        logContainer.prepend(entry);
        requestAnimationFrame(() => {
            entry.style.opacity = '1';
            entry.style.transform = 'translateY(0)';
        });

        while (logContainer.children.length > 6) {
            logContainer.removeChild(logContainer.lastChild);
        }

        liveIdx++;
    };

    setInterval(addLiveLog, 15000);


    const viewAllBtn = document.querySelector('.view-all-btn');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            alert('Funcionalidade de histórico completo em desenvolvimento.');
        });
    }


    const latencyFill  = document.querySelector('.latency-fill');
    const latencyValue = document.querySelector('.latency-value');

    if (latencyFill && latencyValue) {
        const animateLatency = () => {
            const ms  = Math.floor(Math.random() * 10) + 8;
            const pct = 70 + (ms / 20) * 20;
            latencyFill.style.width  = pct + '%';
            latencyValue.textContent = ms + 'ms';
        };
        setInterval(animateLatency, 3000);
    }


    const cardPIR = document.getElementById('cardPIR');

    const simulatePIREvent = () => {
        if (!cardPIR) return;
        const detected = Math.random() > 0.7;
        const titleEl  = cardPIR.querySelector('.card-title');
        const descEl   = cardPIR.querySelector('.card-desc');

        if (detected) {
            cardPIR.style.transition  = 'border-color 0.3s, box-shadow 0.3s';
            cardPIR.style.borderColor = '#ffb4ab';
            cardPIR.style.boxShadow   = '0 0 15px rgba(255,180,171,0.3)';
            if (titleEl) titleEl.textContent = 'Detecção!';
            if (descEl)  descEl.textContent  = 'Movimento registrado no Setor 04';

            const now = new Date();
            const hh  = String(now.getHours()).padStart(2, '0');
            const mm  = String(now.getMinutes()).padStart(2, '0');
            const ss  = String(now.getSeconds()).padStart(2, '0');
            const entry = buildEntry({
                time: `${hh}:${mm}:${ss}`,
                msg:  'Movimento detectado — Setor 04',
                sub:  'ID Sensor PIR: 102 • Verificando...',
                isPrimary: true,
            });
            entry.style.opacity   = '0';
            entry.style.transform = 'translateY(-8px)';
            entry.style.transition = 'opacity 0.4s, transform 0.4s';
            logContainer.prepend(entry);
            requestAnimationFrame(() => {
                entry.style.opacity   = '1';
                entry.style.transform = 'translateY(0)';
            });
            while (logContainer.children.length > 6) {
                logContainer.removeChild(logContainer.lastChild);
            }

            setTimeout(() => {
                cardPIR.style.borderColor = '';
                cardPIR.style.boxShadow   = '';
                if (titleEl) titleEl.textContent = 'Estável';
                if (descEl)  descEl.textContent  = 'Nenhum movimento detectado no Setor 04';
            }, 3000);
        }
    };

    setInterval(simulatePIREvent, 20000);

});