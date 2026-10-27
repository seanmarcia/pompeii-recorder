module Admin
  class SubmissionsController < ApplicationController
    layout "admin"
    skip_before_action :verify_authenticity_token, raise: false
    before_action :require_admin_login
    before_action :set_submission, only: [ :show, :update, :approve, :reject ]
    before_action :require_pending, only: [ :update ]

    SORT_KEYS = %w[sheet researcher submitted].freeze
    SORT_DIRECTIONS = %w[asc desc].freeze

    # GET /admin or /admin/submissions
    def index
      @filter = %w[pending approved rejected all].include?(params[:status]) ? params[:status] : "pending"
      @query = params[:q].to_s.strip
      @sort = SORT_KEYS.include?(params[:sort]) ? params[:sort] : "sheet"
      @dir = SORT_DIRECTIONS.include?(params[:dir]) ? params[:dir] : "desc"
      @counts = {
        pending: Submission.pending.count,
        approved: Submission.approved.count,
        rejected: Submission.rejected.count,
        total: Submission.count
      }

      scope = case @filter
      when "approved" then Submission.approved
      when "rejected" then Submission.rejected
      when "all"      then Submission.recent
      else                 Submission.pending
      end

      # The queue renders every row of the filtered tab (no pagination), so
      # searching and sorting in Ruby — on the same #sheet_number /
      # #researcher_name methods the view uses — keeps what is matched,
      # ordered, and shown in one place.
      submissions = scope.to_a
      if @query.present?
        q = @query.downcase
        submissions = submissions.select { |s| queue_matches?(s, q) }
      end
      @submissions = queue_sort(submissions)

      # How many pending submissions each sheet has, to flag sheets that
      # several people are recording at once.
      @pending_per_sheet = Submission.where(status: "pending").where.not(target_sheet: [ nil, "" ]).group(:target_sheet).count
    end

    # GET /admin/submissions/:id
    def show
      @read_only = params[:mode] == "view"
      @diff = @submission.compute_diff
      @master = @submission.master_feature
      @payload = @submission.payload
    end

    # PATCH /admin/submissions/:id (JSON) - inline field corrections from the
    # review page. Responds with the re-rendered rows for the edited fields.
    def update
      edits = params.fetch(:fields, {}).to_unsafe_h
      @submission.apply_reviewer_edits!(edits)
      @submission = Submission.find(@submission.id)
      is_new = @submission.master_feature.nil?
      labels = Submission::EDITABLE_FIELDS.values.reduce(:merge)

      rows = edits.keys.select { |k| labels.key?(k) }.to_h do |key|
        [ key, render_to_string(partial: "field_row", formats: [ :html ],
                               locals: { submission: @submission, key: key, label: labels[key], is_new: is_new }) ]
      end
      render json: { rows: rows, changed_count: @submission.changed_field_count }
    rescue StandardError => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    # POST /admin/submissions/:id/approve
    def approve
      @submission.approve!(params[:reviewer_notes])
      redirect_to admin_submission_path(@submission), notice: "Submission ##{@submission.id} has been APPROVED and merged into the master features catalog."
    rescue StandardError => e
      redirect_to admin_submission_path(@submission), alert: "Error approving submission: #{e.message}"
    end

    # POST /admin/submissions/:id/reject
    def reject
      @submission.reject!(params[:reviewer_notes])
      redirect_to admin_submission_path(@submission), alert: "Submission ##{@submission.id} has been REJECTED."
    rescue StandardError => e
      redirect_to admin_submission_path(@submission), alert: "Error rejecting submission: #{e.message}"
    end

    # GET /admin/export_master
    def export_master
      data = Feature.ordered.map(&:as_json_pompeii)
      send_data(
        JSON.pretty_generate(data),
        filename: "features.json",
        type: "application/json",
        disposition: "attachment"
      )
    end

    private

    def set_submission
      @submission = Submission.find(params[:id])
    end

    def require_pending
      return if @submission.status == "pending"
      render json: { error: "Only pending submissions can be edited." }, status: :unprocessable_entity
    end

    # Partial, case-insensitive match on sheet number or the sheet's
    # researcher (payload value with master-record fallback).
    def queue_matches?(submission, q)
      submission.sheet_number.to_s.downcase.include?(q) ||
        submission.researcher_name.to_s.downcase.include?(q)
    end

    def queue_sort(submissions)
      case @sort
      when "researcher"
        # Named researchers alphabetical; blanks always last. Rows sharing
        # a researcher stay newest-first in both directions.
        blank, named = submissions.partition { |s| s.researcher_name.blank? }
        named.sort_by! { |s| [s.researcher_name.to_s.downcase, -s.created_at.to_f] }
        if @dir == "desc"
          named.replace(named.group_by { |s| s.researcher_name.to_s.downcase }
                              .sort_by { |name, _group| name }.reverse
                              .flat_map { |_name, group| group })
        end
        blank.sort_by! { |s| -s.created_at.to_f }
        named + blank
      when "submitted"
        submissions.sort_by! { |s| s.created_at.to_f }
        submissions.reverse! if @dir == "desc"
        submissions
      else
        # Numeric sheet order, newest first inside a cluster in both
        # directions. Sheets without a number sort last (the API can create
        # them). to_f (not to_i) keeps sub-second creation order — seeded
        # queues create several submissions within one second.
        blank, numbered = submissions.partition { |s| s.sheet_number.to_s.strip.empty? }
        sign = (@dir == "asc") ? 1 : -1
        numbered.sort_by! { |s| [sign * s.sheet_number.to_i, -s.created_at.to_f] }
        blank.sort_by! { |s| -s.created_at.to_f }
        numbered + blank
      end
    end
  end
end
