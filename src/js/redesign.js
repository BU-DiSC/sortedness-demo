(function(){
  function applyPreset(n,k,l,a,b,el){
    const root = document.querySelector('.redesign');
    if(!root) return;
    const set = (id,val) => { const e = root.querySelector('#'+id); if(e) e.value = val; };
    set('pN', n); set('pK', k); set('pL', l); set('pA', a); set('pB', b);
    root.querySelectorAll('.preset').forEach(p=>p.classList.remove('on'));
    if(el && el.classList) el.classList.add('on');
  }

  function populateIns(){
    const root = document.querySelector('.redesign');
    if(!root) return;
    const vals=[26,27,28,29,30,31,32,531,34,35,36,37,38,39,40];
    const insEl = root.querySelector('#ins');
    if(!insEl) return;
    insEl.innerHTML = '';
    vals.forEach((v,i)=>{
      const d=document.createElement('div');
      d.className='ins'+(v===531?' w':'')+(i<2?' on':'');
      d.textContent=v;
      insEl.appendChild(d);
    });
  }

  function populateSware(){
    const root = document.querySelector('.redesign');
    if(!root) return;
    const sg = root.querySelector('#sware');
    if(!sg) return;
    sg.innerHTML = '';
    const pd=[[355,203,487,6,392,6,7,12,78,10],[17,8,13,19,15,45,11,422,14,98],[21,22,313,522,25,26]];
    for(let i=0;i<10;i++){
      const c=document.createElement('div');
      c.className='pc'+(i<3?' fl c'+i:'');
      let h='<div class="pc-l">P'+i+'</div>';
      if(i<3) pd[i].forEach((v,j)=>{ if(v!=null) h+='<div class="pv'+(i===2&&j>=4?' n':'')+'">'+v+'</div>'; });
      c.innerHTML=h;
      sg.appendChild(c);
    }
  }

  function draw(id,mode){
    const root = document.querySelector('.redesign');
    if(!root) return;
    const canvas = root.querySelector('#'+id);
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const w=rect.width,h=rect.height,p=28;
    ctx.clearRect(0,0,rect.width,rect.height);
    ctx.strokeStyle='#dddbd6'; ctx.lineWidth=0.5;
    for(let i=0;i<=5;i++){
      const x=p+(w-2*p)*i/5, y=p+(h-2*p)*i/5;
      ctx.beginPath(); ctx.moveTo(x,p); ctx.lineTo(x,h-p); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p,y); ctx.lineTo(w-p,y); ctx.stroke();
    }
    ctx.font='500 9px IBM Plex Mono'; ctx.fillStyle='#96938c'; ctx.textAlign='center';
    for(let i=0;i<=5;i++){
      ctx.fillText(i*1000, p+(w-2*p)*i/5, h-p+14);
      ctx.save(); ctx.textAlign='right'; ctx.fillText(i*1000, p-6, p+(h-2*p)*(5-i)/5+3); ctx.restore();
    }
    if(mode==='ex'){ ctx.strokeStyle='#15653a'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(p,h-p); ctx.lineTo(w-p,p); ctx.stroke(); }
    for(let i=0;i<700;i++){
      const t=i/700; let x,y,oo;
      if(mode==='kl'){ oo=Math.random()<0.2; x=t; y=oo? t+(Math.random()-0.5)*0.3 : t+(Math.random()-0.5)*0.015; }
      else { oo=Math.random()<0.5; x=t; y=oo? Math.random() : t+(Math.random()-0.5)*0.015; }
      y = Math.max(0, Math.min(1, y));
      const px = p+(w-2*p)*x, py=(h-p)-(h-2*p)*y;
      ctx.beginPath(); ctx.arc(px,py,oo?1.6:2,0,Math.PI*2);
      ctx.fillStyle = oo? '#c92a2a' : '#15653a'; ctx.globalAlpha = oo? 0.5 : 0.8; ctx.fill();
    }
    ctx.globalAlpha = 1;
    if(mode==='kl'){ ctx.strokeStyle='#15653a'; ctx.lineWidth=2; ctx.setLineDash([5,3]); ctx.beginPath(); ctx.moveTo(p,h-p); ctx.lineTo(w-p,p); ctx.stroke(); ctx.setLineDash([]); }
  }

  function init(){
    const root = document.querySelector('.redesign');
    if(!root) return;
    window.applyPreset = applyPreset; // keep global for inline onclick handlers in markup
    populateIns();
    populateSware();
    function redraw(){ draw('c1','kl'); draw('c2','ex'); }
    window.addEventListener('load', redraw);
    window.addEventListener('resize', redraw);

    // Toggle behavior: show index-structure config and Run button when Visualize Index clicked
    var btnViz = root.querySelector('#btn-visualize');
    var btnVizIdx = root.querySelector('#btn-visualize-index');
    var btnRun = root.querySelector('#btn-run');
    var idxCfg = root.querySelector('#index-structure-config');

    if(btnVizIdx){
      btnVizIdx.addEventListener('click', function(){
        if(idxCfg) idxCfg.style.display = '';
        if(btnRun) btnRun.style.display = '';
        if(btnViz) btnViz.style.display = 'none';
        btnVizIdx.style.display = 'none';
      });
    }

    // Show charts area when Visualize Workload is clicked
    if(btnViz){
      btnViz.addEventListener('click', function(){
        var charts = root.querySelector('#charts');
        if(charts) charts.style.display = '';
        // also reveal inner chart column if it had a 'hidden' class
        var col = root.querySelector('#chart-column');
        if(col){ col.classList.remove('hidden'); }
        // scroll charts into view for convenience
        if(charts) charts.scrollIntoView({behavior:'smooth', block:'start'});
        // If the original visualization function exists (from main.js), call it
        if(typeof window.visualize_workload === 'function'){
          // Ensure legacy inputs expected by main.js exist and are populated from redesigned inputs
          try{
            const mapping = {
              'cmp-select-N':'pN',
              'cmp-select-K':'pK',
              'cmp-select-L':'pL',
              'cmp-select-A':'pA',
              'cmp-select-B':'pB'
            };
            Object.keys(mapping).forEach(function(legacyId){
              const srcId = mapping[legacyId];
              let legacy = document.getElementById(legacyId);
              const src = root.querySelector('#'+srcId);
              const val = src ? src.value : '';
              if(!legacy){
                legacy = document.createElement('input');
                legacy.type = 'hidden';
                legacy.id = legacyId;
                // append to body so main.js can find via document.getElementById
                document.body.appendChild(legacy);
              }
              legacy.value = val;
            });
            // Ensure run button containers expected by main.js exist (so .classList can be used)
            if(!document.getElementById('runBtn')){
              const rb = document.createElement('button');
              rb.id = 'runBtn';
              rb.className = 'hidden';
              document.body.appendChild(rb);
            }
            if(!document.getElementById('run-button-contain')){
              const rbc = document.createElement('div');
              rbc.id = 'run-button-contain';
              rbc.className = 'hidden';
              document.body.appendChild(rbc);
            }
            window.visualize_workload();
        // Allow Plotly to recompute sizes after the charts are visible
        setTimeout(function(){
          try{
            const chartNodes = document.querySelectorAll('[id^="chart_div"], [id^="inversion_chart_div"]');
            chartNodes.forEach(function(n){ if(window.Plotly && n) { try{ Plotly.Plots.resize(n); }catch(e){} } });
            // also trigger a window resize event for any listeners
            window.dispatchEvent(new Event('resize'));
          }catch(e){}
        }, 150);
          }catch(e){ console.warn('visualize_workload failed:', e); }
        }
      });
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
