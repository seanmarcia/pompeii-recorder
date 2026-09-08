module Api
  module V1
    class SubmissionsController < ApplicationController
      skip_before_action :verify_authenticity_token, raise: false

      # POST /api/v1/submissions
      # Enqueue a new room or room update for admin review
      def create
        action_type = params[:action_type].presence || "create_new"
        target_sheet = params[:target_sheet].presence
        submitter_name = params[:submitter_name].presence || "Field Archaeologist"
        submitter_notes = params[:submitter_notes].presence

        # Parse payload data
        raw_payload = params[:payload]
        payload = case raw_payload
                  when String
                    JSON.parse(raw_payload) rescue {}
                  when ActionController::Parameters, Hash
                    raw_payload.to_unsafe_h
                  else
                    {}
                  end

        target_sheet ||= payload["SHEET"]

        submission = Submission.new(
          action_type: action_type,
          target_sheet: target_sheet,
          status: "pending",
          submitter_name: submitter_name,
          submitter_notes: submitter_notes,
          payload: payload
        )

        # Handle attached photos if multipart form
        photo_names = payload["photos"] || []
        if params[:photos].present?
          Array(params[:photos]).each do |uploaded_file|
            submission.photos.attach(uploaded_file)
            photo_names << uploaded_file.original_filename unless photo_names.include?(uploaded_file.original_filename)
          end
          payload["photos"] = photo_names
          submission.payload = payload
        end

        if submission.save
          render json: {
            status: "queued",
            submission_id: submission.id,
            action_type: submission.action_type,
            target_sheet: submission.target_sheet,
            message: "Submission queued successfully for admin review."
          }, status: :created
        else
          render json: { error: submission.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/submissions/sync
      # Bulk batch sync from offline outbox
      def sync
        submissions_data = params[:submissions]
        unless submissions_data.is_a?(Array)
          return render json: { error: "Expected an array of submissions" }, status: :bad_request
        end

        results = []
        Submission.transaction do
          submissions_data.each do |sub_hash|
            payload = sub_hash["payload"] || {}
            submission = Submission.create!(
              action_type: sub_hash["action_type"] || "create_new",
              target_sheet: sub_hash["target_sheet"] || payload["SHEET"],
              status: "pending",
              submitter_name: sub_hash["submitter_name"] || "Field Archaeologist (Offline Sync)",
              submitter_notes: sub_hash["submitter_notes"],
              payload: payload
            )
            results << {
              client_id: sub_hash["client_id"],
              submission_id: submission.id,
              status: "queued"
            }
          end
        end

        render json: {
          synced_count: results.size,
          results: results,
          message: "#{results.size} submission(s) queued for admin review."
        }
      rescue StandardError => e
        render json: { error: e.message }, status: :unprocessable_entity
      end

      # GET /api/v1/submissions/:id
      def show
        submission = Submission.find(params[:id])
        render json: {
          id: submission.id,
          action_type: submission.action_type,
          target_sheet: submission.target_sheet,
          status: submission.status,
          submitter_name: submission.submitter_name,
          submitter_notes: submission.submitter_notes,
          reviewer_notes: submission.reviewer_notes,
          reviewed_at: submission.reviewed_at,
          created_at: submission.created_at
        }
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Submission not found" }, status: :not_found
      end
    end
  end
end
