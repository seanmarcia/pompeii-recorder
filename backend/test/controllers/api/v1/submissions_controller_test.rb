require "test_helper"

class Api::V1::SubmissionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    Submission.destroy_all
    Feature.destroy_all
  end

  test "POST /api/v1/submissions queues a new room submission" do
    post "/api/v1/submissions", params: {
      action_type: "create_new",
      submitter_name: "Dr. Indiana",
      submitter_notes: "Newly uncovered peristyle column base",
      payload: {
        "SHEET" => "9001",
        "REGION" => "V",
        "INSULA" => "3",
        "ENTRANCE" => "4",
        "RESEARCHER_ID" => "Lisa Kahn",
        "SPACE_NUMBER" => "Peristyle garden"
      }
    }, as: :json

    assert_response :created
    json = JSON.parse(response.body)
    assert_equal "queued", json["status"]
    assert_equal "9001", json["target_sheet"]

    sub = Submission.find(json["submission_id"])
    assert_equal "pending", sub.status
    assert_equal "Dr. Indiana", sub.submitter_name
    assert_equal "Peristyle garden", sub.payload["SPACE_NUMBER"]
  end

  test "POST /api/v1/submissions/sync syncs multiple offline submissions" do
    post "/api/v1/submissions/sync", params: {
      submissions: [
        {
          client_id: "local-1",
          action_type: "create_new",
          payload: { "SHEET" => "9100", "RESEARCHER_ID" => "Mary Meier", "SPACE_NUMBER" => "Room A" }
        },
        {
          client_id: "local-2",
          action_type: "update_existing",
          target_sheet: "6083",
          payload: { "SHEET" => "6083", "RESEARCHER_ID" => "Suzanne Stone", "DESCRIPTION" => "Updated description from field" }
        }
      ]
    }, as: :json

    assert_response :success
    json = JSON.parse(response.body)
    assert_equal 2, json["synced_count"]
    assert_equal 2, Submission.count
  end

  test "converted iPhone JPEGs attach to the review submission with their new filename" do
    photo = Rack::Test::UploadedFile.new(
      StringIO.new("\xFF\xD8\xFF\xD9".b), "image/jpeg", original_filename: "iphone.jpg"
    )
    post "/api/v1/submissions", params: {
      payload: { "SHEET" => "heic-converted", "RESEARCHER_ID" => "Lisa Kahn", "photos" => [ "iphone.jpg" ] }.to_json,
      photos: [ photo ]
    }

    assert_response :created
    submission = Submission.find(response.parsed_body["submission_id"])
    assert_equal [ "iphone.jpg" ], submission.payload["photos"]
    assert_equal "iphone.jpg", submission.photos.first.filename.to_s
    assert_equal "image/jpeg", submission.photos.first.content_type
    assert_equal 1, submission.photos.count
  end

  # --- Issue #34: every submission carries a researcher (PR) ---

  test "POST /api/v1/submissions rejects a submission with no researcher anywhere" do
    post "/api/v1/submissions", params: {
      action_type: "create_new",
      payload: { "SHEET" => "9200", "SPACE_NUMBER" => "Orphan room" }
    }, as: :json

    assert_response :unprocessable_entity
    assert_match /Researcher Name is required/, JSON.parse(response.body)["error"]
    assert_equal 0, Submission.count
  end

  test "update_existing without RESEARCHER_ID in the payload inherits the master record's researcher" do
    Feature.create!(sheet: "6083", researcher_id: "Sera Baker")
    post "/api/v1/submissions", params: {
      action_type: "update_existing",
      target_sheet: "6083",
      payload: { "SHEET" => "6083", "DESCRIPTION" => "Rechecked plaster" }
    }, as: :json

    assert_response :created
    assert_equal "Sera Baker", Submission.find(response.parsed_body["submission_id"]).researcher_name
  end

  test "POST /api/v1/submissions/sync rejects the batch when any submission lacks a researcher" do
    post "/api/v1/submissions/sync", params: {
      submissions: [
        {
          client_id: "local-ok",
          action_type: "create_new",
          payload: { "SHEET" => "9300", "RESEARCHER_ID" => "Mary Meier", "SPACE_NUMBER" => "Room A" }
        },
        {
          client_id: "local-orphan",
          action_type: "create_new",
          payload: { "SHEET" => "9301", "SPACE_NUMBER" => "Room B" }
        }
      ]
    }, as: :json

    assert_response :unprocessable_entity
    assert_match /local-orphan/, JSON.parse(response.body)["error"]
    assert_equal 0, Submission.count, "the whole batch rolls back so nothing queues half-synced"
  end

  test "a whitespace-only RESEARCHER_ID counts as missing" do
    # clean_field_payload drops blank strings, so this reaches the guard the
    # same way an omitted field does.
    post "/api/v1/submissions", params: {
      action_type: "create_new",
      payload: { "SHEET" => "9400", "RESEARCHER_ID" => "   " }
    }, as: :json

    assert_response :unprocessable_entity
    assert_match /Researcher Name is required/, JSON.parse(response.body)["error"]
    assert_equal 0, Submission.count
  end

  test "update_existing on a sheet with no master record still requires a researcher" do
    post "/api/v1/submissions", params: {
      action_type: "update_existing",
      target_sheet: "6084",
      payload: { "SHEET" => "6084", "DESCRIPTION" => "No master feature yet" }
    }, as: :json

    assert_response :unprocessable_entity
    assert_equal 0, Submission.count
  end
end
