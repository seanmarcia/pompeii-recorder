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

  test "duplicate catalog names create one wrapper row per entry" do
    feat = Feature.create!(sheet: "607", photos: [ "IMG_1.jpg", "IMG_1.jpg", "paper-era.jpg" ])

    assert_equal %w[IMG_1.jpg IMG_1.jpg paper-era.jpg], feat.feature_photos.order(:id).map(&:filename),
                 "a repeated name is two photos: one row per catalog entry"
  end

  test "dropping one occurrence of a duplicated name removes exactly one wrapper" do
    feat = Feature.create!(sheet: "608", photos: [ "IMG_1.jpg", "IMG_1.jpg" ])
    first = attach_master_photo(feat, "IMG_1.jpg")

    feat.update!(photos: [ "IMG_1.jpg" ])

    wrappers = feat.reload.feature_photos.order(:id).to_a
    assert_equal 1, wrappers.length
    assert_equal first.id, wrappers.first.id, "occurrence order decides the survivor"
    assert wrappers.first.file.attached?, "the surviving wrapper keeps its bytes"
  end

  test "photo_items returns one display item per catalog entry, duplicates included" do
    feat = Feature.create!(sheet: "602", photos: [ "IMG_1.jpg", "paper-era.jpg" ])
    attach_master_photo(feat, "IMG_1.jpg")

    items = feat.photo_items

    assert_equal [ "IMG_1.jpg", "paper-era.jpg" ], items.map { |i| i[:name] }
    assert_equal "IMG_1.jpg", items[0][:attachment].filename.to_s
    assert_nil items[1][:attachment], "a text-only name resolves to nothing"
  end

  test "photo_items pairs duplicate entries with their own wrapper rows" do
    feat = Feature.create!(sheet: "609", photos: [ "IMG_1.jpg", "IMG_1.jpg" ])
    attach_master_photo(feat, "IMG_1.jpg")

    items = feat.photo_items

    assert_equal [ "IMG_1.jpg", "IMG_1.jpg" ], items.map { |i| i[:name] }
    assert items[0][:attachment], "the first entry pairs with the wrapper holding bytes"
    assert_nil items[1][:attachment], "the second entry pairs with the byteless wrapper"
  end

  test "photo_items sorts names digit-aware and case-insensitively" do
    feat = Feature.create!(sheet: "603", photos: [ "IMG_10.jpg", "img_9.jpg", "9001 IMG_E0380.jpg", "IMG_1004.jpg" ])

    assert_equal [ "9001 IMG_E0380.jpg", "IMG_1004.jpg", "IMG_10.jpg", "img_9.jpg" ].sort,
                 feat.photo_items.map { |i| i[:name] }.sort
    # Digit runs compare numerically, not lexicographically: IMG_9 before IMG_10.
    order = feat.photo_items.map { |i| i[:name] }
    assert order.index("img_9.jpg") < order.index("IMG_10.jpg"), "natural sort: 9 before 10"
  end

  test "photo_items marks the paired wrapper's hidden state on each display item" do
    feat = Feature.create!(sheet: "hidden-items", photos: [ "IMG_1.jpg", "paper-era.jpg" ])
    attach_master_photo(feat, "IMG_1.jpg")
    feat.feature_photos.find_by!(filename: "IMG_1.jpg").update!(hidden: true)

    items = feat.reload.photo_items
    assert items.find { |i| i[:name] == "IMG_1.jpg" }[:hidden],
           "the display item must carry the wrapper's hidden state for the admin surfaces"
    assert_not items.find { |i| i[:name] == "paper-era.jpg" }[:hidden],
               "a name with no wrapper row has no hidden state to carry"
  end

  test "export_photo_names drops names whose every paired wrapper is hidden" do
    feat = Feature.create!(sheet: "hidden-export",
                           photos: [ "IMG_1.jpg", "dup.jpg", "dup.jpg", "paper-era.jpg" ])
    attach_master_photo(feat, "IMG_1.jpg")
    attach_master_photo(feat, "dup.jpg")
    feat.feature_photos.find_by!(filename: "IMG_1.jpg").update!(hidden: true)
    # One of the two dup.jpg wrappers stays visible, so the name survives:
    # a name leaves the export only when no visible pairing remains.
    feat.feature_photos.where(filename: "dup.jpg").order(:id).first.update!(hidden: true)

    assert_equal [ "dup.jpg", "paper-era.jpg" ], feat.reload.export_photo_names
  end

  test "as_json_pompeii keeps the export name-uniq'd when the catalog holds duplicates" do
    feat = Feature.create!(sheet: "614", photos: [ "IMG_1.jpg", "IMG_1.jpg", "paper-era.jpg" ])

    assert_equal [ "IMG_1.jpg", "paper-era.jpg" ], feat.as_json_pompeii["photos"],
                 "the archival export stays a name list, deduplicated"
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
