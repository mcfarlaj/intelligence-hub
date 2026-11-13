/* Disruption Watch - Share Widget v2
   Drop-in share overlay for briefings, deep dives, spotlights, and scenarios.

   Usage: include <script src="share-widget.js"></script> before </body>
   Then call: DWShare.init({ title, summary, type, date })
   Or: auto-detects from page meta if no args given.
*/

(function () {
  'use strict';

  var DISCLAIMER = 'This content is shared from Disruption Watch, a strategic foresight publication. It is intended for professional discussion only and does not represent the views of any specific financial institution.';

  // Inject CSS
  var style = document.createElement('style');
  style.textContent = [
    '.dw-share-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#4F46E5;color:#fff;border:none;border-radius:5px;font-family:Inter,sans-serif;font-size:0.78rem;font-weight:600;cursor:pointer;transition:background 0.2s,transform 0.15s;letter-spacing:0.2px;white-space:nowrap;}',
    '.dw-share-btn:hover{background:#4338CA;transform:translateY(-1px);}',
    '.dw-share-btn svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}',
    '.dw-share-overlay{display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);align-items:center;justify-content:center;}',
    '.dw-share-overlay.active{display:flex;}',
    '.dw-share-modal{background:#fff;border-radius:12px;max-width:520px;width:90%;max-height:85vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);font-family:Inter,sans-serif;}',
    '.dw-share-header{padding:24px 24px 0;display:flex;align-items:center;justify-content:space-between;}',
    '.dw-share-header h3{font-family:"Playfair Display",Georgia,serif;font-size:1.3rem;font-weight:800;color:#1c1917;}',
    '.dw-share-close{background:none;border:none;font-size:1.5rem;cursor:pointer;color:#a8a29e;padding:4px 8px;line-height:1;}',
    '.dw-share-close:hover{color:#1c1917;}',
    '.dw-share-body{padding:20px 24px 24px;}',
    '.dw-share-type{display:inline-block;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;padding:3px 10px;border-radius:4px;margin-bottom:12px;}',
    '.dw-share-type.briefing{background:#EEF2FF;color:#4F46E5;}',
    '.dw-share-type.deep-dive{background:#FEF3C7;color:#D97706;}',
    '.dw-share-type.spotlight{background:#ECFDF5;color:#059669;}',
    '.dw-share-type.scenario{background:#FDF2F8;color:#DB2777;}',
    '.dw-share-type.weekly{background:#F0F9FF;color:#0891B2;}',
    '.dw-share-excerpt{background:#f5f5f4;border:1px solid #e7e5e4;border-radius:8px;padding:16px;margin-bottom:16px;position:relative;}',
    '.dw-share-excerpt-title{font-weight:700;font-size:0.95rem;color:#1c1917;margin-bottom:6px;}',
    '.dw-share-excerpt-summary{font-size:0.85rem;color:#57534e;line-height:1.6;}',
    '.dw-share-excerpt-date{font-size:0.75rem;color:#a8a29e;margin-top:8px;}',
    '.dw-share-excerpt-disclaimer{font-size:0.72rem;color:#a8a29e;font-style:italic;margin-top:10px;padding-top:10px;border-top:1px solid #e7e5e4;line-height:1.5;}',
    '.dw-share-actions{display:flex;flex-direction:column;gap:10px;}',
    '.dw-share-actions label{font-size:0.75rem;font-weight:600;color:#57534e;text-transform:uppercase;letter-spacing:1px;}',
    '.dw-share-row{display:flex;gap:10px;flex-wrap:wrap;}',
    '.dw-share-action{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:8px;font-size:0.82rem;font-weight:600;cursor:pointer;border:1px solid #e7e5e4;background:#fff;color:#1c1917;transition:all 0.2s;text-decoration:none;}',
    '.dw-share-action:hover{background:#f5f5f4;border-color:#d6d3d1;}',
    '.dw-share-action svg{width:18px;height:18px;flex-shrink:0;}',
    '.dw-share-action.copy-link{background:#0f172a;color:#fff;border-color:#0f172a;}',
    '.dw-share-action.copy-link:hover{background:#1e293b;}',
    '.dw-share-action.email{background:#4F46E5;color:#fff;border-color:#4F46E5;}',
    '.dw-share-action.email:hover{background:#4338CA;}',
    '.dw-share-action.linkedin{background:#0A66C2;color:#fff;border-color:#0A66C2;}',
    '.dw-share-action.linkedin:hover{background:#004182;}',
    '.dw-share-copied{display:none;font-size:0.78rem;color:#059669;font-weight:600;padding:6px 0;text-align:center;}',
    '.dw-share-copied.show{display:block;}'
  ].join('\n');
  document.head.appendChild(style);

  function truncate(text, max) {
    if (!text) return '';
    text = text.replace(/\s+/g, ' ').trim();
    return text.length > max ? text.substring(0, max) + '...' : text;
  }

  function detectPageMeta() {
    var title = document.title || '';
    var type = 'briefing';
    var summary = '';
    var date = '';

    if (title.indexOf('Deep Dive') !== -1 || title.indexOf('Joining the Dots') !== -1) {
      type = 'deep-dive';
    } else if (title.indexOf('Spotlight') !== -1 || title.indexOf('Week ') !== -1) {
      type = 'spotlight';
    } else if (title.indexOf('Scenario') !== -1 || title.indexOf('Canvas') !== -1) {
      type = 'scenario';
    } else if (title.indexOf('Weekly Synthesis') !== -1) {
      type = 'weekly';
    }

    // Try to extract summary from abstract or first paragraph
    var abstract = document.querySelector('.abstract');
    if (abstract) {
      summary = truncate(abstract.textContent, 280);
    } else {
      var heroSub = document.querySelector('.hero-subtitle');
      if (heroSub) {
        summary = truncate(heroSub.textContent, 280);
      } else {
        var headerSub = document.querySelector('.header-subtitle');
        if (headerSub) summary = truncate(headerSub.textContent, 280);
      }
    }

    // Extract date
    var dateEl = document.querySelector('.header-date, .subtitle, .hero-meta span');
    if (dateEl) date = dateEl.textContent.trim();

    // Clean title
    title = title.replace(/ - Joining the Dots.*$/, '').replace(/ \| Disruption Watch$/, '').replace(/^Disruption Watch - /, '');

    return { title: title, summary: summary, type: type, date: date };
  }

  function buildShareText(meta) {
    var lines = [];
    lines.push(meta.title);
    if (meta.date) lines.push(meta.date);
    lines.push('');
    if (meta.summary) lines.push(meta.summary);
    lines.push('');
    lines.push(window.location.href);
    lines.push('');
    lines.push(DISCLAIMER);
    return lines.join('\n');
  }

  function createOverlay(meta) {
    var overlay = document.createElement('div');
    overlay.className = 'dw-share-overlay';
    overlay.id = 'dwShareOverlay';

    var typeLabel = meta.type.replace('-', ' ');
    typeLabel = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1);

    overlay.innerHTML = [
      '<div class="dw-share-modal">',
      '  <div class="dw-share-header">',
      '    <h3>Share this content</h3>',
      '    <button class="dw-share-close" onclick="DWShare.close()">&times;</button>',
      '  </div>',
      '  <div class="dw-share-body">',
      '    <span class="dw-share-type ' + meta.type + '">' + typeLabel + '</span>',
      '    <div class="dw-share-excerpt">',
      '      <div class="dw-share-excerpt-title">' + meta.title.replace(/</g, '&lt;') + '</div>',
      (meta.summary ? '      <div class="dw-share-excerpt-summary">' + meta.summary.replace(/</g, '&lt;') + '</div>' : ''),
      (meta.date ? '      <div class="dw-share-excerpt-date">' + meta.date.replace(/</g, '&lt;') + '</div>' : ''),
      '      <div class="dw-share-excerpt-disclaimer">' + DISCLAIMER + '</div>',
      '    </div>',
      '    <div class="dw-share-actions">',
      '      <label>Share via</label>',
      '      <div class="dw-share-row">',
      '        <button class="dw-share-action copy-link" onclick="DWShare.copySnippet()">',
      '          <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
      '          Copy snippet',
      '        </button>',
      '        <button class="dw-share-action copy-link" onclick="DWShare.copyLink()" style="background:#334155;">',
      '          <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
      '          Copy link',
      '        </button>',
      '      </div>',
      '      <div class="dw-share-row">',
      '        <a class="dw-share-action email" href="' + buildMailto(meta) + '">',
      '          <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="none" stroke="currentColor" stroke-width="2"/><polyline points="22,6 12,13 2,6" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
      '          Email',
      '        </a>',
      '        <a class="dw-share-action linkedin" href="' + buildLinkedInUrl(meta) + '" target="_blank" rel="noopener">',
      '          <svg viewBox="0 0 24 24"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6z" fill="none" stroke="currentColor" stroke-width="2"/><rect x="2" y="9" width="4" height="12" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="4" cy="4" r="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
      '          LinkedIn',
      '        </a>',
      '      </div>',
      '      <div class="dw-share-copied" id="dwShareCopied">Copied to clipboard</div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');

    // Close on backdrop click
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) DWShare.close();
    });

    document.body.appendChild(overlay);
    return overlay;
  }

  function buildMailto(meta) {
    var subject = encodeURIComponent('Disruption Watch: ' + meta.title);
    var body = encodeURIComponent(buildShareText(meta));
    return 'mailto:?subject=' + subject + '&body=' + body;
  }

  function buildLinkedInUrl(meta) {
    return 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(window.location.href);
  }

  function createShareButton() {
    var btn = document.createElement('button');
    btn.className = 'dw-share-btn';
    btn.setAttribute('aria-label', 'Share this content');
    btn.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Share';
    btn.onclick = function () { DWShare.open(); };
    return btn;
  }

  function flashCopied() {
    var el = document.getElementById('dwShareCopied');
    if (el) {
      el.classList.add('show');
      setTimeout(function () { el.classList.remove('show'); }, 2000);
    }
  }

  // Public API
  var _meta = null;
  var _overlay = null;

  window.DWShare = {
    init: function (opts) {
      _meta = opts || detectPageMeta();

      // Create overlay
      _overlay = createOverlay(_meta);

      // INSERT SHARE BUTTON INTO NAV BAR
      // The nav-links div is the one consistent element across all page templates
      var navLinks = document.querySelector('.nav-links');
      if (navLinks) {
        navLinks.appendChild(createShareButton());
        return;
      }

      // Fallback: after nav div
      var nav = document.querySelector('.nav');
      if (nav) {
        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;justify-content:flex-end;max-width:1100px;margin:0 auto;padding:8px 24px 0;';
        wrapper.appendChild(createShareButton());
        nav.parentNode.insertBefore(wrapper, nav.nextSibling);
      }

      // Keyboard shortcut: Escape to close
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') DWShare.close();
      });
    },

    open: function () {
      if (_overlay) _overlay.classList.add('active');
    },

    close: function () {
      if (_overlay) _overlay.classList.remove('active');
    },

    copySnippet: function () {
      var text = buildShareText(_meta);
      navigator.clipboard.writeText(text).then(function () {
        flashCopied();
      }).catch(function () {
        // Fallback
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        flashCopied();
      });
    },

    copyLink: function () {
      navigator.clipboard.writeText(window.location.href).then(function () {
        flashCopied();
      }).catch(function () {
        var ta = document.createElement('textarea');
        ta.value = window.location.href;
        ta.style.cssText = 'position:fixed;left:-9999px;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        flashCopied();
      });
    }
  };
})();
