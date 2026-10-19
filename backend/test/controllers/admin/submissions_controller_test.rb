require "test_helper"

class Admin::SubmissionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    Submission.destroy_all
    Feature.destroy_all

    @admin = User.find_by(username: "admin") || User.create!(
      username: "admin",
      email: "admin@pompeii.org",
      password: "pompeii2026",
      role: "admin"
    )

    # Authenticate as admin
    post "/admin/login", params: { login: "admin", password: "pompeii2026" }

    @submission = Submission.create!(
      action_type: "create_new",
      target_sheet: "8888",
      status: "pending",
      submitter_name: "Field Team Alpha",
      payload: {
        "SHEET" => "8888",
        "REGION" => "VII",
        "INSULA" => "1",
        "ENTRANCE" => "2",
        "SPACE_NUMBER" => "Lararium shrine room",
        "DESCRIPTION" => "A small shrine niche with traces of painted serpent fresco."
      }
    )
  end

  test "GET /admin displays pending submissions" do
    get "/admin"
    assert_response :success
    assert_select "h1", /FOOD AND DRINK IN ANCIENT POMPEII/
    assert_select "td", /Lararium shrine room/
  end

  test "GET /admin/submissions/:id shows submission detail" do
    get "/admin/submissions/#{@submission.id}"
    assert_response :success
    assert_select ".detail-title", /Submission ##{@submission.id}/
  end

  test "POST /admin/submissions/:id/approve merges to master Feature and updates status" do
    assert_difference "Feature.count", 1 do
      post "/admin/submissions/#{@submission.id}/approve", params: {
        reviewer_notes: "Approved after archival review"
      }
    end

    assert_redirected_to admin_submission_path(@submission)
    @submission.reload
    assert_equal "approved", @submission.status
    assert_equal "Approved after archival review", @submission.reviewer_notes

    feature = Feature.find_by(sheet: "8888")
    assert_not_nil feature
    assert_equal "Lararium shrine room", feature.space_number
  end

  test "POST /admin/submissions/:id/reject sets status to rejected" do
    post "/admin/submissions/#{@submission.id}/reject", params: {
      reviewer_notes: "Duplicate sheet entry"
    }

    assert_redirected_to admin_submission_path(@submission)
    @submission.reload
    assert_equal "rejected", @submission.status
    assert_equal "Duplicate sheet entry", @submission.reviewer_notes
  end

  test "GET /admin/submissions/:id shows every field as click-to-edit while pending" do
    get "/admin/submissions/#{@submission.id}"
    assert_select "tr[data-field='SPACE_NUMBER'] td.value-cell.editable[data-value='Lararium shrine room']"
    assert_select "tr[data-field='ARTIST_ID'] td.value-cell.editable", /click to add/
  end

  test "PATCH /admin/submissions/:id saves reviewer corrections that are merged on approval" do
    patch "/admin/submissions/#{@submission.id}", params: {
      fields: { "SPACE_NUMBER" => "Lararium", "ARTIST_ID" => "Linda Baxter" }
    }, as: :json
    assert_response :success
    rows = JSON.parse(response.body)["rows"]
    assert_match "Lararium", rows["SPACE_NUMBER"]
    assert_match "Linda Baxter", rows["ARTIST_ID"]
    assert_equal "Lararium", @submission.reload.payload["SPACE_NUMBER"]

    post "/admin/submissions/#{@submission.id}/approve"
    feature = Feature.find_by(sheet: "8888")
    assert_equal "Lararium", feature.space_number
    assert_equal "Linda Baxter", feature.artist_id
  end

  test "PATCH leaves untouched master values alone on an update submission" do
    Feature.create!(sheet: "6083", region: "VI", artist_id: "Inge Otto")
    update = Submission.create!(
      action_type: "update_existing",
      target_sheet: "6083",
      payload: { "SHEET" => "6083", "REGION" => "VI" }
    )

    patch "/admin/submissions/#{update.id}", params: {
      fields: { "SHEET" => "9999", "REGION" => "VII", "ARTIST_ID" => "Inge Otto", "INSULA" => "" }
    }, as: :json
    payload = update.reload.payload
    assert_equal "6083", payload["SHEET"]
    assert_equal "VII", payload["REGION"]
    assert_not payload.key?("ARTIST_ID")
    assert_not payload.key?("INSULA")
  end

  test "PATCH lets the reviewer fill in a field the researcher never touched" do
    Feature.create!(sheet: "6083", region: "VI", artist_id: "Inge Otto")
    update = Submission.create!(
      action_type: "update_existing",
      target_sheet: "6083",
      payload: { "SHEET" => "6083", "REGION" => "VI" }
    )

    patch "/admin/submissions/#{update.id}", params: {
      fields: { "ARTIST_ID" => "Linda Baxter", "BW_ROLL" => "R-12" }
    }, as: :json
    post "/admin/submissions/#{update.id}/approve"

    feature = Feature.find_by(sheet: "6083")
    assert_equal "Linda Baxter", feature.artist_id
    assert_equal "R-12", feature.bw_roll
  end

  test "cannot edit a submission that has already been reviewed" do
    @submission.reject!("Duplicate")
    get "/admin/submissions/#{@submission.id}"
    assert_select "td.value-cell.editable", count: 0

    patch "/admin/submissions/#{@submission.id}", params: { fields: { "REGION" => "I" } }, as: :json
    assert_response :unprocessable_entity
    assert_equal "VII", @submission.reload.payload["REGION"]
  end

  test "flags other pending submissions for the same sheet" do
    other = Submission.create!(
      action_type: "create_new", target_sheet: "8888", status: "pending",
      submitter_name: "Photo Team", payload: { "SHEET" => "8888", "photos" => ["p.jpg"] }
    )

    get "/admin"
    assert_select ".badge-shared", /2 pending for this sheet/

    get "/admin/submissions/#{@submission.id}"
    assert_select ".flash-info", /Another pending submission exists/
    assert_select ".flash-info a[href=?]", "/admin/submissions/#{other.id}"
  end
end
