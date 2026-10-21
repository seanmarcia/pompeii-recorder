require "test_helper"

class Api::V1::AuthControllerTest < ActionDispatch::IntegrationTest
  setup do
    @recorder = User.find_by(username: "serabaker") || User.create!(
      username: "serabaker",
      full_name: "Sera Baker",
      email: "serabaker@fdpompeii.org",
      password: "test-password",
      role: "recorder"
    )
  end

  test "POST /api/v1/auth/login authenticates with valid credentials" do
    post "/api/v1/auth/login", params: {
      username: "SeraBaker",
      password: "test-password"
    }, as: :json

    assert_response :success
    json = JSON.parse(response.body)
    assert_equal true, json["authenticated"]
    assert_equal "serabaker", json["user"]["username"]
    assert_equal "Sera Baker", json["user"]["full_name"]
    assert_equal "recorder", json["user"]["role"]
  end

  test "POST /api/v1/auth/login rejects invalid credentials" do
    post "/api/v1/auth/login", params: {
      username: "serabaker",
      password: "wrongpassword"
    }, as: :json

    assert_response :unauthorized
    json = JSON.parse(response.body)
    assert_equal false, json["authenticated"]
  end

  test "POST /api/v1/auth/login authenticates Lisa Kahn with the correct username" do
    User.create!(
      username: "lisakahn",
      full_name: "Lisa Kahn",
      email: "lisakahn@fdpompeii.org",
      password: "test-password",
      role: "admin"
    )

    post "/api/v1/auth/login", params: {
      username: "lisakahn",
      password: "test-password"
    }, as: :json

    assert_response :success
    user = response.parsed_body["user"]
    assert_equal "lisakahn", user["username"]
    assert_equal "Lisa Kahn", user["full_name"]
    assert_equal "admin", user["role"]
  end
end
