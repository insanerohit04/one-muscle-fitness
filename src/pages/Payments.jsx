import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AdminLayout } from '../components/AdminLayout';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
];

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN');
};

const formatCurrency = (val) => {
  if (val === null || val === undefined) return '0.00';
  return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getStatusBadge = (member) => {
  if (member.deactivated) {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Deactivated</span>;
  }
  if (!member.endDate) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>;
  const end = new Date(member.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Expired</span>;
  if (diffDays <= 7) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Expiring Soon</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>;
};

export default function Payments() {
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'cash',
    note: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [membersSnap, paymentsSnap] = await Promise.all([
          getDocs(query(collection(db, 'members'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'payments'), orderBy('createdAt', 'desc')))
        ]);
        setMembers(membersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setPayments(paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredMembers = useMemo(() => {
    if (!searchTerm) return members;
    const term = searchTerm.toLowerCase();
    return members.filter(m =>
      m.fullName?.toLowerCase().includes(term) ||
      m.mobile?.includes(term) ||
      m.email?.toLowerCase().includes(term)
    );
  }, [members, searchTerm]);

  const selectedMember = members.find(m => m.id === selectedMemberId);
  const memberPayments = payments.filter(p => p.memberId === selectedMemberId);

  const totalDues = useMemo(() => {
    return members.reduce((sum, m) => sum + (m.remainingDue || 0), 0);
  }, [members]);

  const recentDues = useMemo(() => {
    return members
      .filter(m => (m.remainingDue || 0) > 0)
      .sort((a, b) => (b.remainingDue || 0) - (a.remainingDue || 0))
      .slice(0, 5);
  }, [members]);

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setError('Please select a member');
      return;
    }
    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (amount > (selectedMember.remainingDue || 0)) {
      if (!window.confirm(`Payment amount (₹${amount}) exceeds remaining due (₹${selectedMember.remainingDue}). Continue?`)) {
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      // Create payment doc
      const paymentData = {
        memberId: selectedMemberId,
        memberName: selectedMember.fullName,
        memberMobile: selectedMember.mobile,
        amount,
        date: paymentForm.date,
        method: paymentForm.method,
        note: paymentForm.note || '',
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'payments'), paymentData);

      // Update member's amountPaid and remainingDue
      const newAmountPaid = (selectedMember.amountPaid || 0) + amount;
      const newRemainingDue = Math.max(0, (selectedMember.membershipFee || 0) - newAmountPaid);
      await updateDoc(doc(db, 'members', selectedMemberId), {
        amountPaid: newAmountPaid,
        remainingDue: newRemainingDue,
        updatedAt: serverTimestamp(),
      });

      // Refresh data
      const [membersSnap, paymentsSnap] = await Promise.all([
        getDocs(query(collection(db, 'members'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'payments'), orderBy('createdAt', 'desc')))
      ]);
      setMembers(membersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPayments(paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Reset form
      setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], method: 'cash', note: '' });
      setSelectedMemberId('');
      setShowPaymentForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMemberSelect = (memberId) => {
    setSelectedMemberId(memberId);
    setShowPaymentForm(true);
  };

  return (
    <AdminLayout
      title="Payments"
      subtitle="Manage member payments and dues"
      actions={<Link to="/admin/dashboard" className="btn-secondary text-sm py-2 px-4">← Dashboard</Link>}
    >
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Dues Widget */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6 border-l-4 border-violet-600">
            <p className="text-sm text-gray-500">Total Outstanding Dues</p>
            <p className="text-3xl font-bold text-violet-600 mt-1">₹{formatCurrency(totalDues)}</p>
          </div>
          <div className="card p-6 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-500">Members with Dues</p>
            <p className="text-3xl font-bold text-yellow-600 mt-1">
              {members.filter(m => (m.remainingDue || 0) > 0).length}
            </p>
          </div>
          <div className="card p-6 border-l-4 border-green-500">
            <p className="text-sm text-gray-500">Total Members</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{members.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Member Selection + Payment Form */}
          <div className="lg:col-span-1 space-y-6">
            {/* Member Search & Select */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Member</h3>
              <div className="relative mb-4">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search member by name, phone, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>

              {loading ? (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 animate-pulse">
                      <div className="skeleton skeleton-avatar"></div>
                      <div className="flex-1 min-w-0">
                        <div className="skeleton skeleton-text" style={{ width: '100px' }}></div>
                        <div className="skeleton skeleton-text-sm mt-1" style={{ width: '80px' }}></div>
                      </div>
                      <div className="skeleton skeleton-text-sm text-right" style={{ width: '80px' }}></div>
                    </div>
                  ))}
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-500">{searchTerm ? 'No members match your search' : 'No members found'}</p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-2">
                    {filteredMembers.map(member => (
                      <button
                        key={member.id}
                        onClick={() => handleMemberSelect(member.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-colors ${
                          selectedMemberId === member.id
                            ? 'bg-violet-50 border-violet-200'
                            : 'border-gray-100 hover:border-violet-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {member.photoURL ? (
                            <img src={member.photoURL} alt="" className="w-10 h-10 rounded-xl object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                              <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{member.fullName}</p>
                            <p className="text-xs text-gray-500 truncate">{member.mobile}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-violet-600">₹{formatCurrency(member.remainingDue || 0)}</p>
                            <p className="text-xs text-gray-500">Due</p>
                          </div>
                        </div>
                        {getStatusBadge(member)}
                      </button>
                    ))}
                  </div>

                  </>
                )}

            {/* Payment Form */}
            {showPaymentForm && selectedMember && (
              <div className="card p-6 border-violet-200 bg-violet-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
                  <button
                    onClick={() => { setShowPaymentForm(false); setSelectedMemberId(''); }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-4 p-3 bg-white rounded-xl border border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{selectedMember.fullName}</p>
                  <p className="text-xs text-gray-500">{selectedMember.mobile}</p>
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="text-gray-500">Due: </span>
                    <span className="font-bold text-violet-600">₹{formatCurrency(selectedMember.remainingDue || 0)}</span>
                  </div>
                </div>

                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="amount" className="label">Amount (₹) <span className="text-red-500">*</span></label>
                    <input
                      id="amount"
                      type="number"
                      name="amount"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                      required
                      min="1"
                      step="0.01"
                      placeholder="Enter amount"
                      className="input"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label htmlFor="date" className="label">Date <span className="text-red-500">*</span></label>
                    <input
                      id="date"
                      type="date"
                      name="date"
                      value={paymentForm.date}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, date: e.target.value }))}
                      required
                      className="input"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label htmlFor="method" className="label">Method <span className="text-red-500">*</span></label>
                    <select
                      id="method"
                      name="method"
                      value={paymentForm.method}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, method: e.target.value }))}
                      className="input"
                      disabled={submitting}
                    >
                      {PAYMENT_METHODS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="note" className="label">Note</label>
                    <textarea
                      id="note"
                      name="note"
                      value={paymentForm.note}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, note: e.target.value }))}
                      className="input min-h-[80px] resize-none"
                      placeholder="Optional note..."
                      disabled={submitting}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary w-full"
                    disabled={submitting}
                  >
                    {submitting ? 'Recording...' : 'Record Payment'}
                  </button>
                </form>
              </div>
            )}

            {/* Recent Dues Widget */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Dues</h3>
              {recentDues.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No outstanding dues</p>
              ) : (
                <div className="space-y-3">
                  {recentDues.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        {member.photoURL ? (
                          <img src={member.photoURL} alt="" className="w-8 h-8 rounded-xl object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{member.fullName}</p>
                          <p className="text-xs text-gray-500">{member.mobile}</p>
                        </div>
                      </div>
                      <span className="font-bold text-violet-600">₹{formatCurrency(member.remainingDue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
          )}
            </div>
          </div>

          {/* Right: Recent Payments + Member Payment History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Payments */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
                <span className="text-sm text-gray-500">{payments.length} total</span>
              </div>

              {loading ? (
                <div className="overflow-x-auto">
                  <table className="w-full" role="table">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Member</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Method</th>
                        <th className="pb-3">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[...Array(5)].map((_, i) => (
                        <tr key={i} className="skeleton-table-row animate-pulse">
                          <td className="py-3"><div className="skeleton skeleton-text-sm" style={{ width: '80px' }}></div></td>
                          <td className="py-3"><div className="skeleton skeleton-text" style={{ width: '100px' }}></div><div className="skeleton skeleton-text-sm mt-1" style={{ width: '80px' }}></div></td>
                          <td className="py-3"><div className="skeleton skeleton-text-sm text-right" style={{ width: '70px' }}></div></td>
                          <td className="py-3"><div className="skeleton skeleton-text-sm" style={{ width: '60px' }}></div></td>
                          <td className="py-3"><div className="skeleton skeleton-text-sm" style={{ width: '90px' }}></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500">No payments recorded yet</p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-3">
                    {payments.slice(0, 20).map(payment => (
                      <div key={payment.id} className="card p-4 animate-fade-in-up">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{payment.memberName}</p>
                              <p className="text-xs text-gray-500">{payment.memberMobile}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-green-600 text-sm">₹{formatCurrency(payment.amount)}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                          <span className="capitalize">{payment.method}</span>
                          <span className="text-gray-500">{payment.note || '-'}</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">{formatDate(payment.date)}</div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Member</th>
                          <th className="pb-3">Amount</th>
                          <th className="pb-3">Method</th>
                          <th className="pb-3">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {payments.slice(0, 20).map(payment => (
                          <tr key={payment.id} className="hover:bg-gray-50">
                            <td className="py-3 text-sm text-gray-900">{formatDate(payment.date)}</td>
                            <td className="py-3">
                              <p className="font-medium text-gray-900 text-sm">{payment.memberName}</p>
                              <p className="text-xs text-gray-500">{payment.memberMobile}</p>
                            </td>
                            <td className="py-3 text-sm font-medium text-green-600">₹{formatCurrency(payment.amount)}</td>
                            <td className="py-3 text-sm text-gray-600 capitalize">{payment.method}</td>
                            <td className="py-3 text-sm text-gray-600 max-w-xs truncate">{payment.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {payments.length > 20 && (
                      <p className="text-center text-sm text-gray-500 mt-4">Showing 20 of {payments.length} payments</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Selected Member Payment History */}
            {selectedMember && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">Payment History for <span className="skeleton skeleton-text" style={{ width: '120px' }}></span></h3>
                    <span className="text-sm text-gray-500"><span className="skeleton skeleton-text-sm" style={{ width: '40px' }}></span> payments</span>
                  </div>
                </div>

{memberPayments.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-500">No payments recorded for this member</p>
                  </div>
                ) : loading ? (
                  <div className="overflow-x-auto">
                    <table className="w-full" role="table">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Amount</th>
                          <th className="pb-3">Method</th>
                          <th className="pb-3">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {[...Array(4)].map((_, i) => (
                          <tr key={i} className="skeleton-table-row animate-pulse">
                            <td className="py-3"><div className="skeleton skeleton-text-sm" style={{ width: '80px' }}></div></td>
                            <td className="py-3"><div className="skeleton skeleton-text-sm text-right" style={{ width: '70px' }}></div></td>
                            <td className="py-3"><div className="skeleton skeleton-text-sm" style={{ width: '60px' }}></div></td>
                            <td className="py-3"><div className="skeleton skeleton-text-sm" style={{ width: '90px' }}></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <div className="lg:hidden space-y-3">
                      {memberPayments.map(payment => (
                        <div key={payment.id} className="card p-4 animate-fade-in-up">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{payment.memberName || 'Member'}</p>
                                <p className="text-xs text-gray-500">{payment.memberMobile}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-green-600 text-sm">₹{formatCurrency(payment.amount)}</p>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                            <span className="capitalize">{payment.method}</span>
                            <span className="text-gray-500">{payment.note || '-'}</span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">{formatDate(payment.date)}</div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <th className="pb-3">Date</th>
                            <th className="pb-3">Amount</th>
                            <th className="pb-3">Method</th>
                            <th className="pb-3">Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {memberPayments.map(payment => (
                            <tr key={payment.id} className="hover:bg-gray-50">
                              <td className="py-3 text-sm text-gray-900">{formatDate(payment.date)}</td>
                              <td className="py-3 text-sm font-medium text-green-600">₹{formatCurrency(payment.amount)}</td>
                              <td className="py-3 text-sm text-gray-600 capitalize">{payment.method}</td>
                              <td className="py-3 text-sm text-gray-600">{payment.note || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    );
}