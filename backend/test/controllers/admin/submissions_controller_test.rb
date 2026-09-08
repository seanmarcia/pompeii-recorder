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
    assert_select "h1", /POMPEII REVIEW PORTAL/
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
end
