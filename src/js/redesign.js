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

  // Ensure legacy hidden inputs and placeholders exist and are populated from redesigned inputs
  function ensureLegacyInputs() {
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
      const src = document.querySelector('#'+srcId);
      const val = src ? src.value : '';
      if(!legacy){
        legacy = document.createElement('input');
        legacy.type = 'hidden';
        legacy.id = legacyId;
        document.body.appendChild(legacy);
      }
      legacy.value = val;
    });

    // Ensure run button container and runBtn placeholder exist for main.js
    if(!document.getElementById('run-button-contain')){
      const rbc = document.createElement('div');
      rbc.id = 'run-button-contain'; rbc.className = 'hidden'; document.body.appendChild(rbc);
    }
    if(!document.getElementById('runBtn')){
      const rb = document.createElement('button'); rb.id = 'runBtn'; rb.className = 'hidden'; document.body.appendChild(rb);
    }

    // Ensure dashed-line exists (main.js toggles this). Keep it hidden visually.
    if(!document.getElementById('dashed-line')){
      const dl = document.createElement('div');
      dl.id = 'dashed-line';
      dl.style.display = 'none';
      document.body.appendChild(dl);
    }
  }

  // expose for callers that execute before this script is parsed
  window.ensureLegacyInputs = ensureLegacyInputs;

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

    // Show animations container when the Run button is clicked.
    // Handle both the redesign's `#btn-run` (in-root) and the legacy `#runBtn` which may be
    // created dynamically and appended to document.body by the adapter logic.
    if(btnRun){
      btnRun.addEventListener('click', function(){
        const anim = document.getElementById('animations-div') || root.querySelector('#animations-div');
        if(anim){ anim.classList.remove('hidden'); anim.style.display = ''; anim.scrollIntoView({behavior:'smooth', block:'start'}); }
        const results = document.getElementById('results-panel') || root.querySelector('#results-panel');
        if(results){ results.classList.remove('hidden'); results.style.display = ''; }
        // Ensure legacy inputs exist/populated, then call the core run function to start the animation.
        try{ ensureLegacyInputs(); if(typeof window.run_operations === 'function'){ window.run_operations(); } }catch(e){ console.warn('run_operations call failed', e); }
      });
    }

    // Delegated handler: catches clicks on dynamically-created legacy run elements (id 'runBtn')
    document.addEventListener('click', function(e){
      const id = (e && e.target && e.target.id) || '';
      if(id === 'runBtn' || id === 'btn-run'){
        const anim = document.getElementById('animations-div') || root.querySelector('#animations-div');
        if(anim){ anim.classList.remove('hidden'); anim.style.display = ''; }
        const results = document.getElementById('results-panel') || root.querySelector('#results-panel');
        if(results){ results.classList.remove('hidden'); results.style.display = ''; }
        try{ ensureLegacyInputs(); if(typeof window.run_operations === 'function'){ window.run_operations(); } }catch(e){ console.warn('run_operations call failed', e); }
      }
    });

    // Attach local click listeners to playback buttons to keep UI state in sync.
    try{
      const btnIds = ['stop-button','continue-button','reset-button','nextstep-button'];
      btnIds.forEach(function(bid){
        const b = root.querySelector('#'+bid);
        if(b){
          b.addEventListener('click', function(){
            // manage .on state (single selected)
            btnIds.forEach(function(other){ const ob = root.querySelector('#'+other); if(ob) ob.classList.remove('on'); });
            b.classList.add('on');
            // update badge appropriately
            if(bid === 'stop-button') setPlaybackBadge('paused');
            if(bid === 'continue-button') setPlaybackBadge('running');
          });
        }
      });
    }catch(e){/* ignore */}
  }

  // Force Plotly re-render of existing charts (useful when charts were created while ancestors were hidden)
  function forcePlotlyRedrawAll() {
    if(!window.Plotly) return;
    const selector = '[id^="chart_div"], [id^="inversion_chart_div"]';
    const nodes = Array.prototype.slice.call(document.querySelectorAll(selector));

    function tryRedrawNode(n){
      if(!n) return;
      try{
        // Best-effort: try several common properties where Plotly may have stored data/layout
        const possibleData = n.data || n._fullData || n._data || n.__data || (n._glplot && n._glplot._fullData) || null;
        const possibleLayout = n.layout || n._fullLayout || n._layout || null;

        if(possibleData && possibleLayout){
          try{ Plotly.react(n, possibleData, possibleLayout); console.log('Plotly.react used for', n.id); return; }catch(e){ /* continue to fallbacks */ }
        }

        // Try relayout/redraw which operate on existing internal plot state
        try{ Plotly.relayout(n, {}); }catch(e){}
        try{ Plotly.redraw(n); }catch(e){}
        try{ Plotly.Plots.resize(n); }catch(e){}
      }catch(e){ console.warn('tryRedrawNode failed for', n && n.id, e); }
    }

    // First-pass: immediate attempt
    nodes.forEach(tryRedrawNode);

    // Second-pass: retry after a short delay (some browsers need a tick for styles to settle)
    setTimeout(function(){ nodes.forEach(tryRedrawNode); }, 150);
    // Final attempt after a slightly longer delay
    setTimeout(function(){ nodes.forEach(tryRedrawNode); }, 500);
  }

  // expose helper for external shims
  window.forcePlotlyRedrawAll = forcePlotlyRedrawAll;

  // Playback badge updater and wrappers for pause/play to keep UI in sync
  function setPlaybackBadge(state){
    try{
      const badge = document.querySelector('.redesign #buttons-container .badge');
      if(!badge) return;
      if(state === 'running'){
        badge.classList.remove('paused'); badge.classList.add('running');
        badge.innerHTML = '<span class="dot"></span> Running';
      } else if(state === 'paused'){
        badge.classList.remove('running'); badge.classList.add('paused');
        badge.innerHTML = '<span class="dot"></span> Paused';
      }
    }catch(e){/* ignore */}
  }

  // Wrap existing handlers so badge updates whenever play/pause are triggered
  try{
    if(typeof window.stop_button === 'function'){
      const _origStop = window.stop_button;
      window.stop_button = function(){
        const res = _origStop.apply(this, arguments);
        setPlaybackBadge('paused');
        return res;
      };
    }
    if(typeof window.continue_button === 'function'){
      const _origContinue = window.continue_button;
      window.continue_button = function(){
        const res = _origContinue.apply(this, arguments);
        setPlaybackBadge('running');
        return res;
      };
    }
  }catch(e){ /* ignore */ }

  // Reveal `#results-gap` when run_operations is invoked, and hide on reset
  try{
    if(typeof window.run_operations === 'function'){
      const _origRun = window.run_operations;
      window.run_operations = function(){
        // call original run logic
        const res = _origRun.apply(this, arguments);
        try{
          const rg = document.querySelector('.redesign #results-gap');
          if(rg){ rg.classList.add('visible'); }
        }catch(e){}
        return res;
      };
    }
  }catch(e){ /* ignore */ }

  try{
    if(typeof window.reset_button === 'function'){
      const _origReset = window.reset_button;
      window.reset_button = function(){
        const res = _origReset.apply(this, arguments);
        try{
          const rg = document.querySelector('.redesign #results-gap');
          if(rg){ rg.classList.remove('visible'); }
        }catch(e){}
        return res;
      };
    }
  }catch(e){ /* ignore */ }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
