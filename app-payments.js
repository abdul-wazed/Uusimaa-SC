// ── PAYMENTS ─────────────────────────────────
const { collection,doc,addDoc,getDoc,getDocs,updateDoc,query,where,orderBy,serverTimestamp } = window._db;
const db = window.db;

window.renderPayments = async function() {
  const el=$('pay-content');
  if (window.CU.role==='admin') await renderAdminPays(el);
  else await renderMemberPays(el);
};

async function renderAdminPays(el) {
  const allSnap=await getDocs(query(collection(db,'payments'),orderBy('uploaded','desc')));
  const all=allSnap.docs.map(d=>({id:d.id,...d.data()}));
  const pending=all.filter(p=>p.status==='pending');
  const now=new Date();
  const approved=all.filter(p=>p.status==='approved'&&p.month===MONTHS[now.getMonth()]);
  el.innerHTML=`
    <div class="stats mb24">
      <div class="sc"><div class="sc-l">Pending Approval</div><div class="sc-v" style="color:var(--gold)">${pending.length}</div></div>
      <div class="sc"><div class="sc-l">Approved This Month</div><div class="sc-v" style="color:var(--green)">${approved.length}</div></div>
    </div>
    <div class="card-t">Pending Receipts</div>
    ${pending.length?`<div class="tw mb20"><table>
      <thead><tr><th>Member</th><th>Month</th><th>Amount</th><th>Uploaded</th><th></th></tr></thead>
      <tbody>${pending.map(p=>`<tr>
        <td><strong>${esc(p.memberName)}</strong></td>
        <td>${esc(p.month)} ${p.year}</td>
        <td>${p.amount?`<strong style="color:var(--green)">€${fmt2dp(p.amount)}</strong>`:'<span class="text-muted">—</span>'}</td>
        <td>${fmtDate(p.uploaded)}</td>
        <td><button class="btn btn-teal btn-sm" onclick="reviewPay('${p.id}')">Review</button></td>
      </tr>`).join('')}</tbody>
    </table></div>`:'<div class="empty mb20">No pending payments.</div>'}
    <div class="card-t">All Payment Records</div>
    <div class="tw"><table>
      <thead><tr><th>Member</th><th>Month</th><th>Year</th><th>Amount</th><th>Status</th><th></th></tr></thead>
      <tbody>${all.map(p=>`<tr>
        <td>${esc(p.memberName)}</td><td>${esc(p.month)}</td><td>${p.year}</td>
        <td>${p.amount?`€${fmt2dp(p.amount)}`:'—'}</td>
        <td><span class="b b-${p.status==='approved'?'green':p.status==='rejected'?'red':'gold'}">${p.status}</span></td>
        <td><button class="btn btn-ghost btn-xs" onclick="reviewPay('${p.id}')">View</button></td>
      </tr>`).join('')}</tbody>
    </table></div>`;
}

// Member sees ONLY their own data + upload form
async function renderMemberPays(el) {
  const snap=await getDocs(query(collection(db,'payments'),where('memberId','==',window.CU.uid),orderBy('uploaded','desc')));
  const pays=snap.docs.map(d=>({id:d.id,...d.data()}));
  const now=new Date(); const tm=MONTHS[now.getMonth()], ty=now.getFullYear();
  const thisPay=pays.find(p=>p.month===tm&&p.year===ty);
  const dueWarnings=buildDueWarnings(pays,now);
  let statusHtml='';
  if (!thisPay) statusHtml=`<div class="due-banner">⚠️ Monthly fee is due for <strong>${tm} ${ty}</strong></div>`;
  else if (thisPay.status==='pending') statusHtml=`<div style="background:rgba(232,176,75,.08);border:1px solid rgba(232,176,75,.3);border-radius:10px;padding:12px 16px;font-size:13px;color:var(--gold)">⏳ Receipt for <strong>${tm} ${ty}</strong> is under admin review</div>`;
  else if (thisPay.status==='approved') statusHtml=`<div style="background:rgba(74,222,128,.07);border:1px solid rgba(74,222,128,.25);border-radius:10px;padding:12px 16px;font-size:13px;color:var(--green)">✓ Payment for <strong>${tm} ${ty}</strong> approved${thisPay.amount?' — €'+fmt2dp(thisPay.amount):''}</div>`;
  else statusHtml=`<div class="due-banner">❌ Payment for <strong>${tm} ${ty}</strong> was rejected. Please re-upload below.</div>`;
  const showUpload=!thisPay||thisPay.status==='rejected';
  el.innerHTML=`
    <div class="mb16">${statusHtml}</div>
    ${dueWarnings}
    ${showUpload?`<div class="card mb20">
      <div class="card-t">Submit Payment Receipt</div>
      <div class="fg"><label>Month</label><select id="pm-month">${MONTHS.map(m=>`<option ${m===tm?'selected':''}>${m}</option>`).join('')}</select></div>
      <div class="fg"><label>Year</label><input type="number" id="pm-year" value="${ty}" min="2020" max="2035"></div>
      <div class="fg"><label>Amount Paid (€)</label><input type="number" id="pm-amount" placeholder="e.g. 20.00" min="0" step="0.01"></div>
      <div class="fg"><label>Receipt (image or PDF, max 2MB)</label><input type="file" id="pm-file" accept="image/*,.pdf"></div>
      <button class="btn btn-gold" onclick="uploadReceipt()">Submit for Approval</button>
    </div>`:''}
    <div class="card-t">My Payment History</div>
    ${pays.length?`<div class="tw"><table>
      <thead><tr><th>Month</th><th>Year</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>${pays.map(p=>`<tr>
        <td>${esc(p.month)}</td><td>${p.year}</td>
        <td>${p.amount?`€${fmt2dp(p.amount)}`:'—'}</td>
        <td><span class="b b-${p.status==='approved'?'green':p.status==='rejected'?'red':'gold'}">${p.status}</span></td>
      </tr>`).join('')}</tbody>
    </table></div>`:'<div class="empty">No payments submitted yet.</div>'}`;
}

