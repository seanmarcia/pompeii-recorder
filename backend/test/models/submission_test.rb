require "test_helper"

class SubmissionTest < ActiveSupport::TestCase
  setup do
    Submission.destroy_all
    Feature.destroy_all
  end

  def submit(payload)
    Submission.create!(
      action_type: "create_new",
      target_sheet: payload["SHEET"],
      status: "pending",
      payload: Submission.clean_field_payload(payload)
    )
  end

  test "two people sending parts of the same sheet merge in either approval order" do
    describer = submit(
      "SHEET" => "500", "DESCRIPTION" => "Counter with three dolia.", "SPACE_NUMBER" => "Taberna",
      "PHOTOGRAPHER_ID" => "", "_defaults" => { "REGION" => "VI", "SHEET_DATE" => "2026-10-18" }
    )
    photographer = submit(
      "SHEET" => "500", "PHOTOGRAPHER_ID" => "Sera Baker", "DESCRIPTION" => "", "photos" => ["a.jpg"],
      "_defaults" => { "REGION" => "VI", "SHEET_DATE" => "2026-10-19" }
    )

    photographer.approve!
    describer.reload.approve!

    feat = Feature.find_by(sheet: "500")
    assert_equal "Counter with three dolia.", feat.description
    assert_equal "Taberna", feat.space_number
    assert_equal "Sera Baker", feat.photographer_id
    assert_equal "VI", feat.region
    assert_equal ["a.jpg"], feat.photos
    # Starting values only fill blanks; the first approved one stays.
    assert_equal "2026-10-19", feat.sheet_date.to_s[0, 10]
  end

  test "blank fields from the field app never erase master values" do
    Feature.create!(sheet: "501", description: "Original text", region: "VII")
    sub = submit("SHEET" => "501", "DESCRIPTION" => "", "REGION" => "", "INSULA" => "4")
    sub.approve!

    feat = Feature.find_by(sheet: "501")
    assert_equal "Original text", feat.description
    assert_equal "VII", feat.region
    assert_equal "4", feat.insula
  end

  test "a reviewer can still clear a field on purpose" do
    Feature.create!(sheet: "502", description: "Wrong text")
    sub = submit("SHEET" => "502", "INSULA" => "2")
    sub.apply_reviewer_edits!("DESCRIPTION" => "")
    sub.approve!

    assert_equal "", Feature.find_by(sheet: "502").description.to_s
  end

  test "starting values don't override an existing sheet" do
    Feature.create!(sheet: "503", region: "IX")
    sub = submit("SHEET" => "503", "DESCRIPTION" => "Oven", "_defaults" => { "REGION" => "VI" })

    assert_not sub.field_changed?("REGION")
    sub.approve!
    assert_equal "IX", Feature.find_by(sheet: "503").region
  end

  test "other_pending_for_sheet finds the other people working on a sheet" do
    a = submit("SHEET" => "504", "DESCRIPTION" => "x")
    b = submit("SHEET" => "504", "photos" => ["b.jpg"])
    submit("SHEET" => "505", "DESCRIPTION" => "y")

    assert_equal [b], a.other_pending_for_sheet.to_a
  end
end
