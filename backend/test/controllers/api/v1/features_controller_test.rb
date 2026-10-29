require "test_helper"

class Api::V1::FeaturesControllerTest < ActionDispatch::IntegrationTest
  setup do
    Feature.destroy_all
    @feature = Feature.create!(
      sheet: "6083",
      feature_id: "16781",
      recorder_id: "Linda Baxter",
      region: "VI",
      insula: "2",
      entrance: "6",
      space_number: "Preparation room",
      description: "House of Sallust oven room"
    )
  end

  test "GET /api/v1/features returns master json array matching pompeiifd schema" do
    get "/api/v1/features"
    assert_response :success

    json = JSON.parse(response.body)
    assert_kind_of Array, json
    assert_equal 1, json.size
    first_item = json.first
    assert_equal "6083", first_item["SHEET"]
    assert_equal "16781", first_item["FEATURE_ID"]
    assert_equal "Linda Baxter", first_item["RECORDER_ID"]
    assert_equal "VI", first_item["REGION"]
  end

  test "GET /api/v1/features?download=true sends json attachment" do
    get "/api/v1/features?download=true"
    assert_response :success
    assert_includes response.headers["Content-Disposition"], "attachment; filename=\"features.json\""
  end

  test "GET /api/v1/features/:sheet serves photo URLs for photos linked to the feature" do
    @feature.photos = [ "IMG_1.jpg", "paper-era.jpg" ]
    @feature.save!
    attach_master_photo(@feature, "IMG_1.jpg")

    get "/api/v1/features/#{@feature.sheet}"

    assert_response :success
    photos = JSON.parse(response.body)["photos"]
    assert_equal 2, photos.size
    linked, name_only = photos
    assert_match(%r{\Ahttp://}, linked,
                 "the field app needs an absolute URL, it runs on another origin")
    assert_match(/IMG_1\.jpg\z/, linked, "the URL must end in the original filename")
    assert_equal "paper-era.jpg", name_only, "names without a linked blob stay names"
  end

  test "GET /api/v1/features serves photo URLs in the master list" do
    @feature.photos = [ "IMG_1.jpg" ]
    @feature.save!
    attach_master_photo(@feature, "IMG_1.jpg")

    get "/api/v1/features"

    assert_response :success
    photos = JSON.parse(response.body).first["photos"]
    assert_equal 1, photos.size
    assert_match(%r{\Ahttp://.*IMG_1\.jpg\z}, photos.first)
  end

  test "a name with a wrapper file serves one URL, not two entries" do
    @feature.photos = [ "IMG_1.jpg" ]
    @feature.save!
    attach_master_photo(@feature, "IMG_1.jpg")

    get "/api/v1/features/#{@feature.sheet}"

    assert_response :success
    photos = JSON.parse(response.body)["photos"]
    assert_equal 1, photos.size, "the name list stays the source of truth for the count"
    assert_match(%r{\Ahttp://.*IMG_1\.jpg\z}, photos.first)
  end

  test "GET /api/v1/features?download=true keeps the name-only pompeiifd schema" do
    @feature.photos = [ "IMG_1.jpg" ]
    @feature.save!
    attach_master_photo(@feature, "IMG_1.jpg")

    get "/api/v1/features?download=true"

    assert_response :success
    photos = JSON.parse(response.body).first["photos"]
    assert_equal [ "IMG_1.jpg" ], photos, "the export schema stays host-independent"
  end

  test "GET /api/v1/features/:sheet returns single feature" do
    get "/api/v1/features/6083"
    assert_response :success
    json = JSON.parse(response.body)
    assert_equal "6083", json["SHEET"]
    assert_equal "Preparation room", json["SPACE_NUMBER"]
  end
end
