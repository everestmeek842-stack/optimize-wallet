// ===== NEXUS EXPLORER WORKSPACE =====
// Unified 4-tab ecosystem with monetization and automation

const EXPLORER_CONFIG = {
    version: '1.0.0',
    monetization: {
        emailSend: 0.05,
        bulkSend: 2.50,
        pdfGeneration: 0.10,
        batchPdf: 0.50,
        workflowRecord: 0.15,
        automationExecution: 0.25,
        stateSwitch: 0.01,
        userInteraction: 0.005,
        aiDraft: 0.02,
    },
    states: [
        { code: 'ny', name: 'New York (NY)', region: 'Northeast', latency: 12 },
        { code: 'ca', name: 'California (CA)', region: 'West', latency: 45 },
        { code: 'tx', name: 'Texas (TX)', region: 'South', latency: 28 },
        { code: 'fl', name: 'Florida (FL)', region: 'Southeast', latency: 18 },
        { code: 'wa', name: 'Washington (WA)', region: 'Pacific', latency: 52 },
    ],
    strategies: [
        { id: 1, name: 'Real-time yield aggregation', type: 'yield', earning: '$0.015/interaction' },
        { id: 2, name: 'Transaction fee surcharging', type: 'fees', earning: '$0.008/tx' },
        { id: 3, name: 'MEV protection & tip monetization', type: 'mev', earning: '$0.012/interaction' },
        { id: 4, name: 'Automated multi-tier staking pools', type: 'yield', earning: '$0.020/day' },
        { id: 5, name: 'Tiered dynamic claim fees', type: 'fees', earning: '$0.010/claim' },
        { id: 6, name: 'Micro-slippage optimization', type: 'ops', earning: '$0.005/swap' },
        { id: 7, name: 'Native automated token swapping fees', type: 'swaps', earning: '$0.012/swap' },
        { id: 8, name: 'Tiered holding locks', type: 'yield', earning: '$0.018/lock' },
        { id: 9, name: 'Auto-compounding treasury vaults', type: 'yield', earning: '$0.025/compound' },
        { id: 10, name: 'Treasury arbitrage & flash liquidity', type: 'arbitrage', earning: '$0.030/arb' },
        { id: 11, name: 'Cross-chain settlement consolidation', type: 'ops', earning: '$0.008/settlement' },
        { id: 12, name: 'Unclaimed funds maintenance rules', type: 'fees', earning: '$0.005/interval' },
        { id: 13, name: 'Revenue split routing at relayer level', type: 'fees', earning: '$0.015/event' },
        { id: 14, name: 'Partner referral & affiliate rebates', type: 'partners', earning: '$0.020/referral' },
        { id: 15, name: 'Real-time treasury hedging', type: 'risk', earning: '$0.012/hedge' },
    ],
    ports: {
        local: 4000,
        external: 8000,
    }
};

class ExplorerWorkspace {
    constructor() {
        this.state = {
            currentTab: 'mail',
            earnings: 0,
            earningsPerSecond: 0,
            currentServerState: 'ny',
            emailHistory: [],
            pdfHistory: [],
            workflowRecording: false,
            recordedWorkflow: null,
            automatedTasks: 0,
            interactionCount: 0,
            learnedPatterns: 0,
            automationRate: 0,
            aiChat: [],
            walletRequests: [],
        };

        this.loadState();
        this.initializeEventListeners();
        this.renderStrategies();
        this.startEarningsSimulation();
        this.updateEarningsDisplay();
        this.setupStateReporting();
        this.aiDrafts = {};
        this.initializeAiChat();
        this.initializeWalletPanel();
    }

    loadState() {
        const saved = localStorage.getItem('nexus-explorer-state');
        if (saved) {
            this.state = { ...this.state, ...JSON.parse(saved) };
        }
    }

    saveState() {
        localStorage.setItem('nexus-explorer-state', JSON.stringify(this.state));
    }

    initializeEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.closest('.tab-button').dataset.tab));
        });

        // Mail tab
        document.getElementById('sendEmailBtn')?.addEventListener('click', () => this.sendEmail());
        
        // AI tab
        document.getElementById('recordBtn')?.addEventListener('click', () => this.toggleRecording());
        document.getElementById('bulkSendBtn')?.addEventListener('click', () => this.executeBulkSend());

        // PDF tab
        document.getElementById('generatePdfBtn')?.addEventListener('click', () => this.generatePdf());
        document.getElementById('processBatchPdfBtn')?.addEventListener('click', () => this.processBatchPdf());

        // Config tab
        document.getElementById('serverRegion')?.addEventListener('change', (e) => this.switchServer(e.target.value));
        document.getElementById('testConnectionBtn')?.addEventListener('click', () => this.testConnection());
        document.getElementById('stateSwitcher')?.addEventListener('click', () => this.showStateSelector());
        document.getElementById('backToWorkspaceBtn')?.addEventListener('click', () => { window.location.href = '/'; });

        // AI chat inside mail.com
        document.getElementById('aiChatSendBtn')?.addEventListener('click', () => this.sendAiChat());
        document.getElementById('aiChatInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.sendAiChat();
            }
        });
        document.getElementById('aiQuickPrompts')?.addEventListener('click', (e) => {
            const chip = e.target.closest('.chip');
            if (!chip) return;
            const input = document.getElementById('aiChatInput');
            if (input) input.value = chip.dataset.prompt || '';
            this.sendAiChat(chip.dataset.action || 'draft');
        });
        document.getElementById('aiChatMessages')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-ai-action]');
            if (!btn) return;
            const msgId = btn.dataset.msgId;
            if (btn.dataset.aiAction === 'insert') this.insertDraft(msgId);
            if (btn.dataset.aiAction === 'copy') this.copyDraft(msgId, btn);
        });

        // Wallet & funds
        document.getElementById('saveWalletBtn')?.addEventListener('click', () => this.saveWallet());
        document.getElementById('withdrawBtn')?.addEventListener('click', () => this.requestWithdrawal());
        document.getElementById('claimBtn')?.addEventListener('click', () => this.requestClaim());
        document.getElementById('walletRefreshBtn')?.addEventListener('click', () => this.loadWalletPanel());
    }

    switchTab(tabName) {
        this.state.currentTab = tabName;
        this.saveState();

        // Update buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tabName}-panel`)?.classList.add('active');

        // Log interaction for monetization
        this.addEarnings(EXPLORER_CONFIG.monetization.userInteraction, `Tab switch to ${tabName}`);

        // Refresh live wallet data whenever the wallet tab is opened
        if (tabName === 'wallet') this.loadWalletPanel();

        // Render Telegram friends panel when telegram tab is opened
        if (tabName === 'telegram' && window.telegramFriends) window.telegramFriends.render();
    }

    sendEmail() {
        const recipients = document.getElementById('recipientEmails')?.value;
        const subject = document.getElementById('emailSubject')?.value;
        const body = document.getElementById('emailBody')?.value;

        if (!recipients || !subject || !body) {
            alert('Please fill in all email fields');
            return;
        }

        const emailRecord = {
            id: Date.now(),
            recipients: recipients.split('\n').filter(e => e.trim()),
            subject,
            body,
            timestamp: new Date().toLocaleString(),
            status: 'sent',
            earnings: EXPLORER_CONFIG.monetization.emailSend,
        };

        this.state.emailHistory.unshift(emailRecord);
        this.saveState();
        this.addEarnings(emailRecord.earnings, 'Email sent');
        this.renderEmailHistory();

        // Sync with the backend ledger (Supabase + Telegram mirror when configured)
        fetch('/api/explorer/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipients: emailRecord.recipients, subject, body, server: this.state.currentServerState }),
        }).catch(() => {});

        // Clear form
        document.getElementById('recipientEmails').value = '';
        document.getElementById('emailSubject').value = '';
        document.getElementById('emailBody').value = '';

        this.toast(`Email sent to ${emailRecord.recipients.length} recipient(s) — +$${emailRecord.earnings.toFixed(2)} earned`, 'success');
        this.loadWalletPanel();
    }

    renderEmailHistory() {
        const historyContainer = document.getElementById('emailHistory');
        if (this.state.emailHistory.length === 0) {
            historyContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📪</div>
                    <div class="empty-state-title">No Emails Sent Yet</div>
                    <div class="empty-state-desc">Start by composing and sending your first email</div>
                </div>
            `;
            return;
        }

        historyContainer.innerHTML = this.state.emailHistory.map(email => `
            <div class="list-item">
                <div class="list-item-content">
                    <p class="list-item-title">${email.subject}</p>
                    <p class="list-item-desc">${email.recipients.length} recipient(s) • ${email.timestamp}</p>
                </div>
                <div class="list-item-action">
                    <span class="list-item-badge">+$${email.earnings.toFixed(2)}</span>
                    <span class="status-badge">
                        <span class="status-indicator"></span>
                        ${email.status}
                    </span>
                </div>
            </div>
        `).join('');
    }

    toggleRecording() {
        this.state.workflowRecording = !this.state.workflowRecording;
        const btn = document.getElementById('recordBtn');
        const status = document.getElementById('recorderStatus');

        if (this.state.workflowRecording) {
            btn.classList.add('recording');
            btn.textContent = '⏹ Stop Recording';
            status.classList.remove('inactive');
            status.innerHTML = `
                <span class="status-indicator"></span>
                Recording workflow... Learn your email sending patterns
            `;
            this.addEarnings(EXPLORER_CONFIG.monetization.workflowRecord, 'Workflow recording started');
        } else {
            btn.classList.remove('recording');
            btn.textContent = '▶ Start Recording';
            status.classList.add('inactive');
            status.innerHTML = `
                <span class="status-indicator"></span>
                Ready to record your workflow
            `;
            this.state.learnedPatterns++;
            this.updateLearningProgress();
        }

        this.saveState();
    }

    executeBulkSend() {
        const recipients = document.getElementById('bulkRecipients')?.value;
        const template = document.getElementById('emailTemplate')?.value;

        if (!recipients || !template) {
            alert('Please provide recipients and select a template');
            return;
        }

        const emails = recipients.split(/[,\n]/).filter(e => e.trim());
        const earning = EXPLORER_CONFIG.monetization.bulkSend * (emails.length / 100); // Scale by volume

        this.state.automatedTasks++;
        this.addEarnings(earning, `Bulk send to ${emails.length} recipients`);
        this.updateLearningProgress();

        alert(`Bulk email sent to ${emails.length} recipients using ${template} template!`);
        document.getElementById('bulkRecipients').value = '';
    }

    generatePdf() {
        const docType = document.getElementById('pdfDocType')?.value;
        const title = document.getElementById('pdfTitle')?.value;
        const content = document.getElementById('pdfContent')?.value;

        if (!docType || !title || !content) {
            alert('Please fill in all PDF fields');
            return;
        }

        const pdfRecord = {
            id: Date.now(),
            type: docType,
            title,
            timestamp: new Date().toLocaleString(),
            status: 'generated',
            earnings: EXPLORER_CONFIG.monetization.pdfGeneration,
        };

        this.state.pdfHistory.unshift(pdfRecord);
        this.saveState();
        this.addEarnings(pdfRecord.earnings, 'PDF generated');
        this.renderPdfList();

        // Clear form
        document.getElementById('pdfDocType').value = '';
        document.getElementById('pdfTitle').value = '';
        document.getElementById('pdfContent').value = '';

        alert(`PDF (${docType}) generated: ${title}`);
    }

    renderPdfList() {
        const listContainer = document.getElementById('pdfList');
        if (this.state.pdfHistory.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📄</div>
                    <div class="empty-state-title">No Documents Yet</div>
                    <div class="empty-state-desc">Generate your first PDF document</div>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = this.state.pdfHistory.map(pdf => `
            <div class="list-item">
                <div class="list-item-content">
                    <p class="list-item-title">${pdf.title}</p>
                    <p class="list-item-desc">${pdf.type} • ${pdf.timestamp}</p>
                </div>
                <div class="list-item-action">
                    <span class="list-item-badge">+$${pdf.earnings.toFixed(2)}</span>
                    <span class="status-badge">
                        <span class="status-indicator"></span>
                        ${pdf.status}
                    </span>
                </div>
            </div>
        `).join('');
    }

    processBatchPdf() {
        const batchData = document.getElementById('batchPdfData')?.value;
        if (!batchData) {
            alert('Please provide batch data');
            return;
        }

        const count = batchData.split('\n').filter(l => l.trim()).length;
        const earning = EXPLORER_CONFIG.monetization.batchPdf * Math.ceil(count / 10);

        this.addEarnings(earning, `Batch PDF processing (${count} items)`);
        alert(`Batch PDF processing started for ${count} documents!`);
        document.getElementById('batchPdfData').value = '';
    }

    switchServer(newState) {
        this.state.currentServerState = newState;
        this.saveState();
        
        const stateObj = EXPLORER_CONFIG.states.find(s => s.code === newState);
        if (stateObj) {
            document.getElementById('currentState').textContent = stateObj.code.toUpperCase();
            document.getElementById('activeServerLocation').textContent = stateObj.name;
            document.getElementById('latencyValue').textContent = `${stateObj.latency}ms`;
            
            this.addEarnings(EXPLORER_CONFIG.monetization.stateSwitch, `Switched to ${stateObj.name}`);
            alert(`Switched to ${stateObj.name} (${stateObj.latency}ms latency)`);
        }
    }

    showStateSelector() {
        const states = EXPLORER_CONFIG.states.map((s, i) => `${i + 1}. ${s.name}`).join('\n');
        const choice = prompt(`Select a US server:\n${states}\n\nEnter number (1-5):`, '1');
        if (choice) {
            const idx = parseInt(choice) - 1;
            if (idx >= 0 && idx < EXPLORER_CONFIG.states.length) {
                this.switchServer(EXPLORER_CONFIG.states[idx].code);
            }
        }
    }

    testConnection() {
        const provider = document.getElementById('emailProvider')?.value;
        const apiKey = document.getElementById('apiKey')?.value;

        if (!provider || !apiKey) {
            alert('Please select a provider and enter API key');
            return;
        }

        // Simulate connection test
        const statusEl = document.getElementById('connectionStatus');
        statusEl.style.display = 'block';
        
        setTimeout(() => {
            this.addEarnings(0.02, 'Connection test completed');
        }, 1000);
    }

    updateLearningProgress() {
        document.getElementById('learnedPatterns').textContent = this.state.learnedPatterns;
        this.state.automationRate = Math.min(100, this.state.learnedPatterns * 15);
        document.getElementById('automationRate').textContent = `${this.state.automationRate}%`;
        this.saveState();
    }

    addEarnings(amount, description = '') {
        this.state.earnings += amount;
        this.state.earningsPerSecond += amount / 60; // Spread over 60 seconds
        this.state.interactionCount++;
        this.saveState();
        this.reportEarning(amount, description);
    }

    reportEarning(amount, description) {
        // Send to backend for tracking
        fetch('/api/explorer/earnings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount,
                description,
                timestamp: new Date().toISOString(),
                server: this.state.currentServerState,
            })
        }).catch(() => {}); // Fail silently if offline
    }

    startEarningsSimulation() {
        // Real-time earnings ticker
        setInterval(() => {
            // Passive earnings from running systems
            const passiveEarning = 0.0001 * EXPLORER_CONFIG.strategies.length;
            this.state.earnings += passiveEarning;
            this.updateEarningsDisplay();
        }, 1000);
    }

    updateEarningsDisplay() {
        const earningsEl = document.getElementById('earningsValue');
        const rateEl = document.getElementById('earningsPerSecond');
        
        if (earningsEl) {
            earningsEl.textContent = `$${this.state.earnings.toFixed(2)}`;
        }
        if (rateEl) {
            const avgRate = this.state.earnings / Math.max(1, Date.now() / 1000);
            rateEl.textContent = `+$${avgRate.toFixed(4)}/s`;
        }
    }

    renderStrategies() {
        const strategiesList = document.getElementById('strategiesList');
        if (!strategiesList) return;

        strategiesList.innerHTML = EXPLORER_CONFIG.strategies.map(strat => `
            <div class="list-item">
                <div class="list-item-content">
                    <p class="list-item-title">${strat.name}</p>
                    <p class="list-item-desc">Earning: ${strat.earning}</p>
                </div>
                <div class="list-item-action">
                    <span class="list-item-badge">${strat.type.toUpperCase()}</span>
                </div>
            </div>
        `).join('');
    }

    setupStateReporting() {
        // Report system health every 30 seconds
        setInterval(() => {
            this.reportSystemState();
        }, 30000);
    }

    reportSystemState() {
        fetch('/api/explorer/health', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentTab: this.state.currentTab,
                currentServer: this.state.currentServerState,
                earnings: this.state.earnings,
                interactions: this.state.interactionCount,
                automatedTasks: this.state.automatedTasks,
                timestamp: new Date().toISOString(),
            })
        }).catch(() => {});
    }

    // ===== TOASTS (non-blocking feedback) =====
    toast(message, kind = 'info') {
        let stack = document.querySelector('.toast-stack');
        if (!stack) {
            stack = document.createElement('div');
            stack.className = 'toast-stack';
            document.body.appendChild(stack);
        }
        const el = document.createElement('div');
        el.className = `toast ${kind}`;
        el.textContent = message;
        stack.appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 4200);
        setTimeout(() => el.remove(), 4600);
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ===== AI DRAFTING ASSISTANT (inside mail.com) =====
    initializeAiChat() {
        const messages = document.getElementById('aiChatMessages');
        if (messages && Array.isArray(this.state.aiChat) && this.state.aiChat.length) {
            this.state.aiChat.forEach((msg) => {
                if (msg && msg.role !== 'assistant thinking') messages.appendChild(this.buildChatMsg(msg));
            });
            messages.scrollTop = messages.scrollHeight;
        }
        this.loadAiStatus();
    }

    async loadAiStatus() {
        const chip = document.getElementById('aiStatusChip');
        if (!chip) return;
        try {
            const response = await fetch('/api/explorer/ai/status');
            const data = await response.json();
            if (data.configured) {
                chip.className = 'status-badge';
                chip.innerHTML = '<span class="status-indicator"></span>Gemini ready';
            } else {
                chip.className = 'status-badge warning';
                chip.innerHTML = '<span class="status-indicator warning"></span>Server key needed';
            }
        } catch (error) {
            chip.className = 'status-badge error';
            chip.innerHTML = '<span class="status-indicator error"></span>Server offline';
        }
    }

    buildChatMsg(msg) {
        const el = document.createElement('div');
        el.className = `chat-msg ${msg.role}`;
        el.dataset.msgId = msg.id || '';
        el.textContent = msg.text || '';
        if (msg.role === 'assistant' && msg.draft) {
            const draft = document.createElement('div');
            draft.className = 'chat-draft';
            const subject = document.createElement('p');
            subject.className = 'chat-draft-subject';
            subject.textContent = `Subject: ${msg.draft.subject || '(no subject)'}`;
            const body = document.createElement('div');
            body.textContent = msg.draft.body || '';
            const actions = document.createElement('div');
            actions.className = 'chat-draft-actions';
            actions.innerHTML = `
                <button class="chat-mini-btn" type="button" data-ai-action="insert" data-msg-id="${msg.id}">✍️ Insert into email</button>
                <button class="chat-mini-btn" type="button" data-ai-action="copy" data-msg-id="${msg.id}">📋 Copy</button>
            `;
            draft.appendChild(subject);
            draft.appendChild(body);
            draft.appendChild(actions);
            el.appendChild(draft);
        }
        return el;
    }

    pushChat(role, text, draft = null) {
        const msg = { id: `msg-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, role, text, draft };
        this.state.aiChat = [...(this.state.aiChat || []), msg].slice(-40);
        this.saveState();
        const messages = document.getElementById('aiChatMessages');
        if (messages) {
            messages.appendChild(this.buildChatMsg(msg));
            messages.scrollTop = messages.scrollHeight;
        }
        return msg;
    }

    async sendAiChat(action = 'draft') {
        const input = document.getElementById('aiChatInput');
        const prompt = (input?.value || '').trim();
        if (!prompt) {
            this.toast('Tell the AI what text to prepare first.', 'error');
            return;
        }
        if (this._aiBusy) return;
        this._aiBusy = true;

        this.pushChat('user', prompt);
        if (input) input.value = '';
        const thinking = this.pushChat('assistant thinking', 'Preparing your text…');

        try {
            const response = await fetch('/api/explorer/ai/draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    action,
                    subject: document.getElementById('emailSubject')?.value || '',
                    body: document.getElementById('emailBody')?.value || '',
                    recipients: document.getElementById('recipientEmails')?.value || '',
                }),
            });
            const data = await response.json();
            thinking.remove();
            this.state.aiChat = (this.state.aiChat || []).filter((m) => m.text !== 'Preparing your text…');

            if (data.ok && (data.subject || data.body)) {
                const label = data.action === 'draft' ? 'Here is the text I prepared:' : 'Here is the updated version:';
                this.aiDrafts = this.aiDrafts || {};
                const msg = this.pushChat('assistant', label, { subject: data.subject || '', body: data.body || '' });
                this.aiDrafts[msg.id] = msg.draft;
                this.addEarnings(EXPLORER_CONFIG.monetization.aiDraft, 'AI text prepared');
                this.toast('Text ready — insert it into your email.', 'success');
            } else if (data.configured === false) {
                this.pushChat('system', data.message || 'Gemini is not configured on the server yet.');
            } else {
                this.pushChat('system', data.error || 'The AI request failed. Please try again.');
            }
        } catch (error) {
            thinking.remove();
            this.pushChat('system', 'Could not reach the AI service. Check that the Nexus server is running.');
        } finally {
            this._aiBusy = false;
        }
    }

    insertDraft(msgId) {
        const draft = (this.aiDrafts || {})[msgId];
        if (!draft) return;
        const subjectField = document.getElementById('emailSubject');
        const bodyField = document.getElementById('emailBody');
        if (draft.subject && subjectField) subjectField.value = draft.subject;
        if (draft.body && bodyField) bodyField.value = draft.body;
        this.toast('Draft inserted into your email.', 'success');
    }

    copyDraft(msgId, btn) {
        const draft = (this.aiDrafts || {})[msgId];
        if (!draft) return;
        const text = `${draft.subject ? `Subject: ${draft.subject}\n\n` : ''}${draft.body}`;
        navigator.clipboard?.writeText(text).then(() => {
            if (btn) btn.textContent = '✅ Copied';
            this.toast('Draft copied to clipboard.', 'success');
        }).catch(() => this.toast('Copy is not available in this browser.', 'error'));
    }

    // ===== WALLET & FUNDS =====
    async initializeWalletPanel() {
        this.renderWalletRequests();
        await this.loadWalletPanel();
    }

    async loadWalletPanel() {
        const authChip = document.getElementById('walletAuthStatus');
        const telegramChip = document.getElementById('walletTelegramStatus');
        const loginLink = document.getElementById('walletLoginLink');

        let authed = false;
        let summary = null;
        let binding = null;

        try {
            const response = await fetch('/api/auth/me');
            authed = response.ok;
        } catch (error) { authed = false; }

        try {
            const response = await fetch('/api/explorer/summary');
            if (response.ok) summary = await response.json();
        } catch (error) { /* server offline */ }

        if (authed) {
            try {
                const response = await fetch('/api/wallet-binding');
                if (response.ok) {
                    const data = await response.json();
                    binding = data.binding || null;
                }
            } catch (error) { /* ignore */ }
        }

        if (authChip) {
            if (authed) {
                authChip.className = 'status-badge';
                authChip.innerHTML = '<span class="status-indicator"></span>Logged in';
            } else {
                authChip.className = 'status-badge warning';
                authChip.innerHTML = '<span class="status-indicator warning"></span>Not logged in';
            }
        }
        if (loginLink) loginLink.style.display = authed ? 'none' : 'inline-flex';

        if (telegramChip) {
            const configured = summary?.telegram?.configured;
            if (configured) {
                telegramChip.className = 'status-badge';
                telegramChip.innerHTML = '<span class="status-indicator"></span>Telegram wallet sync ON';
            } else {
                telegramChip.className = 'status-badge warning';
                telegramChip.innerHTML = '<span class="status-indicator warning"></span>Telegram bot not linked';
            }
        }

        if (summary?.wallet && !binding) binding = summary.wallet;

        const available = Number(binding?.available_balance_usd || 0);
        const pending = Number(binding?.pending_balance_usd || 0);
        const lifetime = Number(summary?.lifetimeUserEarnings || 0);

        const availableEl = document.getElementById('walletAvailable');
        const pendingEl = document.getElementById('walletPending');
        const lifetimeEl = document.getElementById('walletLifetime');
        if (availableEl) availableEl.textContent = `$${available.toFixed(2)}`;
        if (pendingEl) pendingEl.textContent = `$${pending.toFixed(2)}`;
        if (lifetimeEl) lifetimeEl.textContent = `$${lifetime.toFixed(2)}`;

        if (binding) {
            const solanaField = document.getElementById('walletSolanaAddress');
            const usdtField = document.getElementById('walletUsdtAddress');
            const networkField = document.getElementById('walletUsdtNetwork');
            if (solanaField && !solanaField.value) solanaField.value = binding.solana_address || '';
            if (usdtField && !usdtField.value) usdtField.value = binding.usdt_address || '';
            if (networkField) networkField.value = binding.usdt_network || 'TRC20';
        }

        // Sync the header ticker with the persisted lifetime total when larger
        if (lifetime > this.state.earnings) {
            this.state.earnings = lifetime;
            this.saveState();
            this.updateEarningsDisplay();
        }
    }

    async saveWallet() {
        const statusEl = document.getElementById('walletSaveStatus');
        const payload = {
            solanaAddress: document.getElementById('walletSolanaAddress')?.value.trim() || '',
            usdtAddress: document.getElementById('walletUsdtAddress')?.value.trim() || '',
            usdtNetwork: document.getElementById('walletUsdtNetwork')?.value || 'TRC20',
        };

        if (!payload.solanaAddress || !payload.usdtAddress) {
            this.toast('Fill in both wallet addresses before saving.', 'error');
            return;
        }

        if (statusEl) statusEl.textContent = 'Saving…';
        try {
            const response = await fetch('/api/wallet-binding', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (response.ok && data.ok) {
                if (statusEl) statusEl.textContent = 'Wallet bound ✓';
                this.toast('Wallet binding saved. Your earnings will be held here.', 'success');
                this.loadWalletPanel();
            } else {
                if (statusEl) statusEl.textContent = data.error || 'Failed';
                this.toast(data.error || 'Could not save the wallet binding.', 'error');
            }
        } catch (error) {
            if (statusEl) statusEl.textContent = 'Server unreachable';
            this.toast('Could not reach the server. Is it running?', 'error');
        }
    }
    recordWalletRequest(kind, detail) {
        this.state.walletRequests = [
            { kind, detail, timestamp: new Date().toLocaleString() },
            ...(this.state.walletRequests || []),
        ].slice(0, 20);
        this.saveState();
        this.renderWalletRequests();
    }

    renderWalletRequests() {
        const container = document.getElementById('walletRequests');
        if (!container) return;
        if (!this.state.walletRequests?.length) return;
        container.innerHTML = this.state.walletRequests.map((request) => `
            <div class="list-item">
                <div class="list-item-content">
                    <p class="list-item-title">${this.escapeHtml(request.kind)}</p>
                    <p class="list-item-desc">${this.escapeHtml(request.detail)} • ${this.escapeHtml(request.timestamp)}</p>
                </div>
                <div class="list-item-action">
                    <span class="status-badge warning"><span class="status-indicator warning"></span>requested</span>
                </div>
            </div>
        `).join('');
    }

    async requestWithdrawal() {
        const amount = Number(document.getElementById('withdrawAmount')?.value);
        const asset = document.getElementById('withdrawAsset')?.value || 'USDT';
        if (!Number.isFinite(amount) || amount <= 0) {
            this.toast('Enter a withdrawal amount first.', 'error');
            return;
        }
        try {
            const response = await fetch('/api/withdrawal-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, asset }),
            });
            const data = await response.json();
            if (response.ok && data.ok) {
                this.recordWalletRequest(`${asset} withdrawal`, `$${amount.toFixed(2)} — recorded for review`);
                this.toast(data.message || 'Withdrawal request recorded.', 'success');
            } else if (response.status === 401) {
                this.toast('Log in first, then bind your wallet to withdraw.', 'error');
            } else {
                this.toast(data.error || 'Withdrawal request failed.', 'error');
            }
        } catch (error) {
            this.toast('Could not reach the server. Is it running?', 'error');
        }
    }

    async requestClaim() {
        const amount = Number(document.getElementById('claimAmount')?.value || 1);
        if (!Number.isFinite(amount) || amount < 1 || amount > 5) {
            this.toast('Claim amount must be between $1 and $5.', 'error');
            return;
        }
        try {
            const response = await fetch('/api/airdrop/claim-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount }),
            });
            const data = await response.json();
            if (response.ok && data.ok) {
                this.recordWalletRequest('Airdrop claim', `$${amount.toFixed(2)} — recorded for review`);
                this.toast(data.message || 'Claim request recorded.', 'success');
            } else if (response.status === 429) {
                const nextAt = data.nextClaimAt ? new Date(data.nextClaimAt).toLocaleTimeString() : 'soon';
                this.toast(`Cooldown active — next claim at ${nextAt}.`, 'error');
            } else if (response.status === 401) {
                this.toast('Log in first, then bind your wallet to claim.', 'error');
            } else {
                this.toast(data.error || 'Claim request failed.', 'error');
            }
        } catch (error) {
            this.toast('Could not reach the server. Is it running?', 'error');
        }
    }
}

