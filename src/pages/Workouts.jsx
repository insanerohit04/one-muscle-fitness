import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, getDocs, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AdminLayout } from '../components/AdminLayout';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN');
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

export default function Workouts() {
  const [members, setMembers] = useState([]);
  const [workouts, setWorkouts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [workoutNote, setWorkoutNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [membersSnap, workoutsSnap] = await Promise.all([
          getDocs(query(collection(db, 'members'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'workouts'), orderBy('updatedAt', 'desc')))
        ]);
        const membersData = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const activeMembers = membersData.filter(m => getStatus(m) === 'active');
        setMembers(activeMembers);

        const workoutsData = {};
        workoutsSnap.docs.forEach(d => {
          workoutsData[d.id] = d.data();
        });
        setWorkouts(workoutsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleMemberSelect = (memberId) => {
    setSelectedMemberId(memberId);
    const existing = workouts[memberId]?.note || '';
    setWorkoutNote(existing);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!selectedMemberId) return;
    setSaving(true);
    setError('');

    try {
      await setDoc(doc(db, 'workouts', selectedMemberId), {
        memberId: selectedMemberId,
        note: workoutNote,
        updatedAt: serverTimestamp(),
      });

      setWorkouts(prev => ({
        ...prev,
        [selectedMemberId]: { note: workoutNote, updatedAt: new Date().toISOString() }
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedMember = members.find(m => m.id === selectedMemberId);
  const existingWorkout = workouts[selectedMemberId];

  return (
    <AdminLayout
      title="Workouts"
      subtitle="Manage member workout plans"
      actions={<Link to="/admin/dashboard" className="btn-secondary text-sm py-2 px-4">← Dashboard</Link>}
    >
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Member List */}
        <div className="lg:col-span-1 card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Members ({members.length})</h3>

          {selectedMember ? null : (
            <>
              {loading ? (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 animate-pulse">
                      <div className="skeleton skeleton-avatar"></div>
                      <div className="flex-1 min-w-0">
                        <div className="skeleton skeleton-text" style={{ width: '100px' }}></div>
                        <div className="skeleton skeleton-text-sm mt-1" style={{ width: '80px' }}></div>
                      </div>
                      <div className="w-5 h-5"></div>
                    </div>
                  ))}
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-500">No active members</p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-2">
                    {members.map(member => {
                      return (
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
{workouts[member.id] && (
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                      );
                    })}
                  </div>

                  {/* Desktop List View */}
                  <div className="hidden lg:block space-y-2 max-h-[600px] overflow-y-auto">
                    {members.map(member => {
                      return (
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
                          {workouts[member.id] && (
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
);
                    })}
                  </div>
                </>
              )
            }
          </>
          )
        }
          </div>

          {/* Right: Workout Editor */}
          <div className="lg:col-span-2">
            {selectedMember ? (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    {selectedMember.photoURL ? (
                      <img src={selectedMember.photoURL} alt="" className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{selectedMember.fullName}</h3>
                      <p className="text-sm text-gray-500">{selectedMember.mobile}</p>
                    </div>
                  </div>
                  {existingWorkout && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      Last updated: {formatDate(existingWorkout.updatedAt)}
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <label className="label">Today's Workout Note</label>
                  <textarea
                    value={workoutNote}
                    onChange={(e) => { setWorkoutNote(e.target.value); setSaved(false); }}
                    className="input min-h-[300px] resize-none font-mono text-sm"
                    placeholder="Enter today's workout plan...&#10;&#10;Example:&#10;Warm-up: 5 min jump rope&#10;&#10;Main Set:&#10;- Bench Press: 3x10 @ 60kg&#10;- Squats: 3x12 @ 70kg&#10;- Pull-ups: 3x8&#10;&#10;Finisher: Plank 3x60s&#10;&#10;Cool down: Stretch 5 min"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    This overwrites the previous workout plan for this member. No history is kept.
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary flex-1"
                  >
                    {saving ? 'Saving...' : 'Save Workout'}
                  </button>
                  <button
                    onClick={() => { setSelectedMemberId(''); setWorkoutNote(''); }}
                    className="btn-secondary"
                  >
                    Clear Selection
                  </button>
                </div>

                {saved && (
                  <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-xl text-center text-sm">
                    Workout saved successfully!
                  </div>
                )}
              </div>
            ) : (
              <div className="card p-12 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Member</h3>
                <p className="text-gray-500">Choose an active member from the list to create or edit their workout plan.</p>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    );
  };