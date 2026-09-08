Rails.application.routes.draw do
  # Health check
  get "up" => "rails/health#show", as: :rails_health_check

  # API Endpoints for Javascript client
  namespace :api do
    namespace :v1 do
      post "auth/login", to: "auth#login"
      resources :features, only: [:index, :show], param: :sheet
      resources :submissions, only: [:create, :show] do
        collection do
          post :sync
        end
      end
    end
  end

  # Admin Authentication
  get  "admin/login",  to: "admin/sessions#new",     as: :admin_login
  post "admin/login",  to: "admin/sessions#create"
  delete "admin/logout", to: "admin/sessions#destroy", as: :admin_logout
  get  "admin/logout", to: "admin/sessions#destroy"

  # Admin Review Dashboard
  namespace :admin do
    get "/", to: "submissions#index", as: :root
    get "export_master", to: "submissions#export_master"
    resources :submissions, only: [:index, :show] do
      member do
        post :approve
        post :reject
      end
    end
  end

  # Root redirect to admin
  root to: redirect("/admin")
end
