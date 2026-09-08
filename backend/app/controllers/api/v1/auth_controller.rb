module Api
  module V1
    class AuthController < ApplicationController
      skip_before_action :verify_authenticity_token, raise: false

      # POST /api/v1/auth/login
      def login
        login_param = params[:username].presence || params[:login].presence || params[:email].presence
        password_param = params[:password].presence

        user = User.authenticate_by_login(login_param, password_param)

        if user
          render json: {
            authenticated: true,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role
            },
            message: "Authentication successful."
          }
        else
          render json: {
            authenticated: false,
            error: "Invalid username or password."
          }, status: :unauthorized
        end
      end
    end
  end
end
