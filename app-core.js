import { initializeApp }                     from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword,
         signInWithEmailAndPassword, signOut,
         onAuthStateChanged, browserLocalPersistence,
         setPersistence }                     from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, doc,
         addDoc, setDoc, getDoc, getDocs,
         updateDoc, deleteDoc, query,
         where, orderBy, serverTimestamp,
         enableIndexedDbPersistence }         from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── INIT ─────────────────────────────────────
let app, auth, db;
try {
  app  = initializeApp(FIREBASE_CONFIG);
  auth = getAuth(app);
  db   = getFirestore(app);
  setPersistence(auth, browserLocalPersistence).catch(()=>{});
  enableIndexedDbPersistence(db).catch(()=>{});
  if (FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY')
    document.getElementById('config-banner').style.display = 'block';
} catch(e) {
  document.getElementById('config-banner').style.display = 'block';
  document.getElementById('loading-screen').innerHTML = `
    <div class="loader-logo" style="color:var(--red)">⚠ CONFIG ERROR</div>
    <div style="color:var(--muted2);font-size:13px;text-align:center;max-width:300px">
      ${e.message}<br><br>Please update FIREBASE_CONFIG in config.js
    </div>`;
}

// ── SHARED STATE ─────────────────────────────
window.db   = db;
window.auth = auth;
window.CU   = null;
window.activePage    = 'dashboard';
window.activeTourId  = null;
window.activeTourData= null;
window.editTourId    = null;
window.attSport      = 'Football';

// ── SHARED UTILS ─────────────────────────────
window.$       = id => document.getElementById(id);
window.esc     = s  => s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';
window.fmtDate = s  => { try { return s?.toDate ? s.toDate().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : new Date(s).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); } catch(e){ return s||''; } };
window.fmt2dp  = n  => (+n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

window.openM  = id => $(id).classList.add('on');
window.closeM = id => $(id).classList.remove('on');
document.querySelectorAll('.ov').forEach(o => o.addEventListener('click', e => { if(e.target===o) o.classList.remove('on'); }));

let _toastTmr;
window.toast = function(msg, type='ok') {
  const el = $('toast');
  el.textContent = msg; el.className = `show ${type}`;
  clearTimeout(_toastTmr);
  _toastTmr = setTimeout(()=>el.classList.remove('show'), 3200);
};

// ── AUTH ─────────────────────────────────────
window.swAuth = function(mode) {
  $('sw-login').classList.toggle('on', mode==='login');
  $('sw-reg').classList.toggle('on', mode==='reg');
  $('f-login').style.display = mode==='login' ? '' : 'none';
  $('f-reg').style.display   = mode==='reg'   ? '' : 'none';
};

window.doLogin = async function() {
  const email = $('l-email').value.trim().toLowerCase();
  const pin   = $('l-pin').value.trim();
  if (!email || pin.length!==4) { showErr('l-err','Enter email and 4-digit PIN'); return; }
  const btn = $('l-btn'); btn.disabled=true; btn.textContent='Signing in…';
  try {
    await signInWithEmailAndPassword(auth, email, pin+'@club.pin');
  } catch(e) {
    showErr('l-err', e.code==='auth/invalid-credential'||e.code==='auth/wrong-password'||e.code==='auth/user-not-found'
      ? 'Invalid email or PIN' : 'Login failed: '+e.message);
    btn.disabled=false; btn.textContent='Sign In';
  }
};

window.doRegister = async function() {
  const name  = $('r-name').value.trim();
  const email = $('r-email').value.trim().toLowerCase();
  const pin   = $('r-pin').value.trim();
  if (!name||!email||pin.length!==4) { showErr('r-err','Fill all fields. PIN must be 4 digits.'); return; }
  if (!/^\d{4}$/.test(pin)) { showErr('r-err','PIN must be 4 numbers only'); return; }
  const btn=$('r-btn'); btn.disabled=true; btn.textContent='Creating…';
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pin+'@club.pin');
    const role = email.toLowerCase()===ADMIN_EMAIL.toLowerCase() ? 'admin' : 'member';
    const profile = { name, email, role, joined: serverTimestamp() };
    await setDoc(doc(db,'users',cred.user.uid), profile);
    sessionStorage.setItem('sc_user', JSON.stringify({uid:cred.user.uid, name, email, role}));
  } catch(e) {
    const msg = e.code==='auth/email-already-in-use' ? 'Email already registered'
      : e.code==='auth/weak-password' ? 'PIN too weak — use 4 digits'
      : e.code==='auth/invalid-email' ? 'Invalid email address'
      : 'Registration failed: '+e.message;
    showErr('r-err', msg);
    btn.disabled=false; btn.textContent='Create Account';
  }
};

