# One-off, idempotent backfill: links the photo blobs of already-approved
# submissions to the master feature of their sheet.
#
# Approval links blobs automatically (Submission#approve!), but approvals
# merged before that linkage existed left the blobs on the Submission only,
# and the master's photo names were dead references.
#
# Attach-only: reuses existing blobs (a row insert, no byte copy), never
# detaches or destroys anything, never creates Feature rows. Safe to re-run:
# blobs the feature already carries (by link or by bytes) are skipped, and
# photos whose filename the feature's photo names don't carry are left alone.
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
      # Only photos the feature's photo names carry ever merged; the rest are
      # evidence on the submission alone. The attach itself is the shared
      # dedup walk (Feature#attach_new_photo_blobs), the same one approval
      # uses.
      matching = submission.photos.select { |photo| names.include?(photo.filename.to_s) }
      stats[:attached] += feature.attach_new_photo_blobs(matching).size
      stats[:unmatched_photos] += submission.photos.size - matching.size
    end
    stats
  end
end
