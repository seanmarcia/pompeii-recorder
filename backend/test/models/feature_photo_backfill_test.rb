require "test_helper"

# Backfill links photo blobs of already-approved submissions to the master
# feature of their sheet. Approvals did this automatically only after this
# linkage existed; older approvals need the walk below.
class FeaturePhotoBackfillTest < ActiveSupport::TestCase
  setup do
    Submission.destroy_all
    Feature.destroy_all
  end

  def approved_submission(sheet, names)
    Submission.create!(
      action_type: "create_new",
      target_sheet: sheet,
      status: "approved",
      payload: { "SHEET" => sheet, "photos" => names }
    )
  end

  def attach_photo(record, name)
    record.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: name, content_type: "image/jpeg"
    )
  end

  test "links approved submissions' blobs to their sheet's feature without copying bytes" do
    sub = approved_submission("700", [ "IMG_1.jpg" ])
    attach_photo(sub, "IMG_1.jpg")
    feat = Feature.create!(sheet: "700", photos: [ "IMG_1.jpg" ])
    blob_ids = sub.photos.map(&:blob_id)
    blob_count = ActiveStorage::Blob.count

    result = FeaturePhotoBackfill.run!

    assert_equal 1, result[:attached]
    assert_equal blob_ids, feat.reload.field_photos.map(&:blob_id), "reuses the submission's blobs"
    assert_equal blob_count, ActiveStorage::Blob.count, "attach-only: no new blobs"
    assert_equal blob_ids, sub.reload.photos.map(&:blob_id), "the submission keeps its evidence"
  end

  test "is idempotent: a second run attaches nothing and duplicates nothing" do
    sub = approved_submission("701", [ "IMG_1.jpg" ])
    attach_photo(sub, "IMG_1.jpg")
    Feature.create!(sheet: "701", photos: [ "IMG_1.jpg" ])

    FeaturePhotoBackfill.run!
    result = FeaturePhotoBackfill.run!

    assert_equal 0, result[:attached]
    assert_equal 1, Feature.find_by(sheet: "701").field_photos.count
  end

  test "skips approved submissions whose sheet has no feature, and never creates one" do
    sub = approved_submission("no-such-sheet", [ "IMG_1.jpg" ])
    attach_photo(sub, "IMG_1.jpg")

    result = FeaturePhotoBackfill.run!

    assert_nil Feature.find_by(sheet: "no-such-sheet")
    assert_equal 1, result[:skipped_no_feature]
    assert_equal 0, result[:attached]
    assert sub.reload.photos.attached?, "nothing is detached from the submission"
  end

  test "does not attach blobs whose filename the feature's photo names don't carry" do
    sub = approved_submission("702", [ "IMG_1.jpg" ])
    attach_photo(sub, "IMG_1.jpg")
    attach_photo(sub, "renamed.jpg")
    Feature.create!(sheet: "702", photos: [ "IMG_1.jpg" ])

    result = FeaturePhotoBackfill.run!

    feat = Feature.find_by(sheet: "702")
    assert_equal 1, feat.field_photos.count
    assert_equal [ "IMG_1.jpg" ], feat.field_photos.map { |a| a.filename.to_s }
    assert_equal 1, result[:unmatched_photos]
  end

  test "never touches pending or rejected submissions" do
    pending_sub = Submission.create!(
      action_type: "create_new", target_sheet: "703", status: "pending",
      payload: { "SHEET" => "703", "photos" => [ "IMG_1.jpg" ] }
    )
    attach_photo(pending_sub, "IMG_1.jpg")
    rejected_sub = Submission.create!(
      action_type: "create_new", target_sheet: "703", status: "rejected",
      payload: { "SHEET" => "703", "photos" => [ "IMG_2.jpg" ] }
    )
    attach_photo(rejected_sub, "IMG_2.jpg")
    Feature.create!(sheet: "703", photos: [ "IMG_1.jpg", "IMG_2.jpg" ])

    result = FeaturePhotoBackfill.run!

    assert_equal 0, result[:attached]
    assert Feature.find_by(sheet: "703").field_photos.empty?
  end

  test "links every matching photo when one submission carries two" do
    sub = approved_submission("704", [ "IMG_1.jpg", "IMG_2.jpg" ])
    attach_photo(sub, "IMG_1.jpg")
    attach_photo(sub, "IMG_2.jpg")
    Feature.create!(sheet: "704", photos: [ "IMG_1.jpg", "IMG_2.jpg" ])

    result = FeaturePhotoBackfill.run!

    feat = Feature.find_by(sheet: "704")
    assert_equal 2, feat.field_photos.count
    assert_equal 2, result[:attached]
  end

  test "does not attach a blob whose bytes the feature already carries" do
    sub_a = approved_submission("705", [ "IMG_1.jpg" ])
    attach_photo(sub_a, "IMG_1.jpg")
    sub_b = approved_submission("705", [ "IMG_1.jpg" ])
    attach_photo(sub_b, "IMG_1.jpg")
    Feature.create!(sheet: "705", photos: [ "IMG_1.jpg" ])

    result = FeaturePhotoBackfill.run!

    feat = Feature.find_by(sheet: "705")
    assert_equal 1, feat.field_photos.count, "byte-identical re-uploads must not duplicate the attachment"
    assert_equal 1, result[:attached]
  end

  test "a submission's byte-identical attachments under two names attach once" do
    sub = approved_submission("706", [ "a.jpg", "b.jpg" ])
    attach_photo(sub, "a.jpg")
    attach_photo(sub, "b.jpg")
    Feature.create!(sheet: "706", photos: [ "a.jpg", "b.jpg" ])

    FeaturePhotoBackfill.run!

    assert_equal 1, Feature.find_by(sheet: "706").field_photos.count
  end

  test "a submission's photos link only to its own sheet, never a same-named photo on another sheet" do
    sub = approved_submission("800", [ "IMG_1.jpg" ])
    attach_photo(sub, "IMG_1.jpg")
    own = Feature.create!(sheet: "800", photos: [ "IMG_1.jpg" ])
    other = Feature.create!(sheet: "801", photos: [ "IMG_1.jpg" ]) # same photo name, different sheet

    result = FeaturePhotoBackfill.run!

    assert_equal 1, own.reload.field_photos.count, "the submission's own sheet links its photo"
    assert_equal 0, other.reload.field_photos.count, "another sheet sharing the filename stays untouched"
    assert_equal 1, result[:attached]
  end
end