function showErr(id, msg) { const el=$(id); el.textContent=msg; el.style.display=''; }

window.doLogout = async function() {
  sessionStorage.removeItem('sc_user');
  await signOut(auth);
};

// ── AUTH STATE ───────────────────────────────
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.CU = null; sessionStorage.removeItem('sc_user');
    $('loading-screen').style.display='none';
    $('auth-screen').style.display='flex';
    $('app').style.display='none';
    return;
  }
  // Try session cache first — instant load on refresh
  const cached = sessionStorage.getItem('sc_user');
  if (cached) {
    try {
      const p = JSON.parse(cached);
      if (p.uid===user.uid) {
        window.CU = p;
        showApp();
        // Refresh silently in background
        getDoc(doc(db,'users',user.uid)).then(snap=>{
          if(snap.exists()){ window.CU={uid:user.uid,...snap.data()}; sessionStorage.setItem('sc_user',JSON.stringify(window.CU)); }
        }).catch(()=>{});
        return;
      }
    } catch(e){ sessionStorage.removeItem('sc_user'); }
  }
  // First login — load from Firestore
  try {
    const snap = await getDoc(doc(db,'users',user.uid));
    if (!snap.exists()) { await signOut(auth); return; }
    window.CU = {uid:user.uid,...snap.data()};
    sessionStorage.setItem('sc_user',JSON.stringify(window.CU));
  } catch(e) {
    $('loading-screen').innerHTML=`
      <div class="loader-logo" style="color:var(--red)">⚠ CONNECTION ERROR</div>
      <div style="color:var(--muted2);font-size:13px;text-align:center;max-width:300px;margin-top:8px">
        Could not load profile. Check your internet and
        <button onclick="location.reload()" style="color:var(--gold);background:none;border:none;cursor:pointer;font-size:13px">refresh</button>.
      </div>`; return;
  }
  showApp();
});

function showApp() {
  $('loading-screen').style.display='none';
  $('auth-screen').style.display='none';
  $('app').style.display='block';
  initApp();
}

// ── APP INIT ─────────────────────────────────
function initApp() {
  const CU = window.CU;
  $('sb-name').textContent = CU.name;
  $('sb-role').innerHTML = `<span class="sb-user-role role-${CU.role}">${CU.role==='admin'?'Admin':'Member'}</span>`;
  document.querySelectorAll('.adm-only').forEach(el=>el.style.display=CU.role==='admin'?'':'none');
  nav('dashboard');
}

// ── NAVIGATION ───────────────────────────────
window.nav = function(page) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('on'));
  $('pg-'+page).classList.add('on');
  document.querySelectorAll('.ni').forEach(n=>{
    if(n.getAttribute('onclick')?.includes("'"+page+"'")) n.classList.add('on');
  });
  window.activePage = page;
  const renders = {
    dashboard:   renderDashboard,
    tournaments: renderTournaments,
    attendance:  renderAttendance,
    payments:    renderPayments,
    members:     renderMembers,
    announcements: renderAnnouncements,
    profile:     renderProfile,
    accounting:  renderAccounting
  };
  if (renders[page]) renders[page]();
};

