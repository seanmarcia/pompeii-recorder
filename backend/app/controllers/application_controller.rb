class ApplicationController < ActionController::Base
  helper_method :current_user, :logged_in?

  private

  def current_user
    @current_user ||= User.find_by(id: session[:user_id]) if session[:user_id]
  end

  def logged_in?
    current_user.present?
  end

  def require_admin_login
    unless logged_in? && current_user.admin?
      flash[:alert] = "Authentication required. Please log in to access the Pompeii Admin Portal."
      redirect_to admin_login_path
    end
  end
end
