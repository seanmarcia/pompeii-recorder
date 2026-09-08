namespace :db do
  desc "Import features from a JSON file (default: db/features.json or pass FILE=path/to/features.json)"
  task import_features: :environment do
    file_path = ENV["FILE"] || Rails.root.join("db", "features.json")
    unless File.exist?(file_path)
      puts "File not found: #{file_path}"
      exit 1
    end

    puts "Reading #{file_path}..."
    data = JSON.parse(File.read(file_path))
    puts "Found #{data.size} raw records. Importing..."

    imported = 0
    skipped = 0

    ActiveRecord::Base.transaction do
      data.each do |hash|
        sheet = hash["SHEET"]&.to_s&.strip
        if sheet.blank?
          skipped += 1
          next
        end

        feat = Feature.from_pompeii_hash(hash)
        if feat&.save
          imported += 1
        else
          skipped += 1
        end

        print "." if (imported % 100).zero?
      end
    end

    puts "\nDone! Successfully imported #{imported} features (skipped #{skipped}). Total in DB: #{Feature.count}"
  end
end
