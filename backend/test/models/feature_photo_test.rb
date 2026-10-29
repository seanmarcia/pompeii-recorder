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

  test "destroying a wrapper never destroys a shared blob" do
    feat = Feature.create!(sheet: "612", photos: [ "IMG_1.jpg" ])
    wrapper = attach_master_photo(feat, "IMG_1.jpg")
    sub = Submission.create!(
      action_type: "create_new", target_sheet: "612", status: "approved",
      payload: { "SHEET" => "612", "photos" => [ "IMG_1.jpg" ] }
    )
    sub.photos.attach(io: StringIO.new("evidence bytes"), filename: "IMG_1.jpg", content_type: "image/jpeg")
    blob_id = wrapper.file.blob_id
    blob_count = ActiveStorage::Blob.count

    wrapper.destroy!

    assert_equal blob_count, ActiveStorage::Blob.count, "the blob is shared evidence, never purged sideways"
    assert ActiveStorage::Blob.exists?(blob_id)
    assert sub.reload.photos.attached?, "the submission keeps its own attachment"
  end
end