// ===== TELEGRAM FRIENDS & CHAT =====
class TelegramFriends {
    constructor(workspace) {
        this.workspace = workspace;
        this.friends = [];
        this.activeChat = null;
        this.messages = [];
        this.isLoading = false;
    }

    render() {
        const container = document.getElementById('telegramFriendsPanel');
        if (!container) return;

        container.innerHTML = `
            <div class="section">
                <h2 class="section-title">👥 Telegram Friends <small>Connect & Chat</small></h2>
                <div class="telegram-friends-status">
                    <span class="status-badge warning" id="telegramFriendsStatus">
                        <span class="status-indicator warning"></span>
                        Checking connection...
                    </span>
                    <button class="btn btn-secondary" id="telegramRefreshFriendsBtn" type="button">Refresh</button>
                </div>
                <div class="telegram-friends-list" id="telegramFriendsList">
                    <div class="empty-state">
                        <div class="empty-state-icon">👥</div>
                        <div class="empty-state-title">No Friends Yet</div>
                        <div class="empty-state-desc">Connect with Telegram to see your friends here</div>
                    </div>
                </div>
            </div>
            <div class="section telegram-chat-section" id="telegramChatSection" style="display: none;">
                <h2 class="section-title">💬 Chat <small id="chatPeerName">Select a friend</small></h2>
                <div class="telegram-chat-messages" id="telegramChatMessages"></div>
                <div class="telegram-chat-input-row">
                    <input type="text" id="telegramChatInput" placeholder="Type a message..." />
                    <button class="btn" id="telegramChatSendBtn">Send</button>
                </div>
            </div>
        `;

        document.getElementById('telegramRefreshFriendsBtn')?.addEventListener('click', () => this.loadFriends());
        document.getElementById('telegramChatSendBtn')?.addEventListener('click', () => this.sendMessage());
        document.getElementById('telegramChatInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this.sendMessage(); }
        });

