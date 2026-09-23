from pathlib import Path
import re
root=Path('/mnt/data/build22')
header=(root/'components/header.html').read_text()
footer=(root/'components/footer.html').read_text()
# Header visual/UX refinements
header=header.replace('<span>Established 1959</span>','<span>Established 1959</span>')
# Add clearer labels to utility links
header=header.replace('>Technical Resources</a>','>Technical Resources</a>')
# Use a compact search icon treatment while retaining accessible text
header=header.replace('<span aria-hidden="true">⌕</span> Search','<span aria-hidden="true" class="nav-search-icon">⌕</span><span class="nav-search-label">Search</span>')
# Footer: streamline wording and make policy grouping clearer
footer=footer.replace('<div><h2>Investors</h2><a href="investors.html">Investor Relations</a><a href="investors.html#annual">Annual Reports</a><a href="investors.html#interim">Interim Accounts</a><a href="investors.html#compliance">Compliance &amp; Disclosures</a></div>', '<div><h2>Investors</h2><a href="investors.html">Investor Relations</a><a href="investors.html#annual">Annual Reports</a><a href="investors.html#interim">Interim Accounts</a><a href="investors.html#compliance">Compliance &amp; Disclosures</a><a href="investors.html#policies">Company Policies</a></div>')
# Make whistleblowing clearly part of compliance in footer while retaining direct legal access
footer=footer.replace('<a href="whistleblowing.html">Whistleblowing</a>','<a href="whistleblowing.html">Whistleblowing Policy</a>')
# Replace duplicated static shell in every HTML page
for p in root.glob('*.html'):
    s=p.read_text(encoding='utf-8')
    if '<header class="site-header"' in s:
        s=re.sub(r'<header class="site-header".*?</header>', header.rstrip(), s, count=1, flags=re.S)
    if '<footer class="site-footer"' in s:
        s=re.sub(r'<footer class="site-footer".*?</footer>', footer.rstrip(), s, count=1, flags=re.S)
    p.write_text(s,encoding='utf-8')
# Component sources too
(root/'components/header.html').write_text(header,encoding='utf-8')
(root/'components/footer.html').write_text(footer,encoding='utf-8')

