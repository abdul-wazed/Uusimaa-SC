// ── REPORTS ──────────────────────────────────
// Attendance & Payment CSV export
// Depends on: app-core.js

const { collection,getDocs,query,where,orderBy } = window._db;
const db = window.db;

// ─────────────────────────────────────────────
// OPEN REPORT MODAL
// ─────────────────────────────────────────────
window.openReportModal = async function(tourId) {
  const isAdmin = window.CU.role === 'admin';
  $('report-modal-title').textContent = 'Download Report';
  $('report-options').innerHTML = '<div class="empty">Loading…</div>';
  openM('m-report');

  // Load tournament members
  const membSnap = await getDocs(query(collection(db,'tourMembers'), where('tourId','==',tourId)));
  const members  = membSnap.docs.map(d=>({uid:d.data().userId, name:d.data().memberName}));

  let html = `<div class="fg"><label>Report Type</label>
    <select id="rep-type" onchange="onRepTypeChange()">
      <option value="attendance">Attendance Report</option>
      <option value="payment">Payment Report</option>
    </select>
  </div>`;

  if (isAdmin) {
    html += `<div class="fg" id="rep-member-wrap"><label>Member</label>
      <select id="rep-member">
        <option value="all">All Members</option>
        ${members.map(m=>`<option value="${m.uid}">${esc(m.name)}</option>`).join('')}
      </select>
    </div>`;
  } else {
    html += `<input type="hidden" id="rep-member" value="${window.CU.uid}">`;
  }

  html += `<div class="fg"><label>Format</label>
    <select id="rep-format">
      <option value="csv">CSV (Excel compatible)</option>
    </select>
  </div>
  <button class="btn btn-gold btn-full" onclick="downloadReport('${tourId}')">Download Report</button>`;

  $('report-options').innerHTML = html;
  // Store members for use in download
  window._reportMembers = members;
};

window.onRepTypeChange = function() { /* future: show/hide date range etc */ };

// ─────────────────────────────────────────────
// DOWNLOAD REPORT
// ─────────────────────────────────────────────
window.downloadReport = async function(tourId) {
  const type   = $('rep-type').value;
  const membId = $('rep-member')?.value || window.CU.uid;
  const isAll  = membId === 'all';
  const members = isAll ? window._reportMembers : window._reportMembers.filter(m=>m.uid===membId);

  if (type === 'attendance') {
    await downloadAttendanceCSV(tourId, members);
  } else {
    await downloadPaymentCSV(members);
  }
};

// ─────────────────────────────────────────────
// ATTENDANCE CSV
// ─────────────────────────────────────────────
async function downloadAttendanceCSV(tourId, members) {
  // Fetch all sessions for this tournament
  const sessSnap = await getDocs(query(collection(db,'sessions'), where('tourId','==',tourId)));
  const sessions = sessSnap.docs.map(d=>({id:d.id,...d.data()}))
    .sort((a,b)=>a.date.localeCompare(b.date));

  if (!sessions.length) { toast('No sessions found for this tournament','err'); return; }

  // Fetch all attendance records
  const attSnap = await getDocs(query(collection(db,'attendance'), where('tourId','==',tourId)));
  const attAll  = attSnap.docs.map(d=>d.data());

  // Build header row: Name, Date1, Date2, ...
  const headers = ['Member Name', ...sessions.map(s=>s.date), 'Total Present', 'Total Sessions'];
  const rows = [headers];

  for (const m of members) {
    const row = [m.name];
    let totalPresent = 0;
    for (const sess of sessions) {
      const att = attAll.find(a=>a.sessionId===sess.id && a.userId===m.uid);
      const present = att?.present ? 'Present' : 'Absent';
      if (att?.present) totalPresent++;
      row.push(present);
    }
    row.push(totalPresent, sessions.length);
    rows.push(row);
  }

  // Summary row
  rows.push([]);
  rows.push(['SUMMARY']);
  for (const sess of sessions) {
    const presentCount = attAll.filter(a=>a.sessionId===sess.id&&a.present).length;
    rows.push([sess.date, `${presentCount} / ${members.length} present`]);
  }

  triggerCSVDownload(rows, `attendance_report_${new Date().toISOString().slice(0,10)}.csv`);
  toast('Attendance report downloaded!');
}

