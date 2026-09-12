import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import logo from '../assets/logo.png';
import heroPhoto from '../assets/hero-photo.jpeg';

function Login() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    mobile: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (submitError) {
      setSubmitError('');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (isSignUp && !formData.mobile) newErrors.mobile = 'Mobile number is required';
    else if (isSignUp && formData.mobile && !/^[\d\s\-+()]{10,}$/.test(formData.mobile)) newErrors.mobile = 'Invalid mobile number';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkExistingAuthUidLink = async (uid) => {
    try {
      const membersRef = collection(db, 'members');
      const q = query(membersRef, where('authUid', '==', uid));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking existing authUid link:', error);
      return false;
    }
  };

  const linkMemberByEmailAndMobile = async (uid, email, mobile) => {
    try {
      const membersRef = collection(db, 'members');
      const q = query(membersRef, where('email', '==', email), where('mobile', '==', mobile));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const memberDoc = snapshot.docs[0];
        await updateDoc(doc(db, 'members', memberDoc.id), { authUid: uid });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error linking member by email and mobile:', error);
      return false;
    }
  };

  const linkMemberByEmail = async (uid, email) => {
    try {
      const membersRef = collection(db, 'members');
      const q = query(membersRef, where('email', '==', email));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const memberDoc = snapshot.docs[0];
        await updateDoc(doc(db, 'members', memberDoc.id), { authUid: uid });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error linking member by email:', error);
      return false;
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validateForm()) return;

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCredential.user.uid;

      const alreadyLinked = await checkExistingAuthUidLink(uid);
      if (!alreadyLinked) {
        // No authUid link yet, but for sign in we don't create new links
        // The member should already have authUid set from sign up or admin creation
      }

      navigate('/', { replace: true });
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validateForm()) return;

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCredential.user.uid;

      const alreadyLinked = await checkExistingAuthUidLink(uid);
      if (!alreadyLinked) {
        await linkMemberByEmailAndMobile(uid, formData.email, formData.mobile);
      }

      navigate('/', { replace: true });
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const uid = userCredential.user.uid;
      const email = userCredential.user.email;

      const alreadyLinked = await checkExistingAuthUidLink(uid);
      if (!alreadyLinked && email) {
        await linkMemberByEmail(uid, email);
      }

      navigate('/', { replace: true });
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(prev => !prev);
    setErrors({});
    setSubmitError('');
    setFormData({ email: '', password: '', mobile: '' });
  };

  const features = [
    {
      icon: (
        <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: 'Train Smarter',
      description: 'Personalized workouts for real results'
    },
    {
      icon: (
        <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: 'Track Progress',
      description: 'Monitor every rep, every milestone'
    },
    {
      icon: (
        <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      title: 'Stay Healthy',
      description: 'With One Muscle diet plans'
    }
  ];

  if (user) {
    return <Navigate to={location.state?.from?.pathname || '/member/dashboard'} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* MOBILE LAYOUT - Stack vertically: Header -> Hero -> Login Card -> Features -> Footer */}
      <div className="lg:hidden">
        {/* Mobile Header */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logo} alt="ONE MUSCLE FITNESS" className="h-8 w-auto" />
              <span className="text-xl font-bold text-gray-900">ONE MUSCLE FITNESS</span>
            </div>
          </div>
        </header>

        {/* Mobile Hero Section */}
        <section className="relative min-h-[40vh] w-full">
          <img
            src={heroPhoto}
            alt="ONE MUSCLE FITNESS"
            className="w-full h-[40vh] min-h-[240px] object-cover object-center"
          />
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-50/90 via-gray-50/30 to-transparent" aria-hidden="true" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(109,40,217,0.1)_0%,_transparent_70%)]" aria-hidden="true" />
          {/* Badge overlay */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-white/30 border-2 border-white/40 flex items-center justify-center text-center backdrop-blur-sm animate-pulse-slow" style={{ animationDelay: '0.5s' }}>
            <span className="text-xs font-bold text-white leading-tight px-2">
              DISCIPLINE TODAY = SUCCESS
            </span>
          </div>
        </section>

        {/* Mobile Content Panel - Stacked above card */}
        <div className="px-4 py-8">
          <div className="flex items-center gap-3 mb-8">
            <img src={logo} alt="ONE MUSCLE FITNESS" className="h-10 w-auto" />
            <span className="text-xl font-bold text-gray-900 tracking-tight">ONE MUSCLE FITNESS</span>
          </div>

          <div className="mt-4 inline-flex">
            <span className="bg-violet-600 text-white text-sm font-medium px-4 py-1.5 rounded-full">
              #StrongerEveryday
            </span>
          </div>

          <div className="mt-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight tracking-tight">
              <div className="block">BUILD</div>
              <div className="block text-violet-600">STRENGTH.</div>
              <div className="block">BUILD</div>
              <div className="block text-violet-600">DISCIPLINE.</div>
            </h1>
          </div>

          <p className="text-base text-gray-600 leading-relaxed mt-4">
            Transform your body. Elevate your mind. Join One Muscle Fitness today.
          </p>

          <div className="space-y-3 mt-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl bg-white"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{feature.title}</h3>
                  <p className="text-gray-600 text-sm mt-0.5">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-gray-100 text-center mt-8">
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
        </div>
      </div>

      {/* DESKTOP LAYOUT - Split screen */}
      <div className="hidden lg:flex lg:w-1/2 flex-col py-16 justify-between relative min-h-screen pointer-events-none">
        {/* Top-left: Logo + Wordmark */}
        <div className="flex items-center gap-3 pointer-events-auto px-8">
          <img src={logo} alt="ONE MUSCLE FITNESS" className="h-12 w-auto" />
          <span className="text-2xl font-bold text-gray-900 tracking-tight">ONE MUSCLE FITNESS</span>
        </div>

        {/* Badge */}
        <div className="mt-8 inline-flex pointer-events-auto px-8">
          <span className="bg-violet-600 text-white text-sm font-medium px-4 py-1.5 rounded-full">
            #StrongerEveryday
          </span>
        </div>

        {/* Headline - 4 stacked lines */}
        <div className="my-12 pointer-events-auto px-8">
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight">
            <div className="block">BUILD</div>
            <div className="block text-violet-600">STRENGTH.</div>
            <div className="block">BUILD</div>
            <div className="block text-violet-600">DISCIPLINE.</div>
          </h1>
        </div>

        {/* Subtext */}
        <p className="text-lg text-gray-600 leading-relaxed pointer-events-auto px-8">
          Transform your body. Elevate your mind. Join One Muscle Fitness today.
        </p>

        {/* Features - each in its own card */}
        <div className="space-y-4 mt-12 pointer-events-auto px-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl bg-white hover:border-violet-100 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                {feature.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 mt-1">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Address */}
        <div className="pt-8 border-t border-gray-100 text-center pointer-events-auto px-8 pb-16">
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
      </div>

      {/* RIGHT SIDE - Hero Photo (Desktop only) */}
      <div className="hidden lg:block absolute inset-y-0 right-0 w-1/2 max-h-screen">
        {/* Hero Image - full visible, no cropping */}
        <img
          src={heroPhoto}
          alt="ONE MUSCLE FITNESS"
          className="w-full h-full object-contain object-right"
        />
        {/* Gradient blend overlay */}
        <div className="absolute inset-0 bg-gradient-to-l from-gray-50/60 via-transparent to-transparent" aria-hidden="true" />
        {/* Violet radial glow overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center_right,_rgba(109,40,217,0.15)_0%,_transparent_70%)]" aria-hidden="true" />
        {/* Circular Badge Overlay - top right */}
        <div className="absolute top-10 right-10 w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-center backdrop-blur-sm animate-pulse-slow" style={{ animationDelay: '0.5s' }}>
          <span className="text-xs lg:text-sm font-bold text-white leading-tight px-2">
            DISCIPLINE TODAY = SUCCESS
          </span>
        </div>
      </div>

      {/* LOGIN CARD - Centered, responsive width */}
      <div className="fixed inset-0 flex items-center justify-center p-4 lg:p-8 z-20 pointer-events-none">
        <div className="w-full max-w-[360px] card p-6 lg:p-8 shadow-xl pointer-events-auto">
          {/* Tabs */}
          <div className="flex gap-2 mb-8 border-b border-gray-100">
            <button
              type="button"
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-3 px-3 text-center font-medium rounded-t-xl transition-colors text-sm ${
                !isSignUp
                  ? 'bg-violet-50 text-violet-600'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-3 px-3 text-center font-medium rounded-t-xl transition-colors text-sm ${
                isSignUp
                  ? 'bg-violet-50 text-violet-600'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Sign Up
            </button>
          </div>

          {submitError && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm text-center">
              {submitError}
            </div>
          )}

          {/* Sign In Form */}
          {!isSignUp && (
            <form onSubmit={handleSignIn} className="space-y-6">
              <div>
                <label htmlFor="email-signin" className="label text-sm">Email</label>
                <input
                  id="email-signin"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={errors.email ? 'border-red-400 focus:ring-red-400 py-4 rounded-xl' : 'py-4 rounded-xl'}
                  disabled={loading}
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="password-signin" className="label text-sm">Password</label>
                <div className="relative">
                  <input
                    id="password-signin"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={errors.password ? 'border-red-400 focus:ring-red-400 pr-12 py-4 rounded-xl' : 'py-4 rounded-xl pr-12'}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542 7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              <button
                type="submit"
                className="btn-primary w-full py-3"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* Sign Up Form */}
          {isSignUp && (
            <form onSubmit={handleSignUp} className="space-y-6">
              <div>
                <label htmlFor="email-signup" className="label text-sm">Email</label>
                <input
                  id="email-signup"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={errors.email ? 'border-red-400 focus:ring-red-400 py-4 rounded-xl' : 'py-4 rounded-xl'}
                  disabled={loading}
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="password-signup" className="label text-sm">Password</label>
                <div className="relative">
                  <input
                    id="password-signup"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={errors.password ? 'border-red-400 focus:ring-red-400 pr-12 py-4 rounded-xl' : 'py-4 rounded-xl pr-12'}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542 7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              <div>
                <label htmlFor="mobile-signup" className="label text-sm">Mobile Number</label>
                <input
                  id="mobile-signup"
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  required
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  className={errors.mobile ? 'border-red-400 focus:ring-red-400 py-4 rounded-xl' : 'py-4 rounded-xl'}
                  disabled={loading}
                />
                {errors.mobile && <p className="mt-1 text-sm text-red-600">{errors.mobile}</p>}
              </div>

              <button
                type="submit"
                className="btn-primary w-full py-3"
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full py-3 flex items-center justify-center gap-3 bg-white border-2 border-violet-600 text-violet-600 font-medium rounded-xl hover:bg-violet-50 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2"
            disabled={loading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Switch Mode Link */}
          <p className="mt-5 text-center text-gray-600 text-sm">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"} {' '}
            <button
              type="button"
              onClick={toggleMode}
              className="text-violet-600 font-medium hover:underline"
              disabled={loading}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;