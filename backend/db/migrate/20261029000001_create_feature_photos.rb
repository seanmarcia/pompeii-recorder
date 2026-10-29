class CreateFeaturePhotos < ActiveRecord::Migration[8.1]
  def change
    create_table :feature_photos do |t|
      t.references :feature, null: false, foreign_key: true
      # The photo's provenance label, copied from the upload. Not unique:
      # filenames are labels, not identity (doctrine, issue #64). The
      # FeaturePhoto row is the identity.
      t.string :filename, null: false
      t.timestamps
    end
  end
end
