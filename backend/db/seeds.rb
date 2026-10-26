# Shared master catalog import, then env-specific seeds.
# Dev: db/seeds/development.rb (synthetic logins + review queue).
# Production: db/seeds/production.rb (logins from encrypted credentials).

# Import all Pompeii records from features.json
features_file = Rails.root.join("db", "features.json")
if File.exist?(features_file)
  puts "Loading complete Pompeii dataset from #{features_file}..."
  raw_data = JSON.parse(File.read(features_file))
  puts "Found #{raw_data.size} raw records. Deduplicating by SHEET..."

  seen_sheets = Set.new
  records_to_insert = []
  now = Time.current

  raw_data.each do |row|
    sheet_val = row["SHEET"]&.to_s&.strip
    next if sheet_val.blank? || seen_sheets.include?(sheet_val)
    seen_sheets.add(sheet_val)

    photos_arr = row["photos"].is_a?(Array) ? row["photos"] : []

    records_to_insert << {
      sheet: sheet_val,
      feature_id: row["FEATURE_ID"]&.to_s,
      sheet_date: row["SHEET_DATE"]&.to_s,
      recorder_id: row["RECORDER_ID"]&.to_s,
      researcher_id: row["RESEARCHER_ID"]&.to_s,
      season: row["SEASON"]&.to_s,
      region: row["REGION"]&.to_s,
      insula: row["INSULA"]&.to_s,
      entrance: row["ENTRANCE"]&.to_s,
      structure_id: row["STRUCTURE_ID"]&.to_s,
      sheet_type_id: row["SHEET_TYPE_ID"]&.to_s,
      space_number: row["SPACE_NUMBER"]&.to_s,
      feature_type_id: row["FEATURE_TYPE_ID"]&.to_s,
      category_id: row["CATEGORY_ID"]&.to_s,
      space_type_id: row["SPACE_TYPE_ID"]&.to_s,
      gate_id: row["GATE_ID"]&.to_s,
      usage_id: row["USAGE_ID"]&.to_s,
      negative_feature: row["NEGATIVE_FEATURE"]&.to_s,
      minority_report: row["MINORITY_REPORT"]&.to_s,
      description: row["DESCRIPTION"]&.to_s,
      contiguous_relationship: row["CONTIGUOUS_RELATIONSHIP"]&.to_s,
      photographer_id: row["PHOTOGRAPHER_ID"]&.to_s,
      bw_roll: row["BW_ROLL"]&.to_s,
      color_roll: row["COLOR_ROLL"]&.to_s,
      digital_image: row["DIGITAL_IMAGE"]&.to_s,
      videographer_id: row["VIDEOGRAPHER_ID"]&.to_s,
      file_number: row["FILE_NUMBER"]&.to_s,
      tape_number: row["TAPE_NUMBER"]&.to_s,
      time_count: row["TIME_COUNT"]&.to_s,
      video_comments: row["VIDEO_COMMENTS"]&.to_s,
      artist_id: row["ARTIST_ID"]&.to_s,
      photos_data: photos_arr.to_json,
      created_at: now,
      updated_at: now
    }
  end

  puts "Inserting #{records_to_insert.size} unique Pompeii room features into database..."
  # Batch insert in chunks of 500
  records_to_insert.each_slice(500) do |batch|
    Feature.upsert_all(batch, unique_by: :sheet)
  end

  puts "✓ Successfully loaded all Pompeii rooms! Total in master DB: #{Feature.count}"
else
  puts "Warning: db/features.json not found, skipping full dataset import."
end

# Env-specific seeds (users; dev also adds the synthetic review queue).
# Dev content is gated structurally: this file only exists for development.
load Rails.root.join("db", "seeds", "#{Rails.env}.rb")
