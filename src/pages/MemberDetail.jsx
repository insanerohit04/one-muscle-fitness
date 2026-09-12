import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AdminLayout } from '../components/AdminLayout';

const computeStatus = (endDateStr, deactivated) => {
  if (deactivated) return 'deactivated';
  if (!endDateStr) return 'active';
  const end = new Date(endDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 7) return 'expiring_soon';
  return 'active';
};

const getDaysRemaining = (endDateStr) => {
  if (!endDateStr) return null;
  const end = new Date(endDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN');
};

const formatCurrency = (val) => {
  if (val === null || val === undefined) return '-';
  return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getStatusBadge = (status, deactivated) => {
  if (deactivated || status === 'deactivated') {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">Deactivated</span>;
  }
  if (status === 'expired') return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">Expired</span>;
  if (status === 'expiring_soon') return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">Expiring Soon</span>;
  return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">Active</span>;
};

const planLabel = (plan) => {
  if (!plan) return '-';
  return plan.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function MemberDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const memberId = params.id || location.state?.member?.id;

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payments, setPayments] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    const fetchMember = async () => {
      if (!memberId) {
        navigate('/admin/members');
        return;
      }
      try {
        const memberDoc = await getDoc(doc(db, 'members', memberId));
        if (!memberDoc.exists()) {
          setError('Member not found');
          return;
        }
        const memberData = { id: memberDoc.id, ...memberDoc.data() };
        setMember(memberData);
        setAdminNote(memberData.adminNote || '');

        // Fetch payments
        const paymentsRef = collection(db, 'payments');
        const paymentsQuery = query(
          paymentsRef,
          where('memberId', '==', memberId),
          orderBy('createdAt', 'desc')
        );
        const paymentsSnapshot = await getDocs(paymentsQuery);
        setPayments(paymentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

        // Fetch workouts
        const workoutsRef = collection(db, 'workouts');
        const workoutsQuery = query(
          workoutsRef,
          where('memberId', '==', memberId),
          orderBy('createdAt', 'desc')
        );
        const workoutsSnapshot = await getDocs(workoutsQuery);
        setWorkouts(workoutsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMember();
  }, [memberId, navigate]);

  const handleDeactivate = async () => {
    if (!member) return;
    const newDeactivated = !member.deactivated;
    if (!window.confirm(newDeactivated ? 'Deactivate this member?' : 'Reactivate this member?')) return;
    setToggling(true);
    try {
      await updateDoc(doc(db, 'members', memberId), {
        deactivated: newDeactivated,
        updatedAt: serverTimestamp(),
      });
      setMember(prev => ({ ...prev, deactivated: newDeactivated }));
    } catch (err) {
      alert(err.message);
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!member) return;
    if (!window.confirm('Permanently delete this member? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'members', memberId));
      navigate('/admin/members');
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveNote = async () => {
    if (!memberId) return;
    setSavingNote(true);
    try {
      await updateDoc(doc(db, 'members', memberId), {
        adminNote,
        updatedAt: serverTimestamp(),
      });
      alert('Note saved');
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout
        title="Loading..."
        subtitle="Member Details"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Member Profile Card */}
          <div className="lg:col-span-1 card p-6 animate-pulse">
            <div className="text-center mb-6">
              <div className="skeleton skeleton-avatar-lg mx-auto mb-4"></div>
              <div className="skeleton skeleton-text-lg" style={{ width: '180px', margin: '0 auto 8px' }}></div>
              <div className="skeleton skeleton-text-sm" style={{ width: '120px', margin: '0 auto 4px' }}></div>
              <div className="skeleton skeleton-text-sm" style={{ width: '140px', margin: '0 auto' }}></div>
            </div>

            <div className="space-y-4 border-t border-gray-100 pt-4">
              <div>
                <div className="skeleton skeleton-text-xs mb-1" style={{ width: '50px' }}></div>
                <div className="skeleton skeleton-badge mx-auto"></div>
              </div>
              <div>
                <div className="skeleton skeleton-text-xs mb-1" style={{ width: '80px' }}></div>
                <div className="skeleton skeleton-text-xl mx-auto" style={{ width: '60px' }}></div>
              </div>
              <div>
                <div className="skeleton skeleton-text-xs mb-1" style={{ width: '40px' }}></div>
                <div className="skeleton skeleton-badge mx-auto" style={{ width: '100px' }}></div>
              </div>
              <div>
                <div className="skeleton skeleton-text-xs mb-1" style={{ width: '80px' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '120px', margin: '0 auto' }}></div>
              </div>
              <div>
                <div className="skeleton skeleton-text-xs mb-1" style={{ width: '60px' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '80px', margin: '0 auto' }}></div>
              </div>
              <div>
                <div className="skeleton skeleton-text-xs mb-1" style={{ width: '50px' }}></div>
                <div className="space-y-1 mx-auto" style={{ width: '160px' }}>
                  <div className="skeleton skeleton-text-sm"></div>
                  <div className="skeleton skeleton-text-sm"></div>
                  <div className="skeleton skeleton-text-sm"></div>
                </div>
              </div>
            </div>

            {/* Admin Note */}
            <div className="mt-6 border-t border-gray-100 pt-4">
              <div className="skeleton skeleton-text-xs mb-2" style={{ width: '70px' }}></div>
              <div className="skeleton skeleton-input min-h-[80px]"></div>
              <div className="skeleton skeleton-btn w-full mt-2"></div>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-2 border-t border-gray-100 pt-4">
              <div className="skeleton skeleton-btn w-full"></div>
              <div className="skeleton skeleton-btn w-full"></div>
            </div>
          </div>

          {/* Payment History */}
          <div className="lg:col-span-2 card p-6 animate-pulse">
            <div className="flex items-center justify-between mb-6">
              <div className="skeleton skeleton-text" style={{ width: '160px' }}></div>
              <div className="skeleton skeleton-text-sm" style={{ width: '80px' }}></div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Method</th>
                    <th className="pb-3">Reference</th>
                    <th className="pb-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...Array(4)].map((_, i) => (
                    <tr key={i} className="skeleton-table-row">
                      <td className="py-3"><div className="skeleton skeleton-text-sm" style={{ width: '80px' }}></div></td>
                      <td className="py-3"><div className="skeleton skeleton-text-sm text-right" style={{ width: '70px' }}></div></td>
                      <td className="py-3"><div className="skeleton skeleton-text-sm" style={{ width: '60px' }}></div></td>
                      <td className="py-3"><div className="skeleton skeleton-text-sm" style={{ width: '60px' }}></div></td>
                      <td className="py-3"><div className="skeleton skeleton-text-sm" style={{ width: '90px' }}></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Current Workout */}
        <div className="card p-6 animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="skeleton skeleton-text" style={{ width: '160px' }}></div>
            <div className="skeleton skeleton-text-sm" style={{ width: '80px' }}></div>
          </div>

          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="skeleton skeleton-text mb-1" style={{ width: '120px' }}></div>
                    <div className="skeleton skeleton-text-sm mt-1" style={{ width: '200px' }}></div>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                      <div className="skeleton skeleton-text-xs" style={{ width: '100px' }}></div>
                      <div className="skeleton skeleton-text-xs" style={{ width: '100px' }}></div>
                      <div className="skeleton skeleton-text-xs" style={{ width: '80px' }}></div>
                    </div>
                  </div>
                  <div className="skeleton skeleton-text-sm text-right" style={{ width: '100px' }}></div>
                </div>
                <div className="skeleton skeleton-text" style={{ width: '100%', height: '60px', marginTop: '12px' }}></div>
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card p-8 text-center max-w-md">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Member Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The member you are looking for does not exist.'}</p>
          <a href="/admin/members" className="btn-primary">Back to Members</a>
        </div>
      </div>
    );
  }

  const status = computeStatus(member.endDate, member.deactivated);
  const daysRemaining = getDaysRemaining(member.endDate);
  const isDeactivated = member.deactivated || status === 'deactivated';

  return (
    <AdminLayout
      title={member.fullName}
      subtitle="Member Details"
      actions={
        <div className="flex items-center gap-2">
          <Link to="/admin/members" className="btn-secondary text-sm py-2 px-4">← Back to Members</Link>
          <Link to={`/admin/edit-member/${memberId}`} className="btn-secondary">Edit</Link>
          <Link to={`/admin/renew-member/${memberId}`} className="btn-primary">Renew</Link>
        </div>
      }
    >
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Member Profile Card */}
          <div className="lg:col-span-1 card p-6">
            <div className="text-center mb-6">
              {member.photoURL ? (
                <img src={member.photoURL} alt={member.fullName} className="w-28 h-28 rounded-2xl object-cover mx-auto mb-4" />
              ) : (
                <div className="w-28 h-28 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-14 h-14 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <h2 className="text-2xl font-bold text-gray-900">{member.fullName}</h2>
              <p className="text-gray-500 text-sm">{member.mobile}</p>
              <p className="text-gray-500 text-sm">{member.email}</p>
              {member.authUid && <p className="text-xs text-violet-600 mt-1">Linked to auth</p>}
            </div>

            <div className="space-y-4 border-t border-gray-100 pt-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
                {getStatusBadge(status, member.deactivated)}
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Days Remaining</p>
                <p className={`text-2xl font-bold ${daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0 ? 'text-yellow-600' : daysRemaining !== null && daysRemaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {daysRemaining !== null ? (daysRemaining < 0 ? 'Expired' : daysRemaining === 0 ? 'Today' : daysRemaining) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Plan</p>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-violet-50 text-violet-700">
                  {planLabel(member.membershipPlan)}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Membership Period</p>
                <p className="text-gray-900">{formatDate(member.startDate)} → {formatDate(member.endDate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Date of Birth</p>
                <p className="text-gray-900">{formatDate(member.dateOfBirth)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Fees</p>
                <div className="space-y-1 text-sm">
                  <div>Fee: <span className="font-medium text-gray-900">₹{formatCurrency(member.membershipFee)}</span></div>
                  <div>Paid: <span className="font-medium text-green-600">₹{formatCurrency(member.amountPaid)}</span></div>
                  <div className="text-violet-600 font-medium">Due: ₹{formatCurrency(member.remainingDue)}</div>
                </div>
              </div>
            </div>

            {/* Admin Note */}
            <div className="mt-6 border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Admin Note</p>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="input min-h-[80px] resize-none"
                placeholder="Add a private note about this member..."
              />
              <button
                onClick={handleSaveNote}
                disabled={savingNote}
                className="btn-primary w-full mt-2"
              >
                {savingNote ? 'Saving...' : 'Save Note'}
              </button>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-2 border-t border-gray-100 pt-4">
              <button
                onClick={handleDeactivate}
                disabled={toggling}
                className={`w-full py-2 px-4 rounded-xl font-medium text-sm transition-colors ${
                  isDeactivated
                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                    : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                }`}
              >
                {isDeactivated ? 'Activate Member' : 'Deactivate Member'}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full py-2 px-4 rounded-xl font-medium text-sm text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Remove Member'}
              </button>
            </div>
          </div>

          {/* Payment History */}
          <div className="lg:col-span-2 card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
              <span className="text-sm text-gray-500">{payments.length} payments</span>
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-500">No payments recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Method</th>
                      <th className="pb-3">Reference</th>
                      <th className="pb-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payments.map(payment => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="py-3 text-sm text-gray-900">{formatDate(payment.date || payment.createdAt)}</td>
                        <td className="py-3 text-sm font-medium text-green-600">₹{formatCurrency(payment.amount)}</td>
                        <td className="py-3 text-sm text-gray-600 capitalize">{payment.method || '-'}</td>
                        <td className="py-3 text-sm text-gray-600">{payment.reference || '-'}</td>
                        <td className="py-3 text-sm text-gray-600">{payment.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Current Workout */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Current Workout</h3>
            <span className="text-sm text-gray-500">{workouts.length} workouts</span>
          </div>

          {workouts.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-gray-500">No workout assigned yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {workouts.slice(0, 3).map(workout => (
                <div key={workout.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{workout.name || workout.title || 'Workout'}</h4>
                      <p className="text-sm text-gray-500 mt-1">{workout.description || ''}</p>
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                        {workout.duration && <span>Duration: {workout.duration} min</span>}
                        {workout.difficulty && <span>Difficulty: {workout.difficulty}</span>}
                        {workout.type && <span>Type: {workout.type}</span>}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">Assigned: {formatDate(workout.createdAt)}</span>
                  </div>
                  {workout.exercises && workout.exercises.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-2">Exercises:</p>
                      <div className="flex flex-wrap gap-2">
                        {workout.exercises.slice(0, 5).map((ex, i) => (
                          <span key={i} className="px-2 py-1 bg-white rounded-full text-xs text-gray-600 border border-gray-200">
                            {ex.name || ex}
                          </span>
                        ))}
                        {workout.exercises.length > 5 && (
                          <span className="px-2 py-1 bg-violet-50 rounded-full text-xs text-violet-600">
                            +{workout.exercises.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {workouts.length > 3 && (
                <p className="text-center text-sm text-gray-500">+{workouts.length - 3} more workouts</p>
              )}
            </div>
          )}
        </div>
      </AdminLayout>
    );
}