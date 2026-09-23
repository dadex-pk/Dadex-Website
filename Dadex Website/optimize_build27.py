from pathlib import Path
import re, json, html as htmlmod, shutil, zipfile
root=Path('/mnt/data/build26audit')

# 1) Move all page-specific inline CSS into the shared stylesheet.
css=root/'css/design-system.css'
css_text=css.read_text(errors='ignore')
blocks=[]
for p in sorted(root.glob('*.html')):
    s=p.read_text(errors='ignore')
    styles=re.findall(r'<style\b[^>]*>(.*?)</style>', s, flags=re.I|re.S)
    if styles:
        for i,block in enumerate(styles,1):
            blocks.append(f"\n/* BUILD 27 — {p.name} page-specific styles moved from inline CSS */\n{block.strip()}\n")
        s=re.sub(r'<style\b[^>]*>.*?</style>', '', s, flags=re.I|re.S)
        p.write_text(s)
if blocks:
    css.write_text(css_text + ''.join(blocks))

# 2) Policy page joins the shared shell while preserving approved legal text verbatim.
p=root/'policy.shtml'; s=p.read_text(errors='ignore')
s=s.replace('<body>\n<header class="page-header"><div class="container"><a href="index.html">← Back to Dadex</a></div></header>\n<main class="container core-page">', '<body><div data-component="header"></div><main class="core-page">')
s=s.replace('</main><script src="js/main.js"></script></body>', '</main><div data-component="footer"></div><script src="js/main.js"></script></body>')
s=s.replace('href="http://www.dadex.com/"','href="https://www.dadex.com/"')
p.write_text(s)

# 3) Remove demo dealer records; retain a truthful empty directory until approved data is supplied.
(root/'dealers-data.js').write_text('window.DADEX_DEALERS = [];\n')
p=root/'dealers.html'; s=p.read_text(errors='ignore')
s=re.sub(r'<div class="dealer-demo-banner">.*?</div>', '', s, flags=re.S)
s=s.replace('Find an approved Dadex dealer or distributor by location, product or dealer name.', 'Find an approved Dadex dealer or distributor by location, product or dealer name.')
p.write_text(s)

