module Api
  module V1
    class FeaturesController < ApplicationController
      # Disable CSRF token verification for API requests
      skip_before_action :verify_authenticity_token, raise: false

      # GET /api/v1/features
      # Serves the master JSON of all Pompeii rooms/features. Photos whose
      # bytes were carried into the master record are served as URLs the field
      # app can load; names that exist only as text stay names.
      def index
        features = Feature.ordered
        data =
          if params[:download].present?
            # The file export keeps the pompeiifd schema: photo names only,
            # so the file stays host-independent and re-importable.
            features.map(&:as_json_pompeii)
          else
            features.with_attached_field_photos.map { |feature| feature_json(feature) }
          end

        if params[:download].present?
          send_data(
            JSON.pretty_generate(data),
            filename: "features.json",
            type: "application/json",
            disposition: "attachment"
          )
        else
          render json: data
        end
      end

      # GET /api/v1/features/:sheet
      def show
        feature = Feature.with_attached_field_photos.find_by(sheet: params[:sheet])
        if feature
          render json: feature_json(feature)
        else
          render json: { error: "Feature with Sheet #{params[:sheet]} not found" }, status: :not_found
        end
      end

      private

      # The pompeiifd shape, with every photo name that has linked bytes
      # replaced by a URL. The URL must be absolute: the field app runs on
      # its own origin and would resolve a root-relative URL against itself.
      def feature_json(feature)
        feature.as_json_pompeii.merge("photos" => photos_payload(feature))
      end

      def photos_payload(feature)
        feature.photos.map do |name|
          attachment = feature.field_photo_for(name)
          attachment ? url_for(attachment) : name
        end
      end
    end
  end
end