// ─────────────────────────────────────────────
// PAYMENT CSV
// ─────────────────────────────────────────────
async function downloadPaymentCSV(members) {
  // Fetch payments for these members
  const uids = members.map(m=>m.uid);
  const paySnap = await getDocs(collection(db,'payments'));
  const pays = paySnap.docs.map(d=>({id:d.id,...d.data()}))
    .filter(p=>uids.includes(p.memberId))
    .sort((a,b)=> `${a.year}${MONTHS.indexOf(a.month)}`.localeCompare(`${b.year}${MONTHS.indexOf(b.month)}`));

  // Get unique month-year combinations
  const periods = [...new Set(pays.map(p=>`${p.month} ${p.year}`))];

  const headers = ['Member Name', ...periods, 'Total Paid (€)'];
  const rows = [headers];

  for (const m of members) {
    const mPays = pays.filter(p=>p.memberId===m.uid);
    const row = [m.name];
    let total = 0;
    for (const period of periods) {
      const [month, year] = period.split(' ');
      const p = mPays.find(p=>p.month===month&&String(p.year)===year&&p.status==='approved');
      if (p) {
        row.push(`Paid${p.amount?' €'+fmt2dp(p.amount):''}`);
        total += p.amount||0;
      } else {
        const pending = mPays.find(p=>p.month===month&&String(p.year)===year&&p.status==='pending');
        row.push(pending?'Pending':'Not Paid');
      }
    }
    row.push(fmt2dp(total));
    rows.push(row);
  }

  triggerCSVDownload(rows, `payment_report_${new Date().toISOString().slice(0,10)}.csv`);
  toast('Payment report downloaded!');
}

// ─────────────────────────────────────────────
// CSV HELPER
// ─────────────────────────────────────────────
function triggerCSVDownload(rows, filename) {
  const csv = rows.map(row =>
    row.map(cell => {
      const s = String(cell ?? '');
      // Escape commas and quotes
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g,'""')}"` : s;
    }).join(',')
  ).join('\n');

  // Add BOM for Excel UTF-8 compatibility
  const blob = new Blob(['\uFEFF' + csv], {type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
// QUICK SELF ATTENDANCE REPORT (member)
// ─────────────────────────────────────────────
window.downloadMyAttendance = async function(tourId, tourName) {
  const uid = window.CU.uid;
  const sessSnap = await getDocs(query(collection(db,'sessions'), where('tourId','==',tourId)));
  const sessions = sessSnap.docs.map(d=>({id:d.id,...d.data()}))
    .sort((a,b)=>a.date.localeCompare(b.date));
  const attSnap  = await getDocs(query(collection(db,'attendance'), where('tourId','==',tourId), where('userId','==',uid)));
  const attAll   = attSnap.docs.map(d=>d.data());

  const rows = [['Uusimaa Sporting Club — Attendance Report']];
  rows.push([`Member: ${window.CU.name}`]);
  rows.push([`Tournament: ${tourName}`]);
  rows.push([`Generated: ${new Date().toLocaleDateString('en-GB')}`]);
  rows.push([]);
  rows.push(['Date','Notes','Status']);

  let present=0;
  for (const s of sessions) {
    const att = attAll.find(a=>a.sessionId===s.id);
    const isPresent = att?.present;
    if (isPresent) present++;
    rows.push([s.date, s.notes||'', isPresent?'Present':'Absent']);
  }
  rows.push([]);
  rows.push([`Total: ${present} / ${sessions.length} sessions attended`]);

  triggerCSVDownload(rows, `my_attendance_${tourName.replace(/\s+/g,'_')}.csv`);
  toast('Your attendance report downloaded!');
};