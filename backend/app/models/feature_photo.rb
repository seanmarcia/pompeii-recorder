# == Schema Information
#
# Table name: feature_photos
#
#  id         :integer          not null, primary key
#  filename   :string           not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  feature_id :integer          not null
#
# Indexes
#
#  index_feature_photos_on_feature_id  (feature_id)
#
# Foreign Keys
#
#  feature_id  (feature_id => features.id)
#
# One row per photos_data name on the master sheet — the per-photo record,
# including names with no bytes (paper-era import, buried re-uploads).
# `filename` is the catalog's provenance label; `file` the optional bytes.
class FeaturePhoto < ApplicationRecord
  belongs_to :feature

  # Deliberate, not an omission: the purge_later default would enqueue a purge
  # on every wrapper destroy — a job that either raises (shared blob) or
  # deletes the wrapper's sole copy of the bytes. Nothing here purges.
  has_one_attached :file, dependent: false

  validates :filename, presence: true
end
