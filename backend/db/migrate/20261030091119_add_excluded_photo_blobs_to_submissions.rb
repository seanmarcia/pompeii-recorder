class AddExcludedPhotoBlobsToSubmissions < ActiveRecord::Migration[8.1]
  def change
    add_column :submissions, :excluded_photo_blobs, :text
  end
end
