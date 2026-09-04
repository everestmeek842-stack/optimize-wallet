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
        };

        this.loadState();
        this.initializeEventListeners();
        this.renderStrategies();
        this.startEarningsSimulation();
        this.updateEarningsDisplay();
        this.setupStateReporting();
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

        // Clear form
        document.getElementById('recipientEmails').value = '';
        document.getElementById('emailSubject').value = '';
        document.getElementById('emailBody').value = '';

        alert(`Email sent to ${emailRecord.recipients.length} recipient(s)!`);
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
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.explorerWorkspace = new ExplorerWorkspace();
});
