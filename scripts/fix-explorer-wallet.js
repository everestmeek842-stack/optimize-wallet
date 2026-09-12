const fs=require('fs');const path=require('path');
const t=path.join(__dirname,'..','public','explorer-workspace.html');
let c=fs.readFileSync(t,'utf8');

// Add X button to Bind Your Wallet section
c=c.replace(
  '<h2 class="section-title">🔐 Bind Your Wallet <small>SOL + USDT payout addresses</small></h2>',
  '<div style="display:flex;justify-content:space-between;align-items:center"><h2 class="section-title">🔐 Bind Your Wallet <small>SOL + USDT payout addresses</small></h2><button id="close-wallet-binding" style="background:none;border:none;color:#a0a4b1;font-size:22px;cursor:pointer;padding:4px 8px;line-height:1" aria-label="Close">&times;</button></div>'
);

// Add JavaScript to close the wallet binding section
const closeJs = `
<script>
(function(){
  var closeBtn = document.getElementById('close-wallet-binding');
  if (closeBtn) {
    closeBtn.onclick = function() {
      var section = closeBtn.closest('.section');
      if (section) section.style.display = 'none';
    };
  }
})();
</script>
`;
c = c.replace('</body>', closeJs + '\n</body>');

fs.writeFileSync(t, c);
console.log('explorer-workspace wallet binding X button added');
