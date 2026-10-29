require "test_helper"

# The wrapper backfill converges a database written by the pre-wrapper code:
# one FeaturePhoto row per photos_data name, bytes re-homed from the old
# Feature attachment rows (record_type "Feature", name "field_photos"), and
# — the job of the superseded submission-linking backfill — approved
# submissions' blobs linked to wrappers that still lack bytes. Attach-only:
# it reuses blobs, never purges, never creates Feature rows. Safe to re-run.
class FeaturePhotoBackfillTest < ActiveSupport::TestCase
  setup do
    Submission.destroy_all
    Feature.destroy_all
  end

  def raw_attach(feature, bytes, filename)
    blob = ActiveStorage::Blob.create_and_upload!(
      io: StringIO.new(bytes), filename: filename, content_type: "image/jpeg"
    )
    ActiveStorage::Attachment.create!(record: feature, blob: blob, name: "field_photos")
  end

  def approved_submission(sheet, names)
    Submission.create!(
      action_type: "create_new",
      target_sheet: sheet,
      status: "approved",
      payload: { "SHEET" => sheet, "photos" => names }
    )
  end

  def attach_submission_photo(record, name, bytes: nil)
    record.photos.attach(
      io: StringIO.new(bytes || "submission bytes for #{name}"),
      filename: name, content_type: "image/jpeg"
    )
  end

  test "creates one wrapper per photos_data name, file-less for name-only sheets" do
    feat = Feature.create!(sheet: "700", photos: [ "IMG_1.jpg" ])

    FeaturePhotoBackfill.run!

    wrappers = feat.reload.feature_photos
    assert_equal [ "IMG_1.jpg" ], wrappers.map(&:filename)
    assert_not wrappers.first.file.attached?, "no old rows to re-home: the name keeps its placeholder"
  end

  test "re-homes bytes from old-style attachment rows without copying blobs" do
    feat = Feature.create!(sheet: "701", photos: [ "IMG_1.jpg" ])
    raw_attach(feat, "old attachment bytes", "IMG_1.jpg")
    blob_ids = ActiveStorage::Attachment.where(record_type: "Feature", record_id: feat.id).pluck(:blob_id)

    FeaturePhotoBackfill.run!

    wrapper = feat.reload.feature_photos.find_by!(filename: "IMG_1.jpg")
    assert_equal blob_ids, [ wrapper.file.blob_id ], "the wrapper serves the blob the old display resolved to"
    assert ActiveStorage::Blob.exists?(blob_ids.first), "blob reuse, never a purge or a copy"
  end

  test "a duplicate-filename pair re-homes the first match only, and deletes the old rows" do
    feat = Feature.create!(sheet: "702", photos: [ "dup.jpg", "solo.jpg" ])
    raw_attach(feat, "first bytes", "dup.jpg")
    raw_attach(feat, "second bytes", "dup.jpg")

    FeaturePhotoBackfill.run!

    wrapper = feat.reload.feature_photos.find_by!(filename: "dup.jpg")
    first_blob = ActiveStorage::Blob.order(:id).find_by!(filename: "dup.jpg")
    assert_equal first_blob.id, wrapper.file.blob_id,
                 "the display showed the first match; the wrapper keeps exactly that blob"
    assert ActiveStorage::Blob.exists?(first_blob.id + 1), "the second blob's row is never purged"
    assert_equal 2, feat.feature_photos.count, "one wrapper per catalog name (dup.jpg, solo.jpg)"
    assert_equal 0, ActiveStorage::Attachment.where(record_type: "Feature", name: "field_photos").count,
                 "the superseded plumbing rows are gone"
    solo = feat.feature_photos.find_by!(filename: "solo.jpg")
    assert_not solo.file.attached?
  end

  test "links approved submissions' blobs to wrappers that lack bytes" do
    sub = approved_submission("703", [ "IMG_1.jpg" ])
    attach_submission_photo(sub, "IMG_1.jpg")
    feat = Feature.create!(sheet: "703", photos: [ "IMG_1.jpg" ])
    blob_id = sub.reload.photos.first.blob_id

    FeaturePhotoBackfill.run!

    wrapper = feat.reload.feature_photos.find_by!(filename: "IMG_1.jpg")
    assert_equal blob_id, wrapper.file.blob_id, "the wrapper serves the submission's blob"
    assert sub.reload.photos.attached?, "the submission keeps its evidence"
  end

  test "does not link blobs whose filename no wrapper carries" do
    sub = approved_submission("704", [ "IMG_1.jpg", "renamed.jpg" ])
    attach_submission_photo(sub, "IMG_1.jpg")
    attach_submission_photo(sub, "renamed.jpg")
    Feature.create!(sheet: "704", photos: [ "IMG_1.jpg" ])

    FeaturePhotoBackfill.run!

    wrappers = Feature.find_by!(sheet: "704").feature_photos
    assert_equal [ "IMG_1.jpg" ], wrappers.select { |wrapper| wrapper.file.attached? }.map(&:filename)
    assert_equal 2, sub.reload.photos.count, "nothing is detached from the submission"
  end

  test "never touches pending or rejected submissions" do
    pending_sub = Submission.create!(
      action_type: "create_new", target_sheet: "705", status: "pending",
      payload: { "SHEET" => "705", "photos" => [ "IMG_1.jpg" ] }
    )
    attach_submission_photo(pending_sub, "IMG_1.jpg")
    rejected_sub = Submission.create!(
      action_type: "create_new", target_sheet: "705", status: "rejected",
      payload: { "SHEET" => "705", "photos" => [ "IMG_2.jpg" ] }
    )
    attach_submission_photo(rejected_sub, "IMG_2.jpg")
    Feature.create!(sheet: "705", photos: [ "IMG_1.jpg", "IMG_2.jpg" ])

    FeaturePhotoBackfill.run!

    assert Feature.find_by!(sheet: "705").feature_photos.all? { |w| !w.file.attached? }
  end

  test "a byte-identical re-upload under a new name leaves that wrapper file-less" do
    feat = Feature.create!(sheet: "706", photos: [ "a.jpg", "b.jpg" ])
    raw_attach(feat, "shared bytes", "a.jpg")

    FeaturePhotoBackfill.run!

    wrappers = feat.reload.feature_photos.index_by(&:filename)
    assert wrappers["a.jpg"].file.attached?
    assert_not wrappers["b.jpg"].file.attached?, "one image per name is the bar: identical bytes never link twice"
  end

  test "links a submission's bytes only to its own sheet, never a same-named photo on another sheet" do
    sub = approved_submission("800", [ "IMG_1.jpg" ])
    attach_submission_photo(sub, "IMG_1.jpg")
    own = Feature.create!(sheet: "800", photos: [ "IMG_1.jpg" ])
    other = Feature.create!(sheet: "801", photos: [ "IMG_1.jpg" ]) # same photo name, different sheet

    FeaturePhotoBackfill.run!

    assert own.reload.feature_photos.find_by!(filename: "IMG_1.jpg").file.attached?,
           "the submission's own sheet links its photo"
    assert_not other.reload.feature_photos.find_by!(filename: "IMG_1.jpg").file.attached?,
               "another sheet sharing the filename stays untouched"
  end

  test "is idempotent: a second run changes nothing" do
    sub = approved_submission("802", [ "IMG_1.jpg" ])
    attach_submission_photo(sub, "IMG_1.jpg")
    feat = Feature.create!(sheet: "802", photos: [ "IMG_1.jpg" ])
    raw_attach(feat, "old attachment bytes", "IMG_1.jpg")

    FeaturePhotoBackfill.run!
    first_state = feat.reload.feature_photos.order(:filename).map { |w| [ w.filename, w.file.blob_id ] }
    blob_count = ActiveStorage::Blob.count
    attachment_count = ActiveStorage::Attachment.count

    result = FeaturePhotoBackfill.run!

    assert_equal({ wrappers_created: 0, bytes_rehomed: 0, submission_links: 0, old_rows_deleted: 0 },
                 result.slice(:wrappers_created, :bytes_rehomed, :submission_links, :old_rows_deleted),
                 "the second run must be a no-op")
    assert_equal first_state, feat.reload.feature_photos.order(:filename).map { |w| [ w.filename, w.file.blob_id ] }
    assert_equal blob_count, ActiveStorage::Blob.count
    assert_equal attachment_count, ActiveStorage::Attachment.count
  end

  test "an approved submission whose sheet has no feature is simply never reached" do
    sub = approved_submission("no-such-sheet", [ "IMG_1.jpg" ])
    attach_submission_photo(sub, "IMG_1.jpg")

    result = FeaturePhotoBackfill.run!

    assert_nil Feature.find_by(sheet: "no-such-sheet"), "never creates Feature rows"
    assert sub.reload.photos.attached?
    assert_equal 0, result[:wrappers_created]
  end
end
