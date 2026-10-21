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
          payload: { "SHEET" => "9100", "SPACE_NUMBER" => "Room A" }
        },
        {
          client_id: "local-2",
          action_type: "update_existing",
          target_sheet: "6083",
          payload: { "SHEET" => "6083", "DESCRIPTION" => "Updated description from field" }
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
      payload: { "SHEET" => "heic-converted", "photos" => [ "iphone.jpg" ] }.to_json,
      photos: [ photo ]
    }

    assert_response :created
    submission = Submission.find(response.parsed_body["submission_id"])
    assert_equal [ "iphone.jpg" ], submission.payload["photos"]
    assert_equal "iphone.jpg", submission.photos.first.filename.to_s
    assert_equal "image/jpeg", submission.photos.first.content_type
    assert_equal 1, submission.photos.count
  end
end
