namespace :backfill do
  desc "Converge the master sheets onto FeaturePhoto wrapper rows: create one wrapper per photos_data name, re-home the photo bytes the old display served, link approved submissions' blobs to wrappers without bytes, and delete the superseded Feature attachment rows (idempotent, attach-only; safe to re-run)"
  task feature_photos: :environment do
    stats = FeaturePhotoBackfill.run!
    puts "Backfill done: #{stats[:wrappers_created]} wrapper row(s) created; " \
         "#{stats[:bytes_rehomed]} old attachment byte(s) re-homed; " \
         "#{stats[:submission_links]} submission blob(s) linked; " \
         "#{stats[:old_rows_deleted]} superseded attachment row(s) deleted."
  end
end
