import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AdminLayout } from '../components/AdminLayout';
import { computeStatus } from '../utils/formatters';

const statCards = [
  {
    label: 'Total Members',
    value: (stats) => stats.totalMembers,
    icon: (
      <svg className="icon-lg text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    iconBg: 'bg-violet-100',
    link: '/admin/members',
    color: 'text-gray-900',
  },
  {
    label: 'Active Members',
    value: (stats) => stats.activeMembers,
    icon: (
      <svg className="icon-lg text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    iconBg: 'bg-green-100',
    link: '/admin/members',
    color: 'text-green-600',
  },
  {
    label: 'Expiring Soon',
    value: (stats) => stats.expiringSoon,
    icon: (
      <svg className="icon-lg text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: 'bg-yellow-100',
    link: '/admin/members',
    color: 'text-yellow-600',
  },
  {
    label: 'Monthly Revenue',
    value: (stats) => `₹${stats.monthlyRevenue.toLocaleString('en-IN')}`,
    icon: (
      <svg className="icon-lg text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: 'bg-blue-100',
    link: '/admin/payments',
    color: 'text-blue-600',
  },
  {
    label: 'Total Revenue',
    value: (stats) => `₹${stats.totalRevenue.toLocaleString('en-IN')}`,
    icon: (
      <svg className="icon-lg text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    iconBg: 'bg-violet-100',
    link: '/admin/payments',
    color: 'text-violet-600',
  },
  {
    label: 'Workouts',
    value: (stats) => stats.totalWorkouts || 0,
    icon: (
      <svg className="icon-lg text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    iconBg: 'bg-purple-100',
    link: '/admin/workouts',
    color: 'text-purple-600',
  },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    expiringSoon: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
    totalWorkouts: 0,
  });
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const membersRef = collection(db, 'members');
        const membersQuery = query(membersRef, orderBy('createdAt', 'desc'));
        const membersSnapshot = await getDocs(membersQuery);
        const membersData = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        let total = 0;
        let active = 0;
        let expiring = 0;

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        // Use YYYY-MM-DD string format for date field comparison (matches stored format)
        const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

        membersData.forEach(m => {
          total++;
          const status = computeStatus(m.endDate, m.deactivated);
          if (status === 'active') active++;
          else if (status === 'expiring_soon') expiring++;
        });

        // Total Revenue: sum of ALL payments ever (no date filter)
        // Monthly Revenue: sum of payments in current calendar month only
        let totalRevenue = 0;
        let monthlyRevenue = 0;

        try {
          const paymentsRef = collection(db, 'payments');
          // Fetch ALL payments for total revenue
          const allPaymentsQuery = query(paymentsRef, orderBy('createdAt', 'desc'));
          const allPaymentsSnapshot = await getDocs(allPaymentsQuery);
          allPaymentsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.amount) totalRevenue += data.amount;
          });

          // Fetch current month payments for monthly revenue
          const monthlyPaymentsQuery = query(
            paymentsRef,
            where('date', '>=', startOfMonthStr),
            orderBy('date', 'desc')
          );
          const monthlyPaymentsSnapshot = await getDocs(monthlyPaymentsQuery);
          monthlyPaymentsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.amount) monthlyRevenue += data.amount;
          });
        } catch {
        }

        try {
          const workoutsRef = collection(db, 'workouts');
          const workoutsQuery = query(workoutsRef, orderBy('createdAt', 'desc'));
          const workoutsSnapshot = await getDocs(workoutsQuery);
          const totalWorkouts = workoutsSnapshot.docs.length;
          setStats({ totalMembers: total, activeMembers: active, expiringSoon: expiring, monthlyRevenue, totalRevenue, totalWorkouts });
        } catch {
          setStats({ totalMembers: total, activeMembers: active, expiringSoon: expiring, monthlyRevenue, totalRevenue, totalWorkouts: 0 });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <AdminLayout
        title="Dashboard"
        subtitle="Welcome back! Here's an overview of your gym."
      >
        <div className="stat-grid" role="list" aria-label="Loading dashboard stats">
          {statCards.map((card, index) => (
            <div
              key={card.label}
              className="skeleton-stat-card animate-fade-in-up"
              style={{ animationDelay: `${(index + 1) * 50}ms` }}
              role="listitem"
              aria-label={`Loading ${card.label}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="skeleton skeleton-text-sm mb-2" style={{ width: '60%' }}></div>
                  <div className="skeleton skeleton-text-lg" style={{ width: '40%' }}></div>
                </div>
                <div className="skeleton w-12 h-12 rounded-xl"></div>
              </div>
              <div className="skeleton skeleton-divider mt-4 mb-2"></div>
              <div className="skeleton skeleton-text-sm" style={{ width: '30%' }}></div>
            </div>
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Dashboard"
      subtitle="Welcome back! Here's an overview of your gym."
      actions={
        <Link to="/admin/add-member" className="btn-primary">
          <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Member
        </Link>
      }
    >
      <div className="stat-grid" role="list">
        {statCards.map((card, index) => (
          <Link
            key={card.label}
            to={card.link}
            className="stat-card animate-fade-in-up"
            style={{ animationDelay: `${(index + 1) * 50}ms` }}
            role="listitem"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                <p className={`text-2xl font-bold ${card.color} mt-1`}>{card.value(stats)}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                {card.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

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
    </AdminLayout>
  );
}