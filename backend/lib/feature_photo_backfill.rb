# One-off, idempotent, converging backfill: builds the FeaturePhoto wrapper
# rows for every master sheet's photos_data names, re-homes the photo bytes
# the old display resolved to, and deletes the superseded plumbing rows.
#
# Supersedes the pre-wrapper backfill that linked approved submissions'
# blobs to the feature directly (issue #64): that job is folded into the
# second step below, for databases where it never ran.
#
# Three steps per sheet, all guarded, so a re-run changes nothing once
# converged:
#   1. one FeaturePhoto row per photos_data name (missing rows only);
#   2. wrappers without bytes take theirs, in priority order, from the
#      old-style Feature attachment rows (record_type "Feature", name
#      "field_photos" — what the old display's first-match resolution
#      showed), then from approved submissions' blobs with matching
#      filenames — a blob whose bytes a wrapper already carries links to
#      no wrapper (one image per name is the bar);
#   3. the old-style attachment rows are deleted — never purged: their
#      blobs are shared with the wrappers and with the submissions, whose
#      own attachments stay untouched evidence.
class FeaturePhotoBackfill
  def self.run!
    new.run!
  end

  def run!
    stats = { wrappers_created: 0, bytes_rehomed: 0, submission_links: 0, old_rows_deleted: 0 }
    # Unordered walk: find_each ignores the default scope's ORDER BY, and
    # the result does not depend on order.
    Feature.find_each do |feature|
      create_wrappers(feature, stats)
      rehome_old_bytes(feature, stats)
      link_submission_bytes(feature, stats)
      delete_old_rows(feature, stats)
    end
    stats
  end

  private

  def create_wrappers(feature, stats)
    feature.photos.map(&:to_s).reject(&:blank?).each do |name|
      next if feature.feature_photos.exists?(filename: name)
      feature.feature_photos.create!(filename: name)
      stats[:wrappers_created] += 1
    end
  end

  # Old-style rows, first blob-filename match per name: byte-for-byte what
  # the old field_photo_for detect served.
  def rehome_old_bytes(feature, stats)
    old_rows = ActiveStorage::Attachment
                 .where(record_type: "Feature", record_id: feature.id, name: "field_photos")
                 .joins(:blob)
                 .order(:id)
    return if old_rows.empty?

    served_checksums = served_checksums_of(feature)
    feature.feature_photos.where.missing(:file_attachment).find_each do |wrapper|
      row = old_rows.detect { |attachment| attachment.blob.filename.to_s == wrapper.filename }
      next if row.nil?
      next if served_checksums.include?(row.blob.checksum)
      wrapper.file.attach(row.blob)
      served_checksums << row.blob.checksum
      stats[:bytes_rehomed] += 1
    end
  end

  # The folded-in job of the superseded backfill: approvals that predate any
  # linkage left their blobs on the submission only. Fill wrappers that are
  # still file-less from approved submissions of this sheet.
  def link_submission_bytes(feature, stats)
    served_checksums = served_checksums_of(feature)
    fileless = feature.feature_photos.where.missing(:file_attachment).index_by(&:filename)
    return if fileless.empty?

    Submission.where(status: "approved", target_sheet: feature.sheet).find_each do |submission|
      submission.photos.each do |photo|
        wrapper = fileless[photo.filename.to_s]
        next if wrapper.nil?
        next if served_checksums.include?(photo.blob.checksum)
        wrapper.file.attach(photo.blob)
        served_checksums << photo.blob.checksum
        fileless.delete(wrapper.filename)
        stats[:submission_links] += 1
      end
    end
  end

  def served_checksums_of(feature)
    feature.linked_photo_blobs.map(&:last)
  end

  def delete_old_rows(feature, stats)
    deleted = ActiveStorage::Attachment
                .where(record_type: "Feature", record_id: feature.id, name: "field_photos")
                .delete_all
    stats[:old_rows_deleted] += deleted
  end
end
