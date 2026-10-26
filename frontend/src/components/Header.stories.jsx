import Header from '../components/Header.jsx'
import { expect, within } from 'storybook/test'

// The app renders the Header only when authenticated (App.jsx returns the
// Login screen otherwise), so there is no signed-out Header state to story.
// Each story asserts the state the component must actually show.
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Shows the signed-in person by full name, never the fallback.
    await expect(canvas.getByText(/Sera Baker/)).toBeInTheDocument()
    await expect(canvas.queryByText('Researcher')).not.toBeInTheDocument()
    await expect(canvas.getByText('Sign Out')).toBeInTheDocument()
    await expect(canvas.getByText('Database Connected')).toBeInTheDocument()
    // Recorders get no admin portal link.
    await expect(canvas.queryByText(/Admin Queue/)).not.toBeInTheDocument()
  },
}

export const AdminSignedIn = {
  args: {
    isOnline: true,
    outboxCount: 0,
    activeTab: 'start',
    currentUser: { full_name: 'Carlos Fernandez', username: 'carlost', role: 'admin' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText(/Carlos Fernandez/)).toBeInTheDocument()
    await expect(canvas.queryByText('Researcher')).not.toBeInTheDocument()
    // Admins get the admin portal link.
    await expect(canvas.getByRole('link', { name: /Admin Queue/ })).toBeInTheDocument()
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('Offline Mode')).toBeInTheDocument()
    await expect(canvas.queryByText('Database Connected')).not.toBeInTheDocument()
    // Sync actions are online-only; offline shows neither, despite queued rows.
    await expect(canvas.queryByText(/Sync Database Updates/)).not.toBeInTheDocument()
    await expect(canvas.queryByText(/Sync Outbox/)).not.toBeInTheDocument()
    // The outbox badge still shows the queued count.
    await expect(canvas.getByText('3')).toBeInTheDocument()
  },
}