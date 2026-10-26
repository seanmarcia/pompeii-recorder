import FeatureForm from './FeatureForm.jsx'
import { expect, within, userEvent, waitFor } from 'storybook/test'
import { RECORDER_NAMES } from '../data/people.js'

// Category is restricted to Commercial/Domestic for new entries and any
// change; a legacy stored value stays selectable so an untouched sheet keeps
// it. The Usage Classification select is retired; Late Usage remains.
function categoryOptions(canvasElement) {
  const select = canvasElement.querySelector('select[name="CATEGORY_ID"]')
  expect(select).not.toBeNull()
  return Array.from(select.options).map((option) => option.value)
}

export default {
  title: 'FeatureForm',
  component: FeatureForm,
  args: {
    isOnline: true,
    currentUser: { full_name: RECORDER_NAMES[0], username: 'recorder', role: 'recorder' },
  },
}

export const NewSheetCategoryRestricted = {
  args: {
    actionType: 'create_new',
    initialFeature: null,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // A new sheet offers exactly Select Category, Commercial, Domestic.
    await expect(categoryOptions(canvasElement)).toEqual([
      '',
      'Commercial',
      'Domestic',
    ])
    // The retired Usage Classification select is gone from the form.
    await expect(
      canvasElement.querySelector('select[name="USAGE_ID"]')
    ).toBeNull()
    await expect(canvas.queryByText('Usage Classification')).not.toBeInTheDocument()
    // Late Usage and its select remain a separate field.
    await expect(canvasElement.querySelector('select[name="LATE_USAGE_TYPE"]')).not.toBeNull()
  },
}

export const LegacyCategoryStaysSelectable = {
  args: {
    actionType: 'update_existing',
    initialFeature: {
      SHEET: '6083',
      SHEET_TYPE_ID: 'Feature',
      CATEGORY_ID: 'Religious',
      USAGE_ID: 'Commercial | Bakery: Oven; Enclosed',
    },
  },
  play: async ({ canvasElement }) => {
    // Hydration runs the sync effect in the real browser; wait for the sheet.
    const select = await waitForCategorySelect(canvasElement)
    const options = Array.from(select.options).map((option) => option.value)

    // The legacy value rides along after the restricted choices, preselected.
    await expect(options).toEqual(['', 'Commercial', 'Domestic', 'Religious'])
    await expect(select.value).toBe('Religious')

    // The stored composite USAGE_ID hydrates the Late Usage select.
    const lateUsage = canvasElement.querySelector('select[name="LATE_USAGE_TYPE"]')
    await waitFor(async () => {
      await expect(lateUsage.value).toBe('Bakery')
    })
  },
}

export const CategoryAndLateUsageStayIndependent = {
  args: {
    actionType: 'update_existing',
    initialFeature: {
      SHEET: '6083',
      SHEET_TYPE_ID: 'Feature',
      CATEGORY_ID: 'Religious',
      USAGE_ID: 'Commercial | Bakery: Oven; Enclosed',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const category = await waitForCategorySelect(canvasElement)
    const lateUsage = await waitFor(async () => {
      await expect(
        canvasElement.querySelector('select[name="LATE_USAGE_TYPE"]').value
      ).toBe('Bakery')
      return canvasElement.querySelector('select[name="LATE_USAGE_TYPE"]')
    })

    // Correcting the legacy category does not touch the late usage half.
    await userEvent.selectOptions(category, 'Domestic')
    await expect(category.value).toBe('Domestic')
    await expect(lateUsage.value).toBe('Bakery')

    // Switching late usage to a type with listed attributes reveals the
    // "X Attributes" group; Bakery had none, so the group was absent.
    await expect(
      canvas.queryByText('Bakery Attributes')
    ).not.toBeInTheDocument()
    await userEvent.selectOptions(lateUsage, 'Colonnade (Arcade)')
    await expect(
      canvas.getByText('Colonnade (Arcade) Attributes')
    ).toBeInTheDocument()

    // Checking an attribute chips it into the multiselect trigger — the
    // control that rebuilds USAGE_ID on change. (Assert on the trigger, not
    // getByText: the open panel also renders "Forum" as an option label.)
    const attributeTrigger = canvas.getByRole('button', { name: 'Colonnade (Arcade) attributes' })
    await userEvent.click(attributeTrigger)
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Forum' }))
    await expect(attributeTrigger.textContent).toContain('Forum')
  },
}

async function waitForCategorySelect(canvasElement) {
  for (let i = 0; i < 20; i++) {
    const select = canvasElement.querySelector('select[name="CATEGORY_ID"]')
    if (select && select.options.length > 1) return select
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('CATEGORY_ID select never hydrated')
}