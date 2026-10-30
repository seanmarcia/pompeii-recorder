import { Controller } from "@hotwired/stimulus"

// Keeps the catalog search live as you type (issue #78): submits the form
// into its Turbo Frame — debounced while typing, immediate on a filter
// change. Turbo owns the fetch and the frame swap; this controller only
// decides when to submit and runs the loading state.
export default class extends Controller {
  connect() {
    this.frame = document.getElementById(this.element.dataset.turboFrame)
    this.timer = null
    this.pagerClicked = false
    this.frame?.addEventListener("turbo:before-fetch-request", this.loading)
    this.frame?.addEventListener("turbo:frame-load", this.loaded)
    this.frame?.addEventListener("turbo:fetch-request-error", this.loadFailed)
    this.frame?.addEventListener("click", this.frameClick)
    this.element.addEventListener("submit", this.cancelDebounce)
  }

  disconnect() {
    this.frame?.removeEventListener("turbo:before-fetch-request", this.loading)
    this.frame?.removeEventListener("turbo:frame-load", this.loaded)
    this.frame?.removeEventListener("turbo:fetch-request-error", this.loadFailed)
    this.frame?.removeEventListener("click", this.frameClick)
    this.element.removeEventListener("submit", this.cancelDebounce)
    clearTimeout(this.timer)
  }

  // Search field keystrokes: debounce, then submit.
  input(event) {
    if (event.target.type !== "search") return
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.submit(), 250)
  }

  // Filter and sort selects: submit right away. Only the filter selects
  // carry the is-set highlight, like the old script.
  change(event) {
    if (event.target.tagName !== "SELECT") return
    if (event.target.name !== "sort") event.target.classList.toggle("is-set", event.target.value !== "")
    this.submit()
  }

  // An explicit submit (button or Enter) supersedes a pending debounce.
  cancelDebounce() {
    clearTimeout(this.timer)
  }

  submit() {
    this.frame?.classList.add("is-loading")
    this.element.requestSubmit()
  }

  loading = () => this.frame?.classList.add("is-loading")

  loadFailed = () => this.frame?.classList.remove("is-loading")

  // A pager link inside the frame: after the swap, bring the form back
  // into view like the old script did.
  frameClick = (event) => {
    if (event.target.closest(".pager a")) this.pagerClicked = true
  }

  loaded = () => {
    this.frame?.classList.remove("is-loading")
    if (this.pagerClicked) {
      this.pagerClicked = false
      this.element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }
}
