/* ═══════════════════════════════════════════════════════════════════════
   patch.js — Skillak Platform v2.0 — Full Feature Enhancements
   ═══════════════════════════════════════════════════════════════════════
   المميزات المضافة:
   1. لوحة مزدوجة للمسجلين كطالب ومعلم (both)
   2. زر "دخول الجلسة" يظهر فور التأكيد + إشعار فوري
   3. نافذة التقييم تظهر تلقائياً بعد نهاية الجلسة
   4. لوحة الأدمن تعرض تقييم المعلم AND تقييم الطالب منفصلَيْن
   5. التحكم الكامل بالعمولة — يُحدَّث تلقائياً في كل المنصة
   6. أرباح المنصة مخفية تماماً عن المستخدمين العاديين
   7. مراقبة حية لحالة الجلسات
   ═══════════════════════════════════════════════════════════════════════ */

/* ── helper: safe escapeHTML (in case called before main script) ── */
function _safe_esc(v) {
  return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ══════════════════════════════════════════════════════════════
   1. DUAL DASHBOARD — "both" role: احصائيات الطالب + المعلم
   ══════════════════════════════════════════════════════════════ */
const _p_rdOverview = window.rdOverview;
window.rdOverview = async function (el) {
  if (!CU || !CP) return;
  if (CP.role !== 'both') return _p_rdOverview(el);

  el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:40px"><div class="spin"></div></div>`;

  try {
    const uid = CU.uid;
    const [sb, tb] = await Promise.all([
      db.collection('bookings').where('studentId', '==', uid).get().catch(() => ({ docs: [] })),
      db.collection('bookings').where('tutorId', '==', uid).get().catch(() => ({ docs: [] }))
    ]);

    const sBks = sb.docs.map(d => ({ id: d.id, ...d.data() }));
    const tBks = tb.docs.map(d => ({ id: d.id, ...d.data() }));

    const sComp = sBks.filter(b => b.status === 'completed').length;
    const sUp = sBks.filter(b => ['pending', 'confirmed', 'active'].includes(b.status)).length;
    const sPend = sBks.filter(b => b.status === 'pending').length;

    const tComp = tBks.filter(b => b.status === 'completed').length;
    const tUp = tBks.filter(b => ['pending', 'confirmed', 'active'].includes(b.status)).length;
    const tPend = tBks.filter(b => b.status === 'pending').length;

    const tEarn = tBks.filter(b => b.status === 'completed')
      .reduce((s, b) => s + Number((b.price || 0) - (b.tutorFee ?? b.fee ?? 0)), 0);

    const recent = [...sBks.map(b => ({ ...b, _mode: 'student' })),
      ...tBks.map(b => ({ ...b, _mode: 'tutor' }))]
      .filter((b, i, a) => a.findIndex(x => x.id === b.id) === i)
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      .slice(0, 8);

    el.innerHTML = `
    <!-- HEADER -->
    <div class="dashphdr">
      <div>
        <div style="font-size:.7rem;font-weight:800;letter-spacing:.12em;color:var(--amber);margin-bottom:3px">لوحة التحكم المزدوجة</div>
        <div class="dashph">مرحباً، ${_safe_esc(CP.name?.split(' ')[0] || 'أهلاً')} 👋</div>
        <div style="font-size:.78rem;color:var(--muted);margin-top:3px">مسجّل كطالب ومعلم في آنٍ واحد</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-p" onclick="go('explore')">+ احجز جلسة</button>
        <button class="btn btn-gh" onclick="go('editProfile')">تعديل الملف</button>
      </div>
    </div>

    <!-- STUDENT STATS BLOCK -->
    <div style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);border-radius:20px;padding:20px 22px;margin-bottom:18px;color:#fff;box-shadow:0 4px 20px rgba(59,130,246,.25)">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div style="background:rgba(255,255,255,.18);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.5rem">🎓</div>
        <div>
          <div style="font-weight:900;font-size:1.05rem">إحصائياتي كطالب</div>
          <div style="font-size:.72rem;opacity:.7;margin-top:2px">مجمل نشاطي التعليمي</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
        ${[
          ['📅', sBks.length, 'إجمالي جلساتي'],
          ['⏰', sUp, 'قادمة / نشطة'],
          ['✅', sComp, 'مكتملة'],
          ['💳', walBal.toFixed(0) + ' ج', 'رصيدي']
        ].map(([ic, val, lbl]) => `
          <div style="background:rgba(255,255,255,.14);border-radius:12px;padding:12px 8px;text-align:center">
            <div style="font-size:1.1rem;margin-bottom:4px">${ic}</div>
            <div style="font-size:1.6rem;font-weight:900;font-family:'Fraunces',serif;line-height:1">${val}</div>
            <div style="font-size:.65rem;opacity:.75;margin-top:4px">${lbl}</div>
          </div>`).join('')}
      </div>
      ${sUp > 0 ? `<div style="margin-top:12px;display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.12);border-radius:10px;padding:10px 14px;font-size:.82rem">
        <span>🔔</span> لديك <strong>${sUp}</strong> جلسة قادمة
        <button class="btn btn-sm" style="margin-right:auto;background:rgba(255,255,255,.22);color:#fff;border:none" onclick="dNav('sessions')">عرضها ←</button>
      </div>` : ''}
    </div>

    <!-- TEACHER STATS BLOCK -->
    <div style="background:linear-gradient(135deg,#064e3b 0%,#059669 100%);border-radius:20px;padding:20px 22px;margin-bottom:18px;color:#fff;box-shadow:0 4px 20px rgba(5,150,105,.25)">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div style="background:rgba(255,255,255,.18);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.5rem">👨‍🏫</div>
        <div>
          <div style="font-weight:900;font-size:1.05rem">إحصائياتي كمعلم</div>
          <div style="font-size:.72rem;opacity:.7;margin-top:2px">أدائي وأرباحي التعليمية</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
        ${[
          ['📋', tBks.length, 'إجمالي جلساتي'],
          ['⏰', tUp, 'قادمة / نشطة'],
          ['🏁', tComp, 'مكتملة'],
          ['💰', tEarn.toFixed(0) + ' ج', 'صافي أرباح']
        ].map(([ic, val, lbl]) => `
          <div style="background:rgba(255,255,255,.14);border-radius:12px;padding:12px 8px;text-align:center">
            <div style="font-size:1.1rem;margin-bottom:4px">${ic}</div>
            <div style="font-size:1.6rem;font-weight:900;font-family:'Fraunces',serif;line-height:1">${val}</div>
            <div style="font-size:.65rem;opacity:.75;margin-top:4px">${lbl}</div>
          </div>`).join('')}
      </div>
      <div style="margin-top:12px;display:flex;align-items:center;flex-wrap:wrap;gap:8px">
        <div style="background:rgba(255,255,255,.12);border-radius:8px;padding:8px 12px;font-size:.8rem">
          ⭐ تقييمي: <strong>${parseFloat(CP.rating || 0).toFixed(1)}</strong>
          <span style="opacity:.7"> (${CP.totalReviews || 0} تقييم)</span>
        </div>
        <div style="background:rgba(255,255,255,.12);border-radius:8px;padding:8px 12px;font-size:.8rem">
          💰 <strong>$${CP.price || 0}</strong>/ساعة
        </div>
        ${tPend > 0 ? `<div style="background:rgba(245,158,11,.3);border-radius:8px;padding:8px 12px;font-size:.8rem">
          🔔 <strong>${tPend}</strong> حجز بانتظار موافقتك
          <button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:#fff;border:none;margin-right:6px" onclick="dNav('sessions')">مراجعة</button>
        </div>` : ''}
        <div style="margin-right:auto;display:flex;gap:6px">
          <button class="btn btn-sm" style="background:rgba(255,255,255,.18);color:#fff;border:1px solid rgba(255,255,255,.25)" onclick="go('editProfile')">✏️ تعديل الملف</button>
          <button class="btn btn-sm" style="background:rgba(255,255,255,.18);color:#fff;border:1px solid rgba(255,255,255,.25)" onclick="dNav('availability')">⏰ أوقاتي</button>
        </div>
      </div>
    </div>

    <!-- RECENT SESSIONS -->
    <div class="dsec">
      <div class="dsech">
        <div class="dsect">📋 آخر الجلسات (طالب + معلم)</div>
        <button class="btn btn-gh btn-sm" onclick="dNav('sessions')">عرض الكل</button>
      </div>
      ${typeof bkTblHTML === 'function' ? bkTblHTML(recent) : '<div style="padding:16px;text-align:center;color:var(--muted)">جاري التحميل...</div>'}
    </div>`;
  } catch (e) {
    console.error('[patch] rdOverview both error:', e);
    _p_rdOverview(el);
  }
};

/* ══════════════════════════════════════════════════════════════
   2. canJoinSession — يُفعَّل زر "دخول الجلسة" فور التأكيد
   ══════════════════════════════════════════════════════════════ */
window.canJoinSession = function (bk) {
  if (!CU || !bk) return false;
  const isParty = bk.studentId === CU.uid || bk.tutorId === CU.uid;
  if (!isParty) return false;
  return ['confirmed', 'active', 'paused'].includes(bk.status);
};

/* ══════════════════════════════════════════════════════════════
   3. AUTO-TRIGGER نافذة التقييم بعد نهاية الجلسة
   ══════════════════════════════════════════════════════════════ */
const _p_leaveSession = window.leaveSession;
window.leaveSession = async function () {
  const bid = curSesBid;
  const bk = curSesBk;
  const wasTutor = bk?.tutorId === CU?.uid;

  if (_p_leaveSession) await _p_leaveSession();

  if (bid && bk) {
    // Mark booking as completed in Firestore
    try {
      await db.collection('bookings').doc(bid).update({
        status: 'completed',
        completedAt: firebase.firestore.FieldValue.serverTimestamp(),
        actualDuration: sesSec ? Math.ceil(sesSec / 60) : (bk.duration || 60)
      });
      // Transfer earnings to tutor
      if (wasTutor) {
        await _transferEarningsToTutor(bk, bid);
      }
    } catch (e) { console.warn('[patch] session completion:', e); }

    // If student: auto-show review modal after 1.8 sec
    if (!wasTutor) {
      setTimeout(() => {
        db.collection('bookings').doc(bid).get().then(doc => {
          if (doc.exists && !doc.data().reviewed) {
            if (typeof openRevFromBk === 'function') {
              openRevFromBk(bid, bk.tutorId, bk.tutorName || '—');
            } else {
              openM('revMod');
            }
          }
        }).catch(() => {});
      }, 1800);
    }
  }
};

async function _transferEarningsToTutor(bk, bid) {
  try {
    const tutorNet = +(Number(bk.price || 0) - Number(bk.tutorFee ?? bk.fee ?? 0)).toFixed(2);
    if (tutorNet <= 0) return;
    await db.runTransaction(async tx => {
      const wr = db.collection('wallets').doc(bk.tutorId);
      const ws = await tx.get(wr);
      const wb = ws.exists ? (ws.data().balance || 0) : 0;
      tx.set(wr, { balance: +(wb + tutorNet).toFixed(2), userId: bk.tutorId }, { merge: true });
      tx.update(db.collection('bookings').doc(bid), {
        adminConfirmed: true,
        tutorPaidAt: firebase.firestore.FieldValue.serverTimestamp(),
        tutorNetAmount: tutorNet
      });
    });
    await db.collection('transactions').add({
      userId: bk.tutorId,
      type: 'credit',
      kind: 'session_earnings',
      amount: tutorNet,
      currency: 'EGP',
      status: 'approved',
      bookingId: bid,
      description: `أرباح جلسة مع ${bk.studentName || 'طالب'} — ${bk.date || ''}`,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) { console.warn('[patch] tutor transfer:', e); }
}

/* ══════════════════════════════════════════════════════════════
   4. ADMIN: لوحة التقييمات — تقييم المعلم + تقييم الطالب
   ══════════════════════════════════════════════════════════════ */
const _p_adTab = window.adTab;
window.adTab = async function (tab, el) {
  const result = await _p_adTab(tab, el);

  if (tab === 'reviews') {
    const con = document.getElementById('adCon');
    if (!con) return result;
    // Append student ratings section
    try {
      const extraHTML = await _buildStudentRatingsAdminSection();
      const extra = await _buildTutorRatingsSummaryAdmin();
      con.insertAdjacentHTML('beforeend', extraHTML + extra);
    } catch (e) { console.warn('[patch] admin reviews:', e); }
  }

  if (tab === 'commission') {
    // Commission tab is handled by script.js, just ensure save button works
    setTimeout(() => {
      const saveBtn = document.getElementById('saveCommissionBtn');
      if (saveBtn && !saveBtn.dataset.patched) {
        saveBtn.dataset.patched = '1';
        saveBtn.onclick = _saveCommissionRates;
      }
    }, 100);
  }

  return result;
};

async function _buildStudentRatingsAdminSection() {
  try {
    const snap = await db.collection('reviews').get().catch(() => ({ docs: [] }));
    const reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // تجميع حسب الطالب (من قام بالتقييم)
    const byStudent = {};
    reviews.forEach(r => {
      const sid = r.studentId || r.reviewerId;
      if (!sid) return;
      if (!byStudent[sid]) byStudent[sid] = {
        name: r.studentName || r.reviewerName || '—',
        reviews: [],
        totalRating: 0
      };
      byStudent[sid].reviews.push(r);
      byStudent[sid].totalRating += (r.rating || 0);
    });

    const rows = Object.entries(byStudent).map(([uid, d]) => {
      const avg = d.reviews.length > 0 ? (d.totalRating / d.reviews.length).toFixed(1) : '—';
      const lastCmt = d.reviews[d.reviews.length - 1]?.comment || '—';
      return `<tr>
        <td><strong>${_safe_esc(d.name)}</strong></td>
        <td style="text-align:center">${d.reviews.length}</td>
        <td style="text-align:center;color:var(--amber);font-weight:700">${avg} ⭐</td>
        <td style="font-size:.75rem;color:var(--muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_safe_esc(lastCmt)}</td>
      </tr>`;
    });

    return `
    <div class="dsec" style="margin-top:28px">
      <div class="dsech" style="background:linear-gradient(90deg,var(--teal3),transparent)">
        <div class="dsect" style="color:var(--teal)">🎓 نشاط الطلاب — التقييمات المُعطاة</div>
        <span class="pill pc">${rows.length} طالب</span>
      </div>
      <div style="overflow-x:auto;padding:0">
        ${rows.length ? `
        <table class="dtbl">
          <thead><tr>
            <th>اسم الطالب</th>
            <th style="text-align:center">عدد التقييمات</th>
            <th style="text-align:center">متوسط التقييم المُعطى</th>
            <th>آخر تعليق</th>
          </tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>` : '<div style="padding:24px;text-align:center;color:var(--muted)">لا توجد تقييمات من طلاب بعد</div>'}
      </div>
    </div>`;
  } catch (e) { return ''; }
}

async function _buildTutorRatingsSummaryAdmin() {
  try {
    const snap = await db.collection('reviews').get().catch(() => ({ docs: [] }));
    const reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // تجميع حسب المعلم
    const byTutor = {};
    reviews.forEach(r => {
      const tid = r.tutorId;
      if (!tid) return;
      if (!byTutor[tid]) byTutor[tid] = { name: r.tutorName || '—', reviews: [], totalRating: 0 };
      byTutor[tid].reviews.push(r);
      byTutor[tid].totalRating += (r.rating || 0);
    });

    const rows = Object.entries(byTutor).map(([uid, d]) => {
      const avg = d.reviews.length > 0 ? (d.totalRating / d.reviews.length).toFixed(1) : '—';
      const stars = '★'.repeat(Math.round(parseFloat(avg) || 0)) + '☆'.repeat(5 - Math.round(parseFloat(avg) || 0));
      return `<tr>
        <td><strong>${_safe_esc(d.name)}</strong></td>
        <td style="text-align:center">${d.reviews.length}</td>
        <td style="text-align:center;color:var(--amber);font-weight:700;font-size:1rem">${stars}</td>
        <td style="text-align:center;font-weight:900;color:var(--teal)">${avg}</td>
        <td><button class="btn btn-xs btn-gh" onclick="_viewTutorReviewsAdmin('${uid}','${_safe_esc(d.name)}')">عرض</button></td>
      </tr>`;
    });

    return `
    <div class="dsec" style="margin-top:20px">
      <div class="dsech" style="background:linear-gradient(90deg,rgba(245,158,11,.08),transparent)">
        <div class="dsect" style="color:var(--amber)">👨‍🏫 ملخص تقييمات المعلمين</div>
        <span class="pill pp">${rows.length} معلم</span>
      </div>
      <div style="overflow-x:auto;padding:0" id="tutorRatingsTbl">
        ${rows.length ? `
        <table class="dtbl">
          <thead><tr>
            <th>اسم المعلم</th>
            <th style="text-align:center">عدد التقييمات</th>
            <th style="text-align:center">النجوم</th>
            <th style="text-align:center">المتوسط</th>
            <th>تفاصيل</th>
          </tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>` : '<div style="padding:24px;text-align:center;color:var(--muted)">لا توجد تقييمات للمعلمين بعد</div>'}
      </div>
      <div id="tutorRevDetail" style="display:none;padding:16px"></div>
    </div>`;
  } catch (e) { return ''; }
}

window._viewTutorReviewsAdmin = async function (tutorId, name) {
  const box = document.getElementById('tutorRevDetail');
  if (!box) return;
  box.style.display = 'block';
  box.innerHTML = '<div style="text-align:center;padding:20px"><div class="spin" style="margin:auto"></div></div>';

  try {
    const snap = await db.collection('reviews').where('tutorId', '==', tutorId).get();
    const revs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    box.innerHTML = `
    <div style="font-weight:800;font-size:.9rem;margin-bottom:12px;color:var(--teal)">📋 تقييمات ${_safe_esc(name)} (${revs.length} تقييم)</div>
    ${revs.length ? revs.map(r => `
      <div style="background:var(--cream2);border-radius:12px;padding:12px 14px;margin-bottom:8px;display:flex;gap:12px;align-items:flex-start">
        <div style="flex-shrink:0;font-size:1.5rem;line-height:1">${'⭐'.repeat(r.rating || 0)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:.84rem">${_safe_esc(r.studentName || '—')}</div>
          <div style="font-size:.76rem;color:var(--muted);margin-top:2px">${r.comment || '—'}</div>
          <div style="font-size:.68rem;color:var(--muted);margin-top:5px">${r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString('ar-EG') : '—'}</div>
        </div>
        <button class="btn btn-d btn-xs" onclick="delRev('${r.id}',this)">🗑</button>
      </div>`).join('') : '<div style="color:var(--muted);font-size:.83rem">لا توجد تقييمات</div>'}
    <button class="btn btn-gh btn-sm" style="margin-top:8px" onclick="document.getElementById('tutorRevDetail').style.display='none'">إخفاء ↑</button>`;
  } catch (e) {
    box.innerHTML = '<div style="color:var(--red)">تعذّر تحميل التقييمات</div>';
  }
};

/* ══════════════════════════════════════════════════════════════
   5. COMMISSION — حفظ وتحديث فوري في المنصة
   ══════════════════════════════════════════════════════════════ */
async function _saveCommissionRates() {
  if (CP?.role !== 'admin') { showT('غير مصرح', 'err'); return; }
  const sInp = document.getElementById('studentCommissionRateInput');
  const tInp = document.getElementById('tutorCommissionRateInput');
  if (!sInp || !tInp) return;
  const sRate = parseFloat(sInp.value);
  const tRate = parseFloat(tInp.value);
  if (!Number.isFinite(sRate) || sRate < 0 || sRate > 50) { showT('نسبة عمولة الطالب: 0–50%', 'err'); return; }
  if (!Number.isFinite(tRate) || tRate < 0 || tRate > 50) { showT('نسبة عمولة المعلم: 0–50%', 'err'); return; }

  const saveBtn = document.getElementById('saveCommissionBtn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ جاري الحفظ...'; }

  try {
    await db.collection('settings').doc('platform').set({
      studentCommissionRate: sRate,
      tutorCommissionRate: tRate,
      commissionRate: +(sRate + tRate).toFixed(2),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: CU?.uid || 'admin'
    }, { merge: true });

    showT(`✅ تم حفظ العمولة: طالب ${sRate}% + معلم ${tRate}% = ${+(sRate + tRate).toFixed(2)}% إجمالاً — تحدَّث تلقائياً في المنصة`, 'suc');
  } catch (e) {
    showT('خطأ في الحفظ: ' + e.message, 'err');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 حفظ التغييرات'; }
  }
}
window.saveCommissionRates = _saveCommissionRates;

/* ══════════════════════════════════════════════════════════════
   6. HIDE platform profit from non-admin users
   ══════════════════════════════════════════════════════════════ */
const _p_rdOverviewOrig = null; // handled above in rdOverview

// Hide tutor fee & total platform fee from non-admin users in booking modal
const _p_openBkMod = window.openBkMod;
window.openBkMod = function () {
  _p_openBkMod?.();
  setTimeout(() => {
    // Elements: bkTutorFee, bkTutorFeeLabel, bkFee, bkFeeLabel — hide parent .pline for non-admin
    const hideIds = CP?.role === 'admin' ? [] : ['bkTutorFee', 'bkFee'];
    hideIds.forEach(id => {
      const el = document.getElementById(id);
      const row = el?.closest('.pline');
      if (row) row.style.display = 'none';
    });
    // Show them for admin
    if (CP?.role === 'admin') {
      ['bkTutorFee', 'bkFee'].forEach(id => {
        const el = document.getElementById(id);
        const row = el?.closest('.pline');
        if (row) row.style.display = '';
      });
    }
  }, 60);
};

// Hide platform profit in wallet/transactions for non-admin
const _p_loadTxList = window.loadTxList;
window.loadTxList = async function () {
  if (_p_loadTxList) await _p_loadTxList();
  // Hide any "platform profit" elements
  document.querySelectorAll('[data-platform-only]').forEach(el => {
    if (CP?.role !== 'admin') el.style.display = 'none';
  });
};

/* ══════════════════════════════════════════════════════════════
   7. LIVE WATCHERS — إشعارات فورية لتغيرات حالة الحجز
   ══════════════════════════════════════════════════════════════ */
let _sw_student = null, _sw_tutor = null;

function _startStudentWatcher() {
  if (!CU || _sw_student) return;
  let first = true;
  _sw_student = db.collection('bookings')
    .where('studentId', '==', CU.uid)
    .where('status', '==', 'confirmed')
    .onSnapshot(snap => {
      if (first) { first = false; return; }
      snap.docChanges().forEach(ch => {
        if (ch.type === 'added' || ch.type === 'modified') {
          const bk = ch.doc.data();
          showT(`🟢 تأكّد حجزك مع ${bk.tutorName || 'المعلم'} — زر "دخول الجلسة" متاح الآن!`, 'suc');
          // Auto-refresh sessions tab if visible
          if (!document.getElementById('page-dashboard')?.classList.contains('hidden')) {
            if (typeof dNav === 'function') dNav('sessions');
          }
        }
      });
    }, () => {});
}

function _startTutorWatcher() {
  if (!CU || !CP || (CP.role !== 'tutor' && CP.role !== 'both') || _sw_tutor) return;
  let first = true;
  _sw_tutor = db.collection('bookings')
    .where('tutorId', '==', CU.uid)
    .where('status', '==', 'pending')
    .onSnapshot(snap => {
      if (first) { first = false; return; }
      snap.docChanges().forEach(ch => {
        if (ch.type === 'added') {
          const bk = ch.doc.data();
          showT(`📅 طلب حجز جديد من ${bk.studentName || 'طالب'} — ${bk.date || ''} ${bk.timeLbl || bk.time || ''}`, 'inf');
        }
      });
    }, () => {});
}

/* ══════════════════════════════════════════════════════════════
   8. AUTO-COMPLETE sessions after time ends
   ══════════════════════════════════════════════════════════════ */
async function _autoCompleteExpiredSessions() {
  if (!CU) return;
  try {
    const snap = await db.collection('bookings')
      .where('studentId', '==', CU.uid)
      .where('status', 'in', ['confirmed', 'active'])
      .get().catch(() => ({ docs: [] }));

    for (const doc of snap.docs) {
      const bk = { id: doc.id, ...doc.data() };
      const endMs = _getEndMs(bk);
      if (!endMs || Date.now() < endMs + 5 * 60000) continue;

      // Session ended 5+ minutes ago — auto-complete
      await db.collection('bookings').doc(bk.id).update({
        status: 'completed',
        completedAt: firebase.firestore.FieldValue.serverTimestamp(),
        autoCompleted: true
      }).catch(() => {});
      await _transferEarningsToTutor(bk, bk.id);

      // Show review if not done
      if (!bk.reviewed) {
        setTimeout(() => {
          if (typeof openRevFromBk === 'function') {
            openRevFromBk(bk.id, bk.tutorId, bk.tutorName || '—');
          }
        }, 500);
      }
    }
  } catch (e) { /* silent */ }
}

function _getEndMs(bk) {
  if (!bk) return 0;
  if (bk.sessionEndsAtMs) return Number(bk.sessionEndsAtMs) || 0;
  const d = bk.date, t = bk.time || bk.timeLbl;
  if (!d || !t) return 0;
  const s = new Date(`${d}T${String(t).slice(0, 5)}:00`);
  return isNaN(s) ? 0 : s.getTime() + Number(bk.duration || 60) * 60000;
}

/* ══════════════════════════════════════════════════════════════
   9. ADMIN: Commission tab — ensure save button is hooked
   ══════════════════════════════════════════════════════════════ */
function _hookCommissionSaveBtn() {
  const btn = document.getElementById('saveCommissionBtn');
  if (btn && !btn.dataset.hooked) {
    btn.dataset.hooked = '1';
    btn.onclick = _saveCommissionRates;
  }
}

/* ══════════════════════════════════════════════════════════════
   10. ADMIN Stats tab — ensure platform profit shown ONLY admin
   ══════════════════════════════════════════════════════════════ */
const _p_buildAdminReport = window.buildAdminReport;
window.buildAdminReport = async function (uid) {
  if (CP?.role !== 'admin') { showT('غير مصرح', 'err'); return; }
  return _p_buildAdminReport?.(uid);
};

/* ══════════════════════════════════════════════════════════════
   11. ADMIN: platform profit widget in stats tab (admin-only)
   ══════════════════════════════════════════════════════════════ */
async function _injectPlatformProfitWidget() {
  if (CP?.role !== 'admin') return;
  const con = document.getElementById('adCon');
  if (!con) return;

  try {
    const bSnap = await db.collection('bookings').where('status', '==', 'completed').get().catch(() => ({ docs: [] }));
    const completed = bSnap.docs.map(d => d.data());
    const platformProfit = completed.reduce((s, b) => s + Number((b.studentFee ?? b.fee ?? 0)) + Number(b.tutorFee ?? 0), 0);
    const totalTransact = completed.length;
    const totalVolume = completed.reduce((s, b) => s + Number(b.total || b.price || 0), 0);

    // Find the stats container and inject
    const statsEl = con.querySelector('.srow, .ad-grid');
    if (!statsEl) return;
    const profitWidget = document.createElement('div');
    profitWidget.className = 'sc';
    profitWidget.style.cssText = 'border:2px solid var(--amber);background:linear-gradient(135deg,rgba(245,158,11,.06),transparent)';
    profitWidget.innerHTML = `
      <div class="scic">🏦</div>
      <div class="scval" style="color:var(--amber)">${platformProfit.toFixed(0)}</div>
      <div class="sclbl">ج.م أرباح المنصة</div>
      <div style="font-size:.65rem;color:var(--muted);margin-top:4px">${totalTransact} جلسة · ${totalVolume.toFixed(0)} ج.م إجمالي</div>`;
    statsEl.appendChild(profitWidget);
  } catch (e) { /* silent */ }
}

/* ══════════════════════════════════════════════════════════════
   BOOT — initialise everything on auth + DOM ready
   ══════════════════════════════════════════════════════════════ */
const _p_updNavU = window.updNavU;
window.updNavU = function () {
  _p_updNavU?.();
  _startStudentWatcher();
  _startTutorWatcher();
};

// Start auto-complete check every 10 min + on load
setInterval(_autoCompleteExpiredSessions, 10 * 60 * 1000);

// Observe admin tab changes to hook commission button
const _commObserver = new MutationObserver(() => _hookCommissionSaveBtn());
document.addEventListener('DOMContentLoaded', () => {
  const adCon = document.getElementById('adCon');
  if (adCon) _commObserver.observe(adCon, { childList: true, subtree: true });

  // Delay startup check
  setTimeout(_autoCompleteExpiredSessions, 6000);
});

// Hook into the go() function for admin stats injection
const _p_go = window.go;
window.go = function (name) {
  const result = _p_go(name);
  if (name === 'admin' && CP?.role === 'admin') {
    setTimeout(_injectPlatformProfitWidget, 600);
  }
  return result;
};

console.log('✅ Skillak patch.js v2.0 loaded — all features active');