# 4) Simplify DEXPERT: no icons, no image, short labels/descriptions, compact result messages.
js=root/'js/main.js'; t=js.read_text(errors='ignore')
start=t.index('function initDEXPERT(){')
end=t.index('\nfunction escapeHTML(value)', start)
new=r'''function initDEXPERT(){
  if(document.querySelector('.dexpert-fab')) return;
  const fab=document.createElement('button');
  fab.className='dexpert-fab'; fab.type='button'; fab.setAttribute('aria-expanded','false'); fab.setAttribute('aria-controls','dexpertDialog');
  fab.textContent='Ask DEXPERT';
  const dialog=document.createElement('section');
  dialog.className='dexpert-dialog'; dialog.id='dexpertDialog'; dialog.setAttribute('role','dialog'); dialog.setAttribute('aria-modal','false'); dialog.setAttribute('aria-label','DEXPERT Dadex digital guide');
  dialog.innerHTML='<div class="dexpert-head"><div class="dexpert-brand"><strong>DEXPERT</strong><span>Dadex digital guide</span></div><button class="dexpert-close" type="button" aria-label="Close DEXPERT">×</button></div><div class="dexpert-body" id="dexpertBody"></div>';
  document.body.appendChild(fab); document.body.appendChild(dialog);
  const body=dialog.querySelector('#dexpertBody');
  const title=(document.querySelector('main h1')?.textContent||document.title.replace(/\s*[|–-].*$/,'')).trim();
  const path=window.location.pathname.split('/').pop()||'index.html';
  const productLinks=[
    ['Aquadex','product.html'],['T-Flex','product-tflex.html'],['Polydex Premium','product-polydex-premium.html'],['Polydex','product-polydex.html'],['Thermoline','product-thermoline.html'],
    ['Flow Line','product-flow-line.html'],['Inspection Chambers','product-inspection-chambers.html'],['Manholes','product-manholes.html'],['Catchpits','product-catchpits.html'],['Nikasi','product-nikasi.html'],['Polyduct','product-polyduct.html'],
    ['PE Cable Duct','product-pe-cable-duct.html'],['Electrical Conduits','product-electrical-conduits.html'],['Electroduct','product-electroduct.html'],['Corrugated Sheets','product-corrugated-sheets.html'],
    ['Non-Return Valves','product-non-return-valves.html'],['T-Flex Gas','product-tflex-gas.html'],['T-Flex Compressed Air','product-tflex-compressed-air.html'],['UPVC Tubewell Casing & Screen Pipes System','product-upvc-tubewell.html']
  ];
  const apps=[['Water Supply','products.html#water-supply'],['Sewerage & Drainage','products.html#sewerage-drainage'],['Cable & Utility Ducting','products.html#cable-utility-ducting'],['Roofing','products.html#roofing'],['Specialised & Industrial','products.html#specialised-industrial']];
  const isProduct=path.startsWith('product') && path!=='products.html' && path!=='product-pe-gas.html';
  const isInvestor=/investor|financial-reports/i.test(path);
  const isResources=/literature|faq|calculators|news/i.test(path);
  const currentProduct=isProduct ? title : '';
  function link(href,label){return '<a href="'+href+'">'+label+'</a>'}
  function home(){
    let intro='What do you need?'; let actions=[];
    if(isProduct){
      intro='<strong>'+escapeHTML(currentProduct)+'</strong>';
      actions=[link('#technical','Technical information'),link('technical-resources.html','Technical resources'),link('products.html','Related products'),link('dealers.html','Find a dealer')];
    }else if(isInvestor){
      intro='Investor information';
      actions=[link('investors.html','Investor Relations'),link('investors.html#annual','Annual Reports'),link('contact.html','Investor enquiry')];
    }else if(isResources){
      intro='Dadex Resources';
      actions=[link('products.html','Find a product'),link('technical-resources.html','Technical resources'),link('faq.html','FAQs'),link('contact.html','Technical support')];
    }else{
      actions=[link('products.html','Find a product'),link('solutions.html','Find a solution'),link('technical-resources.html','Technical resources'),link('dealers.html','Find a dealer')];
    }
    body.innerHTML='<div class="dexpert-context"><span>Current page</span><strong>'+escapeHTML(title)+'</strong></div><p class="dexpert-intro">'+intro+'</p><div class="dexpert-actions">'+actions.join('')+'</div><div class="dexpert-ask"><label for="dexpertQuery">Search Dadex</label><div><input id="dexpertQuery" type="search" placeholder="Product or application" autocomplete="off"><button type="button" id="dexpertAskBtn">Ask</button></div></div><p class="dexpert-note">Uses approved Dadex website information.</p>';
    const q=body.querySelector('#dexpertQuery'), ask=body.querySelector('#dexpertAskBtn');
    const run=()=>answer(q.value.trim()); ask.addEventListener('click',run); q.addEventListener('keydown',e=>{if(e.key==='Enter')run()});
  }
  function result(back,label,heading,message,href,cta){
    body.innerHTML='<button class="dexpert-back" type="button">← Back</button><div class="dexpert-result"><span>'+label+'</span><h4>'+heading+'</h4><p>'+message+'</p><a class="dexpert-result-link" href="'+href+'">'+cta+' →</a></div>';
    body.querySelector('.dexpert-back').addEventListener('click',home);
  }
  function answer(query){
    const q=query.toLowerCase();
    if(!q){result(true,'DEXPERT','Try a search','Enter a product or application such as Aquadex, water supply or gas.','products.html','Browse products');return}
    const product=productLinks.find(p=>q.includes(p[0].toLowerCase())||p[0].toLowerCase().includes(q));
    if(product){result(true,'PRODUCT',escapeHTML(product[0]),'Open the product page for its approved information.',product[1],'Open product');return}
    const app=apps.find(a=>q.includes(a[0].toLowerCase())||a[0].toLowerCase().includes(q));
    if(app){result(true,'APPLICATION',escapeHTML(app[0]),'Explore the systems listed for this application area.',app[1],'Explore');return}
    if(/report|annual|financial|investor|shareholder|agm/.test(q)){result(true,'INVESTOR','Investor Relations','Find annual reports, financial information and shareholder references.','investors.html#annual','Open investor information');return}
    if(/document|brochure|datasheet|certificate|technical|literature|drawing/.test(q)){result(true,'RESOURCES','Technical Resources','Find approved technical information and support routes.','technical-resources.html','Open technical resources');return}
    result(true,'DEXPERT','No direct match','Try a product, application or technical-resource term.', 'products.html','Browse products');
  }
  home();
  const close=()=>{dialog.classList.remove('open');fab.setAttribute('aria-expanded','false')};
  const open=()=>{dialog.classList.add('open');fab.setAttribute('aria-expanded','true');setTimeout(()=>dialog.querySelector('#dexpertQuery')?.focus(),60)};
  fab.addEventListener('click',()=>dialog.classList.contains('open')?close():open());
  dialog.querySelector('.dexpert-close').addEventListener('click',close);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();fab.focus()}});
  document.addEventListener('click',e=>{if(e.target.closest('[data-open-dexpert]')){e.preventDefault();open();return} if(dialog.classList.contains('open') && !dialog.contains(e.target) && !fab.contains(e.target)) close()});
}'''
t=t[:start]+new+t[end:]
# remove newsletter from context detection
# (new function no newsletter, but clean any stale occurrence in DEXPERT context if present)
t=t.replace('|newsletter','')
js.write_text(t)

