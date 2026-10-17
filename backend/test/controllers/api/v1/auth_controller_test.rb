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
end
