class AddHideStateToFeaturePhotos < ActiveRecord::Migration[8.1]
  def change
    # The admin visibility switch: hidden photos stay rows with their bytes —
    # hiding is a master-display concept, never a deletion (issue #66).
    add_column :feature_photos, :hidden, :boolean, default: false, null: false
    add_column :feature_photos, :hidden_at, :datetime
    add_column :feature_photos, :hidden_by_id, :integer
    add_foreign_key :feature_photos, :users, column: :hidden_by_id
  end
end
