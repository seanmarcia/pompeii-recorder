require "test_helper"

class Admin::FieldClientLinkTest < ActionDispatch::IntegrationTest
  setup do
    @saved_field_client_url = ENV["FIELD_CLIENT_URL"]
    ENV.delete("FIELD_CLIENT_URL")

    User.find_by(username: "admin") || User.create!(
      username: "admin",
      email: "admin@pompeii.org",
      password: "pompeii2026",
      role: "admin"
    )
    post "/admin/login", params: { login: "admin", password: "pompeii2026" }
  end

  teardown do
    if @saved_field_client_url
      ENV["FIELD_CLIENT_URL"] = @saved_field_client_url
    else
      ENV.delete("FIELD_CLIENT_URL")
    end
  end

  test "Field Client link defaults to the local Vite dev server without FIELD_CLIENT_URL" do
    get "/admin"

    assert_response :success
    assert_select "a[title='Open the field logging React client'][href=?]",
                  "http://localhost:5173"
  end

  test "Field Client link uses FIELD_CLIENT_URL when set" do
    ENV["FIELD_CLIENT_URL"] = "https://field-client.example.org/"
    get "/admin"

    assert_response :success
    assert_select "a[title='Open the field logging React client'][href=?]",
                  "https://field-client.example.org/"
  end
end
