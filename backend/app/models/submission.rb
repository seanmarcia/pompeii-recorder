class Submission < ApplicationRecord
  has_many_attached :photos

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
