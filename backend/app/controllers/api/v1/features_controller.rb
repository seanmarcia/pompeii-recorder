module Api
  module V1
    class FeaturesController < ApplicationController
      # Disable CSRF token verification for API requests
      skip_before_action :verify_authenticity_token, raise: false

      # GET /api/v1/features
      # Serves the master JSON of all Pompeii rooms/features
      def index
        features = Feature.ordered
        data = features.map(&:as_json_pompeii)

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
        feature = Feature.find_by(sheet: params[:sheet])
        if feature
          render json: feature.as_json_pompeii
        else
          render json: { error: "Feature with Sheet #{params[:sheet]} not found" }, status: :not_found
        end
      end
    end
  end
end