# 5) Regenerate search index from current page bodies, excluding redirects/404/search and component shell.
from html.parser import HTMLParser
class TextParser(HTMLParser):
    def __init__(self): super().__init__(); self.out=[]; self.skip=0
    def handle_starttag(self,tag,attrs):
        if tag in ('script','style','noscript'): self.skip+=1
    def handle_endtag(self,tag):
        if tag in ('script','style','noscript') and self.skip: self.skip-=1
    def handle_data(self,data):
        if not self.skip: self.out.append(data)

def cleantext(s):
    p=TextParser(); p.feed(s); return re.sub(r'\s+',' ', ' '.join(p.out)).strip()
exclude={'404.html','search.html','privacy-policy.html','terms.html','product-pe-gas.html'}
entries=[]
for p in sorted(root.glob('*.html')):
    if p.name in exclude: continue
    s=p.read_text(errors='ignore')
    title=re.search(r'<title>(.*?)</title>',s,re.I|re.S)
    title=htmlmod.unescape(re.sub('<.*?>','',title.group(1))).strip() if title else p.stem
    body=cleantext(s)
    category='Product' if p.name=='product.html' or p.name.startswith('product-') else ('Investor' if p.name=='investors.html' else ('Resources' if p.name in {'technical-resources.html','literature.html','faq.html','calculators.html','news.html'} else 'General'))
    entries.append([title,p.name,category,body])
(root/'search-index.js').write_text('window.DADEX_SEARCH_INDEX='+json.dumps(entries,ensure_ascii=False,separators=(',',':'))+';\n')

# 6) Replace obsolete http Dadex links in investor/legal pages with https.
for p in root.glob('*.html'):
    s=p.read_text(errors='ignore')
    s=s.replace('http://www.dadex.com/', 'https://www.dadex.com/')
    s=s.replace('http://www.dadex.com/aboutdadex/', 'https://www.dadex.com/aboutdadex/')
    p.write_text(s)

