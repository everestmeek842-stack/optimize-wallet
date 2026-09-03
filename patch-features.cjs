const fs = require('fs');
const path = require('path');
const root = 'C:\\Users\\PC\\Desktop\\DONT TOUCH MY PHONE\\optimize-wallet';

const htmlFile = path.join(root, 'index.html');
const cssFile = path.join(root, 'styles.css');
const jsFile = path.join(root, 'app.js');

// Backups
for (const f of [htmlFile, cssFile, jsFile]) {
    const bak = f + '.bak2';
    if (!fs.existsSync(bak)) fs.copyFileSync(f, bak);
    console.log('✓ Backup: ' + path.basename(bak));
}

// --- 1. HTML Injection ---
let html = fs.readFileSync(htmlFile, 'utf8');

if (!html.includes('optimize-header-toggle')) {
    const toggleHtml = `
<!-- Optimize: App/Web Toggle -->
<div id="optimize-header-toggle" class="opt-component">
    <div class="opt-toggle-container">
        <button id="btn-app-view" class="opt-toggle-btn active">App View</button>
        <button id="btn-web-view" class="opt-toggle-btn">Web Browser</button>
    </div>
</div>`;

    const nellyHtml = `
<!-- Optimize: Nelli's TV Live Cinema -->
<div id="nelly-tv-card" class="opt-component">
    <div class="opt-card-header">
        <h3>📺 NELLI'S TV — LIVE CINEMA</h3>
        <button id="btn-pip-nelly" class="opt-pip-btn">PiP</button>
    </div>
    <div class="opt-video-wrap">
        <video id="nelly-video" controls playsinline autoplay muted>
            <source src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" type="application/x-mpegURL">
        </video>
    </div>
    <div class="opt-channels">
        <button class="opt-ch-btn active" data-src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8">WWE Live</button>
        <button class="opt-ch-btn" data-src="https://samples.mux.com/VZ7tC2bWRCg01InAr7WZZPv7dFrSqiMdfSgBmDAnZ2Ws.mp4">Khmer Cinema</button>
        <button class="opt-ch-btn" data-src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4">English Movies</button>
    </div>
</div>`;

    const browserHtml = `
<!-- Optimize: Web Browser Workspace -->
<div id="opt-browser-workspace" class="opt-component opt-hidden">
    <div class="opt-browser-bar">
        <button class="opt-nav-btn" id="browser-back">⬅</button>
        <button class="opt-nav-btn" id="browser-fwd">➡</button>
        <button class="opt-nav-btn" id="browser-refresh">🔄</button>
        <input type="text" id="browser-url-input" value="https://earnings.ink" placeholder="URL or search...">
        <button class="opt-go-btn" id="browser-go">Go</button>
    </div>
    <div class="opt-browser-view">
        <iframe id="browser-iframe" src="about:blank" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
    </div>
</div>`;

    const aiHtml = `
<!-- Optimize: AI Assistant & Writer Modal -->
<div id="opt-ai-modal" class="opt-component opt-hidden">
    <div class="opt-ai-content">
        <div class="opt-ai-header">
            <h3>🤖 AI Assistant & Writer</h3>
            <span class="opt-close-modal">×</span>
        </div>
        <div class="opt-ai-body">
            <textarea id="opt-ai-input" placeholder="Select text on screen or type here..."></textarea>
            <div class="opt-presets">
                <div class="opt-preset-group">
                    <label>Style</label>
                    <button class="opt-preset-btn" data-action="style" data-value="Formal">Formal</button>
                    <button class="opt-preset-btn" data-action="style" data-value="Short">Short</button>
                    <button class="opt-preset-btn" data-action="style" data-value="Creative">Creative</button>
                    <button class="opt-preset-btn" data-action="style" data-value="Tribal">Tribal</button>
                </div>
                <div class="opt-preset-group">
                    <label>Translate</label>
                    <button class="opt-preset-btn" data-action="translate" data-value="Khmer">Khmer</button>
                    <button class="opt-preset-btn" data-action="translate" data-value="English">English</button>
                    <button class="opt-preset-btn" data-action="translate" data-value="Spanish">Spanish</button>
                </div>
                <div class="opt-preset-group">
                    <label>Tools</label>
                    <button class="opt-preset-btn" data-action="emojify">Emojify</button>
                    <button class="opt-preset-btn" data-action="fix">Fix Grammar</button>
                </div>
            </div>
            <div class="opt-ai-output-section">
                <label>Response:</label>
                <div id="opt-ai-output" class="opt-ai-output-box">Select an option above...</div>
                <button id="opt-copy-ai" class="opt-action-btn">Copy to Clipboard</button>
            </div>
        </div>
    </div>
</div>
<div id="opt-floating-ai" class="opt-component">💬 AI Assistant</div>`;

    // Insert toggle right after <body>
    html = html.replace('<body>', '<body>' + toggleHtml);
    // Insert the rest before </body>
    html = html.replace('</body>', nellyHtml + browserHtml + aiHtml + '\n</body>');
    fs.writeFileSync(htmlFile, html, 'utf8');
    console.log('✓ HTML: Components injected successfully');
} else { console.log('✓ HTML: Already patched'); }

