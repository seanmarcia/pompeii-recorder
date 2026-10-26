# Development-only seed: synthetic logins and the synthetic review queue.
# Runs via db/seeds.rb (after the shared features.json import) as part of
# bin/rails db:prepare on a fresh dev database. Never runs in production —
# db/seeds.rb loads seeds/production.rb there instead.
#
# Safe to re-run on its own: bin/rails runner db/seeds/development.rb
#   - logins are find-or-create by username
#   - the queue destroys only [dev-seed]-tagged submissions, then recreates them

DEV_PASSWORD = "password123!"
RESEARCHERS = [ "Lisa Kahn", "Mary Meier", "Suzanne Stone" ].freeze
# Logins only for names a verification scenario or a real sheet references:
# - the 99901 trio (three-way new-sheet collision, see db/seeds/dev.rb)
# - the sheet-6083 chain (recorder/researcher/photographer/artist)
RECORDER_NAMES = [
  "Terry Bruno", "Loretta Dimitruk", "Lilly Lacetti",   # 99901 trio
  "Linda Baxter", "Sera Baker", "Rob Brown"             # sheet 6083
].freeze

(RESEARCHERS + RECORDER_NAMES).each do |full_name|
  username = full_name.downcase.delete(" ")
  user = User.find_or_initialize_by(username: username)
  user.full_name = full_name
  user.email = "#{username}@example.com"
  user.role = RESEARCHERS.include?(full_name) ? "admin" : "recorder"
  user.password = DEV_PASSWORD
  user.save!
end

admin = User.find_or_initialize_by(username: "andreaadmin")
admin.full_name ||= "Andrea Admin"
admin.email = "andreaadmin@example.com"
admin.role = "admin"
admin.password = DEV_PASSWORD
admin.save!

puts "✓ #{User.count} dev logins ready (password: #{DEV_PASSWORD})"

# --- Synthetic review queue --------------------------------------------------

SYNTHETIC = "[dev-seed]".freeze
Submission.where("submitter_notes LIKE ?", "%#{SYNTHETIC}%").destroy_all

# 1x1 transparent PNG, so ActiveStorage has real image bytes to serve.
TINY_PNG = Base64.decode64(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)
def attach_photo!(submission, filename)
  submission.photos.attach(io: StringIO.new(TINY_PNG.dup), filename: filename, content_type: "image/png")
end

# (a) Three people record the same brand-new sheet at once — the canonical
# merge problem: sheet 99901 doesn't exist yet, each person fills a different
# slice, and some overlap.
[
  { sub: "Terry Bruno", note: "#{SYNTHETIC} Photographed the counter; three dolia in situ.",
    payload: { "SHEET" => "99901", "REGION" => "VI", "INSULA" => "4", "ENTRANCE" => "3",
               "SHEET_TYPE_ID" => "Space", "SPACE_TYPE_ID" => "Counter Room",
               "CATEGORY_ID" => "Commercial", "PHOTOGRAPHER_ID" => "Terry Bruno",
               "photos" => [ "99901_counter_north.jpg", "99901_counter_east.jpg" ] } },
  { sub: "Loretta Dimitruk", note: "#{SYNTHETIC} Room description from the north corner.",
    payload: { "SHEET" => "99901", "REGION" => "VI", "INSULA" => "4", "ENTRANCE" => "3",
               "SHEET_TYPE_ID" => "Space", "SPACE_TYPE_ID" => "Counter Room",
               "CATEGORY_ID" => "Commercial", "USAGE_ID" => "Commercial | Shop",
               "RESEARCHER_ID" => "Lisa Kahn",
               "DESCRIPTION" => "Tiled counter opening east onto the sidewalk; masonry stepped shelf along the north side." } },
  { sub: "Lilly Lacetti", note: "#{SYNTHETIC} Sketch of the plan done.",
    payload: { "SHEET" => "99901", "REGION" => "VI", "INSULA" => "4", "ENTRANCE" => "3",
               "SHEET_TYPE_ID" => "Space", "SPACE_TYPE_ID" => "Counter Room",
               "CATEGORY_ID" => "Commercial", "ARTIST_ID" => "Lilly Lacetti",
               "CONTIGUOUS_RELATIONSHIP" => "Counter room lies north of the atrium (99902)." } }
].each do |h|
  s = Submission.create!(action_type: "create_new", target_sheet: "99901", status: "pending",
                          submitter_name: h[:sub], submitter_notes: h[:note],
                          payload: Submission.clean_field_payload(h[:payload].merge("_defaults" => {})))
  attach_photo!(s, h[:payload]["photos"]&.first || "99901_plan.png") if h[:payload]["photos"]
  s.update!(payload: s.payload.merge("photos" => (h[:payload]["photos"] || [])))
end

# (b) Overfilled update to an EXISTING sheet: this person filled far more than
# the one field they were sent to change, so approving may clobber reviewed data.
sheet6083 = Feature.find_by(sheet: "6083")
if sheet6083
  s = Submission.create!(action_type: "update_existing", target_sheet: "6083", status: "pending",
                          submitter_name: "Carlos Avila", submitter_notes: SYNTHETIC,
                          payload: Submission.clean_field_payload({
                            "SHEET" => "6083",
                            "DESCRIPTION" => "Oven restored 2011.",
                            "CATEGORY_ID" => "Domestic",
                            "SPACE_TYPE_ID" => "Kitchen",
                            "RESEARCHER_ID" => "Suzanne Stone"
                          }))
  attach_photo!(s, "6083_oven_2026.png")
  s.update!(payload: s.payload.merge("photos" => [ "6083_oven_2026.png" ]))
end

# (c) Symptom rows: blank submitter (backend default) and a researcher on record.
Submission.create!(action_type: "create_new", target_sheet: "99903", status: "pending",
                   submitter_name: "Field Archaeologist", submitter_notes: SYNTHETIC,
                   payload: Submission.clean_field_payload({ "SHEET" => "99903", "REGION" => "VI",
                     "SHEET_TYPE_ID" => "Space", "RESEARCHER_ID" => "Mary Meier",
                     "SPACE_TYPE_ID" => "Garden", "CATEGORY_ID" => "Domestic" }))

puts "✓ #{Submission.count} submissions in queue"
puts "Dev seed complete."
