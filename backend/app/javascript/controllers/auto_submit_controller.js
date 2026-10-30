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
    this.frame?.addEventListener("click", this.frameClick)
  }

  disconnect() {
    this.frame?.removeEventListener("turbo:before-fetch-request", this.loading)
    this.frame?.removeEventListener("turbo:frame-load", this.loaded)
    this.frame?.removeEventListener("click", this.frameClick)
    clearTimeout(this.timer)
  }

  // Search field keystrokes: debounce, then submit.
  input(event) {
    if (event.target.type !== "search") return
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.submit(), 250)
  }

  // Filter and sort selects: submit right away.
  change(event) {
    if (event.target.tagName !== "SELECT") return
    event.target.classList.toggle("is-set", event.target.value !== "")
    this.submit()
  }

  submit() {
    this.frame?.classList.add("is-loading")
    this.element.requestSubmit()
  }

  loading = () => this.frame?.classList.add("is-loading")

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
