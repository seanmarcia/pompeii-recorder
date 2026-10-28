# One-off, idempotent backfill: links the photo blobs of already-approved
# submissions to the master feature of their sheet.
#
# Approval links blobs automatically (Submission#approve!), but approvals
# merged before that linkage existed left the blobs on the Submission only,
# and the master's photo names were dead references.
#
# Attach-only: reuses existing blobs (a row insert, no byte copy), never
# detaches or destroys anything, never creates Feature rows. Safe to re-run:
# blobs already linked are skipped, and photos whose filename the feature's
# photo names don't carry are left alone.
class FeaturePhotoBackfill
  def self.run!
    new.run!
  end

  def run!
    stats = { attached: 0, unmatched_photos: 0, skipped_no_feature: 0 }
    # Unordered walk: find_each ignores the approved scope's ORDER BY, and
    # the result does not depend on order.
    Submission.where(status: "approved").with_attached_photos.find_each do |submission|
      feature = Feature.find_by(sheet: submission.sheet_number)
      if feature.nil?
        stats[:skipped_no_feature] += 1
        next
      end
      names = feature.photos.map(&:to_s)
      # The "already linked?" snapshot reads the raw association, never the
      # field_photos proxy: attach leaves a pending change on the record,
      # and while one is pending the proxy has no query interface. Snapshots
      # of blob IDs and byte checksums are taken before the loop because
      # attach only adds — and a blob whose bytes the feature already
      # carries under another name is skipped too: two uploads of the same
      # file produce two blobs with the same checksum, and one image per
      # name on the sheet is the bar.
      linked = feature.field_photos_attachments.joins(:blob)
                      .pluck(:blob_id, "active_storage_blobs.checksum")
      linked_blob_ids = linked.map { |(blob_id, _checksum)| blob_id }
      linked_checksums = linked.map { |_blob_id, checksum| checksum }
      submission.photos.each do |photo|
        if names.include?(photo.filename.to_s)
          next if linked_blob_ids.include?(photo.blob_id)
          next if linked_checksums.include?(photo.blob.checksum)
          feature.field_photos.attach(photo.blob)
          linked_blob_ids << photo.blob_id
          linked_checksums << photo.blob.checksum
          stats[:attached] += 1
        else
          stats[:unmatched_photos] += 1
        end
      end
    end
    stats
  end
end
