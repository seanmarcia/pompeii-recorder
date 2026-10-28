import FeatureForm from './FeatureForm.jsx'
import { expect, within, userEvent, waitFor } from 'storybook/test'
import { RECORDER_NAMES } from '../data/people.js'
import * as commercialCategory from '../data/commercial.js'
import * as domesticCategory from '../data/domestic.js'
import * as publicCategory from '../data/public.js'
import * as religionCategory from '../data/religion.js'

function featureTypeOptions(canvasElement) {
  const select = canvasElement.querySelector('select[name="FEATURE_TYPE_ID"]')
  expect(select).not.toBeNull()
  return Array.from(select.options).map((option) => option.value)
}

// Category offers the four 2026 category-sheet choices (Commercial, Domestic,
// Religion, Public) for new entries and any change; a legacy stored value
// stays selectable so an untouched sheet keeps its value. The Usage
// Classification select is retired; Late Usage remains and follows Category.
function categoryOptions(canvasElement) {
  const select = canvasElement.querySelector('select[name="CATEGORY_ID"]')
  expect(select).not.toBeNull()
  return Array.from(select.options).map((option) => option.value)
}

function lateUsageOptions(canvasElement) {
  const select = canvasElement.querySelector('select[name="LATE_USAGE_TYPE"]')
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

// A new sheet opens with no region picked: the recorder chooses the region
// from the master feature's actual location, so the form does not guess.
export const NewSheetRegionDefaultsBlank = {
  args: {
    actionType: 'create_new',
    initialFeature: null,
  },
  play: async ({ canvasElement }) => {
    const select = canvasElement.querySelector('select[name="REGION"]')
    await expect(select).not.toBeNull()
    await expect(select.value).toBe('')
  },
}

export const NewSheetCategoryRestricted = {
  args: {
    actionType: 'create_new',
    initialFeature: null,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // A new sheet offers exactly Select Category plus the four choices.
    await expect(categoryOptions(canvasElement)).toEqual([
      '',
      'Commercial',
      'Domestic',
      'Religion',
      'Public',
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

export const LateUsageOptionsFollowCategory = {
  args: {
    actionType: 'create_new',
    initialFeature: null,
  },
  play: async ({ canvasElement }) => {
    const category = await waitForCategorySelect(canvasElement)

    // A blank category offers no late usage types: pick a Category first.
    await expect(lateUsageOptions(canvasElement)).toEqual([''])

    // Each category swaps in its own 2026 sheet list.
    await userEvent.selectOptions(category, 'Public')
    await expect(lateUsageOptions(canvasElement)).toEqual([
      '',
      ...publicCategory.lateUsageTypes.map((t) => t.name),
    ])

    await userEvent.selectOptions(category, 'Religion')
    await expect(lateUsageOptions(canvasElement)).toEqual([
      '',
      ...religionCategory.lateUsageTypes.map((t) => t.name),
    ])
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

    // The legacy value rides along after the four choices, preselected. It is
    // a distinct string from the new Religion option, not merged with it.
    await expect(options).toEqual([
      '',
      'Commercial',
      'Domestic',
      'Religion',
      'Public',
      'Religious',
    ])
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
    await userEvent.selectOptions(category, 'Commercial')
    await expect(category.value).toBe('Commercial')
    await expect(lateUsage.value).toBe('Bakery')

    // Stored attributes stay visible even though the 2026 sheets list no
    // Bakery attributes: the union pattern keeps them changeable.
    await expect(canvas.getByText('Bakery Attributes')).toBeInTheDocument()

    // Switching late usage to a type with listed attributes reveals the
    // "X Attributes" group.
    await userEvent.selectOptions(lateUsage, 'Agricultural')
    await expect(canvas.getByText('Agricultural Attributes')).toBeInTheDocument()

    // Checking an attribute chips it into the multiselect trigger — the
    // control that rebuilds USAGE_ID on change. (Assert on the trigger, not
    // getByText: the open panel also renders "Orchard" as an option label.)
    const attributeTrigger = canvas.getByRole('button', { name: 'Agricultural attributes' })
    await userEvent.click(attributeTrigger)
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Orchard' }))
    await expect(attributeTrigger.textContent).toContain('Orchard')
  },
}

// The Feature Type select cascades off Category like Late Usage does: blank
// until a category is picked, then the category sheet's own list.
export const FeatureTypesFollowCategory = {
  args: {
    actionType: 'create_new',
    initialFeature: null,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const category = await waitForCategorySelect(canvasElement)

    // A blank category offers no feature types: pick a Category first.
    await expect(featureTypeOptions(canvasElement)).toEqual([''])

    await userEvent.selectOptions(category, 'Domestic')
    await expect(featureTypeOptions(canvasElement)).toEqual([
      '',
      ...domesticCategory.featureTypes.map((t) => t.name),
    ])

    // Picking a type with listed attributes reveals the checkbox group.
    await userEvent.selectOptions(
      canvasElement.querySelector('select[name="FEATURE_TYPE_ID"]'),
      'Counter'
    )
    await expect(canvas.getByText('Counter Attributes')).toBeInTheDocument()
    const attributeTrigger = canvas.getByRole('button', { name: 'Counter attributes' })
    await userEvent.click(attributeTrigger)
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Dolium' }))
    await expect(attributeTrigger.textContent).toContain('Dolium')

    // Switching category keeps the already-picked type selectable (it is the
    // field's current value) even though the Commercial sheet does not list
    // the Domestic-only Sculpture entry picked here.
    await userEvent.selectOptions(
      canvasElement.querySelector('select[name="FEATURE_TYPE_ID"]'),
      'Sculpture, food/drink'
    )
    await userEvent.selectOptions(category, 'Commercial')
    await expect(featureTypeOptions(canvasElement)).toEqual([
      '',
      ...commercialCategory.featureTypes.map((t) => t.name),
      'Sculpture, food/drink',
    ])
  },
}

// The originally-loaded values of Late Usage, Feature Type, and Space Type
// stay selectable for the whole session, even after the user changes the
// selection or the category: an accidental change is undone by re-picking,
// not by reloading (which would only restore the autosaved draft).
export const PinnedOriginalsStaySelectable = {
  args: {
    actionType: 'update_existing',
    initialFeature: {
      SHEET: '60832',
      SHEET_TYPE_ID: 'Feature',
      CATEGORY_ID: 'Domestic',
      USAGE_ID: 'Foofery',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const category = await waitForCategorySelect(canvasElement)
    const lateUsage = await waitFor(async () => {
      const select = canvasElement.querySelector('select[name="LATE_USAGE_TYPE"]')
      await expect(select.value).toBe('Foofery')
      return select
    })

    // The legacy value rides along after the Domestic list, preselected.
    await expect(lateUsageOptions(canvasElement)).toEqual([
      '',
      ...DOMESTIC_LATE_USAGE_NAMES,
      'Foofery',
    ])

    // Changing the selection does not drop the pinned original: after moving
    // to Apartment and correcting the category, Foofery is still offered.
    await userEvent.selectOptions(lateUsage, 'Apartment')
    await userEvent.selectOptions(category, 'Public')
    await expect(lateUsage.value).toBe('Apartment')
    await expect(lateUsageOptions(canvasElement)).toContain('Foofery')

    // And picking it again restores it exactly as stored.
    await userEvent.selectOptions(lateUsage, 'Foofery')
    await expect(lateUsage.value).toBe('Foofery')
    await expect(canvas.queryByText('Foofery Attributes')).not.toBeInTheDocument()
  },
}

const DOMESTIC_LATE_USAGE_NAMES = [
  'Apartment',
  'Farm House',
  'House',
  'House-Shop',
  'Space - Public Eating and Drinking',
  'Villa rustica',
  'Villa Urbana',
  'Other',
]

// Researcher Name is optional. A sheet with no researcher picked
// goes through the submit flow like any other: the browser does not block it,
// the JS handler runs, and the submission lands somewhere durable. In the
// test browser the backend is unreachable, so that somewhere is the offline
// outbox — and its payload carries no researcher at all (a blank researcher
// is a valid submission, not an error).
export const BlankResearcherSubmits = {
  args: {
    actionType: 'create_new',
    initialFeature: null,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const view = canvasElement.ownerDocument.defaultView

    // The label has no required marker and the select is not required.
    await expect(canvas.getByText('Researcher Name')).toBeInTheDocument()
    const researcher = canvasElement.querySelector('select[name="RESEARCHER_ID"]')
    await expect(researcher.required).toBe(false)

    // A new sheet offers exactly the three submission-side researchers.
    await expect(Array.from(researcher.options).map((o) => o.value)).toEqual([
      '',
      'Lisa Kahn',
      'Mary Meier',
      'Suzanne Stone',
    ])

    // Keep the test offline even if a dev server happens to be listening:
    // the outbox path is the deterministic one in a browser test.
    const realFetch = view.fetch
    view.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input.url
      if (url.includes('/up') || url.includes('/api/v1/')) {
        return Promise.reject(new TypeError('Offline for this test'))
      }
      return realFetch(input, init)
    }

    try {
      // Sheet number filled, researcher left at "Select Researcher".
      await userEvent.type(canvas.getByPlaceholderText('e.g. 6083'), '9999')
      await userEvent.click(canvas.getByRole('button', { name: 'Send to Review Queue →' }))

      // The submit ran: the outbox banner with a Record Token appeared.
      await waitFor(async () => {
        await expect(
          canvas.getByText('Saved to Offline Outbox. Will sync when the server is reachable.')
        ).toBeInTheDocument()
        await expect(canvas.getByText(/Record Token: /)).toBeInTheDocument()
      })

      // The stored outbox entry holds the sheet and no researcher value.
      const outbox = JSON.parse(view.localStorage.getItem('pompeii_offline_outbox_v1') || '[]')
      await expect(outbox).toHaveLength(1)
      await expect(outbox[0].targetSheet).toBe('9999')
      await expect(outbox[0].payload.RESEARCHER_ID).toBeUndefined()
    } finally {
      view.fetch = realFetch
    }
  },
}

// An edit on a legacy sheet keeps that sheet's own researcher selectable:
// the form lists the three submission-side researchers plus whatever
// researcher the master record already carries, so the prefill renders
// without the recorder re-picking.
export const LegacyResearcherStaysSelectable = {
  args: {
    actionType: 'update_existing',
    // A sheet number no other story drafts: the form resumes an existing
    // edit_<SHEET> draft before it hydrates initialFeature, and a shared
    // sheet number would leak another story's blank researcher in here.
    initialFeature: {
      SHEET: '60830',
      SHEET_TYPE_ID: 'Feature',
      RESEARCHER_ID: 'Sera Baker',
    },
  },
  play: async ({ canvasElement }) => {
    const researcher = canvasElement.querySelector('select[name="RESEARCHER_ID"]')
    // The edit form hydrates the master values in an effect after mount;
    // wait for the legacy option and the prefill to land.
    await waitFor(async () => {
      await expect(Array.from(researcher.options).map((o) => o.value)).toEqual([
        '',
        'Lisa Kahn',
        'Mary Meier',
        'Suzanne Stone',
        'Sera Baker',
      ])
      await expect(researcher.value).toBe('Sera Baker')
    })
    await expect(researcher.validity.valueMissing).toBe(false)
    await expect(researcher.validity.valid).toBe(true)
  },
}

// An edit on a stored sheet pre-fills Region from the master record instead
// of the new-sheet blank: the blank default only applies to create_new.
export const EditSheetPrefillsRegion = {
  args: {
    actionType: 'update_existing',
    initialFeature: {
      SHEET: '60833',
      SHEET_TYPE_ID: 'Feature',
      REGION: 'IX',
    },
  },
  play: async ({ canvasElement }) => {
    const select = await waitFor(async () => {
      const select = canvasElement.querySelector('select[name="REGION"]')
      await expect(select).not.toBeNull()
      return select
    })
    await expect(select.value).toBe('IX')
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
