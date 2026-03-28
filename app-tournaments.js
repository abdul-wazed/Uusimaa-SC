// ── TOURNAMENTS ──────────────────────────────
// Depends on: app-core.js (db, window.$, esc, fmtDate, toast, openM, closeM, nav, _db)

const { collection,doc,addDoc,getDoc,getDocs,updateDoc,deleteDoc,query,where,orderBy,serverTimestamp } = window._db;
const db = window.db;

// ─────────────────────────────────────────────
// TOURNAMENT LIST
// ─────────────────────────────────────────────
window.renderTournaments = async function() {
  const snap = await getDocs(query(collection(db,'tournaments'), orderBy('name')));
  const el = $('tour-list');
  if (snap.empty) { el.innerHTML='<div class="empty" style="grid-column:1/-1">No tournaments yet.</div>'; return; }
  const isAdmin = window.CU.role==='admin';
  el.innerHTML = snap.docs.map(d => {
    const t=d.data(), id=d.id;
    const sc = t.status==='Ongoing'?'b-green':t.status==='Upcoming'?'b-blue':'b-gray';
    const tc = t.tourType==='Ongoing'?'b-teal':'b-purple';
    const tl = t.tourType==='Ongoing'?'♾ Ongoing':'📅 Seasonal';
    return `<div class="tc">
      <div class="tc-h" onclick="openTourDetail('${id}')" style="cursor:pointer">
        <div class="row" style="gap:6px;margin-bottom:4px">
          <span class="b ${tc}">${tl}</span>
          <span class="b ${sc}">${esc(t.status)}</span>
        </div>
        <div class="tc-name">${esc(t.name)}</div>
      </div>
      <div class="tc-b" style="display:flex;justify-content:space-between;align-items:flex-end">
        <div onclick="openTourDetail('${id}')" style="cursor:pointer;flex:1">
          <span class="b b-gold">${esc(t.sport)}</span>
          <div class="tc-meta">
            <div class="tc-mi">📅 ${t.start||'TBD'}${t.end?' → '+t.end:''}</div>
            ${t.status==='Finished'&&t.winner?`<div class="tc-mi">🏆 ${esc(t.winner)}</div>`:''}
          </div>
        </div>
        ${isAdmin?`<button class="btn btn-red btn-xs" onclick="deleteTournament('${id}','${esc(t.name)}')" title="Delete tournament">🗑</button>`:''}
      </div>
    </div>`;
  }).join('');
};

window.deleteTournament = async function(id, name) {
  if (!confirm(`Delete tournament "${name}"?\n\nThis will also delete all teams, fixtures, sessions, attendance and accounting entries for this tournament. This cannot be undone.`)) return;
  try {
    // Delete all related sub-collections
    const [teamsSnap,fixSnap,sessSnap,membSnap,accSnap] = await Promise.all([
      getDocs(query(collection(db,'teams'),where('tourId','==',id))),
      getDocs(query(collection(db,'fixtures'),where('tourId','==',id))),
      getDocs(query(collection(db,'sessions'),where('tourId','==',id))),
      getDocs(query(collection(db,'tourMembers'),where('tourId','==',id))),
      getDocs(query(collection(db,'accounting'),where('scopeId','==',id),where('scopeType','==','tournament')))
    ]);
    const delAll = [...teamsSnap.docs,...fixSnap.docs,...sessSnap.docs,...membSnap.docs,...accSnap.docs];
    // Delete attendance for each session
    for (const sd of sessSnap.docs) {
      const attSnap=await getDocs(query(collection(db,'attendance'),where('sessionId','==',sd.id)));
      for (const a of attSnap.docs) await deleteDoc(a.ref);
    }
    // Delete tour payments
    const tpSnap=await getDocs(query(collection(db,'tourPayments'),where('tourId','==',id)));
    for (const d of tpSnap.docs) await deleteDoc(d.ref);
    await Promise.all(delAll.map(d=>deleteDoc(d.ref)));
    await deleteDoc(doc(db,'tournaments',id));
    toast('Tournament deleted'); window.renderTournaments();
  } catch(e) { toast('Delete failed: '+e.message,'err'); }
};

// ─────────────────────────────────────────────
// TOURNAMENT MODAL
// ─────────────────────────────────────────────
window.onTourTypeChange = function() {
  const isOngoing = $('t-type').value==='Ongoing';
  $('t-end-wrap').style.display  = isOngoing ? 'none' : '';
  $('t-winner-wrap').style.display = 'none'; // only shown when Finished
  onTourStatusChange();
};

window.onTourStatusChange = function() {
  const finished = $('t-status').value==='Finished';
  $('t-winner-wrap').style.display = finished ? '' : 'none';
};

window.openNewTournament = function() {
  window.editTourId=null; $('m-tour-title').textContent='New Tournament';
  ['t-name','t-start','t-end','t-best','t-desc','t-winner','t-runner','t-mom'].forEach(id=>{const el=$(id);if(el)el.value='';});
  $('t-type').value='Ongoing'; $('t-status').value='Upcoming';
  $('t-end-wrap').style.display='none'; $('t-winner-wrap').style.display='none';
  openM('m-tour');
};

window.openEditTour = async function() {
  const snap=await getDoc(doc(db,'tournaments',window.activeTourId)); const t=snap.data();
  window.editTourId=window.activeTourId; $('m-tour-title').textContent='Edit Tournament';
  $('t-name').value=t.name; $('t-type').value=t.tourType||'Seasonal';
  $('t-sport').value=t.sport; $('t-start').value=t.start||'';
  $('t-end').value=t.end||''; $('t-status').value=t.status;
  $('t-best').value=t.bestPlayer||''; $('t-desc').value=t.desc||'';
  $('t-winner').value=t.winner||''; $('t-runner').value=t.runner||''; $('t-mom').value=t.mom||'';
  $('t-end-wrap').style.display=t.tourType==='Ongoing'?'none':'';
  $('t-winner-wrap').style.display=t.status==='Finished'?'':'none';
  openM('m-tour');
};

