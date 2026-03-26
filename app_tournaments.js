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
  el.innerHTML = snap.docs.map(d => {
    const t=d.data(), id=d.id;
    const sc = t.status==='Ongoing'?'b-green':t.status==='Upcoming'?'b-blue':'b-gray';
    const tc = t.tourType==='Ongoing'?'b-teal':'b-purple';
    const tl = t.tourType==='Ongoing'?'♾ Ongoing':'📅 Seasonal';
    return `<div class="tc" onclick="openTourDetail('${id}')">
      <div class="tc-h">
        <div class="row" style="gap:6px;margin-bottom:4px">
          <span class="b ${tc}">${tl}</span>
          <span class="b ${sc}">${esc(t.status)}</span>
        </div>
        <div class="tc-name">${esc(t.name)}</div>
      </div>
      <div class="tc-b">
        <span class="b b-gold">${esc(t.sport)}</span>
        <div class="tc-meta">
          <div class="tc-mi">📅 ${t.start||'TBD'}${t.end?' → '+t.end:''}</div>
          ${t.status==='Finished'&&t.winner?`<div class="tc-mi">🏆 ${esc(t.winner)}</div>`:''}
        </div>
      </div>
    </div>`;
  }).join('');
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
    admBtns = isOngoing
      ? `<button class="btn btn-ghost btn-sm" onclick="openTourSession()">+ Session</button>
         <button class="btn btn-gold btn-sm" onclick="openEditTour()">Edit</button>`
      : `<button class="btn btn-ghost btn-sm" onclick="openAddTeam()">+ Team</button>
         <button class="btn btn-ghost btn-sm" onclick="openAddFixture()">+ Fixture</button>
         <button class="btn btn-gold btn-sm" onclick="openEditTour()">Edit</button>`;
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
          ${isAdmin?'<div class="tab" onclick="tdTab(\'accounting\')">Accounting</div>':''}`;
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
  if (tab==='members')    renderOngoingMembers(el);
  if (tab==='attendance') renderOngoingAttendance(el);
  if (tab==='teams')      renderTDTeams(el);
  if (tab==='fixtures')   renderTDFix(el);
  if (tab==='standings')  renderTDStandings(el);
  if (tab==='accounting') renderTDAccounting();
  if (tab==='report')     renderTDReport(el);
};

// ─────────────────────────────────────────────
// ONGOING TOURNAMENT
// ─────────────────────────────────────────────
async function renderOngoingMembers(el) {
  el.innerHTML='<div class="empty">Loading…</div>';
  const snap=await getDocs(query(collection(db,'tourMembers'),where('tourId','==',window.activeTourId)));
  const members=snap.docs.map(d=>({id:d.id,...d.data()}));
  const alreadyJoined=members.find(m=>m.userId===window.CU.uid);
  const isAdmin=window.CU.role==='admin';
  let html=`<div class="row-sb mb16">
    <div class="card-t" style="margin:0">${members.length} Player${members.length!==1?'s':''} Joined</div>
    ${!alreadyJoined?`<button class="btn btn-gold btn-sm" onclick="joinOngoingTour()">+ Join This Tournament</button>`:
      `<span class="b b-green" style="padding:8px 16px">✓ You're joined</span>`}
  </div>`;
  if (!members.length) { html+='<div class="empty">No players yet. Be the first!</div>'; }
  else {
    html+=`<div class="tw"><table>
      <thead><tr><th>#</th><th>Player</th><th>Joined</th>${isAdmin?'<th></th>':''}</tr></thead>
      <tbody>${members.map((m,i)=>`<tr>
        <td>${i+1}</td>
        <td><strong>${esc(m.memberName)}</strong>${m.userId===window.CU.uid?' <span class="b b-gray" style="font-size:10px">you</span>':''}</td>
        <td class="text-sm text-muted">${fmtDate(m.joinedAt)}</td>
        ${isAdmin?`<td><button class="btn btn-red btn-xs" onclick="removeTourMember('${m.id}')">Remove</button></td>`:''}
      </tr>`).join('')}</tbody>
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