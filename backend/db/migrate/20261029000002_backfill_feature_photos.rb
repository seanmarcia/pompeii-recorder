class BackfillFeaturePhotos < ActiveRecord::Migration[8.1]
  # Data migration, up only: FeaturePhotoBackfill converges (idempotent,
  # attach-only), so a re-run after any interrupt reaches the same state.
  # Down is a no-op — wrapper rows are data, not schema.
  def up
    FeaturePhotoBackfill.run!
  end

  def down
    # no-op
  end
end
