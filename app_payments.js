// ── PAYMENTS ─────────────────────────────────
// Depends on: app-core.js

const { collection,doc,addDoc,getDoc,getDocs,updateDoc,query,where,orderBy,serverTimestamp } = window._db;
const db = window.db;

window.renderPayments = async function() {
  const el=$('pay-content');
  if (window.CU.role==='admin') await renderAdminPays(el);
  else await renderMemberPays(el);
};

// ─────────────────────────────────────────────
// ADMIN VIEW
// ─────────────────────────────────────────────
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
        <td>${esc(p.memberName)}</td>
        <td>${esc(p.month)}</td><td>${p.year}</td>
        <td>${p.amount?`€${fmt2dp(p.amount)}`:'—'}</td>
        <td><span class="b b-${p.status==='approved'?'green':p.status==='rejected'?'red':'gold'}">${p.status}</span></td>
        <td><button class="btn btn-ghost btn-xs" onclick="reviewPay('${p.id}')">View</button></td>
      </tr>`).join('')}</tbody>
    </table></div>`;
}

// ─────────────────────────────────────────────
// MEMBER VIEW
// ─────────────────────────────────────────────
async function renderMemberPays(el) {
  const snap=await getDocs(query(collection(db,'payments'),where('memberId','==',window.CU.uid),orderBy('uploaded','desc')));
  const pays=snap.docs.map(d=>({id:d.id,...d.data()}));
  const now=new Date(); const tm=MONTHS[now.getMonth()], ty=now.getFullYear();
  const thisPay=pays.find(p=>p.month===tm&&p.year===ty);
  let statusHtml='';
  if (!thisPay) statusHtml=`<div class="due-banner">⚠️ Monthly Subscription is due for <strong>${tm} ${ty}</strong>. Go to <strong>My Profile</strong> to upload your receipt.</div>`;
  else if (thisPay.status==='pending') statusHtml=`<span class="b b-gold" style="padding:10px 18px;font-size:13px">⏳ Receipt for ${tm} ${ty} is under review</span>`;
  else if (thisPay.status==='approved') statusHtml=`<span class="b b-green" style="padding:10px 18px;font-size:13px">✓ Payment for ${tm} ${ty} approved${thisPay.amount?' — €'+fmt2dp(thisPay.amount):''}</span>`;
  else statusHtml=`<div class="due-banner">Payment for ${tm} ${ty} was rejected. Please re-upload in My Profile.</div>`;

  el.innerHTML=`
    <div class="mb20">${statusHtml}</div>
    <div class="card-t">My Payment History</div>
    ${pays.length?`<div class="tw"><table>
      <thead><tr><th>Month</th><th>Year</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>${pays.map(p=>`<tr>
        <td>${esc(p.month)}</td><td>${p.year}</td>
        <td>${p.amount?`€${fmt2dp(p.amount)}`:'—'}</td>
        <td><span class="b b-${p.status==='approved'?'green':p.status==='rejected'?'red':'gold'}">${p.status}</span></td>
      </tr>`).join('')}</tbody>
    </table></div>`:'<div class="empty">No payments yet.</div>'}`;
}

// ─────────────────────────────────────────────
// REVIEW MODAL
// ─────────────────────────────────────────────
window.reviewPay = async function(id) {
  const snap=await getDoc(doc(db,'payments',id)); const p=snap.data();
  $('pay-rev-body').innerHTML=`
    <div class="fg"><label>Member</label><strong>${esc(p.memberName)}</strong></div>
    <div class="fg"><label>Period</label>${esc(p.month)} ${p.year}</div>
    ${p.amount?`<div class="fg"><label>Amount Paid</label><strong style="color:var(--green);font-size:18px">€${fmt2dp(p.amount)}</strong></div>`:''}
    <div class="fg"><label>Status</label><span class="b b-${p.status==='approved'?'green':p.status==='rejected'?'red':'gold'}">${p.status}</span></div>
    <div class="fg"><label>Receipt</label>${p.receiptData?`<img src="${p.receiptData}" class="receipt-img">`:'No receipt attached'}</div>`;
  $('pay-rev-btns').innerHTML=p.status==='pending'
    ?`<button class="btn btn-gold" onclick="approvePay('${id}')">✓ Approve</button>
      <button class="btn btn-red" onclick="rejectPay('${id}')">✗ Reject</button>`
    :`<span class="b b-${p.status==='approved'?'green':'red'}" style="padding:10px 18px">Payment ${p.status}</span>`;
  openM('m-pay-review');
};
window.approvePay=async function(id){ await updateDoc(doc(db,'payments',id),{status:'approved'}); closeM('m-pay-review'); toast('Approved!'); window.renderPayments(); };
window.rejectPay=async function(id){ await updateDoc(doc(db,'payments',id),{status:'rejected'}); closeM('m-pay-review'); toast('Rejected','err'); window.renderPayments(); };

// ─────────────────────────────────────────────
// PROFILE UPLOAD (called from app-profile.js)
// ─────────────────────────────────────────────
window.uploadReceipt = function() {
  const month=$('pm-month').value, year=parseInt($('pm-year').value);
  const amount=parseFloat($('pm-amount').value)||0;
  const file=$('pm-file').files[0];
  if (!file){ toast('Select a receipt image or PDF','err'); return; }
  if (file.size>2*1024*1024){ toast('File too large — max 2MB','err'); return; }
  const reader=new FileReader();
  reader.onload=async e=>{
    const existing=await getDocs(query(collection(db,'payments'),where('memberId','==',window.CU.uid),where('month','==',month),where('year','==',year)));
    if (!existing.empty){ toast('Already submitted for this month','err'); return; }
    await addDoc(collection(db,'payments'),{
      memberId:window.CU.uid, memberName:window.CU.name,
      month, year, amount, status:'pending',
      receiptData:e.target.result, uploaded:serverTimestamp()
    });
    toast('Receipt submitted! Awaiting admin approval.'); window.renderProfile();
  };
  reader.readAsDataURL(file);
};