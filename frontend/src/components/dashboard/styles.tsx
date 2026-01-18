import React from 'react';

// Inline style tag to keep component self-contained; can be migrated to CSS modules later
export function DashboardStyles() {
  return (
    <style>{`
    :root {
      --sd-free: #1B9E77;
      --sd-free-dark: #12775A;
      --sd-free-soft: #E6F4F1;

      --sd-occ: #D95F02;
      --sd-occ-dark: #A54801;
      --sd-occ-soft: #FBEDE3;

      --sd-nd: #757575;
      --sd-nd-dark: #555555;
      --sd-nd-soft: #EEEEEE;

      --sd-bg: #ffffff;
      --sd-text: #1a1a1a;
      --sd-muted: #666666;
      --sd-border: #e5e5e5;
      --sd-primary: #2563eb;
    }

    .sd-dashboard { display:flex; flex-direction:column; min-height:100dvh; background:var(--sd-bg); color:var(--sd-text); }
    .sd-header { position:sticky; top:0; height:56px; display:flex; align-items:center; justify-content:space-between; padding:0 12px; border-bottom:1px solid var(--sd-border); background:var(--sd-bg); z-index:10; }
    .sd-title { font-size:18px; margin:0; }
    .sd-actions { display:flex; gap:8px; }
    .sd-btn { height:36px; padding:0 12px; border-radius:8px; border:1px solid var(--sd-border); background:#f9f9f9; color:var(--sd-text); }
    .sd-btn:focus { outline:2px solid var(--sd-primary); outline-offset:2px; }
    .sd-btn-refresh { width:36px; padding:0; font-size:18px; }
    .sd-btn.sd-primary { background:var(--sd-primary); color:#fff; border-color:var(--sd-primary); }
    .sd-btn:disabled { opacity:0.6; cursor:not-allowed; }

    .sd-main { flex:1; padding:12px; }
    .sd-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; }

    .sd-cell { position:relative; min-height:84px; border-radius:12px; border:2px solid transparent; display:flex; align-items:center; justify-content:center; gap:6px; font-weight:600; }
    .sd-cell .sd-cell-label { font-size:14px; }
    .sd-cell .sd-cell-icon { position:absolute; top:8px; right:10px; font-size:14px; opacity:0.8; }
    .sd-cell:focus { outline:2px solid var(--sd-primary); outline-offset:2px; }

    .sd-cell.sd-free { background:var(--sd-free-soft); color:var(--sd-free-dark); border-color: var(--sd-free); }
    .sd-cell.sd-occupied { background:var(--sd-occ-soft); color:var(--sd-occ-dark); border-color: var(--sd-occ); }
    .sd-cell.sd-unavailable { background:var(--sd-nd-soft); color:var(--sd-nd-dark); border-color: var(--sd-nd); }

    .sd-cell.is-selected { box-shadow: 0 0 0 3px rgba(37,99,235,0.25) inset; }

    .sd-legend { position:sticky; bottom:0; background:var(--sd-bg); border-top:1px solid var(--sd-border); padding:8px 12px; display:flex; gap:8px; align-items:center; justify-content:space-between; }
    .sd-chip { display:inline-flex; align-items:center; gap:6px; border-radius:999px; padding:6px 10px; font-size:12px; font-weight:600; border:1px solid transparent; }
    .sd-chip.sd-free { color:#fff; background:var(--sd-free); border-color:var(--sd-free-dark); }
    .sd-chip.sd-occupied { color:#fff; background:var(--sd-occ); border-color:var(--sd-occ-dark); }
    .sd-chip.sd-unavailable { color:#fff; background:var(--sd-nd); border-color:var(--sd-nd-dark); }

    .sd-fab { position:fixed; right:16px; bottom:80px; width:56px; height:56px; border-radius:50%; border:none; background:var(--sd-primary); color:#fff; font-size:20px; box-shadow: 0 8px 20px rgba(0,0,0,0.15); }
    .sd-fab:focus { outline:2px solid #fff; outline-offset:2px; }

    /* Bottom sheet for selected desk */
    .sd-sheet { position:fixed; left:0; right:0; bottom:0; background:var(--sd-bg); border-top-left-radius:16px; border-top-right-radius:16px; box-shadow: 0 -8px 24px rgba(0,0,0,0.2); padding:12px; animation: sd-slide-up 200ms ease-out; }
    @media (prefers-reduced-motion: reduce) { .sd-sheet { animation:none; } }
    @keyframes sd-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }

    .sd-sheet-title { margin:8px 0 4px; font-size:18px; }
    .sd-sheet-sub { margin:0 0 12px; color:var(--sd-muted); font-size:12px; }
    .sd-sheet-actions { display:flex; gap:8px; }

    .sd-badge { display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px; font-weight:700; color:#fff; }
    .sd-badge.sd-free { background: var(--sd-free); }
    .sd-badge.sd-occupied { background: var(--sd-occ); }
    .sd-badge.sd-unavailable { background: var(--sd-nd); }

    /* Responsive */
    @media (min-width: 600px) {
      .sd-grid { grid-template-columns: repeat(4, 1fr); max-width: 920px; margin: 0 auto; }
      .sd-fab { display:none; }
      .sd-legend { position:static; border-top:none; justify-content:flex-start; gap:12px; }
    }

    @media (min-width: 1024px) {
      .sd-main { display:grid; grid-template-columns: 2fr 1fr; gap:16px; }
      .sd-grid { grid-template-columns: repeat(6, 1fr); }
    }

    /* Very small screens fallback */
    @media (max-width: 360px), (max-height: 480px) {
      .sd-grid { grid-template-columns: repeat(2, 1fr); }
      .sd-cell { min-height:64px; }
    }
  `}</style>
  );
}
