module Admin
  class FeaturesController < ApplicationController
    layout "admin"
    before_action :require_admin_login

    PAGE_SIZE = 50

    # Columns a search term is matched against.
    SEARCH_COLUMNS = %w[
      sheet feature_id space_number structure_id description contiguous_relationship
      bibliography
      sheet_type_id feature_type_id space_type_id category_id usage_id gate_id
      recorder_id researcher_id photographer_id artist_id videographer_id
      digital_image bw_roll color_roll file_number tape_number video_comments
    ].freeze

    PEOPLE_COLUMNS = %w[recorder_id researcher_id photographer_id artist_id videographer_id].freeze

    ROMAN_REGIONS = %w[I II III IV V VI VII VIII IX X XI XII].freeze

    # "VI.17.42", "VI 17", "vi-17-42" or "VI" searches by location.
    ADDRESS_PATTERN = /\A(#{ROMAN_REGIONS.reverse.join("|")})(?:[\s.\-\/,]+(\d+[a-z]?))?(?:[\s.\-\/,]+(\d+[a-z]?))?\z/i

    SORTS = {
      "location" => "Location",
      "sheet" => "Sheet number",
      "recent" => "Recently updated"
    }.freeze

    def index
      @query = params[:q].to_s.strip
      @page = Integer(params[:page] || "1", exception: false)
      unless @page&.positive?
        return render plain: "Invalid page number.", status: :bad_request
      end

      @filters = {
        region: params[:region].presence,
        sheet_type: params[:sheet_type].presence,
        category: params[:category].presence,
        person: params[:person].presence
      }
      @sort = SORTS.key?(params[:sort]) ? params[:sort] : "location"

      features = search(Feature.all, @query)
      features = features.where(region: @filters[:region]) if @filters[:region]
      features = features.where(sheet_type_id: @filters[:sheet_type]) if @filters[:sheet_type]
      features = features.where(category_id: @filters[:category]) if @filters[:category]
      if @filters[:person]
        features = features.where(PEOPLE_COLUMNS.map { |c| "#{c} = :person" }.join(" OR "), person: @filters[:person])
      end

      @total = features.count
      @page_count = [ (@total.to_f / PAGE_SIZE).ceil, 1 ].max
      @features = sorted(features).offset((@page - 1) * PAGE_SIZE).limit(PAGE_SIZE)
      @terms = search_terms(@query)

      @options = {
        region: sort_regions(Feature.distinct.pluck(:region)),
        sheet_type: distinct_values(:sheet_type_id),
        category: distinct_values(:category_id),
        person: PEOPLE_COLUMNS.flat_map { |c| Feature.distinct.pluck(c) }.map { |v| v.to_s.strip }.reject(&:blank?).uniq.sort_by(&:downcase)
      }
    end

    def show
      @feature = Feature.find_by!(sheet: params[:sheet])
      @values = @feature.as_json_pompeii
      @submissions = Submission.where(target_sheet: @feature.sheet).recent
      @photo_submissions = @submissions.approved.with_attached_photos
    end

    private

    def search_terms(query)
      return [] if query.blank? || query.match?(ADDRESS_PATTERN)
      query.scan(/"([^"]+)"|(\S+)/).map { |quoted, word| quoted || word }
    end

    # Every word must match somewhere on the sheet (in any column), so
    # "dolium counter" finds sheets mentioning both. Quote a phrase to match
    # it exactly; an address like "VI.17.42" searches by location.
    def search(scope, query)
      return scope if query.blank?

      if (match = query.match(ADDRESS_PATTERN))
        region, insula, entrance = match.captures
        scope = scope.where("UPPER(region) = ?", region.upcase)
        scope = scope.where(insula: insula) if insula
        scope = scope.where(entrance: entrance) if entrance
        return scope
      end

      search_terms(query).each do |term|
        like = "%#{Feature.sanitize_sql_like(term)}%"
        scope = scope.where(SEARCH_COLUMNS.map { |c| "#{c} LIKE :term" }.join(" OR "), term: like)
      end
      scope
    end

    def sorted(scope)
      case @sort
      when "sheet" then scope.order(Arel.sql("CAST(sheet AS INTEGER), sheet"))
      when "recent" then scope.order(updated_at: :desc, sheet: :asc)
      else scope.order(Arel.sql("#{region_order_sql}, CAST(insula AS INTEGER), insula, CAST(entrance AS INTEGER), entrance, CAST(sheet AS INTEGER), sheet"))
      end
    end

    # Regions sort I..XII, with blanks and other values after them.
    def region_order_sql
      whens = ROMAN_REGIONS.each_with_index.map { |r, i| "WHEN '#{r}' THEN #{i}" }.join(" ")
      "CASE UPPER(region) #{whens} ELSE 99 END, region"
    end

    def sort_regions(values)
      values.map { |v| v.to_s.strip }.reject(&:blank?).uniq
            .sort_by { |v| [ ROMAN_REGIONS.index(v.upcase) || 99, v ] }
    end

    def distinct_values(column)
      Feature.distinct.pluck(column).map { |v| v.to_s.strip }.reject(&:blank?).uniq.sort_by(&:downcase)
    end
  end
end
