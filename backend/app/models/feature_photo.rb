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
# One per photos_data name on the master sheet. The wrapper is the
# ActiveStorage record type: its single `file` attachment carries the photo's
# bytes, its `filename` column the provenance label the master table tracks.
# `filename` is deliberately non-unique — names are labels, not identity
# (issue #64).
class FeaturePhoto < ApplicationRecord
  belongs_to :feature

  # dependent: false, not the purge_later default: destroying a wrapper must
  # never enqueue a blob purge. Rails refuses to destroy a blob while any
  # attachment references it, so a shared blob (the same bytes live on the
  # submission that supplied them) survives either way — but the default
  # enqueues a purge job that is then guaranteed to raise, one doomed job per
  # wrapper destroy. And a blob whose wrapper holds the only attachment would
  # lose row and bytes for real. Main never purged anything sideways: the
  # attachment row still dies with the wrapper, nothing else.
  has_one_attached :file, dependent: false

  validates :filename, presence: true
end