// ── DASHBOARD ────────────────────────────────
async function renderDashboard() {
  const CU = window.CU;
  $('d-greet').textContent = `Welcome back, ${CU.name}!`;
  const isAdmin = CU.role==='admin';
  if (isAdmin) {
    const [uSnap,tSnap,sSnap,pSnap] = await Promise.all([
      getDocs(collection(db,'users')),
      getDocs(collection(db,'tournaments')),
      getDocs(collection(db,'sessions')),
      getDocs(query(collection(db,'payments'),where('status','==','pending')))
    ]);
    $('d-stats').innerHTML = `
      <div class="sc"><div class="sc-l">Members</div><div class="sc-v">${uSnap.docs.filter(d=>d.data().role==='member').length}</div></div>
      <div class="sc"><div class="sc-l">Tournaments</div><div class="sc-v">${tSnap.size}</div></div>
      <div class="sc"><div class="sc-l">Sessions</div><div class="sc-v">${sSnap.size}</div></div>
      <div class="sc"><div class="sc-l">Pending Payments</div><div class="sc-v" style="color:var(--red)">${pSnap.size}</div></div>`;
  } else {
    const [aSnap,mSnap] = await Promise.all([
      getDocs(query(collection(db,'attendance'),where('userId','==',CU.uid),where('present','==',true))),
      getDocs(query(collection(db,'tourMembers'),where('userId','==',CU.uid)))
    ]);
    $('d-stats').innerHTML = `
      <div class="sc"><div class="sc-l">Sessions Attended</div><div class="sc-v">${aSnap.size}</div></div>
      <div class="sc"><div class="sc-l">Tournaments Joined</div><div class="sc-v">${mSnap.size}</div></div>`;
  }
  // Announcements preview
  const annSnap = await getDocs(query(collection(db,'announcements'),orderBy('date','desc')));
  const anns = annSnap.docs.slice(0,3);
  $('d-anns').innerHTML = anns.length ? anns.map(d=>annCard(d.id,d.data())).join('') : '<div class="empty">No announcements yet.</div>';
  // Active tournaments
  const tSnap2 = await getDocs(query(collection(db,'tournaments'),where('status','==','Ongoing')));
  $('d-tours').innerHTML = tSnap2.empty ? '<div class="empty">No ongoing tournaments.</div>' :
    tSnap2.docs.map(d=>{const t=d.data(); return `
      <div class="tc mb16" onclick="openTourDetail('${d.id}')">
        <div class="tc-h"><div class="row" style="gap:6px;margin-bottom:4px">
          <span class="b b-${t.tourType==='Ongoing'?'teal':'purple'}">${t.tourType==='Ongoing'?'♾ Ongoing':'📅 Seasonal'}</span>
          <span class="b b-green">Active</span></div>
          <div class="tc-name">${esc(t.name)}</div></div>
        <div class="tc-b"><span class="b b-gold">${esc(t.sport)}</span></div>
      </div>`;}).join('');
}

window.renderDashboard = renderDashboard;

// ── ANNOUNCEMENTS ────────────────────────────
window.annCard = function(id, a) {
  return `<div class="ann">
    <div class="ann-t">${esc(a.title)}</div>
    <div class="ann-b">${esc(a.body)}</div>
    ${a.imgData?`<img src="${a.imgData}" style="max-width:100%;max-height:280px;border-radius:10px;margin-top:10px;border:1px solid var(--border);display:block">`:''}
    <div class="ann-d">${fmtDate(a.date)} · ${esc(a.author||'Admin')}</div>
    ${window.CU?.role==='admin'?`<button class="btn btn-red btn-xs" style="margin-top:8px" onclick="delAnn('${id}')">Delete</button>`:''}
  </div>`;
};

window.renderAnnouncements = async function() {
  const snap = await getDocs(query(collection(db,'announcements'),orderBy('date','desc')));
  $('ann-list').innerHTML = snap.empty ? '<div class="empty">No announcements yet.</div>' :
    snap.docs.map(d=>annCard(d.id,d.data())).join('');
};

// Image preview
const annImgEl = document.getElementById('ann-img');
if (annImgEl) annImgEl.addEventListener('change', function(){
  const f=this.files[0], prev=$('ann-img-preview');
  if (!f) { prev.innerHTML=''; return; }
  const r=new FileReader(); r.onload=e=>{prev.innerHTML=`<img src="${e.target.result}" style="max-width:100%;max-height:160px;border-radius:8px;border:1px solid var(--border)">`;}; r.readAsDataURL(f);
});

