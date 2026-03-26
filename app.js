@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --bg:#07090f; --s1:#0e1118; --s2:#161b27; --s3:#1e2535;
  --border:#252d3f; --gold:#e8b04b; --gold2:#f5d08a;
  --teal:#2dd4bf; --red:#f87171; --green:#4ade80;
  --blue:#60a5fa; --purple:#a78bfa;
  --text:#eef0f6; --muted:#5a6480; --muted2:#8892aa;
  --ff-h:'Syne',sans-serif; --ff-b:'Outfit',sans-serif; --ff-m:'JetBrains Mono',monospace;
  --r:10px; --shadow:0 4px 24px rgba(0,0,0,.4);
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{font-family:var(--ff-b);background:var(--bg);color:var(--text);font-size:14px;line-height:1.5;overflow-x:hidden}

/* LOADING */
#loading-screen{position:fixed;inset:0;z-index:9999;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}
.loader-logo{font-family:var(--ff-h);font-size:42px;font-weight:800;color:var(--gold);letter-spacing:3px}
.loader-ring{width:40px;height:40px;border-radius:50%;border:3px solid var(--border);border-top-color:var(--gold);animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* AUTH */
#auth-screen{display:none;position:fixed;inset:0;background:radial-gradient(ellipse at 20% 10%,#111827 0%,var(--bg) 70%);align-items:center;justify-content:center}
.auth-card{width:420px;max-width:95vw;background:var(--s1);border:1px solid var(--border);border-radius:20px;padding:40px 36px;position:relative;overflow:hidden;box-shadow:var(--shadow)}
.auth-card::after{content:'';position:absolute;inset:0;border-radius:20px;background:linear-gradient(135deg,rgba(232,176,75,.06) 0%,transparent 60%);pointer-events:none}
.auth-brand{font-family:var(--ff-h);font-size:32px;font-weight:800;color:var(--gold);letter-spacing:2px}
.auth-tagline{color:var(--muted2);font-size:13px;margin-bottom:28px}
.auth-switcher{display:flex;background:var(--s2);border-radius:10px;padding:3px;margin-bottom:24px}
.auth-sw-btn{flex:1;padding:8px;border:none;background:none;color:var(--muted2);font-family:var(--ff-b);font-size:13px;font-weight:500;border-radius:8px;cursor:pointer;transition:all .2s}
.auth-sw-btn.on{background:var(--s3);color:var(--text);box-shadow:0 1px 6px rgba(0,0,0,.4)}

/* FORMS */
.fg{margin-bottom:14px}
.fg label{display:block;font-size:11px;color:var(--muted2);text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px}
.fg input,.fg select,.fg textarea{width:100%;padding:10px 14px;background:var(--s2);border:1px solid var(--border);border-radius:var(--r);color:var(--text);font-family:var(--ff-b);font-size:14px;outline:none;transition:border-color .2s}
.fg input:focus,.fg select:focus,.fg textarea:focus{border-color:var(--teal)}
.fg select option{background:var(--s2)}
.fg input[type="file"]{padding:8px;font-size:13px}

/* BUTTONS */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 20px;border:none;border-radius:var(--r);font-family:var(--ff-b);font-size:13px;font-weight:600;cursor:pointer;transition:all .18s;white-space:nowrap}
.btn-gold{background:var(--gold);color:#000}.btn-gold:hover{background:var(--gold2);transform:translateY(-1px)}
.btn-teal{background:rgba(45,212,191,.15);color:var(--teal);border:1px solid rgba(45,212,191,.3)}.btn-teal:hover{background:rgba(45,212,191,.25)}
.btn-red{background:rgba(248,113,113,.15);color:var(--red);border:1px solid rgba(248,113,113,.3)}.btn-red:hover{background:rgba(248,113,113,.25)}
.btn-ghost{background:var(--s2);color:var(--muted2);border:1px solid var(--border)}.btn-ghost:hover{color:var(--text);border-color:var(--gold)}
.btn-blue{background:rgba(96,165,250,.15);color:var(--blue);border:1px solid rgba(96,165,250,.3)}.btn-blue:hover{background:rgba(96,165,250,.25)}
.btn-sm{padding:6px 12px;font-size:12px}.btn-xs{padding:4px 10px;font-size:11px}.btn-full{width:100%}
.btn:disabled{opacity:.5;cursor:not-allowed;transform:none!important}

/* LAYOUT */
#app{display:none;height:100vh;overflow:hidden}
.layout{display:flex;height:100%}

/* SIDEBAR */
.sidebar{width:230px;flex-shrink:0;height:100%;background:var(--s1);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow-y:auto}
.sb-brand{padding:22px 18px 18px;border-bottom:1px solid var(--border)}
.sb-logo{font-family:var(--ff-h);font-size:22px;font-weight:800;color:var(--gold)}
.sb-sub{font-size:11px;color:var(--muted);margin-top:1px}
.sb-nav{padding:10px 8px;flex:1}
.sb-section{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;padding:10px 10px 4px}
.ni{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;color:var(--muted2);font-size:13px;font-weight:500;transition:all .15s;margin-bottom:1px;user-select:none}
.ni:hover{background:var(--s2);color:var(--text)}.ni.on{background:rgba(232,176,75,.1);color:var(--gold)}
.ni .ico{flex-shrink:0;width:16px;height:16px}
.sb-foot{padding:14px 18px;border-top:1px solid var(--border)}
.sb-user-name{font-weight:600;font-size:13px}
.sb-user-role{display:inline-block;margin:4px 0 10px;font-size:10px;padding:2px 10px;border-radius:99px;font-weight:600}
.role-admin{background:rgba(232,176,75,.15);color:var(--gold)}
.role-member{background:rgba(96,165,250,.12);color:var(--blue)}

/* MAIN */
.main{flex:1;height:100%;overflow-y:auto}
.page{display:none;padding:30px 36px;animation:fadeUp .25s ease}
.page.on{display:block}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.ph{margin-bottom:26px}
.ph-row{display:flex;justify-content:space-between;align-items:flex-start}
.pt{font-family:var(--ff-h);font-size:30px;font-weight:800;letter-spacing:.5px}
.ps{color:var(--muted2);font-size:13px;margin-top:3px}

/* CARDS */
.card{background:var(--s1);border:1px solid var(--border);border-radius:14px;padding:20px}
.card-t{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:14px}

/* STATS */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:24px}
.sc{background:var(--s1);border:1px solid var(--border);border-radius:14px;padding:18px 20px}
.sc-l{font-size:11px;color:var(--muted2);text-transform:uppercase;letter-spacing:.5px}
.sc-v{font-family:var(--ff-h);font-size:38px;font-weight:800;line-height:1;margin:6px 0 2px;color:var(--gold)}
.sc-s{font-size:11px;color:var(--muted)}

