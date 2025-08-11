# Gaurav's Personal Notes + Money Tracker

A blazing-fast personal notes and money tracking application built with Next.js, Firebase, and Tailwind CSS. Features real-time synchronization, offline support, and 25+ ready-to-use templates.

## ✨ Features

### 📝 Notes Management
- **Rich Text Editor** - Clean, distraction-free writing experience
- **Real-time Auto-save** - Changes saved automatically (<1ms feel)
- **Offline Support** - Works without internet, syncs when online
- **25+ Templates** - Ready-made templates for productivity, health, learning, and more
- **Smart Organization** - Pin, archive, and categorize your notes

### 💰 Money Tracking
- **Budget Management** - Set starting amounts and track remaining balance
- **Expense Tracking** - Add expenses with categories and descriptions
- **Visual Progress** - Progress bars and color-coded balance indicators
- **Real-time Updates** - Balance updates instantly as you add expenses

### 🔐 Authentication & Security
- **Google OAuth** - Secure sign-in with Google
- **Persistent Sessions** - Stay logged in until manual logout
- **Private Data** - Each user's data is completely isolated
- **Firestore Security Rules** - Server-side data validation and protection

### 🚀 Performance & UX
- **Blazing Fast** - Optimistic UI updates for instant feedback
- **Mobile-First** - Responsive design that works on all devices
- **Smooth Animations** - Framer Motion powered micro-interactions
- **PWA Ready** - Can be installed as a mobile app

## 🛠️ Tech Stack

- **Frontend**: Next.js 14+ (App Router), React 18+, TypeScript
- **Styling**: Tailwind CSS 3+, Framer Motion
- **Backend**: Firebase (Firestore, Authentication)
- **Deployment**: Vercel
- **Development**: ESLint, TypeScript

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project (instructions below)

### 1. Clone and Install
```bash
git clone <repository-url>
cd gaurav-personal-notes
npm install
```

### 2. Firebase Setup

#### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `gaurav-personal-notes`
4. Enable Google Analytics (optional)
5. Click "Create project"

#### Enable Authentication
1. In Firebase Console, go to "Authentication" → "Sign-in method"
2. Enable "Google" provider
3. Add your domain to authorized domains

#### Setup Firestore Database
1. Go to "Firestore Database" → "Create database"
2. Start in "test mode" (we'll add security rules later)
3. Choose your preferred location

#### Get Firebase Config
1. Go to Project Settings → General
2. Scroll to "Your apps" → "Web apps"
3. Click "Add app" or use existing config
4. Copy the config object

### 3. Environment Setup
Create `.env.local` file in the root directory:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Deploy Firestore Security Rules
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init firestore

# Deploy security rules
firebase deploy --only firestore:rules
```

### 5. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
gaurav-personal-notes/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # Root layout with auth provider
│   │   ├── page.tsx           # Root redirect logic
│   │   ├── login/             # Authentication pages
│   │   └── dashboard/         # Main application
│   │       ├── page.tsx       # Dashboard home
│   │       ├── notes/[id]/    # Note editor
│   │       ├── money/         # Money tracker
│   │       └── templates/     # Template gallery
│   ├── components/
│   │   └── auth/              # Authentication components
│   ├── hooks/
│   │   ├── useAuth.ts         # Authentication hook
│   │   └── useAutosave.ts     # Auto-save with offline support
│   ├── lib/
│   │   ├── firebase.ts        # Firebase configuration
│   │   └── templates.ts       # 25+ predefined templates
│   └── types/
│       └── index.ts           # TypeScript type definitions
├── public/                     # Static assets
├── firestore.rules            # Firestore security rules
├── .env.local                 # Environment variables
└── package.json
```

## 📋 Available Templates

### Productivity (5 templates)
- Daily Tasks - Organize daily to-do items
- Weekly Planner - 7-day structured planning
- Meeting Notes - Structured meeting documentation
- Project Planning - Goals, milestones, deadlines
- Goal Setting - SMART goals framework

### Personal Life (5 templates)
- Grocery List - Categorized shopping list
- Meal Planning - Weekly meal prep organizer
- Travel Itinerary - Trip planning with dates/locations
- Packing Checklist - Travel packing organizer
- Gift Ideas - Holiday/birthday gift tracker

### Health & Wellness (5 templates)
- Workout Log - Exercise tracking and progress
- Habit Tracker - Daily habit monitoring
- Mood Journal - Daily mood and reflection
- Water Intake - Daily hydration tracker
- Sleep Log - Sleep quality tracking

### Learning & Development (4 templates)
- Book Notes - Reading notes and quotes
- Course Notes - Learning material organization
- Language Learning - Vocabulary and phrases
- Skill Development - Progress tracking

### Financial (3 templates)
- Monthly Budget - Income and expense planning
- Expense Tracker - Daily spending log
- Savings Goals - Financial goal tracking

### Quick Capture (3 templates)
- Quick Notes - Rapid idea capture
- Link Collection - URL bookmarking
- Voice-to-Text - Transcription template

## 🚀 Deployment

### Deploy to Vercel

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Deploy
   vercel
   ```

2. **Set Environment Variables**
   In Vercel dashboard, go to Project Settings → Environment Variables and add all the `NEXT_PUBLIC_FIREBASE_*` variables.

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Deploy Firebase Rules
```bash
firebase deploy --only firestore:rules
```

## 🔧 Configuration

### Firebase Security Rules
The included `firestore.rules` file provides:
- User data isolation
- Data structure validation
- Read/write permissions based on authentication
- Protection against unauthorized access

### Auto-save Configuration
- **Debounce Delay**: 300ms (configurable in `useAutosave.ts`)
- **Offline Storage**: localStorage with automatic sync
- **Conflict Resolution**: Last-write-wins with timestamp comparison

### Performance Optimizations
- Client-side rendering for editors
- Optimistic UI updates
- Debounced auto-save
- Lazy loading for templates
- Image optimization with Next.js

## 🐛 Troubleshooting

### Common Issues

1. **Firebase Authentication Error**
   - Check if Google OAuth is enabled in Firebase Console
   - Verify domain is added to authorized domains
   - Ensure environment variables are correct

2. **Firestore Permission Denied**
   - Deploy security rules: `firebase deploy --only firestore:rules`
   - Check if user is authenticated
   - Verify user UID matches document path

3. **Auto-save Not Working**
   - Check browser console for errors
   - Verify Firebase configuration
   - Check network connectivity

4. **Templates Not Loading**
   - Check if templates.ts file is properly imported
   - Verify template data structure
   - Check for JavaScript errors in console

## 📱 Mobile Support

The application is fully responsive and works great on mobile devices:
- Touch-friendly interface
- Mobile-optimized navigation
- Responsive typography and spacing
- PWA capabilities for app-like experience

## 🔒 Privacy & Security

- **Data Encryption**: All data encrypted in transit and at rest
- **User Isolation**: Each user's data is completely separate
- **No Data Collection**: No analytics or tracking beyond Firebase Auth
- **Local Storage**: Sensitive data never stored in plain text locally

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

## 📄 License

This project is for personal use. All rights reserved.

---

**Built with ❤️ by Gaurav**

*A modern, fast, and secure personal productivity app that works everywhere.*