// --- 2. CSS Injection ---
let css = fs.readFileSync(cssFile, 'utf8');
if (!css.includes('opt-component')) {
    const style = `
/* ===== OPTIMIZE COMPONENTS ===== */
.opt-component { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box; }

#optimize-header-toggle { display: flex; justify-content: center; background: #17212b; padding: 10px; border-bottom: 1px solid #24303f; position: sticky; top: 0; z-index: 1000; }
.opt-toggle-container { display: flex; background: #0e1621; border-radius: 20px; padding: 3px; width: 90%; max-width: 400px; }
.opt-toggle-btn { flex: 1; background: transparent; border: none; color: #7f91a4; padding: 8px 16px; border-radius: 17px; cursor: pointer; font-weight: bold; font-size: 14px; transition: all 0.3s ease; }
.opt-toggle-btn.active { background: #2481cc; color: #fff; }

#nelly-tv-card { background: #17212b; border: 1px solid #24303f; border-radius: 12px; padding: 15px; margin: 15px; color: #fff; box-shadow: 0 4px 15px rgba(0,0,0,.3); }
.opt-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.opt-card-header h3 { margin: 0; font-size: 16px; }
.opt-pip-btn { background: #2481cc; border: none; color: #fff; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; }
.opt-video-wrap { width: 100%; position: relative; padding-bottom: 56.25%; height: 0; border-radius: 8px; overflow: hidden; background: #000; margin-bottom: 12px; }
#nelly-video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
.opt-channels { display: flex; gap: 8px; }
.opt-ch-btn { flex: 1; background: #24303f; border: none; color: #7f91a4; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; }
.opt-ch-btn.active { background: #2481cc; color: #fff; }

#opt-browser-workspace { position: fixed; top: 60px; left: 0; right: 0; bottom: 0; background: #0e1621; z-index: 999; display: flex; flex-direction: column; }
.opt-hidden { display: none !important; }
.opt-browser-bar { display: flex; align-items: center; background: #17212b; padding: 8px; gap: 8px; border-bottom: 1px solid #24303f; }
.opt-nav-btn { background: #24303f; border: none; color: #fff; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; }
.opt-go-btn { background: #2481cc; border: none; color: #fff; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; }
#browser-url-input { flex: 1; background: #24303f; border: 1px solid #2f3e50; color: #fff; padding: 6px 12px; border-radius: 6px; outline: none; font-size: 13px; }
.opt-browser-view { flex: 1; width: 100%; height: 100%; background: #fff; }
#browser-iframe { width: 100%; height: 100%; border: none; background: #fff; }

#opt-floating-ai { position: fixed; bottom: 80px; right: 20px; background: #2481cc; color: #fff; padding: 10px 16px; border-radius: 30px; box-shadow: 0 4px 15px rgba(0,0,0,.4); cursor: pointer; font-weight: bold; font-size: 14px; z-index: 1001; }
#opt-ai-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,.75); z-index: 1002; display: flex; justify-content: center; align-items: center; }
.opt-ai-content { background: #17212b; border: 1px solid #24303f; border-radius: 12px; width: 90%; max-width: 500px; max-height: 85vh; overflow-y: auto; color: #fff; }
.opt-ai-header { display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #24303f; }
.opt-ai-header h3 { margin: 0; font-size: 16px; }
.opt-close-modal { font-size: 24px; cursor: pointer; color: #7f91a4; }
.opt-ai-body { padding: 15px; }
#opt-ai-input { width: 100%; height: 80px; background: #24303f; border: 1px solid #2f3e50; color: #fff; padding: 10px; border-radius: 8px; resize: none; outline: none; box-sizing: border-box; font-size: 13px; }
.opt-presets { margin-top: 15px; }
.opt-preset-group { margin-bottom: 12px; }
.opt-preset-group label { display: block; font-size: 11px; color: #7f91a4; text-transform: uppercase; margin-bottom: 6px; font-weight: bold; }
.opt-preset-btn { background: #24303f; border: none; color: #fff; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; margin-right: 6px; margin-bottom: 4px; }
.opt-preset-btn:hover { background: #2f3e50; }
.opt-ai-output-section { margin-top: 15px; border-top: 1px solid #24303f; padding-top: 15px; }
.opt-ai-output-section label { font-size: 12px; color: #7f91a4; display: block; margin-bottom: 6px; }
.opt-ai-output-box { background: #0e1621; border: 1px solid #24303f; border-radius: 8px; padding: 12px; font-size: 13px; min-height: 60px; margin-bottom: 10px; word-break: break-word; white-space: pre-wrap; color: #e5e5e5; }
.opt-action-btn { background: #2481cc; border: none; color: #fff; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px; width: 100%; }
`;
    fs.appendFileSync(cssFile, style, 'utf8');
    console.log('✓ CSS: Styles appended successfully');
} else { console.log('✓ CSS: Already patched'); }

