module ApplicationHelper
  # Width/height hints for a photo attachment so the browser can reserve a
  # correctly shaped box before download. Falls back to a 4:3 guess when the
  # blob has not been analyzed yet (the async analysis window after attach).
  # The hints only reserve space — the CSS fits the image whole, so a wrong
  # guess can shift layout once but never crops the photo.
  FALLBACK_PHOTO_DIMENSIONS = [ 2048, 1536 ].freeze

  def photo_dimension_attributes(photo)
    metadata = photo.blob.metadata
    if metadata["width"].present? && metadata["height"].present?
      { width: metadata["width"], height: metadata["height"] }
    else
      { width: FALLBACK_PHOTO_DIMENSIONS[0], height: FALLBACK_PHOTO_DIMENSIONS[1] }
    end
  end
end
