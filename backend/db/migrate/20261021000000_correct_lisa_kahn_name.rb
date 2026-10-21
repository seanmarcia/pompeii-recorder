class CorrectLisaKahnName < ActiveRecord::Migration[8.1]
  def up
    execute <<~SQL
      UPDATE users
      SET username = 'lisakahn',
          full_name = 'Lisa Kahn',
          email = CASE
            WHEN email = 'lisakhan@fdpompeii.org' THEN 'lisakahn@fdpompeii.org'
            ELSE email
          END
      WHERE username = 'lisakhan'
    SQL
  end

  def down
    raise ActiveRecord::IrreversibleMigration, "Lisa Kahn's corrected name should not be reverted."
  end
end
