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

  test "approving a submission links its photo blobs to the master feature" do
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
    assert_equal blob_ids, feat.field_photos.map(&:blob_id),
                 "the feature must reuse the submission's blobs, not copy bytes"
    assert_equal blob_count, ActiveStorage::Blob.count, "no new blobs may be created"
    assert_equal blob_ids, sub.reload.photos.map(&:blob_id), "the submission keeps its evidence"
  end

  test "photo names without blobs still merge and approve cleanly" do
    sub = submit("SHEET" => "511", "photos" => [ "paper-era.jpg" ])

    sub.approve!

    feat = Feature.find_by(sheet: "511")
    assert_equal [ "paper-era.jpg" ], feat.photos
    assert feat.field_photos.empty?, "names only, nothing to link"
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
    assert_equal 1, feat.field_photos.count
    assert_equal 1, ActiveStorage::Blob.count
  end

  test "two approvals carrying different photos with the same filename link both blobs" do
    a = submit("SHEET" => "513", "photos" => [ "IMG_1.jpg" ])
    b = submit("SHEET" => "513", "photos" => [ "IMG_1.jpg" ])
    # The bytes must differ: byte-identical re-uploads are the duplicate this
    # issue collapses (see the checksum test below). Two devices photographing
    # under the same filename produce different bytes and both stay evidence.
    a.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "IMG_1.jpg", content_type: "image/jpeg"
    )
    b.photos.attach(io: StringIO.new("device B photo bytes"), filename: "IMG_1.jpg", content_type: "image/jpeg")

    a.approve!
    b.approve!

    feat = Feature.find_by(sheet: "513")
    assert_equal 2, feat.field_photos.count, "each device's photo stays distinct evidence"
    assert_equal [ "IMG_1.jpg" ], feat.photos, "the name still merges to one entry"
  end

  test "a byte-identical re-upload under a new filename merges the name but never the bytes" do
    feat = Feature.create!(sheet: "515", photos: [ "IMG_1.jpg" ])
    feat.field_photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "IMG_1.jpg", content_type: "image/jpeg"
    )
    sub = submit("SHEET" => "515", "photos" => [ "IMG_1 (1).jpg" ])
    sub.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "IMG_1 (1).jpg", content_type: "image/jpeg"
    )

    sub.approve!

    feat.reload
    assert_equal [ "IMG_1.jpg", "IMG_1 (1).jpg" ], feat.photos, "the name still merges (additive union)"
    assert_equal 1, feat.field_photos.count, "bytes already on the sheet must not attach again"
    assert sub.photos.attached?, "the submission keeps its evidence"
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
    assert_equal [ "keep.jpg" ], feat.field_photos.map { |a| a.filename.to_s }
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
    assert feat.field_photos.empty?
    assert sub.reload.photos.attached?, "the submission keeps its evidence"
  end

  test "photo review flags mark filename echoes and byte-identical re-uploads as already on the sheet" do
    feat = Feature.create!(sheet: "518", photos: [ "IMG_1.jpg" ])
    feat.field_photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "IMG_1.jpg", content_type: "image/jpeg"
    )
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
