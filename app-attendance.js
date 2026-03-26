// ── ATTENDANCE (Regular Sessions) ────────────
// Depends on: app-core.js

const { collection,doc,addDoc,getDocs,updateDoc,deleteDoc,query,where,orderBy,serverTimestamp } = window._db;
const db = window.db;

window.renderAttendance = async function() {
  const tabs=$('att-tabs');
  tabs.innerHTML=SPORTS.map(s=>`<div class="tab ${s===window.attSport?'on':''}" onclick="setAttSport('${s}')">${s}</div>`).join('');
  await renderAttContent();
};
window.setAttSport=function(s){ window.attSport=s; window.renderAttendance(); };

async function renderAttContent() {
  const isAdmin=window.CU.role==='admin';
  // Only fetch sessions NOT linked to a tournament
  const sessSnap=await getDocs(query(collection(db,'sessions'),where('sport','==',window.attSport),where('tourId','==',null)));
  const el=$('att-content');

  // Filter client-side for sessions without tourId (handles missing field too)
  const allSessSnap=await getDocs(query(collection(db,'sessions'),where('sport','==',window.attSport)));
  const sessions=allSessSnap.docs
    .map(d=>({id:d.id,...d.data()}))
    .filter(s=>!s.tourId)
    .sort((a,b)=>b.date.localeCompare(a.date));

  if (!sessions.length){ el.innerHTML=`<div class="empty">No sessions for ${esc(window.attSport)} yet.</div>`; return; }

  const [attSnap,usersSnap]=await Promise.all([
    getDocs(collection(db,'attendance')),
    isAdmin?getDocs(query(collection(db,'users'),where('role','==','member'))):Promise.resolve({docs:[]})
  ]);
  const attAll=attSnap.docs.map(d=>({id:d.id,...d.data()}));
  const members=usersSnap.docs.map(d=>({uid:d.id,...d.data()}));

  let html='';
  for (const sess of sessions) {
    const sessAtts=attAll.filter(a=>a.sessionId===sess.id);
    const myAtt=sessAtts.find(a=>a.userId===window.CU.uid);
    const presentCount=sessAtts.filter(a=>a.present).length;

    html+=`<div class="card mb20">
      <div class="row-sb mb16">
        <div><strong>${fmtDate(sess.date)}</strong>
          <div class="text-sm text-muted">${esc(sess.notes||'')}${presentCount?' · '+presentCount+' present':''}</div>
        </div>
        ${isAdmin?`<button class="btn btn-red btn-xs" onclick="delSession('${sess.id}')">Delete</button>`:''}
      </div>`;

    if (isAdmin) {
      html+=`<div class="tw"><table><thead><tr><th>Member</th><th>Status</th><th></th></tr></thead><tbody>`;
      members.forEach(m=>{
        const att=sessAtts.find(a=>a.userId===m.uid);
        html+=`<tr>
          <td>${esc(m.name)}</td>
          <td><span class="b b-${att?.present?'green':'gray'}">${att?.present?'Present':'Absent'}</span></td>
          <td><button class="btn btn-sm ${att?.present?'btn-red':'btn-teal'}" onclick="toggleAtt('${sess.id}','${m.uid}')">
            ${att?.present?'Mark Absent':'Mark Present'}</button></td>
        </tr>`;
      });
      html+=`</tbody></table></div>`;
      html+=`<div id="sess-acc-${sess.id}"><div class="text-muted text-sm" style="margin-top:8px">Loading finances…</div></div>`;
    } else {
      html+=`<div>
        <div class="text-sm text-muted mb16">Your attendance: <span class="b b-${myAtt?.present?'green':'gray'}">${myAtt?.present?'Present':'Not marked'}</span></div>
        ${!myAtt?.present?`<button class="btn btn-teal btn-sm" onclick="markSelf('${sess.id}')">✓ Mark Myself Present</button>`:'<span class="b b-green">✓ Marked</span>'}
      </div>`;
    }
    html+='</div>';
  }
  el.innerHTML=html;

  if (isAdmin) {
    sessions.forEach(sess=>{
      const accEl=document.getElementById('sess-acc-'+sess.id);
      if (accEl) renderSessionAcc(sess.id,accEl);
    });
  }
}

window.toggleAtt = async function(sessionId, userId) {
  const snap=await getDocs(query(collection(db,'attendance'),where('sessionId','==',sessionId),where('userId','==',userId)));
  if (snap.empty) await addDoc(collection(db,'attendance'),{sessionId,userId,present:true});
  else await updateDoc(snap.docs[0].ref,{present:!snap.docs[0].data().present});
  renderAttContent();
};

window.markSelf = async function(sessionId) {
  const snap=await getDocs(query(collection(db,'attendance'),where('sessionId','==',sessionId),where('userId','==',window.CU.uid)));
  if (snap.empty) await addDoc(collection(db,'attendance'),{sessionId,userId:window.CU.uid,present:true});
  else await updateDoc(snap.docs[0].ref,{present:true});
  toast('Attendance marked!'); renderAttContent();
};

window.saveSession = async function() {
  const sport=$('ss-sport').value, date=$('ss-date').value, notes=$('ss-notes').value;
  const tourId=$('ss-tour-id').value||null;
  if (!date){ toast('Select a date','err'); return; }
  try{
    await addDoc(collection(db,'sessions'),{sport,date,notes,tourId,created:serverTimestamp()});
    closeM('m-session'); $('ss-tour-id').value='';
    toast('Session created!');
    if (tourId) { renderOngoingAttendance($('td-tab-content')); }
    else { window.attSport=sport; window.renderAttendance(); }
  }catch(e){ toast(e.code==='permission-denied'?'Permission denied':'Failed: '+e.message,'err'); }
};

window.delSession = async function(id) {
  if (!confirm('Delete session?')) return;
  const attSnap=await getDocs(query(collection(db,'attendance'),where('sessionId','==',id)));
  await Promise.all(attSnap.docs.map(d=>deleteDoc(d.ref)));
  await deleteDoc(doc(db,'sessions',id));
  toast('Deleted'); renderAttContent();
};