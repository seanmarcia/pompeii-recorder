require "test_helper"

class FeatureTest < ActiveSupport::TestCase
  setup do
    Feature.destroy_all
  end

  test "photo_items returns one display item per photos_data name" do
    feat = Feature.create!(sheet: "602", photos: [ "IMG_1.jpg", "paper-era.jpg" ])
    feat.field_photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "IMG_1.jpg", content_type: "image/jpeg"
    )

    items = feat.photo_items

    assert_equal [ "IMG_1.jpg", "paper-era.jpg" ], items.map { |i| i[:name] }
    assert_equal "IMG_1.jpg", items[0][:attachment].filename.to_s
    assert_nil items[1][:attachment], "a text-only name resolves to nothing"
  end

  test "field_photo_for finds the attachment serving a name, and misses the rest" do
    feat = Feature.create!(sheet: "600", photos: [ "IMG_1.jpg", "paper-era.jpg" ])
    feat.field_photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "IMG_1.jpg", content_type: "image/jpeg"
    )

    assert_equal "IMG_1.jpg", feat.field_photo_for("IMG_1.jpg").filename.to_s
    assert_nil feat.field_photo_for("paper-era.jpg"), "names without a linked blob resolve to nothing"
    assert_nil feat.field_photo_for("never-seen.jpg")
  end

  test "photos keeps reading names when photos_data holds junk" do
    feat = Feature.create!(sheet: "601")
    feat.update_column(:photos_data, "not json")

    assert_equal [], feat.photos
  end
end
