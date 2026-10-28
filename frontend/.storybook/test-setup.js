import { beforeEach } from 'vitest'

// Stories in a file share one browser page, so the app's localStorage state
// — the form's autosaved drafts above all — would leak from one story into
// the next (a story that selects a category on a new sheet silently re-serves
// it to every later new-sheet story). Start every story from a clean slate.
beforeEach(() => {
  Object.keys(localStorage)
    .filter((key) => key.startsWith('pompeii_'))
    .forEach((key) => localStorage.removeItem(key))
})