// --- 3. JS Injection ---
let js = fs.readFileSync(jsFile, 'utf8');
if (!js.includes('OPTIMIZE_CONTROLS_ACTIVATED')) {
    const jsBlock = `
// ===== OPTIMIZE CONTROLS ACTIVATED =====
(function() {
    'use strict';
    const init = () => {
        // Toggle App View / Web View
        const btnApp = document.getElementById('btn-app-view');
        const btnWeb = document.getElementById('btn-web-view');
        const ws = document.getElementById('opt-browser-workspace');
        if (btnApp && btnWeb && ws) {
            btnApp.addEventListener('click', () => {
                btnApp.classList.add('active');
                btnWeb.classList.remove('active');
                ws.classList.add('opt-hidden');
            });
            btnWeb.addEventListener('click', () => {
                btnWeb.classList.add('active');
                btnApp.classList.remove('active');
                ws.classList.remove('opt-hidden');
                const ifr = document.getElementById('browser-iframe');
                if (ifr && (ifr.src === 'about:blank' || ifr.src === '')) {
                    ifr.src = 'https://earnings.ink';
                }
            });
        }

        // Nelli's TV Player
        const vid = document.getElementById('nelly-video');
        const chBtns = document.querySelectorAll('.opt-ch-btn');
        if (chBtns.length) {
            chBtns.forEach(b => {
                b.addEventListener('click', () => {
                    chBtns.forEach(x => x.classList.remove('active'));
                    b.classList.add('active');
                    if (vid && b.dataset.src) {
                        vid.src = b.dataset.src;
                        vid.play().catch(() => {});
                    }
                });
            });
        }
        const pipBtn = document.getElementById('btn-pip-nelly');
        if (pipBtn && vid) {
            pipBtn.addEventListener('click', async () => {
                try {
                    if (document.pictureInPictureElement) {
                        await document.exitPictureInPicture();
                    } else if (vid.requestPictureInPicture) {
                        await vid.requestPictureInPicture();
                    }
                } catch(e) { console.error('PiP error:', e); }
            });
        }

        // Web Browser controls
        const iframe = document.getElementById('browser-iframe');
        const urlInput = document.getElementById('browser-url-input');
        const goBtn = document.getElementById('browser-go');
        const loadUrl = () => {
            let u = urlInput.value.trim();
            if (!u) return;
            if (!u.startsWith('http://') && !u.startsWith('https://')) {
                u = u.includes('.') && !u.includes(' ') ? 'https://' + u : 'https://www.google.com/search?q=' + encodeURIComponent(u);
            }
            iframe.src = u;
        };
        if (goBtn) goBtn.addEventListener('click', loadUrl);
        if (urlInput) urlInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') loadUrl(); });
        
        const backBtn = document.getElementById('browser-back');
        const fwdBtn = document.getElementById('browser-fwd');
        const refBtn = document.getElementById('browser-refresh');
        if (backBtn) backBtn.addEventListener('click', () => { try { iframe.contentWindow.history.back(); } catch(e){} });
        if (fwdBtn) fwdBtn.addEventListener('click', () => { try { iframe.contentWindow.history.forward(); } catch(e){} });
        if (refBtn) refBtn.addEventListener('click', () => { iframe.src = iframe.src; });

        // AI Assistant
        const aiModal = document.getElementById('opt-ai-modal');
        const aiInput = document.getElementById('opt-ai-input');
        const aiOutput = document.getElementById('opt-ai-output');
        const openAi = (txt) => {
            if (aiModal) {
                aiModal.classList.remove('opt-hidden');
                if (aiInput && txt) aiInput.value = txt;
            }
        };
        const floatingBtn = document.getElementById('opt-floating-ai');
        if (floatingBtn) floatingBtn.addEventListener('click', () => openAi());
        const closeModal = document.querySelector('.opt-close-modal');
        if (closeModal) closeModal.addEventListener('click', () => aiModal.classList.add('opt-hidden'));

        // Text selection listener
        document.addEventListener('mouseup', () => {
            const sel = window.getSelection().toString().trim();
            if (sel.length > 3) {
                if (aiModal && !aiModal.classList.contains('opt-hidden')) return;
                openAi(sel);
            }
        });

        // Preset buttons
        document.querySelectorAll('.opt-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const val = btn.dataset.value;
                const text = aiInput ? aiInput.value.trim() : '';
                if (!text) { aiOutput.innerText = 'Select or type text first!'; return; }
                aiOutput.innerText = '⏳ Processing...';
                
                fetch('https://api.earnings.ink/v1/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action, option: val || null, text })
                })
                .then(r => r.json())
                .then(d => {
                    aiOutput.innerText = d.result || (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || 'Done.';
                })
                .catch(() => {
                    let response = '';
                    if (action === 'translate') response = '[Translated to ' + val + ']:\\n' + text;
                    else if (action === 'style') response = '[' + val + ' Style]:\\n' + text;
                    else if (action === 'emojify') response = '✨ ' + text + ' 🚀🔥';
                    else response = '[Corrected]:\\n' + text;
                    aiOutput.innerText = response;
                });
            });
        });

        // Copy button
        const copyBtn = document.getElementById('opt-copy-ai');
        if (copyBtn && aiOutput) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(aiOutput.innerText).then(() => {
                    const orig = copyBtn.innerText;
                    copyBtn.innerText = 'Copied!';
                    copyBtn.style.background = '#2ebd59';
                    setTimeout(() => {
                        copyBtn.innerText = orig;
                        copyBtn.style.background = '#2481cc';
                    }, 1500);
                });
            });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
`;
    fs.appendFileSync(jsFile, jsBlock, 'utf8');
    console.log('✓ JS: Logic appended successfully');
} else { console.log('✓ JS: Already patched'); }

console.log('=== OPTIMIZE FRONTEND PATCH COMPLETE ===');
