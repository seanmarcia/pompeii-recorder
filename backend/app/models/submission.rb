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
      "CATEGORY_ID" => "Category",
      "USAGE_ID" => "Usage Classification"
    },
    "Interpretation" => {
      "NEGATIVE_FEATURE" => "Negative Feature (T/F)",
      "MINORITY_REPORT" => "Minority Report (Other Interpretation)",
      "DESCRIPTION" => "Archaeological Description",
      "BIBLIOGRAPHY" => "Bibliography Reference(s)",
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

  LONG_TEXT_FIELDS = %w[DESCRIPTION BIBLIOGRAPHY CONTIGUOUS_RELATIONSHIP VIDEO_COMMENTS].freeze
  BOOLEAN_FIELDS = %w[NEGATIVE_FEATURE MINORITY_REPORT].freeze
  CATEGORY_OPTIONS = [ "Commercial", "Domestic" ].freeze

  # Payload key holding values the recorder left at the form's starting value
  # (today's date, Region VI, ...). Those only fill in blanks on the master
  # record, so a second person adding photos to a sheet doesn't overwrite it.
  DEFAULTS_KEY = "_defaults".freeze

  # Cleans a payload arriving from the field app. Blank values are dropped
  # because a blank never erases master data; only a reviewer can clear a
  # field. Older app versions send every field, which this also handles.
  def self.clean_field_payload(raw)
    raw = raw.to_unsafe_h if raw.respond_to?(:to_unsafe_h)
    data = (raw || {}).to_h.stringify_keys
    defaults = data.delete(DEFAULTS_KEY)
    data = data.reject { |_k, v| v.nil? || (v.is_a?(String) && v.strip.empty?) }
    if defaults.is_a?(Hash)
      defaults = defaults.to_h.stringify_keys.reject { |k, v| v.to_s.strip.empty? || data.key?(k) }
      data[DEFAULTS_KEY] = defaults if defaults.any?
    end
    data
  end

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

  def defaults
    payload[DEFAULTS_KEY] || {}
  end

  def sheet_number
    target_sheet.presence || payload["SHEET"].presence
  end

  # Other submissions for the same sheet still waiting for review.
  def other_pending_for_sheet
    return Submission.none if sheet_number.blank?
    Submission.pending.where(target_sheet: sheet_number).where.not(id: id)
  end

  # Returns the corresponding Feature from the master database if one exists
  def master_feature
    return nil if sheet_number.blank?
    Feature.find_by(sheet: sheet_number)
  end

  # The value this field will have once approved: what the recorder entered
  # (or a reviewer's correction, where a blank means they cleared it), else
  # the master record's value, else the form's starting value.
  def editable_value(key)
    data = payload
    return data[key] if data.key?(key)
    return master_values[key] if master_values[key].present?
    defaults[key]
  end

  def master_values
    @master_values ||= master_feature&.as_json_pompeii || {}
  end

  # True when the submission would change this field on the master record.
  def field_changed?(key)
    editable_value(key).to_s.strip != master_values[key].to_s.strip
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
      if key == "CATEGORY_ID" && value.present? && !CATEGORY_OPTIONS.include?(value) && value != editable_value(key).to_s.strip
        errors.add(:base, "Category must be one of: #{CATEGORY_OPTIONS.join(', ')}.")
        raise ActiveRecord::RecordInvalid.new(self)
      end
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
      next if k == "photos" || k == DEFAULTS_KEY
      v_old = existing_hash[k].to_s.strip
      v_new = editable_value(k).to_s.strip
      if v_old != v_new
        diffs[k] = { old: existing_hash[k], new: editable_value(k) }
      end
    end

    { is_new: false, changes: diffs }
  end

  # Approve this submission and merge it into the Feature master table
  def approve!(reviewer_note = nil)
    ActiveRecord::Base.transaction do
      sheet_val = sheet_number
      raise "Missing Sheet Number in submission payload" if sheet_val.blank?

      feat = Feature.find_or_initialize_by(sheet: sheet_val)

      # Update master feature fields that this submission actually changes
      %w[
        feature_id sheet_date recorder_id researcher_id season
        region insula entrance structure_id sheet_type_id space_number
        feature_type_id category_id space_type_id gate_id usage_id
        negative_feature minority_report description contiguous_relationship bibliography
        photographer_id bw_roll color_roll digital_image videographer_id
        file_number tape_number time_count video_comments artist_id
      ].each do |attr|
        key = attr.upcase
        feat.send("#{attr}=", editable_value(key)) if field_changed?(key)
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
