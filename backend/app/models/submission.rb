# == Schema Information
#
# Table name: submissions
#
#  id              :integer          not null, primary key
#  action_type     :string           default("create_new"), not null
#  payload_data    :text             not null
#  reviewed_at     :datetime
#  reviewer_notes  :text
#  status          :string           default("pending"), not null
#  submitter_name  :string
#  submitter_notes :text
#  target_sheet    :string
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#
# Indexes
#
#  index_submissions_on_created_at    (created_at)
#  index_submissions_on_status        (status)
#  index_submissions_on_target_sheet  (target_sheet)
#
class Submission < ApplicationRecord
  include PhotoNameOrder

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
  CATEGORY_OPTIONS = [ "Commercial", "Domestic", "Religion", "Public" ].freeze

  # Payload key holding values the recorder left at the form's starting value
  # (today's date, this season's year, ...). Those only fill in blanks on the
  # master record, so a second person adding photos to a sheet doesn't
  # overwrite it.
  DEFAULTS_KEY = "_defaults".freeze

  # Cleans a payload arriving from the field app. Blank values are dropped
  # because a blank never erases master data; only a reviewer can clear a
  # field. Older app versions send every field, which this also handles.
  def self.clean_field_payload(raw)
    raw = raw.to_unsafe_h if raw.respond_to?(:to_unsafe_h)
    data = (raw || {}).to_h.stringify_keys
    defaults = data.delete(DEFAULTS_KEY)
    data = data.reject { |_k, v| v.nil? || (v.is_a?(String) && v.strip.empty?) }
    data["photos"] = photo_names_only(data["photos"]) if data["photos"].is_a?(Array)
    if defaults.is_a?(Hash)
      defaults = defaults.to_h.stringify_keys.reject { |k, v| v.to_s.strip.empty? || data.key?(k) }
      data[DEFAULTS_KEY] = defaults if defaults.any?
    end
    data
  end

  # The edit flow echoes the master's photo list back in the payload, and that
  # list carries URLs for photos linked to the master record. Keep only the
  # filename: photos_data holds names, and a URL would survive approval as a
  # second, host-specific entry next to the name it points at.
  def self.photo_names_only(photos)
    photos.map do |photo|
      next photo unless photo.is_a?(String) && photo.match?(%r{\Ahttps?://}i)
      CGI.unescape(File.basename(URI.parse(photo).path))
    rescue URI::InvalidURIError, ArgumentError
      photo
    end
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

  # The researcher (PR) this sheet belongs to: what the recorder entered,
  # else the master record's researcher. The queue's PR column, sort, and
  # search all read this one method so they can never disagree.
  def researcher_name
    editable_value("RESEARCHER_ID").presence
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

  # Per-photo review facts for the comparison UI: one card per proposed
  # photo. A byte-carrying name gets one card per attachment — each card
  # shows its own blob (own_bytes), so two different files uploaded under
  # one name display side by side (the view disambiguates them by byte
  # size), and approval gives each its own row. A name with no bytes gets
  # one card. A photo is already on the master sheet by filename (the edit
  # flow echoes the master's names back into the payload) or by bytes (a
  # re-upload of the same file under a new filename produces a second blob
  # with the same checksum). A pure echo — a name already on the sheet with
  # no bytes behind it here — gets no exclude control: excluding it changes
  # nothing. Every byte-carrying card is a real decision: approval joins it
  # to the sheet as its own row, and excluding it leaves the sheet untouched.
  def photo_review_items
    feat = master_feature
    sheet_names = feat ? feat.photos.map(&:to_s) : []
    sheet_checksums = feat ? feat.linked_photo_blobs.map { |(_blob_id, checksum)| checksum } : []
    sheet_items = feat ? feat.photo_items : []
    # The payload's photo names are the merge source, so they drive the list;
    # a submission with attachments but no photos key (older payloads) falls
    # back to its attachment filenames, as the old photo card did. Display
    # order is name-sorted (digit-aware), matching the sheet column, with one
    # functional override: photos the reviewer can decide on sort above the
    # already-on-sheet no-ops, so every checkbox sits in one block at the top
    # of the proposed column.
    names = (payload["photos"].is_a?(Array) ? payload["photos"] : photos.map { |p| p.filename.to_s }).map(&:to_s).uniq
                .sort_by { |name| photo_name_key(name) }

    items = names.flat_map do |name|
      carriers = photos.select { |p| p.filename.to_s == name }
      if carriers.any?
        carriers.map do |attachment|
          {
            name: name,
            attachment: attachment,
            own_bytes: true,
            name_on_sheet: sheet_names.include?(name),
            bytes_on_sheet: sheet_checksums.include?(attachment.blob.checksum)
          }
        end
      else
        # Display resolution for a name that merely echoes the sheet (the
        # edit flow re-sends master photo names): the sheet's own attachment
        # for that name — the photo the name refers to is already on record,
        # so the reviewer sees it rather than a missing-image box.
        display = sheet_items.find { |i| i[:name] == name && i[:attachment] }&.[](:attachment) if sheet_names.include?(name)
        [ {
          name: name,
          attachment: display,
          own_bytes: false,
          name_on_sheet: sheet_names.include?(name),
          bytes_on_sheet: false
        } ]
      end
    end

    # Decisions first, then the already-on-sheet no-ops; name order within
    # each group, with the index tiebreak keeping duplicate tiles stable.
    items.sort_by.with_index do |item, index|
      already = item[:name_on_sheet] || item[:bytes_on_sheet]
      [ already ? 1 : 0, photo_name_key(item[:name]), index ]
    end
  end

  # Removes excluded photo names from the payload before approval, so the
  # merge (an additive union of the payload's names) never carries them and
  # the byte-linking loop never attaches them. The submission keeps its own
  # attachments as evidence.
  def exclude_photos!(names)
    data = payload
    proposed = data["photos"]
    return false unless proposed.is_a?(Array)

    dropped = names.map(&:to_s)
    kept = proposed.reject { |name| dropped.include?(name.to_s) }
    return false if kept.size == proposed.size

    data["photos"] = kept
    self.payload = data
    save!
  end

  # Approve this submission and merge it into the Feature master table.
  # Idempotent: a second call on an approved submission is a no-op — with
  # duplicate filenames legal, re-merging would pile on duplicate rows.
  def approve!(reviewer_note = nil)
    return self if status == "approved"

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

      # Merge photos: additive union, and a filename is a label, not
      # identity — a repeated name is two photos. The edit flow echoes the
      # sheet's own names back into the payload with no bytes behind them:
      # those echoes never re-add. A byte-carrying photo joins the catalog
      # only when no wrapper for its name is free to carry the bytes: the
      # first byteless wrapper for a name (a paper-era placeholder) is filled
      # by the linking step below, so only the surplus beyond it becomes new
      # entries. Excluded names never join, byte-carrying or not.
      current_photos = feat.photos
      proposed_names = (payload["photos"] || []).map(&:to_s)
      new_entries = proposed_names.flat_map do |name|
        carriers = photos.select { |p| p.filename.to_s == name }
        if carriers.any?
          fillable = FeaturePhoto.where(feature_id: feat.id, filename: name)
                                 .count { |wrapper| !wrapper.file.attached? }
          [ name ] * [ carriers.length - fillable, 0 ].max
        elsif current_photos.include?(name)
          []
        else
          [ name ]
        end
      end
      feat.photos = current_photos + new_entries

      feat.save!

      # Link this submission's photo bytes to the master sheet's photo
      # wrappers, one row per photo. Each byte-carrying attachment pairs with
      # the first wrapper for its name that serves nothing — completing a
      # paper-era placeholder — or, when every row for that name already
      # serves bytes, gets a brand-new row. Attaching reuses the existing
      # blobs — a row insert, no byte copy — and the submission keeps its own
      # attachments as evidence. Nothing buries: no served-names freeze, no
      # checksum burial; every approved photo displays.
      proposed_names.each do |name|
        next if name.blank?
        photos.select { |p| p.filename.to_s == name }.each do |photo|
          # The merge adds exactly the entries the byteless wrappers cannot
          # absorb, so a free wrapper always exists here: sync created rows
          # for the new entries above, and any pre-existing placeholder
          # fills first (id order).
          wrapper = FeaturePhoto.where(feature_id: feat.id, filename: name)
                                .order(:id).detect { |row| !row.file.attached? }
          raise "no free FeaturePhoto wrapper for #{name.inspect} on sheet #{feat.sheet}" unless wrapper
          wrapper.file.attach(photo.blob)
        end
      end

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
