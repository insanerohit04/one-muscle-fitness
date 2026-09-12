import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AdminLayout } from '../components/AdminLayout';

const PLANS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-Yearly' },
  { value: 'annual', label: 'Annual' },
];

const CLOUDINARY_CLOUD_NAME = 'xrtuorov';
const CLOUDINARY_UPLOAD_PRESET = 'one_muscle_members';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Upload failed: ${response.status}`);
  }

  const data = await response.json();
  return data.secure_url;
};

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
  fullName: member?.fullName || '',
  mobile: member?.mobile || '',
  email: member?.email || '',
  dateOfBirth: member?.dateOfBirth || '',
  membershipPlan: member?.membershipPlan || 'monthly',
  startDate: member?.startDate || '',
  endDate: member?.endDate || '',
  membershipFee: member?.membershipFee?.toString() || '',
  amountPaid: member?.amountPaid?.toString() || '',
});

export default function EditMember() {
  const navigate = useNavigate();
  const location = useLocation();
  const memberFromState = location.state?.member;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(() => memberFromState?.photoURL || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const initialFormData = createInitialFormData(memberFromState);
  const [formData, setFormData] = useState(initialFormData);
  const memberId = memberFromState?.id || null;
  const existingPhotoURL = memberFromState?.photoURL || null;

  useEffect(() => {
    if (!memberFromState) {
      navigate('/admin/members');
    }
  }, [memberFromState, navigate]);

  const remainingDue = Math.max(
    0,
    (parseFloat(formData.membershipFee) || 0) - (parseFloat(formData.amountPaid) || 0)
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      setSelectedPhoto(file);
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const removePhoto = () => {
    setSelectedPhoto(null);
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(null);
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) return 'Full name is required';
    if (!formData.mobile.trim()) return 'Mobile number is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Invalid email format';
    if (!formData.startDate) return 'Start date is required';
    if (!formData.endDate) return 'End date is required';
    if (new Date(formData.endDate) < new Date(formData.startDate)) return 'End date must be after start date';
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
    let photoURL = existingPhotoURL;

    try {
      if (selectedPhoto) {
        setUploadingPhoto(true);
        try {
          photoURL = await uploadToCloudinary(selectedPhoto);
        } catch (uploadError) {
          console.error('Photo upload failed:', uploadError);
        } finally {
          setUploadingPhoto(false);
        }
      }

      const status = computeStatus(formData.endDate);

      await updateDoc(doc(db, 'members', memberId), {
        fullName: formData.fullName.trim(),
        mobile: formData.mobile.trim(),
        email: formData.email.trim().toLowerCase(),
        dateOfBirth: formData.dateOfBirth || null,
        membershipPlan: formData.membershipPlan,
        startDate: formData.startDate,
        endDate: formData.endDate,
        membershipFee: parseFloat(formData.membershipFee),
        amountPaid: parseFloat(formData.amountPaid),
        remainingDue,
        status,
        photoURL,
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
        title="Edit Member"
        subtitle="Update member details"
        actions={<a href="/admin/members" className="btn-secondary text-sm py-2 px-4">← Back to Members</a>}
      >
        <main className="max-w-3xl mx-auto px-6 py-12">
          <div className="card p-8 animate-pulse">
            <div className="mb-8">
              <div className="skeleton skeleton-text-lg mb-1" style={{ width: '160px' }}></div>
              <div className="skeleton skeleton-text-sm" style={{ width: '180px' }}></div>
            </div>

            <form className="space-y-6">
              {/* Photo Upload */}
              <div>
                <div className="skeleton skeleton-text-sm mb-2" style={{ width: '100px' }}></div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="relative">
                    <div className="skeleton skeleton-image w-24 h-24 rounded-xl border-2 border-dashed"></div>
                  </div>
                  <div className="flex flex-col gap-2 min-w-0 flex-1">
                    <div className="skeleton skeleton-btn" style={{ width: '120px' }}></div>
                    <div className="skeleton skeleton-btn" style={{ width: '120px' }}></div>
                    <div className="skeleton skeleton-text-xs" style={{ width: '140px' }}></div>
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <div className="skeleton skeleton-text-sm mb-2" style={{ width: '100px' }}></div>
                <div className="skeleton skeleton-input"></div>
              </div>

              {/* Mobile & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="skeleton skeleton-text-sm mb-2" style={{ width: '120px' }}></div>
                  <div className="skeleton skeleton-input"></div>
                </div>
                <div>
                  <div className="skeleton skeleton-text-sm mb-2" style={{ width: '80px' }}></div>
                  <div className="skeleton skeleton-input"></div>
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <div className="skeleton skeleton-text-sm mb-2" style={{ width: '120px' }}></div>
                <div className="skeleton skeleton-input"></div>
              </div>

              {/* Membership Plan */}
              <div>
                <div className="skeleton skeleton-text-sm mb-2" style={{ width: '140px' }}></div>
                <div className="skeleton skeleton-input"></div>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="skeleton skeleton-text-sm mb-2" style={{ width: '100px' }}></div>
                  <div className="skeleton skeleton-input"></div>
                </div>
                <div>
                  <div className="skeleton skeleton-text-sm mb-2" style={{ width: '100px' }}></div>
                  <div className="skeleton skeleton-input"></div>
                </div>
              </div>

              {/* Membership Fee & Amount Paid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="skeleton skeleton-text-sm mb-2" style={{ width: '160px' }}></div>
                  <div className="skeleton skeleton-input"></div>
                </div>
                <div>
                  <div className="skeleton skeleton-text-sm mb-2" style={{ width: '160px' }}></div>
                  <div className="skeleton skeleton-input"></div>
                </div>
              </div>

              {/* Remaining Due - Read Only */}
              <div>
                <div className="skeleton skeleton-text-sm mb-2" style={{ width: '140px' }}></div>
                <div className="skeleton skeleton-input bg-gray-50" style={{ height: '3rem' }}></div>
                <div className="skeleton skeleton-text-xs mt-1" style={{ width: '180px' }}></div>
              </div>

              {/* Status Preview */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="skeleton skeleton-text-sm mb-1" style={{ width: '180px' }}></div>
                <div className="skeleton skeleton-badge"></div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <div className="skeleton skeleton-btn flex-1"></div>
                <div className="skeleton skeleton-btn flex-1"></div>
              </div>
            </form>
          </div>
        </main>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Edit Member"
      subtitle="Update member details"
      actions={<a href="/admin/members" className="btn-secondary text-sm py-2 px-4">← Back to Members</a>}
    >

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="card p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Edit Member</h1>
            <p className="text-gray-600 mt-1">Update member details</p>
          </div>

          {success && (
            <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl text-center">
              Member updated successfully! Redirecting...
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Upload */}
            <div>
              <label className="label">Member Photo</label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative">
                  <input
                    type="file"
                    id="photo"
                    name="photo"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    disabled={loading || uploadingPhoto}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('photo')?.click()}
                    className={`w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${
                      photoPreview
                        ? 'border-violet-300 bg-violet-50'
                        : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50'
                    }`}
                    disabled={loading || uploadingPhoto}
                  >
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Member photo preview"
                        className="w-full h-full rounded-lg object-cover"
                      />
                    ) : (
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="flex flex-col gap-2 min-w-0 flex-1">
                  <label htmlFor="photo" className="text-sm font-medium text-violet-600 hover:underline cursor-pointer">
                    {photoPreview ? 'Change photo' : 'Choose photo'}
                  </label>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="text-sm text-red-600 hover:underline self-start"
                      disabled={loading || uploadingPhoto}
                    >
                      Remove
                    </button>
                  )}
                  <p className="text-xs text-gray-500">Max 5MB · JPG, PNG, WebP</p>
                  {uploadingPhoto && (
                    <p className="text-xs text-violet-600 flex items-center gap-1">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Uploading photo...
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="label">Full Name <span className="text-red-500">*</span></label>
              <input
                id="fullName"
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
                placeholder="John Doe"
                className="input"
                disabled={loading}
              />
            </div>

            {/* Mobile & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="mobile" className="label">Mobile Number <span className="text-red-500">*</span></label>
                <input
                  id="mobile"
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  required
                  placeholder="+91 98765 43210"
                  className="input"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="email" className="label">Email <span className="text-red-500">*</span></label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="john@example.com"
                  className="input"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dateOfBirth" className="label">Date of Birth</label>
              <input
                id="dateOfBirth"
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className="input"
                disabled={loading}
              />
            </div>

            {/* Membership Plan */}
            <div>
              <label htmlFor="membershipPlan" className="label">Membership Plan <span className="text-red-500">*</span></label>
              <select
                id="membershipPlan"
                name="membershipPlan"
                value={formData.membershipPlan}
                onChange={handleInputChange}
                className="input"
                disabled={loading}
              >
                {PLANS.map(plan => (
                  <option key={plan.value} value={plan.value}>{plan.label}</option>
                ))}
              </select>
            </div>

            {/* Start Date & End Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="startDate" className="label">Start Date <span className="text-red-500">*</span></label>
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
                <label htmlFor="endDate" className="label">End Date <span className="text-red-500">*</span></label>
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
                <label htmlFor="membershipFee" className="label">Membership Fee (₹) <span className="text-red-500">*</span></label>
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
                <label htmlFor="amountPaid" className="label">Amount Paid (₹) <span className="text-red-500">*</span></label>
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
              <label className="label">Remaining Due (₹)</label>
              <div className="input bg-gray-50 text-gray-900 font-semibold text-lg flex items-center h-12">
                {remainingDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-gray-500 mt-1">Auto-calculated: Fee − Paid</p>
            </div>

            {/* Status Preview */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-sm text-gray-600 mb-1">Membership Status (preview)</p>
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
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
</form>
        </div>
      </main>
    </AdminLayout>
    );
}