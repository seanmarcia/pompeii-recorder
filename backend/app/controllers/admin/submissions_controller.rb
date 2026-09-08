module Admin
  class SubmissionsController < ApplicationController
    layout "admin"
    skip_before_action :verify_authenticity_token, raise: false
    before_action :require_admin_login
    before_action :set_submission, only: [:show, :approve, :reject]

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
  end
end
