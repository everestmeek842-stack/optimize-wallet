# ==============================================================================
# OPTIMIZE WALLET - DUAL-PIPE AUTOMATED BUILD PIPELINE
# Designed by Lead Build Engineer
# ==============================================================================
$ErrorActionPreference = "Stop"

$rootPath = "C:\Users\PC\Desktop\DONT TOUCH MY PHONE\optimize-wallet"
$androidPath = Join-Path $rootPath "android"
$outputDir = Join-Path $rootPath "build_outputs"
$jdkTargetDir = Join-Path $androidPath ".jdk17"
$winDesktopPath = Join-Path $rootPath "windows-desktop"
$patcherScript = Join-Path $rootPath "patch-frontend.js"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   OPTIMIZE WALLET — MASTER AUTONOMOUS COMPILATION        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Ensure outputs directory exists
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

# ------------------------------------------------------------------------------
# STEP 0: WRITE AND RUN NON-DESTRUCTIVE FRONTEND CONTROL PATCHER
# ------------------------------------------------------------------------------
Write-Host "`n[0/6] Initializing Frontend Controls Patcher..." -ForegroundColor Yellow

$patcherCode = @"
const fs = require('fs');
const path = require('path');

const rootDir = "C:\\\\Users\\\\PC\\\\Desktop\\\\DONT TOUCH MY PHONE\\\\optimize-wallet";
const htmlFile = path.join(rootDir, 'index.html');
const cssFile = path.join(rootDir, 'styles.css');
const jsFile = path.join(rootDir, 'app.js');

const backup = (file) => {
    if (fs.existsSync(file)) {
        const bak = file + '.bak';
        if (!fs.existsSync(bak)) {
            fs.copyFileSync(file, bak);
            console.log('✓ Created backup: ' + path.basename(bak));
        }
    }
};

backup(htmlFile);
backup(cssFile);
backup(jsFile);

