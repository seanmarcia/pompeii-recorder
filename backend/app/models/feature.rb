# == Schema Information
#
# Table name: features
#
#  id                      :integer          not null, primary key
#  bibliography            :text
#  bw_roll                 :string
#  color_roll              :string
#  contiguous_relationship :text
#  description             :text
#  digital_image           :string
#  entrance                :string
#  file_number             :string
#  insula                  :string
#  minority_report         :string
#  negative_feature        :string
#  photos_data             :text
#  region                  :string
#  season                  :string
#  sheet                   :string           not null
#  sheet_date              :string
#  space_number            :string
#  tape_number             :string
#  time_count              :string
#  video_comments          :text
#  created_at              :datetime         not null
#  updated_at              :datetime         not null
#  artist_id               :string
#  category_id             :string
#  feature_id              :string
#  feature_type_id         :string
#  gate_id                 :string
#  photographer_id         :string
#  recorder_id             :string
#  researcher_id           :string
#  sheet_type_id           :string
#  space_type_id           :string
#  structure_id            :string
#  usage_id                :string
#  videographer_id         :string
#
# Indexes
#
#  index_features_on_region_and_insula_and_entrance  (region,insula,entrance)
#  index_features_on_sheet                           (sheet) UNIQUE
#

class Feature < ApplicationRecord
  include PhotoNameOrder

  # Per-photo wrapper rows, one per photos_data name. The wrapper is the
  # ActiveStorage record type: its `file` attachment carries the photo's
  # bytes, its `filename` column the provenance label. `photos`/`photos=`
  # keep photos_data as the source of truth for what a sheet's photos are
  # called; the sync below mirrors each name into a wrapper row.
  has_many :feature_photos, dependent: :destroy

  validates :sheet, presence: true, uniqueness: true

  scope :ordered, -> { order(:region, :insula, :entrance, :sheet) }

  # Preload wrapper files (and their blobs) for read paths that resolve
  # photo URLs; the replacement for the old with_attached_field_photos.
  # hidden_by preloads the hide badge's "who" on the admin surfaces.
  scope :with_photo_files, -> { includes(feature_photos: [ { file_attachment: :blob }, :hidden_by ]) }

  after_save :sync_feature_photos, if: :saved_change_to_photos_data?

  # One wrapper row per photos_data entry: create missing, destroy entries
  # that left the catalog. Runs whenever photos_data changes, so every write
  # path (approval, import, seed) converges without a manual sync step. A
  # repeated name is two photos, not one: the k-th occurrence of a name pairs
  # with the k-th wrapper row for that name (id order), so each duplicate
  # entry owns its row and its bytes. Blank entries (null, "") in the catalog
  # get no wrapper: main served them as placeholders and raised on nothing.
  def sync_feature_photos
    cursor = Hash.new(0)
    matched_ids = []
    create_names = []
    photos.map(&:to_s).each do |name|
      next if name.blank?
      wrapper = (feature_photos.select { |row| row.filename == name }.sort_by(&:id))[cursor[name]]
      cursor[name] += 1
      wrapper ? matched_ids << wrapper.id : create_names << name
    end
    feature_photos.where.not(id: matched_ids).destroy_all
    create_names.each { |name| feature_photos.create!(filename: name) }
  end

  def photos
    return [] if photos_data.blank?
    JSON.parse(photos_data)
  rescue StandardError
    []
  end

  def photos=(list)
    self.photos_data = list.is_a?(Array) ? list.to_json : (list || [].to_json)
  end

  # The wrapper row pairing with each photos_data entry, positionally: the
  # k-th occurrence of a name pairs with the k-th wrapper row for that name
  # (id order), mirroring sync_feature_photos. Names that exist only as text
  # — paper-era names, rejected-submission photos, renamed files, or a bulk
  # import that has not converged yet — pair with nothing.
  def photo_wrappers_per_entry
    pools = feature_photos.group_by(&:filename)
    cursor = Hash.new(0)
    photos.map do |name|
      name = name.to_s
      pool = name.blank? ? [] : pools[name].to_a
      wrapper = pool.sort_by(&:id)[cursor[name]]
      cursor[name] += 1
      wrapper
    end
  end

  # Blob ids and checksums of the bytes the sheet's wrappers carry: the
  # "already on the sheet" facts for approval and review display.
  def linked_photo_blobs
    feature_photos.joins(file_attachment: :blob)
                  .pluck("active_storage_attachments.blob_id", "active_storage_blobs.checksum")
  end

  # One display item per photos_data entry: the paired wrapper's bytes, or
  # nil for a text-only name. Admin photo surfaces render one box per entry
  # through this, so a repeated name renders as the two photos it is —
  # each with its own bytes. Display order is name-sorted (digit-aware),
  # independent of the stored merge order, so the same name sits in the same
  # spot everywhere. Hidden state rides the paired wrapper: admin surfaces
  # read it (dimmed tiles, review annotation), the export and the field API
  # use it to filter.
  def photo_items
    photos.map(&:to_s).zip(photo_wrappers_per_entry)
          .map do |name, wrapper|
            {
              name: name,
              attachment: wrapper&.file_attachment,
              photo_id: wrapper&.id,
              hidden: wrapper&.hidden? || false,
              hidden_at: wrapper&.hidden_at,
              hidden_by: wrapper&.hidden_by&.display_name
            }
          end
          .sort_by.with_index { |item, index| [ photo_name_key(item[:name]), index ] }
  end

  # The export's photo name list: the catalog's names minus every name whose
  # paired wrappers are all hidden. A name with any visible pairing — or no
  # wrapper at all (paper-era entries) — survives; a repeated name is one
  # export entry, as in the archival format. The two file-export surfaces
  # (admin export_master, the field API download) serve this.
  def export_photo_names
    photos.map(&:to_s).zip(photo_wrappers_per_entry)
          .reject { |_name, wrapper| wrapper&.hidden? }
          .map { |name, _wrapper| name }
          .uniq
  end

  # as_json_pompeii with hidden photos filtered from the name list. Kept
  # separate from as_json_pompeii so review flows that compare against the
  # full catalog state are untouched.
  def as_json_pompeii_export
    as_json_pompeii.merge("photos" => export_photo_names)
  end

  def as_json_pompeii
    {
      "FEATURE_ID" => feature_id,
      "SHEET" => sheet,
      "SHEET_DATE" => sheet_date,
      "RECORDER_ID" => recorder_id,
      "RESEARCHER_ID" => researcher_id,
      "SEASON" => season,
      "REGION" => region,
      "INSULA" => insula,
      "ENTRANCE" => entrance,
      "STRUCTURE_ID" => structure_id,
      "SHEET_TYPE_ID" => sheet_type_id,
      "SPACE_NUMBER" => space_number,
      "FEATURE_TYPE_ID" => feature_type_id,
      "CATEGORY_ID" => category_id,
      "SPACE_TYPE_ID" => space_type_id,
      "GATE_ID" => gate_id,
      "USAGE_ID" => usage_id,
      "NEGATIVE_FEATURE" => negative_feature,
      "MINORITY_REPORT" => minority_report,
      "DESCRIPTION" => description,
      "BIBLIOGRAPHY" => bibliography,
      "CONTIGUOUS_RELATIONSHIP" => contiguous_relationship,
      "PHOTOGRAPHER_ID" => photographer_id,
      "BW_ROLL" => bw_roll,
      "COLOR_ROLL" => color_roll,
      "DIGITAL_IMAGE" => digital_image,
      "VIDEOGRAPHER_ID" => videographer_id,
      "FILE_NUMBER" => file_number,
      "TAPE_NUMBER" => tape_number,
      "TIME_COUNT" => time_count,
      "VIDEO_COMMENTS" => video_comments,
      "ARTIST_ID" => artist_id,
      # The archival interchange format stays a name list: duplicate display
      # entries collapse here, nowhere else. The sheet itself may repeat a
      # name — the export must stay re-importable in the pompeiifd schema.
      "photos" => photos.uniq
    }
  end

  # Class method to populate from pompeiifd JSON hash
  def self.from_pompeii_hash(hash)
    sheet_val = hash["SHEET"]&.to_s&.strip
    return nil if sheet_val.blank?

    feat = find_or_initialize_by(sheet: sheet_val)
    feat.feature_id = hash["FEATURE_ID"]&.to_s
    feat.sheet_date = hash["SHEET_DATE"]&.to_s
    feat.recorder_id = hash["RECORDER_ID"]&.to_s
    feat.researcher_id = hash["RESEARCHER_ID"]&.to_s
    feat.season = hash["SEASON"]&.to_s
    feat.region = hash["REGION"]&.to_s
    feat.insula = hash["INSULA"]&.to_s
    feat.entrance = hash["ENTRANCE"]&.to_s
    feat.structure_id = hash["STRUCTURE_ID"]&.to_s
    feat.sheet_type_id = hash["SHEET_TYPE_ID"]&.to_s
    feat.space_number = hash["SPACE_NUMBER"]&.to_s
    feat.feature_type_id = hash["FEATURE_TYPE_ID"]&.to_s
    feat.category_id = hash["CATEGORY_ID"]&.to_s
    feat.space_type_id = hash["SPACE_TYPE_ID"]&.to_s
    feat.gate_id = hash["GATE_ID"]&.to_s
    feat.usage_id = hash["USAGE_ID"]&.to_s
    feat.negative_feature = hash["NEGATIVE_FEATURE"]&.to_s
    feat.minority_report = hash["MINORITY_REPORT"]&.to_s
    feat.description = hash["DESCRIPTION"]&.to_s
    feat.bibliography = hash["BIBLIOGRAPHY"]&.to_s
    feat.contiguous_relationship = hash["CONTIGUOUS_RELATIONSHIP"]&.to_s
    feat.photographer_id = hash["PHOTOGRAPHER_ID"]&.to_s
    feat.bw_roll = hash["BW_ROLL"]&.to_s
    feat.color_roll = hash["COLOR_ROLL"]&.to_s
    feat.digital_image = hash["DIGITAL_IMAGE"]&.to_s
    feat.videographer_id = hash["VIDEOGRAPHER_ID"]&.to_s
    feat.file_number = hash["FILE_NUMBER"]&.to_s
    feat.tape_number = hash["TAPE_NUMBER"]&.to_s
    feat.time_count = hash["TIME_COUNT"]&.to_s
    feat.video_comments = hash["VIDEO_COMMENTS"]&.to_s
    feat.artist_id = hash["ARTIST_ID"]&.to_s
    feat.photos = hash["photos"] if hash["photos"].is_a?(Array)
    feat
  end
end
