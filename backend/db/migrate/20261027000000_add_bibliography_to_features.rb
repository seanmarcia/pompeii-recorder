class AddBibliographyToFeatures < ActiveRecord::Migration[8.1]
  def change
    add_column :features, :bibliography, :text
  end
end