module Admin
  class SessionsController < ApplicationController
    layout "admin"
    skip_before_action :verify_authenticity_token, raise: false, only: [:create, :destroy]

    def new
      redirect_to admin_root_path if logged_in? && current_user.admin?
    end

    def create
      login = params[:login].presence || params[:username].presence || params[:email].presence
      password = params[:password].presence

      user = User.authenticate_by_login(login, password)

      if user&.admin?
        session[:user_id] = user.id
        redirect_to admin_root_path, notice: "Welcome back, #{user.display_name}. Successfully logged in to Food And Drink in Ancient Pompeii admin."
      elsif user
        flash.now[:alert] = "This portal is restricted to admin accounts."
        render :new, status: :unprocessable_entity
      else
        flash.now[:alert] = "Invalid username/email or password. Access restricted."
        render :new, status: :unprocessable_entity
      end
    end

    def destroy
      session[:user_id] = nil
      redirect_to admin_login_path, notice: "You have been signed out."
    end
  end
end
