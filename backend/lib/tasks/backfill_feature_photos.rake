namespace :backfill do
  desc "Link photo blobs of already-approved submissions to their sheet's master feature (idempotent, attach-only)"
  task feature_photos: :environment do
    stats = FeaturePhotoBackfill.run!
    puts "Backfill done: linked #{stats[:attached]} photo(s) to master features; " \
         "#{stats[:unmatched_photos]} photo(s) had no matching name and were left alone; " \
         "#{stats[:skipped_no_feature]} approved submission(s) had no master feature and were skipped."
  end
end
