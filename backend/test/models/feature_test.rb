require "test_helper"

class FeatureTest < ActiveSupport::TestCase
  setup do
    Submission.destroy_all
    Feature.destroy_all
  end

  test "saving photos= creates one FeaturePhoto row per photos_data name" do
    feat = Feature.create!(sheet: "600", photos: [ "IMG_1.jpg", "paper-era.jpg" ])

    assert_equal [ "IMG_1.jpg", "paper-era.jpg" ], feat.feature_photos.order(:id).map(&:filename),
                 "one wrapper row per catalog name, nothing else"
    assert_equal 2, feat.feature_photos.count
  end

  test "re-saving with a dropped name removes that wrapper, re-saving unchanged adds nothing" do
    feat = Feature.create!(sheet: "604", photos: [ "IMG_1.jpg", "IMG_2.jpg" ])

    feat.update!(photos: [ "IMG_1.jpg" ])

    assert_equal [ "IMG_1.jpg" ], feat.reload.feature_photos.map(&:filename)
    count = feat.feature_photos.count
    feat.update!(description: "touch")
    feat.update!(photos: [ "IMG_1.jpg" ])
    assert_equal count, feat.reload.feature_photos.count, "an unchanged catalog converges to no new rows"
  end

  test "photo_items returns one display item per photos_data name" do
    feat = Feature.create!(sheet: "602", photos: [ "IMG_1.jpg", "paper-era.jpg" ])
    attach_master_photo(feat, "IMG_1.jpg")

    items = feat.photo_items

    assert_equal [ "IMG_1.jpg", "paper-era.jpg" ], items.map { |i| i[:name] }
    assert_equal "IMG_1.jpg", items[0][:attachment].filename.to_s
    assert_nil items[1][:attachment], "a text-only name resolves to nothing"
  end

  test "field_photo_for serves the wrapper's file for a name, and misses the rest" do
    feat = Feature.create!(sheet: "601", photos: [ "IMG_1.jpg", "paper-era.jpg" ])
    attach_master_photo(feat, "IMG_1.jpg")

    assert_equal "IMG_1.jpg", feat.field_photo_for("IMG_1.jpg").filename.to_s
    assert_nil feat.field_photo_for("paper-era.jpg"), "a wrapper without bytes resolves to nothing"
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

  test "photos keeps reading names when photos_data holds junk" do
    feat = Feature.create!(sheet: "605")
    feat.update_column(:photos_data, "not json")

    assert_equal [], feat.photos
  end

  test "blank catalog names create no wrapper and approval never raises on them" do
    feat = Feature.create!(sheet: "606", photos: [ "IMG_1.jpg" ])
    feat.update_column(:photos_data, [ "IMG_1.jpg", nil, "" ].to_json)
    feat.update!(photos: [ "IMG_1.jpg", nil, "" ])

    assert_equal [ "IMG_1.jpg" ], feat.reload.feature_photos.map(&:filename),
                 "blank names get no wrapper row"

    sub = submit("SHEET" => "606", "photos" => [ nil, "" ])
    sub.approve!

    feat = Feature.find_by!(sheet: "606")
    assert_equal 1, feat.feature_photos.count,
                 "main approved blank-name payloads cleanly; the branch must too"
  end
end
