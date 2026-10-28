# Digit-aware, case-insensitive ordering for photo filenames, shared by the
# admin photo surfaces (review comparison, master sheet page) so the same
# name sits in the same spot in every list: "IMG_9.jpg" sorts before
# "IMG_10.jpg", and digit runs compare numerically. Display-order only —
# photos_data keeps its merge order.
module PhotoNameOrder
  extend ActiveSupport::Concern

  private

  def photo_name_key(name)
    name.to_s.split(/(\d+)/).map { |part| part.match?(/\A\d+\z/) ? format("%08d", part.to_i) : part.downcase }
  end
end
