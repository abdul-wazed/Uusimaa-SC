// ── ACCOUNTING ───────────────────────────────
// Depends on: app-core.js

const { collection,doc,addDoc,getDocs,deleteDoc,query,where,orderBy,serverTimestamp } = window._db;
const db = window.db;

// ─────────────────────────────────────────────
// SHARED SUMMARY HELPERS
// ─────────────────────────────────────────────
window.accSummaryHTML = function(entries) {
  const income  = entries.filter(e=>e.type==='income').reduce((s,e)=>s+(+e.amount||0),0);
  const expense = entries.filter(e=>e.type==='expense').reduce((s,e)=>s+(+e.amount||0),0);
  const net=income-expense;
  return `<div class="acc-summary">
    <div class="acc-card income"><div class="acc-label">Total Income</div><div class="acc-value">+${fmt2dp(income)}</div></div>
    <div class="acc-card expense"><div class="acc-label">Total Expenses</div><div class="acc-value">−${fmt2dp(expense)}</div></div>
    <div class="acc-card ${net>=0?'net-pos':'net-neg'}"><div class="acc-label">Net Balance</div><div class="acc-value">${net>=0?'+':'−'}${fmt2dp(Math.abs(net))}</div></div>
  </div>`;
};

function accLedgerHTML(entries, isAdmin, scopeType, scopeId) {
  if (!entries.length) return '<div class="empty">No entries yet.</div>';
  return `<div style="background:var(--s1);border:1px solid var(--border);border-radius:12px;overflow:hidden">
    ${entries.map(e=>`<div class="ledger-row lr-${e.type}">
      <div class="lr-type"></div>
      <div class="lr-desc">${esc(e.desc)}</div>
      <div class="lr-cat">${esc(e.cat||'')}</div>
      <div class="lr-date">${e.date||''}</div>
      <div class="lr-amt">${e.type==='income'?'+':'−'}${fmt2dp(+e.amount||0)}</div>
      ${isAdmin?`<button class="btn btn-ghost btn-xs" onclick="delAccEntry('${e.id}','${scopeType}','${scopeId}')">✕</button>`:''}
    </div>`).join('')}
  </div>`;
}

// ─────────────────────────────────────────────
// TOURNAMENT ACCOUNTING TAB
// ─────────────────────────────────────────────
window.renderTDAccounting = async function() {
  const el=$('td-tab-content');
  el.innerHTML='<div class="empty">Loading…</div>';
  const snap=await getDocs(query(collection(db,'accounting'),where('scopeType','==','tournament'),where('scopeId','==',window.activeTourId)));
  const entries=snap.docs.map(d=>({id:d.id,...d.data()}));
  el.innerHTML=`
    ${accSummaryHTML(entries)}
    <div class="row-sb mb16">
      <div class="card-t" style="margin:0">Ledger</div>
      <button class="btn btn-gold btn-sm" onclick="openAccModal('tournament','${window.activeTourId}')">+ Add Entry</button>
    </div>
    ${accLedgerHTML(entries, true, 'tournament', window.activeTourId)}`;
};

// ─────────────────────────────────────────────
// SESSION ACCOUNTING (inline in attendance)
// ─────────────────────────────────────────────
window.renderSessionAcc = async function(sessionId, containerEl) {
  const snap=await getDocs(query(collection(db,'accounting'),where('scopeType','==','session'),where('scopeId','==',sessionId)));
  const entries=snap.docs.map(d=>({id:d.id,...d.data()}));
  const isAdmin=window.CU.role==='admin';
  containerEl.innerHTML=`
    <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
      <div class="row-sb mb16">
        <div style="font-size:12px;font-weight:600;color:var(--muted2);text-transform:uppercase;letter-spacing:.5px">Session Finances</div>
        ${isAdmin?`<button class="btn btn-gold btn-xs" onclick="openAccModal('session','${sessionId}')">+ Entry</button>`:''}
      </div>
      ${accSummaryHTML(entries)}
      ${accLedgerHTML(entries, isAdmin, 'session', sessionId)}
    </div>`;
};

