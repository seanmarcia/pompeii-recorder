require "test_helper"

class Admin::FeaturesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = User.create!(
      username: "sheet-reviewer", email: "sheet-reviewer@example.org",
      password: "test-password", role: "admin"
    )
    @feature = Feature.create!(
      sheet: "view-8888", space_number: "Read-only shrine", category_id: "Religious",
      usage_id: "Domestic | Shrine: Niche", description: "<script>not executable</script>",
      photos: [ "iphone.jpg" ]
    )
    @submission = Submission.create!(
      action_type: "update_existing", target_sheet: @feature.sheet,
      payload: { "SHEET" => @feature.sheet, "DESCRIPTION" => "Pending correction" }
    )
    post admin_login_path, params: { login: @admin.username, password: "test-password" }
  end

  test "master sheets catalog supports search and view links" do
    get admin_features_path, params: { q: "Read-only shrine" }
    assert_response :success
    assert_select "td", text: "Read-only shrine"
    assert_select "a[href='#{admin_feature_path(@feature.sheet)}']", text: "View Sheet"
  end

  test "viewing a master sheet shows stored values without editable fields or writes" do
    attributes = @feature.attributes
    assert_no_difference [ "Feature.count", "Submission.count" ] do
      get admin_feature_path(@feature.sheet)
    end
    assert_response :success
    assert_select "h2", /Read Only/
    assert_select "dd", text: "Religious"
    assert_select "dd", text: "Domestic | Shrine: Niche"
    assert_select "dd", text: "<script>not executable</script>"
    assert_select "script", count: 0
    assert_select "input, textarea, select", count: 0
    assert_select "li", /iphone.jpg/
    assert_select "a[href='#{admin_submission_path(@submission, mode: "view")}']"
    assert_equal attributes, @feature.reload.attributes
  end

  test "catalog pagination is bounded and invalid page numbers are rejected" do
    51.times { |index| Feature.create!(sheet: "catalog-page-#{index}") }
    get admin_features_path, params: { q: "catalog-page-" }
    assert_select "tbody tr", count: 50
    get admin_features_path, params: { q: "catalog-page-", page: 2 }
    assert_select "tbody tr", count: 1
    get admin_features_path, params: { page: "invalid" }
    assert_response :bad_request
  end

  test "unknown master sheet returns not found" do
    get admin_feature_path("missing-sheet")
    assert_response :not_found
  end

  test "master sheets require admin authentication" do
    delete admin_logout_path
    get admin_features_path
    assert_redirected_to admin_login_path
    get admin_feature_path(@feature.sheet)
    assert_redirected_to admin_login_path
  end
end
