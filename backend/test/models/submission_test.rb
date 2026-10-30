require "test_helper"

class SubmissionTest < ActiveSupport::TestCase
  setup do
    Submission.destroy_all
    Feature.destroy_all
  end

  test "two people sending parts of the same sheet merge in either approval order" do
    describer = submit(
      "SHEET" => "500", "DESCRIPTION" => "Counter with three dolia.", "SPACE_NUMBER" => "Taberna",
      "PHOTOGRAPHER_ID" => "", "_defaults" => { "REGION" => "VI", "SHEET_DATE" => "2026-10-18" }
    )
    photographer = submit(
      "SHEET" => "500", "PHOTOGRAPHER_ID" => "Sera Baker", "DESCRIPTION" => "", "photos" => [ "a.jpg" ],
      "_defaults" => { "REGION" => "VI", "SHEET_DATE" => "2026-10-19" }
    )

    photographer.approve!
    describer.reload.approve!

    feat = Feature.find_by(sheet: "500")
    assert_equal "Counter with three dolia.", feat.description
    assert_equal "Taberna", feat.space_number
    assert_equal "Sera Baker", feat.photographer_id
    assert_equal "VI", feat.region
    assert_equal [ "a.jpg" ], feat.photos
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

  test "bibliography references merge into the master record on approval" do
    sub = submit(
      "SHEET" => "506", "DESCRIPTION" => "Oven in the north corner.",
      "BIBLIOGRAPHY" => "Maiuri 1942, p. 123."
    )
    sub.approve!

    feat = Feature.find_by(sheet: "506")
    assert_equal "Maiuri 1942, p. 123.", feat.bibliography
  end

  test "blank bibliography from the field app never erases a master value" do
    Feature.create!(sheet: "507", bibliography: "García y Bellido 1950.", description: "Original text")
    sub = submit("SHEET" => "507", "DESCRIPTION" => "More detail", "BIBLIOGRAPHY" => "")
    sub.approve!

    feat = Feature.find_by(sheet: "507")
    assert_equal "García y Bellido 1950.", feat.bibliography
    assert_equal "More detail", feat.description
  end

  test "a reviewer correction to bibliography persists through approval" do
    sub = submit("SHEET" => "508", "BIBLIOGRAPHY" => "Wrong reference.")
    sub.apply_reviewer_edits!("BIBLIOGRAPHY" => "Della Corte 1958, tab. XII.")
    sub.approve!

    assert_equal "Della Corte 1958, tab. XII.", Feature.find_by(sheet: "508").bibliography
  end

  test "other_pending_for_sheet finds the other people working on a sheet" do
    a = submit("SHEET" => "504", "DESCRIPTION" => "x")
    b = submit("SHEET" => "504", "photos" => [ "b.jpg" ])
    submit("SHEET" => "505", "DESCRIPTION" => "y")

    assert_equal [ b ], a.other_pending_for_sheet.to_a
  end

  test "approving a submission links its photo blob to the master sheet's wrapper" do
    sub = submit("SHEET" => "510", "DESCRIPTION" => "Oven", "photos" => [ "IMG_1.jpg" ])
    sub.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "IMG_1.jpg", content_type: "image/jpeg"
    )
    blob_ids = sub.photos.map(&:blob_id)
    blob_count = ActiveStorage::Blob.count

    sub.approve!

    feat = Feature.find_by(sheet: "510")
    assert_equal [ "IMG_1.jpg" ], feat.photos
    wrapper = feat.feature_photos.find_by!(filename: "IMG_1.jpg")
    assert_equal blob_ids, [ wrapper.file.blob_id ],
                 "the wrapper must reuse the submission's blob, not copy bytes"
    assert_equal blob_count, ActiveStorage::Blob.count, "no new blobs may be created"
    assert_equal blob_ids, sub.reload.photos.map(&:blob_id), "the submission keeps its evidence"
  end

  test "photo names without blobs still merge and approve cleanly" do
    sub = submit("SHEET" => "511", "photos" => [ "paper-era.jpg" ])

    sub.approve!

    feat = Feature.find_by(sheet: "511")
    assert_equal [ "paper-era.jpg" ], feat.photos
    wrapper = feat.feature_photos.find_by!(filename: "paper-era.jpg")
    assert_not wrapper.file.attached?, "names only, nothing to link"
  end

  test "re-approving a submission adds no duplicate photo links" do
    sub = submit("SHEET" => "512", "photos" => [ "IMG_1.jpg" ])
    sub.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "IMG_1.jpg", content_type: "image/jpeg"
    )

    sub.approve!
    sub.approve!

    feat = Feature.find_by(sheet: "512")
    assert_equal [ "IMG_1.jpg" ], feat.photos, "a re-approval must not re-merge the names"
    assert_equal 1, feat.feature_photos.count
    assert_equal 1, feat.feature_photos.sum { |w| w.file.attached? ? 1 : 0 }
    assert_equal 1, ActiveStorage::Blob.count
  end

  test "a second approval of the same filename adds its own tile beside the first" do
    feat = Feature.create!(sheet: "513", photos: [ "IMG_1.jpg" ])
    first = attach_master_photo(feat, "IMG_1.jpg")
    # The bytes must differ: two devices photographing under the same
    # filename. The filename is a label, not identity — the second approval's
    # bytes get their own wrapper row and display alongside the first.
    b = submit("SHEET" => "513", "photos" => [ "IMG_1.jpg" ])
    b.photos.attach(io: StringIO.new("device B photo bytes"), filename: "IMG_1.jpg", content_type: "image/jpeg")

    b.approve!

    feat.reload
    assert_equal [ "IMG_1.jpg", "IMG_1.jpg" ], feat.photos, "the catalog may hold the name twice"
    assert_equal 2, feat.feature_photos.count, "each approval's bytes get their own row"
    wrappers = feat.feature_photos.order(:id).to_a
    assert_equal first.file.blob_id, wrappers[0].file.blob_id, "the first tile keeps its bytes"
    assert_equal b.reload.photos.first.blob_id, wrappers[1].file.blob_id,
                 "the second tile serves the second approval's bytes"
    assert b.photos.attached?, "the submission keeps its evidence"
  end

  test "a byte-identical re-upload under a new filename joins nothing" do
    feat = Feature.create!(sheet: "515", photos: [ "IMG_1.jpg" ])
    attach_master_photo(feat, "IMG_1.jpg")
    sub = submit("SHEET" => "515", "photos" => [ "IMG_1 (1).jpg" ])
    sub.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "IMG_1 (1).jpg", content_type: "image/jpeg"
    )

    sub.approve!

    feat.reload
    assert_equal [ "IMG_1.jpg" ], feat.photos, "the byte duplicate's name joins no entry"
    assert_equal 1, feat.feature_photos.count, "the sheet already serves those bytes"
    assert sub.reload.photos.attached?, "the submission keeps its evidence"
  end

  test "re-uploading the exact same file under the same name joins nothing" do
    feat = Feature.create!(sheet: "526", photos: [ "IMG_1.jpg" ])
    attach_master_photo(feat, "IMG_1.jpg")
    sub = submit("SHEET" => "526", "photos" => [ "IMG_1.jpg" ])
    sub.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "IMG_1.jpg", content_type: "image/jpeg"
    )

    sub.approve!

    feat.reload
    assert_equal [ "IMG_1.jpg" ], feat.photos
    assert_equal 1, feat.feature_photos.count
    assert feat.feature_photos.first.file.attached?, "the original tile keeps its bytes"
  end

  test "two same-name photos in one submission show one card per blob and approve to two rows" do
    feat = Feature.create!(sheet: "522", photos: [ "other.jpg" ])
    sub = submit("SHEET" => "522", "photos" => [ "thumbnail.jpg", "other.jpg" ])
    # The #94 case: two different-byte files, both named thumbnail.jpg, in one
    # POST. Intake uniq'd the payload names, both blobs still attached.
    sub.photos.attach(io: StringIO.new("thumbnail bytes, first device"), filename: "thumbnail.jpg", content_type: "image/jpeg")
    sub.photos.attach(io: StringIO.new("thumbnail bytes, second device"), filename: "thumbnail.jpg", content_type: "image/jpeg")
    blob_ids = sub.reload.photos.map(&:blob_id)

    items = sub.photo_review_items
    thumbnails = items.select { |i| i[:name] == "thumbnail.jpg" }
    assert_equal 2, thumbnails.length, "one card per blob, not one per name"
    assert_equal blob_ids.sort, thumbnails.map { |i| i[:attachment].blob_id }.sort,
                 "each card shows its own bytes"
    # Decision-first order: the two thumbnail cards (decisions) sort above
    # the already-on-sheet other.jpg no-op.
    assert_equal [ "thumbnail.jpg", "thumbnail.jpg", "other.jpg" ], items.map { |i| i[:name] }

    sub.approve!

    feat.reload
    assert_equal [ "other.jpg", "thumbnail.jpg", "thumbnail.jpg" ], feat.photos
    rows = feat.feature_photos.where(filename: "thumbnail.jpg").order(:id).to_a
    assert_equal 2, rows.length, "each blob lands on its own wrapper row"
    assert_equal blob_ids.sort, rows.map { |w| w.file.blob_id }.sort
  end

  test "an edit-flow echo of the sheet's own names adds no duplicate entries" do
    feat = Feature.create!(sheet: "523", photos: [ "IMG_1.jpg" ])
    attach_master_photo(feat, "IMG_1.jpg")
    original_blob_id = feat.feature_photos.first.file.blob_id
    # The edit flow echoes the master's photo list back into the payload; only
    # the newly picked file carries bytes. The echo must not re-add entries.
    sub = submit("SHEET" => "523", "photos" => [ "IMG_1.jpg", "new.jpg" ])
    sub.photos.attach(io: StringIO.new("a new photo"), filename: "new.jpg", content_type: "image/jpeg")

    sub.approve!

    feat.reload
    assert_equal [ "IMG_1.jpg", "new.jpg" ], feat.photos, "the echoed name is not re-added as a second entry"
    echo_wrapper = feat.feature_photos.find_by!(filename: "IMG_1.jpg")
    assert_equal original_blob_id, echo_wrapper.file.blob_id, "the echo never touches the served bytes"
  end

  test "a name-only placeholder gets its bytes when a submission re-sends that name" do
    feat = Feature.create!(sheet: "516", photos: [ "dead-ref.jpg" ])
    sub = submit("SHEET" => "516", "photos" => [ "dead-ref.jpg" ])
    sub.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "dead-ref.jpg", content_type: "image/jpeg"
    )

    sub.approve!

    feat.reload
    assert_equal [ "dead-ref.jpg" ], feat.photos, "the re-sent name fills the placeholder, no second entry"
    assert_equal 1, feat.feature_photos.count, "one row: the placeholder gains the bytes"
    wrapper = feat.feature_photos.sole
    assert wrapper.file.attached?, "the dead reference resolves once the bytes arrive"
    assert_equal sub.reload.photos.first.blob_id, wrapper.file.blob_id
  end

  test "excluding a same-name re-upload declines its row and leaves the sheet untouched" do
    feat = Feature.create!(sheet: "524", photos: [ "IMG_1.jpg" ])
    attach_master_photo(feat, "IMG_1.jpg")
    sub = submit("SHEET" => "524", "photos" => [ "IMG_1.jpg" ])
    sub.photos.attach(io: StringIO.new("device B bytes"), filename: "IMG_1.jpg", content_type: "image/jpeg")

    sub.exclude_photos!([ "IMG_1.jpg" ])
    sub.approve!

    feat.reload
    assert_equal [ "IMG_1.jpg" ], feat.photos
    assert_equal 1, feat.feature_photos.count, "the excluded photo joins no row"
    assert sub.reload.photos.attached?, "the submission keeps its evidence"
  end

  test "a byte-identical re-upload is inert even without an explicit exclusion" do
    feat = Feature.create!(sheet: "525", photos: [ "IMG_1.jpg" ])
    attach_master_photo(feat, "IMG_1.jpg")
    sub = submit("SHEET" => "525", "photos" => [ "IMG_1.jpg", "IMG_1 (1).jpg" ])
    # Identical bytes to the sheet's wrapper (the same fixture file).
    sub.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "IMG_1 (1).jpg", content_type: "image/jpeg"
    )

    sub.approve!

    feat.reload
    assert_equal [ "IMG_1.jpg" ], feat.photos, "the byte duplicate joins nothing: no row, no placeholder entry"
    assert_equal 1, feat.feature_photos.count
    assert sub.reload.photos.attached?, "the submission keeps its evidence"
  end

  test "exclude_photos! drops the names from the payload and approval skips them" do
    sub = submit("SHEET" => "517", "photos" => [ "keep.jpg", "dup.jpg" ])
    [ "keep.jpg", "dup.jpg" ].each do |name|
      sub.photos.attach(
        io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
        filename: name, content_type: "image/jpeg"
      )
    end

    sub.exclude_photos!([ "dup.jpg" ])
    assert_equal [ "keep.jpg" ], sub.reload.payload["photos"]

    sub.approve!

    feat = Feature.find_by(sheet: "517")
    assert_equal [ "keep.jpg" ], feat.photos
    kept = feat.feature_photos.find_by!(filename: "keep.jpg")
    assert kept.file.attached?
    assert_nil feat.feature_photos.find_by(filename: "dup.jpg"), "excluded names join no wrapper"
    assert_equal %w[dup.jpg keep.jpg], sub.reload.photos.map { |a| a.filename.to_s }.sort,
                 "the submission keeps its evidence"
  end

  test "excluding every proposed photo merges nothing" do
    sub = submit("SHEET" => "519", "photos" => [ "dup.jpg" ])
    sub.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "dup.jpg", content_type: "image/jpeg"
    )

    sub.exclude_photos!([ "dup.jpg" ])
    sub.approve!

    feat = Feature.find_by(sheet: "519")
    assert_equal [], feat.photos
    assert feat.reload.feature_photos.empty?
    assert sub.reload.photos.attached?, "the submission keeps its evidence"
  end

  test "a duplicate of another proposed photo is flagged and approval joins only the first" do
    feat = Feature.create!(sheet: "528")
    sub = submit("SHEET" => "528", "photos" => [ "IMG_1.jpg", "IMG_1 (1).jpg" ])
    # The same file attached twice under two names: the copy-suffix pair.
    sub.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "IMG_1.jpg", content_type: "image/jpeg"
    )
    sub.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "IMG_1 (1).jpg", content_type: "image/jpeg"
    )

    items = sub.photo_review_items.index_by { |i| i[:name] }
    assert_not items["IMG_1.jpg"][:dup_of_proposed], "the first copy is the decision"
    assert items["IMG_1 (1).jpg"][:dup_of_proposed], "the second copy is flagged as a duplicate"
    assert_not items["IMG_1 (1).jpg"][:bytes_on_sheet], "the bytes are not on the sheet yet"

    sub.approve!

    feat.reload
    assert_equal [ "IMG_1.jpg" ], feat.photos, "approval joins only the first copy"
    assert_equal 1, feat.feature_photos.count
  end

  test "excluding the first copy promotes its byte-identical sibling" do
    feat = Feature.create!(sheet: "529")
    sub = submit("SHEET" => "529", "photos" => [ "IMG_1.jpg", "IMG_1 (1).jpg" ])
    sub.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "IMG_1.jpg", content_type: "image/jpeg"
    )
    sub.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "IMG_1 (1).jpg", content_type: "image/jpeg"
    )

    sub.exclude_photos!([ "IMG_1.jpg" ])
    sub.approve!

    feat.reload
    assert_equal [ "IMG_1 (1).jpg" ], feat.photos,
                 "with the first copy gone, the sibling's bytes are new to the sheet and join under its name"
    assert_equal 1, feat.feature_photos.count
  end

  test "a placeholder whose re-sent bytes the sheet already serves elsewhere stays empty" do
    feat = Feature.create!(sheet: "527", photos: [ "IMG_9.jpg", "dead-ref.jpg" ])
    attach_master_photo(feat, "IMG_9.jpg")
    sub = submit("SHEET" => "527", "photos" => [ "dead-ref.jpg" ])
    # Identical bytes to what IMG_9.jpg already serves on the sheet.
    sub.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "dead-ref.jpg", content_type: "image/jpeg"
    )

    sub.approve!

    feat.reload
    assert_equal [ "IMG_9.jpg", "dead-ref.jpg" ], feat.photos, "the catalog keeps both names"
    assert feat.feature_photos.find_by!(filename: "IMG_9.jpg").file.attached?
    assert_not feat.feature_photos.find_by!(filename: "dead-ref.jpg").file.attached?,
               "the bytes are already on record under IMG_9.jpg; no second display of them"
    assert sub.reload.photos.attached?, "the submission keeps its evidence"
  end

  test "photo review flags mark filename echoes and byte-identical re-uploads as already on the sheet" do
    feat = Feature.create!(sheet: "518", photos: [ "IMG_1.jpg" ])
    attach_master_photo(feat, "IMG_1.jpg")
    sub = submit("SHEET" => "518", "photos" => [ "IMG_1.jpg", "renamed.jpg", "fresh.jpg" ])
    sub.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "renamed.jpg", content_type: "image/jpeg"
    )

    by_name = sub.photo_review_items.index_by { |item| item[:name] }

    assert by_name["IMG_1.jpg"][:name_on_sheet], "an echoed filename is already on the sheet"
    assert_not by_name["IMG_1.jpg"][:bytes_on_sheet]
    assert by_name["renamed.jpg"][:bytes_on_sheet], "identical bytes under a new name are on the sheet"
    assert_not by_name["renamed.jpg"][:name_on_sheet]
    assert_not by_name["fresh.jpg"][:name_on_sheet]
    assert_not by_name["fresh.jpg"][:bytes_on_sheet]
    # Display order is decision-first: the selectable photo sorts above the
    # already-on-sheet no-ops, name-sorted (digit-aware) within each group.
    assert_equal [ "fresh.jpg", "IMG_1.jpg", "renamed.jpg" ], sub.photo_review_items.map { |i| i[:name] }
  end

  test "photo review order puts decisions above already-on-sheet no-ops" do
    Feature.create!(sheet: "521", photos: [ "aaa_echo.jpg" ])
    sub = submit("SHEET" => "521", "photos" => [ "aaa_echo.jpg", "zzz_new.jpg" ])

    # Pure name order would put the echo first; the decision (zzz_new)
    # must come before the no-op it outranks.
    assert_equal [ "zzz_new.jpg", "aaa_echo.jpg" ], sub.photo_review_items.map { |i| i[:name] }
  end

  test "photo review flags for a new sheet mark nothing as already on the sheet" do
    sub = submit("SHEET" => "520", "photos" => [ "fresh.jpg" ])

    items = sub.photo_review_items

    assert_equal [ "fresh.jpg" ], items.map { |i| i[:name] }
    assert_not items.first[:name_on_sheet]
    assert_not items.first[:bytes_on_sheet]
  end

  test "photo URLs echoed back by the edit form store and merge as filenames" do
    Feature.create!(sheet: "514", photos: [ "IMG_1.jpg" ])
    url = "http://localhost:3000/rails/storage/abc123/9001%20IMG_E0380.jpg"
    sub = submit("SHEET" => "514", "photos" => [ url, "new.jpg" ])

    assert_equal [ "9001 IMG_E0380.jpg", "new.jpg" ], sub.payload["photos"],
                 "a URL echoes only its filename into the stored payload"

    sub.approve!

    feat = Feature.find_by(sheet: "514")
    assert_equal [ "IMG_1.jpg", "9001 IMG_E0380.jpg", "new.jpg" ], feat.photos
    assert feat.photos.none? { |photo| photo.to_s.start_with?("http") },
           "host-specific URLs must never land in photos_data"
  end
end
