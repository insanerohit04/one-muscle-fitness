import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import logo from '../assets/logo.png';
import { useNavigate } from 'react-router-dom';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN');
};

const formatCurrency = (val) => {
  if (val === null || val === undefined) return '0.00';
  return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getStatus = (member) => {
  if (member.deactivated) return 'deactivated';
  if (!member.endDate) return 'active';
  const end = new Date(member.endDate);
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

const getStatusBadge = (member) => {
  const status = getStatus(member);
  if (status === 'deactivated') return <span className="badge badge-neutral">Deactivated</span>;
  if (status === 'expired') return <span className="badge badge-error">Expired</span>;
  if (status === 'expiring_soon') return <span className="badge badge-warning">Expiring Soon</span>;
  return <span className="badge badge-success">Active</span>;
};

const planLabel = (plan) => {
  if (!plan) return '-';
  return plan.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function MemberDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [member, setMember] = useState(null);
  const [workout, setWorkout] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const handleSignOut = async () => {
    await signOut(auth);
    window.location.href = '/login';
  };

  useEffect(() => {
    const fetchMemberData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const membersRef = collection(db, 'members');
        const uid = user.uid;
        const email = user.email?.toLowerCase();

        // First try: look up by authUid
        let memberQuery = query(membersRef, where('authUid', '==', uid));
        let memberSnap = await getDocs(memberQuery);

        // Fallback: if no match, try by email
        if (memberSnap.empty && email) {
          memberQuery = query(membersRef, where('email', '==', email));
          memberSnap = await getDocs(memberQuery);
        }

        if (memberSnap.empty) {
          setMember(null);
          return;
        }

        const memberDoc = memberSnap.docs[0];
        const memberData = { id: memberDoc.id, ...memberDoc.data() };
        setMember(memberData);

        // Fetch workout for this member
        try {
          const workoutsRef = collection(db, 'workouts');
          const workoutQuery = query(workoutsRef, where('memberId', '==', memberData.id));
          const workoutSnap = await getDocs(workoutQuery);
          if (!workoutSnap.empty) {
            setWorkout({ id: workoutSnap.docs[0].id, ...workoutSnap.docs[0].data() });
          }
        } catch (e) {
          console.warn('Could not fetch workout:', e);
        }

        // Fetch payments for this member
        try {
          const paymentsRef = collection(db, 'payments');
          const paymentsQuery = query(paymentsRef, where('memberId', '==', memberData.id), orderBy('createdAt', 'desc'));
          const paymentsSnap = await getDocs(paymentsQuery);
          setPayments(paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.warn('Could not fetch payments:', e);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMemberData();
  }, [user]);

  if (authLoading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-violet-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-container flex items-center justify-center p-4">
        <div className="card-elevated p-8 text-center max-w-md w-full">
          <svg className="w-14 h-14 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Please Sign In</h2>
          <p className="text-gray-600 mb-6">You need to be signed in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <header className="page-header">
          <div className="page-header-content">
            <div className="flex items-center gap-3">
              <img src={logo} alt="ONE MUSCLE FITNESS" className="h-10 w-auto" />
              <span className="text-xl font-bold text-gray-900">ONE MUSCLE FITNESS</span>
            </div>
            <button
              onClick={handleSignOut}
              className="btn-secondary text-sm py-2 px-4"
            >
              Sign Out
            </button>
          </div>
        </header>
        <main className="page-main max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="skeleton skeleton-text-lg mb-1" style={{ width: '120px' }}></div>
              <div className="skeleton skeleton-text-sm" style={{ width: '180px' }}></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="skeleton skeleton-avatar"></div>
            </div>
          </div>

          {/* Membership Overview */}
          <section aria-labelledby="membership-heading" className="animate-fade-in-up animate-delay-1 mb-6">
            <div className="skeleton skeleton-text mb-6" style={{ width: '180px' }}></div>
            <div className="stat-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton-stat-card animate-fade-in-up animate-delay-1" style={{ animationDelay: `${(i + 1) * 50}ms` }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="skeleton skeleton-text-sm mb-2" style={{ width: '60%' }}></div>
                      <div className="skeleton skeleton-text-lg" style={{ width: '40%' }}></div>
                    </div>
                    <div className="skeleton w-10 h-10 rounded-xl bg-gray-100"></div>
                  </div>
                  <div className="skeleton skeleton-divider mt-4 mb-2"></div>
                  <div className="skeleton skeleton-text-sm" style={{ width: '30%' }}></div>
                </div>
              ))}
            </div>
          </section>

          {/* Today's Workout */}
          <section aria-labelledby="workout-heading" className="animate-fade-in-up animate-delay-2 mb-6">
            <div className="card-section">
              <div className="flex items-center justify-between mb-6">
                <div className="skeleton skeleton-text" style={{ width: '160px' }}></div>
                <div className="skeleton skeleton-text-sm" style={{ width: '120px' }}></div>
              </div>
              <div className="skeleton skeleton-text" style={{ width: '100%', height: '120px' }}></div>
            </div>
          </section>

          {/* Payment History */}
          <section aria-labelledby="payments-heading" className="animate-fade-in-up animate-delay-3">
            <div className="card-section">
              <div className="skeleton skeleton-text mb-6" style={{ width: '140px' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '100%', height: '200px' }}></div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container flex items-center justify-center p-4">
        <div className="card-elevated p-8 text-center max-w-md w-full">
          <svg className="w-14 h-14 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="page-container">
        <header className="page-header">
          <div className="page-header-content">
            <div className="flex items-center gap-3">
              <img src={logo} alt="ONE MUSCLE FITNESS" className="h-10 w-auto" />
              <span className="text-xl font-bold text-gray-900">ONE MUSCLE FITNESS</span>
            </div>
            <button
              onClick={handleSignOut}
              className="btn-secondary text-sm py-2 px-4"
            >
              Sign Out
            </button>
          </div>
        </header>
        <main className="page-main max-w-md mx-auto px-4">
          <div className="card-elevated p-8 text-center">
            <svg className="w-14 h-14 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Membership Found</h2>
            <p className="text-gray-600 mb-6">
              We couldn't find a membership linked to your account ({user.email}).
            </p>
            <p className="text-sm text-gray-500">
              Please contact the admin to set up your membership.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining(member.endDate);
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0;
  const isExpired = daysRemaining !== null && daysRemaining < 0;
  const _status = getStatus(member);

  // Member-only layout (no admin sidebar)
  const MemberLayout = ({ children, title, subtitle, actions }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const handleSignOut = async () => {
      await signOut(auth);
      window.location.href = '/login';
    };

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Mobile Header */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 lg:hidden fixed top-0 left-0 right-0 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logo} alt="ONE MUSCLE FITNESS" className="h-8 w-auto" />
              <span className="text-xl font-bold text-gray-900">ONE MUSCLE FITNESS</span>
            </div>
            <button
              onClick={handleSignOut}
              className="btn-secondary text-sm py-2 px-3 min-h-[44px] min-w-[44px]"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="pt-20 lg:pt-0 min-h-screen bg-gray-50">
          <header className="bg-white border-b border-gray-100 px-4 py-4 lg:hidden">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="ONE MUSCLE FITNESS" className="h-10 w-auto" />
                  <span className="text-xl font-bold text-gray-900">ONE MUSCLE FITNESS</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="btn-secondary text-sm py-2 px-4 hidden lg:inline-flex"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 py-8 sm:py-10 pt-20 lg:pt-0">
            {(title || subtitle) && (
              <div className="mb-8 animate-fade-in-up">
                <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
              </div>
            )}
            {actions && (
              <div className="mb-6 animate-fade-in-up flex flex-col sm:flex-row gap-3">
                {actions}
              </div>
            )}
            {children}
          </main>
        </main>
      </div>
    );
  };

  return (
    <MemberLayout
      title="Dashboard"
      subtitle="Welcome back, {member.fullName}"
      actions={
        <div className="flex items-center gap-3">
          {member.authUid && (
            <span className="badge badge-violet">Linked to Auth</span>
          )}
          {member.photoURL ? (
            <img src={member.photoURL} alt={member.fullName} className="avatar" />
          ) : (
            <div className="avatar-placeholder">
              <svg className="icon-md text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
        </div>
      }
    >
      <section aria-labelledby="membership-heading" className="animate-fade-in-up animate-delay-1 mb-6">
        <h2 id="membership-heading" className="section-title">Membership Overview</h2>
        <div className="stat-grid" role="list">
            <div className="stat-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Status</p>
                  <p className="text-xl font-bold mt-1">
                    {getStatusBadge(member)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <svg className="icon-md text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Plan</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{planLabel(member.membershipPlan)}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <svg className="icon-md text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Expiry</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{formatDate(member.endDate)}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <svg className="icon-md text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Days Remaining</p>
                  <p className={`text-3xl font-bold mt-1 ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-600' : 'text-green-600'}`}>
                    {daysRemaining !== null
                      ? isExpired ? 'Expired' : daysRemaining === 0 ? 'Today' : daysRemaining
                      : '—'}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isExpired ? 'bg-red-100' : isExpiringSoon ? 'bg-yellow-100' : 'bg-green-100'}`}>
                  <svg className={`icon-md ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Fee</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">₹{formatCurrency(member.membershipFee)}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <svg className="icon-md text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Paid</p>
                  <p className="text-xl font-bold text-green-600 mt-1">₹{formatCurrency(member.amountPaid)}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <svg className="icon-md text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-violet-500 font-medium">Due</p>
                  <p className="text-xl font-bold text-violet-600 mt-1">₹{formatCurrency(member.remainingDue)}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <svg className="icon-md text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Today's Workout */}
        <section aria-labelledby="workout-heading" className="animate-fade-in-up animate-delay-2 mb-6">
          <div className="card-section">
            <div className="flex items-center justify-between mb-6">
              <h2 id="workout-heading" className="card-section-title">Today's Workout</h2>
              {workout?.updatedAt && (
                <span className="text-xs text-gray-500">Updated: {formatDate(workout.updatedAt)}</span>
              )}
            </div>

            {workout?.note ? (
              <div className="bg-gray-50 rounded-xl p-5 font-mono text-sm whitespace-pre-wrap text-gray-800 leading-relaxed">
                {workout.note}
              </div>
            ) : (
              <div className="text-center py-10">
                <svg className="w-14 h-14 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No workout assigned today</h3>
                <p className="text-gray-500">Your trainer will update this when ready</p>
              </div>
            )}
          </div>
        </section>

        {/* Payment History */}
        <section aria-labelledby="payments-heading" className="animate-fade-in-up animate-delay-3">
          <div className="card-section">
            <h2 id="payments-heading" className="card-section-title">Payment History</h2>

            {payments.length === 0 ? (
              <div className="empty-state">
                <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="empty-state-title">No payments recorded</h3>
                <p className="empty-state-description">Your payment history will appear here once payments are recorded.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table" role="table">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Amount</th>
                      <th scope="col">Method</th>
                      <th scope="col">Reference</th>
                      <th scope="col">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(payment => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.date)}</td>
                        <td className="font-medium text-green-600">₹{formatCurrency(payment.amount)}</td>
                        <td className="capitalize text-gray-600">{payment.method}</td>
                        <td className="text-gray-500">{payment.reference || '-'}</td>
                        <td className="text-gray-500 max-w-xs truncate">{payment.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Address Footer */}
        <div className="mt-12 pt-8 border-t border-gray-100 text-center animate-fade-in-up">
          <p className="text-sm text-gray-500 mb-3">
            ONE MUSCLE FITNESS, Khanapur Road Jirayat Patur, Maharashtra 444501
          </p>
          <a
            href="https://maps.app.goo.gl/vmqrCb2wqZWSbgGw9"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-violet-600 font-medium hover:underline text-sm"
          >
            Click here to view us on Google Maps
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
    </MemberLayout>
  );
}