css=root/'css/design-system.css'
with css.open('a',encoding='utf-8') as f:
    f.write(r'''

/* ============================================================
   BUILD 22 — HEADER / FOOTER / DEXPERT OPTIMISATION
   Refinement only: preserve approved architecture and content.
   ============================================================ */
/* Header: tighter, calmer and more deliberate. */
.site-header{box-shadow:0 3px 16px rgba(15,18,21,.055)}
.site-header .utility-inner{min-height:32px;padding-top:0;padding-bottom:0}
.site-header .utility-left,.site-header .utility-links{gap:1.15rem}
.site-header .utility-links a{font-size:11px}
.site-header .header-main-tier .header-inner{min-height:68px}
.site-header .brand-logo{width:174px;height:45px}
.site-header .site-navigation>a,.site-header .site-navigation .dropdown-toggle{padding:25px 9px;font-size:12.5px}
.site-header .site-navigation>a.nav-active::after,.site-header .site-navigation .dropdown-toggle.nav-parent-active::after{left:9px;right:9px;bottom:13px;height:2px}
.site-header .header-products-row{min-height:40px;padding:.12rem .75rem .2rem;gap:.05rem}
.site-header .header-products-row .dropdown-toggle,.site-header .header-products-row .tier2-services{font-size:.73rem;padding:.42rem .56rem}
.site-header .nav-search{display:inline-flex!important;align-items:center;gap:6px}
.site-header .nav-search-icon{font-size:20px!important;line-height:1;display:inline-block;transform:translateY(-1px)}
.site-header .nav-search-label{line-height:1}
.site-header .dropdown-menu{border-radius:0 0 12px 12px}
.site-header .mega-menu{border-top-width:2px;box-shadow:0 20px 46px rgba(15,18,21,.14)}

/* Footer: clearer hierarchy and more breathing room without adding content. */
.site-footer{padding-top:62px}
.site-footer::before{height:2px}
.site-footer .footer-grid.footer-journey{grid-template-columns:1.7fr repeat(5,minmax(0,1fr));gap:26px;padding-bottom:44px}
.site-footer .footer-brand p{max-width:300px;font-size:12.5px;line-height:1.65}
.site-footer h2{font-size:10px;margin-bottom:14px}
.site-footer a{font-size:12px;margin-bottom:8px;line-height:1.45}
.site-footer .footer-bottom{padding-top:18px;padding-bottom:8px;font-size:10.5px}
.site-footer .footer-legal{gap:14px}
.site-footer .footer-legal a{font-size:10.5px}

/* DEXPERT: less visual weight when closed, stronger hierarchy when open. */
.dexpert-fab{right:20px;bottom:20px;min-height:48px;padding:.62rem .9rem .62rem .72rem;gap:.5rem;border:1px solid rgba(255,255,255,.10);box-shadow:0 10px 28px rgba(0,0,0,.20);transition:transform .16s ease,background .16s ease,box-shadow .16s ease}
.dexpert-fab img{width:25px;height:25px}
.dexpert-fab span{font-size:12px;letter-spacing:.03em}
.dexpert-fab small{font-size:9px;color:#bfc4c8;line-height:1}
.dexpert-fab:hover,.dexpert-fab:focus-visible{background:#202326;box-shadow:0 14px 34px rgba(0,0,0,.24)}
.dexpert-fab:focus-visible{outline:2px solid var(--dadex-red);outline-offset:3px}
.dexpert-fab[aria-expanded="true"]{background:#24272a}
.dexpert-dialog{right:20px;bottom:78px;width:min(410px,calc(100vw - 32px));border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.22)}
.dexpert-head{padding:.9rem 1rem}
.dexpert-brand img{width:32px;height:32px}
.dexpert-brand strong{font-size:.95rem}
.dexpert-brand span{font-size:.68rem}
.dexpert-body{padding:1rem}
.dexpert-context{padding-bottom:.7rem;margin-bottom:.75rem;border-bottom:1px solid var(--d-line)}
.dexpert-context span{display:block;font-size:.68rem;text-transform:uppercase;letter-spacing:.1em;color:var(--d-muted);font-weight:750;margin-bottom:2px}
.dexpert-intro{font-size:.92rem}
.dexpert-actions{gap:.5rem}
.dexpert-actions a,.dexpert-actions button{padding:.68rem .72rem;border-radius:9px}
.dexpert-ask{margin-top:1rem;padding-top:1rem;border-top:1px solid var(--d-line)}
.dexpert-ask label{display:block;font-size:.78rem;font-weight:750;color:var(--d-text);margin-bottom:.4rem}
.dexpert-ask>div{display:grid;grid-template-columns:1fr auto;gap:.45rem}
.dexpert-ask input{min-width:0;border:1px solid var(--d-line);border-radius:9px;padding:.68rem .72rem;font:inherit;font-size:.82rem}
.dexpert-ask button{border:0;border-radius:9px;background:var(--dadex-red);color:#fff;padding:.68rem .85rem;font:700 .78rem/1 'Inter',system-ui,sans-serif;cursor:pointer}
.dexpert-ask button:hover{background:var(--dadex-red-dark)}
.dexpert-ask>small{display:block;margin-top:.45rem;line-height:1.45}
.dexpert-note{font-size:.75rem;line-height:1.5;margin-top:.9rem}
.dexpert-result>span{font-size:.67rem;font-weight:800;letter-spacing:.1em;color:var(--dadex-red)}
.dexpert-result h4{margin:.2rem 0 .45rem}
.dexpert-result-link{display:flex!important;align-items:center;justify-content:space-between;margin-top:.7rem}
@media(max-width:1180px){
  .site-footer .footer-grid.footer-journey{grid-template-columns:1.6fr repeat(3,minmax(0,1fr))}
  .site-footer .footer-brand{grid-column:1/-1}
}
@media(max-width:900px){
  .site-header .header-main-tier .header-inner{min-height:64px}
  .site-header .brand-logo{width:164px;height:43px}
  .site-header .site-navigation>a,.site-header .site-navigation .dropdown-toggle{padding: .82rem .7rem}
  .site-footer{padding-top:54px}
}
@media(max-width:600px){
  .site-header .brand-logo{width:148px;height:40px}
  .site-header .nav-search-label{display:none}
  .site-footer{padding-top:52px}
  .site-footer .footer-grid.footer-journey{gap:24px}
  .dexpert-fab{right:14px;bottom:14px;min-height:46px;padding:.58rem .72rem}
  .dexpert-fab small{display:none}
  .dexpert-dialog{left:14px;right:14px;bottom:68px;width:auto}
}
@media(prefers-reduced-motion:reduce){
  .site-footer a,.dexpert-fab{transition:none!important}
}
@media print{
  .site-header,.dexpert-fab,.dexpert-dialog{position:static!important;box-shadow:none!important}
  .dexpert-fab,.dexpert-dialog{display:none!important}
}
''')

# JS: improve DEXPERT UX without changing its deterministic information model
js=root/'js/main.js'
s=js.read_text(encoding='utf-8')
s=s.replace("fab.innerHTML='<img src=\"assets/images/Dexpert.png\" alt=\"\" aria-hidden=\"true\"><span>DEXPERT</span><small>Digital guide</small>';", "fab.innerHTML='<img src=\"assets/images/Dexpert.png\" alt=\"\" aria-hidden=\"true\"><span>Ask DEXPERT</span><small>Digital guide</small>';" )
s=s.replace("const isProduct=path.startsWith('product') && path!=='products.html';", "const isProduct=path.startsWith('product') && path!=='products.html' && path!=='product-pe-gas.html';")
s=s.replace("const close=()=>{dialog.classList.remove('open');fab.setAttribute('aria-expanded','false')};", "const close=()=>{dialog.classList.remove('open');fab.setAttribute('aria-expanded','false')};")
# Add outside-click close specifically for the dialog, preserving explicit open triggers.
old="document.addEventListener('click',e=>{if(e.target.closest('[data-open-dexpert]')){e.preventDefault();open()}});"
new="document.addEventListener('click',e=>{if(e.target.closest('[data-open-dexpert]')){e.preventDefault();open();return} if(dialog.classList.contains('open') && !dialog.contains(e.target) && !fab.contains(e.target)) close()});"
s=s.replace(old,new)
# Escape and focus behavior: restore focus to FAB after close.
s=s.replace("document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});", "document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();fab.focus()}});")
js.write_text(s,encoding='utf-8')
