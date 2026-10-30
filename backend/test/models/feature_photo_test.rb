require "test_helper"

# The per-photo wrapper on the master record. The wrapper is the
# ActiveStorage record type: each FeaturePhoto owns exactly one attachment
# (`file`) and carries the photo's filename as a plain label.
class FeaturePhotoTest < ActiveSupport::TestCase
  setup do
    Submission.destroy_all
    Feature.destroy_all
  end

  test "belongs to a feature and requires a filename" do
    feat = Feature.create!(sheet: "610", photos: [ "IMG_1.jpg" ])

    wrapper = feat.feature_photos.find_by!(filename: "IMG_1.jpg")

    assert_equal feat.id, wrapper.feature_id
    wrapper.filename = nil
    assert_not wrapper.valid?, "the filename label is required"
    wrapper.filename = "IMG_1.jpg"
    wrapper.feature = nil
    assert_not wrapper.valid?, "the wrapper hangs off its sheet"
  end

  test "file carries the upload's bytes and keeps the wrapper's filename label" do
    feat = Feature.create!(sheet: "611", photos: [ "IMG_1.jpg" ])

    wrapper = attach_master_photo(feat, "IMG_1.jpg")

    assert wrapper.file.attached?
    assert_equal "IMG_1.jpg", wrapper.file.filename.to_s
  end

  test "destroying a wrapper destroys the attachment row but never the shared blob" do
    feat = Feature.create!(sheet: "612", photos: [ "IMG_1.jpg" ])
    wrapper = attach_master_photo(feat, "IMG_1.jpg")
    sub = Submission.create!(
      action_type: "create_new", target_sheet: "612", status: "approved",
      payload: { "SHEET" => "612", "photos" => [ "IMG_1.jpg" ] }
    )
    sub.photos.attach(io: StringIO.new("evidence bytes"), filename: "IMG_1.jpg", content_type: "image/jpeg")
    blob_id = wrapper.file.blob_id
    attachment_id = wrapper.file_attachment.id
    blob_count = ActiveStorage::Blob.count

    wrapper.destroy!

    assert_not ActiveStorage::Attachment.exists?(attachment_id), "the wrapper's attachment row dies with it"
    assert_equal blob_count, ActiveStorage::Blob.count, "the blob is shared evidence, never purged sideways"
    assert ActiveStorage::Blob.exists?(blob_id)
    assert sub.reload.photos.attached?, "the submission keeps its own attachment"
  end

  test "photos are visible by default, and visible/hidden split the rows" do
    feat = Feature.create!(sheet: "614", photos: [ "IMG_1.jpg", "IMG_2.jpg" ])
    feat.feature_photos.find_by!(filename: "IMG_1.jpg")
        .update!(hidden: true, hidden_at: Time.current)

    assert_not feat.feature_photos.find_by!(filename: "IMG_2.jpg").hidden?,
               "newly synced wrappers are visible: hiding is an explicit admin act"
    assert_equal [ "IMG_2.jpg" ], feat.feature_photos.visible.order(:filename).map(&:filename)
    assert_equal [ "IMG_1.jpg" ], feat.feature_photos.hidden.order(:filename).map(&:filename)
  end

  test "approval still pairs bytes with a hidden wrapper — hiding is display state" do
    # Merge logic is deliberately unchanged (issue #66): an approved upload
    # pairs with the sheet's wrapper row by name even when that row is
    # hidden. The annotation on the review page is what keeps the reviewer
    # informed; unhiding later reveals the merged bytes.
    feat = Feature.create!(sheet: "615", photos: [ "IMG_1.jpg" ])
    feat.feature_photos.find_by!(filename: "IMG_1.jpg").update!(hidden: true)
    sub = submit("SHEET" => "615", "photos" => [ "IMG_1.jpg" ])
    sub.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "IMG_1.jpg", content_type: "image/jpeg"
    )

    sub.approve!

    wrapper = feat.reload.feature_photos.find_by!(filename: "IMG_1.jpg")
    assert wrapper.file.attached?, "the approved bytes land on the sheet's wrapper row"
    assert wrapper.hidden?, "hiding survives the merge; unhiding reveals the photo again"
  end

  test "a wrapper-less catalog name is created and served when a submission re-sends it" do
    # Fresh-db state: the import writes photos_data in bulk, bypassing the
    # sync, so the catalog has names with no wrapper rows yet.
    feat = Feature.create!(sheet: "613")
    feat.update_column(:photos_data, [ "IMG_1.jpg" ].to_json)
    assert_equal 0, feat.feature_photos.count
    sub = submit("SHEET" => "613", "photos" => [ "IMG_1.jpg" ])
    sub.photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "IMG_1.jpg", content_type: "image/jpeg"
    )

    sub.approve!

    wrapper = feat.reload.feature_photos.find_by!(filename: "IMG_1.jpg")
    assert wrapper.file.attached?, "main served the tile from the sheet's own bytes; the wrapper must too"
  end
end