window.saveTour = async function() {
  const name=$('t-name').value.trim();
  if (!name) { toast('Enter tournament name','err'); return; }
  const tourType=$('t-type').value, status=$('t-status').value;
  const data={
    name, tourType, sport:$('t-sport').value,
    start:$('t-start').value, end:tourType==='Ongoing'?'':$('t-end').value,
    status, bestPlayer:$('t-best').value.trim(), desc:$('t-desc').value.trim(),
    winner:$('t-winner').value.trim(), runner:$('t-runner').value.trim(),
    mom:$('t-mom').value.trim(), updatedAt:serverTimestamp()
  };
  try {
    if (window.editTourId) {
      await updateDoc(doc(db,'tournaments',window.editTourId),data);
      window.editTourId=null;
    } else {
      data.createdAt=serverTimestamp();
      await addDoc(collection(db,'tournaments'),data);
    }
    closeM('m-tour'); toast('Tournament saved!'); window.renderTournaments();
  } catch(e) {
    toast(e.code==='permission-denied'?'Permission denied — check Firestore rules':'Save failed: '+e.message,'err');
  }
};

// ─────────────────────────────────────────────
// TOURNAMENT DETAIL
// ─────────────────────────────────────────────
window.openTourDetail = async function(id) {
  window.activeTourId=id;
  const snap=await getDoc(doc(db,'tournaments',id)); const t=snap.data();
  window.activeTourData=t;
  $('td-name').textContent=t.name;
  const tl=t.tourType==='Ongoing'?'♾ Ongoing':'📅 Seasonal';
  $('td-meta').textContent=`${tl} · ${t.sport} · ${t.status}${t.start?' · '+t.start:''}`;
  nav('tour-detail');
  buildTourDetailUI(t);
};

function buildTourDetailUI(t) {
  const isAdmin=window.CU.role==='admin', isOngoing=t.tourType==='Ongoing';

  // Action buttons
  let admBtns='';
  if (isAdmin) {
    const delBtn=`<button class="btn btn-red btn-sm" onclick="deleteTournament('${window.activeTourId}','${esc(t.name||'')}')">🗑 Delete</button>`;
    admBtns = isOngoing
      ? `<button class="btn btn-ghost btn-sm" onclick="openTourSession()">+ Session</button>
         <button class="btn btn-gold btn-sm" onclick="openEditTour()">Edit</button>
         ${delBtn}`
      : `<button class="btn btn-ghost btn-sm" onclick="openAddTeam()">+ Team</button>
         <button class="btn btn-ghost btn-sm" onclick="openAddFixture()">+ Fixture</button>
         <button class="btn btn-gold btn-sm" onclick="openEditTour()">Edit</button>
         ${delBtn}`;
  }
  $('td-action-btns').innerHTML=admBtns;

  // Winner banner if Finished
  const finishedBanner = t.status==='Finished' ? `
    <div style="background:rgba(232,176,75,.08);border:1px solid rgba(232,176,75,.3);border-radius:12px;padding:16px 20px;margin-bottom:20px">
      <div style="font-family:var(--ff-h);font-size:18px;color:var(--gold);margin-bottom:8px">🏆 Tournament Finished</div>
      <div class="g2" style="gap:10px">
        ${t.winner?`<div><div class="text-sm text-muted">Winner</div><strong>${esc(t.winner)}</strong></div>`:''}
        ${t.runner?`<div><div class="text-sm text-muted">Runner Up</div><strong>${esc(t.runner)}</strong></div>`:''}
        ${t.mom?`<div><div class="text-sm text-muted">Man of Tournament</div><strong style="color:var(--gold)">⭐ ${esc(t.mom)}</strong></div>`:''}
        ${t.bestPlayer?`<div><div class="text-sm text-muted">Best Player</div><strong style="color:var(--gold)">${esc(t.bestPlayer)}</strong></div>`:''}
      </div>
    </div>` : '';

  // Tabs
  let tabs='';
  if (isOngoing) {
    tabs=`<div class="tab on" onclick="tdTab('members')">Players</div>
          <div class="tab" onclick="tdTab('attendance')">Attendance</div>
          <div class="tab" onclick="tdTab('tourpay')">💳 Payments</div>
          ${isAdmin?'<div class="tab" onclick="tdTab(\'accounting\')">Accounting</div>':''}
          <div class="tab" onclick="tdTab('myreport')">📄 My Report</div>
          ${isAdmin?`<div class="tab" onclick="tdTab('adminreport')">📊 Reports</div>`:''}`;
  } else {
    tabs=`<div class="tab on" onclick="tdTab('teams')">Teams</div>
          <div class="tab" onclick="tdTab('fixtures')">Fixtures & Results</div>
          <div class="tab" onclick="tdTab('standings')">Standings</div>
          ${isAdmin?'<div class="tab" onclick="tdTab(\'accounting\')">Accounting</div>':''}
          ${t.status==='Finished'?'<div class="tab" onclick="tdTab(\'report\')">Report</div>':''}`;
  }
  $('td-tabs').innerHTML=tabs;
  $('td-tab-banner').innerHTML=finishedBanner;

  const defaultTab = isOngoing ? 'members' : 'teams';
  tdTab(defaultTab);
}

window.tdTab = function(tab) {
  document.querySelectorAll('#td-tabs .tab').forEach(t=>t.classList.toggle('on',t.getAttribute('onclick')?.includes(`'${tab}'`)));
  const el=$('td-tab-content');
  if (tab==='members')     renderOngoingMembers(el);
  if (tab==='attendance')  renderOngoingAttendance(el);
  if (tab==='tourpay')     renderTourPayments(el);
  if (tab==='teams')       renderTDTeams(el);
  if (tab==='fixtures')    renderTDFix(el);
  if (tab==='standings')   renderTDStandings(el);
  if (tab==='accounting')  renderTDAccounting();
  if (tab==='report')      renderTDReport(el);
  if (tab==='myreport')    renderMyAttReport(el);
  if (tab==='adminreport') renderAdminReportPanel(el);
};

