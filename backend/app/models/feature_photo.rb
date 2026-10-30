# == Schema Information
#
# Table name: feature_photos
#
#  id           :integer          not null, primary key
#  filename     :string           not null
#  hidden       :boolean          default(FALSE), not null
#  hidden_at    :datetime
#  hide_reason  :string
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  feature_id   :integer          not null
#  file_blob_id :bigint
#  hidden_by_id :integer
#
# Indexes
#
#  index_feature_photos_on_feature_id    (feature_id)
#  index_feature_photos_on_file_blob_id  (file_blob_id)
#
# Foreign Keys
#
#  feature_id    (feature_id => features.id)
#  hidden_by_id  (hidden_by_id => users.id)
#
# One row per photos_data name on the master sheet — the per-photo record,
# including names with no bytes (paper-era import, buried re-uploads).
# `filename` is the catalog's provenance label; `file` the optional bytes.
class FeaturePhoto < ApplicationRecord
  belongs_to :feature
  belongs_to :hidden_by, class_name: "User", optional: true

  # The master-display filter: every master read path serves visible rows
  # only. Hidden rows stay in place for the admin surfaces that show them
  # dimmed (master sheet page, review comparison).
  scope :visible, -> { where(hidden: false) }
  scope :hidden, -> { where(hidden: true) }

  # Deliberate, not an omission: the purge_later default would enqueue a purge
  # on every wrapper destroy — a job that either raises (shared blob) or
  # deletes the wrapper's sole copy of the bytes. Nothing here purges.
  has_one_attached :file, dependent: false

  validates :filename, presence: true
end
