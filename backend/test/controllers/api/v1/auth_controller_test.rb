require "test_helper"

class Api::V1::AuthControllerTest < ActionDispatch::IntegrationTest
  setup do
    @researcher = User.find_by(username: "researcher") || User.create!(
      username: "researcher",
      email: "researcher@pompeii.org",
      password: "pompeii2025",
      role: "researcher"
    )
  end

  test "POST /api/v1/auth/login authenticates with valid credentials" do
    post "/api/v1/auth/login", params: {
      username: "researcher",
      password: "pompeii2025"
    }, as: :json

    assert_response :success
    json = JSON.parse(response.body)
    assert_equal true, json["authenticated"]
    assert_equal "researcher", json["user"]["username"]
  end

  test "POST /api/v1/auth/login rejects invalid credentials" do
    post "/api/v1/auth/login", params: {
      username: "researcher",
      password: "wrongpassword"
    }, as: :json

    assert_response :unauthorized
    json = JSON.parse(response.body)
    assert_equal false, json["authenticated"]
  end
end
