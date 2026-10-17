module Admin
  class SubmissionsController < ApplicationController
    layout "admin"
    skip_before_action :verify_authenticity_token, raise: false
    before_action :require_admin_login
    before_action :set_submission, only: [:show, :update, :approve, :reject]
    before_action :require_pending, only: [:update]

    # GET /admin or /admin/submissions
    def index
      @filter = params[:status].presence || "pending"
      @counts = {
        pending: Submission.pending.count,
        approved: Submission.approved.count,
        rejected: Submission.rejected.count,
        total: Submission.count
      }

      @submissions = case @filter
                     when "approved" then Submission.approved
                     when "rejected" then Submission.rejected
                     when "all"      then Submission.recent
                     else                 Submission.pending
                     end
    end

    # GET /admin/submissions/:id
    def show
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
        [key, render_to_string(partial: "field_row", formats: [:html],
                               locals: { submission: @submission, key: key, label: labels[key], is_new: is_new })]
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
  end
end
