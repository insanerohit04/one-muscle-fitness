# ONE MUSCLE FITNESS — User Manual

**Version 1.0** | **One Muscle Fitness Web App**  
*Complete User Guide for Gym Members & Administrators*

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Member Portal (Member Dashboard)](#2-member-portal-member-dashboard)
3. [Admin Portal (Admin Dashboard)](#3-admin-portal-admin-dashboard)
4. [Member Management](#4-member-management)
5. [Payments & Dues](#5-payments--dues)
6. [Workout Plans](#6-workout-plans)
7. [Account Settings & Security](#7-account-settings--security)
8. [Troubleshooting & FAQ](#8-troubleshooting--faq)
9. [Support & Contact](#9-support--contact)

---

## 1. Getting Started

### 1.1 Accessing the App
- Open your browser and navigate to the app URL provided by your gym.
- The app works on **desktop, tablet, and mobile** browsers (Chrome, Safari, Firefox, Edge).
- No installation required — it's a Progressive Web App (PWA). You can "Install" it to your home screen from the browser menu for quick access.

### 1.2 Signing In
1. Click **Sign In** on the landing page.
2. Enter your registered **email** and **password**.
3. Click **Sign In**.
4. You'll be redirected to your dashboard based on your role:
   - **Members** → Member Dashboard
   - **Admins** → Admin Dashboard

### 1.3 First-Time Sign Up (Members)
1. Click **Sign Up** on the login page.
2. Fill in:
   - Email address
   - Password (min 6 characters)
   - Mobile number (with country code, e.g., +91 98765 43210)
3. Click **Sign Up**.
4. An admin will link your account to your membership profile.

### 1.4 Google Sign-In
- Click **Continue with Google** on the login page.
- Select your Google account.
- If your email matches an existing member profile, it will be linked automatically.

### 1.5 Forgot Password
- Click **Forgot Password?** on the login page.
- Enter your email to receive a password reset link (handled by Firebase Auth).

---

## 2. Member Portal (Member Dashboard)

The Member Dashboard is your personal fitness hub. Access it at `/member/dashboard`.

### 2.1 Membership Overview
At the top, you'll see your membership status at a glance:
- **Status Badge**: Active / Expiring Soon / Expired / Deactivated
- **Plan**: Your current plan (Monthly, Quarterly, Half-Yearly, Annual)
- **Expiry Date**: When your current membership ends
- **Days Remaining**: Color-coded (Green = OK, Yellow = Expiring Soon, Red = Expired)
- **Fees**: Total fee, amount paid, and remaining due

### 2.2 Today's Workout
- View your assigned workout plan for today.
- Workout notes are displayed in a clean, readable format.
- If no workout is assigned: "No workout assigned today — Your trainer will update this when ready."

### 2.3 Payment History
- Complete transaction history with:
  - Date
  - Amount paid (green highlight)
  - Payment method (Cash, UPI, Card, Bank Transfer, Other)
  - Reference number
  - Notes
- Empty state if no payments recorded yet.

### 2.4 Profile Info
- Your name, mobile, email displayed at the top.
- Membership plan and status badges.
- "Linked to Auth" badge if your account is linked to Firebase Auth.

---

## 3. Admin Portal (Admin Dashboard)

Access at `/admin/dashboard`. Only users with `admin` role can access.

### 3.1 Dashboard Overview (Stats Cards)
Six key metrics at a glance:
| Card | Description | Navigation |
|------|-------------|------------|
| **Total Members** | All members in system | → Members page |
| **Active Members** | Currently active members | → Members page |
| **Expiring Soon** | Memberships expiring within 7 days | → Members page |
| **Monthly Revenue** | Payments received this calendar month | → Payments page |
| **Total Revenue** | All-time revenue | → Payments page |
| **Workouts** | Total workout plans assigned | → Workouts page |

Click any card to navigate to the relevant page.

### 3.2 Recent Members Table
- Shows 5 most recent members (photo, name, contact, plan, dates, fees, status).
- Search by name, phone, or email.
- Filter by status: All / Active / Expiring Soon / Expired / Deactivated.
- Click a row to view Member Details.

---

## 4. Member Management

### 4.1 View All Members (`/admin/members`)
- Searchable, filterable table with all members.
- Columns: Photo, Name, Contact, Plan, Dates, Fees, Status, Actions.
- **Actions per member**: Edit, Renew, Deactivate/Activate, Remove.

### 4.2 Add New Member (`/admin/add-member`)
Click **Add Member** button on Members page. Fill in:
- **Photo** (optional): Upload via drag-drop or click (max 5MB, JPG/PNG/WebP).
- **Full Name** (required)
- **Mobile Number** (required, format: +91 98765 43210)
- **Email** (required, validated)
- **Date of Birth** (optional)
- **Membership Plan**: Monthly / Quarterly / Half-Yearly / Annual
- **Start Date** & **End Date** (required)
- **Membership Fee** (₹, required)
- **Amount Paid** (required, cannot exceed fee)
- **Remaining Due** auto-calculates (Fee − Paid).
- Status auto-calculates from dates (Active / Expiring Soon / Expired).

> **Initial Payment**: If "Amount Paid" > 0, an initial payment record is automatically created in Payments.

### 4.3 Edit Member (`/admin/edit-member/:id`)
- Pre-filled form with existing data.
- Update any field (photo, contact, dates, fees, plan).
- Status auto-updates based on new end date.
- Click **Save Changes** → redirects to Members list.

### 4.4 Renew Membership (`/admin/renew-member/:id`)
For extending an existing membership:
- Pre-filled with current plan & fee.
- Set **New Start Date** (typically today or day after expiry).
- Set **New End Date** (must be after start date).
- Set **New Membership Fee** (can differ from previous).
- Enter **Amount Paid Now** (partial or full).
- Remaining Due auto-calculates: New Fee − (Current Paid + Amount Paid Now).
- On submit:
  - Membership extended (new start/end dates, updated fees).
  - Payment record created for amount paid now.
  - Member's `amountPaid` and `remainingDue` updated.

### 4.4 Member Details (`/admin/members/:id`)
Comprehensive view with three tabs:
1. **Profile Card**: Photo, name, contact, auth link status, status badge, days remaining, plan, dates, fees.
2. **Admin Note**: Private note field (save with button).
3. **Actions**: Activate/Deactivate, Remove (with confirmation).
4. **Payment History**: Full table (date, amount, method, reference, notes).
5. **Workout History**: Assigned workouts with exercises.

---

## 5. Payments & Dues

### 5.1 Payments Page (`/admin/payments`)
Four sections:

#### A. Dues Summary (Top Cards)
- **Total Outstanding Dues** (violet)
- **Members with Dues** (yellow)
- **Total Members** (green)

#### B. Member Search & Select (Left Panel)
- Search by name, phone, email.
- List shows: photo, name, mobile, status badge, **due amount** (violet highlight).
- Click a member → shows **Payment Form** + **Member Payment History**.

#### C. Payment Form (Right Panel)
Appears after selecting a member:
- Pre-filled member info + due amount.
- **Amount** (required, validates against due).
- **Date** (defaults to today).
- **Method**: Cash / UPI / Card / Bank Transfer / Other.
- **Note** (optional).
- **Submit** → creates payment, updates member's `amountPaid` & `remainingDue`, refreshes lists.

#### C. Member Payment History (Below Form)
- Shows all payments for selected member.
- Columns: Date, Amount (green), Method, Note.
- Empty state if no payments.

#### D. Recent Payments (Right Column)
- Latest 20 payments across all members.
- Columns: Date, Member (name + mobile), Amount (green), Method, Note.
- "Showing 20 of X payments" if more exist.

#### E. Member Payment History (Bottom Right)
- Appears when a member is selected.
- Full payment history for that member only.
- Columns: Date, Amount (green), Method, Note.
- Empty state if no payments.

### 5.2 Top Dues Widget (Bottom Left)
- Top 5 members with highest dues.
- Photo, name, mobile, due amount (violet).

---

## 6. Workout Plans

### 6.1 Workouts Page (`/admin/workouts`)
Two-panel layout:

#### Left Panel: Active Members List
- Only active members shown.
- Search by name/phone/email.
- Green checkmark (✓) if workout already assigned.
- Click member → loads their workout in editor.

#### Right Panel: Workout Editor
**No member selected**: "Select a Member" prompt.

**Member Selected**:
- Member header (photo, name, mobile, last updated timestamp).
- **Workout Editor**: Large textarea (300px height, monospace font) with placeholder template:
  ```
  Warm-up: 5 min jump rope

  Main Set:
  - Bench Press: 3x10 @ 60kg
  - Squats: 3x12 @ 70kg
  - Pull-ups: 3x8

  Finisher: Plank 3x60s

  Cool down: Stretch 5 min
  ```
- **Save Workout** → saves to Firestore, shows "Workout saved!" toast.
- **Clear Selection** button to deselect.
- Shows "Workout saved successfully!" toast for 2 seconds.

---

## 7. Account Settings & Security

### 7.1 Password Requirements
- Minimum 6 characters.
- Email format validated.
- Mobile: 10+ digits, allows spaces, dashes, parentheses, +.

### 7.2 Session Management
- Sessions persist across browser restarts (Firebase Auth persistence).
- Auto-redirect to appropriate dashboard on load.
- Sign Out button in:
  - Admin: Top header (desktop) + Sidebar footer (mobile).
  - Member: Header sign-out button.

### 7.3 Data Privacy
- Members only see their own data.
- Admins see all data.
- Photos stored in Cloudinary (secure, optimized delivery).
- No sensitive data in localStorage.

---

## 8. Troubleshooting & FAQ

| Issue | Solution |
|-------|----------|
| **"No Membership Found"** | Contact admin to link your email/mobile to a member profile. |
| **Login fails / wrong password** | Use "Forgot Password?" or contact admin to reset. |
| **Photo upload fails** | Max 5MB, JPG/PNG/WebP only. Check internet connection. |
| **Payment not showing** | Refresh page; check if admin recorded it. |
| **Workout not saving** | Check internet; ensure member selected; try again. |
| **Sign Out not working** | Clear browser cache/cookies, try again. |
| **Mobile layout broken** | Rotate device; clear cache; update browser. |
| **Notifications not working** | Enable notifications in browser settings for the site. |

### Browser Compatibility
| Browser | Minimum Version |
|---------|----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

---

## 9. Support & Contact

### 9.1 Gym Contact
**ONE MUSCLE FITNESS**  
Khanapur Road, Jirayat Patur, Maharashtra 444501  
📍 [View on Google Maps](https://maps.app.goo.gl/vmqrCb2wqZWSbgGw9)

### 9.2 Technical Support
For app issues, contact the admin or developer:
- Email: support@onemusclefitness.com (placeholder)
- Include: browser, device, steps to reproduce, screenshots.

### 9.3 Feature Requests
Submit via admin dashboard → "Feedback" (future feature) or email admin.

---

## Appendix: Quick Reference

### Keyboard Shortcuts (Admin)
| Key | Action |
|-----|--------|
| `Esc` | Close modals / close sidebar |
| `Enter` | Submit forms |
| `Tab` | Navigate form fields |

### Status Badge Colors
| Status | Color | Meaning |
|--------|-------|---------|
| Active | Green | Membership valid |
| Expiring Soon | Yellow | ≤ 7 days left |
| Expired | Red | Past end date |
| Deactivated | Gray | Manually deactivated |

### Payment Methods
| Code | Label |
|------|-------|
| cash | Cash |
| upi | UPI |
| card | Card |
| bank_transfer | Bank Transfer |
| other | Other |

---

## Document Control
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025 | System | Initial release |

---

**End of Manual**  
*This document covers all user-facing features of the One Muscle Fitness web application as of version 1.0. For technical documentation, see the Developer Guide (separate document).*