# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_10_21_000000) do
  create_table "active_storage_attachments", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.bigint "record_id", null: false
    t.string "record_type", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.string "content_type"
    t.datetime "created_at", null: false
    t.string "filename", null: false
    t.string "key", null: false
    t.text "metadata"
    t.string "service_name", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "features", force: :cascade do |t|
    t.string "artist_id"
    t.string "bw_roll"
    t.string "category_id"
    t.string "color_roll"
    t.text "contiguous_relationship"
    t.datetime "created_at", null: false
    t.text "description"
    t.string "digital_image"
    t.string "entrance"
    t.string "feature_id"
    t.string "feature_type_id"
    t.string "file_number"
    t.string "gate_id"
    t.string "insula"
    t.string "minority_report"
    t.string "negative_feature"
    t.string "photographer_id"
    t.text "photos_data"
    t.string "recorder_id"
    t.string "region"
    t.string "researcher_id"
    t.string "season"
    t.string "sheet", null: false
    t.string "sheet_date"
    t.string "sheet_type_id"
    t.string "space_number"
    t.string "space_type_id"
    t.string "structure_id"
    t.string "tape_number"
    t.string "time_count"
    t.datetime "updated_at", null: false
    t.string "usage_id"
    t.text "video_comments"
    t.string "videographer_id"
    t.index ["region", "insula", "entrance"], name: "index_features_on_region_and_insula_and_entrance"
    t.index ["sheet"], name: "index_features_on_sheet", unique: true
  end

  create_table "submissions", force: :cascade do |t|
    t.string "action_type", default: "create_new", null: false
    t.datetime "created_at", null: false
    t.text "payload_data", null: false
    t.datetime "reviewed_at"
    t.text "reviewer_notes"
    t.string "status", default: "pending", null: false
    t.string "submitter_name"
    t.text "submitter_notes"
    t.string "target_sheet"
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_submissions_on_created_at"
    t.index ["status"], name: "index_submissions_on_status"
    t.index ["target_sheet"], name: "index_submissions_on_target_sheet"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.string "full_name"
    t.string "password_digest", null: false
    t.string "role", default: "recorder", null: false
    t.datetime "updated_at", null: false
    t.string "username", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["username"], name: "index_users_on_username", unique: true
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
end