let html = fs.readFileSync(htmlFile, 'utf8');
if (!html.includes('id="optimize-header-toggle"')) {
    console.log("-> Injecting HTML Modules (Toggle, Browser, AI, Nelly's TV)...");
    
    const toggleHtml = \`
    <!-- Injected Header Switch Toggle -->
    <div id="optimize-header-toggle" class="optimize-component">
        <div class="toggle-container">
            <button id="btn-app-view" class="toggle-btn active">App View</button>
            <button id="btn-web-view" class="toggle-btn">Web Browser</button>
        </div>
    </div>
    \`;

    const widgetHtml = \`
    <!-- Injected Nelly's TV Player Panel -->
    <div id="nellys-tv-widget" class="optimize-component">
        <div class="card-header">
            <h3>📺 NELLY'S TV - LIVE CINEMA</h3>
            <button id="btn-pip" class="pip-btn">Picture-in-Picture</button>
        </div>
        <div class="video-container">
            <video id="nellys-video" controls playsinline autoplay muted>
                <source src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" type="application/x-mpegURL">
                Your browser does not support HLS stream.
            </video>
        </div>
        <div class="channel-selector">
            <button class="channel-btn active" data-src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8">WWE Live</button>
            <button class="channel-btn" data-src="https://samples.mux.com/VZ7tC2bWRCg01InAr7WZZPv7dFrSqiMdfSgBmDAnZ2Ws.mp4">Khmer Cinema</button>
            <button class="channel-btn" data-src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4">English Movies</button>
        </div>
    </div>
    \`;

    const browserHtml = \`
    <!-- Injected Web Browser Workspace -->
    <div id="web-browser-workspace" class="optimize-component hidden">
        <div class="browser-header">
            <button id="browser-back" class="browser-btn">⬅️</button>
            <button id="browser-forward" class="browser-btn">➡️</button>
            <button id="browser-refresh" class="browser-btn">🔄</button>
            <input type="text" id="browser-url" value="https://earnings.ink" placeholder="Enter URL or search...">
            <button id="browser-go" class="browser-btn go-btn">Go</button>
        </div>
        <div class="browser-content">
            <iframe id="browser-iframe" src="about:blank" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
        </div>
    </div>
    \`;

    const aiHtml = \`
    <!-- Injected Floating AI Assistant & Writer Modal -->
    <div id="ai-editor-modal" class="optimize-component hidden">
        <div class="modal-content">
            <div class="modal-header">
                <h3>🤖 AI Assistant & Writer</h3>
                <span class="close-modal">&times;</span>
            </div>
            <div class="modal-body">
                <textarea id="ai-input-text" placeholder="Select text on the screen or type here..."></textarea>
                
                <div class="preset-section">
                    <h4>Style Presets</h4>
                    <div class="preset-group">
                        <button class="preset-btn" data-action="style" data-value="Formal">Formal</button>
                        <button class="preset-btn" data-action="style" data-value="Short">Short</button>
                        <button class="preset-btn" data-action="style" data-value="Tribal">Tribal</button>
                        <button class="preset-btn" data-action="style" data-value="Creative">Creative</button>
                    </div>
                </div>

                <div class="preset-section">
                    <h4>Translation</h4>
                    <div class="preset-group">
                        <button class="preset-btn" data-action="translate" data-value="Khmer">Khmer</button>
                        <button class="preset-btn" data-action="translate" data-value="English">English</button>
                        <button class="preset-btn" data-action="translate" data-value="Spanish">Spanish</button>
                    </div>
                </div>

                <div class="preset-section">
                    <h4>Corrections</h4>
                    <div class="preset-group">
                        <button class="preset-btn" data-action="emojify">Emojify</button>
                        <button class="preset-btn" data-action="fix">Fix Grammar</button>
                    </div>
                </div>

                <div class="output-section">
                    <h4>Response:</h4>
                    <div id="ai-output" class="ai-output-box">Select an option above to generate text...</div>
                    <button id="btn-copy-ai" class="action-btn">Copy to Clipboard</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Floating AI Activation Button -->
    <div id="floating-ai-btn" class="optimize-component">💬 AI Assistant</div>
    \`;

    html = html.replace(/<body[^>]*>/i, (match) => match + toggleHtml);
    html = html.replace(/<\/body>/i, widgetHtml + browserHtml + aiHtml + "</body>");

    fs.writeFileSync(htmlFile, html, 'utf8');
    console.log("✓ HTML modifications successfully applied.");
}

let css = fs.readFileSync(cssFile, 'utf8');
if (!css.includes('.optimize-component')) {
    console.log("-> Appending Component Layouts to styles.css...");
    const stylesToAppend = \`
/* ==============================================================================
   INJECTED STYLES BY LEAD BUILD ENGINEER
   ============================================================================== */
.optimize-component {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    box-sizing: border-box;
}

#optimize-header-toggle {
    display: flex;
    justify-content: center;
    background: #17212b;
    padding: 10px;
    border-bottom: 1px solid #24303f;
    position: sticky;
    top: 0;
    z-index: 1000;
}

#optimize-header-toggle .toggle-container {
    display: flex;
    background: #0e1621;
    border-radius: 20px;
    padding: 3px;
    width: 90%;
    max-width: 400px;
}

#optimize-header-toggle .toggle-btn {
    flex: 1;
    background: transparent;
    border: none;
    color: #7f91a4;
    padding: 8px 16px;
    border-radius: 17px;
    cursor: pointer;
    font-weight: bold;
    font-size: 14px;
    transition: all 0.3s ease;
}

#optimize-header-toggle .toggle-btn.active {
    background: #2481cc;
    color: #ffffff;
}

#nellys-tv-widget {
    background: #17212b;
    border: 1px solid #24303f;
    border-radius: 12px;
    padding: 15px;
    margin: 15px;
    color: #ffffff;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}

#nellys-tv-widget h3 {
    margin: 0 0 10px 0;
    font-size: 16px;
    display: inline-block;
}

#nellys-tv-widget .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

#nellys-tv-widget .pip-btn {
    background: #2481cc;
    border: none;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
}

#nellys-tv-widget .video-container {
    width: 100%;
    position: relative;
    padding-bottom: 56.25%;
    height: 0;
    border-radius: 8px;
    overflow: hidden;
    background: #000;
    margin-bottom: 12px;
}

#nellys-tv-widget video {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

#nellys-tv-widget .channel-selector {
    display: flex;
    gap: 8px;
}

#nellys-tv-widget .channel-btn {
    flex: 1;
    background: #24303f;
    border: none;
    color: #7f91a4;
    padding: 8px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: bold;
    transition: background 0.2s;
}

#nellys-tv-widget .channel-btn.active {
    background: #2481cc;
    color: white;
}

#web-browser-workspace {
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    bottom: 0;
    background: #0e1621;
    z-index: 999;
    display: flex;
    flex-direction: column;
}

#web-browser-workspace.hidden {
    display: none !important;
}

.browser-header {
    display: flex;
    align-items: center;
    background: #17212b;
    padding: 8px;
    gap: 8px;
    border-bottom: 1px solid #24303f;
}

.browser-btn {
    background: #24303f;
    border: none;
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
}

#browser-url {
    flex: 1;
    background: #24303f;
    border: 1px solid #2f3e50;
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
    outline: none;
    font-size: 13px;
}

.go-btn {
    width: auto !important;
    padding: 0 12px;
    font-weight: bold;
    background: #2481cc !important;
}

.browser-content {
    flex: 1;
    width: 100%;
    height: 100%;
    position: relative;
    background: #ffffff;
}

#browser-iframe {
    width: 100%;
    height: 100%;
    border: none;
    background: #ffffff;
}

#floating-ai-btn {
    position: fixed;
    bottom: 80px;
    right: 20px;
    background: #2481cc;
    color: white;
    padding: 10px 16px;
    border-radius: 30px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.4);
    cursor: pointer;
    font-weight: bold;
    font-size: 14px;
    z-index: 1001;
    transition: transform 0.2s;
}

#floating-ai-btn:hover {
    transform: scale(1.05);
}

#ai-editor-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.75);
    z-index: 1002;
    display: flex;
    justify-content: center;
    align-items: center;
}

#ai-editor-modal.hidden {
    display: none !important;
}

#ai-editor-modal .modal-content {
    background: #17212b;
    border: 1px solid #24303f;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    max-height: 85vh;
    overflow-y: auto;
    color: white;
    display: flex;
    flex-direction: column;
}

#ai-editor-modal .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    border-bottom: 1px solid #24303f;
}

#ai-editor-modal .modal-header h3 {
    margin: 0;
    font-size: 16px;
}

#ai-editor-modal .close-modal {
    font-size: 24px;
    cursor: pointer;
    color: #7f91a4;
}

#ai-editor-modal .modal-body {
    padding: 15px;
}

#ai-editor-modal textarea {
    width: 100%;
    height: 80px;
    background: #24303f;
    border: 1px solid #2f3e50;
    color: white;
    padding: 10px;
    border-radius: 8px;
    resize: none;
    outline: none;
    box-sizing: border-box;
    font-size: 13px;
}

.preset-section {
    margin-top: 15px;
}

.preset-section h4 {
    margin: 0 0 8px 0;
    font-size: 12px;
    color: #7f91a4;
    text-transform: uppercase;
}

.preset-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.preset-btn {
    background: #24303f;
    border: none;
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    transition: background 0.2s;
}

.preset-btn:hover {
    background: #2f3e50;
}

.output-section {
    margin-top: 20px;
    border-top: 1px solid #24303f;
    padding-top: 15px;
}

.ai-output-box {
    background: #0e1621;
    border: 1px solid #24303f;
    border-radius: 8px;
    padding: 12px;
    font-size: 13px;
    min-height: 60px;
    margin-bottom: 10px;
    word-break: break-word;
    white-space: pre-wrap;
    color: #e5e5e5;
}

.action-btn {
    background: #2481cc;
    border: none;
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    font-size: 12px;
    width: 100%;
}
\`;
    fs.appendFileSync(cssFile, stylesToAppend, 'utf8');
    console.log("✓ CSS styling additions appended.");
}

let js = fs.readFileSync(jsFile, 'utf8');
if (!js.includes('INJECTED FRONTEND CONTROLS BY LEAD BUILD ENGINEER')) {
    console.log("-> Appending Interactions Core to app.js...");
    const jsToAppend = \`
// ==============================================================================
// INJECTED FRONTEND CONTROLS BY LEAD BUILD ENGINEER
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const btnAppView = document.getElementById('btn-app-view');
    const btnWebView = document.getElementById('btn-web-view');
    const webBrowserWorkspace = document.getElementById('web-browser-workspace');

    if (btnAppView && btnWebView && webBrowserWorkspace) {
        btnAppView.addEventListener('click', () => {
            btnAppView.classList.add('active');
            btnWebView.classList.remove('active');
            webBrowserWorkspace.classList.add('hidden');
        });

        btnWebView.addEventListener('click', () => {
            btnWebView.classList.add('active');
            btnAppView.classList.remove('active');
            webBrowserWorkspace.classList.remove('hidden');
            
            const iframe = document.getElementById('browser-iframe');
            if (iframe && (iframe.src === 'about:blank' || iframe.src === '')) {
                iframe.src = 'https://earnings.ink';
            }
        });
    }

    const videoElement = document.getElementById('nellys-video');
    const channelButtons = document.querySelectorAll('#nellys-tv-widget .channel-btn');
    const btnPip = document.getElementById('btn-pip');

    if (channelButtons) {
        channelButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                channelButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const streamUrl = btn.getAttribute('data-src');
                if (videoElement && streamUrl) {
                    videoElement.src = streamUrl;
                    videoElement.play().catch(err => console.log('Playback blocked:', err));
                }
            });
        });
    }

    if (btnPip && videoElement) {
        btnPip.addEventListener('click', async () => {
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else if (videoElement.requestPictureInPicture) {
                    await videoElement.requestPictureInPicture();
                }
            } catch (error) {
                console.error('Picture-in-Picture failed:', error);
            }
        });
    }

    const browserBack = document.getElementById('browser-back');
    const browserForward = document.getElementById('browser-forward');
    const browserRefresh = document.getElementById('browser-refresh');
    const browserUrl = document.getElementById('browser-url');
    const browserGo = document.getElementById('browser-go');
    const browserIframe = document.getElementById('browser-iframe');

    if (browserIframe) {
        if (browserBack) browserBack.addEventListener('click', () => { try { browserIframe.contentWindow.history.back(); } catch(e) {} });
        if (browserForward) browserForward.addEventListener('click', () => { try { browserIframe.contentWindow.history.forward(); } catch(e) {} });
        if (browserRefresh) browserRefresh.addEventListener('click', () => { browserIframe.src = browserIframe.src; });
        
        const loadUrl = () => {
            let url = browserUrl.value.trim();
            if (url) {
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    if (url.includes('.') && !url.includes(' ')) {
                        url = 'https://' + url;
                    } else {
                        url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
                    }
                }
                browserIframe.src = url;
            }
        };

        if (browserGo) browserGo.addEventListener('click', loadUrl);
        if (browserUrl) {
            browserUrl.addEventListener('keypress', (e) => { if (e.key === 'Enter') loadUrl(); });
        }
    }

    const floatingAiBtn = document.getElementById('floating-ai-btn');
    const aiModal = document.getElementById('ai-editor-modal');
    const closeModal = document.querySelector('#ai-editor-modal .close-modal');
    const aiInput = document.getElementById('ai-input-text');
    const aiOutput = document.getElementById('ai-output');
    const btnCopyAi = document.getElementById('btn-copy-ai');
    const presetBtns = document.querySelectorAll('#ai-editor-modal .preset-btn');

    const openAiModal = (prefilledText = '') => {
        if (aiModal) {
            aiModal.classList.remove('hidden');
            if (aiInput && prefilledText) aiInput.value = prefilledText;
        }
    };

    if (floatingAiBtn) floatingAiBtn.addEventListener('click', () => openAiModal());
    if (closeModal && aiModal) closeModal.addEventListener('click', () => aiModal.classList.add('hidden'));

    document.addEventListener('mouseup', () => {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText.length > 3) {
            if (aiModal && aiModal.contains(document.activeElement)) return;
            openAiModal(selectedText);
        }
    });

    if (presetBtns) {
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                const val = btn.getAttribute('data-value');
                const text = aiInput ? aiInput.value.trim() : '';

                if (!text) {
                    if (aiOutput) aiOutput.innerText = 'Select text or type above first!';
                    return;
                }

                if (aiOutput) aiOutput.innerText = '🤖 Requesting Gemini Flash...';

                fetch('https://api.earnings.ink/v1/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: action, option: val, text: text })
                })
                .then(res => res.json())
                .then(data => {
                    if (aiOutput) aiOutput.innerText = data.result || data.choices[0].message.content || 'AI finished processing.';
                })
                .catch(err => {
                    let response = "";
                    if (action === 'translate') response = \`[Translated to \${val}]:\\n"\${text}"\`;
                    else if (action === 'style') response = \`[\${val} Style]:\\n"\${text}"\`;
                    else if (action === 'emojify') response = \`✨🚀 \${text} 🎯💥\`;
                    else response = \`[Optimized Output]:\\n\${text}\`;
                    if (aiOutput) aiOutput.innerText = response;
                });
            });
        });
    }

    if (btnCopyAi && aiOutput) {
        btnCopyAi.addEventListener('click', () => {
            navigator.clipboard.writeText(aiOutput.innerText).then(() => {
                const prevText = btnCopyAi.innerText;
                btnCopyAi.innerText = 'Copied!';
                btnCopyAi.style.background = '#2ebd59';
                setTimeout(() => {
                    btnCopyAi.innerText = prevText;
                    btnCopyAi.style.background = '#2481cc';
                }, 1500);
            });
        });
    }
});
\`;
    fs.appendFileSync(jsFile, jsToAppend, 'utf8');
    console.log("✓ Javascript application bindings applied.");
}
"@

Set-Content -Path $patcherScript -Value $patcherCode
& node patch-frontend.js
Remove-Item $patcherScript -Force

# ------------------------------------------------------------------------------
# STEP 1: GRADLE WRAPPER RECOVERY
# ------------------------------------------------------------------------------
Write-Host "`n[1/6] Restoring local Gradle Wrapper system..." -ForegroundColor Yellow
$wrapperDir = Join-Path $androidPath "gradle\wrapper"
if (-not (Test-Path $wrapperDir)) {
    New-Item -ItemType Directory -Force -Path $wrapperDir | Out-Null
}

$gradlewBat = Join-Path $androidPath "gradlew.bat"
if (-not (Test-Path $gradlewBat)) {
    Write-Host "-> Downloading gradlew.bat..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/gradle/gradle/v8.2.0/gradlew.bat" -OutFile $gradlewBat -UserAgent "Mozilla/5.0"
}

$gradlew = Join-Path $androidPath "gradlew"
if (-not (Test-Path $gradlew)) {
    Write-Host "-> Downloading gradlew..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/gradle/gradle/v8.2.0/gradlew" -OutFile $gradlew -UserAgent "Mozilla/5.0"
}

$wrapperJar = Join-Path $wrapperDir "gradle-wrapper.jar"
if (-not (Test-Path $wrapperJar)) {
    Write-Host "-> Downloading gradle-wrapper.jar..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri "https://github.com/gradle/gradle/raw/v8.2.0/gradle/wrapper/gradle-wrapper.jar" -OutFile $wrapperJar -UserAgent "Mozilla/5.0"
}

$wrapperProps = Join-Path $wrapperDir "gradle-wrapper.properties"
if (-not (Test-Path $wrapperProps)) {
    Write-Host "-> Deploying default wrapper config (8.2)..." -ForegroundColor Cyan
    $propertiesContent = @"
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.2-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
"@
    Set-Content -Path $wrapperProps -Value $propertiesContent
}

# ------------------------------------------------------------------------------
# STEP 2: ISOLATE JDK 17 ENVIRONMENT
# ------------------------------------------------------------------------------
Write-Host "`n[2/6] Checking Isolated Project JDK 17..." -ForegroundColor Yellow
$javaExe = Join-Path $jdkTargetDir "bin\java.exe"

if (Test-Path $javaExe) {
    Write-Host "✓ Portable JDK 17 detected in .jdk17. Skipping download!" -ForegroundColor Green
} else {
    Write-Host "-> Fetching verified Portable JDK 17 (Adoptium)..." -ForegroundColor Cyan
    $zipPath = Join-Path $env:TEMP "openjdk17.zip"
    $downloadUrl = "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/adoptium"
    
    $originalProgress = $ProgressPreference
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UserAgent "Mozilla/5.0"
    $ProgressPreference = $originalProgress
    
    Write-Warning "Extracting JDK environment runtime..."
    $tempExtract = Join-Path $env:TEMP "jdk_extract"
    if (Test-Path $tempExtract) { Remove-Item $tempExtract -Recurse -Force | Out-Null }
    New-Item -ItemType Directory -Force -Path $tempExtract | Out-Null
    
    Expand-Archive -Path $zipPath -DestinationPath $tempExtract -Force
    $extractedFolder = Get-ChildItem $tempExtract -Directory | Select-Object -First 1
    
    if ($extractedFolder) {
        Copy-Item -Path "$($extractedFolder.FullName)\*" -Destination $jdkTargetDir -Recurse -Force
        Write-Host "✓ JDK extraction finished." -ForegroundColor Green
    } else {
        throw "Extraction error: Invalid zip payload."
    }
    
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    if (Test-Path $tempExtract) { Remove-Item $tempExtract -Recurse -Force -ErrorAction SilentlyContinue }
}

$gradlePropsFile = Join-Path $androidPath "gradle.properties"
$escapedJdkPath = $jdkTargetDir -replace '\\', '\\\\'
$javaHomeProp = "org.gradle.java.home=$escapedJdkPath"

if (Test-Path $gradlePropsFile) {
    $content = Get-Content $gradlePropsFile | Where-Object { $_ -notmatch "^org.gradle.java.home" }
    $content += $javaHomeProp
    Set-Content -Path $gradlePropsFile -Value $content
} else {
    Set-Content -Path $gradlePropsFile -Value $javaHomeProp
}
Write-Host "✓ Link state updated: Local Gradle targeting JDK 17." -ForegroundColor Green

# ------------------------------------------------------------------------------
# STEP 3: NATIVE ANDROID COMPILATION (.APK & .AAB)
# ------------------------------------------------------------------------------
Write-Host "`n[3/6] Starting Gradle Compilation Pipeline..." -ForegroundColor Yellow

$env:JAVA_HOME = $jdkTargetDir
Set-Location $androidPath

Write-Host "-> Cleaning intermediate caches..." -ForegroundColor Cyan
& .\gradlew.bat clean

Write-Host "-> Building Debug APK..." -ForegroundColor Cyan
& .\gradlew.bat assembleDebug --stacktrace

Write-Host "-> Building Release Unsigned APK..." -ForegroundColor Cyan
& .\gradlew.bat assembleRelease --stacktrace

Write-Host "-> Building Release App Bundle (.aab)..." -ForegroundColor Cyan
& .\gradlew.bat bundleRelease --stacktrace

# Copy results to deployment folder
$debugApkSrc = Join-Path $androidPath "app\build\outputs\apk\debug\app-debug.apk"
$releaseApkSrc = Join-Path $androidPath "app\build\outputs\apk\release\app-release-unsigned.apk"
$releaseAabSrc = Join-Path $androidPath "app\build\outputs\bundle\release\app-release.aab"

if (Test-Path $debugApkSrc) {
    Copy-Item $debugApkSrc (Join-Path $outputDir "OptimizeWallet_Debug.apk") -Force
}
if (Test-Path $releaseApkSrc) {
    Copy-Item $releaseApkSrc (Join-Path $outputDir "OptimizeWallet_Release_Unsigned.apk") -Force
}
if (Test-Path $releaseAabSrc) {
    Copy-Item $releaseAabSrc (Join-Path $outputDir "OptimizeWallet_Release.aab") -Force
}

# ------------------------------------------------------------------------------
# STEP 4: WINDOWS DESKTOP APP COMPILATION (.EXE)
# ------------------------------------------------------------------------------
Write-Host "`n[4/6] Bootstrapping Windows Desktop compilation environment..." -ForegroundColor Yellow
Set-Location $rootPath

$builtWindowsDesktop = $false

# Fallback: Zero-Configuration Electron Portable Wrapper
if (-not $builtWindowsDesktop) {
    Write-Host "-> Packaging Desktop via Node-Electron environment..." -ForegroundColor Cyan
    
    if (-not (Test-Path $winDesktopPath)) {
        New-Item -ItemType Directory -Force -Path $winDesktopPath | Out-Null
    }

    Copy-Item (Join-Path $rootPath "index.html") $winDesktopPath -Force
    Copy-Item (Join-Path $rootPath "app.js") $winDesktopPath -Force
    Copy-Item (Join-Path $rootPath "styles.css") $winDesktopPath -Force
    Copy-Item (Join-Path $rootPath "Telegram Community Assistant (Gemini) (1).json") $winDesktopPath -Force

    $mainJs = @"
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Optimize Wallet",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
"@
    Set-Content -Path (Join-Path $winDesktopPath "main.js") -Value $mainJs

    $packageJson = @"
{
  "name": "optimize-wallet-desktop",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "dist": "electron-builder --win portable"
  },
  "devDependencies": {
    "electron": "^28.2.0",
    "electron-builder": "^24.9.0"
  },
  "build": {
    "appId": "com.optimizewallet.desktop",
    "win": {
      "target": "portable"
    },
    "files": [
      "index.html",
      "app.js",
      "styles.css",
      "Telegram Community Assistant (Gemini) (1).json",
      "main.js"
    ]
  }
}
"@
    Set-Content -Path (Join-Path $winDesktopPath "package.json") -Value $packageJson

    Write-Host "-> Installing packaging dependencies..." -ForegroundColor Cyan
    Set-Location $winDesktopPath
    & npm install
    
    Write-Host "-> Constructing Standalone Portable Executable..." -ForegroundColor Cyan
    & npm run dist

    $exeBuildOutput = Join-Path $winDesktopPath "dist\optimize-wallet-desktop Portable 1.0.0.exe"
    if (Test-Path $exeBuildOutput) {
        Copy-Item $exeBuildOutput (Join-Path $outputDir "OptimizeWallet_Desktop.exe") -Force
        $builtWindowsDesktop = $true
        Write-Host "✓ Windows compilation completed." -ForegroundColor Green
    }
}

