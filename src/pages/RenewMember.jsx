import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AdminLayout } from '../components/AdminLayout';

const computeStatus = (endDateStr) => {
  if (!endDateStr) return 'active';
  const end = new Date(endDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 7) return 'expiring_soon';
  return 'active';
};

const createInitialFormData = (member) => ({
  startDate: member?.endDate || '',
  endDate: '',
  membershipFee: (member?.membershipFee || 0).toString(),
  amountPaid: '0',
});

export default function RenewMember() {
  const navigate = useNavigate();
  const location = useLocation();
  const memberFromState = location.state?.member;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const initialFormData = createInitialFormData(memberFromState);
  const [formData, setFormData] = useState(initialFormData);

  const memberId = memberFromState?.id || null;
  const memberName = memberFromState?.fullName || 'Member';
  const currentPlan = memberFromState?.membershipPlan || 'monthly';
  const currentEndDate = memberFromState?.endDate || '';
  const currentFee = memberFromState?.membershipFee || 0;
  const currentPaid = memberFromState?.amountPaid || 0;

  useEffect(() => {
    if (!memberFromState) {
      navigate('/admin/members');
    }
  }, [memberFromState, navigate]);

  const remainingDue = Math.max(
    0,
    (parseFloat(formData.membershipFee) || 0) - (parseFloat(formData.amountPaid) + currentPaid)
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.startDate) return 'Start date is required';
    if (!formData.endDate) return 'End date is required';
    if (new Date(formData.endDate) <= new Date(formData.startDate)) return 'End date must be after start date';
    if (!formData.membershipFee) return 'Membership fee is required';
    if (parseFloat(formData.membershipFee) < 0) return 'Membership fee cannot be negative';
    if (!formData.amountPaid) return 'Amount paid is required';
    if (parseFloat(formData.amountPaid) < 0) return 'Amount paid cannot be negative';
    if (parseFloat(formData.amountPaid) > parseFloat(formData.membershipFee)) return 'Amount paid cannot exceed membership fee';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!memberId) {
      setError('Member ID not found');
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const status = computeStatus(formData.endDate);

      await updateDoc(doc(db, 'members', memberId), {
        startDate: formData.startDate,
        endDate: formData.endDate,
        membershipFee: parseFloat(formData.membershipFee),
        amountPaid: parseFloat(formData.amountPaid) + currentPaid,
        remainingDue: Math.max(0, parseFloat(formData.membershipFee) - (parseFloat(formData.amountPaid) + currentPaid)),
        status,
        updatedAt: serverTimestamp(),
      });

      setSuccess(true);
      setTimeout(() => navigate('/admin/members'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout
        title="Renew Membership"
        subtitle={`${memberName} · ${planLabel}`}
        actions={<Link to="/admin/members" className="btn-secondary text-sm py-2 px-4">← Back to Members</Link>}
      >
        <div className="card p-8 animate-pulse">
          <div className="mb-8">
            <div className="skeleton skeleton-text-lg mb-1" style={{ width: '180px' }}></div>
            <div className="skeleton skeleton-text-sm" style={{ width: '200px' }}></div>
          </div>

          {/* Current Membership Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="skeleton skeleton-text-sm mb-3" style={{ width: '160px' }}></div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="skeleton skeleton-text-xs mb-1" style={{ width: '100px' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '100px' }}></div>
              </div>
              <div>
                <div className="skeleton skeleton-text-xs mb-1" style={{ width: '80px' }}></div>
                <div className="skeleton skeleton-badge" style={{ width: '100px' }}></div>
              </div>
              <div>
                <div className="skeleton skeleton-text-xs mb-1" style={{ width: '100px' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '80px' }}></div>
              </div>
              <div>
                <div className="skeleton skeleton-text-xs mb-1" style={{ width: '100px' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '80px' }}></div>
              </div>
            </div>
          </div>

          <form className="space-y-6">
            {/* Start Date & End Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="skeleton skeleton-text-sm mb-2" style={{ width: '120px' }}></div>
                <div className="skeleton skeleton-input"></div>
              </div>
              <div>
                <div className="skeleton skeleton-text-sm mb-2" style={{ width: '120px' }}></div>
                <div className="skeleton skeleton-input"></div>
              </div>
            </div>

            {/* Membership Fee & Amount Paid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="skeleton skeleton-text-sm mb-2" style={{ width: '180px' }}></div>
                <div className="skeleton skeleton-input"></div>
              </div>
              <div>
                <div className="skeleton skeleton-text-sm mb-2" style={{ width: '180px' }}></div>
                <div className="skeleton skeleton-input"></div>
              </div>
            </div>

            {/* Remaining Due - Read Only */}
            <div>
              <div className="skeleton skeleton-text-sm mb-2" style={{ width: '220px' }}></div>
              <div className="skeleton skeleton-input bg-gray-50" style={{ height: '3rem' }}></div>
              <div className="skeleton skeleton-text-xs mt-1" style={{ width: '240px' }}></div>
            </div>

            {/* New Status Preview */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="skeleton skeleton-text-sm mb-1" style={{ width: '200px' }}></div>
              <div className="skeleton skeleton-badge"></div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4 border-t border-gray-100">
              <div className="skeleton skeleton-btn flex-1"></div>
              <div className="skeleton skeleton-btn flex-1"></div>
            </div>
          </form>
        </div>
      </AdminLayout>
    );
  }

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return '0.00';
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getCurrentStatusBadge = () => {
    const status = memberFromState?.deactivated ? 'deactivated' : (memberFromState?.status || 'active');
    if (status === 'deactivated') return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">Deactivated</span>;
    if (status === 'expired') return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">Expired</span>;
    if (status === 'expiring_soon') return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">Expiring Soon</span>;
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">Active</span>;
  };

  const planLabel = currentPlan.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <AdminLayout
      title="Renew Membership"
      subtitle={`${memberName} · ${planLabel}`}
      actions={<Link to="/admin/members" className="btn-secondary text-sm py-2 px-4">← Back to Members</Link>}
    >
        <div className="card p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Renew Membership</h1>
            <p className="text-gray-600 mt-1">{memberName} · {planLabel}</p>
          </div>

          {/* Current Membership Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Current Membership</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Current End Date</p>
                <p className="font-medium text-gray-900">{currentEndDate || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Current Status</p>
                <p className="font-medium text-gray-900">{getCurrentStatusBadge()}</p>
              </div>
              <div>
                <p className="text-gray-500">Membership Fee</p>
                <p className="font-medium text-gray-900">₹{formatCurrency(currentFee)}</p>
              </div>
              <div>
                <p className="text-gray-500">Total Paid</p>
                <p className="font-medium text-gray-900">₹{formatCurrency(currentPaid)}</p>
              </div>
            </div>
          </div>

          {success && (
            <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl text-center">
              Membership renewed successfully! Redirecting...
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Start Date & End Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="startDate" className="label">New Start Date <span className="text-red-500">*</span></label>
                <input
                  id="startDate"
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  className="input"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="endDate" className="label">New End Date <span className="text-red-500">*</span></label>
                <input
                  id="endDate"
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                  className="input"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Membership Fee & Amount Paid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="membershipFee" className="label">New Membership Fee (₹) <span className="text-red-500">*</span></label>
                <input
                  id="membershipFee"
                  type="number"
                  name="membershipFee"
                  value={formData.membershipFee}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  placeholder="5000"
                  className="input"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="amountPaid" className="label">Amount Paid Now (₹) <span className="text-red-500">*</span></label>
                <input
                  id="amountPaid"
                  type="number"
                  name="amountPaid"
                  value={formData.amountPaid}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  placeholder="2000"
                  className="input"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Remaining Due - Read Only */}
            <div>
              <label className="label">Remaining Due After Renewal (₹)</label>
              <div className="input bg-gray-50 text-gray-900 font-semibold text-lg flex items-center h-12">
                {remainingDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-gray-500 mt-1">Auto-calculated: New Fee − (Current Paid + Amount Paid Now)</p>
            </div>

            {/* New Status Preview */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-sm text-gray-600 mb-1">New Membership Status (preview)</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                computeStatus(formData.endDate) === 'expired' ? 'bg-red-100 text-red-700' :
                computeStatus(formData.endDate) === 'expiring_soon' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {computeStatus(formData.endDate) === 'expired' && 'Expired'}
                {computeStatus(formData.endDate) === 'expiring_soon' && 'Expiring Soon'}
                {computeStatus(formData.endDate) === 'active' && 'Active'}
              </span>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => navigate('/admin/members')}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={loading}
              >
                {loading ? 'Renewing...' : 'Renew Membership'}
              </button>
            </div>
          </form>
        </div>
      </AdminLayout>
    );
}