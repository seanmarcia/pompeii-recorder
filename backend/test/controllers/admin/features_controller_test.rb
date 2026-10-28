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

  test "master sheet photo grid renders attached photos whole with metadata dimension hints" do
    @feature.update!(photos: [ "portrait_test.jpg" ])
    @feature.field_photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "portrait_test.jpg", content_type: "image/jpeg"
    )
    @feature.field_photos.first.blob.analyze

    get admin_feature_path(@feature.sheet)

    assert_response :success
    assert_select ".photos-grid .photo-box img" do |imgs|
      assert_equal 1, imgs.size
      assert_equal "309", imgs.first["width"], "width hint must come from blob metadata"
      assert_equal "400", imgs.first["height"], "height hint must come from blob metadata"
    end
    # The grid must fit whole images at their natural aspect ratio: no fixed
    # 4:3 box and no cover crop on the rendered photo. The photo-box CSS is
    # shared admin CSS — it renders with the admin layout on this page.
    styles = response.body.scrub[/\.photo-box\s+img\s*\{[^}]*\}/]
    assert styles, "photo-box img style block missing"
    assert_match(/max-height:\s*240px/, styles)
    assert_no_match(/object-fit:\s*cover/, styles)
    assert_no_match(/aspect-ratio:\s*4\s*\/\s*3/, styles)
  end

  test "the photo grid shows the feature's own photos, not approved submissions' uploads" do
    # An approved submission carries a blob that was never linked to the
    # feature (a pre-backfill row). The master sheet is a view of the master
    # record: the name stays a placeholder until the blob is linked to it.
    @submission.update!(status: "approved")
    @submission.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "iphone.jpg", content_type: "image/jpeg"
    )

    get admin_feature_path(@feature.sheet)

    assert_response :success
    assert_select ".photos-grid .photo-box img", count: 0
    assert_select ".photo-missing", count: 1
  end

  test "master sheets catalog supports search and view links" do
    get admin_features_path, params: { q: "Read-only shrine" }
    assert_response :success
    assert_select "a.room-title[href='#{admin_feature_path(@feature.sheet)}']", text: /Read-only shrine/
  end

  test "viewing a master sheet shows stored values without editable fields or writes" do
    attributes = @feature.attributes
    assert_no_difference [ "Feature.count", "Submission.count" ] do
      get admin_feature_path(@feature.sheet)
    end
    assert_response :success
    assert_select ".readonly-pill", /Read only/
    assert_select "h2", /Read-only shrine/
    assert_select "dd", text: "Religious"
    assert_select "dd", text: "Domestic | Shrine: Niche"
    assert_select "dd", text: "<script>not executable</script>"
    assert_select "script", count: 0
    assert_select "input, textarea, select", count: 0
    assert_select ".photo-caption", /iphone.jpg/
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

  def sheet_numbers
    css_select(".sheet-tag").map { |tag| tag.text.strip }
  end

  test "every search word must match somewhere on the sheet" do
    Feature.create!(sheet: "s-1", space_number: "Taberna", description: "Counter with three dolia", recorder_id: "Sera Baker")
    Feature.create!(sheet: "s-2", space_number: "Kitchen", description: "Hearth and a dolium")
    get admin_features_path, params: { q: "dolia sera" }
    assert_equal [ "s-1" ], sheet_numbers
    get admin_features_path, params: { q: "\"three dolia\"" }
    assert_equal [ "s-1" ], sheet_numbers
    assert_select "mark", text: "three dolia"
  end

  test "an address searches by location" do
    Feature.create!(sheet: "a-1", region: "VI", insula: "17", entrance: "42")
    Feature.create!(sheet: "a-2", region: "VI", insula: "17", entrance: "5")
    Feature.create!(sheet: "a-3", region: "VII", insula: "17", entrance: "42")
    get admin_features_path, params: { q: "VI.17.42" }
    assert_equal [ "a-1" ], sheet_numbers
    get admin_features_path, params: { q: "vi 17" }
    assert_equal [ "a-2", "a-1" ], sheet_numbers
  end

  test "filters narrow results and sorting by location orders regions numerically" do
    Feature.create!(sheet: "f-1", region: "IX", category_id: "Commercial", recorder_id: "Sera Baker")
    Feature.create!(sheet: "f-2", region: "II", category_id: "Commercial", photographer_id: "Sera Baker")
    Feature.create!(sheet: "f-3", region: "V", category_id: "Domestic")
    get admin_features_path, params: { q: "f-", category: "Commercial" }
    assert_equal [ "f-2", "f-1" ], sheet_numbers
    get admin_features_path, params: { q: "f-", person: "Sera Baker" }
    assert_equal [ "f-2", "f-1" ], sheet_numbers
    get admin_features_path, params: { q: "f-" }
    assert_equal [ "f-2", "f-3", "f-1" ], sheet_numbers
  end
end
