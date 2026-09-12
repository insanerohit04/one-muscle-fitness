import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AdminLayout } from '../components/AdminLayout';
import { formatDate, formatCurrency, getStatusBadgeClass, getStatusBadgeText, computeStatus, getDaysRemaining, planLabel } from '../utils/formatters';
import { InlineError } from '../components/ui/ErrorState';

export default function ViewMembers() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [deactivatingId, setDeactivatingId] = useState(null);
  const [photoModal, setPhotoModal] = useState({ isOpen: false, photoURL: '', memberName: '' });

  const openPhotoModal = useCallback((e, photoURL, memberName) => {
    e.stopPropagation();
    if (photoURL) {
      setPhotoModal({ isOpen: true, photoURL, memberName });
    }
  }, []);

  const closePhotoModal = useCallback(() => {
    setPhotoModal({ isOpen: false, photoURL: '', memberName: '' });
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && photoModal.isOpen) {
        closePhotoModal();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [photoModal.isOpen, closePhotoModal]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const membersRef = collection(db, 'members');
        const q = query(membersRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const membersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMembers(membersData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  const handleDeactivate = async (memberId, currentStatus) => {
    if (window.confirm(currentStatus === 'deactivated' ? 'Reactivate this member?' : 'Deactivate this member?')) {
      setDeactivatingId(memberId);
      try {
        await updateDoc(doc(db, 'members', memberId), {
          deactivated: currentStatus !== 'deactivated',
          updatedAt: new Date().toISOString(),
        });
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, deactivated: currentStatus !== 'deactivated' } : m));
      } catch (err) {
        alert(err.message);
      } finally {
        setDeactivatingId(null);
      }
    }
  };

  const handleDelete = async (memberId) => {
    if (!window.confirm('Permanently delete this member? This cannot be undone.')) return;
    setDeletingId(memberId);
    try {
      await deleteDoc(doc(db, 'members', memberId));
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (member) => {
    navigate(`/admin/edit-member/${member.id}`, { state: { member } });
  };

  const handleRenew = (member) => {
    navigate(`/admin/renew-member/${member.id}`, { state: { member } });
  };

  return (
    <AdminLayout
      title="Members"
      subtitle={`${members.length} members total`}
      actions={
        <Link to="/admin/add-member" className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Member
        </Link>
      }
    >
      <section aria-labelledby="members-heading">
        <div className="section-header">
          <div>
            <h2 id="members-heading" className="section-title">Members</h2>
            <p className="section-subtitle">{members.length} members total</p>
          </div>
        </div>
      </section>
        {error && (
          <InlineError
            message={error}
            onDismiss={() => setError('')}
          />
        )}
        {loading ? (
          <div className="card animate-fade-in-up">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="skeleton skeleton-text-lg" style={{ width: '120px' }}></div>
                <div className="skeleton skeleton-btn" style={{ width: '140px' }}></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full" role="table">
                  <thead>
                    <tr>
                      <th scope="col" className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                      <th scope="col" className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th scope="col" className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                      <th scope="col" className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                      <th scope="col" className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fees</th>
                      <th scope="col" className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...Array(5)].map((_, i) => (
                      <tr key={i} className="skeleton-table-row">
                        <td className="px-6 py-4"><div className="skeleton skeleton-avatar"></div></td>
                        <td className="px-6 py-4"><div className="skeleton skeleton-text" style={{ width: '100px' }}></div><div className="skeleton skeleton-text-sm mt-1" style={{ width: '80px' }}></div><div className="skeleton skeleton-text-sm mt-1" style={{ width: '100px' }}></div></td>
                        <td className="px-6 py-4"><div className="skeleton skeleton-badge"></div></td>
                        <td className="px-6 py-4"><div className="skeleton skeleton-text-sm" style={{ width: '90px' }}></div></td>
                        <td className="px-6 py-4"><div className="skeleton skeleton-text-sm" style={{ width: '60px' }}></div><div className="skeleton skeleton-text-sm mt-1" style={{ width: '60px' }}></div><div className="skeleton skeleton-text-sm mt-1" style={{ width: '70px' }}></div></td>
                        <td className="px-6 py-4"><div className="skeleton skeleton-badge"></div></td>
                        <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-2"><div className="skeleton skeleton-btn" style={{ width: '60px' }}></div><div className="skeleton skeleton-btn" style={{ width: '60px' }}></div><div className="skeleton skeleton-btn" style={{ width: '70px' }}></div><div className="skeleton skeleton-btn" style={{ width: '60px' }}></div></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : members.length === 0 ? (
          <div className="card-section text-center py-12 animate-fade-in-up">
            <svg className="w-14 h-14 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No members yet</h3>
            <p className="text-gray-500 mb-6">Get started by adding your first member.</p>
            <a href="/admin/add-member" className="btn-primary inline-block">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Member
            </a>
          </div>
        ) : (
          <div className="animate-fade-in-up">
            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {members.map(member => (
                <div key={member.id} className="card p-4 animate-fade-in-up">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {member.photoURL ? (
                        <img
                          src={member.photoURL}
                          alt={member.fullName}
                          className="w-12 h-12 rounded-xl object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                          onClick={(e) => openPhotoModal(e, member.photoURL, member.fullName)}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{member.fullName}</p>
                      <p className="text-sm text-gray-500 truncate">{member.mobile}</p>
                      <p className="text-sm text-gray-500 truncate">{member.email}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className={getStatusBadgeClass({ ...member, status: member.status || 'active' })}>{getStatusBadgeText({ ...member, status: member.status || 'active' })}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700">
                        {member.membershipPlan?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Due:</span>
                        <span className="font-medium text-violet-600">₹{formatCurrency(member.remainingDue)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      onClick={() => navigate(`/admin/edit-member/${member.id}`, { state: { member } })}
                      className="text-violet-600 hover:text-violet-800 font-medium text-sm py-1 px-3 rounded-lg hover:bg-violet-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => navigate(`/admin/renew-member/${member.id}`, { state: { member: { ...member, id: member.id } } })}
                      className="text-green-600 hover:text-green-800 font-medium text-sm py-1 px-3 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      Renew
                    </button>
                    <button
                      onClick={() => confirm(member.deactivated ? 'Reactivate this member?' : 'Deactivate this member?') && updateDoc(doc(db, 'members', member.id), { deactivated: !member.deactivated, updatedAt: new Date().toISOString() })}
                      className={(member.deactivated ? 'text-green-600' : 'text-yellow-600') + ' hover:underline font-medium text-sm py-1 px-3 rounded-lg hover:bg-gray-50 transition-colors'}
                    >
                      {member.deactivated ? 'Activate' : 'Deactivate'}
                    </button>
                    <button
                      onClick={() => confirm('Permanently delete this member? This cannot be undone.') && deleteDoc(doc(db, 'members', member.id))}
                      className="text-red-600 hover:text-red-800 font-medium text-sm py-1 px-3 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <div className="card animate-fade-in-up">
                <div className="responsive-table-wrapper">
                  <table className="data-table" role="table">
                    <thead>
                      <tr>
                        <th scope="col">Photo</th>
                        <th scope="col">Name</th>
                        <th scope="col">Contact</th>
                        <th scope="col">Plan</th>
                        <th scope="col">Dates</th>
                        <th scope="col">Fees</th>
                        <th scope="col">Status</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {members.map(member => (
                        <tr key={member.id} className={member.deactivated ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50'}>
                          <td className="px-6 py-4">
                            {member.photoURL ? (
                              <img
                                src={member.photoURL}
                                alt={member.fullName}
                                className="w-10 h-10 rounded-xl object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                                onClick={(e) => openPhotoModal(e, member.photoURL, member.fullName)}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{member.fullName}</p>
                            <p className="text-sm text-gray-500">{member.mobile}</p>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700">
                              {member.membershipPlan?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {formatDate(member.startDate)} → {formatDate(member.endDate)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div>Fee: ₹{formatCurrency(member.membershipFee)}</div>
                            <div>Paid: ₹{formatCurrency(member.amountPaid)}</div>
                            <div className="font-medium text-violet-600">Due: ₹{formatCurrency(member.remainingDue)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={getStatusBadgeClass({ ...member, status: member.status || 'active' })}>{getStatusBadgeText({ ...member, status: member.status || 'active' })}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => navigate(`/admin/edit-member/${member.id}`, { state: { member } })}
                                className="text-violet-600 hover:text-violet-800 font-medium text-sm"
                                disabled={false}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => navigate(`/admin/renew-member/${member.id}`, { state: { member: { ...member, id: member.id } } })}
                                className="text-green-600 hover:text-green-800 font-medium text-sm"
                                disabled={false}
                              >
                                Renew
                              </button>
                              <button
                                onClick={() => confirm(member.deactivated ? 'Reactivate this member?' : 'Deactivate this member?') && updateDoc(doc(db, 'members', member.id), { deactivated: !member.deactivated, updatedAt: new Date().toISOString() })}
                                className={(member.deactivated ? 'text-green-600' : 'text-yellow-600') + ' hover:underline font-medium text-sm'}
                              >
                                {member.deactivated ? 'Activate' : 'Deactivate'}
                              </button>
                              <button
                                onClick={() => confirm('Permanently delete this member? This cannot be undone.') && deleteDoc(doc(db, 'members', member.id))}
                                className="text-red-600 hover:text-red-800 font-medium text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
</div>
          </div>
          </div>
        )}
        {photoModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={closePhotoModal}
          role="dialog"
          aria-modal="true"
          aria-label={`Photo of ${photoModal.memberName}`}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" />
          <div className="relative max-w-4xl max-h-[90vh] w-full animate-scale-in">
            <button
              onClick={closePhotoModal}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/90 text-gray-700 flex items-center justify-center shadow-lg hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
              aria-label="Close photo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={photoModal.photoURL}
              alt={photoModal.memberName}
              className="w-full h-auto max-h-[90vh] rounded-2xl shadow-2xl object-contain"
            />
          </div>
        </div>
      )}
      </AdminLayout>
  );
}