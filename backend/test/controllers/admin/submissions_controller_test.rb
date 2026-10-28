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
    assert_select "th", /Researcher \(PR\)/
  end

  test "attached photos render with metadata dimensions and fit caps, never a crop" do
    @submission.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "portrait_test.jpg", content_type: "image/jpeg"
    )
    @submission.photos.first.blob.analyze

    get "/admin/submissions/#{@submission.id}"

    assert_select ".photo-box img" do |imgs|
      assert_equal 1, imgs.size
      assert_equal "309", imgs.first["width"], "width hint must come from blob metadata"
      assert_equal "400", imgs.first["height"], "height hint must come from blob metadata"
    end
    # The stylesheet must fit whole images instead of cropping: no fixed box
    # height and no cover on the rendered photo.
    styles = response.body.scrub[/\.photo-box\s+img\s*\{[^}]*\}/]
    assert styles, "photo-box img style block missing"
    assert_match(/max-height:\s*240px/, styles)
    assert_no_match(/object-fit:\s*cover/, styles)
  end

  test "attached photos without analysis fall back to assumed 4:3 dimension hints" do
    @submission.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "portrait_test.jpg", content_type: "image/jpeg"
    )
    @submission.photos.first.blob.update!(metadata: nil)

    get "/admin/submissions/#{@submission.id}"

    assert_select ".photo-box img" do |imgs|
      assert_equal 1, imgs.size
      assert_equal "2048", imgs.first["width"], "un-analyzed blobs assume 4:3 width"
      assert_equal "1536", imgs.first["height"], "un-analyzed blobs assume 4:3 height"
    end
  end

  test "GET /admin/submissions/:id shows submission detail" do
    get "/admin/submissions/#{@submission.id}"
    assert_response :success
    assert_select ".detail-title", /Submission ##{@submission.id}/
    assert_select "tr[data-field='CATEGORY_ID'] strong", text: "Category"
    assert_select "tr[data-field='USAGE_ID'] strong", text: "Usage Classification"
    assert_select "div", text: "Your Name / Data Entered By"
  end

  test "category editor offers the same choices as the field app" do
    get "/admin/submissions/#{@submission.id}"

    assert_select "tr[data-field='CATEGORY_ID'] td.value-cell[data-kind='category']" do |cells|
      assert_equal [ "Commercial", "Domestic", "Religion", "Public" ], JSON.parse(cells.first["data-options"])
    end
    assert_select "tr[data-field='USAGE_ID'] td.value-cell[data-kind='text']"
  end

  test "category corrections preserve usage and late usage through approval" do
    usage = "Commercial | Bakery: Oven; Enclosed"
    @submission.update!(payload: @submission.payload.merge("USAGE_ID" => usage))

    [ "Commercial", "Domestic", "Religion", "Public" ].each do |category|
      patch "/admin/submissions/#{@submission.id}", params: {
        fields: { "CATEGORY_ID" => category }
      }, as: :json

      assert_response :success
      assert_equal category, @submission.reload.payload["CATEGORY_ID"]
      assert_equal usage, @submission.payload["USAGE_ID"]
      row = response.parsed_body["rows"]["CATEGORY_ID"]
      assert_match 'data-kind="category"', row
      assert_match "data-options=", row
    end

    post "/admin/submissions/#{@submission.id}/approve"

    assert_redirected_to admin_submission_path(@submission)
    feature = Feature.find_by!(sheet: "8888")
    assert_equal "Public", feature.category_id
    assert_equal usage, feature.usage_id
  end

  test "retired category choices fail as corrections but pass unchanged on legacy rows" do
    # "Cemetary" is a real legacy master value, retired from the 2026 sheets.
    patch "/admin/submissions/#{@submission.id}", params: {
      fields: { "CATEGORY_ID" => "Cemetary" }
    }, as: :json

    assert_response :unprocessable_entity
    assert_match "Category must be one of:", response.parsed_body["error"]

    # A legacy master value left untouched stays valid and approves through.
    Feature.create!(sheet: "6083", category_id: "Cemetary")
    update = Submission.create!(
      action_type: "update_existing",
      target_sheet: "6083",
      payload: { "SHEET" => "6083", "DESCRIPTION" => "Rechecked plaster" }
    )

    patch "/admin/submissions/#{update.id}", params: {
      fields: { "DESCRIPTION" => "Rechecked plaster" }
    }, as: :json

    assert_response :success
    post "/admin/submissions/#{update.id}/approve"
    assert_equal "Cemetary", Feature.find_by!(sheet: "6083").reload.category_id
  end

  test "invalid category corrections fail without saving other field changes" do
    original = @submission.payload
    patch "/admin/submissions/#{@submission.id}", params: {
      fields: { "SPACE_NUMBER" => "Changed room", "CATEGORY_ID" => "Other" }
    }, as: :json

    assert_response :unprocessable_entity
    assert_match "Category must be one of:", response.parsed_body["error"]
    assert_equal original, @submission.reload.payload
  end

  test "category can be cleared like the optional field in the field app" do
    @submission.update!(payload: @submission.payload.merge("CATEGORY_ID" => "Public"))
    patch "/admin/submissions/#{@submission.id}", params: {
      fields: { "CATEGORY_ID" => "" }
    }, as: :json

    assert_response :success
    assert_equal "", @submission.reload.payload["CATEGORY_ID"]
  end

  test "legacy master categories are preserved when the reviewer leaves them unchanged" do
    Feature.create!(sheet: "6083", category_id: "Domestic")
    update = Submission.create!(
      action_type: "update_existing",
      target_sheet: "6083",
      payload: { "SHEET" => "6083" }
    )

    get "/admin/submissions/#{update.id}"
    assert_select "tr[data-field='CATEGORY_ID'] td.value-cell[data-kind='category'][data-value='Domestic']"

    patch "/admin/submissions/#{update.id}", params: {
      fields: { "CATEGORY_ID" => "Domestic" }
    }, as: :json

    assert_response :success
    assert_not update.reload.payload.key?("CATEGORY_ID")
    post "/admin/submissions/#{update.id}/approve"
    assert_equal "Domestic", Feature.find_by!(sheet: "6083").category_id
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

  # Issue #40: the second iteration of the photo-linking loop called .where on
  # the Attached::Many proxy after a prior attach left a pending change —
  # approval aborted and rolled back.
  test "approve links every matching photo when the submission has two" do
    @submission.payload = { "SHEET" => "8888", "photos" => [ "portrait_test.jpg", "second.jpg" ] }
    @submission.save!
    @submission.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "portrait_test.jpg", content_type: "image/jpeg"
    )
    @submission.photos.attach(io: StringIO.new("second photo bytes"), filename: "second.jpg", content_type: "image/jpeg")

    post "/admin/submissions/#{@submission.id}/approve"

    assert_redirected_to admin_submission_path(@submission)
    assert_nil flash[:alert], "approval must not fail: #{flash[:alert]}"
    @submission.reload
    assert_equal "approved", @submission.status

    blob_ids = @submission.photos.map(&:blob_id).sort
    assert_equal 2, blob_ids.size
    assert_equal blob_ids, Feature.find_by!(sheet: "8888").field_photos.map(&:blob_id).sort,
      "both matching photos link to the master feature"
  end

  # Issue #37: two names in one submission carrying the same bytes — the
  # " (1)" copy-suffix re-upload — attach once. One image per name is not the
  # bar here: the bytes are the same photo, so one attachment row.
  test "approve attaches byte-identical blobs under two names once" do
    @submission.payload = { "SHEET" => "8888", "photos" => [ "portrait_test.jpg", "portrait_test (1).jpg" ] }
    @submission.save!
    [ "portrait_test.jpg", "portrait_test (1).jpg" ].each do |name|
      @submission.photos.attach(
        io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
        filename: name, content_type: "image/jpeg"
      )
    end

    post "/admin/submissions/#{@submission.id}/approve"

    assert_nil flash[:alert], "approval must not fail: #{flash[:alert]}"
    feat = Feature.find_by!(sheet: "8888")
    assert_equal [ "portrait_test.jpg", "portrait_test (1).jpg" ], feat.photos, "names still merge"
    assert_equal 1, feat.field_photos.count, "one attachment row for one file's bytes"
  end

  # Issue #37: the reviewer's per-photo selection rides the approve POST.
  # Excluded names leave the payload before the merge, so approve! needs no
  # new parameters, and the submission keeps its own attachments as evidence.
  test "approve with excluded photos drops them from the master and the payload" do
    @submission.payload = { "SHEET" => "8888", "photos" => [ "portrait_test.jpg", "second.jpg" ] }
    @submission.save!
    [ "portrait_test.jpg", "second.jpg" ].each do |name|
      @submission.photos.attach(
        io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
        filename: name, content_type: "image/jpeg"
      )
    end
    portrait_blob_id = @submission.photos.find { |p| p.filename.to_s == "portrait_test.jpg" }.blob_id

    post "/admin/submissions/#{@submission.id}/approve", params: {
      exclude_photos: [ "second.jpg" ].to_json
    }

    assert_redirected_to admin_submission_path(@submission)
    assert_nil flash[:alert], "approval must not fail: #{flash[:alert]}"
    feat = Feature.find_by!(sheet: "8888")
    assert_equal [ "portrait_test.jpg" ], feat.photos
    assert_equal [ portrait_blob_id ], feat.field_photos.map(&:blob_id)
    assert_equal [ "portrait_test.jpg" ], @submission.reload.payload["photos"]
    assert_equal 2, @submission.photos.count, "the submission keeps its evidence"
  end

  test "approve without excluded photos merges everything" do
    @submission.payload = { "SHEET" => "8888", "photos" => [ "portrait_test.jpg", "second.jpg" ] }
    @submission.save!
    @submission.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "portrait_test.jpg", content_type: "image/jpeg"
    )
    @submission.photos.attach(io: StringIO.new("second photo bytes"), filename: "second.jpg", content_type: "image/jpeg")

    post "/admin/submissions/#{@submission.id}/approve"

    assert_redirected_to admin_submission_path(@submission)
    assert_equal [ "portrait_test.jpg", "second.jpg" ], Feature.find_by!(sheet: "8888").photos
  end

  test "review page shows the sheet's photos beside the proposed ones with duplicate flags" do
    feat = Feature.create!(sheet: "8888", photos: [ "portrait_test.jpg", "paper-era.jpg" ])
    feat.field_photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "portrait_test.jpg", content_type: "image/jpeg"
    )
    @submission.payload = { "SHEET" => "8888", "photos" => [ "portrait_test.jpg", "renamed.jpg", "fresh.jpg" ] }
    @submission.save!
    @submission.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "renamed.jpg", content_type: "image/jpeg"
    )

    get "/admin/submissions/#{@submission.id}"

    assert_response :success
    assert_select ".compare-col-head", text: "On the sheet now"
    assert_select ".compare-col-head", text: "Proposed by this submission"
    # The sheet's column renders one box per name through field_photo_for:
    # the linked name shows its image, the text-only name a placeholder.
    assert_select ".compare-sheet .photo-box img", count: 1
    assert_select ".compare-sheet .photo-box .photo-placeholder", count: 1
    # Proposed: three boxes; the filename echo and the byte-identical
    # re-upload are flagged, the fresh name gets an include control.
    assert_select ".compare-proposed .photo-box", count: 3
    assert_select ".photo-flag", text: "already on sheet"
    assert_select ".photo-flag", text: "identical file already on sheet"
    assert_select "input[type=checkbox][data-photo-name='fresh.jpg']"
    assert_select "input[type=checkbox][data-photo-name='portrait_test.jpg']", count: 0
    assert_select "input[type=checkbox][data-photo-name='renamed.jpg']", count: 0
    assert_select "input[name='exclude_photos']"
  end

  test "review page without a master shows proposed photos only, all controllable" do
    @submission.payload = { "SHEET" => "8888", "photos" => [ "fresh.jpg" ] }
    @submission.save!

    get "/admin/submissions/#{@submission.id}"

    assert_select ".compare-col-head", text: "On the sheet now", count: 0
    assert_select ".compare-col-head", text: "Proposed by this submission"
    assert_select "input[type=checkbox][data-photo-name='fresh.jpg']"
  end

  test "read-only review shows the comparison without selection controls" do
    feat = Feature.create!(sheet: "8888", photos: [ "portrait_test.jpg" ])
    feat.field_photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "portrait_test.jpg", content_type: "image/jpeg"
    )
    @submission.payload = { "SHEET" => "8888", "photos" => [ "portrait_test.jpg", "fresh.jpg" ] }
    @submission.save!

    get "/admin/submissions/#{@submission.id}?mode=view"

    assert_select ".compare-col-head", text: "On the sheet now"
    assert_select "input[type=checkbox][data-photo-name]", count: 0
  end

  test "an already-reviewed submission shows the comparison without selection controls" do
    feat = Feature.create!(sheet: "8888", photos: [ "fresh.jpg" ])
    @submission.payload = { "SHEET" => "8888", "photos" => [ "fresh.jpg", "newer.jpg" ] }
    @submission.save!
    @submission.approve!

    get "/admin/submissions/#{@submission.id}"

    assert_select ".compare-col-head", text: "On the sheet now"
    assert_select "input[type=checkbox][data-photo-name]", count: 0
  end

  test "a legacy submission without a photos key shows its attachments display-only, without controls" do
    @submission.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "portrait_test.jpg", content_type: "image/jpeg"
    )

    get "/admin/submissions/#{@submission.id}"

    assert_select ".compare-col-head", text: "Proposed by this submission"
    assert_select ".compare-proposed .photo-box", count: 1
    assert_select "input[type=checkbox][data-photo-name]", count: 0,
      message: "legacy payload photos are display-only: they never merge, so they get no control"
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

  test "view mode shows pending sheet data and submitter without editors or review actions" do
    attributes = @submission.attributes
    assert_no_difference [ "Feature.count", "Submission.count" ] do
      get admin_submission_path(@submission, mode: "view")
    end
    assert_response :success
    assert_select "td.value-cell.editable", count: 0
    assert_select "textarea, input, select", count: 0
    assert_select "form", count: 0
    assert_select "td", /Lararium shrine room/
    assert_select "div", text: "Field Team Alpha"
    assert_select "a[href='#{admin_submission_path(@submission)}']", text: "Review / Edit Submission"
    assert_equal attributes, @submission.reload.attributes
  end

  test "view mode also supports approved and rejected submissions" do
    %w[approved rejected].each do |status|
      @submission.update!(status: status, reviewed_at: Time.current)
      get admin_submission_path(@submission, mode: "view")
      assert_response :success
      assert_select "td.value-cell.editable, form", count: 0
      assert_select ".detail-title .badge", text: status
    end
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
      submitter_name: "Photo Team", payload: { "SHEET" => "8888", "photos" => [ "p.jpg" ] }
    )

    get "/admin"
    assert_select ".badge-shared", /2 pending for this sheet/

    get "/admin/submissions/#{@submission.id}"
    assert_select ".flash-info", /Another pending submission exists/
    assert_select ".flash-info a[href=?]", "/admin/submissions/#{other.id}"
  end

  # --- Issue #6: researcher (PR) column, sheet-cluster sort, search ---

  test "queue replaces data entered by with researcher column showing payload, master fallback, and blank" do
    Feature.create!(sheet: "6083", researcher_id: "Sera Baker")
    Submission.create!(action_type: "create_new", target_sheet: "99901", status: "pending",
      payload: { "SHEET" => "99901", "RESEARCHER_ID" => "Lisa Kahn", "SPACE_NUMBER" => "lisa room" })
    Submission.create!(action_type: "update_existing", target_sheet: "6083", status: "pending",
      payload: { "SHEET" => "6083", "DESCRIPTION" => "Rechecked plaster", "SPACE_NUMBER" => "sera room" })
    Submission.create!(action_type: "create_new", target_sheet: "7777", status: "pending",
      payload: { "SHEET" => "7777", "SPACE_NUMBER" => "blank room" })

    get "/admin"
    assert_response :success
    assert_select "th", /Researcher \(PR\)/
    assert css_select("th").none? { |th| th.text.include?("Data Entered By") }
    assert_select "td.pr-cell .cell-title", text: "Lisa Kahn"
    assert_select "td.pr-cell .cell-title", text: "Sera Baker"
    blank_pr_cells = css_select("td.pr-cell .cell-title").count { |cell| cell.text.strip == "—" }
    assert_equal 2, blank_pr_cells, "expected two rows with no researcher anywhere (7777 and the 8888 baseline)"
  end

  test "queue defaults to sheet number descending with newest first inside each sheet cluster" do
    now = Time.current
    # The pair below sits inside the SAME second (X.1 and X.9): the seed
    # data's collision trio is created within one second, so whole-second
    # keys cannot order a sheet cluster correctly.
    second = Time.zone.at(Time.current.to_i + 0.9)
    older = Submission.create!(action_type: "create_new", target_sheet: "99901", status: "pending",
      created_at: second - 0.8, payload: { "SHEET" => "99901" })
    newer = Submission.create!(action_type: "create_new", target_sheet: "99901", status: "pending",
      created_at: second, payload: { "SHEET" => "99901" })
    Submission.create!(action_type: "create_new", target_sheet: "6083", status: "pending",
      created_at: now - 1.hour, payload: { "SHEET" => "6083" })
    Submission.create!(action_type: "create_new", target_sheet: "1002", status: "pending",
      created_at: now, payload: { "SHEET" => "1002" })
    Submission.create!(action_type: "create_new", target_sheet: "500", status: "pending",
      created_at: now, payload: { "SHEET" => "500" })
    Submission.create!(action_type: "create_new", target_sheet: "300", status: "approved",
      reviewed_at: now - 1.minute, payload: { "SHEET" => "300", "SPACE_NUMBER" => "approved high sheet" })
    Submission.create!(action_type: "create_new", target_sheet: "200", status: "approved",
      reviewed_at: now, payload: { "SHEET" => "200", "SPACE_NUMBER" => "approved low sheet" })

    get "/admin"
    body = response.body
    assert body.index("Sheet 99901") < body.index("Sheet 6083"), "99901 cluster should come before 6083"
    assert body.index("Sheet 6083") < body.index("Sheet 1002"), "6083 should come before 1002"
    assert body.index("Sheet 1002") < body.index("Sheet 500"), "sheet order should be numeric, not lexicographic"
    assert body.index("##{newer.id}</span>") < body.index("##{older.id}</span>"), "newest first inside a sheet cluster"

    get "/admin?status=approved"
    body = response.body
    assert body.index("approved high sheet") < body.index("approved low sheet"),
      "approved tab should cluster by sheet number, not reviewed_at"
  end

  test "sheet header link sorts numerically ascending with newest first inside clusters" do
    now = Time.current
    older = Submission.create!(action_type: "create_new", target_sheet: "99901", status: "pending",
      created_at: now - 2.hours, payload: { "SHEET" => "99901" })
    newer = Submission.create!(action_type: "create_new", target_sheet: "99901", status: "pending",
      created_at: now, payload: { "SHEET" => "99901" })
    Submission.create!(action_type: "create_new", target_sheet: "500", status: "pending",
      created_at: now, payload: { "SHEET" => "500" })
    Submission.create!(action_type: "create_new", target_sheet: "1002", status: "pending",
      created_at: now, payload: { "SHEET" => "1002" })
    Submission.create!(action_type: "create_new", status: "pending",
      payload: { "SPACE_NUMBER" => "no sheet row" })

    get "/admin?sort=sheet&dir=asc"
    body = response.body
    assert body.index("Sheet 500") < body.index("Sheet 1002"), "numeric ascending: 500 before 1002"
    assert body.index("Sheet 1002") < body.index("Sheet 99901")
    assert body.index("##{newer.id}</span>") < body.index("##{older.id}</span>"), "newest first inside a cluster even ascending"
    assert body.index("no sheet row") > body.index("Sheet 99901"), "rows without a sheet number sort last"
  end

  test "researcher header sorts alphabetically with blanks first ascending and last descending" do
    now = Time.current
    Feature.create!(sheet: "6083", researcher_id: "Sera Baker")
    Submission.create!(action_type: "create_new", target_sheet: "1111", status: "pending",
      payload: { "SHEET" => "1111", "RESEARCHER_ID" => "Zoe Adams", "SPACE_NUMBER" => "zoe room" })
    Submission.create!(action_type: "create_new", target_sheet: "3333", status: "pending",
      created_at: now - 5.hours,
      payload: { "SHEET" => "3333", "RESEARCHER_ID" => "Zoe Adams", "SPACE_NUMBER" => "zoe older room" })
    Submission.create!(action_type: "create_new", target_sheet: "2222", status: "pending",
      payload: { "SHEET" => "2222", "RESEARCHER_ID" => "Anna Bell", "SPACE_NUMBER" => "anna room" })
    Submission.create!(action_type: "update_existing", target_sheet: "6083", status: "pending",
      payload: { "SHEET" => "6083", "SPACE_NUMBER" => "sera room" })
    Submission.create!(action_type: "create_new", target_sheet: "7777", status: "pending",
      payload: { "SHEET" => "7777", "SPACE_NUMBER" => "blank room" })

    get "/admin?sort=researcher&dir=asc"
    body = response.body
    assert body.index("blank room") < body.index("anna room"), "blank researcher surfaces first ascending"
    assert body.index("anna room") < body.index("sera room")
    assert body.index("sera room") < body.index("zoe room")
    assert body.index("zoe room") < body.index("zoe older room"), "same researcher stays newest first ascending"

    get "/admin?sort=researcher&dir=desc"
    body = response.body
    assert body.index("zoe room") < body.index("sera room")
    assert body.index("sera room") < body.index("anna room")
    assert body.index("zoe room") < body.index("zoe older room"), "same researcher stays newest first descending"
    assert body.index("anna room") < body.index("blank room"), "blank researcher sinks last descending"
  end

  test "submitted header sorts by creation time in both directions" do
    now = Time.current
    Submission.create!(action_type: "create_new", target_sheet: "1111", status: "pending",
      created_at: now - 3.hours, payload: { "SHEET" => "1111", "SPACE_NUMBER" => "oldest room" })
    Submission.create!(action_type: "create_new", target_sheet: "2222", status: "pending",
      created_at: now - 2.hours, payload: { "SHEET" => "2222", "SPACE_NUMBER" => "middle room" })
    Submission.create!(action_type: "create_new", target_sheet: "3333", status: "pending",
      created_at: now, payload: { "SHEET" => "3333", "SPACE_NUMBER" => "newest room" })

    get "/admin?sort=submitted&dir=asc"
    body = response.body
    assert body.index("oldest room") < body.index("middle room")
    assert body.index("middle room") < body.index("newest room")

    get "/admin?sort=submitted&dir=desc"
    assert response.body.index("newest room") < response.body.index("oldest room")
  end

  test "sort and tab links preserve the active status tab and search term" do
    Submission.create!(action_type: "create_new", target_sheet: "6083", status: "approved",
      reviewed_at: Time.current, payload: { "SHEET" => "6083" })

    get "/admin?status=approved&q=608&sort=sheet&dir=asc"

    assert_select "a[href=?]", "/admin?dir=desc&q=608&sort=sheet&status=approved"
    assert_select "a[href=?]", "/admin?dir=asc&q=608&sort=researcher&status=approved"
    assert_select "a[href=?]", "/admin?dir=desc&q=608&sort=submitted&status=approved"
    assert_select ".tabs-nav a[href=?]", "/admin?dir=asc&q=608&sort=sheet&status=approved"
    assert_select "input[name='status'][value='approved']", count: 1
    assert_select "input[name='sort'][value='sheet']", count: 1

    # Default state: first click on Sheet flips to asc, other headers start
    # at their natural direction.
    get "/admin"
    assert_select "a[href=?]", "/admin?dir=asc&sort=sheet&status=pending"
    assert_select "a[href=?]", "/admin?dir=asc&sort=researcher&status=pending"
    assert_select "a[href=?]", "/admin?dir=desc&sort=submitted&status=pending"

    # Clear drops the query but keeps the tab and sort.
    get "/admin?q=608"
    assert_select "a[href=?]", "/admin?dir=desc&sort=sheet&status=pending"
  end

  test "search matches partial sheet numbers" do
    Submission.create!(action_type: "create_new", target_sheet: "6083", status: "pending",
      payload: { "SHEET" => "6083", "SPACE_NUMBER" => "sixty room" })
    Submission.create!(action_type: "create_new", target_sheet: "6083", status: "pending",
      payload: { "SHEET" => "6083", "SPACE_NUMBER" => "sixty other room" })
    Submission.create!(action_type: "create_new", target_sheet: "99901", status: "pending",
      payload: { "SHEET" => "99901", "SPACE_NUMBER" => "ninety room" })
    Submission.create!(action_type: "create_new", target_sheet: "1002", status: "pending",
      payload: { "SHEET" => "1002", "SPACE_NUMBER" => "ten room" })

    get "/admin?q=608"
    body = response.body
    assert_match "sixty room", body
    assert_match "sixty other room", body
    assert_no_match /ninety room/, body
    assert_no_match /ten room/, body
  end

  test "search matches researcher names case-insensitively including master fallback" do
    Feature.create!(sheet: "6083", researcher_id: "Sera Baker")
    Submission.create!(action_type: "create_new", target_sheet: "99901", status: "pending",
      payload: { "SHEET" => "99901", "RESEARCHER_ID" => "Lisa Kahn", "SPACE_NUMBER" => "lisa room" })
    Submission.create!(action_type: "update_existing", target_sheet: "6083", status: "pending",
      payload: { "SHEET" => "6083", "SPACE_NUMBER" => "sera room" })

    get "/admin?q=LISA"
    assert_match "lisa room", response.body
    assert_no_match /sera room/, response.body

    get "/admin?q=sera"
    assert_match "sera room", response.body
    assert_no_match /lisa room/, response.body
  end

  test "search with no matches shows an empty state naming the term" do
    get "/admin?q=zzz"
    assert_response :success
    assert_select "table.submissions-table", count: 0
    assert_select "h3", /zzz/
  end

  test "search composes with the status tabs" do
    Submission.create!(action_type: "create_new", target_sheet: "6083", status: "approved",
      reviewed_at: Time.current, payload: { "SHEET" => "6083", "SPACE_NUMBER" => "approved sixty" })
    Submission.create!(action_type: "create_new", target_sheet: "6083", status: "pending",
      payload: { "SHEET" => "6083", "SPACE_NUMBER" => "pending sixty" })
    Submission.create!(action_type: "create_new", target_sheet: "500", status: "approved",
      reviewed_at: Time.current, payload: { "SHEET" => "500", "SPACE_NUMBER" => "approved five" })

    get "/admin?status=approved&q=608"
    body = response.body
    assert_match "approved sixty", body
    assert_no_match /pending sixty/, body
    assert_no_match /approved five/, body
  end
end