/* GRID */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}

/* TABLE */
.tw{overflow-x:auto;border:1px solid var(--border);border-radius:14px}
table{width:100%;border-collapse:collapse}
thead th{background:var(--s2);padding:11px 16px;text-align:left;font-size:11px;color:var(--muted2);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border);font-weight:600}
tbody tr{border-bottom:1px solid var(--border);transition:background .12s}
tbody tr:last-child{border-bottom:none}
tbody tr:hover{background:rgba(255,255,255,.02)}
tbody td{padding:12px 16px;font-size:13px;vertical-align:middle}

/* BADGES */
.b{display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600}
.b-green{background:rgba(74,222,128,.12);color:var(--green)}
.b-red{background:rgba(248,113,113,.12);color:var(--red)}
.b-gold{background:rgba(232,176,75,.12);color:var(--gold)}
.b-blue{background:rgba(96,165,250,.12);color:var(--blue)}
.b-teal{background:rgba(45,212,191,.12);color:var(--teal)}
.b-purple{background:rgba(167,139,250,.12);color:var(--purple)}
.b-gray{background:rgba(90,100,128,.15);color:var(--muted2)}

/* MODAL */
.ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);z-index:1000;align-items:center;justify-content:center}
.ov.on{display:flex}
.modal{background:var(--s1);border:1px solid var(--border);border-radius:18px;padding:30px;width:520px;max-width:96vw;max-height:88vh;overflow-y:auto;position:relative;box-shadow:var(--shadow)}
.modal-t{font-family:var(--ff-h);font-size:22px;font-weight:700;margin-bottom:20px}
.mc{position:absolute;top:14px;right:14px;width:28px;height:28px;border-radius:50%;background:var(--s2);border:none;color:var(--muted2);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.mc:hover{color:var(--text)}

/* TOURNAMENT CARD */
.tc{background:var(--s1);border:1px solid var(--border);border-radius:14px;overflow:hidden;cursor:pointer;transition:border-color .2s,transform .2s,box-shadow .2s}
.tc:hover{border-color:var(--gold);transform:translateY(-3px);box-shadow:0 8px 32px rgba(232,176,75,.12)}
.tc-h{background:var(--s2);padding:16px 18px;border-bottom:1px solid var(--border)}
.tc-name{font-family:var(--ff-h);font-size:18px;font-weight:700;margin-top:6px}
.tc-b{padding:14px 18px}
.tc-meta{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px}
.tc-mi{font-size:11px;color:var(--muted2)}

/* FIXTURE */
.fx{display:flex;align-items:center;gap:12px;background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:12px 16px;margin-bottom:8px}
.fx-team{flex:1;font-weight:600;font-size:13px}
.fx-team.r{text-align:right}
.fx-score{font-family:var(--ff-h);font-size:22px;font-weight:700;min-width:70px;text-align:center;color:var(--gold)}
.fx-vs{color:var(--muted);font-size:11px;min-width:30px;text-align:center}

/* TABS */
.tabs{display:flex;gap:3px;margin-bottom:20px;background:var(--s2);padding:3px;border-radius:11px;width:fit-content;flex-wrap:wrap}
.tab{padding:7px 16px;border-radius:9px;cursor:pointer;font-size:13px;font-weight:500;color:var(--muted2);transition:all .15s}
.tab.on{background:var(--s1);color:var(--text);box-shadow:0 1px 6px rgba(0,0,0,.35)}

/* ANNOUNCEMENT */
.ann{background:var(--s1);border:1px solid var(--border);border-left:3px solid var(--gold);border-radius:12px;padding:16px 18px;margin-bottom:10px}
.ann-t{font-weight:600;font-size:14px}
.ann-b{color:var(--muted2);font-size:13px;margin-top:4px;line-height:1.65}
.ann-d{font-size:11px;color:var(--muted);margin-top:8px;font-family:var(--ff-m)}

/* ACCOUNTING */
.acc-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px}
.acc-card{border-radius:12px;padding:16px 18px;border:1px solid var(--border)}
.acc-card.income{background:rgba(74,222,128,.06);border-color:rgba(74,222,128,.2)}
.acc-card.expense{background:rgba(248,113,113,.06);border-color:rgba(248,113,113,.2)}
.acc-card.net-pos{background:rgba(232,176,75,.08);border-color:rgba(232,176,75,.25)}
.acc-card.net-neg{background:rgba(248,113,113,.08);border-color:rgba(248,113,113,.3)}
.acc-label{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted2)}
.acc-value{font-family:var(--ff-h);font-size:28px;font-weight:800;margin-top:4px}
.acc-card.income .acc-value{color:var(--green)}
.acc-card.expense .acc-value{color:var(--red)}
.acc-card.net-pos .acc-value{color:var(--gold)}
.acc-card.net-neg .acc-value{color:var(--red)}
.ledger-row{display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--border);font-size:13px}
.ledger-row:last-child{border-bottom:none}
.ledger-row .lr-type{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.ledger-row .lr-desc{flex:1}
.ledger-row .lr-cat{font-size:11px;color:var(--muted2);min-width:90px}
.ledger-row .lr-date{font-size:11px;color:var(--muted);font-family:var(--ff-m);min-width:80px;text-align:right}
.ledger-row .lr-amt{font-weight:600;min-width:80px;text-align:right;font-family:var(--ff-m)}
.lr-income .lr-type{background:var(--green)}.lr-income .lr-amt{color:var(--green)}
.lr-expense .lr-type{background:var(--red)}.lr-expense .lr-amt{color:var(--red)}

/* PAYMENT / MISC */
.due-banner{background:rgba(248,113,113,.07);border:1px solid rgba(248,113,113,.25);border-radius:10px;padding:12px 16px;font-size:13px;color:#fca5a5;margin-bottom:16px}
.receipt-img{max-width:100%;max-height:240px;border-radius:10px;border:1px solid var(--border);margin-top:10px;display:block}
.mb16{margin-bottom:16px}.mb20{margin-bottom:20px}.mb24{margin-bottom:24px}
.row{display:flex;gap:10px;align-items:center}
.row-sb{display:flex;justify-content:space-between;align-items:center}
.empty{text-align:center;padding:48px;color:var(--muted);font-size:13px}
.divider{border:none;border-top:1px solid var(--border);margin:14px 0}
.text-muted{color:var(--muted2)}.text-sm{font-size:12px}

/* WINNER BANNER */
.winner-banner{background:linear-gradient(135deg,rgba(232,176,75,.15),rgba(232,176,75,.05));border:1px solid rgba(232,176,75,.3);border-radius:14px;padding:20px 24px;margin-bottom:20px}
.winner-banner .wb-title{font-family:var(--ff-h);font-size:13px;color:var(--muted2);text-transform:uppercase;letter-spacing:1px}
.winner-banner .wb-name{font-family:var(--ff-h);font-size:26px;font-weight:800;color:var(--gold);margin-top:2px}

/* TOAST */
#toast{position:fixed;bottom:22px;right:22px;background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:11px 18px;font-size:13px;z-index:9999;pointer-events:none;transform:translateY(20px);opacity:0;transition:all .25s}
#toast.show{transform:none;opacity:1}
#toast.ok{border-color:var(--green);color:var(--green)}
#toast.err{border-color:var(--red);color:var(--red)}

/* CONFIG BANNER */
#config-banner{position:fixed;top:0;left:0;right:0;z-index:9998;background:rgba(248,113,113,.12);border-bottom:1px solid rgba(248,113,113,.3);color:#fca5a5;font-size:13px;padding:10px 20px;text-align:center;display:none}