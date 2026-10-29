ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Attach test bytes to the master-sheet wrapper serving `filename`,
    # creating the wrapper when the name has no row yet. Replaces the old
    # `feature.field_photos.attach(...)` pattern across the test suite.
    def attach_master_photo(feature, filename)
      wrapper = feature.feature_photos.find_or_create_by!(filename: filename)
      wrapper.file.attach(
        io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
        filename: filename, content_type: "image/jpeg"
      )
      wrapper
    end

    # A pending field-app submission from the cleaned payload.
    def submit(payload)
      Submission.create!(
        action_type: "create_new",
        target_sheet: payload["SHEET"],
        status: "pending",
        payload: Submission.clean_field_payload(payload)
      )
    end
  end
end