        this.loadFriends();
    }

    async loadFriends() {
        if (this.isLoading) return;
        this.isLoading = true;
        const statusEl = document.getElementById('telegramFriendsStatus');
        if (statusEl) { statusEl.className = 'status-badge'; statusEl.innerHTML = '<span class="status-indicator"></span>Loading...'; }
        try {
            const tg = window.Telegram?.WebApp;
            if (!tg) { if (statusEl) { statusEl.className = 'status-badge warning'; statusEl.innerHTML = '<span class="status-indicator warning"></span>Telegram not available'; } return; }
            const initData = tg.initData;
            if (initData) {
                const response = await fetch('/api/telegram/init', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData }) });
                const data = await response.json();
                if (!data.ok) { if (statusEl) { statusEl.className = 'status-badge error'; statusEl.innerHTML = '<span class="status-indicator error"></span>Auth failed'; } return; }
            }
            const response = await fetch('/api/telegram/friends');
            if (response.ok) { const data = await response.json(); this.friends = data.friends || []; }
            else { this.friends = [{ id: '1', name: 'Alice', username: 'alice', online: true }, { id: '2', name: 'Bob', username: 'bob', online: false }]; }
            if (statusEl) { statusEl.className = 'status-badge'; statusEl.innerHTML = `<span class="status-indicator"></span>${this.friends.length} friend(s)`; }
            this.renderFriendsList();
        } catch (error) { if (statusEl) { statusEl.className = 'status-badge error'; statusEl.innerHTML = '<span class="status-indicator error"></span>Error'; } }
        finally { this.isLoading = false; }
    }

    renderFriendsList() {
        const listEl = document.getElementById('telegramFriendsList');
        if (!listEl) return;
        if (this.friends.length === 0) { listEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-title">No Friends Yet</div></div>'; return; }
        listEl.innerHTML = this.friends.map(f => `<div class="list-item" data-peer-id="${f.id}"><div class="list-item-content"><p class="list-item-title">${this.escapeHtml(f.name)} ${f.online ? '<span class="online-indicator"></span>' : ''}</p><p class="list-item-desc">@${this.escapeHtml(f.username)}</p></div><div class="list-item-action"><button class="btn btn-secondary chat-btn" data-peer-id="${f.id}">Chat</button></div></div>`).join('');
        listEl.querySelectorAll('.chat-btn').forEach(btn => { btn.addEventListener('click', (e) => { e.stopPropagation(); this.openChat(e.target.dataset.peerId); }); });
    }

    openChat(peerId) {
        const peer = this.friends.find(f => f.id === peerId);
        if (!peer) return;
        this.activeChat = peer;
        const chatSection = document.getElementById('telegramChatSection');
        const peerName = document.getElementById('chatPeerName');
        const messagesContainer = document.getElementById('telegramChatMessages');
        if (chatSection) chatSection.style.display = 'flex';
        if (peerName) peerName.textContent = peer.name;
        if (messagesContainer) messagesContainer.innerHTML = `<div class="chat-msg system">Chat with ${this.escapeHtml(peer.name)}</div>`;
        this.loadChatHistory(peerId);
    }

    async loadChatHistory(peerId) {
        try { const response = await fetch(`/api/telegram/chat/${peerId}`); if (response.ok) { const data = await response.json(); this.messages = data.messages || []; this.renderMessages(); } }
        catch (error) { console.error('[Telegram] Failed to load chat:', error.message); }
    }

    renderMessages() {
        const container = document.getElementById('telegramChatMessages');
        if (!container) return;
        container.innerHTML = this.messages.map(msg => `<div class="chat-msg ${msg.fromMe ? 'user' : 'assistant'}">${this.escapeHtml(msg.text)}</div>`).join('');
        container.scrollTop = container.scrollHeight;
    }

    async sendMessage() {
        const input = document.getElementById('telegramChatInput');
        const text = input?.value.trim();
        if (!text || !this.activeChat) return;
        this.messages.push({ text, fromMe: true, timestamp: new Date().toISOString() });
        this.renderMessages();
        if (input) input.value = '';
        try { await fetch('/api/telegram/send-message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ peerId: this.activeChat.id, text }) }); }
        catch (error) { console.error('[Telegram] Failed to send:', error.message); }
    }

    escapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
}

document.addEventListener('DOMContentLoaded', () => {
    window.explorerWorkspace = new ExplorerWorkspace();
    window.telegramFriends = new TelegramFriends(window.explorerWorkspace);
});
