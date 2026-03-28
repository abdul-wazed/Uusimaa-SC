// ── PROFILE ──────────────────────────────────
const { collection,getDocs,query,where,orderBy } = window._db;
const db = window.db;

window.renderProfile = async function() {
  const CU=window.CU;
  const now=new Date(); const tm=MONTHS[now.getMonth()], ty=now.getFullYear();
  const [pSnap,tmSnap,tourSnap]=await Promise.all([
    getDocs(query(collection(db,'payments'),where('memberId','==',CU.uid),orderBy('uploaded','desc'))),
    getDocs(query(collection(db,'tourMembers'),where('userId','==',CU.uid))),
    getDocs(collection(db,'tournaments'))
  ]);
  const pays=pSnap.docs.map(d=>({id:d.id,...d.data()}));
  const thisPay=pays.find(p=>p.month===tm&&p.year===ty);
  const allTours=tourSnap.docs.map(d=>({id:d.id,...d.data()}));
  const myTourIds=tmSnap.docs.map(d=>d.data().tourId);
  const myTours=allTours.filter(t=>myTourIds.includes(t.id));

  // ── Due warnings banner at top of profile ──
  const dueWarnings = CU.role!=='admin' ? buildDueWarnings(pays,now,CU.joined) : '';

  $('prof-info').innerHTML=`
    ${dueWarnings}
    <div class="fg"><label>Name</label><strong style="font-size:15px">${esc(CU.name)}</strong></div>
    <div class="fg"><label>Email</label>${esc(CU.email)}</div>
    <div class="fg"><label>Role</label><span class="b b-${CU.role==='admin'?'gold':'gray'}">${CU.role}</span></div>
    <div class="fg"><label>Member Since</label><div class="text-sm text-muted">${fmtDate(CU.joined)}</div></div>`;

  $('prof-pays').innerHTML=pays.length
    ?pays.map(p=>`<div class="row-sb" style="padding:7px 0;border-bottom:1px solid var(--border)">
        <div class="text-sm">${p.month} ${p.year}${p.amount?' · €'+fmt2dp(p.amount):''}</div>
        <span class="b b-${p.status==='approved'?'green':p.status==='rejected'?'red':'gold'}">${p.status}</span>
      </div>`).join('')
    :'<div class="empty">No payment history.</div>';

  // ── My tournaments + join available ──
  const available=allTours.filter(t=>!myTourIds.includes(t.id)&&t.status!=='Finished');
  $('prof-tours').innerHTML=`
    ${myTours.length?`<div class="g2 mb16">${myTours.map(t=>{
      const mem=tmSnap.docs.find(d=>d.data().tourId===t.id)?.data();
      return `<div style="padding:12px;background:var(--s2);border:1px solid var(--border);border-radius:10px;cursor:pointer" onclick="openTourDetail('${t.id}')">
        <div class="row" style="gap:6px;margin-bottom:6px">
          <span class="b b-${t.tourType==='Ongoing'?'teal':'purple'}">${t.tourType==='Ongoing'?'♾ Ongoing':'📅 Seasonal'}</span>
          <span class="b b-gold">${esc(t.sport)}</span>
        </div>
        <div style="font-weight:600">${esc(t.name)}</div>
        ${mem?.playerRole?`<div class="text-sm text-muted" style="margin-top:4px">Role: ${esc(mem.playerRole)}</div>`:''}
      </div>`;}).join('')}</div>`
    :'<div class="empty mb16">You haven\'t joined any tournaments yet.</div>'}
    ${available.length?`
      <div class="card-t" style="margin-bottom:10px">Available to Join</div>
      <div class="g2">${available.map(t=>`
        <div style="padding:10px 14px;background:var(--s2);border:1px solid var(--border);border-radius:10px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:600;font-size:13px">${esc(t.name)}</div>
            <div class="text-sm text-muted">${esc(t.sport)} · ${t.tourType==='Ongoing'?'♾ Ongoing':'📅 Seasonal'}</div>
          </div>
          <button class="btn btn-teal btn-xs" onclick="quickJoinTour('${t.id}','${t.tourType||'Ongoing'}')">Join</button>
        </div>`).join('')}</div>`:'<div class="text-sm text-muted">No other active tournaments to join.</div>'}`;

  // ── Upload section ──
  const uploadEl=$('prof-upload');
  if (CU.role==='admin'){ uploadEl.innerHTML='<div class="text-muted text-sm">Admin accounts do not require payment.</div>'; return; }
  if (thisPay?.status==='approved'){
    uploadEl.innerHTML=`
      <div style="background:rgba(74,222,128,.07);border:1px solid rgba(74,222,128,.25);border-radius:10px;padding:12px 16px;font-size:13px;color:var(--green);margin-bottom:16px">
        ✓ ${tm} ${ty} payment approved${thisPay.amount?' — €'+fmt2dp(thisPay.amount):''}
      </div>
      <div class="text-sm text-muted">Need to submit for a different month? Go to <strong>Payments</strong> page.</div>`;
    return;
  }
  if (thisPay?.status==='pending'){
    uploadEl.innerHTML=`<div style="background:rgba(232,176,75,.08);border:1px solid rgba(232,176,75,.3);border-radius:10px;padding:12px 16px;font-size:13px;color:var(--gold)">⏳ Receipt for ${tm} ${ty} is under admin review</div>`;
    return;
  }
  uploadEl.innerHTML=`
    ${!thisPay?`<div class="due-banner mb16">Monthly fee is due for <strong>${tm} ${ty}</strong></div>`:''}
    <div class="fg"><label>Month</label><select id="pm-month">${MONTHS.map(m=>`<option ${m===tm?'selected':''}>${m}</option>`).join('')}</select></div>
    <div class="fg"><label>Year</label><input type="number" id="pm-year" value="${ty}" min="2020" max="2035"></div>
    <div class="fg"><label>Amount Paid (€)</label><input type="number" id="pm-amount" placeholder="e.g. 20.00" min="0" step="0.01"></div>
    <div class="fg"><label>Receipt (image or PDF, max 2MB)</label><input type="file" id="pm-file" accept="image/*,.pdf"></div>
    <button class="btn btn-gold" onclick="uploadReceipt()">Submit for Approval</button>`;
};