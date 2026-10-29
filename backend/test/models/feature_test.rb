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

  test "photo_items sorts names digit-aware and case-insensitively" do
    feat = Feature.create!(sheet: "603", photos: [ "IMG_10.jpg", "img_9.jpg", "9001 IMG_E0380.jpg", "IMG_1004.jpg" ])

    assert_equal [ "9001 IMG_E0380.jpg", "IMG_1004.jpg", "IMG_10.jpg", "img_9.jpg" ].sort,
                 feat.photo_items.map { |i| i[:name] }.sort
    # Digit runs compare numerically, not lexicographically: IMG_9 before IMG_10.
    order = feat.photo_items.map { |i| i[:name] }
    assert order.index("img_9.jpg") < order.index("IMG_10.jpg"), "natural sort: 9 before 10"
  end

  test "attach_new_photo_blobs skips already-linked and byte-identical blobs and returns what it attached" do
    feat = Feature.create!(sheet: "604", photos: [ "a.jpg", "b.jpg" ])
    feat.field_photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "a.jpg", content_type: "image/jpeg"
    )
    # A second feature as the blob source, the way approval and the backfill
    # both carry attachments: same bytes as a.jpg under a re-uploaded name,
    # and one genuinely new file.
    source = Feature.create!(sheet: "605", photos: [ "a (1).jpg", "c.jpg" ])
    source.field_photos.attach(
      io: File.open(Rails.root.join("test/fixtures/files/portrait_test.jpg")),
      filename: "a (1).jpg", content_type: "image/jpeg"
    )
    source.field_photos.attach(io: StringIO.new("genuinely new bytes"), filename: "c.jpg", content_type: "image/jpeg")

    attached = feat.attach_new_photo_blobs(source.field_photos.to_a)

    assert_equal [ "c.jpg" ], attached.map { |a| a.filename.to_s },
                 "the byte-identical blob is skipped; only the new bytes attach"
    assert_equal 2, feat.field_photos.count, "one attachment row per set of bytes"
    assert_equal 3, ActiveStorage::Blob.count, "attach reuses blobs — no new bytes are written"
  end

  test "photos keeps reading names when photos_data holds junk" do
    feat = Feature.create!(sheet: "601")
    feat.update_column(:photos_data, "not json")

    assert_equal [], feat.photos
  end
end
