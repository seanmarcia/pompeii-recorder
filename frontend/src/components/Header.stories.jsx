import Header from '../components/Header.jsx'

// The app renders the Header only when authenticated (App.jsx returns the
// Login screen otherwise), so there is no signed-out Header state to story.
export default {
  title: 'Header',
  component: Header,
}

export const RecorderSignedIn = {
  args: {
    isOnline: true,
    outboxCount: 0,
    activeTab: 'start',
    currentUser: { full_name: 'Sera Baker', username: 'serabaker', role: 'recorder' },
  },
}

export const AdminSignedIn = {
  args: {
    isOnline: true,
    outboxCount: 0,
    activeTab: 'start',
    currentUser: { full_name: 'Carlos Fernandez', username: 'carlost', role: 'admin' },
  },
}

export const OfflineWithOutbox = {
  args: {
    isOnline: false,
    outboxCount: 3,
    isSyncing: false,
    activeTab: 'outbox',
    catalogCount: 42,
    currentUser: { full_name: 'Sera Baker', username: 'serabaker', role: 'recorder' },
  },
}