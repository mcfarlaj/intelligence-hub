/**
 * scenario-pdf.js — Disruption Watch Scenario PDF Generator (v3)
 *
 * Builds a multi-page A4 PDF using jsPDF with content-aware page breaks.
 * Extracts structured data from the scenario page DOM and lays it out
 * section by section, never splitting a block across pages.
 */

var ScenarioPDF = (function() {
  'use strict';

  // jsPDF is loaded via <script> tag in the HTML (before this file)

  // Colours
  var C = {
    dark:'#0f172a', accent:'#dc2626', indigo:'#4F46E5', green:'#059669',
    amber:'#D97706', muted:'#a8a29e', text:'#1c1917', textSec:'#57534e',
    border:'#e7e5e4', surface:'#f5f5f4', white:'#ffffff', purple:'#7C3AED'
  };

  // A4 portrait mm
  var PW=210, PH=297, ML=16, MR=16, MT=18, MB=18;
  var CW = PW-ML-MR;

  function rgb(hex){var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return[r,g,b];}
  function txt(el){return el?el.textContent.replace(/\s+/g,' ').trim():'';}
  function setC(d,c){var r=rgb(c);d.setTextColor(r[0],r[1],r[2]);}
  function fillR(d,x,y,w,h,c){var r=rgb(c);d.setFillColor(r[0],r[1],r[2]);d.rect(x,y,w,h,'F');}

  // Wrapped text, returns new Y. Will NOT split across pages — caller must ensure space.
  function wrap(d,text,x,y,w,lh){
    if(!text) return y;
    var lines=d.splitTextToSize(text,w);
    for(var i=0;i<lines.length;i++){d.text(lines[i],x,y);y+=lh;}
    return y;
  }

  // Measure how tall wrapped text will be
  function measureWrap(d,text,w,lh){
    if(!text) return 0;
    return d.splitTextToSize(text,w).length * lh;
  }

  // Page management
  var pageNum, doc;
  function newPage(){
    if(pageNum>0) drawFooter();
    doc.addPage(); pageNum++;
    return MT;
  }
  function ensure(y,needed){
    if(y+needed > PH-MB){ return newPage(); }
    return y;
  }
  function drawFooter(){
    doc.setFontSize(6.5); doc.setFont('helvetica','normal'); setC(doc,C.muted);
    doc.text('Disruption Watch  |  The Foresight Engine  |  Confidential',ML,PH-10);
    doc.text('Page '+pageNum,PW-MR,PH-10,{align:'right'});
  }

  // Section label
  function sectionLabel(y,label){
    y=ensure(y,14);
    doc.setFontSize(7); doc.setFont('helvetica','bold'); setC(doc,C.muted);
    doc.text(label.toUpperCase(),ML,y);
    y+=2; fillR(doc,ML,y,CW,0.3,C.border); y+=7;
    return y;
  }

  // =========== EXTRACT ===========
  function extract(){
    var d={};
    // Hero
    d.title = txt(document.querySelector('.hero-title, h1'));
    d.subtitle = txt(document.querySelector('.hero-subtitle'));
    d.kicker = txt(document.querySelector('.hero-kicker'));
    d.stats=[];
    document.querySelectorAll('.hero-stat, .stat-item').forEach(function(s){
      var n=txt(s.querySelector('.stat-number, .stat-num, .stat-value, strong'));
      var l=txt(s.querySelector('.stat-label, .stat-desc, span:last-child'));
      if(n) d.stats.push({n:n,l:l});
    });

    // Axes
    d.axes=[];
    document.querySelectorAll('.friction-axis, .axis-card').forEach(function(ax){
      var a={title:txt(ax.querySelector('.friction-title,.axis-title,h3')),acc:[],fri:[]};
      var cols=ax.querySelectorAll('.friction-column,.axis-column');
      if(cols.length>=2){
        cols[0].querySelectorAll('li').forEach(function(li){a.acc.push(txt(li));});
        cols[1].querySelectorAll('li').forEach(function(li){a.fri.push(txt(li));});
      }
      if(a.title) d.axes.push(a);
    });

    // Matrix
    d.matrix=[];
    document.querySelectorAll('.matrix-cell').forEach(function(c){
      d.matrix.push({
        name:txt(c.querySelector('.scenario-label, .matrix-name, h4, strong')),
        axis:txt(c.querySelector('.scenario-sublabel, .matrix-axis-x, .matrix-label, small'))
      });
    });

    // Scenarios
    d.scenarios=[];
    document.querySelectorAll('.scenarios-grid .scenario-card, .scenarios-section .scenario-card').forEach(function(c){
      var s={name:txt(c.querySelector('h3')), quad:txt(c.querySelector('.scenario-quadrant')),
        narr:txt(c.querySelector('.scenario-narrative, p.scenario-narrative')),
        imp:txt(c.querySelector('.scenario-implication')),
        indicators:[], personas:[]};
      c.querySelectorAll('.indicators-list li').forEach(function(li){s.indicators.push(txt(li));});
      c.querySelectorAll('.persona-tag').forEach(function(t){s.personas.push(txt(t));});
      if(s.name) d.scenarios.push(s);
    });

    // Wild card
    var wc=document.querySelector('.wildcard-card');
    if(wc){
      d.wildcard={name:txt(wc.querySelector('h3')),narr:txt(wc.querySelector('.scenario-narrative, p.scenario-narrative')),
        imp:txt(wc.querySelector('.scenario-implication')),indicators:[]};
      wc.querySelectorAll('.indicators-list li').forEach(function(li){d.wildcard.indicators.push(txt(li));});
    }

    // Personas
    d.personas=[];
    document.querySelectorAll('.persona-card').forEach(function(c){
      var p={name:txt(c.querySelector('.persona-name')),type:txt(c.querySelector('.persona-type')),scenarios:[]};
      c.querySelectorAll('.persona-scenario').forEach(function(ps){
        var sn=txt(ps.querySelector('.scenario-name'));
        var full=txt(ps);
        // Remove the scenario name from the full text to get just the narrative
        var narrative = full.replace(sn,'').trim();
        p.scenarios.push({scenario:sn, text:narrative});
      });
      if(p.name) d.personas.push(p);
    });

    // Wind tunnel — items are <li> inside .windtunnel-list
    d.wt=[];
    document.querySelectorAll('.windtunnel-subsection').forEach(function(sub){
      var sec={heading:txt(sub.querySelector('h3')),items:[]};
      sub.querySelectorAll('.windtunnel-list li, .windtunnel-item').forEach(function(it){
        // For <li> items, the full text is the content (no separate title/desc)
        var title = txt(it.querySelector('.windtunnel-title'));
        var desc = txt(it.querySelector('.windtunnel-description'));
        if(!title && !desc){
          // Plain <li> — use first sentence as title, rest as desc
          var full = txt(it);
          var colon = full.indexOf(':');
          if(colon > 0 && colon < 80){
            title = full.substring(0, colon);
            desc = full.substring(colon+1).trim();
          } else {
            title = '';
            desc = full;
          }
        }
        if(title || desc) sec.items.push({title:title, desc:desc});
      });
      if(sec.heading) d.wt.push(sec);
    });

    d.footerMeta=txt(document.querySelector('.footer-meta'));
    return d;
  }

  // =========== GENERATE ===========
  function generate(data){
    if(!window.jspdf || !window.jspdf.jsPDF){
      alert('PDF library failed to load. Please check your internet connection and try again.');
      return;
    }
    var jsPDF = window.jspdf.jsPDF;
    doc = new jsPDF({unit:'mm',format:'a4'});
    pageNum = 1;
    var y;

    // ===== TITLE PAGE =====
    fillR(doc,0,0,PW,90,C.dark);
    fillR(doc,ML,20,40,2,C.accent);
    doc.setFontSize(7);doc.setFont('helvetica','bold');setC(doc,C.accent);
    doc.text((data.kicker||'SCENARIO CANVAS').toUpperCase(),ML,30);

    doc.setFontSize(24);doc.setFont('helvetica','bold');doc.setTextColor(255,255,255);
    var tLines=doc.splitTextToSize(data.title||'Scenario Report',CW);
    y=42;
    tLines.forEach(function(l){doc.text(l,ML,y);y+=10;});

    if(data.subtitle){
      doc.setFontSize(10);doc.setFont('helvetica','normal');doc.setTextColor(148,163,184);
      var sLines=doc.splitTextToSize(data.subtitle,CW);
      sLines.forEach(function(l){doc.text(l,ML,y);y+=5;});
    }

    // Stats
    if(data.stats.length>0){
      fillR(doc,ML,93,CW,16,C.surface);
      var sw=CW/data.stats.length;
      data.stats.forEach(function(s,i){
        var sx=ML+(sw*i)+(sw/2);
        doc.setFontSize(13);doc.setFont('helvetica','bold');setC(doc,C.text);
        doc.text(s.n,sx,102,{align:'center'});
        doc.setFontSize(6);doc.setFont('helvetica','normal');setC(doc,C.muted);
        doc.text(s.l.toUpperCase(),sx,107,{align:'center'});
      });
    }

    y=118;

    // ===== AXES =====
    if(data.axes.length>0){
      y=sectionLabel(y,'The Two Axes');
      data.axes.forEach(function(ax){
        var blockH = 12 + Math.max(ax.acc.length, ax.fri.length)*4.5 + 6;
        y=ensure(y, blockH);
        doc.setFontSize(9);doc.setFont('helvetica','bold');setC(doc,C.indigo);
        doc.text(ax.title,ML,y); y+=6;
        var colW=(CW-8)/2;

        doc.setFontSize(6.5);doc.setFont('helvetica','bold');
        setC(doc,C.green); doc.text('ACCELERANTS',ML,y);
        setC(doc,C.accent); doc.text('FRICTIONS',ML+colW+8,y);
        y+=4;

        doc.setFontSize(7);doc.setFont('helvetica','normal');setC(doc,C.textSec);
        var ay=y, fy=y;
        ax.acc.forEach(function(a){doc.text('+ '+a,ML+1,ay,{maxWidth:colW-2});ay+=4.5;});
        ax.fri.forEach(function(f){doc.text('- '+f,ML+colW+9,fy,{maxWidth:colW-2});fy+=4.5;});
        y=Math.max(ay,fy)+4;
      });
    }

    // ===== 2x2 MATRIX =====
    if(data.matrix.length>=4){
      y=ensure(y,50);
      y=sectionLabel(y,'Scenario Matrix');
      var mw=(CW-4)/2, mh=16;
      var mCols=[C.indigo,C.accent,C.green,C.surface];
      var mTxt=[C.white,C.white,C.white,C.text];
      for(var mi=0;mi<4;mi++){
        var col=mi%2, row=Math.floor(mi/2);
        var mx=ML+(col*(mw+4)), my=y+(row*(mh+3));
        fillR(doc,mx,my,mw,mh,mCols[mi]);
        setC(doc,mTxt[mi]);
        doc.setFontSize(8.5);doc.setFont('helvetica','bold');
        doc.text(data.matrix[mi].name||'Scenario '+'ABCD'[mi],mx+4,my+7);
        doc.setFontSize(6);doc.setFont('helvetica','normal');
        if(data.matrix[mi].axis) doc.text(data.matrix[mi].axis,mx+4,my+12);
      }
      y+=(mh*2)+10;
    }

    // ===== SCENARIOS (each starts on fresh page if needed) =====
    if(data.scenarios.length>0){
      y=newPage();
      y=sectionLabel(y,'The Four Scenarios');

      data.scenarios.forEach(function(sc,idx){
        // Estimate height needed for this scenario block
        doc.setFontSize(8);
        var estH = 8; // name + quad
        estH += measureWrap(doc, sc.narr, CW-4, 4) + 4;
        if(sc.indicators.length) estH += 4 + sc.indicators.length*4;
        if(sc.imp){
          doc.setFontSize(7);
          estH += measureWrap(doc, sc.imp, CW-8, 3.8) + 8;
        }
        estH += 8;

        // If it won't fit, start a new page
        y = ensure(y, Math.min(estH, 120));

        // Coloured left bar
        fillR(doc,ML,y-3,2,6,idx<2?C.indigo:idx===2?C.green:C.muted);

        doc.setFontSize(11);doc.setFont('helvetica','bold');setC(doc,C.text);
        doc.text(sc.name,ML+5,y); y+=4;
        if(sc.quad){
          doc.setFontSize(6.5);doc.setFont('helvetica','normal');setC(doc,C.indigo);
          doc.text(sc.quad,ML+5,y); y+=5;
        }

        // Narrative
        doc.setFontSize(8);doc.setFont('helvetica','normal');setC(doc,C.textSec);
        y=wrap(doc,sc.narr,ML+2,y,CW-4,4); y+=3;

        // Indicators
        if(sc.indicators.length>0){
          y=ensure(y,sc.indicators.length*4+6);
          doc.setFontSize(6.5);doc.setFont('helvetica','bold');setC(doc,C.muted);
          doc.text('LEADING INDICATORS',ML+2,y); y+=4;
          doc.setFontSize(7);doc.setFont('helvetica','normal');setC(doc,C.textSec);
          sc.indicators.forEach(function(ind){
            y=ensure(y,5);
            doc.text('\u2022 '+ind,ML+4,y,{maxWidth:CW-8}); y+=4;
          });
          y+=2;
        }

        // Implication
        if(sc.imp){
          doc.setFontSize(7);
          var impH = measureWrap(doc, sc.imp, CW-8, 3.8) + 8;
          y=ensure(y, impH);
          fillR(doc,ML+2,y-1,CW-4,0.3,C.indigo); y+=3;
          doc.setFont('helvetica','normal');setC(doc,C.textSec);
          y=wrap(doc,sc.imp,ML+4,y,CW-8,3.8); y+=3;
        }

        y+=6;
      });
    }

    // ===== WILD CARD =====
    if(data.wildcard){
      doc.setFontSize(8);
      var wcH = 20 + measureWrap(doc, data.wildcard.narr, CW-4, 4) + (data.wildcard.indicators.length*4) + 20;
      y=ensure(y, Math.min(wcH, 100));
      fillR(doc,ML,y-2,CW,0.5,C.amber); y+=4;
      doc.setFontSize(7);doc.setFont('helvetica','bold');setC(doc,C.amber);
      doc.text('WILD CARD',ML,y); y+=5;
      doc.setFontSize(11);doc.setFont('helvetica','bold');setC(doc,C.text);
      doc.text(data.wildcard.name,ML,y); y+=5;
      doc.setFontSize(8);doc.setFont('helvetica','normal');setC(doc,C.textSec);
      y=wrap(doc,data.wildcard.narr,ML+2,y,CW-4,4); y+=3;
      if(data.wildcard.indicators.length>0){
        doc.setFontSize(6.5);doc.setFont('helvetica','bold');setC(doc,C.muted);
        doc.text('LEADING INDICATORS',ML+2,y); y+=4;
        doc.setFontSize(7);doc.setFont('helvetica','normal');setC(doc,C.textSec);
        data.wildcard.indicators.forEach(function(ind){
          y=ensure(y,5);
          doc.text('\u2022 '+ind,ML+4,y,{maxWidth:CW-8}); y+=4;
        });
      }
      if(data.wildcard.imp){
        y+=2;
        doc.setFontSize(7);doc.setFont('helvetica','normal');setC(doc,C.textSec);
        y=wrap(doc,data.wildcard.imp,ML+4,y,CW-8,3.8);
      }
      y+=6;
    }

    // ===== PERSONA IMPACTS =====
    if(data.personas.length>0){
      y=newPage();
      y=sectionLabel(y,'Persona Impacts Across Scenarios');

      data.personas.forEach(function(p){
        // Estimate height: header + all scenario lines
        doc.setFontSize(7);
        var estH = 10;
        p.scenarios.forEach(function(ps){
          estH += 5 + measureWrap(doc, ps.text, CW-12, 3.5) + 2;
        });

        // If one persona block won't fit, new page
        y=ensure(y, Math.min(estH, 90));

        // Name + type
        doc.setFontSize(10);doc.setFont('helvetica','bold');setC(doc,C.text);
        doc.text(p.name,ML,y);
        doc.setFontSize(7.5);doc.setFont('helvetica','normal');setC(doc,C.muted);
        doc.text('  '+p.type,ML+doc.getTextWidth(p.name)+2,y);
        y+=6;

        p.scenarios.forEach(function(ps){
          doc.setFontSize(7);
          var lineH = 4 + measureWrap(doc, ps.text, CW-12, 3.5) + 2;
          y=ensure(y, lineH);
          doc.setFont('helvetica','bold');setC(doc,C.indigo);
          doc.text(ps.scenario,ML+3,y); y+=3.5;
          doc.setFont('helvetica','normal');setC(doc,C.textSec);
          y=wrap(doc,ps.text,ML+3,y,CW-12,3.5);
          y+=2;
        });

        y+=4;
      });
    }

    // ===== WIND TUNNEL =====
    if(data.wt.length>0){
      y=newPage();
      y=sectionLabel(y,'Wind Tunnel: Strategy Across Scenarios');

      var wtColours = [C.green, C.accent, C.indigo, C.amber];
      data.wt.forEach(function(sec,si){
        // Estimate block height
        doc.setFontSize(7.5);
        var estH = 12;
        sec.items.forEach(function(it){
          estH += 5 + measureWrap(doc, it.desc, CW-8, 3.8) + 4;
        });

        y=ensure(y, Math.min(estH, 80));

        var colour = wtColours[si] || C.text;
        fillR(doc,ML,y-1,2,6,colour);
        doc.setFontSize(9);doc.setFont('helvetica','bold');setC(doc,colour);
        doc.text(sec.heading,ML+5,y+3); y+=10;

        sec.items.forEach(function(it){
          doc.setFontSize(7.5);
          var itemH = (it.title ? 5 : 0) + measureWrap(doc, it.desc, CW-8, 3.8) + 4;
          y=ensure(y, itemH);
          if(it.title){
            doc.setFontSize(8);doc.setFont('helvetica','bold');setC(doc,C.text);
            doc.text(it.title,ML+3,y); y+=4;
          }
          doc.setFont('helvetica','normal');doc.setFontSize(7.5);setC(doc,C.textSec);
          y=wrap(doc,it.desc,ML+3,y,CW-8,3.8);
          y+=4;
        });

        y+=4;
      });
    }

    // Footer on last content page
    drawFooter();

    // ===== BACK PAGE =====
    doc.addPage();
    fillR(doc,0,0,PW,PH,C.dark);
    doc.setFontSize(26);doc.setFont('helvetica','bold');doc.setTextColor(255,255,255);
    doc.text('Disruption',PW/2,PH/2-10,{align:'center'});
    setC(doc,C.indigo);doc.setFontSize(26);
    doc.text('Watch',PW/2,PH/2+4,{align:'center'});
    doc.setFontSize(8);doc.setFont('helvetica','normal');setC(doc,C.muted);
    doc.text('The Foresight Engine',PW/2,PH/2+14,{align:'center'});
    doc.text('Confidential',PW/2,PH/2+21,{align:'center'});
    if(data.footerMeta) doc.text(data.footerMeta,PW/2,PH/2+28,{align:'center'});

    // Save
    var fn=(data.title||'scenario').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'.pdf';
    doc.save(fn);
  }

  // =========== UI ===========
  function addButtons(){
    var btn=document.createElement('button');
    btn.id='pdf-download-btn';
    btn.innerHTML='\u2B73 Download PDF';
    btn.style.cssText='position:fixed;bottom:24px;right:24px;z-index:9999;background:#0f172a;color:#fff;border:none;padding:12px 20px;border-radius:8px;font-family:Inter,system-ui,sans-serif;font-size:0.82rem;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.2);transition:transform 0.15s,box-shadow 0.15s;';
    btn.onmouseenter=function(){this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.3)';};
    btn.onmouseleave=function(){this.style.transform='';this.style.boxShadow='0 4px 16px rgba(0,0,0,0.2)';};
    btn.onclick=function(e){
      e.preventDefault();e.stopPropagation();
      if(!window.jspdf || !window.jspdf.jsPDF){
        alert('PDF library failed to load. Please check your internet connection and refresh the page.');
        return;
      }
      btn.textContent='Generating...';btn.style.pointerEvents='none';
      setTimeout(function(){
        try{
          var data = extract();
          if(!data.title && !data.scenarios.length){
            alert('Could not extract scenario data from this page. The page content may not have loaded yet.');
            btn.innerHTML='\u2B73 Download PDF';btn.style.pointerEvents='';
            return;
          }
          generate(data);
        }catch(err){
          console.error('PDF error:',err);
          alert('PDF generation failed: '+err.message);
        }
        btn.innerHTML='\u2B73 Download PDF';btn.style.pointerEvents='';
      },100);
    };

    var pb=document.createElement('button');
    pb.id='pdf-print-btn';
    pb.innerHTML='\uD83D\uDDB6 Print';
    pb.style.cssText='position:fixed;bottom:24px;right:190px;z-index:9999;background:#fff;color:#1c1917;border:1px solid #e7e5e4;padding:12px 20px;border-radius:8px;font-family:Inter,system-ui,sans-serif;font-size:0.82rem;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.08);transition:transform 0.15s;';
    pb.onmouseenter=function(){this.style.transform='translateY(-2px)';};
    pb.onmouseleave=function(){this.style.transform='';};
    pb.onclick=function(e){e.preventDefault();window.print();};

    document.body.appendChild(pb);
    document.body.appendChild(btn);
  }

  function addPrintCSS(){
    var s=document.createElement('style');
    s.textContent='@media print{#pdf-download-btn,#pdf-print-btn,.nav,footer,.share-widget,.sc-pdf-btn{display:none!important}body{background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.hero{break-after:page}.matrix-section{break-before:page}.personas-section{break-before:page}.windtunnel-section{break-before:page}}';
    document.head.appendChild(s);
  }

  function init(){
    addPrintCSS();
    addButtons();
    if(window.location.search.indexOf('pdf=1')>-1){
      setTimeout(function(){try{generate(extract());}catch(e){console.error(e);}},500);
    }
  }

  return{init:init,download:function(){generate(extract());}};
})();
