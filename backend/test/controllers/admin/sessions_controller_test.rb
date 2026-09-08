require "test_helper"

class Admin::SessionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @admin = User.find_by(username: "admin") || User.create!(
      username: "admin",
      email: "admin@pompeii.org",
      password: "pompeii2026",
      role: "admin"
    )
  end

  test "GET /admin/login shows login page" do
    get "/admin/login"
    assert_response :success
    assert_select "h2", /Admin Sign In/
  end

  test "POST /admin/login logs in admin with valid credentials" do
    post "/admin/login", params: { login: "admin", password: "pompeii2026" }
    assert_redirected_to "/admin"
    assert_equal @admin.id, session[:user_id]
  end

  test "POST /admin/login rejects invalid credentials" do
    post "/admin/login", params: { login: "admin", password: "wrongpassword" }
    assert_response :unprocessable_entity
    assert_nil session[:user_id]
  end

  test "GET /admin/logout clears session" do
    post "/admin/login", params: { login: "admin", password: "pompeii2026" }
    assert_equal @admin.id, session[:user_id]

    get "/admin/logout"
    assert_redirected_to "/admin/login"
    assert_nil session[:user_id]
  end

  test "unauthenticated user cannot access /admin" do
    get "/admin"
    assert_redirected_to "/admin/login"
  end
end
