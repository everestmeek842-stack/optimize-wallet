const fs=require('fs');const path=require('path');
const t=path.join(__dirname,'..','public','index.html');
let c=fs.readFileSync(t,'utf8');

// 1. ADD CLOSE/X BUTTON TO PAYOUT BINDING PANEL
// Find the payout-binding section header and add close button
c=c.replace(
  '<h2 id="payout-binding-title" style="margin:0 0 8px;font-size:18px">Payout wallet binding</h2>',
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><h2 id="payout-binding-title" style="margin:0;font-size:18px">Payout wallet binding</h2><button id="close-payout-binding" style="background:none;border:none;color:#aec0dd;font-size:20px;cursor:pointer;padding:4px 8px;line-height:1" aria-label="Close">&times;</button></div>'
);

// 2. FIX VIDEO CSS - Remove absolute positioning that causes shaking
c=c.replace(
  '#nelly-video {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n}',
  '#nelly-video {\n  position: relative;\n  width: 100%;\n  height: auto;\n  display: block;\n  object-fit: contain;\n}'
);

// 3. ADD JAVASCRIPT TO MAKE ALL BUTTONS WORK
// Add before closing body tag
const fixJs = `
<script>
(function(){
  // Close payout binding panel
  var closeBtn = document.getElementById('close-payout-binding');
  if (closeBtn) {
    closeBtn.onclick = function() {
      var panel = document.getElementById('payout-binding');
      if (panel) panel.style.display = 'none';
    };
  }
  
  // Fix Memory Vault button
  var memBtn = document.getElementById('openMemoryButton');
  if (memBtn) {
    memBtn.onclick = function() {
      var dlg = document.getElementById('memoryDialog');
      if (dlg) {
        if (typeof renderMemoryList === 'function') renderMemoryList();
        dlg.showModal();
      }
    };
  }
  
  // Fix Connections button  
  var connBtn = document.getElementById('connectionButton');
  if (connBtn) {
    connBtn.onclick = function() {
      var dlg = document.getElementById('settingsDialog');
      if (dlg) dlg.showModal();
    };
  }
  
  // Fix Settings button
  var settingsBtn = document.getElementById('openSettingsButton');
  if (settingsBtn) {
    settingsBtn.onclick = function() {
      var dlg = document.getElementById('settingsDialog');
      if (dlg) dlg.showModal();
    };
  }
  
  // Fix browser toggle
  var btnApp = document.getElementById('btn-app-view');
  var btnWeb = document.getElementById('btn-web-view');
  if (btnApp) {
    btnApp.onclick = function() {
      btnApp.classList.add('active');
      btnWeb.classList.remove('active');
      var ws = document.getElementById('opt-browser-workspace');
      if (ws) ws.classList.add('opt-hidden');
    };
  }
  if (btnWeb) {
    btnWeb.onclick = function() {
      btnWeb.classList.add('active');
      btnApp.classList.remove('active');
      var ws = document.getElementById('opt-browser-workspace');
      if (ws) ws.classList.remove('opt-hidden');
    };
  }
  
  // Fix video - stop shaking, autoplay with mid volume
  var vid = document.getElementById('nelly-video');
  if (vid) {
    vid.style.position = 'relative';
    vid.muted = false;
    vid.volume = 0.5;
    vid.play().catch(function() {
      vid.muted = true;
      vid.play().catch(function() {});
    });
  }
})();
</script>
`;

// Insert before </body>
c = c.replace('</body>', fixJs + '\n</body>');

fs.writeFileSync(t, c);
console.log('All fixes applied');