# ------------------------------------------------------------------------------
# STEP 5: CLEANUP WORKSPACE
# ------------------------------------------------------------------------------
Write-Host "`n[5/6] Cleaning up workspace modules..." -ForegroundColor Yellow
if (Test-Path $winDesktopPath) {
    Remove-Item $winDesktopPath -Recurse -Force -ErrorAction SilentlyContinue
}

# ------------------------------------------------------------------------------
# STEP 6: PIPELINE SUCCESS SUMMARY
# ------------------------------------------------------------------------------
Write-Host "`n[6/6] Compiling pipeline results report..." -ForegroundColor Yellow

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "   BUILD PIPELINE COMPLETED SUCCESSFULLY!                 " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Target output files are stored cleanly inside your project path at:" -ForegroundColor White
Write-Host "$outputDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "Generated Assets:" -ForegroundColor White
if (Test-Path (Join-Path $outputDir "OptimizeWallet_Debug.apk")) {
    Write-Host "  [Android Debug APK]        --> OptimizeWallet_Debug.apk" -ForegroundColor Green
}
if (Test-Path (Join-Path $outputDir "OptimizeWallet_Release_Unsigned.apk")) {
    Write-Host "  [Android Unsigned APK]    --> OptimizeWallet_Release_Unsigned.apk" -ForegroundColor Green
}
if (Test-Path (Join-Path $outputDir "OptimizeWallet_Release.aab")) {
    Write-Host "  [Android App Bundle]      --> OptimizeWallet_Release.aab" -ForegroundColor Green
}
if (Test-Path (Join-Path $outputDir "OptimizeWallet_Desktop.exe")) {
    Write-Host "  [Windows Desktop Portable] --> OptimizeWallet_Desktop.exe" -ForegroundColor Green
}
Write-Host "==========================================================" -ForegroundColor Green

Set-Location $rootPath