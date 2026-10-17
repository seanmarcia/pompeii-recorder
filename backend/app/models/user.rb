class User < ApplicationRecord
  has_secure_password

  validates :email, presence: true, uniqueness: { case_sensitive: false }, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :username, presence: true, uniqueness: { case_sensitive: false }
  validates :role, inclusion: { in: %w[admin recorder] }

  def self.authenticate_by_login(login, password)
    user = find_by("LOWER(username) = ? OR LOWER(email) = ?", login.to_s.downcase.strip, login.to_s.downcase.strip)
    user&.authenticate(password) ? user : nil
  end

  def admin?
    role == "admin"
  end

  def display_name
    full_name.presence || username
  end
end
