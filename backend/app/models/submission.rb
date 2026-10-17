class Submission < ApplicationRecord
  has_many_attached :photos

  # Fields a reviewer can correct before approving, grouped and labelled to
  # match the field recorder form.
  EDITABLE_FIELDS = {
    "Sheet Identification" => {
      "SHEET" => "Sheet Number",
      "FEATURE_ID" => "Sheet ID",
      "SHEET_DATE" => "Sheet Date",
      "SEASON" => "Excavation Season",
      "RESEARCHER_ID" => "Researcher Name",
      "RECORDER_ID" => "Recorder Name"
    },
    "Spatial Address & Location" => {
      "REGION" => "Region",
      "INSULA" => "Insula",
      "ENTRANCE" => "Entrance",
      "GATE_ID" => "City Gate / Approach",
      "SPACE_NUMBER" => "Space / Room Name",
      "STRUCTURE_ID" => "Structure Name"
    },
    "Classification" => {
      "SHEET_TYPE_ID" => "Sheet Type",
      "FEATURE_TYPE_ID" => "Feature Type",
      "SPACE_TYPE_ID" => "Space Type",
      "USAGE_ID" => "Category",
      "CATEGORY_ID" => "Usage Classification"
    },
    "Interpretation" => {
      "NEGATIVE_FEATURE" => "Negative Feature (T/F)",
      "MINORITY_REPORT" => "Minority Report (Other Interpretation)",
      "DESCRIPTION" => "Archaeological Description",
      "CONTIGUOUS_RELATIONSHIP" => "Contiguous Spatial Relationships"
    },
    "Archival Records & Media" => {
      "PHOTOGRAPHER_ID" => "Photographer",
      "ARTIST_ID" => "Sketch Artist",
      "BW_ROLL" => "B/W Roll #",
      "COLOR_ROLL" => "Color Roll #",
      "DIGITAL_IMAGE" => "Digital Image #",
      "VIDEOGRAPHER_ID" => "Videographer",
      "FILE_NUMBER" => "File #",
      "TAPE_NUMBER" => "Tape #",
      "TIME_COUNT" => "Time Count",
      "VIDEO_COMMENTS" => "Video Comments"
    }
  }.freeze

  LONG_TEXT_FIELDS = %w[DESCRIPTION CONTIGUOUS_RELATIONSHIP VIDEO_COMMENTS].freeze
  BOOLEAN_FIELDS = %w[NEGATIVE_FEATURE MINORITY_REPORT].freeze

  validates :status, inclusion: { in: %w[pending approved rejected] }
  validates :action_type, inclusion: { in: %w[create_new update_existing] }

  scope :pending, -> { where(status: "pending").order(created_at: :desc) }
  scope :approved, -> { where(status: "approved").order(reviewed_at: :desc) }
  scope :rejected, -> { where(status: "rejected").order(reviewed_at: :desc) }
  scope :recent, -> { order(created_at: :desc) }

  def payload
    return {} if payload_data.blank?
    JSON.parse(payload_data)
  rescue StandardError
    {}
  end

  def payload=(hash)
    self.payload_data = hash.is_a?(Hash) ? hash.to_json : (hash || {}.to_json)
  end

  # Returns the corresponding Feature from the master database if one exists
  def master_feature
    target = target_sheet.presence || payload["SHEET"].presence
    return nil if target.blank?
    Feature.find_by(sheet: target)
  end

  # Value shown in the reviewer edit form: the submitted value, or the master
  # record's value for fields the submission didn't touch.
  def editable_value(key)
    return payload[key] if payload.key?(key)
    master_values[key]
  end

  def master_values
    @master_values ||= master_feature&.as_json_pompeii || {}
  end

  # True when the submission would change this field on the master record.
  def field_changed?(key)
    payload.key?(key) && payload[key].to_s.strip != master_values[key].to_s.strip
  end

  def changed_field_count
    Submission::EDITABLE_FIELDS.values.sum { |fields| fields.keys.count { |k| field_changed?(k) } }
  end

  # Apply reviewer corrections to the payload. Fields the submission didn't
  # include are only added when the reviewer actually changed them, so an
  # untouched form never blanks out master values on approval.
  def apply_reviewer_edits!(edits)
    data = payload
    edits.each do |key, value|
      next unless EDITABLE_FIELDS.values.any? { |fields| fields.key?(key) }
      next if key == "SHEET" && action_type == "update_existing"
      value = value.to_s.strip
      next if !data.key?(key) && value == editable_value(key).to_s.strip
      data[key] = value
    end
    self.payload = data
    self.target_sheet = data["SHEET"] if action_type == "create_new" && data["SHEET"].present?
    save!
  end

  # Returns diff hash between master feature and submission payload
  def compute_diff
    existing = master_feature
    return { is_new: true, changes: payload } if existing.nil?

    existing_hash = existing.as_json_pompeii
    diffs = {}
    
    # Check all keys in payload
    all_keys = (existing_hash.keys + payload.keys).uniq
    all_keys.each do |k|
      next if k == "photos"
      v_old = existing_hash[k].to_s.strip
      v_new = payload[k].to_s.strip
      if v_old != v_new
        diffs[k] = { old: existing_hash[k], new: payload[k] }
      end
    end

    { is_new: false, changes: diffs }
  end

  # Approve this submission and merge it into the Feature master table
  def approve!(reviewer_note = nil)
    ActiveRecord::Base.transaction do
      sheet_val = target_sheet.presence || payload["SHEET"].presence
      raise "Missing Sheet Number in submission payload" if sheet_val.blank?

      feat = Feature.find_or_initialize_by(sheet: sheet_val)
      
      # Update master feature fields from payload
      %w[
        feature_id sheet_date recorder_id researcher_id season
        region insula entrance structure_id sheet_type_id space_number
        feature_type_id category_id space_type_id gate_id usage_id
        negative_feature minority_report description contiguous_relationship
        photographer_id bw_roll color_roll digital_image videographer_id
        file_number tape_number time_count video_comments artist_id
      ].each do |attr|
        key = attr.upcase
        feat.send("#{attr}=", payload[key]) if payload.key?(key)
      end

      # Merge photos: keep existing + add any filenames/URLs from payload
      current_photos = feat.photos.dup
      new_photos = payload["photos"] || []
      merged_photos = (current_photos + new_photos).uniq
      feat.photos = merged_photos

      feat.save!

      self.status = "approved"
      self.reviewed_at = Time.current
      self.reviewer_notes = reviewer_note if reviewer_note.present?
      save!
    end
  end

  # Reject this submission
  def reject!(reviewer_note = nil)
    self.status = "rejected"
    self.reviewed_at = Time.current
    self.reviewer_notes = reviewer_note if reviewer_note.present?
    save!
  end
end
