class AddFullNameToUsers < ActiveRecord::Migration[8.1]
  def up
    add_column :users, :full_name, :string
    change_column_default :users, :role, from: "admin", to: "recorder"
    execute "UPDATE users SET role = 'recorder' WHERE role = 'researcher'"
  end

  def down
    execute "UPDATE users SET role = 'researcher' WHERE role = 'recorder'"
    change_column_default :users, :role, from: "recorder", to: "admin"
    remove_column :users, :full_name
  end
end