// ─────────────────────────────────────────────
// CLUB-WIDE ACCOUNTING PAGE
// ─────────────────────────────────────────────
window.renderAccounting = async function() {
  const el=$('acc-content');
  el.innerHTML='<div class="empty">Loading…</div>';
  const [tourSnap,allAccSnap,sessSnap]=await Promise.all([
    getDocs(collection(db,'tournaments')),
    getDocs(collection(db,'accounting')),
    getDocs(collection(db,'sessions'))
  ]);
  const allEntries=allAccSnap.docs.map(d=>({id:d.id,...d.data()}));
  const tours=tourSnap.docs.map(d=>({id:d.id,...d.data()}));
  const sessions=sessSnap.docs.map(d=>({id:d.id,...d.data()}));

  let html=`<div class="card-t">Overall Club Finances</div>${accSummaryHTML(allEntries)}<hr class="divider">`;

  // Tournament breakdown
  html+=`<div class="card-t" style="margin-bottom:14px">Tournament Breakdown</div>`;
  if (!tours.length){ html+='<div class="empty mb20">No tournaments yet.</div>'; }
  else {
    html+=`<div class="tw mb24"><table>
      <thead><tr><th>Tournament</th><th>Type</th><th>Sport</th><th>Income</th><th>Expenses</th><th>Net</th><th></th></tr></thead>
      <tbody>${tours.map(t=>{
        const ents=allEntries.filter(e=>e.scopeType==='tournament'&&e.scopeId===t.id);
        const inc=ents.filter(e=>e.type==='income').reduce((s,e)=>s+(+e.amount||0),0);
        const exp=ents.filter(e=>e.type==='expense').reduce((s,e)=>s+(+e.amount||0),0);
        const net=inc-exp;
        return `<tr>
          <td><strong>${esc(t.name)}</strong></td>
          <td><span class="b b-${t.tourType==='Ongoing'?'teal':'purple'}">${t.tourType||'Seasonal'}</span></td>
          <td><span class="b b-gold">${esc(t.sport)}</span></td>
          <td style="color:var(--green);font-family:var(--ff-m)">+${fmt2dp(inc)}</td>
          <td style="color:var(--red);font-family:var(--ff-m)">−${fmt2dp(exp)}</td>
          <td style="font-family:var(--ff-m);font-weight:700;color:${net>=0?'var(--gold)':'var(--red)'}">${net>=0?'+':'−'}${fmt2dp(Math.abs(net))}</td>
          <td><button class="btn btn-ghost btn-xs" onclick="openTourDetail('${t.id}')">View →</button></td>
        </tr>`;}).join('')}
      </tbody></table></div>`;
  }

  // Session breakdown by sport
  html+=`<div class="card-t" style="margin-bottom:14px">Regular Sessions by Sport</div>
    <div class="tw mb24"><table>
      <thead><tr><th>Sport</th><th>Sessions</th><th>Income</th><th>Expenses</th><th>Net</th></tr></thead>
      <tbody>${SPORTS.map(sport=>{
        const sIds=sessions.filter(s=>s.sport===sport&&!s.tourId).map(s=>s.id);
        const ents=allEntries.filter(e=>e.scopeType==='session'&&sIds.includes(e.scopeId));
        const inc=ents.filter(e=>e.type==='income').reduce((s,e)=>s+(+e.amount||0),0);
        const exp=ents.filter(e=>e.type==='expense').reduce((s,e)=>s+(+e.amount||0),0);
        const net=inc-exp;
        return `<tr>
          <td><span class="b b-blue">${esc(sport)}</span></td>
          <td>${sIds.length}</td>
          <td style="color:var(--green);font-family:var(--ff-m)">+${fmt2dp(inc)}</td>
          <td style="color:var(--red);font-family:var(--ff-m)">−${fmt2dp(exp)}</td>
          <td style="font-family:var(--ff-m);font-weight:700;color:${net>=0?'var(--gold)':'var(--red)'}">${net>=0?'+':'−'}${fmt2dp(Math.abs(net))}</td>
        </tr>`;}).join('')}
      </tbody></table></div>`;
  el.innerHTML=html;
};

// ─────────────────────────────────────────────
// MODAL + SAVE
// ─────────────────────────────────────────────
window.openAccModal = function(scopeType, scopeId) {
  $('m-acc-title').textContent=scopeType==='tournament'?'Tournament Entry':'Session Entry';
  $('ac-type').value='income'; $('ac-desc').value=''; $('ac-cat').value='Sponsorship';
  $('ac-amount').value=''; $('ac-note').value='';
  $('ac-date').value=new Date().toISOString().slice(0,10);
  $('ac-scope-type').value=scopeType; $('ac-scope-id').value=scopeId;
  openM('m-acc');
};

window.saveAccEntry = async function() {
  const desc=$('ac-desc').value.trim(), amount=parseFloat($('ac-amount').value);
  if (!desc){ toast('Enter a description','err'); return; }
  if (!amount||amount<=0){ toast('Enter a valid amount','err'); return; }
  const entry={
    type:$('ac-type').value, desc, cat:$('ac-cat').value, amount,
    date:$('ac-date').value, note:$('ac-note').value.trim(),
    scopeType:$('ac-scope-type').value, scopeId:$('ac-scope-id').value,
    createdBy:window.CU.uid, createdAt:serverTimestamp()
  };
  await addDoc(collection(db,'accounting'),entry);
  closeM('m-acc'); toast('Entry saved!');
  if (entry.scopeType==='tournament') window.renderTDAccounting();
  else { const el=document.getElementById('sess-acc-'+entry.scopeId); if(el) renderSessionAcc(entry.scopeId,el); }
  if (window.activePage==='accounting') window.renderAccounting();
};

window.delAccEntry = async function(id, scopeType, scopeId) {
  if (!confirm('Delete this entry?')) return;
  await deleteDoc(doc(db,'accounting',id)); toast('Deleted');
  if (scopeType==='tournament') window.renderTDAccounting();
  else { const el=document.getElementById('sess-acc-'+scopeId); if(el) renderSessionAcc(scopeId,el); }
  if (window.activePage==='accounting') window.renderAccounting();
};