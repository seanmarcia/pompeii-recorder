module Admin
  class FeaturesController < ApplicationController
    layout "admin"
    before_action :require_admin_login

    def index
      @query = params[:q].to_s.strip
      @page = Integer(params[:page] || "1", exception: false)
      unless @page&.positive?
        return render plain: "Invalid page number.", status: :bad_request
      end

      features = Feature.ordered
      if @query.present?
        features = features.where(
          "sheet LIKE :query OR space_number LIKE :query OR structure_id LIKE :query OR description LIKE :query",
          query: "%#{Feature.sanitize_sql_like(@query)}%"
        )
      end
      @total = features.count
      @page_size = 50
      @features = features.offset((@page - 1) * @page_size).limit(@page_size)
    end

    def show
      @feature = Feature.find_by!(sheet: params[:sheet])
      @values = @feature.as_json_pompeii
      @submissions = Submission.where(target_sheet: @feature.sheet).recent
      @photo_submissions = @submissions.approved.with_attached_photos
    end
  end
end