// ─────────────────────────────────────────────
// ONGOING TOURNAMENT
// ─────────────────────────────────────────────
async function renderOngoingMembers(el) {
  el.innerHTML='<div class="empty">Loading…</div>';
  const tourId=window.activeTourId;
  const snap=await getDocs(query(collection(db,'tourMembers'),where('tourId','==',tourId)));
  const members=snap.docs.map(d=>({id:d.id,...d.data()}));
  const alreadyJoined=members.find(m=>m.userId===window.CU.uid);
  const isAdmin=window.CU.role==='admin';
  const now=new Date(); const tm=MONTHS[now.getMonth()], ty=now.getFullYear();

  // Fetch this month's tour payments for all members
  const tpSnap=await getDocs(query(collection(db,'tourPayments'),where('tourId','==',tourId),where('month','==',tm),where('year','==',ty)));
  const tourPays=tpSnap.docs.map(d=>({id:d.id,...d.data()}));

  // My payment status
  const myPay=tourPays.find(p=>p.memberId===window.CU.uid);
  let myPayBanner='';
  if (!isAdmin && alreadyJoined) {
    if (!myPay) {
      myPayBanner=`<div class="due-banner mb16">⚠️ Your monthly subscription is due for <strong>${tm} ${ty}</strong> — <button class="btn btn-gold btn-xs" onclick="tdTab('tourpay')" style="margin-left:8px">Pay Now</button></div>`;
    } else if (myPay.status==='pending') {
      myPayBanner=`<div style="background:rgba(232,176,75,.08);border:1px solid rgba(232,176,75,.3);border-radius:10px;padding:10px 14px;font-size:13px;color:var(--gold);margin-bottom:16px">⏳ Your payment for ${tm} ${ty} is under review</div>`;
    } else if (myPay.status==='approved') {
      myPayBanner=`<div style="background:rgba(74,222,128,.07);border:1px solid rgba(74,222,128,.25);border-radius:10px;padding:10px 14px;font-size:13px;color:var(--green);margin-bottom:16px">✓ Payment for ${tm} ${ty} approved${myPay.amount?' — €'+fmt2dp(myPay.amount):''}</div>`;
    }
  }

  let html=`${myPayBanner}<div class="row-sb mb16">
    <div class="card-t" style="margin:0">${members.length} Player${members.length!==1?'s':''} Joined</div>
    ${!alreadyJoined?`<button class="btn btn-gold btn-sm" onclick="joinOngoingTour()">+ Join This Tournament</button>`:
      `<span class="b b-green" style="padding:8px 16px">✓ You're joined</span>`}
  </div>`;

  if (!members.length) { html+='<div class="empty">No players yet. Be the first!</div>'; }
  else {
    // Admin sees payment status per member
    const payCol = isAdmin ? '<th>This Month</th>' : '';
    html+=`<div class="tw"><table>
      <thead><tr><th>#</th><th>Player</th><th>Joined</th>${payCol}${isAdmin?'<th></th>':''}</tr></thead>
      <tbody>${members.map((m,i)=>{
        let payHtml='';
        if (isAdmin) {
          const p=tourPays.find(p=>p.memberId===m.userId);
          if (!p) payHtml=`<td><span class="b b-red" style="font-size:10px">Due</span></td>`;
          else payHtml=`<td><span class="b b-${p.status==='approved'?'green':p.status==='rejected'?'red':'gold'}" style="font-size:10px">${p.status}</span></td>`;
        }
        return `<tr>
          <td>${i+1}</td>
          <td><strong>${esc(m.memberName)}</strong>${m.userId===window.CU.uid?' <span class="b b-gray" style="font-size:10px">you</span>':''}</td>
          <td class="text-sm text-muted">${fmtDate(m.joinedAt)}</td>
          ${payHtml}
          ${isAdmin?`<td><button class="btn btn-red btn-xs" onclick="removeTourMember('${m.id}')">Remove</button></td>`:''}
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  }
  el.innerHTML=html;
}

window.joinOngoingTour = async function() {
  try {
    await addDoc(collection(db,'tourMembers'),{tourId:window.activeTourId,userId:window.CU.uid,memberName:window.CU.name,joinedAt:serverTimestamp()});
    toast('You joined!'); renderOngoingMembers($('td-tab-content'));
  } catch(e){ toast('Failed: '+e.message,'err'); }
};
window.removeTourMember = async function(id) {
  if (!confirm('Remove player?')) return;
  await deleteDoc(doc(db,'tourMembers',id)); toast('Removed'); renderOngoingMembers($('td-tab-content'));
};

async function renderOngoingAttendance(el) {
  el.innerHTML='<div class="empty">Loading…</div>';
  const isAdmin=window.CU.role==='admin';
  const tourId=window.activeTourId;

  // FIX: query without orderBy to avoid composite index requirement
  const [sessSnap,membSnap,attSnap] = await Promise.all([
    getDocs(query(collection(db,'sessions'),where('tourId','==',tourId))),
    getDocs(query(collection(db,'tourMembers'),where('tourId','==',tourId))),
    getDocs(query(collection(db,'attendance'),where('tourId','==',tourId)))
  ]);

  // Sort sessions client-side (avoids Firestore composite index)
  const sessions=sessSnap.docs.map(d=>({id:d.id,...d.data()}))
    .sort((a,b)=>b.date.localeCompare(a.date));
  const members=membSnap.docs.map(d=>({uid:d.data().userId,name:d.data().memberName}));
  const attAll=attSnap.docs.map(d=>({id:d.id,...d.data()}));

  let html='';
  if (isAdmin) {
    html+=`<div class="row-sb mb16">
      <div class="card-t" style="margin:0">${sessions.length} Session${sessions.length!==1?'s':''}</div>
      <button class="btn btn-gold btn-sm" onclick="openTourSession()">+ New Session</button>
    </div>`;
  }
  if (!sessions.length) { el.innerHTML=html+'<div class="empty">No sessions yet.</div>'; return; }

  for (const sess of sessions) {
    const sessAtts=attAll.filter(a=>a.sessionId===sess.id);
    const myAtt=sessAtts.find(a=>a.userId===window.CU.uid);
    const presentCount=sessAtts.filter(a=>a.present).length;
    html+=`<div class="card mb20">
      <div class="row-sb mb16">
        <div><strong>${fmtDate(sess.date)}</strong>
          <div class="text-sm text-muted">${esc(sess.notes||'')}${presentCount?' · '+presentCount+' present':''}</div>
        </div>
        ${isAdmin?`<button class="btn btn-red btn-xs" onclick="delTourSession('${sess.id}')">Delete</button>`:''}
      </div>`;
    if (isAdmin) {
      html+=`<div class="tw"><table><thead><tr><th>Player</th><th>Status</th><th></th></tr></thead><tbody>`;
      if (!members.length) html+=`<tr><td colspan="3" style="color:var(--muted2);text-align:center">No players joined yet</td></tr>`;
      members.forEach(m=>{
        const att=sessAtts.find(a=>a.userId===m.uid);
        html+=`<tr>
          <td>${esc(m.name)}</td>
          <td><span class="b b-${att?.present?'green':'gray'}">${att?.present?'Present':'Absent'}</span></td>
          <td><button class="btn btn-sm ${att?.present?'btn-red':'btn-teal'}" onclick="toggleTourAtt('${sess.id}','${m.uid}','${tourId}')">
            ${att?.present?'Mark Absent':'Mark Present'}</button></td>
        </tr>`;
      });
      html+=`</tbody></table></div>`;
      html+=`<div id="sess-acc-${sess.id}"><div class="text-muted text-sm" style="margin-top:8px">Loading finances…</div></div>`;
    } else {
      const isMember=members.find(m=>m.uid===window.CU.uid);
      if (isMember) {
        html+=`<div class="text-sm text-muted mb16">Your attendance: <span class="b b-${myAtt?.present?'green':'gray'}">${myAtt?.present?'Present':'Not marked'}</span></div>
          ${!myAtt?.present?`<button class="btn btn-teal btn-sm" onclick="markTourSelf('${sess.id}','${tourId}')">✓ Mark Myself Present</button>`:'<span class="b b-green">✓ Marked</span>'}`;
      } else {
        html+=`<div class="text-sm text-muted">Join this tournament to mark attendance.</div>`;
      }
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

window.toggleTourAtt = async function(sessionId, userId, tourId) {
  const snap=await getDocs(query(collection(db,'attendance'),where('sessionId','==',sessionId),where('userId','==',userId)));
  if (snap.empty) await addDoc(collection(db,'attendance'),{sessionId,userId,tourId,present:true});
  else await updateDoc(snap.docs[0].ref,{present:!snap.docs[0].data().present});
  renderOngoingAttendance($('td-tab-content'));
};

window.markTourSelf = async function(sessionId, tourId) {
  const snap=await getDocs(query(collection(db,'attendance'),where('sessionId','==',sessionId),where('userId','==',window.CU.uid)));
  if (snap.empty) await addDoc(collection(db,'attendance'),{sessionId,userId:window.CU.uid,tourId,present:true});
  else await updateDoc(snap.docs[0].ref,{present:true});
  toast('Attendance marked!'); renderOngoingAttendance($('td-tab-content'));
};

window.openTourSession = function() {
  $('ss-sport').value=window.activeTourData?.sport||'Football';
  $('ss-date').value=''; $('ss-notes').value='';
  $('ss-tour-id').value=window.activeTourId;
  openM('m-session');
};

window.delTourSession = async function(id) {
  if (!confirm('Delete this session?')) return;
  await deleteDoc(doc(db,'sessions',id)); toast('Deleted'); renderOngoingAttendance($('td-tab-content'));
};

// ─────────────────────────────────────────────
// SEASONAL TOURNAMENT
// ─────────────────────────────────────────────
async function renderTDTeams(el) {
  el=el||$('td-tab-content'); el.innerHTML='<div class="empty">Loading…</div>';
  const snap=await getDocs(query(collection(db,'teams'),where('tourId','==',window.activeTourId)));
  if (snap.empty) { el.innerHTML='<div class="empty">No teams added yet.</div>'; return; }
  el.innerHTML=`<div class="g2">${snap.docs.map(d=>{const t=d.data(); return `
    <div class="card">
      <div class="row-sb mb16">
        <div style="font-family:var(--ff-h);font-size:18px;font-weight:700">${esc(t.name)}</div>
        ${window.CU.role==='admin'?`<button class="btn btn-red btn-xs" onclick="delTeam('${d.id}')">Remove</button>`:''}
      </div>
      ${(t.players||[]).map((p,i)=>`<div style="padding:5px 0;border-bottom:1px solid var(--border);font-size:13px">${i+1}. ${esc(p)}</div>`).join('')}
    </div>`;}).join('')}</div>`;
}
window.openAddTeam=function(){ $('team-n').value=''; $('team-p').value=''; openM('m-team'); };
window.saveTeam=async function(){
  const name=$('team-n').value.trim(), players=$('team-p').value.split('\n').map(p=>p.trim()).filter(Boolean);
  if (!name){ toast('Enter team name','err'); return; }
  try{ await addDoc(collection(db,'teams'),{tourId:window.activeTourId,name,players,createdAt:serverTimestamp()}); closeM('m-team'); toast('Team added!'); renderTDTeams($('td-tab-content')); }
  catch(e){ toast('Failed: '+e.message,'err'); }
};
window.delTeam=async function(id){ if(!confirm('Remove team?'))return; await deleteDoc(doc(db,'teams',id)); toast('Removed'); renderTDTeams($('td-tab-content')); };

// ─────────────────────────────────────────────
// FIXTURES WITH MATCH RESULT FIELDS
// ─────────────────────────────────────────────
async function renderTDFix(el) {
  el=el||$('td-tab-content'); el.innerHTML='<div class="empty">Loading…</div>';
  const snap=await getDocs(query(collection(db,'fixtures'),where('tourId','==',window.activeTourId)));
  if (snap.empty) { el.innerHTML='<div class="empty">No fixtures yet.</div>'; return; }
  el.innerHTML=snap.docs.map(d=>{
    const f=d.data();
    const hasResult=f.scoreHome!==undefined&&f.scoreHome!=='';
    return `<div class="card mb16">
      <div class="fx" style="margin-bottom:${hasResult&&(f.mom||f.motm||f.note)?'12px':'0'}">
        <div class="fx-team">${esc(f.home)}</div>
        ${hasResult?`<div class="fx-score">${f.scoreHome} – ${f.scoreAway}</div>`:
          `<div class="fx-vs">${f.date?fmtDate(f.date):'VS'}</div>`}
        <div class="fx-team r">${esc(f.away)}</div>
        <div class="text-sm text-muted" style="min-width:80px;text-align:right">${esc(f.venue||'')}</div>
        ${window.CU.role==='admin'?`<button class="btn btn-ghost btn-xs" onclick="openEditFix('${d.id}')">Edit</button>`:''}
      </div>
      ${hasResult&&(f.mom||f.note)?`<div style="padding:8px 4px;border-top:1px solid var(--border);font-size:12px;color:var(--muted2)">
        ${f.mom?`⭐ Man of Match: <strong style="color:var(--gold)">${esc(f.mom)}</strong>`:''}
        ${f.note?` · 📝 ${esc(f.note)}`:''}
      </div>`:''}
    </div>`;
  }).join('');
}

window.openAddFixture = async function() {
  const snap=await getDocs(query(collection(db,'teams'),where('tourId','==',window.activeTourId)));
  if (snap.size<2){ toast('Add at least 2 teams first','err'); return; }
  const opts=snap.docs.map(d=>`<option>${esc(d.data().name)}</option>`).join('');
  $('fx-home').innerHTML=opts; $('fx-away').innerHTML=opts;
  $('fx-dt').value=''; $('fx-venue').value=''; $('fx-sh').value=''; $('fx-sa').value=''; $('fx-mom').value=''; $('fx-note').value='';
  delete $('fx-home').dataset.eid;
  openM('m-fix');
};

window.openEditFix = async function(id) {
  const snap=await getDoc(doc(db,'fixtures',id)); const f=snap.data();
  const tsnap=await getDocs(query(collection(db,'teams'),where('tourId','==',window.activeTourId)));
  const opts=tsnap.docs.map(d=>`<option>${esc(d.data().name)}</option>`).join('');
  $('fx-home').innerHTML=opts; $('fx-away').innerHTML=opts;
  $('fx-home').value=f.home; $('fx-away').value=f.away;
  $('fx-dt').value=f.date||''; $('fx-venue').value=f.venue||'';
  $('fx-sh').value=f.scoreHome!==undefined?f.scoreHome:'';
  $('fx-sa').value=f.scoreAway!==undefined?f.scoreAway:'';
  $('fx-mom').value=f.mom||''; $('fx-note').value=f.note||'';
  $('fx-home').dataset.eid=id; openM('m-fix');
};

window.saveFix = async function() {
  const home=$('fx-home').value, away=$('fx-away').value;
  if (home===away){ toast('Teams must be different','err'); return; }
  const data={tourId:window.activeTourId,home,away,date:$('fx-dt').value,venue:$('fx-venue').value,
    scoreHome:$('fx-sh').value,scoreAway:$('fx-sa').value,mom:$('fx-mom').value.trim(),note:$('fx-note').value.trim()};
  try {
    const eid=$('fx-home').dataset.eid;
    if (eid){ await updateDoc(doc(db,'fixtures',eid),data); delete $('fx-home').dataset.eid; }
    else await addDoc(collection(db,'fixtures'),data);
    closeM('m-fix'); toast('Fixture saved!'); renderTDFix($('td-tab-content'));
  } catch(e){ toast('Failed: '+e.message,'err'); }
};

// ─────────────────────────────────────────────
// STANDINGS
// ─────────────────────────────────────────────
async function renderTDStandings(el) {
  el=el||$('td-tab-content');
  const snap=await getDocs(query(collection(db,'fixtures'),where('tourId','==',window.activeTourId)));
  const fixtures=snap.docs.map(d=>d.data()).filter(f=>f.scoreHome!==undefined&&f.scoreHome!=='');
  if (!fixtures.length){ el.innerHTML='<div class="empty">No results recorded yet.</div>'; return; }
  const T={};
  fixtures.forEach(f=>{
    [f.home,f.away].forEach(n=>{if(!T[n])T[n]={name:n,P:0,W:0,D:0,L:0,GF:0,GA:0};});
    const h=+f.scoreHome,a=+f.scoreAway;
    T[f.home].P++;T[f.away].P++;T[f.home].GF+=h;T[f.home].GA+=a;T[f.away].GF+=a;T[f.away].GA+=h;
    if(h>a){T[f.home].W++;T[f.away].L++;}else if(h<a){T[f.away].W++;T[f.home].L++;}else{T[f.home].D++;T[f.away].D++;}
  });
  const sorted=Object.values(T).sort((a,b)=>(b.W*3+b.D)-(a.W*3+a.D));
  el.innerHTML=`<div class="tw"><table>
    <thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>Pts</th></tr></thead>
    <tbody>${sorted.map((t,i)=>`<tr>
      <td>${i+1}</td><td><strong>${esc(t.name)}</strong></td>
      <td>${t.P}</td><td>${t.W}</td><td>${t.D}</td><td>${t.L}</td><td>${t.GF}</td><td>${t.GA}</td>
      <td><strong style="color:var(--gold)">${t.W*3+t.D}</strong></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

// ─────────────────────────────────────────────
// TOURNAMENT REPORT (Finished tournaments)
// ─────────────────────────────────────────────
async function renderTDReport(el) {
  el=el||$('td-tab-content');
  const t=window.activeTourData;
  const [teamsSnap,fixturesSnap,accSnap,membSnap] = await Promise.all([
    getDocs(query(collection(db,'teams'),where('tourId','==',window.activeTourId))),
    getDocs(query(collection(db,'fixtures'),where('tourId','==',window.activeTourId))),
    getDocs(query(collection(db,'accounting'),where('scopeType','==','tournament'),where('scopeId','==',window.activeTourId))),
    getDocs(query(collection(db,'tourMembers'),where('tourId','==',window.activeTourId)))
  ]);
  const teams=teamsSnap.docs.map(d=>d.data());
  const fixtures=fixturesSnap.docs.map(d=>d.data()).filter(f=>f.scoreHome!==undefined&&f.scoreHome!=='');
  const accEntries=accSnap.docs.map(d=>d.data());
  const income=accEntries.filter(e=>e.type==='income').reduce((s,e)=>s+(+e.amount||0),0);
  const expense=accEntries.filter(e=>e.type==='expense').reduce((s,e)=>s+(+e.amount||0),0);
  const net=income-expense;
  const players=membSnap.size;
  const totalPlayers=teams.reduce((s,t)=>s+(t.players?.length||0),0);

  el.innerHTML=`
    <div style="background:rgba(232,176,75,.06);border:1px solid rgba(232,176,75,.2);border-radius:14px;padding:24px;margin-bottom:20px">
      <div style="font-family:var(--ff-h);font-size:26px;color:var(--gold);margin-bottom:16px">📋 Tournament Report</div>
      <div class="g2" style="gap:14px">
        <div class="sc"><div class="sc-l">Teams Participated</div><div class="sc-v">${teams.length}</div></div>
        <div class="sc"><div class="sc-l">Total Players</div><div class="sc-v">${totalPlayers||players}</div></div>
        <div class="sc"><div class="sc-l">Matches Played</div><div class="sc-v">${fixtures.length}</div></div>
        <div class="sc"><div class="sc-l">Total Goals</div><div class="sc-v">${fixtures.reduce((s,f)=>s+(+f.scoreHome||0)+(+f.scoreAway||0),0)}</div></div>
      </div>
    </div>
    ${t.winner||t.runner||t.mom?`
    <div class="card mb20">
      <div class="card-t">Awards</div>
      <div class="g2">
        ${t.winner?`<div><div class="text-sm text-muted">🥇 Winner</div><strong style="font-size:15px">${esc(t.winner)}</strong></div>`:''}
        ${t.runner?`<div><div class="text-sm text-muted">🥈 Runner Up</div><strong style="font-size:15px">${esc(t.runner)}</strong></div>`:''}
        ${t.mom?`<div><div class="text-sm text-muted">⭐ Man of Tournament</div><strong style="font-size:15px;color:var(--gold)">${esc(t.mom)}</strong></div>`:''}
        ${t.bestPlayer?`<div><div class="text-sm text-muted">🏅 Best Player</div><strong style="font-size:15px;color:var(--gold)">${esc(t.bestPlayer)}</strong></div>`:''}
      </div>
    </div>`:''}
    <div class="card mb20">
      <div class="card-t">Financial Summary</div>
      <div class="acc-summary">
        <div class="acc-card income"><div class="acc-label">Total Income</div><div class="acc-value">+${fmt2dp(income)}</div></div>
        <div class="acc-card expense"><div class="acc-label">Total Expenses</div><div class="acc-value">−${fmt2dp(expense)}</div></div>
        <div class="acc-card ${net>=0?'net-pos':'net-neg'}"><div class="acc-label">Net Balance</div><div class="acc-value">${net>=0?'+':'−'}${fmt2dp(Math.abs(net))}</div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-t">Teams & Players</div>
      <div class="g2">${teams.map(t=>`
        <div style="padding:12px;background:var(--s2);border:1px solid var(--border);border-radius:10px">
          <div style="font-weight:700;margin-bottom:8px">${esc(t.name)} <span class="b b-gray">${t.players?.length||0} players</span></div>
          ${(t.players||[]).map(p=>`<div style="font-size:12px;color:var(--muted2);padding:3px 0">${esc(p)}</div>`).join('')}
        </div>`).join('')}
      </div>
    </div>`;
}

// ─────────────────────────────────────────────
// TOURNAMENT PAYMENTS TAB
// ─────────────────────────────────────────────
async function renderTourPayments(el) {
  el.innerHTML='<div class="empty">Loading…</div>';
  const tourId=window.activeTourId, t=window.activeTourData;
  const isAdmin=window.CU.role==='admin';
  const now=new Date(); const tm=MONTHS[now.getMonth()], ty=now.getFullYear();

  // Check if this member is joined
  if (!isAdmin) {
    const joinSnap=await getDocs(query(collection(db,'tourMembers'),where('tourId','==',tourId),where('userId','==',window.CU.uid)));
    if (joinSnap.empty) {
      el.innerHTML='<div class="empty">Join this tournament first to access payments.</div>';
      return;
    }
  }

  // Fetch tour payments
  const allTpSnap=await getDocs(query(collection(db,'tourPayments'),where('tourId','==',tourId)));
  const allTp=allTpSnap.docs.map(d=>({id:d.id,...d.data()}));

  if (isAdmin) {
    // Admin: see all, approve/reject, pending list
    const pending=allTp.filter(p=>p.status==='pending');
    const membSnap=await getDocs(query(collection(db,'tourMembers'),where('tourId','==',tourId)));
    const members=membSnap.docs.map(d=>({uid:d.data().userId,name:d.data().memberName}));

    // Build month overview table
    const months=[...new Set(allTp.map(p=>`${p.month} ${p.year}`))];
    if (!months.length) months.push(`${tm} ${ty}`);

    el.innerHTML=`
      <div class="stats mb20">
        <div class="sc"><div class="sc-l">Members</div><div class="sc-v">${members.length}</div></div>
        <div class="sc"><div class="sc-l">Pending Review</div><div class="sc-v" style="color:var(--gold)">${pending.length}</div></div>
        <div class="sc"><div class="sc-l">Approved</div><div class="sc-v" style="color:var(--green)">${allTp.filter(p=>p.status==='approved').length}</div></div>
      </div>
      ${pending.length?`
        <div class="card-t">Pending Receipts</div>
        <div class="tw mb20"><table>
          <thead><tr><th>Member</th><th>Month</th><th>Amount</th><th>Uploaded</th><th></th></tr></thead>
          <tbody>${pending.map(p=>`<tr>
            <td><strong>${esc(p.memberName)}</strong></td>
            <td>${esc(p.month)} ${p.year}</td>
            <td>${p.amount?`<strong style="color:var(--green)">€${fmt2dp(p.amount)}</strong>`:'—'}</td>
            <td>${fmtDate(p.uploaded)}</td>
            <td><button class="btn btn-teal btn-sm" onclick="reviewTourPay('${p.id}')">Review</button></td>
          </tr>`).join('')}</tbody>
        </table></div>`:''}
      <div class="card-t">Payment Status Overview — ${tm} ${ty}</div>
      <div class="tw"><table>
        <thead><tr><th>Member</th><th>Amount</th><th>Status</th><th></th></tr></thead>
        <tbody>${members.map(m=>{
          const p=allTp.find(p=>p.memberId===m.uid&&p.month===tm&&p.year===ty);
          const status=p?`<span class="b b-${p.status==='approved'?'green':p.status==='rejected'?'red':'gold'}">${p.status}</span>`
            :`<span class="b b-red">Due</span>`;
          return `<tr>
            <td><strong>${esc(m.name)}</strong></td>
            <td>${p?.amount?`€${fmt2dp(p.amount)}`:'—'}</td>
            <td>${status}</td>
            <td>${p?`<button class="btn btn-ghost btn-xs" onclick="reviewTourPay('${p.id}')">View</button>`:''}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`;
  } else {
    // Member: own payments + upload form
    const myPays=allTp.filter(p=>p.memberId===window.CU.uid).sort((a,b)=>`${b.year}${MONTHS.indexOf(b.month)}`.localeCompare(`${a.year}${MONTHS.indexOf(a.month)}`));
    const thisPay=myPays.find(p=>p.month===tm&&p.year===ty);
    // Due warnings for past months
    const dueWarnings=buildDueWarningsForTour(myPays,now);
    let statusHtml='';
    if (!thisPay) statusHtml=`<div class="due-banner">⚠️ Your monthly subscription is due for <strong>${tm} ${ty}</strong></div>`;
    else if (thisPay.status==='pending') statusHtml=`<div style="background:rgba(232,176,75,.08);border:1px solid rgba(232,176,75,.3);border-radius:10px;padding:12px 16px;font-size:13px;color:var(--gold)">⏳ Receipt for <strong>${tm} ${ty}</strong> is under review</div>`;
    else if (thisPay.status==='approved') statusHtml=`<div style="background:rgba(74,222,128,.07);border:1px solid rgba(74,222,128,.25);border-radius:10px;padding:12px 16px;font-size:13px;color:var(--green)">✓ Payment for <strong>${tm} ${ty}</strong> approved${thisPay.amount?' — €'+fmt2dp(thisPay.amount):''}</div>`;
    else statusHtml=`<div class="due-banner">❌ Payment rejected. Please re-upload below.</div>`;

    const showUpload=!thisPay||thisPay.status==='rejected';
    el.innerHTML=`
      <div class="mb16">${statusHtml}</div>
      ${dueWarnings}
      ${showUpload?`<div class="card mb20">
        <div class="card-t">Submit Payment Receipt — ${esc(t?.name||'')}</div>
        <div class="fg"><label>Month</label><select id="tp-month">${MONTHS.map(m=>`<option ${m===tm?'selected':''}>${m}</option>`).join('')}</select></div>
        <div class="fg"><label>Year</label><input type="number" id="tp-year" value="${ty}" min="2020" max="2035"></div>
        <div class="fg"><label>Amount Paid (€)</label><input type="number" id="tp-amount" placeholder="e.g. 20.00" min="0" step="0.01"></div>
        <div class="fg"><label>Receipt (image or PDF, max 2MB)</label><input type="file" id="tp-file" accept="image/*,.pdf"></div>
        <button class="btn btn-gold" onclick="uploadTourReceipt('${tourId}')">Submit for Approval</button>
      </div>`:''}
      <div class="card-t">My Payment History</div>
      ${myPays.length?`<div class="tw"><table>
        <thead><tr><th>Month</th><th>Year</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>${myPays.map(p=>`<tr>
          <td>${esc(p.month)}</td><td>${p.year}</td>
          <td>${p.amount?`€${fmt2dp(p.amount)}`:'—'}</td>
          <td><span class="b b-${p.status==='approved'?'green':p.status==='rejected'?'red':'gold'}">${p.status}</span></td>
        </tr>`).join('')}</tbody>
      </table></div>`:'<div class="empty">No payments yet.</div>'}`;
  }
}

function buildDueWarningsForTour(pays, now) {
  const warnings=[];
  for (let i=1;i<=3;i++) {
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const month=MONTHS[d.getMonth()], year=d.getFullYear();
    const p=pays.find(p=>p.month===month&&p.year===year);
    if (!p||p.status==='rejected') {
      warnings.push(`<div class="due-banner" style="margin-bottom:8px">⚠️ Monthly subscription is due for <strong>${month} ${year}</strong>${p?.status==='rejected'?' — previous receipt was rejected':''}</div>`);
    }
  }
  return warnings.length?`<div class="mb16">${warnings.join('')}</div>`:'';
}

window.uploadTourReceipt = function(tourId) {
  const monthEl=$('tp-month'),yearEl=$('tp-year'),amountEl=$('tp-amount'),fileEl=$('tp-file');
  if (!monthEl||!fileEl){ toast('Upload form not found','err'); return; }
  const month=monthEl.value, year=parseInt(yearEl.value);
  const amount=parseFloat(amountEl?.value)||0;
  const file=fileEl.files[0];
  if (!file){ toast('Select a receipt','err'); return; }
  if (file.size>2*1024*1024){ toast('File too large — max 2MB','err'); return; }
  const reader=new FileReader();
  reader.onload=async e=>{
    // Check not already submitted (non-rejected)
    const existing=await getDocs(query(collection(db,'tourPayments'),where('tourId','==',tourId),where('memberId','==',window.CU.uid),where('month','==',month),where('year','==',year)));
    if (existing.docs.some(d=>d.data().status!=='rejected')){ toast('Already submitted for this month','err'); return; }
    await addDoc(collection(db,'tourPayments'),{
      tourId, memberId:window.CU.uid, memberName:window.CU.name,
      month, year, amount, status:'pending',
      receiptData:e.target.result, uploaded:serverTimestamp()
    });
    toast('Receipt submitted! Awaiting admin approval.');
    renderTourPayments($('td-tab-content'));
  };
  reader.readAsDataURL(file);
};

window.reviewTourPay = async function(id) {
  const snap=await getDoc(doc(db,'tourPayments',id)); const p=snap.data();
  $('pay-rev-body').innerHTML=`
    <div class="fg"><label>Member</label><strong>${esc(p.memberName)}</strong></div>
    <div class="fg"><label>Tournament</label>${esc(window.activeTourData?.name||'')}</div>
    <div class="fg"><label>Period</label>${esc(p.month)} ${p.year}</div>
    ${p.amount?`<div class="fg"><label>Amount Paid</label><strong style="color:var(--green);font-size:18px">€${fmt2dp(p.amount)}</strong></div>`:''}
    <div class="fg"><label>Status</label><span class="b b-${p.status==='approved'?'green':p.status==='rejected'?'red':'gold'}">${p.status}</span></div>
    <div class="fg"><label>Receipt</label>${p.receiptData?`<img src="${p.receiptData}" class="receipt-img">`:'No receipt attached'}</div>`;
  $('pay-rev-btns').innerHTML=p.status==='pending'
    ?`<button class="btn btn-gold" onclick="approveTourPay('${id}','${p.tourId}',${p.amount||0},'${p.memberName}','${p.month}',${p.year})">✓ Approve</button>
      <button class="btn btn-red" onclick="rejectTourPay('${id}')">✗ Reject</button>`
    :`<span class="b b-${p.status==='approved'?'green':'red'}" style="padding:10px 18px">Payment ${p.status}</span>`;
  openM('m-pay-review');
};

window.approveTourPay = async function(id, tourId, amount, memberName, month, year) {
  await updateDoc(doc(db,'tourPayments',id),{status:'approved'});
  // Auto-add to tournament accounting as income
  try {
    await addDoc(collection(db,'accounting'),{
      type:'income', desc:`Membership fee — ${memberName}`,
      cat:'Membership Fees', amount:+amount,
      date:new Date().toISOString().slice(0,10),
      note:`${month} ${year}`,
      scopeType:'tournament', scopeId:tourId,
      createdBy:'system', createdAt:serverTimestamp()
    });
  } catch(e){ console.warn('Accounting entry failed',e); }
  closeM('m-pay-review'); toast('Approved & recorded in accounting!');
  renderTourPayments($('td-tab-content'));
};

window.rejectTourPay = async function(id) {
  await updateDoc(doc(db,'tourPayments',id),{status:'rejected'});
  closeM('m-pay-review'); toast('Rejected','err');
  renderTourPayments($('td-tab-content'));
};

// ─────────────────────────────────────────────
// SEASONAL JOIN
// ─────────────────────────────────────────────
window.openJoinSeasonal=function(){ openM('m-join-seasonal'); };
window.confirmJoinSeasonal=async function(){
  const role=$('join-role').value;
  try{
    await addDoc(collection(db,'tourMembers'),{tourId:window.activeTourId,userId:window.CU.uid,memberName:window.CU.name,playerRole:role,joinedAt:serverTimestamp()});
    closeM('m-join-seasonal'); toast(`Joined as ${role}!`);
    renderTDTeams($('td-tab-content'));
  }catch(e){toast('Failed: '+e.message,'err');}
};

window.quickJoinTour = async function(tourId, tourType) {
  if (tourType==='Seasonal') {
    window.activeTourId=tourId; openM('m-join-seasonal');
  } else {
    try{
      await addDoc(collection(db,'tourMembers'),{tourId,userId:window.CU.uid,memberName:window.CU.name,joinedAt:serverTimestamp()});
      toast('Joined!'); window.renderProfile();
    }catch(e){toast('Failed: '+e.message,'err');}
  }
};

// ─────────────────────────────────────────────
// MY ATTENDANCE REPORT TAB (member sees own)
// ─────────────────────────────────────────────
async function renderMyAttReport(el) {
  el.innerHTML='<div class="empty">Loading your attendance…</div>';
  const tourId=window.activeTourId, t=window.activeTourData;
  const uid=window.CU.uid;
  const sessSnap=await getDocs(query(collection(db,'sessions'),where('tourId','==',tourId)));
  const sessions=sessSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.date.localeCompare(b.date));
  const attSnap=await getDocs(query(collection(db,'attendance'),where('tourId','==',tourId),where('userId','==',uid)));
  const attAll=attSnap.docs.map(d=>d.data());

  if (!sessions.length){el.innerHTML='<div class="empty">No sessions yet.</div>';return;}

  let present=0;
  const rows=sessions.map(s=>{
    const att=attAll.find(a=>a.sessionId===s.id);
    const isPresent=att?.present;
    if(isPresent)present++;
    return `<tr>
      <td>${s.date}</td>
      <td>${esc(s.notes||'—')}</td>
      <td><span class="b b-${isPresent?'green':'gray'}">${isPresent?'Present':'Absent'}</span></td>
    </tr>`;
  }).join('');

  el.innerHTML=`
    <div class="row-sb mb16">
      <div>
        <strong>${window.CU.name}</strong>
        <div class="text-sm text-muted">${present} / ${sessions.length} sessions attended</div>
      </div>
      <button class="btn btn-teal btn-sm" onclick="downloadMyAttendance('${tourId}','${esc(t?.name||'')}')">⬇ Download CSV</button>
    </div>
    <div class="tw"><table>
      <thead><tr><th>Date</th><th>Notes</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

// ─────────────────────────────────────────────
// ADMIN REPORT PANEL
// ─────────────────────────────────────────────
async function renderAdminReportPanel(el) {
  el.innerHTML='<div class="empty">Loading members…</div>';
  const tourId=window.activeTourId, t=window.activeTourData;
  const membSnap=await getDocs(query(collection(db,'tourMembers'),where('tourId','==',tourId)));
  const members=membSnap.docs.map(d=>({uid:d.data().userId,name:d.data().memberName}));

  el.innerHTML=`
    <div class="card mb20">
      <div class="card-t">Download Reports</div>
      <div class="fg"><label>Report Type</label>
        <select id="rep-type">
          <option value="attendance">Attendance Report</option>
          <option value="payment">Payment Report</option>
        </select>
      </div>
      <div class="fg"><label>Member</label>
        <select id="rep-member">
          <option value="all">All Members (${members.length})</option>
          ${members.map(m=>`<option value="${m.uid}">${esc(m.name)}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-gold" onclick="runAdminReport('${tourId}','${esc(t?.name||'')}')">⬇ Download CSV</button>
    </div>

    <div class="card-t">Attendance Overview</div>
    <div id="att-overview-table"><div class="empty">Loading…</div></div>`;

  // Load attendance overview table
  renderAttOverviewTable(tourId, members);
}

async function renderAttOverviewTable(tourId, members) {
  const sessSnap=await getDocs(query(collection(db,'sessions'),where('tourId','==',tourId)));
  const sessions=sessSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.date.localeCompare(b.date));
  const attSnap=await getDocs(query(collection(db,'attendance'),where('tourId','==',tourId)));
  const attAll=attSnap.docs.map(d=>d.data());
  const el=document.getElementById('att-overview-table');
  if (!el) return;
  if (!sessions.length){el.innerHTML='<div class="empty">No sessions yet.</div>';return;}

  const dateHeaders=sessions.map(s=>`<th style="font-size:10px;white-space:nowrap">${s.date}</th>`).join('');
  const bodyRows=members.map(m=>{
    const cells=sessions.map(s=>{
      const att=attAll.find(a=>a.sessionId===s.id&&a.userId===m.uid);
      return `<td style="text-align:center">${att?.present?'<span class="b b-green" style="font-size:10px">✓</span>':'<span style="color:var(--muted);font-size:11px">—</span>'}</td>`;
    }).join('');
    const total=sessions.filter(s=>attAll.find(a=>a.sessionId===s.id&&a.userId===m.uid&&a.present)).length;
    return `<tr><td><strong>${esc(m.name)}</strong></td>${cells}<td style="text-align:center"><strong>${total}/${sessions.length}</strong></td></tr>`;
  }).join('');

  el.innerHTML=`<div class="tw" style="overflow-x:auto"><table>
    <thead><tr><th>Member</th>${dateHeaders}<th>Total</th></tr></thead>
    <tbody>${bodyRows}</tbody>
  </table></div>`;
}

window.runAdminReport = async function(tourId, tourName) {
  const type=$('rep-type').value;
  const membId=$('rep-member').value;
  const membSnap=await getDocs(query(collection(db,'tourMembers'),where('tourId','==',tourId)));
  const allMembers=membSnap.docs.map(d=>({uid:d.data().userId,name:d.data().memberName}));
  const members=membId==='all'?allMembers:allMembers.filter(m=>m.uid===membId);
  window._reportMembers=members;
  if (type==='attendance') await downloadAttendanceCSV(tourId,members);
  else await downloadPaymentCSV(members);
};