// Check past 6 months for unpaid dues
function buildDueWarnings(pays, now) {
  const warnings=[];
  for (let i=1;i<=6;i++) {
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const month=MONTHS[d.getMonth()], year=d.getFullYear();
    const p=pays.find(p=>p.month===month&&p.year===year);
    if (!p||p.status==='rejected') {
      warnings.push(`<div class="due-banner" style="margin-bottom:8px">⚠️ Monthly fee is due for <strong>${month} ${year}</strong>${p?.status==='rejected'?' — previous receipt was rejected':''}</div>`);
    }
  }
  return warnings.length?`<div class="mb16">${warnings.join('')}</div>`:'';
}
window.buildDueWarnings=buildDueWarnings;

window.uploadReceipt = function() {
  const monthEl=$('pm-month'),yearEl=$('pm-year'),amountEl=$('pm-amount'),fileEl=$('pm-file');
  if (!monthEl||!fileEl){ toast('Upload form not found','err'); return; }
  const month=monthEl.value, year=parseInt(yearEl.value);
  const amount=parseFloat(amountEl?.value)||0;
  const file=fileEl.files[0];
  if (!file){ toast('Select a receipt image or PDF','err'); return; }
  if (file.size>2*1024*1024){ toast('File too large — max 2MB','err'); return; }
  const reader=new FileReader();
  reader.onload=async e=>{
    const existing=await getDocs(query(collection(db,'payments'),where('memberId','==',window.CU.uid),where('month','==',month),where('year','==',year)));
    if (existing.docs.some(d=>d.data().status!=='rejected')){ toast('Already submitted for this month','err'); return; }
    await addDoc(collection(db,'payments'),{memberId:window.CU.uid,memberName:window.CU.name,month,year,amount,status:'pending',receiptData:e.target.result,uploaded:serverTimestamp()});
    toast('Receipt submitted! Awaiting admin approval.');
    if (window.activePage==='payments') window.renderPayments();
    else window.renderProfile();
  };
  reader.readAsDataURL(file);
};

window.reviewPay=async function(id){
  const snap=await getDoc(doc(db,'payments',id)); const p=snap.data();
  $('pay-rev-body').innerHTML=`
    <div class="fg"><label>Member</label><strong>${esc(p.memberName)}</strong></div>
    <div class="fg"><label>Period</label>${esc(p.month)} ${p.year}</div>
    ${p.amount?`<div class="fg"><label>Amount Paid</label><strong style="color:var(--green);font-size:18px">€${fmt2dp(p.amount)}</strong></div>`:''}
    <div class="fg"><label>Status</label><span class="b b-${p.status==='approved'?'green':p.status==='rejected'?'red':'gold'}">${p.status}</span></div>
    <div class="fg"><label>Receipt</label>${p.receiptData?`<img src="${p.receiptData}" class="receipt-img">`:'No receipt attached'}</div>`;
  $('pay-rev-btns').innerHTML=p.status==='pending'
    ?`<button class="btn btn-gold" onclick="approvePay('${id}')">✓ Approve</button><button class="btn btn-red" onclick="rejectPay('${id}')">✗ Reject</button>`
    :`<span class="b b-${p.status==='approved'?'green':'red'}" style="padding:10px 18px">Payment ${p.status}</span>`;
  openM('m-pay-review');
};
window.approvePay=async function(id){ await updateDoc(doc(db,'payments',id),{status:'approved'}); closeM('m-pay-review'); toast('Approved!'); window.renderPayments(); };
window.rejectPay=async function(id){ await updateDoc(doc(db,'payments',id),{status:'rejected'}); closeM('m-pay-review'); toast('Rejected','err'); window.renderPayments(); };