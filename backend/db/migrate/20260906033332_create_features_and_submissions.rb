class CreateFeaturesAndSubmissions < ActiveRecord::Migration[8.1]
  def change
    create_table :features do |t|
      t.string :sheet, null: false
      t.string :feature_id
      t.string :sheet_date
      t.string :recorder_id
      t.string :researcher_id
      t.string :season
      t.string :region
      t.string :insula
      t.string :entrance
      t.string :structure_id
      t.string :sheet_type_id
      t.string :space_number
      t.string :feature_type_id
      t.string :category_id
      t.string :space_type_id
      t.string :gate_id
      t.string :usage_id
      t.string :negative_feature
      t.string :minority_report
      t.text :description
      t.text :contiguous_relationship
      t.string :photographer_id
      t.string :bw_roll
      t.string :color_roll
      t.string :digital_image
      t.string :videographer_id
      t.string :file_number
      t.string :tape_number
      t.string :time_count
      t.text :video_comments
      t.string :artist_id
      t.text :photos_data # JSON serialized array

      t.timestamps
    end

    add_index :features, :sheet, unique: true
    add_index :features, [ :region, :insula, :entrance ]

    create_table :submissions do |t|
      t.string :action_type, null: false, default: "create_new" # "create_new" or "update_existing"
      t.string :target_sheet
      t.string :status, null: false, default: "pending" # "pending", "approved", "rejected"
      t.string :submitter_name
      t.text :submitter_notes
      t.text :payload_data, null: false # JSON string of all submitted fields
      t.text :reviewer_notes
      t.datetime :reviewed_at

      t.timestamps
    end

    add_index :submissions, :status
    add_index :submissions, :target_sheet
    add_index :submissions, :created_at
  end
end
