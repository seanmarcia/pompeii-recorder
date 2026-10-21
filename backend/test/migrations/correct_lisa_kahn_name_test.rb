require "test_helper"
require_relative "../../db/migrate/20261021000000_correct_lisa_kahn_name"

class CorrectLisaKahnNameTest < ActiveSupport::TestCase
  test "corrects the existing account without changing its identity or password" do
    user = User.create!(
      username: "lisakhan",
      full_name: "Lisa Khan",
      email: "lisakhan@fdpompeii.org",
      password: "test-password",
      role: "admin"
    )
    password_digest = user.password_digest

    assert_no_difference "User.count" do
      CorrectLisaKahnName.new.up
    end

    user.reload
    assert_equal "lisakahn", user.username
    assert_equal "Lisa Kahn", user.full_name
    assert_equal "lisakahn@fdpompeii.org", user.email
    assert_equal "admin", user.role
    assert_equal password_digest, user.password_digest
    assert_equal user, User.authenticate_by_login("lisakahn", "test-password")
    assert_equal user, User.authenticate_by_login("lisakahn@fdpompeii.org", "test-password")
    assert_nil User.authenticate_by_login("lisakhan", "test-password")
  end

  test "preserves a custom email address" do
    user = User.create!(
      username: "lisakhan",
      full_name: "Lisa Khan",
      email: "lisa@example.org",
      password: "test-password",
      role: "admin"
    )

    CorrectLisaKahnName.new.up

    assert_equal "lisa@example.org", user.reload.email
    assert_equal "lisakahn", user.username
  end

  test "leaves an already corrected account unchanged" do
    user = User.create!(
      username: "lisakahn",
      full_name: "Lisa Kahn",
      email: "lisakahn@fdpompeii.org",
      password: "test-password",
      role: "admin"
    )
    attributes = user.attributes

    CorrectLisaKahnName.new.up

    assert_equal attributes, user.reload.attributes
  end

  test "does not create an account in an unseeded database" do
    assert_no_difference "User.count" do
      CorrectLisaKahnName.new.up
    end
  end
end
