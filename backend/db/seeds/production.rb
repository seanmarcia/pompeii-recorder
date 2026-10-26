# Creates a login for every recorder and researcher. The username is the
# person's first and last name run together in lowercase (e.g. "serabaker").
# Recorders can use the field app; researchers can also review submissions
# in the admin portal.
#
# Passwords live in the encrypted credentials, not in this public repo:
#   seed_passwords:
#     recorder: ...
#     researcher: ...
#
# Safe to re-run on its own: bin/rails runner db/seeds/users/production.rb
#

RECORDERS = [
  "Lilly Andoe-Liccetti",
  "Carlos Avila",
  "Sera Baker",
  "Alethea Banar",
  "Terry Bruno",
  "Anne Carter",
  "Monica Connors",
  "Loretta Dimitruk",
  "Natalie Dimitruk",
  "Lynette Galloway",
  "Cindy Hacunda",
  "Lilly Lacetti",
  "Larry Ludwicki",
  "David Mayeske",
  "Charlie Meier",
  "Rich Olimpio",
  "Matthew Selmheimer",
  "Linda Swanson",
  "Brian Szczesniak",
  "Pam Wood",
  "John Wissinger",
  "Leslie Xavier",
  "Ted Xavier"
].freeze

RESEARCHERS = ["Lisa Kahn", "Mary Meier", "Suzanne Stone"].freeze

# Admin logins that aren't researchers (so they don't appear in the Researcher
# dropdown), keyed by username. They use the researcher password.
OTHER_ADMINS = { "carlost" => nil }.freeze

passwords = Rails.application.credentials.seed_passwords || {}
recorder_password = passwords[:recorder].presence
researcher_password = passwords[:researcher].presence
abort "Missing seed_passwords in credentials; see db/seeds/production.rb" unless recorder_password && researcher_password

# The original shared demo accounts had passwords published in the repo.
User.where(username: %w[admin researcher]).destroy_all

# Logins created under a misspelled name, renamed to the correct spelling.
{ "lisakhan" => "lisakahn" }.each do |old, new|
  User.where(username: old).update_all(username: new) unless User.exists?(username: new)
  User.where(username: old).destroy_all
end

[[RECORDERS, "recorder", recorder_password], [RESEARCHERS, "admin", researcher_password]].each do |names, role, password|
  names.each do |full_name|
    username = full_name.downcase.delete(" ")
    user = User.find_or_initialize_by(username: username)
    user.full_name = full_name
    user.email = "#{username}@fdpompeii.org"
    user.role = role
    user.password = password
    user.save!
  end
  puts "✓ #{names.size} #{role} logins ready"
end

OTHER_ADMINS.each do |username, full_name|
  user = User.find_or_initialize_by(username: username)
  user.full_name = full_name
  user.email = "#{username}@fdpompeii.org"
  user.role = "admin"
  user.password = researcher_password
  user.save!
end
puts "✓ #{OTHER_ADMINS.size} other admin logins ready"