window.saveAnn = async function() {
  const title=$('ann-ti').value.trim(), body=$('ann-bo').value.trim();
  if (!title||!body) { toast('Fill title and message','err'); return; }
  const file=$('ann-img').files[0];
  let imgData=null;
  if (file) {
    if (file.size>2*1024*1024) { toast('Image too large — max 2MB','err'); return; }
    imgData=await new Promise(res=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.readAsDataURL(file);});
  }
  try {
    await addDoc(collection(db,'announcements'),{title,body,imgData,date:serverTimestamp(),author:window.CU.name});
    closeM('m-ann'); $('ann-ti').value=''; $('ann-bo').value=''; $('ann-img').value=''; $('ann-img-preview').innerHTML='';
    toast('Posted!');
    if (window.activePage==='announcements') window.renderAnnouncements();
    if (window.activePage==='dashboard') renderDashboard();
  } catch(e){ toast(e.code==='permission-denied'?'Permission denied':'Failed: '+e.message,'err'); }
};

window.delAnn = async function(id) {
  if (!confirm('Delete this announcement?')) return;
  await deleteDoc(doc(db,'announcements',id)); toast('Deleted');
  window.renderAnnouncements();
};

// ── MEMBERS ──────────────────────────────────
window.renderMembers = async function() {
  const [uSnap,pSnap] = await Promise.all([getDocs(collection(db,'users')),getDocs(collection(db,'payments'))]);
  const pays=pSnap.docs.map(d=>({id:d.id,...d.data()}));
  const now=new Date(); const tm=MONTHS[now.getMonth()], ty=now.getFullYear();
  const users=uSnap.docs.map(d=>({docId:d.id,...d.data()})).sort((a,b)=>{
    if(a.role===b.role) return a.name.localeCompare(b.name);
    return a.role==='admin'?-1:1;
  });
  $('mem-tbody').innerHTML = users.map(u=>{
    const isSelf=u.docId===window.CU.uid, isAdm=u.role==='admin';
    const pay=pays.find(p=>p.memberId===u.docId&&p.month===tm&&p.year===ty);
    const pHtml=isAdm?'<span class="b b-gray">—</span>':pay
      ?`<span class="b b-${pay.status==='approved'?'green':pay.status==='rejected'?'red':'gold'}">${pay.status}</span>`
      :`<span class="b b-red">Due ${tm}</span>`;
    const roleHtml=`<span class="b b-${isAdm?'gold':'gray'}">${isAdm?'Admin':'Member'}</span>`;
    const pBtn=isSelf?'':isAdm
      ?`<button class="btn btn-ghost btn-xs" onclick="setRole('${u.docId}','member')">↓ Demote</button>`
      :`<button class="btn btn-teal btn-xs" onclick="setRole('${u.docId}','admin')">↑ Admin</button>`;
    const rBtn=isSelf?'':`<button class="btn btn-red btn-xs" onclick="removeMember('${u.docId}')">Remove</button>`;
    return `<tr>
      <td><strong>${esc(u.name)}</strong>${isSelf?' <span class="b b-gray" style="font-size:10px">you</span>':''}</td>
      <td>${esc(u.email)}</td><td>${roleHtml}</td>
      <td class="text-sm text-muted">${fmtDate(u.joined)}</td>
      <td>${pHtml}</td>
      <td><div class="row">${pBtn}${rBtn}</div></td>
    </tr>`;
  }).join('');
};

window.removeMember = async function(uid) {
  if (!confirm('Remove this member?')) return;
  await deleteDoc(doc(db,'users',uid)); toast('Removed'); window.renderMembers();
};
window.setRole = async function(uid,role) {
  if (!confirm(`${role==='admin'?'Promote to Admin':'Demote to Member'}?`)) return;
  await updateDoc(doc(db,'users',uid),{role}); toast(role==='admin'?'Promoted!':'Demoted'); window.renderMembers();
};

// expose Firestore helpers for other modules
window._db            = { collection,doc,addDoc,setDoc,getDoc,getDocs,updateDoc,deleteDoc,query,where,orderBy,serverTimestamp };