# 7) Append a single final DEXPERT visual system; no icon/image selectors.
css=root/'css/design-system.css'; c=css.read_text(errors='ignore')
# remove any prior BUILD 27 block if rerun
c=re.sub(r'/\* BUILD 27 — DEXPERT SIMPLIFICATION.*?\*/.*?(?=/\* BUILD 27 —|\Z)', '', c, flags=re.S)
c += '''\n\n/* BUILD 27 — DEXPERT SIMPLIFICATION\n   DEXPERT is deliberately text-light and icon-free. Icons remain part of the site shell/header/footer only. */\n.dexpert-fab{background:var(--dadex-red)!important;border:1px solid var(--dadex-red)!important;color:#fff!important;border-radius:999px;min-height:44px;padding:0 16px!important;font-size:12px;font-weight:800;letter-spacing:.02em;box-shadow:0 10px 24px rgba(0,0,0,.18)}\n.dexpert-fab:hover,.dexpert-fab:focus-visible,.dexpert-fab[aria-expanded="true"]{background:var(--dadex-red-dark)!important;border-color:var(--dadex-red-dark)!important}\n.dexpert-fab img,.dexpert-dialog img,.dexpert-dialog i{display:none!important}\n.dexpert-dialog{width:min(360px,calc(100vw - 28px));right:18px;bottom:72px;border-radius:14px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.20)}\n.dexpert-head{padding:12px 14px!important;background:var(--dadex-red)!important;color:#fff!important}\n.dexpert-brand{display:block!important}\n.dexpert-brand strong{display:block;font-size:14px;line-height:1.2}\n.dexpert-brand span{display:block;margin-top:2px;font-size:10px;opacity:.82}\n.dexpert-body{padding:14px!important}\n.dexpert-context{padding:0 0 8px!important;margin:0 0 10px!important}\n.dexpert-context span{font-size:9px!important;letter-spacing:.09em}\n.dexpert-context strong{font-size:12px!important}\n.dexpert-intro{font-size:13px!important;margin:0 0 10px!important}\n.dexpert-actions{gap:6px!important}\n.dexpert-actions a,.dexpert-actions button{padding:9px 10px!important;border-radius:8px!important;font-size:12px!important;font-weight:700!important}\n.dexpert-ask{margin-top:12px!important;padding-top:12px!important}\n.dexpert-ask label{font-size:9px!important;letter-spacing:.07em!important;margin-bottom:5px!important}\n.dexpert-ask>div{gap:5px!important}\n.dexpert-ask input{padding:9px 10px!important;font-size:12px!important;border-radius:8px!important}\n.dexpert-ask button{min-width:52px!important;padding:9px 10px!important;border-radius:8px!important;font-size:11px!important}\n.dexpert-note{font-size:9px!important;line-height:1.4!important;margin:8px 0 0!important;color:var(--d-muted)!important}\n.dexpert-back{font-size:11px!important;margin-bottom:8px!important}\n.dexpert-result>span{font-size:9px!important}\n.dexpert-result h4{font-size:15px!important;margin:2px 0 4px!important}\n.dexpert-result p{font-size:12px!important;line-height:1.45!important;margin:0!important}\n.dexpert-result-link{font-size:12px!important;padding:9px 10px!important;border-radius:8px!important}\n@media(max-width:600px){.dexpert-fab{right:14px!important;bottom:14px!important;min-height:42px}.dexpert-dialog{left:14px;right:14px;bottom:64px;width:auto}}\n'''
css.write_text(c)

# 8) Header/footer: add restrained iconography only in shell. Use text labels as fallback via aria-hidden icons.
h=root/'components/header.html'; hs=h.read_text()
hs=hs.replace('<span aria-hidden="true" class="nav-search-icon">⌕</span>', '<span aria-hidden="true" class="nav-search-icon"><i class="fas fa-magnifying-glass"></i></span>')
h.write_text(hs)
f=root/'components/footer.html'; fs=f.read_text()
repls={
'<h2>Products &amp; Systems</h2>':'<h2><i class="fas fa-boxes-stacked" aria-hidden="true"></i> Products &amp; Systems</h2>',
'<h2>Explore</h2>':'<h2><i class="fas fa-compass" aria-hidden="true"></i> Explore</h2>',
'<h2>Resources</h2>':'<h2><i class="fas fa-file-lines" aria-hidden="true"></i> Resources</h2>',
'<h2>Investors</h2>':'<h2><i class="fas fa-chart-line" aria-hidden="true"></i> Investors</h2>',
'<h2>Contact</h2>':'<h2><i class="fas fa-envelope" aria-hidden="true"></i> Contact</h2>'}
for a,b in repls.items(): fs=fs.replace(a,b)
f.write_text(fs)

# 9) CSS for shell icons, deliberately subtle.
css=root/'css/design-system.css'; c=css.read_text(errors='ignore')
c += '''\n/* BUILD 27 — restrained shell iconography */\n.site-header .nav-search-icon i,.site-footer h2 i{font-size:.82em;opacity:.78}\n.site-footer h2 i{margin-right:5px;color:var(--dadex-red,#c90000)}\n'''
css.write_text(c)

print('Build 27 source prepared')
