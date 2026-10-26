import React from 'react'
import Header from '../components/Header.jsx'

export default {
  title: 'Header',
  component: Header,
}

export const SignedOut = {
  args: {
    isOnline: true,
    outboxCount: 0,
    activeTab: 'start',
    currentUser: null,
  },
}

export const SignedIn = {
  args: {
    isOnline: true,
    outboxCount: 0,
    activeTab: 'start',
    currentUser: { name: 'Sera Baker', role: 'recorder' },
  },
}

export const OfflineWithOutbox = {
  args: {
    isOnline: false,
    outboxCount: 3,
    isSyncing: false,
    activeTab: 'outbox',
    catalogCount: 42,
    currentUser: { name: 'Sera Baker', role: 'recorder' },
  },
}